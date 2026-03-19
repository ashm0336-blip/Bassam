"""
Permission Groups — CRUD + user permission resolution.
Replaces old role-based permissions with flexible groups.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict
from datetime import datetime, timezone
import uuid

from database import db
from auth import require_admin, get_current_user, log_activity
from models import PermissionGroupCreate, PermissionGroupUpdate
from ws_manager import ws_manager

router = APIRouter()


# ─── MENU_TO_PERM_MAP (kept for canRead/canWrite compatibility) ──
MENU_TO_PERM_MAP = {
    "Dashboard":         {"view": ["page_dashboard"]},
    "Daily Tasks":       {"view": ["page_transactions"], "edit": ["page_transactions"]},
    "Daily Log":         {"view": ["page_daily_log", "view_daily_sessions"], "edit": ["create_session", "approve_session", "delete_session", "start_prayer_round", "complete_prayer_round", "skip_prayer_round"]},
    "Settings":          {"view": ["page_settings"], "edit": ["page_settings", "manage_settings"]},
    "Staff":             {"view": ["page_employees"], "edit": ["page_employees", "add_employees", "edit_employees", "delete_employees", "manage_accounts", "reset_pins", "change_roles", "import_employees", "export_employees"]},
    "Monthly Schedule":  {"view": ["page_employees"], "edit": ["create_schedule", "approve_schedule", "unlock_schedule", "delete_schedule"]},
    "Shifts":            {"view": ["page_settings"], "edit": ["manage_shifts"]},
    "Maps":              {"view": ["page_settings"], "edit": ["manage_maps"]},
    "Gates Data":        {"view": ["page_settings"], "edit": ["manage_gates"]},
    "Categories":        {"view": ["page_settings"], "edit": ["manage_categories"]},
    "Field Worker":      {"view": ["page_field", "view_coverage_map"], "edit": ["distribute_employees", "auto_distribute", "enter_density", "view_density_reports"]},
    "Notifications":     {"view": ["page_alerts"], "edit": ["page_alerts"]},
    "System Admin":      {"view": [], "edit": []},
}

ALL_PERMISSIONS = {
    "page_dashboard": {}, "page_overview": {}, "page_employees": {},
    "page_daily_log": {}, "page_transactions": {}, "page_settings": {},
    "page_alerts": {}, "page_reports": {}, "page_field": {},
    "add_employees": {}, "edit_employees": {}, "delete_employees": {},
    "manage_accounts": {}, "reset_pins": {}, "change_roles": {},
    "import_employees": {}, "export_employees": {},
    "create_schedule": {}, "approve_schedule": {}, "unlock_schedule": {}, "delete_schedule": {},
    "view_daily_sessions": {}, "create_session": {}, "approve_session": {}, "delete_session": {},
    "start_prayer_round": {}, "complete_prayer_round": {}, "skip_prayer_round": {},
    "distribute_employees": {}, "auto_distribute": {}, "view_coverage_map": {},
    "enter_density": {}, "view_density_reports": {},
    "manage_settings": {}, "manage_maps": {}, "manage_shifts": {},
    "manage_gates": {}, "manage_categories": {},
}


# ═══════════════════════════════════════════
#  CRUD — Permission Groups
# ═══════════════════════════════════════════

@router.get("/admin/permission-groups")
async def list_groups(admin: dict = Depends(require_admin)):
    groups = await db.permission_groups.find({}, {"_id": 0}).sort("created_at", 1).to_list(100)
    return groups


@router.get("/admin/permission-groups/{group_id}")
async def get_group(group_id: str, admin: dict = Depends(require_admin)):
    group = await db.permission_groups.find_one({"id": group_id}, {"_id": 0})
    if not group:
        raise HTTPException(status_code=404, detail="المجموعة غير موجودة")
    return group


@router.post("/admin/permission-groups")
async def create_group(data: PermissionGroupCreate, admin: dict = Depends(require_admin)):
    doc = {
        "id": str(uuid.uuid4()),
        "name_ar": data.name_ar,
        "name_en": data.name_en,
        "description_ar": data.description_ar,
        "is_system": False,
        "page_permissions": data.page_permissions,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.permission_groups.insert_one({**doc})
    await log_activity("إنشاء مجموعة صلاحيات", admin, doc["name_ar"], f"تم إنشاء مجموعة: {doc['name_ar']}")
    await ws_manager.broadcast({"type": "permissions", "action": "group_changed"})
    return {k: v for k, v in doc.items() if k != "_id"}


@router.put("/admin/permission-groups/{group_id}")
async def update_group(group_id: str, data: PermissionGroupUpdate, admin: dict = Depends(require_admin)):
    existing = await db.permission_groups.find_one({"id": group_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="المجموعة غير موجودة")
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.permission_groups.update_one({"id": group_id}, {"$set": update})
    await log_activity("تحديث مجموعة صلاحيات", admin, existing["name_ar"], f"تم تحديث مجموعة: {existing['name_ar']}")
    await ws_manager.broadcast({"type": "permissions", "action": "group_changed"})
    updated = await db.permission_groups.find_one({"id": group_id}, {"_id": 0})
    return updated


@router.delete("/admin/permission-groups/{group_id}")
async def delete_group(group_id: str, admin: dict = Depends(require_admin)):
    existing = await db.permission_groups.find_one({"id": group_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="المجموعة غير موجودة")
    if existing.get("is_system"):
        raise HTTPException(status_code=403, detail="لا يمكن حذف مجموعة النظام")
    # Check if any users are using this group
    count = await db.users.count_documents({"permission_group_id": group_id})
    if count > 0:
        raise HTTPException(status_code=400, detail=f"لا يمكن الحذف — {count} مستخدم في هذه المجموعة")
    await db.permission_groups.delete_one({"id": group_id})
    await log_activity("حذف مجموعة صلاحيات", admin, existing["name_ar"], f"تم حذف مجموعة: {existing['name_ar']}")
    await ws_manager.broadcast({"type": "permissions", "action": "group_changed"})
    return {"message": "تم حذف المجموعة"}


# ═══════════════════════════════════════════
#  User permission assignment
# ═══════════════════════════════════════════

@router.put("/admin/users/{user_id}/permission-group")
async def assign_user_group(user_id: str, data: dict, admin: dict = Depends(require_admin)):
    """Assign a permission group to a user."""
    group_id = data.get("permission_group_id")
    if group_id:
        group = await db.permission_groups.find_one({"id": group_id}, {"_id": 0})
        if not group:
            raise HTTPException(status_code=404, detail="المجموعة غير موجودة")
    await db.users.update_one({"id": user_id}, {"$set": {"permission_group_id": group_id}})
    await ws_manager.broadcast({"type": "permissions", "action": "user_changed"})
    return {"message": "تم تعيين المجموعة"}


@router.put("/admin/users/{user_id}/custom-permissions")
async def set_user_custom_permissions(user_id: str, data: dict, admin: dict = Depends(require_admin)):
    """Set individual permission overrides for a user."""
    custom = data.get("custom_permissions", {})
    await db.users.update_one({"id": user_id}, {"$set": {"custom_permissions": custom}})
    await ws_manager.broadcast({"type": "permissions", "action": "user_changed"})
    return {"message": "تم تحديث الصلاحيات الفردية"}


# ═══════════════════════════════════════════
#  Resolve user permissions (used by sidebar + frontend)
# ═══════════════════════════════════════════

async def resolve_user_page_permissions(user: dict) -> Dict[str, dict]:
    """
    Returns {href: {visible: bool, editable: bool}} for a user.
    Priority: system_admin > custom_permissions > group > defaults
    """
    role = user.get("role", "")

    # System admin = everything visible + editable
    if role == "system_admin":
        items = await db.sidebar_menu.find({"is_active": True}, {"_id": 0, "href": 1}).to_list(200)
        return {item["href"]: {"visible": True, "editable": True} for item in items}

    # Get group permissions
    group_id = user.get("permission_group_id")
    group_perms = {}
    if group_id:
        group = await db.permission_groups.find_one({"id": group_id}, {"_id": 0})
        if group:
            group_perms = group.get("page_permissions", {})

    # Get custom overrides
    custom = user.get("custom_permissions", {})

    # Merge: custom overrides group
    all_items = await db.sidebar_menu.find({"is_active": True}, {"_id": 0, "href": 1}).to_list(200)
    result = {}
    for item in all_items:
        href = item["href"]
        # Default: hidden
        perm = {"visible": False, "editable": False}
        # Apply group
        if href in group_perms:
            perm = {**perm, **group_perms[href]}
        # Apply custom override (takes priority)
        if href in custom:
            perm = {**perm, **custom[href]}
        result[href] = perm

    return result


# ═══════════════════════════════════════════
#  GET my-permissions (frontend canRead/canWrite)
# ═══════════════════════════════════════════

@router.get("/auth/my-permissions")
async def get_my_permissions(user: dict = Depends(get_current_user)):
    role = user.get("role", "")

    # System admin → all write
    if role == "system_admin":
        return {"permissions": {k: "write" for k in ALL_PERMISSIONS.keys()}, "role": role}

    # Resolve from group + custom
    page_perms = await resolve_user_page_permissions(user)

    # Map page permissions to old-style permission keys
    menu_items = await db.sidebar_menu.find({"is_active": True}, {"_id": 0}).to_list(200)
    permissions = {}

    for item in menu_items:
        href = item["href"]
        perm = page_perms.get(href, {"visible": False, "editable": False})
        name_en = item.get("name_en", "")
        mapping = MENU_TO_PERM_MAP.get(name_en, {})

        if perm.get("visible"):
            for key in mapping.get("view", []):
                if key not in permissions:
                    permissions[key] = "read"
            if perm.get("editable"):
                for key in mapping.get("edit", []):
                    permissions[key] = "write"
                for key in mapping.get("view", []):
                    permissions[key] = "write"

    return {"permissions": permissions, "role": role,
            "permission_group_id": user.get("permission_group_id")}


# ═══════════════════════════════════════════
#  Backward compat stubs (old role endpoints)
# ═══════════════════════════════════════════

@router.get("/admin/role-permissions")
async def get_all_role_permissions(admin: dict = Depends(require_admin)):
    return {"roles": {}, "all_permissions": {}, "group_labels": {}, "defaults": {}}

@router.get("/admin/role-permissions/{role}")
async def get_role_permissions(role: str, admin: dict = Depends(require_admin)):
    return {"role": role, "permissions": {}}

@router.put("/admin/role-permissions/{role}")
async def update_role_permissions(role: str, data: dict, admin: dict = Depends(require_admin)):
    return {"message": "استخدم مجموعات الصلاحيات الجديدة"}

@router.post("/admin/role-permissions/{role}/reset")
async def reset_role_permissions(role: str, admin: dict = Depends(require_admin)):
    return {"message": "استخدم مجموعات الصلاحيات الجديدة"}


# ═══════════════════════════════════════════
#  Update user role (kept for backward compat)
# ═══════════════════════════════════════════

@router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    new_role = data.get("role")
    if not new_role:
        raise HTTPException(status_code=400, detail="يجب تحديد الدور")
    target = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    if current_user.get("role") != "system_admin":
        raise HTTPException(status_code=403, detail="فقط مسؤول النظام يمكنه تغيير الأدوار")
    old_role = target.get("role")
    await db.users.update_one({"id": user_id}, {"$set": {"role": new_role}})
    await log_activity("role_changed", current_user, target.get("name", user_id),
        f"تم تغيير الدور من {old_role} إلى {new_role}")
    return {"message": f"تم تغيير الدور إلى {new_role}"}
