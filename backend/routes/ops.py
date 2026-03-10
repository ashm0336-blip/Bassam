"""Dashboard Ops endpoint — unified data for the operations-room dashboard"""
from fastapi import APIRouter
from datetime import datetime, timezone
from database import db

router = APIRouter()


@router.get("/dashboard/ops")
async def get_ops_dashboard():
    """All-in-one endpoint for the operations room dashboard"""
    # ── KPIs ──
    gates = await db.gates.find({}, {"_id": 0}).to_list(500)
    employees = await db.employees.find({}, {"_id": 0}).to_list(2000)
    alerts = await db.alerts.find({"is_read": False}, {"_id": 0}).sort("received_at", -1).to_list(50)
    plazas = await db.plazas.find({}, {"_id": 0}).to_list(50)
    mataf = await db.mataf.find({}, {"_id": 0}).to_list(10)

    open_gates = [g for g in gates if g.get("status") == "مفتوح"]
    closed_gates = [g for g in gates if g.get("status") != "مفتوح"]

    # Today's day in Arabic
    day_map = {0: "الإثنين", 1: "الثلاثاء", 2: "الأربعاء", 3: "الخميس", 4: "الجمعة", 5: "السبت", 6: "الأحد"}
    today_ar = day_map.get(datetime.now().weekday(), "")

    # جلب الجداول المعتمدة (active) للشهر الحالي لكل الإدارات
    current_month = datetime.now().strftime("%Y-%m")
    active_schedules = await db.monthly_schedules.find(
        {"month": current_month, "status": "active"}, {"_id": 0}
    ).to_list(20)

    # بناء خريطة تعيينات من الجداول المعتمدة: employee_id → assignment
    active_assignment_map = {}
    for sched in active_schedules:
        for a in sched.get("assignments", []):
            active_assignment_map[a["employee_id"]] = a

    # دمج بيانات الموظفين مع الجداول المعتمدة فقط
    def get_emp_data(emp):
        """إرجاع rest_days و shift و is_tasked من الجدول المعتمد إن وجد، وإلا من الموظف مباشرة"""
        a = active_assignment_map.get(emp.get("id", ""))
        rest_days = a["rest_days"] if a else (emp.get("rest_days") or [])
        shift = a["shift"] if a else (emp.get("shift") or "غير محدد")
        is_tasked = a.get("is_tasked", False) if a else False
        return rest_days, shift, is_tasked

    # Active employees (not on rest today) — بناءً على الجداول المعتمدة
    active_employees = []
    on_rest_list = []
    for e in employees:
        rest_days, _, _ = get_emp_data(e)
        if today_ar and today_ar in rest_days:
            on_rest_list.append(e)
        else:
            active_employees.append(e)

    # Shift distribution — من الجداول المعتمدة فقط
    shifts = {}
    for e in active_employees:
        _, shift, _ = get_emp_data(e)
        shifts[shift] = shifts.get(shift, 0) + 1

    # Department stats
    dept_emp = {}
    for e in employees:
        d = e.get("department", "other")
        dept_emp[d] = dept_emp.get(d, 0) + 1

    total_crowd = sum(p.get("current_crowd", 0) for p in plazas) + sum(m.get("current_crowd", 0) for m in mataf)
    total_cap = sum(p.get("max_capacity", 1) for p in plazas) + sum(m.get("max_capacity", 1) for m in mataf)
    crowd_pct = round(total_crowd / total_cap * 100, 1) if total_cap else 0

    kpis = {
        "total_gates": len(gates),
        "open_gates": len(open_gates),
        "closed_gates": len(closed_gates),
        "total_employees": len(employees),
        "active_employees": len(active_employees),
        "on_rest": len(on_rest_list),
        "total_crowd": total_crowd,
        "total_capacity": total_cap,
        "crowd_percentage": crowd_pct,
        "active_alerts": len(alerts),
        "critical_alerts": len([a for a in alerts if a.get("priority") == "critical"]),
        "shift_distribution": shifts,
        "department_employees": dept_emp,
    }

    # ── Heatmap (gates grouped by plaza) ──
    plaza_map = {}
    for g in gates:
        pname = g.get("plaza", "أخرى")
        if pname not in plaza_map:
            plaza_map[pname] = {"plaza": pname, "color": g.get("plaza_color", "#666"), "total": 0, "open": 0, "closed": 0, "flow": 0, "max_flow": 0, "indicators": {"خفيف": 0, "متوسط": 0, "مزدحم": 0, "مغلق": 0}}
        plaza_map[pname]["total"] += 1
        if g.get("status") == "مفتوح":
            plaza_map[pname]["open"] += 1
        else:
            plaza_map[pname]["closed"] += 1
        plaza_map[pname]["flow"] += g.get("current_flow", 0)
        plaza_map[pname]["max_flow"] += g.get("max_flow", 0)
        ind = g.get("current_indicator", "مغلق")
        plaza_map[pname]["indicators"][ind] = plaza_map[pname]["indicators"].get(ind, 0) + 1

    heatmap = list(plaza_map.values())
    for h in heatmap:
        h["utilization"] = round(h["flow"] / h["max_flow"] * 100, 1) if h["max_flow"] else 0

    # ── Smart Alerts ──
    smart_alerts = []
    # Gates without employees — بناءً على الجداول المعتمدة
    gates_no_emp = [g for g in open_gates if not any(e.get("location", "").find(g["name"]) >= 0 for e in active_employees)]
    if len(gates_no_emp) > 3:
        smart_alerts.append({"type": "warning", "icon": "DoorOpen", "message": f"{len(gates_no_emp)} بوابة مفتوحة بدون موظف معيّن", "count": len(gates_no_emp), "action": "عرض البوابات", "href": "/gates?tab=dashboard"})

    # High density plazas
    high_density = [p for p in plazas if p.get("percentage", 0) > 80]
    if high_density:
        smart_alerts.append({"type": "danger", "icon": "AlertTriangle", "message": f"{len(high_density)} ساحة تتجاوز 80% من الطاقة", "count": len(high_density), "action": "عرض الساحات", "href": "/plazas"})

    # Expiring contracts
    from datetime import timedelta
    soon = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()[:10]
    expiring = [e for e in employees if e.get("contract_end") and e["contract_end"] <= soon]
    if expiring:
        smart_alerts.append({"type": "info", "icon": "Calendar", "message": f"{len(expiring)} موظف تنتهي عقودهم خلال 30 يوماً", "count": len(expiring), "action": "عرض الموظفين", "href": "/admin"})

    # Critical alerts
    critical = [a for a in alerts if a.get("priority") == "critical"]
    if critical:
        smart_alerts.append({"type": "danger", "icon": "ShieldAlert", "message": f"{len(critical)} تنبيه حرج يتطلب إجراء فوري", "count": len(critical), "action": "عرض التنبيهات", "href": "/notifications"})

    # Recent alerts (for panel)
    recent_alerts = []
    for a in alerts[:8]:
        recent_alerts.append({
            "id": a.get("id"), "type": a.get("type"), "title": a.get("title"),
            "message": a.get("message"), "priority": a.get("priority"),
            "department": a.get("department"), "received_at": a.get("received_at"),
        })

    # ── Timeline (recent activity) ──
    logs = await db.activity_logs.find({}, {"_id": 0}).sort("timestamp", -1).to_list(20)
    timeline = []
    for log in logs:
        timeline.append({
            "id": log.get("id"),
            "action": log.get("action"),
            "user_name": log.get("user_name"),
            "target": log.get("target"),
            "details": log.get("details"),
            "timestamp": log.get("timestamp"),
        })

    # ── Plazas overview ──
    plazas_overview = []
    for p in plazas:
        plazas_overview.append({
            "name": p.get("name"), "zone": p.get("zone"),
            "current_crowd": p.get("current_crowd", 0),
            "max_capacity": p.get("max_capacity", 0),
            "percentage": p.get("percentage", 0),
            "status": p.get("status", "normal"),
        })

    return {
        "kpis": kpis,
        "heatmap": heatmap,
        "smart_alerts": smart_alerts,
        "recent_alerts": recent_alerts,
        "timeline": timeline,
        "plazas": plazas_overview,
    }
