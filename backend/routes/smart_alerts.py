"""Smart Alerts Engine — automated alerts based on rules"""
from fastapi import APIRouter, Depends
from datetime import datetime, timezone, timedelta

from database import db
from auth import get_current_user

router = APIRouter()


async def _generate_smart_alerts():
    """Generate alerts based on business rules"""
    alerts = []
    now = datetime.now(timezone.utc)

    # Rule 1: Gates open without employees assigned
    gates = await db.gates.find({"status": "مفتوح"}, {"_id": 0}).to_list(500)
    employees = await db.employees.find({"is_active": True}, {"_id": 0}).to_list(2000)
    emp_locations = set()
    for e in employees:
        loc = e.get("location", "")
        if loc:
            emp_locations.add(loc)

    unmanned = [g for g in gates if g["name"] not in emp_locations and f"بوابة {g.get('number','')}" not in " ".join(emp_locations)]
    if len(unmanned) > 3:
        alerts.append({
            "id": f"smart-unmanned-{now.strftime('%Y%m%d')}",
            "type": "gate", "priority": "high",
            "title": "بوابات بدون موظفين",
            "message": f"{len(unmanned)} بوابة مفتوحة بدون موظف معيّن حالياً",
            "count": len(unmanned),
            "category": "staffing",
        })

    # Rule 2: High density plazas
    plazas = await db.plazas.find({}, {"_id": 0}).to_list(50)
    critical_plazas = [p for p in plazas if p.get("percentage", 0) > 85]
    high_plazas = [p for p in plazas if 70 < p.get("percentage", 0) <= 85]
    if critical_plazas:
        names = ", ".join([p["name"] for p in critical_plazas[:3]])
        alerts.append({
            "id": f"smart-density-critical-{now.strftime('%Y%m%d')}",
            "type": "density", "priority": "critical",
            "title": "كثافة حرجة في ساحات",
            "message": f"{len(critical_plazas)} ساحة تجاوزت 85% من الطاقة: {names}",
            "count": len(critical_plazas),
            "category": "density",
        })
    if high_plazas:
        alerts.append({
            "id": f"smart-density-high-{now.strftime('%Y%m%d')}",
            "type": "density", "priority": "medium",
            "title": "كثافة مرتفعة",
            "message": f"{len(high_plazas)} ساحة بين 70%-85% من الطاقة",
            "count": len(high_plazas),
            "category": "density",
        })

    # Rule 3: Expiring contracts (30 days)
    soon = (now + timedelta(days=30)).isoformat()[:10]
    today = now.isoformat()[:10]
    expiring = await db.employees.find({
        "contract_end": {"$lte": soon, "$gte": today}, "is_active": True
    }, {"_id": 0}).to_list(100)
    if expiring:
        alerts.append({
            "id": f"smart-contracts-{now.strftime('%Y%m%d')}",
            "type": "system", "priority": "medium",
            "title": "عقود على وشك الانتهاء",
            "message": f"{len(expiring)} موظف تنتهي عقودهم خلال 30 يوماً",
            "count": len(expiring),
            "category": "hr",
        })

    # Rule 4: Frozen accounts
    frozen = await db.users.count_documents({"account_status": "frozen"})
    if frozen > 0:
        alerts.append({
            "id": f"smart-frozen-{now.strftime('%Y%m%d')}",
            "type": "security", "priority": "medium",
            "title": "حسابات مجمّدة",
            "message": f"{frozen} حساب مجمّد بسبب محاولات دخول خاطئة — يحتاج مراجعة المدير",
            "count": frozen,
            "category": "security",
        })

    # Rule 5: Mataf high density
    mataf = await db.mataf.find({}, {"_id": 0}).to_list(10)
    critical_mataf = [m for m in mataf if m.get("percentage", 0) > 85]
    if critical_mataf:
        alerts.append({
            "id": f"smart-mataf-{now.strftime('%Y%m%d')}",
            "type": "density", "priority": "high",
            "title": "ازدحام صحن المطاف",
            "message": f"{len(critical_mataf)} طابق تجاوز 85% في صحن المطاف",
            "count": len(critical_mataf),
            "category": "density",
        })

    return alerts


@router.get("/smart-alerts")
async def get_smart_alerts(user: dict = Depends(get_current_user)):
    """تنبيهات ذكية محسوبة آنياً"""
    alerts = await _generate_smart_alerts()
    return alerts
