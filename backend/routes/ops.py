"""Dashboard Ops endpoint — unified data for the operations-room dashboard"""
from fastapi import APIRouter
from datetime import datetime, timezone, timedelta
from database import db
from employee_status import build_employee_statuses, aggregate_statuses, get_sa_now

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

    # الوقت الحالي بتوقيت السعودية
    now_sa = get_sa_now()
    current_month = now_sa.strftime("%Y-%m")

    # جلب الجداول المعتمدة + إعدادات الورديات
    active_schedules = await db.monthly_schedules.find(
        {"month": current_month, "status": "active"}, {"_id": 0}
    ).to_list(20)
    all_shifts_raw = await db.department_settings.find({"setting_type": "shifts"}, {"_id": 0}).to_list(200)

    # إحصائيات حالة الموظفين (shift-aware) من كل الإدارات المعتمدة
    approved_departments = {s.get("department") for s in active_schedules}
    schedule_by_dept = {s.get("department"): s for s in active_schedules}
    shifts_by_dept = {}
    for s in all_shifts_raw:
        shifts_by_dept.setdefault(s.get("department",""), []).append(s)

    total_on_duty   = 0
    total_off_shift = 0
    total_on_rest   = 0
    active_employees = []
    on_rest_list = []
    shifts_dist = {}

    for dept in approved_departments:
        dept_emps = [e for e in employees if e.get("department") == dept]
        sched = schedule_by_dept.get(dept)
        shifts_raw = shifts_by_dept.get(dept, [])
        if not dept_emps or not sched:
            continue
        status_map = build_employee_statuses(dept_emps, sched, shifts_raw)
        for e in dept_emps:
            st = status_map.get(e["id"], "no_schedule")
            if st == "on_duty_now":
                total_on_duty += 1
                active_employees.append(e)
                # توزيع الوردية
                assignment = next((a for a in sched.get("assignments",[]) if a["employee_id"]==e["id"]), None)
                shift = (assignment.get("shift") if assignment else None) or e.get("shift") or "غير محدد"
                shifts_dist[shift] = shifts_dist.get(shift, 0) + 1
            elif st == "off_shift":
                total_off_shift += 1
            elif st == "on_rest":
                total_on_rest += 1
                on_rest_list.append(e)

    # إجمالي الموظفين حسب الإدارة
    dept_emp = {}
    for e in employees:
        d = e.get("department", "other")
        dept_emp[d] = dept_emp.get(d, 0) + 1

    total_crowd = sum(p.get("current_crowd", 0) for p in plazas) + sum(m.get("current_crowd", 0) for m in mataf)
    total_cap = sum(p.get("max_capacity", 1) for p in plazas) + sum(m.get("max_capacity", 1) for m in mataf)
    crowd_pct = round(total_crowd / total_cap * 100, 1) if total_cap else 0

    kpis = {
        "total_gates":      len(gates),
        "open_gates":       len(open_gates),
        "closed_gates":     len(closed_gates),
        "total_employees":  len(employees),
        "active_employees": total_on_duty,
        "off_shift":        total_off_shift,
        "on_rest":          total_on_rest,
        "total_crowd":      total_crowd,
        "total_capacity":   total_cap,
        "crowd_percentage": crowd_pct,
        "active_alerts":    len(alerts),
        "critical_alerts":  len([a for a in alerts if a.get("priority") == "critical"]),
        "shift_distribution": shifts_dist,
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
    # Gates without employees — based on employee count vs open gates ratio
    if len(open_gates) > 0 and total_on_duty == 0:
        smart_alerts.append({"type": "warning", "icon": "DoorOpen", "message": f"{len(open_gates)} بوابة مفتوحة ولا يوجد موظفون مداومون حالياً", "count": len(open_gates), "action": "عرض البوابات", "href": "/gates?tab=dashboard"})
    elif len(open_gates) > total_on_duty * 2 and total_on_duty > 0:
        smart_alerts.append({"type": "warning", "icon": "DoorOpen", "message": f"عدد البوابات المفتوحة ({len(open_gates)}) يفوق طاقة الموظفين المداومين ({total_on_duty})", "count": len(open_gates), "action": "عرض البوابات", "href": "/gates?tab=dashboard"})

    # High density plazas — compute percentage on the fly
    high_density = []
    for p in plazas:
        cap = p.get("max_capacity", 0)
        crowd = p.get("current_crowd", 0)
        pct = round(crowd / cap * 100, 1) if cap else 0
        if pct > 80:
            high_density.append({**p, "percentage": pct})
    if high_density:
        smart_alerts.append({"type": "danger", "icon": "AlertTriangle", "message": f"{len(high_density)} ساحة تتجاوز 80% من طاقتها الاستيعابية", "count": len(high_density), "action": "عرض الساحات", "href": "/plazas"})

    # Expiring contracts
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
            "user_role": log.get("user_role"),
            "department": log.get("department"),
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
