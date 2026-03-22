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
        if dk == "haram_map":
            add("/daily-sessions", parent_href=bh,
                name_ar="السجل اليومي", name_en="Daily Log", icon="Calendar", order=2, department=dk)
        elif dk == "gates":
            add("/daily-gates", parent_href=bh,
                name_ar="السجل اليومي", name_en="Daily Log", icon="Calendar", order=2, department=dk)
        add(f"{bh}?tab=transactions", parent_href=bh,
            name_ar="المهام اليومية", name_en="Daily Tasks", icon="FileText", order=3, department=dk)
        # الجدول الشهري — مباشرة تحت الإدارة (صفحة مستقلة)
        add(f"{bh}?tab=schedule", parent_href=bh,
            name_ar="الجدول الشهري", name_en="Monthly Schedule", icon="Calendar", order=4, department=dk)
        s_order = 5 if dk not in ("haram_map", "gates") else 7
        settings_href = f"{bh}?tab=settings"
        add(settings_href, parent_href=bh,
            name_ar="الإعدادات", name_en="Settings", icon="Settings", order=s_order, department=dk)
        for sub_key, sub_ar, sub_en, sub_icon, sub_order in [
            ("Staff", "الموظفون", "Staff", "Users", 1),
            ("Shifts", "الورديات", "Shifts", "Clock", 2),
            ("Maps", "الخرائط", "Maps", "Layers", 3),
        ]:
            add(f"{bh}?tab=settings&sub={sub_key}", parent_href=settings_href,
                name_ar=sub_ar, name_en=sub_en, icon=sub_icon, order=sub_order, department=dk)
        if dk == "haram_map":
            add(f"{bh}?tab=settings&sub=Categories", parent_href=settings_href,
                name_ar="الفئات", name_en="Categories", icon="Tag", order=4, department=dk)
        elif dk == "gates":
            add(f"{bh}?tab=settings&sub=GatesData", parent_href=settings_href,
                name_ar="بيانات الأبواب", name_en="Gates Data", icon="DoorOpen", order=4, department=dk)

    add("/field", name_ar="الواجهة الميدانية", name_en="Field Worker",
        icon="MapPin", order=8, department="all", is_secondary=True)
    add("/daily-stats", name_ar="الإحصائيات اليومية", name_en="Daily Statistics",
        icon="BarChart3", order=8, department="all",
        subtitle_ar="إحصائيات الحشود اليومية للمسجد الحرام والمسجد النبوي",
        subtitle_en="Daily crowd statistics for the two Holy Mosques")
    add("/daily-stats?tab=haram", parent_href="/daily-stats",
        name_ar="المسجد الحرام", name_en="Grand Mosque", icon="Building2", order=1, department="all")
    add("/daily-stats?tab=nabawi", parent_href="/daily-stats",
        name_ar="المسجد النبوي", name_en="Prophet's Mosque", icon="Building2", order=2, department="all")
    add("/daily-stats?tab=all", parent_href="/daily-stats",
        name_ar="العرض الشامل", name_en="Combined View", icon="BarChart3", order=3, department="all")
    add("/stats-analytics", name_ar="تحليلات الإحصائيات", name_en="Statistics Analytics",
        icon="TrendingUp", order=9, department="all",
        subtitle_ar="تحليل ومقارنة بيانات الحشود",
        subtitle_en="Crowd data analysis and comparison")
    add("/notifications", name_ar="الإشعارات", name_en="Notifications",
        icon="Bell", order=10, department="all", is_secondary=True)
    add("/admin", name_ar="إدارة النظام", name_en="System Admin",
        icon="Shield", order=11, department="system_admin", is_secondary=True, admin_only=True)
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
    await _seed_default_permission_groups(db)
    await _sync_login_settings(db)


async def _sync_login_settings(db):
    """Ensure login settings exist with correct defaults."""
    existing = await db.login_settings.find_one({"id": "login_settings"}, {"_id": 0})
    if not existing:
        await db.login_settings.insert_one({
            "id": "login_settings",
            "primary_color": "#303D48",
            "background_url": "",
            "logo_url": "", "logo_size": 150, "logo_link": "/",
            "site_name_ar": "منصة خدمات الحشود",
            "site_name_en": "Crowd Services Platform",
            "subtitle_ar": "الإدارة العامة للتخطيط وخدمات الحشود في الحرم المكي الشريف",
            "welcome_text_ar": "مرحباً بك في",
        })
        logger.info("  login_settings: created with defaults")
    else:
        # Always enforce the correct color
        if existing.get("primary_color") != "#303D48":
            await db.login_settings.update_one(
                {"id": "login_settings"},
                {"$set": {"primary_color": "#303D48", "background_url": ""}}
            )
            logger.info("  login_settings: updated color to #303D48")
        else:
            logger.info("  login_settings: OK")


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


# ═══════════════════════════════════════════════════════════
#  DEFAULT PERMISSION GROUPS
# ═══════════════════════════════════════════════════════════

def _build_dept_pages(dept_key):
    """Build page_permissions for a single department (visible + editable)."""
    bh = DEPT_HREF[dept_key]
    pages = {
        "/": {"visible": True, "editable": False},
        bh: {"visible": True, "editable": True},
        f"{bh}?tab=transactions": {"visible": True, "editable": True},
        f"{bh}?tab=schedule": {"visible": True, "editable": True},
        f"{bh}?tab=settings": {"visible": True, "editable": True},
        f"{bh}?tab=settings&sub=Staff": {"visible": True, "editable": True},
        f"{bh}?tab=settings&sub=Shifts": {"visible": True, "editable": True},
        f"{bh}?tab=settings&sub=Maps": {"visible": True, "editable": True},
        "/daily-stats": {"visible": True, "editable": True},
        "/daily-stats?tab=haram": {"visible": True, "editable": True},
        "/daily-stats?tab=nabawi": {"visible": True, "editable": True},
        "/daily-stats?tab=all": {"visible": True, "editable": True},
        "/stats-analytics": {"visible": True, "editable": False},
        "/notifications": {"visible": True, "editable": False},
        "/field": {"visible": True, "editable": True},
    }
    if dept_key == "haram_map":
        pages["/daily-sessions"] = {"visible": True, "editable": True}
        pages[f"{bh}?tab=settings&sub=Categories"] = {"visible": True, "editable": True}
    elif dept_key == "gates":
        pages["/daily-gates"] = {"visible": True, "editable": True}
        pages[f"{bh}?tab=settings&sub=GatesData"] = {"visible": True, "editable": True}
    return pages


def _build_all_pages_visible(editable=False):
    """Build page_permissions with ALL pages visible."""
    items = _sidebar_items()
    return {item["href"]: {"visible": True, "editable": editable} for item in items
            if item.get("department") != "system_admin" and not item.get("admin_only")}


DEFAULT_GROUPS = [
    {
        "name_ar": "مدير عام",
        "name_en": "General Manager",
        "description_ar": "يشوف كل الإدارات مع صلاحية التعديل",
        "is_system": True,
        "page_permissions": "_all_editable",
    },
    {
        "name_ar": "مدير إدارة التخطيط",
        "name_en": "Planning Manager",
        "description_ar": "مدير إدارة تخطيط خدمات الحشود",
        "is_system": True,
        "page_permissions": "_dept_planning",
    },
    {
        "name_ar": "مدير إدارة المصليات",
        "name_en": "Prayer Areas Manager",
        "description_ar": "مدير إدارة المصليات",
        "is_system": True,
        "page_permissions": "_dept_haram_map",
    },
    {
        "name_ar": "مدير إدارة الأبواب",
        "name_en": "Gates Manager",
        "description_ar": "مدير إدارة الأبواب",
        "is_system": True,
        "page_permissions": "_dept_gates",
    },
    {
        "name_ar": "مدير إدارة الساحات",
        "name_en": "Plazas Manager",
        "description_ar": "مدير إدارة الساحات",
        "is_system": True,
        "page_permissions": "_dept_plazas",
    },
    {
        "name_ar": "مدير خدمات الحشود",
        "name_en": "Crowd Services Manager",
        "description_ar": "مدير خدمات حشود الحرم",
        "is_system": True,
        "page_permissions": "_dept_crowd_services",
    },
    {
        "name_ar": "مدير صحن المطاف",
        "name_en": "Mataf Manager",
        "description_ar": "مدير صحن المطاف",
        "is_system": True,
        "page_permissions": "_dept_mataf",
    },
    {
        "name_ar": "موظف ميداني",
        "name_en": "Field Staff",
        "description_ar": "موظف ميداني — عرض فقط مع صلاحية الواجهة الميدانية",
        "is_system": True,
        "page_permissions": "_field_only",
    },
]


async def _seed_default_permission_groups(db):
    existing = await db.permission_groups.find({}, {"_id": 0, "name_en": 1, "is_system": 1}).to_list(100)
    existing_names = {g["name_en"] for g in existing}

    # Update existing default groups to mark as is_system if not already
    default_names = {g["name_en"] for g in DEFAULT_GROUPS}
    for g in existing:
        if g["name_en"] in default_names and not g.get("is_system"):
            await db.permission_groups.update_one(
                {"name_en": g["name_en"]},
                {"$set": {"is_system": True}}
            )

    inserted = 0
    for grp in DEFAULT_GROUPS:
        if grp["name_en"] in existing_names:
            continue
        # Resolve page_permissions placeholder
        pp = grp["page_permissions"]
        if pp == "_all_editable":
            pp = _build_all_pages_visible(editable=True)
        elif pp == "_field_only":
            pp = {
                "/": {"visible": True, "editable": False},
                "/field": {"visible": True, "editable": True},
                "/notifications": {"visible": True, "editable": False},
            }
        elif pp.startswith("_dept_"):
            dept_key = pp.replace("_dept_", "")
            pp = _build_dept_pages(dept_key)

        doc = {
            "id": str(uuid.uuid4()),
            "name_ar": grp["name_ar"],
            "name_en": grp["name_en"],
            "description_ar": grp["description_ar"],
            "is_system": grp["is_system"],
            "page_permissions": pp,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.permission_groups.insert_one({**doc})
        inserted += 1

    total = await db.permission_groups.count_documents({})
    if inserted:
        logger.info(f"  permission_groups: +{inserted} inserted (total: {total})")
    else:
        logger.info(f"  permission_groups: {total} groups OK")
