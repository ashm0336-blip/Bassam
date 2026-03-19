"""
Auto-seed sidebar_menu on startup.
Ensures production database always has the complete menu structure.
Runs idempotently — safe to call on every server start.
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

def _all_items():
    """Return list of dicts: each has href, parent_href (or None), and all fields."""
    items = []

    def add(href, parent_href=None, **kw):
        kw["href"] = href
        kw["_parent_href"] = parent_href
        kw.setdefault("is_public", False)
        kw.setdefault("is_secondary", False)
        kw.setdefault("admin_only", False)
        kw.setdefault("is_active", True)
        items.append(kw)

    # ── Dashboard ──
    add("/", name_ar="لوحة التحكم", name_en="Dashboard", icon="LayoutDashboard", order=1,
        is_public=True, department="all",
        subtitle_ar="نظرة شاملة على حالة النظام", subtitle_en="System overview")

    # ── 6 Departments ──
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

        # Daily Tasks
        add(f"{bh}?tab=transactions", parent_href=bh,
            name_ar="المهام اليومية", name_en="Daily Tasks", icon="FileText",
            order=3, department=dk)

        # Daily Log (only haram_map + gates)
        if dk == "haram_map":
            add("/daily-sessions", parent_href=bh,
                name_ar="السجل اليومي", name_en="Daily Log", icon="Calendar",
                order=2, department=dk)
        elif dk == "gates":
            add("/daily-gates", parent_href=bh,
                name_ar="السجل اليومي", name_en="Daily Log", icon="Calendar",
                order=2, department=dk)

        # Settings
        settings_href = f"{bh}?tab=settings"
        s_order = 4
        if dk in ("haram_map", "gates"):
            s_order = 6
        add(settings_href, parent_href=bh,
            name_ar="الإعدادات", name_en="Settings", icon="Settings",
            order=s_order, department=dk)

        # Settings sub-pages
        subs = [
            ("Staff", "الموظفون", "Staff", "Users", 1),
            ("MonthlySchedule", "الجدول الشهري", "Monthly Schedule", "CalendarDays", 2),
            ("Shifts", "الورديات", "Shifts", "Clock", 3),
            ("Maps", "الخرائط", "Maps", "Layers", 4),
        ]
        for sub_key, sub_ar, sub_en, sub_icon, sub_order in subs:
            add(f"{bh}?tab=settings&sub={sub_key}", parent_href=settings_href,
                name_ar=sub_ar, name_en=sub_en, icon=sub_icon,
                order=sub_order, department=dk)

        # Extra sub-pages
        if dk == "haram_map":
            add(f"{bh}?tab=settings&sub=Categories", parent_href=settings_href,
                name_ar="الفئات", name_en="Categories", icon="Tag",
                order=5, department=dk)
        elif dk == "gates":
            add(f"{bh}?tab=settings&sub=GatesData", parent_href=settings_href,
                name_ar="بيانات الأبواب", name_en="Gates Data", icon="DoorOpen",
                order=5, department=dk)

    # ── Secondary pages ──
    add("/field", name_ar="الواجهة الميدانية", name_en="Field Worker",
        icon="MapPin", order=8, department="all", is_secondary=True)
    add("/notifications", name_ar="الإشعارات", name_en="Notifications",
        icon="Bell", order=9, department="all", is_secondary=True)
    add("/admin", name_ar="إدارة النظام", name_en="System Admin",
        icon="Shield", order=10, department="system_admin",
        is_secondary=True, admin_only=True)

    return items


async def seed_sidebar_menu(db):
    """
    Idempotent: inserts missing sidebar_menu items (matched by href).
    Also ensures role_visibility + is_editable fields exist on all items.
    """
    expected = _all_items()

    # Fetch existing items keyed by href
    existing_list = await db.sidebar_menu.find({}, {"_id": 0}).to_list(200)
    by_href = {item["href"]: item for item in existing_list}

    # Phase 1: insert missing items (roots first, then children, then grandchildren)
    # We do 3 passes to resolve parent_id references
    inserted = 0
    for _pass in range(3):
        for item in expected:
            href = item["href"]
            if href in by_href:
                continue  # already exists

            parent_href = item.get("_parent_href")
            if parent_href and parent_href not in by_href:
                continue  # parent not yet inserted, try next pass

            doc = {k: v for k, v in item.items() if not k.startswith("_")}
            doc["id"] = str(uuid.uuid4())
            doc["parent_id"] = by_href[parent_href]["id"] if parent_href else None
            doc["roles"] = None
            doc["role_visibility"] = {}
            doc["is_editable"] = True
            doc["created_at"] = datetime.now(timezone.utc).isoformat()

            await db.sidebar_menu.insert_one({**doc})
            by_href[href] = doc
            inserted += 1

    # Phase 2: ensure role_visibility and is_editable exist on all items
    r1 = await db.sidebar_menu.update_many(
        {"role_visibility": {"$exists": False}},
        {"$set": {"role_visibility": {}}}
    )
    r2 = await db.sidebar_menu.update_many(
        {"is_editable": {"$exists": False}},
        {"$set": {"is_editable": True}}
    )
    updated = r1.modified_count + r2.modified_count

    total = await db.sidebar_menu.count_documents({})
    if inserted or updated:
        logger.info(f"📋 Sidebar seed: +{inserted} items, ~{updated} fields patched (total: {total})")
    else:
        logger.info(f"📋 Sidebar: {total} items OK — no migration needed")
