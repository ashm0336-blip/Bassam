from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid

from database import db
from auth import get_current_user, log_activity, require_page_permission
from models import StatusCheck, StatusCheckCreate, AlertUpdate
from employee_status import build_employee_statuses, aggregate_statuses, get_sa_now

router = APIRouter()


@router.get("/")
async def root():
    return {"message": "مرحباً بك في منصة خدمات الحشود", "version": "1.0.0"}


@router.get("/dashboard/stats")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    gates = await db.gates.find({}, {"_id": 0}).to_list(200)
    plazas = await db.plazas.find({}, {"_id": 0}).to_list(50)
    mataf = await db.mataf.find({}, {"_id": 0}).to_list(10)
    alerts = await db.alerts.find({"is_read": False}, {"_id": 0}).to_list(100)
    if not gates and not plazas:
        return {"total_visitors_today": 0, "current_crowd": 0, "max_capacity": 0, "active_staff": 0, "open_gates": 0, "total_gates": 0, "incidents_today": 0, "alerts_count": 0}
    active_employees = await db.employees.find({"is_active": True}, {"_id": 0}).to_list(1000)
    total_crowd = sum(p.get("current_crowd", 0) for p in plazas) + sum(m.get("current_crowd", 0) for m in mataf)
    total_max = sum(p.get("max_capacity", 0) for p in plazas) + sum(m.get("max_capacity", 0) for m in mataf)
    open_gates = len([g for g in gates if g.get("status") == "مفتوح"])
    return {
        "total_visitors_today": 0, "current_crowd": total_crowd, "max_capacity": total_max,
        "active_staff": len(active_employees), "open_gates": open_gates, "total_gates": len(gates),
        "incidents_today": len([a for a in alerts if a.get("type") == "emergency"]), "alerts_count": len(alerts)
    }


@router.get("/dashboard/departments")
async def get_departments(user: dict = Depends(get_current_user)):
    """ملخص حالة كل إدارة: موظفين + جدول + حالة الوردية + مهام اليوم"""
    now_sa = get_sa_now()
    current_month = now_sa.strftime("%Y-%m")

    # جلب كل البيانات مرة واحدة
    all_schedules  = await db.monthly_schedules.find({"month": current_month}, {"_id": 0}).to_list(20)
    all_employees  = await db.employees.find({}, {"_id": 0}).to_list(2000)
    all_shifts     = await db.department_settings.find({"setting_type": "shifts"}, {"_id": 0}).to_list(200)
    all_tasks      = await db.tasks.find({}, {"_id": 0, "department":1, "status":1, "completion_performance":1}).to_list(5000)

    schedule_map   = {s.get("department"): s for s in all_schedules}
    # خريطة الورديات: dept → list of shift configs
    shifts_by_dept = {}
    for s in all_shifts:
        d = s.get("department", "")
        shifts_by_dept.setdefault(d, []).append(s)

    async def get_dept_summary(dept_key):
        dept_emps = [e for e in all_employees if e.get("department") == dept_key]
        total = len(dept_emps)

        sched = schedule_map.get(dept_key)
        schedule_status = sched.get("status") if sched else None
        is_approved = schedule_status == "active"

        # ── حالة الموظفين (shift-aware للجدول المعتمد فقط) ─────────
        if is_approved:
            shifts_raw = shifts_by_dept.get(dept_key, [])
            status_map = build_employee_statuses(dept_emps, sched, shifts_raw)
            agg = aggregate_statuses(status_map)
            on_duty_now = agg["on_duty_now"]
            off_shift   = agg["off_shift"]
            on_rest     = agg["on_rest"]
            working     = on_duty_now  # للتوافق مع الكود القديم
        else:
            on_duty_now = off_shift = on_rest = working = 0

        # عدد المكلفين من الجدول المعتمد
        tasked = 0
        if is_approved and sched:
            for a in sched.get("assignments", []):
                if a.get("is_tasked"):
                    tasked += 1

        # نوع التوظيف
        permanent = sum(1 for e in dept_emps if (e.get("employment_type") or "permanent") == "permanent")
        seasonal  = sum(1 for e in dept_emps if e.get("employment_type") == "seasonal")
        temporary = sum(1 for e in dept_emps if e.get("employment_type") == "temporary")

        # ── إحصائيات مهام الإدارة ────────────────────────────────────
        dept_tasks = [t for t in all_tasks if t.get("department") == dept_key]
        tasks_pending  = sum(1 for t in dept_tasks if t.get("status") == "pending")
        tasks_progress = sum(1 for t in dept_tasks if t.get("status") == "in_progress")
        tasks_done     = sum(1 for t in dept_tasks if t.get("status") == "done")
        tasks_overdue  = sum(1 for t in dept_tasks if t.get("status") == "overdue")
        tasks_early    = sum(1 for t in dept_tasks if t.get("completion_performance") == "early")

        return {
            "total":         total,
            "on_duty_now":   on_duty_now,
            "off_shift":     off_shift,
            "on_rest":       on_rest,
            "working":       working,    # للتوافق
            "tasked":        tasked,
            "permanent":     permanent,
            "seasonal":      seasonal,
            "temporary":     temporary,
            "schedule_status": schedule_status,
            "tasks": {
                "pending":   tasks_pending,
                "progress":  tasks_progress,
                "done":      tasks_done,
                "overdue":   tasks_overdue,
                "early":     tasks_early,
                "total":     len(dept_tasks),
            }
        }

    DEPTS = [
        {"id": "planning",       "name": "إدارة تخطيط خدمات الحشود", "route": "/planning",       "icon": "ClipboardList"},
        {"id": "gates",          "name": "إدارة الأبواب",             "route": "/gates",          "icon": "DoorOpen"},
        {"id": "plazas",         "name": "إدارة الساحات",             "route": "/plazas",         "icon": "LayoutGrid"},
        {"id": "haram_map",      "name": "إدارة المصليات",            "route": "/haram-map",      "icon": "Building2"},
        {"id": "crowd_services", "name": "إدارة خدمات حشود الحرم",   "route": "/crowd-services", "icon": "Users"},
        {"id": "mataf",          "name": "إدارة صحن المطاف",          "route": "/mataf",          "icon": "Circle"},
    ]

    result = []
    for d in DEPTS:
        summary = await get_dept_summary(d["id"])
        result.append({**d, **summary})
    return result



@router.get("/dashboard/crowd-hourly")
async def get_hourly_crowd(user: dict = Depends(get_current_user)):
    return [{"hour": f"{hour:02d}:00", "count": 0, "percentage": 0} for hour in range(24)]


@router.get("/gates")
async def get_gates(status: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if status:
        query["status"] = status
    gates = await db.gates.find(query, {"_id": 0}).to_list(200)
    for gate in gates:
        max_flow = gate.get("max_flow", 1)
        current_flow = gate.get("current_flow", 0)
        gate["percentage"] = round((current_flow / max_flow) * 100, 1) if max_flow else 0
    return gates


@router.get("/gates/stats")
async def get_gates_stats(user: dict = Depends(get_current_user)):
    gates = await db.gates.find({}, {"_id": 0}).to_list(200)
    return {
        "total": len(gates), "open": len([g for g in gates if g.get("status") == "open"]),
        "closed": len([g for g in gates if g.get("status") == "closed"]),
        "maintenance": len([g for g in gates if g.get("status") == "maintenance"]),
        "total_flow": sum(g.get("current_flow", 0) for g in gates),
        "entry_gates": len([g for g in gates if g.get("direction") in ["entry", "both"]]),
        "exit_gates": len([g for g in gates if g.get("direction") in ["exit", "both"]])
    }


@router.get("/plazas")
async def get_plazas(user: dict = Depends(get_current_user)):
    plazas = await db.plazas.find({}, {"_id": 0}).to_list(50)
    for plaza in plazas:
        max_cap = plaza.get("max_capacity", 1)
        current = plaza.get("current_crowd", 0)
        pct = (current / max_cap) * 100 if max_cap else 0
        plaza["percentage"] = round(pct, 1)
        plaza["status"] = "normal" if pct < 70 else ("warning" if pct < 85 else "critical")
    return plazas


@router.get("/plazas/stats")
async def get_plazas_stats(user: dict = Depends(get_current_user)):
    plazas = await db.plazas.find({}, {"_id": 0}).to_list(50)
    transactions = await db.transactions.find({"department": "plazas"}, {"_id": 0}).to_list(1000)
    total_current = sum(p.get("current_crowd", 0) for p in plazas)
    total_max = sum(p.get("max_capacity", 0) for p in plazas) or 1
    overall_pct = (total_current / total_max) * 100
    return {
        "total_plazas": len(plazas), "current_crowd": total_current, "max_capacity": total_max,
        "overall_percentage": round(overall_pct, 1),
        "normal": len([p for p in plazas if (p.get("current_crowd", 0) / (p.get("max_capacity", 1) or 1)) * 100 < 70]),
        "warning": len([p for p in plazas if 70 <= (p.get("current_crowd", 0) / (p.get("max_capacity", 1) or 1)) * 100 < 85]),
        "critical": len([p for p in plazas if (p.get("current_crowd", 0) / (p.get("max_capacity", 1) or 1)) * 100 >= 85]),
        "total_transactions": len(transactions),
        "pending_transactions": len([t for t in transactions if t.get("status") == "pending"]),
        "completed_transactions": len([t for t in transactions if t.get("status") == "completed"])
    }


@router.get("/mataf")
async def get_mataf(user: dict = Depends(get_current_user)):
    mataf = await db.mataf.find({}, {"_id": 0}).to_list(10)
    for level in mataf:
        max_cap = level.get("max_capacity", 1)
        current = level.get("current_crowd", 0)
        pct = (current / max_cap) * 100 if max_cap else 0
        level["percentage"] = round(pct, 1)
        level["status"] = "normal" if pct < 70 else ("warning" if pct < 85 else "critical")
    return mataf


@router.get("/mataf/stats")
async def get_mataf_stats(user: dict = Depends(get_current_user)):
    mataf = await db.mataf.find({}, {"_id": 0}).to_list(10)
    total_current = sum(m.get("current_crowd", 0) for m in mataf)
    total_max = sum(m.get("max_capacity", 0) for m in mataf) or 1
    avg_time = sum(m.get("average_tawaf_time", 45) for m in mataf) // max(len(mataf), 1)
    return {
        "total_levels": len(mataf), "current_crowd": total_current, "max_capacity": total_max,
        "overall_percentage": round((total_current / total_max) * 100, 1), "average_tawaf_time": avg_time,
        "status_summary": {
            "normal": len([m for m in mataf if (m.get("current_crowd", 0) / (m.get("max_capacity", 1) or 1)) * 100 < 70]),
            "warning": len([m for m in mataf if 70 <= (m.get("current_crowd", 0) / (m.get("max_capacity", 1) or 1)) * 100 < 85]),
            "critical": len([m for m in mataf if (m.get("current_crowd", 0) / (m.get("max_capacity", 1) or 1)) * 100 >= 85])
        }
    }


@router.get("/alerts")
async def get_alerts(department: Optional[str] = None, type: Optional[str] = None, category: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    user_role = user.get("role", "")
    user_dept = user.get("department")
    user_id = user.get("id")

    # Category filter: tasks, alerts, broadcasts
    if category == "tasks":
        query["type"] = {"$in": ["task", "task_done"]}
        # Non-admin users see only their own task notifications
        if user_role not in ("system_admin", "general_manager"):
            query["target_user_id"] = user_id
    elif category == "broadcasts":
        query["type"] = "broadcast"
        # Broadcasts visible to user's department or "all"
        if user_role not in ("system_admin", "general_manager"):
            dept_filter = [{"department": "all"}]
            if user_dept:
                dept_filter.append({"department": user_dept})
            query["$or"] = dept_filter
    elif category == "alerts":
        query["type"] = {"$nin": ["task", "task_done", "broadcast"]}
        if department:
            query["department"] = department
        elif user_role not in ("system_admin", "general_manager"):
            if user_dept:
                query["$or"] = [{"department": user_dept}, {"department": "all"}]
    else:
        # "all" — smart filter by role
        if department:
            query["department"] = department
        elif user_role not in ("system_admin", "general_manager"):
            if user_dept:
                dept_or = [{"department": user_dept}, {"department": "all"}]
                # Also include task notifications targeted to this user
                dept_or.append({"target_user_id": user_id})
                query["$or"] = dept_or

    if type:
        query["type"] = type

    alerts = await db.alerts.find(query, {"_id": 0}).sort("timestamp", -1).to_list(200)
    return alerts


@router.get("/alerts/unread-count")
async def get_unread_alerts_count(user: dict = Depends(get_current_user)):
    user_role = user.get("role", "")
    user_dept = user.get("department")
    user_id = user.get("id")

    query = {"is_read": False}
    if user_role not in ("system_admin", "general_manager"):
        or_conds = [{"department": "all"}]
        if user_dept:
            or_conds.append({"department": user_dept})
        or_conds.append({"target_user_id": user_id})
        query["$or"] = or_conds

    count = await db.alerts.count_documents(query)
    return {"count": count}


# ── Broadcasts (تعميمات) ──────────────────────────────────────
@router.post("/broadcasts")
async def create_broadcast(data: dict, user: dict = Depends(get_current_user)):
    """Create a broadcast message to a department or all departments"""
    await require_page_permission(user, "/alerts", require_edit=True)
    title = data.get("title", "").strip()
    message = data.get("message", "").strip()
    target_dept = data.get("department", "all")
    priority = data.get("priority", "normal")

    if not title:
        raise HTTPException(status_code=400, detail="يجب إدخال عنوان التعميم")

    broadcast_id = str(uuid.uuid4())
    broadcast_doc = {
        "id": broadcast_id,
        "type": "broadcast",
        "title": title,
        "message": message,
        "department": target_dept,
        "priority": priority,
        "is_read": False,
        "created_by": user.get("name", ""),
        "created_by_id": user.get("id"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "received_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.alerts.insert_one(broadcast_doc)
    await log_activity("تعميم", user, title, f"تعميم {'لكل الإدارات' if target_dept == 'all' else f'لـ {target_dept}'}: {title}")

    # Real-time notification
    from ws_manager import ws_manager
    await ws_manager.broadcast({
        "type": "notification",
        "channel": "alerts",
        "action": "broadcast",
        "payload": {
            "title": f"تعميم: {title}",
            "message": message[:120],
            "priority": priority,
            "department": target_dept,
        }
    })

    return {"message": "تم إرسال التعميم بنجاح", "id": broadcast_id}



@router.put("/alerts/{alert_id}")
async def update_alert(alert_id: str, alert: AlertUpdate, user: dict = Depends(get_current_user)):
    await require_page_permission(user, "/alerts", require_edit=True)
    existing = await db.alerts.find_one({"id": alert_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="البلاغ غير موجود")
    update_data = {k: v for k, v in alert.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    if update_data.get("status") == "مكتمل":
        current_status = existing.get("status")
        if current_status not in ["قيد الإجراء", "بانتظار رد"]:
            raise HTTPException(status_code=400, detail="لا يمكن إغلاق البلاغ إلا إذا كان قيد الإجراء أو بانتظار رد")
        update_data["closed_at"] = datetime.now(timezone.utc).isoformat()
    await db.alerts.update_one({"id": alert_id}, {"$set": update_data})
    await log_activity("تحديث بلاغ", user, alert_id, f"تحديث الحالة إلى {update_data.get('status', '')}")
    updated = await db.alerts.find_one({"id": alert_id}, {"_id": 0})
    return updated


@router.get("/notifications")
async def get_notifications(unread_only: bool = False, user: dict = Depends(get_current_user)):
    query = {}
    if unread_only:
        query["is_read"] = False
    user_role = user.get("role", "")
    user_dept = user.get("department")
    if user_role not in ("system_admin", "general_manager"):
        or_conds = [{"department": "all"}]
        if user_dept:
            or_conds.append({"department": user_dept})
        or_conds.append({"target_user_id": user.get("id")})
        query["$or"] = or_conds
    notifications = await db.alerts.find(query, {"_id": 0}).sort("timestamp", -1).to_list(100)
    return notifications


@router.get("/reports")
async def get_reports(type: Optional[str] = None, department: Optional[str] = None, user: dict = Depends(get_current_user)):
    all_reports = [
        {"id": str(uuid.uuid4()), "title": "التقرير اليومي للحشود", "type": "daily", "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "department": "all", "summary": "تقرير شامل لجميع الإدارات"},
        {"id": str(uuid.uuid4()), "title": "تقرير إدارة الأبواب", "type": "daily", "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "department": "gates", "summary": "حالة الأبواب والحركة"},
        {"id": str(uuid.uuid4()), "title": "تقرير صحن المطاف", "type": "daily", "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "department": "mataf", "summary": "حركة الطواف والأعداد"},
        {"id": str(uuid.uuid4()), "title": "تقرير الساحات", "type": "daily", "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "department": "plazas", "summary": "حالة الساحات والتدفق"},
        {"id": str(uuid.uuid4()), "title": "تقرير خدمات الحشود", "type": "daily", "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "department": "crowd_services", "summary": "خدمات الحشود والتنسيق"},
        {"id": str(uuid.uuid4()), "title": "تقرير التخطيط", "type": "daily", "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "department": "planning", "summary": "الخطط والجداول"},
        {"id": str(uuid.uuid4()), "title": "تقرير أسبوعي - الأبواب", "type": "weekly", "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "department": "gates", "summary": "تحليل أسبوعي للأبواب"},
        {"id": str(uuid.uuid4()), "title": "تقرير أسبوعي - المطاف", "type": "weekly", "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "department": "mataf", "summary": "تحليل أسبوعي للمطاف"},
        {"id": str(uuid.uuid4()), "title": "تقرير شهري شامل", "type": "monthly", "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "department": "all", "summary": "تقرير شهري لجميع الإدارات"},
    ]
    reports = all_reports
    user_role = user.get("role")
    user_dept = user.get("department")
    if user_role == "department_manager" and user_dept:
        reports = [r for r in reports if r["department"] == user_dept or r["department"] == "all"]
    if type:
        reports = [r for r in reports if r["type"] == type]
    if department:
        reports = [r for r in reports if r["department"] == department]
    return reports


@router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate, user: dict = Depends(get_current_user)):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.status_checks.insert_one(doc)
    return status_obj


@router.get("/status", response_model=List[StatusCheck])
async def get_status_checks(user: dict = Depends(get_current_user)):
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks
