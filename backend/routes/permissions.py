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
    "page_dashboard":      {"ar": "لوحة التحكم (غرفة العمليات)",       "group": "pages",     "danger": False, "read_only": True},
    "page_overview":       {"ar": "نظرة عامة على الإدارة",             "group": "pages",     "danger": False, "read_only": True},
    "page_employees":      {"ar": "صفحة الموظفين",                   "group": "pages",     "danger": False},
    "page_daily_log":      {"ar": "السجل اليومي (الجولات)",           "group": "pages",     "danger": False},
    "page_transactions":   {"ar": "المهام اليومية",                   "group": "pages",     "danger": False},
    "page_settings":       {"ar": "إعدادات القسم",                   "group": "pages",     "danger": False},
    "page_alerts":         {"ar": "التنبيهات والبلاغات",              "group": "pages",     "danger": False},
    "page_reports":        {"ar": "التقارير",                         "group": "pages",     "danger": False, "read_only": True},
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


# ─── (Old endpoints kept as stubs for backward compatibility) ──
@router.get("/admin/role-permissions")
async def get_all_role_permissions(admin: dict = Depends(require_admin)):
    return {"roles": {}, "all_permissions": ALL_PERMISSIONS, "group_labels": GROUP_LABELS, "defaults": {}}

@router.get("/admin/role-permissions/{role}")
async def get_role_permissions(role: str, admin: dict = Depends(require_admin)):
    return {"role": role, "permissions": {}}

@router.put("/admin/role-permissions/{role}")
async def update_role_permissions(role: str, data: dict, admin: dict = Depends(require_admin)):
    return {"message": "الصلاحيات تُدار الآن من شجرة الصفحات"}


# ─── RESET role permissions — resets role_visibility on all menu items ──
@router.post("/admin/role-permissions/{role}/reset")
async def reset_role_permissions(role: str, admin: dict = Depends(require_admin)):
    if role == "system_admin":
        raise HTTPException(status_code=403, detail="لا يمكن تعديل صلاحيات مسؤول النظام")
    # Reset all menu items' role_visibility for this role to defaults (visible=true, editable=false)
    menu_items = await db.sidebar_menu.find({}, {"_id": 0}).to_list(200)
    for item in menu_items:
        rv = item.get("role_visibility", {})
        rv[role] = {"visible": True, "editable": False}
        await db.sidebar_menu.update_one({"id": item["id"]}, {"$set": {"role_visibility": rv}})
    await log_activity("permissions_reset", admin, role, f"تم إعادة تعيين صلاحيات {role} للافتراضية")
    return {"message": "تمت إعادة التعيين للافتراضية ✅"}


# ── خريطة ربط عناصر القائمة بمفاتيح الصلاحيات القديمة ──
# name_en → list of permission keys
MENU_TO_PERM_MAP = {
    # Pages
    "Dashboard":         {"view": ["page_dashboard"]},
    "Overview":          {"view": ["page_overview"]},
    "Daily Tasks":       {"view": ["page_transactions"], "edit": ["page_transactions"]},
    "Daily Log":         {"view": ["page_daily_log", "view_daily_sessions"], "edit": ["create_session", "approve_session", "delete_session", "start_prayer_round", "complete_prayer_round", "skip_prayer_round"]},
    "Settings":          {"view": ["page_settings"], "edit": ["page_settings", "manage_settings"]},
    # Settings sub-tabs
    "Staff":             {"view": ["page_employees"], "edit": ["page_employees", "add_employees", "edit_employees", "delete_employees", "manage_accounts", "reset_pins", "change_roles", "import_employees", "export_employees"]},
    "Monthly Schedule":  {"view": ["page_employees"], "edit": ["create_schedule", "approve_schedule", "unlock_schedule", "delete_schedule"]},
    "Shifts":            {"view": ["page_settings"], "edit": ["manage_shifts"]},
    "Maps":              {"view": ["page_settings"], "edit": ["manage_maps"]},
    "Gates Data":        {"view": ["page_settings"], "edit": ["manage_gates"]},
    "Categories":        {"view": ["page_settings"], "edit": ["manage_categories"]},
    # General pages
    "Field Worker":      {"view": ["page_field", "view_coverage_map"], "edit": ["distribute_employees", "auto_distribute", "enter_density", "view_density_reports"]},
    "Notifications":     {"view": ["page_alerts"], "edit": ["page_alerts"]},
    "System Admin":      {"view": [], "edit": []},  # handled by role check
}


# ─── GET current user's permissions (from role_visibility) ──────
@router.get("/auth/my-permissions")
async def get_my_permissions(user: dict = Depends(get_current_user)):
    role = user.get("role", "field_staff")

    # Admin gets all permissions as write
    if role == "system_admin":
        return {"permissions": {k: "write" for k in ALL_PERMISSIONS.keys()}, "role": role}

    # Build permissions from sidebar menu role_visibility
    menu_items = await db.sidebar_menu.find({}, {"_id": 0}).to_list(200)
    permissions = {}

    for item in menu_items:
        rv = item.get("role_visibility", {})
        role_cfg = rv.get(role, {"visible": True, "editable": False})  # default: visible, not editable
        name_en = item.get("name_en", "")
        mapping = MENU_TO_PERM_MAP.get(name_en, {})

        if role_cfg.get("visible", True):
            # Add view permissions
            for key in mapping.get("view", []):
                if key not in permissions:
                    permissions[key] = "read"
            # Add edit permissions if editable
            if role_cfg.get("editable", False):
                for key in mapping.get("edit", []):
                    permissions[key] = "write"
                # Also upgrade view keys to write if they're in edit list
                for key in mapping.get("view", []):
                    permissions[key] = "write"

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
