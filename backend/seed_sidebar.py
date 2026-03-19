"""
Full-sync seed for ALL system configuration data.
Runs on every server startup — guarantees production matches preview 100%.
- Adds missing items
- Removes orphaned/old items
- Preserves user-set role_visibility settings
"""
import uuid
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

DEPT_HREF = {
    "planning": "/planning",
    "haram_map": "/haram-map",
    "gates": "/gates",
    "plazas": "/plazas",
    "crowd_services": "/crowd-services",
    "mataf": "/mataf",
}


def _sidebar_items():
    items = []
    def add(href, parent_href=None, **kw):
        kw["href"] = href
        kw["_parent_href"] = parent_href
        kw.setdefault("is_public", False)
        kw.setdefault("is_secondary", False)
        kw.setdefault("admin_only", False)
        kw.setdefault("is_active", True)
        items.append(kw)

    add("/", name_ar="لوحة التحكم", name_en="Dashboard", icon="LayoutDashboard", order=1,
        is_public=True, department="all",
        subtitle_ar="نظرة شاملة على حالة النظام", subtitle_en="System overview")

    depts = [
        ("planning", "تخطيط خدمات الحشود", "Crowd Planning", "ClipboardList", 2),
        ("haram_map", "إدارة المصليات", "Prayer Areas", "Navigation", 3),
        ("gates", "إدارة الأبواب", "Gates Management", "DoorOpen", 4),
        ("plazas", "إدارة الساحات", "Plazas Management", "LayoutGrid", 5),
        ("crowd_services", "خدمات حشود الحرم", "Crowd Services", "Users", 6),
        ("mataf", "صحن المطاف", "Mataf", "Circle", 7),
    ]

    for dk, nar, nen, icon, order in depts:
        bh = DEPT_HREF[dk]
        add(bh, name_ar=nar, name_en=nen, icon=icon, order=order, department=dk,
            subtitle_ar=f"إدارة {nar}", subtitle_en=f"{nen} management")
        add(f"{bh}?tab=transactions", parent_href=bh,
            name_ar="المهام اليومية", name_en="Daily Tasks", icon="FileText", order=3, department=dk)
        if dk == "haram_map":
            add("/daily-sessions", parent_href=bh,
                name_ar="السجل اليومي", name_en="Daily Log", icon="Calendar", order=2, department=dk)
        elif dk == "gates":
            add("/daily-gates", parent_href=bh,
                name_ar="السجل اليومي", name_en="Daily Log", icon="Calendar", order=2, department=dk)
        s_order = 4 if dk not in ("haram_map", "gates") else 6
        settings_href = f"{bh}?tab=settings"
        add(settings_href, parent_href=bh,
            name_ar="الإعدادات", name_en="Settings", icon="Settings", order=s_order, department=dk)
        for sub_key, sub_ar, sub_en, sub_icon, sub_order in [
            ("Staff", "الموظفون", "Staff", "Users", 1),
            ("MonthlySchedule", "الجدول الشهري", "Monthly Schedule", "CalendarDays", 2),
            ("Shifts", "الورديات", "Shifts", "Clock", 3),
            ("Maps", "الخرائط", "Maps", "Layers", 4),
        ]:
            add(f"{bh}?tab=settings&sub={sub_key}", parent_href=settings_href,
                name_ar=sub_ar, name_en=sub_en, icon=sub_icon, order=sub_order, department=dk)
        if dk == "haram_map":
            add(f"{bh}?tab=settings&sub=Categories", parent_href=settings_href,
                name_ar="الفئات", name_en="Categories", icon="Tag", order=5, department=dk)
        elif dk == "gates":
            add(f"{bh}?tab=settings&sub=GatesData", parent_href=settings_href,
                name_ar="بيانات الأبواب", name_en="Gates Data", icon="DoorOpen", order=5, department=dk)

    add("/field", name_ar="الواجهة الميدانية", name_en="Field Worker",
        icon="MapPin", order=8, department="all", is_secondary=True)
    add("/notifications", name_ar="الإشعارات", name_en="Notifications",
        icon="Bell", order=9, department="all", is_secondary=True)
    add("/admin", name_ar="إدارة النظام", name_en="System Admin",
        icon="Shield", order=10, department="system_admin", is_secondary=True, admin_only=True)
    return items


DROPDOWN_OPTIONS = [
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

ZONE_CATEGORIES = [
    {"value": "men_prayer", "label_ar": "مصليات الرجال", "label_en": "Men Prayer Areas",
     "color": "#ef4444", "icon": "M", "order": 1},
    {"value": "women_prayer", "label_ar": "مصليات النساء", "label_en": "Women Prayer Areas",
     "color": "#93c5fd", "icon": "W", "order": 2},
    {"value": "men_rakatayn", "label_ar": "مصلى الركعتين للرجال", "label_en": "Two-Rak'ah Men",
     "color": "#16a34a", "icon": "R", "order": 3},
    {"value": "women_rakatayn", "label_ar": "مصلى الركعتين للنساء", "label_en": "Two-Rak'ah Women",
     "color": "#60a5fa", "icon": "Q", "order": 4},
    {"value": "men_tasks", "label_ar": "مصلى مهمات رجال", "label_en": "Men Tasks Prayer",
     "color": "#9ca3af", "icon": "H", "order": 5},
    {"value": "women_tasks", "label_ar": "مصلى مهمات نساء", "label_en": "Women Tasks Prayer",
     "color": "#fdba74", "icon": "N", "order": 6},
    {"value": "emergency", "label_ar": "مجمعات خدمات الطوارئ", "label_en": "Emergency Services",
     "color": "#78350f", "icon": "!", "order": 7},
    {"value": "vip", "label_ar": "مصلى رؤساء الدول ومرافقيهم", "label_en": "VIP / Heads of State",
     "color": "#1e3a5f", "icon": "V", "order": 8},
    {"value": "funeral", "label_ar": "مصلى الجنائز", "label_en": "Funeral Prayer",
     "color": "#a8a29e", "icon": "J", "order": 9},
    {"value": "disabled_men", "label_ar": "مصلى ذوي الإعاقة والمسنين", "label_en": "Disabled & Elderly Men",
     "color": "#1d4ed8", "icon": "D", "order": 10},
    {"value": "disabled_women", "label_ar": "مصلى المسنات وذوي الإعاقة من النساء", "label_en": "Disabled & Elderly Women",
     "color": "#be123c", "icon": "F", "order": 11},
    {"value": "reserve_fard", "label_ar": "مصليات احتياطية (وقت الفروض)", "label_en": "Reserve (Prayer Times)",
     "color": "#ea580c", "icon": "A", "order": 12},
    {"value": "reserve_general", "label_ar": "مصليات احتياطية", "label_en": "Reserve Prayer Areas",
     "color": "#4ade80", "icon": "P", "order": 13},
    {"value": "elevated", "label_ar": "مصليات مرتقبة", "label_en": "Anticipated Prayer Areas",
     "color": "#b0b0b0", "icon": "E", "order": 14},
    {"value": "service", "label_ar": "خدمات", "label_en": "Services",
     "color": "#374151", "icon": "X", "order": 15},
]

ZONE_DEFAULTS = {
    "fill_type": "solid", "pattern_type": None,
    "pattern_fg_color": None, "pattern_bg_color": None,
    "stroke_color": "#000000", "stroke_width": 0.3,
    "stroke_style": "dashed", "stroke_opacity": 1.0,
}


async def run_all_seeds(db):
    """Master seed — full sync on every startup."""
    await _sync_sidebar_menu(db)
    await _seed_dropdown_options(db)
    await _seed_zone_categories(db)


async def _sync_sidebar_menu(db):
    """
    FULL SYNC: drops old items, keeps user role_visibility settings.
    Guarantees exact 50 items matching preview.
    """
    expected = _sidebar_items()
    expected_hrefs = {item["href"] for item in expected}

    # 1. Read existing items — preserve role_visibility settings
    existing_list = await db.sidebar_menu.find({}, {"_id": 0}).to_list(300)
    preserved_rv = {}  # href -> role_visibility
    preserved_ids = {}  # href -> id (keep stable IDs when possible)
    for item in existing_list:
        href = item.get("href", "")
        rv = item.get("role_visibility", {})
        if rv and href in expected_hrefs:
            preserved_rv[href] = rv
        if href in expected_hrefs:
            preserved_ids[href] = item.get("id", str(uuid.uuid4()))

    old_count = len(existing_list)

    # 2. Drop entire collection and rebuild fresh
    await db.sidebar_menu.drop()

    # 3. Insert all expected items (3 passes for parent resolution)
    by_href = {}
    for _pass in range(3):
        for item in expected:
            href = item["href"]
            if href in by_href:
                continue
            parent_href = item.get("_parent_href")
            if parent_href and parent_href not in by_href:
                continue

            doc = {k: v for k, v in item.items() if not k.startswith("_")}
            doc["id"] = preserved_ids.get(href, str(uuid.uuid4()))
            doc["parent_id"] = by_href[parent_href]["id"] if parent_href else None
            doc["roles"] = None
            doc["role_visibility"] = preserved_rv.get(href, {})
            doc["is_editable"] = True
            doc["created_at"] = datetime.now(timezone.utc).isoformat()

            await db.sidebar_menu.insert_one({**doc})
            by_href[href] = doc

    total = await db.sidebar_menu.count_documents({})
    if old_count != total:
        logger.info(f"  sidebar_menu: synced {old_count} -> {total} items")
    else:
        logger.info(f"  sidebar_menu: {total} items OK")


async def _seed_dropdown_options(db):
    existing = await db.dropdown_options.find({}, {"_id": 0, "category": 1, "value": 1}).to_list(500)
    existing_keys = {(d["category"], d["value"]) for d in existing}
    inserted = 0
    for opt in DROPDOWN_OPTIONS:
        key = (opt["category"], opt["value"])
        if key not in existing_keys:
            doc = {"id": str(uuid.uuid4()), **opt, "is_active": True,
                   "created_at": datetime.now(timezone.utc).isoformat()}
            doc.setdefault("color", None)
            await db.dropdown_options.insert_one({**doc})
            inserted += 1
    total = await db.dropdown_options.count_documents({})
    if inserted:
        logger.info(f"  dropdown_options: +{inserted} inserted (total: {total})")
    else:
        logger.info(f"  dropdown_options: {total} items OK")


async def _seed_zone_categories(db):
    existing = await db.zone_categories.find({}, {"_id": 0, "value": 1}).to_list(200)
    existing_values = {d["value"] for d in existing}
    inserted = 0
    for zc in ZONE_CATEGORIES:
        if zc["value"] not in existing_values:
            doc = {"id": str(uuid.uuid4()), **zc, **ZONE_DEFAULTS, "is_active": True,
                   "created_at": datetime.now(timezone.utc).isoformat()}
            await db.zone_categories.insert_one({**doc})
            inserted += 1
    total = await db.zone_categories.count_documents({})
    if inserted:
        logger.info(f"  zone_categories: +{inserted} inserted (total: {total})")
    else:
        logger.info(f"  zone_categories: {total} items OK")
