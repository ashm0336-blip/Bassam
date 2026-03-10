"""Professional Seed Data — 200+ gates, 50+ employees, schedules"""
from fastapi import APIRouter, Depends
from datetime import datetime, timezone
import uuid
import random

from database import db
from auth import require_admin, log_activity, hash_password

router = APIRouter()

# ── Arabic Names Pool ──
FIRST_NAMES = [
    "أحمد","محمد","عبدالله","خالد","سعد","فهد","عمر","يوسف","إبراهيم","علي",
    "بندر","ناصر","سلطان","ماجد","تركي","سالم","حمد","بدر","مشاري","عبدالرحمن",
    "عبدالعزيز","صالح","نايف","فيصل","منصور","طلال","حسين","وليد","هاني","رامي",
    "زياد","أنس","بلال","سامي","ياسر","طارق","مازن","عادل","كريم","مصطفى",
    "جمال","رشيد","حاتم","صقر","نواف","راكان","ثامر","سعود","مشعل","عايض",
    "غازي","دخيل","متعب","مقرن","حمود","عبدالملك","عبداللطيف","عبدالكريم"
]
LAST_NAMES = [
    "الغامدي","العتيبي","الشهري","القحطاني","الدوسري","الحربي","المطيري","الزهراني",
    "البلوي","الشمري","العمري","الأحمدي","السبيعي","الرشيدي","الخالدي","المالكي",
    "الثبيتي","البقمي","الجهني","الحازمي","العنزي","السلمي","الكناني","الفيفي",
    "اليامي","الوادعي","الشهراني","النعمي","الأسمري","التميمي","المحمدي","الطيار",
    "الصاعدي","البارقي","الغزاوي","الحسيني","المرشدي","الدعجاني"
]

PLAZAS = [
    {"name": "ساحة باب الملك عبدالعزيز", "color": "#1d4ed8", "zone": "north"},
    {"name": "ساحة باب العمرة", "color": "#7c3aed", "zone": "north"},
    {"name": "ساحة باب الفتح", "color": "#0891b2", "zone": "north"},
    {"name": "ساحة باب السلام", "color": "#059669", "zone": "east"},
    {"name": "ساحة باب بني شيبة", "color": "#d97706", "zone": "east"},
    {"name": "ساحة باب الصفا", "color": "#dc2626", "zone": "south"},
    {"name": "ساحة باب المروة", "color": "#9333ea", "zone": "south"},
    {"name": "ساحة أجياد", "color": "#0d9488", "zone": "south"},
    {"name": "ساحة باب الملك فهد", "color": "#2563eb", "zone": "west"},
    {"name": "ساحة المسعى", "color": "#c026d3", "zone": "east"},
    {"name": "ساحة التوسعة الشمالية", "color": "#65a30d", "zone": "north"},
    {"name": "ساحة التوسعة الجنوبية", "color": "#ea580c", "zone": "south"},
]

GATE_TYPES = ["رئيسي","فرعي","سلم كهربائي","مصعد","درج","جسر"]
DIRECTIONS = ["دخول","خروج","دخول وخروج"]
CATEGORIES = [["محرمين"],["مصلين"],["عربات"],["محرمين","مصلين"]]
CLASSIFICATIONS = ["عام","رجال","نساء","طوارئ","خدمات"]
INDICATORS = ["خفيف","متوسط","مزدحم","مغلق"]
SHIFTS = ["الأولى","الثانية","الثالثة","الرابعة"]
DAYS_AR = ["السبت","الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة"]
DEPARTMENTS = ["gates","plazas","planning","crowd_services","mataf","haram_map"]
JOB_TITLES = {
    "gates": ["مشرف بوابات","مراقب بوابة","موظف استقبال","فني أبواب"],
    "plazas": ["مشرف ساحة","مراقب ساحة","موظف تنظيم","فني صيانة"],
    "planning": ["محلل تخطيط","مخطط عمليات","أخصائي بيانات","مشرف تخطيط"],
    "crowd_services": ["مشرف خدمات","موظف إرشاد","مسعف ميداني","منسق طوارئ"],
    "mataf": ["مشرف مطاف","مراقب طواف","موظف تنظيم","فني أنظمة"],
    "haram_map": ["مشرف مصليات","مراقب كثافة","موظف توزيع","منسق صلاة"],
}
LOCATIONS = {
    "gates": ["بوابة {}","مدخل {}","بوابة {} - الدور الأرضي","بوابة {} - الدور العلوي"],
    "plazas": ["ساحة {} الشمالية","ساحة {} الجنوبية","ساحة {} الشرقية","ساحة {} الغربية"],
    "planning": ["مركز التخطيط","غرفة العمليات","مكتب التنسيق"],
    "crowd_services": ["نقطة خدمة {}","مركز إسعاف {}","نقطة إرشاد {}"],
    "mataf": ["صحن المطاف - الأرضي","صحن المطاف - الأول","صحن المطاف - السطح"],
    "haram_map": ["مصلى {}","منطقة {}","قسم المصليات {}"],
}


def _gen_national_id():
    return f"{random.choice([1,2])}{random.randint(100000000,999999999)}"


@router.post("/admin/seed/full")
async def seed_full_data(admin: dict = Depends(require_admin)):
    """بيانات تجريبية احترافية — آمنة وقابلة لإعادة التشغيل"""
    result = {"gates": 0, "employees": 0, "users": 0, "schedules": 0, "plazas": 0, "mataf": 0, "alerts": 0}

    # ── 1) Gates (200+) ──
    existing_gates = await db.gates.count_documents({})
    if existing_gates < 50:
        await db.gates.delete_many({"_seed": True})
        gates = []
        gate_num = 1
        for plaza in PLAZAS:
            count = random.randint(14, 22)
            for _ in range(count):
                gt = random.choice(GATE_TYPES)
                status = random.choices(["مفتوح","مغلق"], weights=[70,30])[0]
                ind = random.choice(["خفيف","متوسط","مزدحم"]) if status == "مفتوح" else "مغلق"
                flow = random.randint(200, 4500) if status == "مفتوح" else 0
                max_flow = random.randint(3000, 8000)
                seasons = random.sample(["normal","umrah","ramadan","hajj"], k=random.randint(1,4))
                gates.append({
                    "id": str(uuid.uuid4()),
                    "name": f"باب {gate_num}",
                    "number": gate_num,
                    "plaza": plaza["name"],
                    "plaza_color": plaza["color"],
                    "gate_type": gt,
                    "direction": random.choice(DIRECTIONS),
                    "category": random.choice(CATEGORIES),
                    "classification": random.choice(CLASSIFICATIONS),
                    "status": status,
                    "current_indicator": ind,
                    "current_flow": flow,
                    "max_flow": max_flow,
                    "area": plaza["zone"],
                    "operational_seasons": seasons,
                    "is_active": True,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "_seed": True,
                })
                gate_num += 1
        if gates:
            await db.gates.insert_many(gates)
        result["gates"] = len(gates)

    # ── 2) Plazas ──
    existing_plazas = await db.plazas.count_documents({})
    if existing_plazas < 5:
        await db.plazas.delete_many({"_seed": True})
        plazas_docs = []
        for p in PLAZAS:
            cap = random.randint(20000, 80000)
            crowd = random.randint(int(cap * 0.2), int(cap * 0.85))
            plazas_docs.append({
                "id": str(uuid.uuid4()), "name": p["name"], "zone": p["zone"],
                "current_crowd": crowd, "max_capacity": cap,
                "percentage": round(crowd / cap * 100, 1),
                "status": "normal" if crowd / cap < 0.7 else ("warning" if crowd / cap < 0.85 else "critical"),
                "_seed": True,
            })
        await db.plazas.insert_many(plazas_docs)
        result["plazas"] = len(plazas_docs)

    # ── 3) Mataf ──
    existing_mataf = await db.mataf.count_documents({})
    if existing_mataf < 2:
        await db.mataf.delete_many({"_seed": True})
        mataf_levels = []
        for lvl in ["الطابق الأرضي","الطابق الأول","سطح الحرم"]:
            cap = random.randint(40000, 60000)
            crowd = random.randint(int(cap * 0.3), int(cap * 0.9))
            mataf_levels.append({
                "id": str(uuid.uuid4()), "level": lvl,
                "current_crowd": crowd, "max_capacity": cap,
                "average_tawaf_time": random.randint(30, 60),
                "percentage": round(crowd / cap * 100, 1),
                "status": "normal" if crowd / cap < 0.7 else ("warning" if crowd / cap < 0.85 else "critical"),
                "_seed": True,
            })
        await db.mataf.insert_many(mataf_levels)
        result["mataf"] = len(mataf_levels)

    # ── 4) Employees (60+) ──
    existing_emps = await db.employees.count_documents({})
    if existing_emps < 10:
        await db.employees.delete_many({"_seed": True})
        employees = []
        used_names = set()
        used_nids = set()
        emp_number = 1001

        # Create a general manager user
        gm_nid = _gen_national_id()
        gm_user = {
            "id": str(uuid.uuid4()), "email": None, "national_id": gm_nid,
            "password": hash_password("1234"), "name": "بسام اسماعيل غزاوي",
            "role": "general_manager", "department": None,
            "account_status": "active", "must_change_pin": False,
            "failed_attempts": 0, "employee_id": None, "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(), "_seed": True,
        }
        await db.users.update_one({"national_id": gm_nid}, {"$set": gm_user}, upsert=True)
        result["users"] += 1

        for dept in DEPARTMENTS:
            dept_count = random.randint(8, 12)
            titles = JOB_TITLES.get(dept, ["موظف"])
            locs = LOCATIONS.get(dept, ["الموقع"])

            for i in range(dept_count):
                first = random.choice(FIRST_NAMES)
                last = random.choice(LAST_NAMES)
                name = f"{first} {last}"
                while name in used_names:
                    first = random.choice(FIRST_NAMES)
                    last = random.choice(LAST_NAMES)
                    name = f"{first} {last}"
                used_names.add(name)

                nid = _gen_national_id()
                while nid in used_nids:
                    nid = _gen_national_id()
                used_nids.add(nid)

                shift = random.choice(SHIFTS)
                rest = random.sample(DAYS_AR, k=random.choice([1, 2]))
                loc_template = random.choice(locs)
                location = loc_template.format(random.randint(1, 50)) if "{}" in loc_template else loc_template
                emp_type = random.choices(["permanent","seasonal","temporary"], weights=[60,25,15])[0]
                role = "shift_supervisor" if i == 0 else ("department_manager" if i == 1 else "field_staff")

                emp_id = str(uuid.uuid4())
                emp_num = str(emp_number)
                employees.append({
                    "id": emp_id, "name": name, "job_title": random.choice(titles),
                    "department": dept, "location": location, "shift": shift,
                    "employee_number": emp_num, "national_id": nid,
                    "contact_phone": f"05{random.randint(10000000,99999999)}",
                    "weekly_rest": ", ".join(rest), "rest_days": rest,
                    "work_tasks": "", "is_tasked": random.random() < 0.15,
                    "is_active": True, "work_type": "field",
                    "employment_type": emp_type, "season": None,
                    "contract_end": f"2026-{random.randint(6,12):02d}-{random.randint(1,28):02d}" if emp_type != "permanent" else None,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "_seed": True,
                })

                # Auto-create user account
                user_doc = {
                    "id": str(uuid.uuid4()), "email": None, "national_id": nid,
                    "password": hash_password(emp_num),
                    "name": name, "role": role, "department": dept,
                    "account_status": "active", "must_change_pin": False,
                    "failed_attempts": 0, "employee_id": emp_id,
                    "is_active": True,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "_seed": True,
                }
                await db.users.update_one({"national_id": nid}, {"$set": user_doc}, upsert=True)
                result["users"] += 1
                emp_number += 1

        if employees:
            await db.employees.insert_many(employees)
        result["employees"] = len(employees)

    # ── 5) Sample Alerts ──
    existing_alerts = await db.alerts.count_documents({})
    if existing_alerts < 3:
        await db.alerts.delete_many({"_seed": True})
        alert_templates = [
            {"type": "density", "title": "كثافة مرتفعة", "message": "الكثافة تجاوزت 85% في ساحة باب الملك عبدالعزيز", "department": "plazas", "priority": "high"},
            {"type": "gate", "title": "بوابة بدون موظف", "message": "باب 15 مفتوح ولا يوجد موظف معيّن", "department": "gates", "priority": "high"},
            {"type": "security", "title": "حالة طوارئ طبية", "message": "حالة إغماء بالقرب من باب الصفا - يرجى إرسال فريق طبي", "department": "crowd_services", "priority": "critical"},
            {"type": "density", "title": "ازدحام صحن المطاف", "message": "الطابق الأرضي وصل 90% من الطاقة", "department": "mataf", "priority": "high"},
            {"type": "system", "title": "انتهاء عقود قريبة", "message": "3 موظفين تنتهي عقودهم خلال 30 يوماً", "department": "planning", "priority": "medium"},
            {"type": "gate", "title": "تغيير حالة بوابة", "message": "تم إغلاق باب 42 بسبب أعمال صيانة", "department": "gates", "priority": "low"},
        ]
        alerts = []
        for tmpl in alert_templates:
            alerts.append({
                "id": str(uuid.uuid4()), **tmpl,
                "status": "وارد", "is_read": False,
                "received_at": datetime.now(timezone.utc).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "_seed": True,
            })
        await db.alerts.insert_many(alerts)
        result["alerts"] = len(alerts)

    await log_activity("seed_full_data", admin, "system", f"Gates:{result['gates']} Emp:{result['employees']} Users:{result['users']}")
    return {"message": "✅ تم تهيئة البيانات التجريبية بنجاح", **result}


@router.delete("/admin/seed/clear")
async def clear_seed_data(admin: dict = Depends(require_admin)):
    """حذف البيانات التجريبية فقط"""
    r = {}
    for col in ["gates","employees","plazas","mataf","alerts","users"]:
        res = await db[col].delete_many({"_seed": True})
        r[col] = res.deleted_count
    await log_activity("clear_seed_data", admin, "system", str(r))
    return {"message": "تم حذف البيانات التجريبية", **r}
