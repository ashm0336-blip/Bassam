"""
RBAC Permissions System — Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, List, Optional
from datetime import datetime, timezone
import uuid

from database import db
from auth import require_admin, get_current_user, log_activity

router = APIRouter()

# ─── All permissions with Arabic labels ────────────────────────
ALL_PERMISSIONS = {
    # Pages & Navigation
    "page_dashboard":      {"ar": "لوحة التحكم (غرفة العمليات)",       "group": "pages",     "danger": False},
    "page_overview":       {"ar": "نظرة عامة على الإدارة",             "group": "pages",     "danger": False},
    "page_employees":      {"ar": "صفحة الموظفين",                   "group": "pages",     "danger": False},
    "page_daily_log":      {"ar": "السجل اليومي (الجولات)",           "group": "pages",     "danger": False},
    "page_transactions":   {"ar": "المهام اليومية",                   "group": "pages",     "danger": False},
    "page_settings":       {"ar": "إعدادات القسم",                   "group": "pages",     "danger": False},
    "page_alerts":         {"ar": "التنبيهات والبلاغات",              "group": "pages",     "danger": False},
    "page_reports":        {"ar": "التقارير",                         "group": "pages",     "danger": False},
    "page_field":          {"ar": "الواجهة الميدانية",                 "group": "pages",     "danger": False},

    # Employee Management
    "add_employees":       {"ar": "إضافة موظفين",                    "group": "employees", "danger": False},
    "edit_employees":      {"ar": "تعديل بيانات الموظفين",            "group": "employees", "danger": False},
    "delete_employees":    {"ar": "حذف الموظفين",                     "group": "employees", "danger": True},
    "manage_accounts":     {"ar": "إدارة حسابات الدخول (تفعيل/تجميد/إنهاء)", "group": "employees", "danger": False},
    "reset_pins":          {"ar": "إعادة تعيين كلمات المرور",         "group": "employees", "danger": False},
    "change_roles":        {"ar": "تغيير أدوار المستخدمين",           "group": "employees", "danger": True},
    "import_employees":    {"ar": "استيراد بيانات الموظفين",           "group": "employees", "danger": False},
    "export_employees":    {"ar": "تصدير بيانات الموظفين",            "group": "employees", "danger": False},

    # Monthly Schedule
    "create_schedule":     {"ar": "إنشاء الجدول الشهري",              "group": "schedules", "danger": False},
    "approve_schedule":    {"ar": "اعتماد الجدول الشهري",             "group": "schedules", "danger": False},
    "unlock_schedule":     {"ar": "فتح الجدول للتعديل",               "group": "schedules", "danger": False},
    "delete_schedule":     {"ar": "حذف الجدول الشهري",                "group": "schedules", "danger": True},

    # Daily Sessions (Prayer Halls & Gates)
    "view_daily_sessions": {"ar": "عرض الجولات اليومية",              "group": "sessions",  "danger": False},
    "create_session":      {"ar": "إنشاء جولة يومية",                "group": "sessions",  "danger": False},
    "approve_session":     {"ar": "اعتماد الجولة اليومية",            "group": "sessions",  "danger": False},
    "delete_session":      {"ar": "حذف الجولات اليومية",              "group": "sessions",  "danger": True},
    "start_prayer_round":  {"ar": "بدء جولة صلاة",                   "group": "sessions",  "danger": False},
    "complete_prayer_round":{"ar": "إنهاء جولة صلاة",                "group": "sessions",  "danger": False},
    "skip_prayer_round":   {"ar": "تجاوز جولة صلاة",                 "group": "sessions",  "danger": False},

    # Field Distribution
    "distribute_employees": {"ar": "توزيع الموظفين على المناطق",     "group": "field",     "danger": False},
    "auto_distribute":     {"ar": "التوزيع التلقائي",                 "group": "field",     "danger": False},
    "view_coverage_map":   {"ar": "عرض خريطة التغطية",                "group": "field",     "danger": False},

    # Density & Data
    "enter_density":       {"ar": "إدخال بيانات الكثافة",             "group": "density",   "danger": False},
    "view_density_reports":{"ar": "عرض تقارير الكثافة",               "group": "density",   "danger": False},

    # Settings & Administration
    "manage_settings":     {"ar": "إدارة إعدادات القسم",              "group": "settings",  "danger": False},
    "manage_maps":         {"ar": "إدارة خرائط الطوابق",              "group": "settings",  "danger": False},
    "manage_shifts":       {"ar": "إدارة الورديات",                   "group": "settings",  "danger": False},
    "manage_gates":        {"ar": "إدارة بيانات الأبواب",             "group": "settings",  "danger": False},
    "manage_categories":   {"ar": "إدارة فئات المصليات",              "group": "settings",  "danger": False},
}

GROUP_LABELS = {
    "pages":     {"ar": "الصفحات والتنقل",   "icon": "LayoutDashboard"},
    "employees": {"ar": "إدارة الموظفين",     "icon": "Users"},
    "schedules": {"ar": "الجدول الشهري",      "icon": "CalendarDays"},
    "sessions":  {"ar": "الجولات اليومية",    "icon": "Calendar"},
    "field":     {"ar": "التوزيع الميداني",   "icon": "MapPin"},
    "density":   {"ar": "الكثافات والبيانات", "icon": "Activity"},
    "settings":  {"ar": "الإعدادات",           "icon": "Settings"},
}

# Default permissions per role — format: {"perm": "read"|"write"}
DEFAULT_PERMISSIONS = {
    "general_manager": {
        # Pages
        "page_dashboard": "read", "page_overview": "read", "page_employees": "read",
        "page_daily_log": "read", "page_transactions": "read", "page_settings": "read",
        "page_alerts": "read", "page_reports": "read",
        # Employees
        "add_employees": "read", "edit_employees": "read", "export_employees": "read",
        # Schedules
        "approve_schedule": "write",
        # Sessions
        "view_daily_sessions": "read", "create_session": "read", "approve_session": "read",
        "start_prayer_round": "read", "complete_prayer_round": "read",
        # Field & Density
        "distribute_employees": "read", "view_coverage_map": "read",
        "view_density_reports": "read", "enter_density": "read",
        # Settings
        "manage_settings": "read", "manage_maps": "read", "manage_shifts": "read",
    },
    "department_manager": {
        # Pages
        "page_dashboard": "read", "page_overview": "write", "page_employees": "write",
        "page_daily_log": "write", "page_transactions": "write", "page_settings": "write",
        "page_alerts": "write", "page_reports": "read", "page_field": "write",
        # Employees
        "add_employees": "write", "edit_employees": "write", "delete_employees": "write",
        "manage_accounts": "write", "reset_pins": "write",
        "import_employees": "write", "export_employees": "write",
        # Schedules
        "create_schedule": "write", "approve_schedule": "write",
        "unlock_schedule": "write", "delete_schedule": "write",
        # Sessions
        "view_daily_sessions": "write", "create_session": "write",
        "approve_session": "write", "delete_session": "write",
        "start_prayer_round": "write", "complete_prayer_round": "write",
        "skip_prayer_round": "write",
        # Field & Density
        "distribute_employees": "write", "auto_distribute": "write",
        "view_coverage_map": "write",
        "enter_density": "write", "view_density_reports": "write",
        # Settings
        "manage_settings": "write", "manage_maps": "write",
        "manage_shifts": "write", "manage_gates": "write", "manage_categories": "write",
    },
    "shift_supervisor": {
        # Pages
        "page_overview": "read", "page_daily_log": "read",
        "page_alerts": "read", "page_field": "write",
        # Sessions
        "view_daily_sessions": "read",
        "start_prayer_round": "write", "complete_prayer_round": "write",
        "skip_prayer_round": "write",
        # Field & Density
        "distribute_employees": "write", "auto_distribute": "write",
        "view_coverage_map": "read", "enter_density": "write",
    },
    "field_staff": {
        "page_overview": "read", "page_field": "write",
        "enter_density": "write", "view_coverage_map": "read",
    },
    "admin_staff": {
        "page_alerts": "read",
    },
}

# Role hierarchy — no one can grant higher than their level
ROLE_HIERARCHY = {
    "system_admin":       5,
    "general_manager":    4,
    "department_manager": 3,
    "shift_supervisor":   2,
    "field_staff":        1,
    "admin_staff":        1,
}


def _normalize_permissions(perms):
    """Convert old array format to new dict format for backward compatibility"""
    if isinstance(perms, list):
        return {p: "write" for p in perms}
    if isinstance(perms, dict):
        return perms
    return {}


async def _ensure_defaults():
    """Seed default permissions if not exist"""
    for role, perms in DEFAULT_PERMISSIONS.items():
        existing = await db.role_permissions.find_one({"role": role})
        if not existing:
            await db.role_permissions.insert_one({
                "id": str(uuid.uuid4()),
                "role": role,
                "permissions": perms,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": "system",
            })
        else:
            # Migrate old array format to new dict format
            existing_perms = existing.get("permissions", {})
            if isinstance(existing_perms, list):
                migrated = {p: "write" for p in existing_perms}
                await db.role_permissions.update_one(
                    {"role": role},
                    {"$set": {"permissions": migrated}}
                )


# ─── GET all role permissions ───────────────────────────────────
@router.get("/admin/role-permissions")
async def get_all_role_permissions(admin: dict = Depends(require_admin)):
    await _ensure_defaults()
    docs = await db.role_permissions.find({}, {"_id": 0}).to_list(20)
    result = {}
    for doc in docs:
        perms = _normalize_permissions(doc.get("permissions", {}))
        result[doc["role"]] = {
            "permissions": perms,
            "updated_at": doc.get("updated_at"),
            "updated_by": doc.get("updated_by"),
        }
    return {
        "roles": result,
        "all_permissions": ALL_PERMISSIONS,
        "group_labels": GROUP_LABELS,
        "defaults": DEFAULT_PERMISSIONS,
    }


# ─── GET permissions for a specific role ───────────────────────
@router.get("/admin/role-permissions/{role}")
async def get_role_permissions(role: str, admin: dict = Depends(require_admin)):
    await _ensure_defaults()
    doc = await db.role_permissions.find_one({"role": role}, {"_id": 0})
    if not doc:
        return {"role": role, "permissions": DEFAULT_PERMISSIONS.get(role, [])}
    return doc


# ─── UPDATE role permissions ────────────────────────────────────
@router.put("/admin/role-permissions/{role}")
async def update_role_permissions(role: str, data: dict, admin: dict = Depends(require_admin)):
    if role == "system_admin":
        raise HTTPException(status_code=403, detail="لا يمكن تعديل صلاحيات مسؤول النظام")

    permissions = data.get("permissions", {})
    # Support both old array and new dict format
    if isinstance(permissions, list):
        permissions = {p: "write" for p in permissions}

    # Validate permissions exist and levels are valid
    valid_levels = {"read", "write"}
    for perm, level in permissions.items():
        if perm not in ALL_PERMISSIONS:
            raise HTTPException(status_code=400, detail=f"صلاحية غير صحيحة: {perm}")
        if level not in valid_levels:
            raise HTTPException(status_code=400, detail=f"مستوى غير صحيح: {level} — المسموح: read, write")

    await db.role_permissions.update_one(
        {"role": role},
        {"$set": {
            "permissions": permissions,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": admin.get("name", admin.get("email", "admin")),
        }},
        upsert=True,
    )

    read_count = sum(1 for v in permissions.values() if v == "read")
    write_count = sum(1 for v in permissions.values() if v == "write")
    await log_activity(
        "permissions_updated", admin, role,
        f"تم تحديث صلاحيات {role} — {read_count} قراءة، {write_count} تعديل"
    )
    return {"message": f"تم تحديث صلاحيات {role} ✅", "permissions": permissions}


# ─── RESET role permissions to defaults ────────────────────────
@router.post("/admin/role-permissions/{role}/reset")
async def reset_role_permissions(role: str, admin: dict = Depends(require_admin)):
    if role == "system_admin":
        raise HTTPException(status_code=403, detail="لا يمكن تعديل صلاحيات مسؤول النظام")
    defaults = DEFAULT_PERMISSIONS.get(role, [])
    await db.role_permissions.update_one(
        {"role": role},
        {"$set": {
            "permissions": defaults,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": admin.get("name", "admin"),
        }},
        upsert=True,
    )
    await log_activity("permissions_reset", admin, role, f"تم إعادة تعيين صلاحيات {role} للافتراضية")
    return {"message": "تمت إعادة التعيين للافتراضية ✅", "permissions": defaults}


# ─── GET current user's permissions (for AuthContext) ──────────
@router.get("/auth/my-permissions")
async def get_my_permissions(user: dict = Depends(get_current_user)):
    role = user.get("role", "field_staff")
    if role == "system_admin":
        # Admin gets all permissions as write
        return {"permissions": {k: "write" for k in ALL_PERMISSIONS.keys()}, "role": role}
    await _ensure_defaults()
    doc = await db.role_permissions.find_one({"role": role}, {"_id": 0})
    if doc:
        permissions = _normalize_permissions(doc.get("permissions", {}))
    else:
        permissions = DEFAULT_PERMISSIONS.get(role, {})
    return {"permissions": permissions, "role": role}


# ─── UPDATE user role (for employee table role column) ─────────
@router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    new_role = data.get("role")
    valid_roles = ["general_manager", "department_manager", "shift_supervisor", "field_staff", "admin_staff"]
    if new_role not in valid_roles:
        raise HTTPException(status_code=400, detail="دور غير صحيح")

    target = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")

    # Permission check: can only grant roles BELOW current user's level
    my_level = ROLE_HIERARCHY.get(current_user.get("role", "field_staff"), 0)
    target_new_level = ROLE_HIERARCHY.get(new_role, 0)
    target_current_level = ROLE_HIERARCHY.get(target.get("role", "field_staff"), 0)

    if current_user.get("role") != "system_admin":
        if target_new_level >= my_level:
            raise HTTPException(status_code=403, detail="لا يمكنك منح دور أعلى من مستواك أو مساوٍ له")
        if target_current_level >= my_level:
            raise HTTPException(status_code=403, detail="لا يمكنك تعديل دور شخص في مستواك أو أعلى")
        # Department managers can only change their own dept
        if current_user.get("role") == "department_manager":
            if target.get("department") != current_user.get("department"):
                raise HTTPException(status_code=403, detail="يمكنك تعديل موظفي إدارتك فقط")

    old_role = target.get("role")
    await db.users.update_one({"id": user_id}, {"$set": {"role": new_role}})
    await log_activity(
        "role_changed", current_user, target.get("name", user_id),
        f"{current_user['name']} غيّر دور {target.get('name')} من {old_role} إلى {new_role}"
    )
    return {"message": f"تم تغيير الدور إلى {new_role} ✅"}
