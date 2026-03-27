"""
Permission Groups — CRUD + user permission resolution.
Replaces old role-based permissions with flexible groups.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict
from datetime import datetime, timezone
import uuid

from database import db
from auth import require_admin, get_current_user, log_activity, require_manager_or_above, check_page_permission
from models import PermissionGroupCreate, PermissionGroupUpdate
from ws_manager import ws_manager

router = APIRouter()


async def _is_gm_or_admin(user: dict) -> bool:
    if user.get("role") == "system_admin":
        return True
    if user.get("role") == "general_manager":
        return True
    gid = user.get("permission_group_id")
    if gid:
        grp = await db.permission_groups.find_one({"id": gid}, {"_id": 0, "name_ar": 1})
        if grp and grp.get("name_ar") == "مدير عام":
            return True
    return False


async def _can_manage_groups(user: dict) -> bool:
    if user.get("role") == "system_admin":
        return True
    if user.get("role") == "department_manager":
        return True
    has_perm = await check_page_permission(user, "tab=settings", require_edit=True)
    if has_perm:
        return True
    has_perm2 = await check_page_permission(user, "sub=Permissions", require_edit=True)
    if has_perm2:
        return True
    return False


# ─── HREF_TO_PERM_MAP (maps page hrefs to old-style permission keys) ──
HREF_TO_PERM_MAP = {
    "/dashboard":        {"view": ["page_dashboard"]},
    "?tab=transactions": {"view": ["page_transactions"], "edit": ["page_transactions"]},
    "?tab=overview":     {"view": ["page_overview"]},
    "/daily-sessions":   {"view": ["page_daily_log", "view_daily_sessions"], "edit": ["create_session", "approve_session", "delete_session", "start_prayer_round", "complete_prayer_round", "skip_prayer_round"]},
    "/daily-gates":      {"view": ["page_daily_log", "view_daily_sessions"], "edit": ["create_session", "approve_session", "delete_session"]},
    "?tab=settings":     {"view": ["page_settings"], "edit": ["page_settings", "manage_settings"]},
    "&sub=Staff":        {"view": ["page_employees"], "edit": ["page_employees", "add_employees", "edit_employees", "delete_employees", "manage_accounts", "reset_pins", "change_roles", "import_employees", "export_employees"]},
    "?tab=schedule":     {"view": ["page_schedule", "create_schedule"], "edit": ["create_schedule", "approve_schedule", "unlock_schedule", "delete_schedule"]},
    "&sub=Shifts":       {"view": ["page_shifts", "manage_shifts"], "edit": ["manage_shifts"]},
    "&sub=Maps":         {"view": ["page_maps", "manage_maps"], "edit": ["manage_maps"]},
    "&sub=GatesData":    {"view": ["page_gates_data", "manage_gates"], "edit": ["manage_gates"]},
    "&sub=Categories":   {"view": ["page_categories", "manage_categories"], "edit": ["manage_categories"]},
    "/field":            {"view": ["page_field", "view_coverage_map"], "edit": ["distribute_employees", "auto_distribute", "enter_density", "view_density_reports"]},
    "/notifications":    {"view": ["page_notifications"], "edit": ["page_notifications"]},
    "/alerts":           {"view": ["page_alerts"], "edit": ["page_alerts"]},
    "/daily-stats":      {"view": ["page_daily_stats"], "edit": ["page_daily_stats", "edit_daily_stats", "import_daily_stats"]},
    "?tab=haram":        {"view": ["page_stats_haram"], "edit": ["page_stats_haram", "edit_stats_haram"]},
    "?tab=nabawi":       {"view": ["page_stats_nabawi"], "edit": ["page_stats_nabawi", "edit_stats_nabawi"]},
    "?tab=all":          {"view": ["page_stats_all"], "edit": ["page_stats_all", "edit_daily_stats", "import_daily_stats"]},
    "/stats-analytics":  {"view": ["page_stats_analytics"], "edit": ["page_stats_analytics"]},
    "/activity-log":     {"view": ["page_activity_log"], "edit": ["page_activity_log"]},
    "/admin":            {"view": [], "edit": []},
}

def _find_href_mapping(href: str) -> dict:
    if href in HREF_TO_PERM_MAP:
        return HREF_TO_PERM_MAP[href]
    merged = {"view": [], "edit": []}
    for pattern, mapping in HREF_TO_PERM_MAP.items():
        if pattern in href:
            merged["view"].extend(mapping.get("view", []))
            merged["edit"].extend(mapping.get("edit", []))
    if merged["view"] or merged["edit"]:
        merged["view"] = list(dict.fromkeys(merged["view"]))
        merged["edit"] = list(dict.fromkeys(merged["edit"]))
        return merged
    return {}

ALL_PERMISSIONS = {
    "page_dashboard": {}, "page_overview": {}, "page_employees": {},
    "page_daily_log": {}, "page_transactions": {}, "page_settings": {},
    "page_alerts": {}, "page_reports": {}, "page_field": {},
    "page_schedule": {}, "page_shifts": {}, "page_maps": {},
    "page_gates_data": {}, "page_categories": {},
    "page_activity_log": {},
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
    "page_stats_analytics": {},
}


# ═══════════════════════════════════════════
#  CRUD — Permission Groups
# ═══════════════════════════════════════════

@router.get("/admin/permission-groups")
async def list_groups(user: dict = Depends(get_current_user), department: str = None):
    """List permission groups. Dept managers see only their department's groups."""
    if not await _can_manage_groups(user):
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
    query = {}
    if user["role"] == "department_manager":
        dept = user.get("department")
        query["department"] = dept
    elif department:
        query["department"] = department
    groups = await db.permission_groups.find(query, {"_id": 0}).sort("created_at", 1).to_list(100)
    for g in groups:
        g["user_count"] = await db.users.count_documents({"permission_group_id": g["id"]})
    return groups


@router.get("/admin/permission-groups/{group_id}/members")
async def list_group_members(group_id: str, user: dict = Depends(get_current_user)):
    if not await _can_manage_groups(user):
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
    query = {"permission_group_id": group_id}
    if user["role"] == "department_manager":
        query["department"] = user.get("department")
    users_in_group = await db.users.find(
        query,
        {"_id": 0, "id": 1, "name": 1, "name_ar": 1, "role": 1, "department": 1, "employee_id": 1}
    ).to_list(200)
    for u in users_in_group:
        if u.get("employee_id"):
            emp = await db.employees.find_one({"id": u["employee_id"]}, {"_id": 0, "name": 1, "job_title": 1})
            if emp:
                u["employee_name"] = emp.get("name", "")
                u["job_title"] = emp.get("job_title", "")
        if not u.get("employee_name"):
            u["employee_name"] = u.get("name_ar") or u.get("name") or ""
    return users_in_group


@router.get("/admin/assignable-users")
async def list_assignable_users(user: dict = Depends(get_current_user), department: str = None):
    if not await _can_manage_groups(user):
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
    query = {"role": {"$ne": "system_admin"}, "is_active": True}
    if user["role"] == "department_manager":
        query["department"] = user.get("department")
    elif department:
        query["department"] = department
    all_users = await db.users.find(
        query,
        {"_id": 0, "id": 1, "name": 1, "name_ar": 1, "role": 1, "department": 1,
         "permission_group_id": 1, "employee_id": 1, "is_active": 1}
    ).to_list(500)
    for u in all_users:
        if u.get("employee_id"):
            emp = await db.employees.find_one({"id": u["employee_id"]}, {"_id": 0, "name": 1, "job_title": 1})
            if emp:
                u["employee_name"] = emp.get("name", "")
                u["job_title"] = emp.get("job_title", "")
        if not u.get("employee_name"):
            u["employee_name"] = u.get("name_ar") or u.get("name") or ""
        if u.get("permission_group_id"):
            grp = await db.permission_groups.find_one({"id": u["permission_group_id"]}, {"_id": 0, "name_ar": 1})
            u["group_name"] = grp.get("name_ar", "") if grp else ""
        else:
            u["group_name"] = ""
    return all_users


@router.get("/admin/permission-groups/{group_id}")
async def get_group(group_id: str, user: dict = Depends(get_current_user)):
    if not await _can_manage_groups(user):
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
    group = await db.permission_groups.find_one({"id": group_id}, {"_id": 0})
    if not group:
        raise HTTPException(status_code=404, detail="المجموعة غير موجودة")
    if user.get("role") == "department_manager":
        g_dept = group.get("department")
        if g_dept and g_dept != user.get("department"):
            raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
    return group


@router.post("/admin/permission-groups")
async def create_group(data: PermissionGroupCreate, admin: dict = Depends(get_current_user)):
    if not await _can_manage_groups(admin):
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
    if admin.get("role") == "department_manager":
        if not data.department or data.department != admin.get("department"):
            raise HTTPException(status_code=403, detail="يمكنك إنشاء مجموعات لإدارتك فقط")
    doc = {
        "id": str(uuid.uuid4()),
        "name_ar": data.name_ar,
        "name_en": data.name_en,
        "description_ar": data.description_ar,
        "department": data.department,
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
async def update_group(group_id: str, data: PermissionGroupUpdate, admin: dict = Depends(get_current_user)):
    if not await _can_manage_groups(admin):
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
    existing = await db.permission_groups.find_one({"id": group_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="المجموعة غير موجودة")
    if admin.get("role") == "department_manager":
        group_dept = existing.get("department")
        if not group_dept or group_dept != admin.get("department"):
            raise HTTPException(status_code=403, detail="يمكنك تعديل مجموعات إدارتك فقط")
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if "department" in update:
        del update["department"]
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.permission_groups.update_one({"id": group_id}, {"$set": update})
    await log_activity("تحديث مجموعة صلاحيات", admin, existing["name_ar"], f"تم تحديث مجموعة: {existing['name_ar']}")
    await ws_manager.broadcast({"type": "permissions", "action": "group_changed"})
    updated = await db.permission_groups.find_one({"id": group_id}, {"_id": 0})
    return updated


@router.delete("/admin/permission-groups/{group_id}")
async def delete_group(group_id: str, admin: dict = Depends(get_current_user)):
    if not await _can_manage_groups(admin):
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
    existing = await db.permission_groups.find_one({"id": group_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="المجموعة غير موجودة")
    if existing.get("is_system"):
        raise HTTPException(status_code=403, detail="لا يمكن حذف مجموعة النظام")
    if admin.get("role") == "department_manager":
        group_dept = existing.get("department")
        if not group_dept or group_dept != admin.get("department"):
            raise HTTPException(status_code=403, detail="يمكنك حذف مجموعات إدارتك فقط")
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
    if not await _can_manage_groups(admin):
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
    if admin.get("role") != "system_admin" and user_id == admin.get("id"):
        raise HTTPException(status_code=403, detail="لا يمكنك تغيير صلاحياتك بنفسك")
    if admin.get("role") == "department_manager":
        target_full = await db.users.find_one({"id": user_id}, {"_id": 0, "department": 1, "role": 1})
        if not target_full or target_full.get("department") != admin.get("department"):
            raise HTTPException(status_code=403, detail="يمكنك تعديل موظفي إدارتك فقط")
        if target_full.get("role") == "department_manager":
            raise HTTPException(status_code=403, detail="لا يمكنك تعديل صلاحيات مدير إدارة آخر")

    group_id = data.get("permission_group_id")
    target = await db.users.find_one({"id": user_id}, {"_id": 0, "name": 1, "permission_group_id": 1, "custom_permissions": 1})
    if not target:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    old_group_id = target.get("permission_group_id")
    old_custom = target.get("custom_permissions", {})
    new_group_name = "بدون مجموعة"
    old_group_name = "بدون مجموعة"
    if group_id:
        group = await db.permission_groups.find_one({"id": group_id}, {"_id": 0, "name_ar": 1, "department": 1})
        if not group:
            raise HTTPException(status_code=404, detail="المجموعة غير موجودة")
        g_dept = group.get("department")
        if admin["role"] == "department_manager":
            if g_dept and g_dept != admin.get("department"):
                raise HTTPException(status_code=403, detail="لا يمكنك تعيين مجموعة من إدارة أخرى")
        if g_dept:
            target_dept_check = await db.users.find_one({"id": user_id}, {"_id": 0, "department": 1})
            if target_dept_check and target_dept_check.get("department") != g_dept:
                raise HTTPException(status_code=400, detail="لا يمكن تعيين مجموعة إدارة لموظف من إدارة مختلفة")
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
    if not await _is_gm_or_admin(admin):
        raise HTTPException(status_code=403, detail="الصلاحيات الفردية متاحة للمدير العام فقط")
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
    if not await _is_gm_or_admin(admin):
        raise HTTPException(status_code=403, detail="الصلاحيات الفردية متاحة للمدير العام فقط")
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
    if not await _is_gm_or_admin(admin):
        raise HTTPException(status_code=403, detail="الصلاحيات الفردية متاحة للمدير العام فقط")
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

    menu_items = await db.sidebar_menu.find({"is_active": True}, {"_id": 0}).to_list(200)
    permissions = {}
    dept_permissions = {}

    for item in menu_items:
        href = item["href"]
        perm = page_perms.get(href, {"visible": False, "editable": False})
        dept = item.get("department", "all")
        mapping = _find_href_mapping(href)

        if perm.get("visible"):
            for key in mapping.get("view", []):
                if key not in permissions:
                    permissions[key] = "read"
                dept_key = f"{dept}:{key}"
                if dept_key not in dept_permissions:
                    dept_permissions[dept_key] = "read"
            if perm.get("editable"):
                for key in mapping.get("edit", []):
                    permissions[key] = "write"
                    dept_permissions[f"{dept}:{key}"] = "write"
                for key in mapping.get("view", []):
                    permissions[key] = "write"
                    dept_permissions[f"{dept}:{key}"] = "write"

    # page_permissions: direct href-based visibility+editability for frontend
    page_vis = {}
    for item in menu_items:
        href = item["href"]
        perm = page_perms.get(href, {"visible": False, "editable": False})
        if perm.get("visible") or perm.get("editable"):
            page_vis[href] = perm

    # Get group name
    group_name = None
    grp_id = user.get("permission_group_id")
    if grp_id:
        grp_doc = await db.permission_groups.find_one({"id": grp_id}, {"_id": 0, "name_ar": 1})
        group_name = grp_doc.get("name_ar") if grp_doc else None

    return {"permissions": permissions, "role": role,
            "dept_permissions": dept_permissions,
            "page_permissions": page_vis,
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
    caller_role = current_user.get("role")
    can_manage = await _can_manage_groups(current_user)
    if not can_manage:
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
    if caller_role == "department_manager":
        if target.get("department") != current_user.get("department"):
            raise HTTPException(status_code=403, detail="يمكنك تعديل موظفي إدارتك فقط")
        if new_role in ("system_admin", "general_manager"):
            raise HTTPException(status_code=403, detail="لا يمكنك تعيين هذا الدور")
    if caller_role != "system_admin" and new_role == "system_admin":
        raise HTTPException(status_code=403, detail="فقط مسؤول النظام يمكنه تعيين مسؤول نظام آخر")
    old_role = target.get("role")
    await db.users.update_one({"id": user_id}, {"$set": {"role": new_role}})
    await log_activity("role_changed", current_user, target.get("name", user_id),
        f"تم تغيير الدور من {old_role} إلى {new_role}")
    return {"message": f"تم تغيير الدور إلى {new_role}"}
