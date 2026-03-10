from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Optional
from datetime import datetime, timezone
import uuid

from database import db
from auth import get_current_user, require_admin, require_department_manager, log_activity
from models import (
    DropdownOption, DropdownOptionCreate, DropdownOptionUpdate,
    LoginPageSettings, LoginPageSettingsUpdate, HeaderSettings, HeaderSettingsUpdate,
    PWASettings, PWASettingsUpdate,
    SidebarMenuItem, SidebarMenuItemCreate, SidebarMenuItemUpdate,
    ZoneCategory, ZoneCategoryCreate, ZoneCategoryUpdate,
    DepartmentSettingCreate, DepartmentSettingUpdate,
    Season, ProhibitedItem, ProhibitedItemCreate,
)

router = APIRouter()


# ============= Dropdown Options Routes =============
@router.get("/admin/dropdown-options")
async def get_dropdown_options(category: Optional[str] = None, admin: dict = Depends(require_admin)):
    query = {}
    if category:
        query["category"] = category
    options = await db.dropdown_options.find(query, {"_id": 0}).sort("order", 1).to_list(1000)
    return options


@router.get("/admin/dropdown-options/categories")
async def get_dropdown_categories(admin: dict = Depends(require_admin)):
    categories = await db.dropdown_options.distinct("category")
    return {
        "categories": categories,
        "available_categories": [
            {"id": "gate_types", "name": "أنواع الأبواب", "name_en": "Gate Types"},
            {"id": "gate_statuses", "name": "حالات الأبواب", "name_en": "Gate Statuses"},
            {"id": "directions", "name": "الاتجاهات", "name_en": "Directions"},
            {"id": "categories", "name": "الفئات", "name_en": "Categories"},
            {"id": "classifications", "name": "التصنيفات", "name_en": "Classifications"},
            {"id": "current_indicators", "name": "مؤشرات الازدحام", "name_en": "Crowd Indicators"},
            {"id": "shifts", "name": "الورديات", "name_en": "Shifts"},
            {"id": "plaza_zones", "name": "مناطق الساحات", "name_en": "Plaza Zones"}
        ]
    }


@router.post("/admin/dropdown-options")
async def create_dropdown_option(option: DropdownOptionCreate, admin: dict = Depends(require_admin)):
    option_dict = option.model_dump()
    option_obj = DropdownOption(**option_dict)
    doc = option_obj.model_dump()
    await db.dropdown_options.insert_one(doc)
    await log_activity("إضافة خيار قائمة", admin, f"{option.category}", f"تم إضافة: {option.label}")
    return option_obj


@router.put("/admin/dropdown-options/{option_id}")
async def update_dropdown_option(option_id: str, option: DropdownOptionUpdate, admin: dict = Depends(require_admin)):
    existing = await db.dropdown_options.find_one({"id": option_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="الخيار غير موجود")
    update_data = {k: v for k, v in option.model_dump().items() if v is not None}
    if update_data:
        await db.dropdown_options.update_one({"id": option_id}, {"$set": update_data})
        await log_activity("تعديل خيار قائمة", admin, option_id, f"تم تعديل: {existing.get('label')}")
    updated = await db.dropdown_options.find_one({"id": option_id}, {"_id": 0})
    return updated


@router.delete("/admin/dropdown-options/{option_id}")
async def delete_dropdown_option(option_id: str, admin: dict = Depends(require_admin)):
    existing = await db.dropdown_options.find_one({"id": option_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="الخيار غير موجود")
    await db.dropdown_options.delete_one({"id": option_id})
    await log_activity("حذف خيار قائمة", admin, option_id, f"تم حذف: {existing.get('label')}")
    return {"message": "تم حذف الخيار بنجاح"}


@router.post("/admin/dropdown-options/seed")
async def seed_dropdown_options(admin: dict = Depends(require_admin)):
    count = await db.dropdown_options.count_documents({})
    if count > 0:
        return {"message": "البيانات موجودة مسبقاً", "count": count}
    default_options = [
        {"category": "gate_types", "value": "رئيسي", "label": "رئيسي", "order": 1},
        {"category": "gate_types", "value": "فرعي", "label": "فرعي", "order": 2},
        {"category": "gate_types", "value": "سلم كهربائي", "label": "سلم كهربائي", "order": 3},
        {"category": "gate_types", "value": "مصعد", "label": "مصعد", "order": 4},
        {"category": "gate_types", "value": "درج", "label": "درج", "order": 5},
        {"category": "gate_types", "value": "جسر", "label": "جسر", "order": 6},
        {"category": "gate_types", "value": "مشابة", "label": "مشابة", "order": 7},
        {"category": "gate_types", "value": "عبارة", "label": "عبارة", "order": 8},
        {"category": "gate_types", "value": "مزلقان", "label": "مزلقان", "order": 9},
        {"category": "directions", "value": "دخول", "label": "دخول", "order": 1},
        {"category": "directions", "value": "خروج", "label": "خروج", "order": 2},
        {"category": "directions", "value": "دخول وخروج", "label": "دخول وخروج", "order": 3},
        {"category": "categories", "value": "محرمين", "label": "محرمين", "order": 1},
        {"category": "categories", "value": "مصلين", "label": "مصلين", "order": 2},
        {"category": "categories", "value": "عربات", "label": "عربات", "order": 3},
        {"category": "classifications", "value": "عام", "label": "عام", "order": 1},
        {"category": "classifications", "value": "رجال", "label": "رجال", "order": 2},
        {"category": "classifications", "value": "نساء", "label": "نساء", "order": 3},
        {"category": "classifications", "value": "طوارئ", "label": "طوارئ", "order": 4},
        {"category": "classifications", "value": "خدمات", "label": "خدمات", "order": 5},
        {"category": "classifications", "value": "جنائز", "label": "جنائز", "order": 6},
        {"category": "gate_statuses", "value": "مفتوح", "label": "مفتوح", "order": 1},
        {"category": "gate_statuses", "value": "مغلق", "label": "مغلق", "order": 2},
        {"category": "current_indicators", "value": "خفيف", "label": "خفيف", "color": "#22c55e", "order": 1},
        {"category": "current_indicators", "value": "متوسط", "label": "متوسط", "color": "#f97316", "order": 2},
        {"category": "current_indicators", "value": "مزدحم", "label": "مزدحم", "color": "#ef4444", "order": 3},
        {"category": "shifts", "value": "الأولى", "label": "الأولى", "color": "#3b82f6", "order": 1},
        {"category": "shifts", "value": "الثانية", "label": "الثانية", "color": "#22c55e", "order": 2},
        {"category": "shifts", "value": "الثالثة", "label": "الثالثة", "color": "#f97316", "order": 3},
        {"category": "shifts", "value": "الرابعة", "label": "الرابعة", "color": "#a855f7", "order": 4},
    ]
    options_to_insert = [DropdownOption(**opt_data).model_dump() for opt_data in default_options]
    await db.dropdown_options.insert_many(options_to_insert)
    await log_activity("تهيئة القوائم", admin, "dropdown_options", f"تم إضافة {len(options_to_insert)} خيار")
    return {"message": "تم تهيئة القوائم بنجاح", "count": len(options_to_insert)}


@router.get("/dropdown-options")
async def get_public_dropdown_options(category: Optional[str] = None):
    query = {"is_active": True}
    if category:
        query["category"] = category
    options = await db.dropdown_options.find(query, {"_id": 0}).sort("order", 1).to_list(1000)
    if not category:
        grouped = {}
        for opt in options:
            cat = opt["category"]
            if cat not in grouped:
                grouped[cat] = []
            grouped[cat].append(opt)
        return grouped
    return options


# ============= Login Page Settings =============
@router.get("/settings/login-page")
async def get_login_page_settings():
    settings = await db.login_settings.find_one({"id": "login_settings"}, {"_id": 0})
    if not settings:
        return LoginPageSettings().model_dump()
    return settings


@router.put("/admin/settings/login-page")
async def update_login_page_settings(settings: LoginPageSettingsUpdate, admin: dict = Depends(require_admin)):
    update_data = {k: v for k, v in settings.model_dump().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.login_settings.update_one({"id": "login_settings"}, {"$set": update_data}, upsert=True)
        await log_activity("تحديث إعدادات شاشة الدخول", admin, "login_settings", "تم تحديث الإعدادات")
    updated = await db.login_settings.find_one({"id": "login_settings"}, {"_id": 0})
    return updated


# ============= Header Settings =============
@router.get("/settings/header")
async def get_header_settings():
    settings = await db.header_settings.find_one({"id": "header_settings"}, {"_id": 0})
    if not settings:
        return HeaderSettings().model_dump()
    return settings


@router.put("/admin/settings/header")
async def update_header_settings(settings: HeaderSettingsUpdate, admin: dict = Depends(require_admin)):
    update_data = {k: v for k, v in settings.model_dump().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.header_settings.update_one({"id": "header_settings"}, {"$set": update_data}, upsert=True)
        await log_activity("تحديث إعدادات Header", admin, "header_settings", "تم تحديث الإعدادات")
    updated = await db.header_settings.find_one({"id": "header_settings"}, {"_id": 0})
    return updated


# ============= PWA / Mobile Settings =============
@router.get("/settings/pwa")
async def get_pwa_settings():
    settings = await db.pwa_settings.find_one({"id": "pwa_settings"}, {"_id": 0})
    if not settings:
        return PWASettings().model_dump()
    return settings


@router.put("/admin/settings/pwa")
async def update_pwa_settings(settings: PWASettingsUpdate, admin: dict = Depends(require_admin)):
    import json, base64, os

    update_data = {k: v for k, v in settings.model_dump().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.pwa_settings.update_one(
            {"id": "pwa_settings"}, {"$set": update_data}, upsert=True
        )

    # Fetch full settings to rebuild manifest
    doc = await db.pwa_settings.find_one({"id": "pwa_settings"}, {"_id": 0})
    if not doc:
        doc = PWASettings().model_dump()

    # Update manifest.json
    manifest_path = "/app/frontend/public/manifest.json"
    manifest = {
        "name": doc.get("app_name_ar", "منصة خدمات الحشود"),
        "short_name": doc.get("app_name_short_ar", "حشود"),
        "description": "الإدارة العامة للتخطيط وخدمات الحشود في الحرم المكي الشريف",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#0a1628",
        "theme_color": doc.get("theme_color", "#004D38"),
        "orientation": "any",
        "lang": "ar",
        "dir": "rtl",
        "scope": "/",
        "icons": [
            {"src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable"},
            {"src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"}
        ]
    }
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    # Save icon if provided as base64
    icon_data = doc.get("icon_url", "")
    if icon_data and icon_data.startswith("data:image"):
        try:
            header, b64data = icon_data.split(",", 1)
            img_bytes = base64.b64decode(b64data)
            from PIL import Image
            import io
            img = Image.open(io.BytesIO(img_bytes)).convert("RGBA")
            img.resize((512, 512), Image.LANCZOS).save("/app/frontend/public/icon-512.png")
            img.resize((192, 192), Image.LANCZOS).save("/app/frontend/public/icon-192.png")
        except Exception:
            pass

    await log_activity("تحديث إعدادات الجوال", admin, "pwa_settings", "تم تحديث إعدادات PWA")
    updated = await db.pwa_settings.find_one({"id": "pwa_settings"}, {"_id": 0})
    return updated or doc


# ============= Sidebar Menu =============
@router.get("/admin/sidebar-menu")
async def get_sidebar_menu_items(admin: dict = Depends(require_admin)):
    items = await db.sidebar_menu.find({}, {"_id": 0}).sort("order", 1).to_list(1000)
    return items


@router.get("/sidebar-menu")
async def get_user_sidebar_menu(user: dict = Depends(get_current_user)):
    items = await db.sidebar_menu.find({"is_active": True}, {"_id": 0}).sort("order", 1).to_list(1000)
    user_role = user.get("role")
    user_dept = user.get("department")

    # Get user's permissions for page-level filtering
    user_permissions = {}
    if user_role == "system_admin":
        user_permissions = {k: "write" for k in ["page_overview", "page_employees", "page_daily_log", "page_transactions", "page_settings"]}
    else:
        from routes.permissions import _normalize_permissions, DEFAULT_PERMISSIONS
        doc = await db.role_permissions.find_one({"role": user_role}, {"_id": 0})
        if doc:
            user_permissions = _normalize_permissions(doc.get("permissions", {}))
        else:
            user_permissions = DEFAULT_PERMISSIONS.get(user_role, {})

    # Map sidebar items to page permissions by href pattern or name
    PAGE_PERM_MAP = {
        "daily-sessions": "page_daily_log",
        "daily-gates": "page_daily_log",
        "map-management": "page_settings",
        "gate-map": "page_settings",
        "?tab=transactions": "page_transactions",
        "?tab=settings": "page_settings",
        "?tab=employees": "page_employees",
    }

    # Names that map to page_overview (نظرة عامة pages that use department root URL)
    OVERVIEW_NAMES = ["نظرة عامة", "Overview"]

    def _has_page_perm(item):
        """Check if user has permission for this sidebar item"""
        if user_role == "system_admin":
            return True
        href = item.get("href", "")
        name = item.get("name_ar", "")
        
        # Check if it's an overview page by name
        if name in OVERVIEW_NAMES:
            return "page_overview" in user_permissions
        
        # Check href patterns
        for pattern, perm in PAGE_PERM_MAP.items():
            if pattern in href:
                return perm in user_permissions
        
        return True  # No mapping = allow

    filtered_items = []
    accessible_parent_ids = set()
    for item in items:
        if item.get("parent_id"):
            continue
        if item.get("admin_only") and user_role != "system_admin":
            continue
        if item.get("roles") and user_role not in item.get("roles"):
            continue
        if item.get("is_public"):
            filtered_items.append(item)
            accessible_parent_ids.add(item.get("id"))
            continue
        if item.get("department"):
            if user_role in ["system_admin", "general_manager", "monitoring_team"]:
                filtered_items.append(item)
                accessible_parent_ids.add(item.get("id"))
            elif user_dept and user_dept == item.get("department"):
                filtered_items.append(item)
                accessible_parent_ids.add(item.get("id"))
        else:
            filtered_items.append(item)
            accessible_parent_ids.add(item.get("id"))

    # Filter children by parent access AND page permissions
    for item in items:
        if item.get("parent_id") and item.get("parent_id") in accessible_parent_ids:
            if _has_page_perm(item):
                filtered_items.append(item)
    return filtered_items


@router.post("/admin/sidebar-menu")
async def create_sidebar_menu_item(item: SidebarMenuItemCreate, admin: dict = Depends(require_admin)):
    item_dict = item.model_dump()
    item_obj = SidebarMenuItem(**item_dict)
    doc = item_obj.model_dump()
    await db.sidebar_menu.insert_one(doc)
    await log_activity("إضافة قسم للقائمة", admin, item_obj.id, f"تم إضافة: {item.name_ar}")
    return item_obj


@router.put("/admin/sidebar-menu/{item_id}")
async def update_sidebar_menu_item(item_id: str, item: SidebarMenuItemUpdate, admin: dict = Depends(require_admin)):
    existing = await db.sidebar_menu.find_one({"id": item_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="القسم غير موجود")
    update_data = {k: v for k, v in item.model_dump().items() if v is not None}
    if update_data:
        await db.sidebar_menu.update_one({"id": item_id}, {"$set": update_data})
        await log_activity("تعديل قسم في القائمة", admin, item_id, f"تم تعديل: {existing.get('name_ar')}")
    updated = await db.sidebar_menu.find_one({"id": item_id}, {"_id": 0})
    return updated


@router.delete("/admin/sidebar-menu/{item_id}")
async def delete_sidebar_menu_item(item_id: str, admin: dict = Depends(require_admin)):
    existing = await db.sidebar_menu.find_one({"id": item_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="القسم غير موجود")
    await db.sidebar_menu.delete_one({"id": item_id})
    await log_activity("حذف قسم من القائمة", admin, item_id, f"تم حذف: {existing.get('name_ar')}")
    return {"message": "تم حذف القسم بنجاح"}


@router.post("/admin/sidebar-menu/seed")
async def seed_sidebar_menu(admin: dict = Depends(require_admin)):
    count = await db.sidebar_menu.count_documents({})
    if count > 0:
        return {"message": "القائمة موجودة مسبقاً", "count": count}
    default_items = [
        {"name_ar": "لوحة التحكم", "name_en": "Dashboard", "href": "/", "icon": "LayoutDashboard", "order": 1, "is_public": True},
        {"name_ar": "الخريطة التفاعلية", "name_en": "Interactive Map", "href": "/map", "icon": "Map", "order": 2, "is_public": True},
        {"name_ar": "تخطيط خدمات الحشود", "name_en": "Crowd Planning", "href": "/planning", "icon": "ClipboardList", "order": 3, "department": "planning"},
        {"name_ar": "إدارة الساحات", "name_en": "Plazas Management", "href": "/plazas", "icon": "LayoutGrid", "order": 4, "department": "plazas"},
        {"name_ar": "إدارة الأبواب", "name_en": "Gates Management", "href": "/gates", "icon": "DoorOpen", "order": 5, "department": "gates"},
        {"name_ar": "خدمات الحشود", "name_en": "Crowd Services", "href": "/crowd-services", "icon": "Users", "order": 6, "department": "crowd_services"},
        {"name_ar": "صحن المطاف", "name_en": "Mataf Management", "href": "/mataf", "icon": "Circle", "order": 7, "department": "mataf"},
        {"name_ar": "التقارير", "name_en": "Reports", "href": "/reports", "icon": "FileText", "order": 8, "is_public": False},
        {"name_ar": "الإشعارات", "name_en": "Notifications", "href": "/notifications", "icon": "Bell", "order": 9, "is_public": False},
        {"name_ar": "الإعدادات", "name_en": "Settings", "href": "/settings", "icon": "Settings", "order": 10, "is_public": False},
        {"name_ar": "لوحة الأدمن", "name_en": "Admin Panel", "href": "/admin", "icon": "Shield", "order": 11, "admin_only": True},
    ]
    items_to_insert = [SidebarMenuItem(**item_data).model_dump() for item_data in default_items]
    await db.sidebar_menu.insert_many(items_to_insert)
    await log_activity("تهيئة القائمة الجانبية", admin, "sidebar_menu", f"تم إضافة {len(items_to_insert)} قسم")
    return {"message": "تم تهيئة القائمة بنجاح", "count": len(items_to_insert)}


# ============= Zone Categories =============
@router.get("/zone-categories")
async def get_zone_categories():
    categories = await db.zone_categories.find({"is_active": True}, {"_id": 0}).sort("order", 1).to_list(100)
    return categories


@router.get("/admin/zone-categories")
async def get_all_zone_categories(admin: dict = Depends(require_admin)):
    categories = await db.zone_categories.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return categories


@router.post("/admin/zone-categories")
async def create_zone_category(data: ZoneCategoryCreate, admin: dict = Depends(require_admin)):
    existing = await db.zone_categories.find_one({"value": data.value}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="فئة بهذا المعرف موجودة مسبقاً")
    cat = ZoneCategory(**data.model_dump())
    await db.zone_categories.insert_one(cat.model_dump())
    await log_activity("إضافة فئة منطقة", admin, cat.id, f"{data.label_ar}")
    result = cat.model_dump()
    result.pop("_id", None)
    return result


@router.put("/admin/zone-categories/{cat_id}")
async def update_zone_category(cat_id: str, data: ZoneCategoryUpdate, admin: dict = Depends(require_admin)):
    existing = await db.zone_categories.find_one({"id": cat_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="الفئة غير موجودة")

    # Allow explicit null for pattern fields (clearing them when switching solid↔pattern)
    NULLABLE_FIELDS = {"pattern_type", "pattern_fg_color", "pattern_bg_color"}
    update_data = {}
    for k, v in data.model_dump().items():
        if v is not None:
            update_data[k] = v
        elif k in NULLABLE_FIELDS:
            update_data[k] = None  # Explicitly clear pattern fields

    if update_data:
        await db.zone_categories.update_one({"id": cat_id}, {"$set": update_data})
    updated = await db.zone_categories.find_one({"id": cat_id}, {"_id": 0})

    # Propagate style to all map_sessions zones with this zone_type
    if updated:
        zone_style = {
            "fill_color": updated.get("color", "#22c55e"),
            "fill_type": updated.get("fill_type", "solid"),
            "pattern_type": updated.get("pattern_type"),
            "pattern_fg_color": updated.get("pattern_fg_color"),
            "pattern_bg_color": updated.get("pattern_bg_color"),
            "stroke_color": updated.get("stroke_color", "#000000"),
            "stroke_width": updated.get("stroke_width", 0.3),
            "stroke_style": updated.get("stroke_style", "dashed"),
            "stroke_opacity": updated.get("stroke_opacity", 1.0),
            "opacity": 0.4,
        }
        cat_value = updated["value"]
        # Update map_sessions zones array
        await db.map_sessions.update_many(
            {"zones.zone_type": cat_value},
            {"$set": {f"zones.$[elem].{k}": v for k, v in zone_style.items()}},
            array_filters=[{"elem.zone_type": cat_value}]
        )
        # Update map_zones (master zones)
        await db.map_zones.update_many(
            {"zone_type": cat_value},
            {"$set": {k: v for k, v in zone_style.items()}}
        )

    return updated


@router.delete("/admin/zone-categories/{cat_id}")
async def delete_zone_category(cat_id: str, admin: dict = Depends(require_admin)):
    existing = await db.zone_categories.find_one({"id": cat_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="الفئة غير موجودة")
    await db.zone_categories.delete_one({"id": cat_id})
    await log_activity("حذف فئة منطقة", admin, cat_id, f"تم حذف: {existing.get('label_ar')}")
    return {"message": "تم حذف الفئة"}


@router.post("/admin/zone-categories/seed")
async def seed_zone_categories(admin: dict = Depends(require_admin)):
    count = await db.zone_categories.count_documents({})
    if count > 0:
        return {"message": "الفئات موجودة مسبقاً", "count": count}
    defaults = [
        {"value": "men_prayer", "label_ar": "مصليات الرجال", "label_en": "Men Prayer Areas", "color": "#22c55e", "icon": "M", "order": 1},
        {"value": "women_prayer", "label_ar": "مصليات النساء", "label_en": "Women Prayer Areas", "color": "#93c5fd", "icon": "W", "order": 2},
        {"value": "men_rakatayn", "label_ar": "مصلى الركعتين للرجال", "label_en": "Two-Rak'ah Men", "color": "#16a34a", "icon": "R", "order": 3},
        {"value": "women_rakatayn", "label_ar": "مصلى الركعتين للنساء", "label_en": "Two-Rak'ah Women", "color": "#60a5fa", "icon": "Q", "order": 4},
        {"value": "men_tasks", "label_ar": "مصلى مهمات رجال", "label_en": "Men Tasks Prayer", "color": "#9ca3af", "icon": "H", "order": 5},
        {"value": "women_tasks", "label_ar": "مصلى مهمات نساء", "label_en": "Women Tasks Prayer", "color": "#fdba74", "icon": "N", "order": 6},
        {"value": "emergency", "label_ar": "مجمعات خدمات الطوارئ", "label_en": "Emergency Services", "color": "#78350f", "icon": "!", "order": 7},
        {"value": "vip", "label_ar": "مصلى رؤساء الدول ومرافقيهم", "label_en": "VIP / Heads of State", "color": "#1e3a5f", "icon": "V", "order": 8},
        {"value": "funeral", "label_ar": "مصلى الجنائز", "label_en": "Funeral Prayer", "color": "#a8a29e", "icon": "J", "order": 9},
        {"value": "disabled_men", "label_ar": "مصلى ذوي الإعاقة والمسنين", "label_en": "Disabled & Elderly Men", "color": "#1d4ed8", "icon": "D", "order": 10},
        {"value": "disabled_women", "label_ar": "مصلى المسنات وذوي الإعاقة من النساء", "label_en": "Disabled & Elderly Women", "color": "#be123c", "icon": "F", "order": 11},
        {"value": "reserve_fard", "label_ar": "مصليات احتياطية (وقت الفروض)", "label_en": "Reserve (Prayer Times)", "color": "#ea580c", "icon": "A", "order": 12},
        {"value": "reserve_general", "label_ar": "مصليات احتياطية", "label_en": "Reserve Prayer Areas", "color": "#4ade80", "icon": "P", "order": 13},
        {"value": "elevated", "label_ar": "مصليات مرتقبة", "label_en": "Anticipated Prayer Areas", "color": "#b0b0b0", "icon": "E", "order": 14},
        {"value": "service", "label_ar": "خدمات", "label_en": "Services", "color": "#374151", "icon": "X", "order": 15},
    ]
    items = [ZoneCategory(**d).model_dump() for d in defaults]
    await db.zone_categories.insert_many(items)
    return {"message": "تم تهيئة الفئات بنجاح", "count": len(items)}


# ============= Season Management =============
@router.get("/settings/season")
async def get_active_season():
    season = await db.seasons.find_one({"id": "active_season"}, {"_id": 0})
    if not season:
        return Season().model_dump()
    return season


@router.put("/admin/settings/season")
async def update_season(season_name: str, admin: dict = Depends(require_admin)):
    valid_seasons = ["normal", "umrah", "ramadan", "hajj"]
    if season_name not in valid_seasons:
        raise HTTPException(status_code=400, detail="موسم غير صالح")
    season_data = {"id": "active_season", "current_season": season_name, "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.seasons.update_one({"id": "active_season"}, {"$set": season_data}, upsert=True)
    if season_name == "normal":
        await db.gates.update_many({}, {"$set": {"status": "مغلق"}})
    else:
        await db.gates.update_many({"operational_seasons": season_name}, {"$set": {"status": "مفتوح"}})
        await db.gates.update_many({"operational_seasons": {"$ne": season_name}}, {"$set": {"status": "مغلق"}})
    active_count = await db.gates.count_documents({"status": "مفتوح"})
    await db.seasons.update_one({"id": "active_season"}, {"$set": {"active_gates_count": active_count}})
    await log_activity("تغيير الموسم", admin, "active_season", f"الموسم النشط: {season_name}")
    return {"message": f"تم تفعيل موسم {season_name}", "active_gates": active_count}


# ============= Prohibited Items =============
@router.get("/prohibited-items")
async def get_prohibited_items(category: Optional[str] = None):
    query = {"is_active": True}
    if category:
        query["category"] = category
    items = await db.prohibited_items.find(query, {"_id": 0}).to_list(1000)
    return items


@router.post("/admin/prohibited-items")
async def create_prohibited_item(item: ProhibitedItemCreate, admin: dict = Depends(require_admin)):
    item_dict = item.model_dump()
    item_obj = ProhibitedItem(**item_dict)
    doc = item_obj.model_dump()
    await db.prohibited_items.insert_one(doc)
    await log_activity("إضافة عنصر ممنوع", admin, item_obj.id, item.name_ar)
    return item_obj


@router.delete("/admin/prohibited-items/{item_id}")
async def delete_prohibited_item(item_id: str, admin: dict = Depends(require_admin)):
    result = await db.prohibited_items.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="العنصر غير موجود")
    await log_activity("حذف عنصر ممنوع", admin, item_id, "تم الحذف")
    return {"message": "تم حذف العنصر بنجاح"}


# ============= Department Settings =============
@router.get("/{department}/settings/{setting_type}")
async def get_department_settings(department: str, setting_type: str, user: dict = Depends(get_current_user)):
    settings = await db.department_settings.find({"department": department, "setting_type": setting_type, "is_active": True}, {"_id": 0}).sort("order", 1).to_list(100)
    return settings


@router.post("/{department}/settings")
async def create_department_setting(department: str, setting: DepartmentSettingCreate, user: dict = Depends(require_department_manager)):
    if user["role"] == "department_manager" and user.get("department") != department:
        raise HTTPException(status_code=403, detail="يمكنك تعديل إعدادات قسمك فقط")
    setting_doc = {"id": str(uuid.uuid4()), **setting.model_dump(), "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat(), "is_active": True}
    await db.department_settings.insert_one(setting_doc)
    await log_activity("setting_created", user, f"{department}:{setting.setting_type}", f"تم إضافة إعداد: {setting.label}")
    return {"message": "تم إضافة الإعداد بنجاح", "id": setting_doc["id"]}


@router.put("/{department}/settings/{setting_id}")
async def update_department_setting(department: str, setting_id: str, setting: DepartmentSettingUpdate, user: dict = Depends(require_department_manager)):
    existing = await db.department_settings.find_one({"id": setting_id, "department": department}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="الإعداد غير موجود")
    if user["role"] == "department_manager" and user.get("department") != department:
        raise HTTPException(status_code=403, detail="يمكنك تعديل إعدادات قسمك فقط")
    update_data = {k: v for k, v in setting.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.department_settings.update_one({"id": setting_id}, {"$set": update_data})
    await log_activity("setting_updated", user, f"{department}:{existing['setting_type']}", f"تم تحديث إعداد: {existing['label']}")
    return {"message": "تم تحديث الإعداد بنجاح"}


@router.delete("/{department}/settings/{setting_id}")
async def delete_department_setting(department: str, setting_id: str, user: dict = Depends(require_department_manager)):
    existing = await db.department_settings.find_one({"id": setting_id, "department": department}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="الإعداد غير موجود")
    if user["role"] == "department_manager" and user.get("department") != department:
        raise HTTPException(status_code=403, detail="يمكنك حذف إعدادات قسمك فقط")
    await db.department_settings.delete_one({"id": setting_id})
    await log_activity("setting_deleted", user, f"{department}:{existing['setting_type']}", f"تم حذف إعداد: {existing['label']}")
    return {"message": "تم حذف الإعداد بنجاح"}
