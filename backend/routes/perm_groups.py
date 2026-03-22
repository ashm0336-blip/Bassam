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
    "Monthly Schedule":  {"view": ["page_schedule", "create_schedule"], "edit": ["create_schedule", "approve_schedule", "unlock_schedule", "delete_schedule"]},
    "Shifts":            {"view": ["page_shifts", "manage_shifts"], "edit": ["manage_shifts"]},
    "Maps":              {"view": ["page_maps", "manage_maps"], "edit": ["manage_maps"]},
    "Gates Data":        {"view": ["page_gates_data", "manage_gates"], "edit": ["manage_gates"]},
    "Categories":        {"view": ["page_categories", "manage_categories"], "edit": ["manage_categories"]},
    "Field Worker":      {"view": ["page_field", "view_coverage_map"], "edit": ["distribute_employees", "auto_distribute", "enter_density", "view_density_reports"]},
    "Notifications":     {"view": ["page_alerts"], "edit": ["page_alerts"]},
    "Daily Statistics":  {"view": ["page_daily_stats"], "edit": ["page_daily_stats", "edit_daily_stats", "import_daily_stats"]},
    "Grand Mosque":      {"view": ["page_stats_haram"], "edit": ["page_stats_haram", "edit_stats_haram"]},
    "Prophet's Mosque":  {"view": ["page_stats_nabawi"], "edit": ["page_stats_nabawi", "edit_stats_nabawi"]},
    "Combined View":     {"view": ["page_stats_all"], "edit": ["page_stats_all", "edit_daily_stats", "import_daily_stats"]},
    "System Admin":      {"view": [], "edit": []},
}

ALL_PERMISSIONS = {
    "page_dashboard": {}, "page_overview": {}, "page_employees": {},
    "page_daily_log": {}, "page_transactions": {}, "page_settings": {},
    "page_alerts": {}, "page_reports": {}, "page_field": {},
    "page_schedule": {}, "page_shifts": {}, "page_maps": {},
    "page_gates_data": {}, "page_categories": {},
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
    "page_daily_stats": {}, "edit_daily_stats": {}, "import_daily_stats": {},
    "page_stats_haram": {}, "edit_stats_haram": {},
    "page_stats_nabawi": {}, "edit_stats_nabawi": {},
    "page_stats_all": {},
}


# ═══════════════════════════════════════════
#  CRUD — Permission Groups
# ═══════════════════════════════════════════

@router.get("/admin/permission-groups")
async def list_groups(user: dict = Depends(get_current_user)):
    """List permission groups. Accessible by admin, general manager, and department managers."""
    if user["role"] not in ("system_admin", "general_manager", "department_manager"):
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
    groups = await db.permission_groups.find({}, {"_id": 0}).sort("created_at", 1).to_list(100)
    # Add user count per group
    for g in groups:
        g["user_count"] = await db.users.count_documents({"permission_group_id": g["id"]})
    return groups


@router.get("/admin/permission-groups/{group_id}")
async def get_group(group_id: str, user: dict = Depends(get_current_user)):
    if user["role"] not in ("system_admin", "general_manager", "department_manager"):
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
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
async def assign_user_group(user_id: str, data: dict, admin: dict = Depends(get_current_user)):
    """Assign a permission group to a user. Dept managers can only change their own department's users."""
    # Permission check
    if admin["role"] not in ("system_admin", "general_manager"):
        # Department manager can change group for users in their department only
        if admin["role"] == "department_manager":
            target_full = await db.users.find_one({"id": user_id}, {"_id": 0, "department": 1})
            if not target_full or target_full.get("department") != admin.get("department"):
                raise HTTPException(status_code=403, detail="يمكنك تعديل موظفي إدارتك فقط")
        else:
            raise HTTPException(status_code=403, detail="صلاحيات غير كافية")

    group_id = data.get("permission_group_id")
    target = await db.users.find_one({"id": user_id}, {"_id": 0, "name": 1, "permission_group_id": 1, "custom_permissions": 1})
    if not target:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    old_group_id = target.get("permission_group_id")
    old_custom = target.get("custom_permissions", {})
    new_group_name = "بدون مجموعة"
    old_group_name = "بدون مجموعة"
    if group_id:
        group = await db.permission_groups.find_one({"id": group_id}, {"_id": 0, "name_ar": 1})
        if not group:
            raise HTTPException(status_code=404, detail="المجموعة غير موجودة")
        new_group_name = group.get("name_ar", "")
    if old_group_id:
        old_grp = await db.permission_groups.find_one({"id": old_group_id}, {"_id": 0, "name_ar": 1})
        old_group_name = old_grp.get("name_ar", "") if old_grp else "بدون مجموعة"

    # Auto-clear custom permissions when group changes to prevent conflicts
    had_custom = len(old_custom) > 0
    update_data = {"permission_group_id": group_id, "custom_permissions": {}}
    await db.users.update_one({"id": user_id}, {"$set": update_data})

    detail = f"تم تغيير مجموعة {target.get('name')} من «{old_group_name}» إلى «{new_group_name}»"
    if had_custom:
        detail += f" — تم مسح {len(old_custom)} صلاحية فردية سابقة تلقائياً"
    await log_activity("تغيير مجموعة صلاحيات", admin, target.get("name", user_id), detail)
    await ws_manager.broadcast({"type": "permissions", "action": "user_changed", "user_id": user_id})
    return {
        "message": "تم تعيين المجموعة",
        "custom_cleared": had_custom,
        "custom_cleared_count": len(old_custom),
    }


@router.delete("/admin/users/{user_id}/custom-permissions")
async def reset_user_custom_permissions(user_id: str, admin: dict = Depends(get_current_user)):
    """Reset (clear) all custom permission overrides for a user."""
    if admin["role"] not in ("system_admin", "general_manager"):
        if admin["role"] == "department_manager":
            target_check = await db.users.find_one({"id": user_id}, {"_id": 0, "department": 1})
            if not target_check or target_check.get("department") != admin.get("department"):
                raise HTTPException(status_code=403, detail="يمكنك تعديل موظفي إدارتك فقط")
        else:
            raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
    target = await db.users.find_one({"id": user_id}, {"_id": 0, "name": 1, "custom_permissions": 1})
    if not target:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    old_count = len(target.get("custom_permissions", {}))
    await db.users.update_one({"id": user_id}, {"$set": {"custom_permissions": {}}})
    await log_activity("إعادة ضبط صلاحيات فردية", admin, target.get("name", user_id),
        f"تم مسح {old_count} صلاحية فردية لـ {target.get('name', user_id)}")
    await ws_manager.broadcast({"type": "permissions", "action": "user_changed", "user_id": user_id})
    return {"message": f"تم مسح {old_count} صلاحية فردية", "cleared_count": old_count}


@router.put("/admin/users/{user_id}/custom-permissions")
async def set_user_custom_permissions(user_id: str, data: dict, admin: dict = Depends(get_current_user)):
    """Set individual permission overrides for a user."""
    if admin["role"] not in ("system_admin", "general_manager"):
        if admin["role"] == "department_manager":
            target_check = await db.users.find_one({"id": user_id}, {"_id": 0, "department": 1})
            if not target_check or target_check.get("department") != admin.get("department"):
                raise HTTPException(status_code=403, detail="يمكنك تعديل موظفي إدارتك فقط")
        else:
            raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
    target = await db.users.find_one({"id": user_id}, {"_id": 0, "name": 1})
    custom = data.get("custom_permissions", {})
    await db.users.update_one({"id": user_id}, {"$set": {"custom_permissions": custom}})
    count = len(custom)
    await log_activity("تخصيص صلاحيات فردية", admin, target.get("name", user_id),
        f"تم تعديل {count} صلاحية فردية لـ {target.get('name', user_id)}")
    await ws_manager.broadcast({"type": "permissions", "action": "user_changed", "user_id": user_id})
    return {"message": "تم تحديث الصلاحيات الفردية"}


@router.put("/admin/users/{user_id}/copy-permissions")
async def copy_user_permissions(user_id: str, data: dict, admin: dict = Depends(get_current_user)):
    """Copy permission group + custom permissions from another user."""
    if admin["role"] not in ("system_admin", "general_manager"):
        if admin["role"] == "department_manager":
            target_check = await db.users.find_one({"id": user_id}, {"_id": 0, "department": 1})
            if not target_check or target_check.get("department") != admin.get("department"):
                raise HTTPException(status_code=403, detail="يمكنك تعديل موظفي إدارتك فقط")
        else:
            raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
    source_user_id = data.get("source_user_id")
    if not source_user_id:
        raise HTTPException(status_code=400, detail="يجب تحديد المستخدم المصدر")
    source = await db.users.find_one({"id": source_user_id}, {"_id": 0, "name": 1, "permission_group_id": 1, "custom_permissions": 1})
    target = await db.users.find_one({"id": user_id}, {"_id": 0, "name": 1, "permission_group_id": 1})
    if not source or not target:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")

    # Detect group mismatch warning
    source_grp_id = source.get("permission_group_id")
    target_grp_id = target.get("permission_group_id")
    group_changed = source_grp_id != target_grp_id
    source_grp_name = ""
    if source_grp_id:
        sg = await db.permission_groups.find_one({"id": source_grp_id}, {"_id": 0, "name_ar": 1})
        source_grp_name = sg.get("name_ar", "") if sg else ""

    await db.users.update_one({"id": user_id}, {"$set": {
        "permission_group_id": source.get("permission_group_id"),
        "custom_permissions": source.get("custom_permissions", {}),
    }})
    detail = f"تم نسخ صلاحيات {source.get('name')} إلى {target.get('name')}"
    if group_changed:
        detail += f" — تم تغيير المجموعة أيضاً إلى «{source_grp_name}»"
    await log_activity("نسخ صلاحيات", admin, target.get("name", user_id), detail)
    await ws_manager.broadcast({"type": "permissions", "action": "user_changed", "user_id": user_id})
    return {
        "message": f"تم نسخ صلاحيات {source.get('name')} بنجاح",
        "group_changed": group_changed,
        "new_group_name": source_grp_name,
    }


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

    # Get group name
    group_name = None
    grp_id = user.get("permission_group_id")
    if grp_id:
        grp_doc = await db.permission_groups.find_one({"id": grp_id}, {"_id": 0, "name_ar": 1})
        group_name = grp_doc.get("name_ar") if grp_doc else None

    return {"permissions": permissions, "role": role,
            "permission_group_id": grp_id,
            "permission_group_name": group_name}


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
