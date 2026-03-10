from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from database import db
from auth import get_current_user, log_activity
from models import StatusCheck, StatusCheckCreate, AlertUpdate

router = APIRouter()


@router.get("/")
async def root():
    return {"message": "مرحباً بك في منصة خدمات الحشود", "version": "1.0.0"}


@router.get("/dashboard/stats")
async def get_dashboard_stats():
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
async def get_departments():
    plazas = await db.plazas.find({}, {"_id": 0}).to_list(50)
    gates = await db.gates.find({}, {"_id": 0}).to_list(200)
    mataf = await db.mataf.find({}, {"_id": 0}).to_list(10)

    async def get_dept_employee_stats(dept_name):
        employees = await db.employees.find({"department": dept_name, "is_active": True}, {"_id": 0}).to_list(1000)
        shift_1 = sum(1 for e in employees if e.get("shift") == "الأولى")
        shift_2 = sum(1 for e in employees if e.get("shift") == "الثانية")
        shift_3 = sum(1 for e in employees if e.get("shift") == "الثالثة")
        shift_4 = sum(1 for e in employees if e.get("shift") == "الرابعة")
        locations = set(e.get("location", "") for e in employees if e.get("location"))
        with_location = sum(1 for e in employees if e.get("location"))
        return {"total": len(employees), "shifts": {"الأولى": shift_1, "الثانية": shift_2, "الثالثة": shift_3, "الرابعة": shift_4}, "locations_count": len(locations), "employees_with_location": with_location}

    planning_stats = await get_dept_employee_stats("planning")
    plazas_stats = await get_dept_employee_stats("plazas")
    gates_stats = await get_dept_employee_stats("gates")
    crowd_stats = await get_dept_employee_stats("crowd_services")
    mataf_stats = await get_dept_employee_stats("mataf")

    plazas_crowd = sum(p.get("current_crowd", 0) for p in plazas)
    plazas_max = sum(p.get("max_capacity", 0) for p in plazas) or 1
    gates_flow = sum(g.get("current_flow", 0) for g in gates)
    gates_max = sum(g.get("max_flow", 0) for g in gates) or 1
    mataf_crowd = sum(m.get("current_crowd", 0) for m in mataf)
    mataf_max = sum(m.get("max_capacity", 0) for m in mataf) or 1

    def get_status(pct):
        if pct < 70: return "normal"
        if pct < 85: return "warning"
        return "critical"

    return [
        {"id": "planning", "name": "إدارة تخطيط خدمات الحشود", "name_en": "Crowd Planning", "icon": "ClipboardList", "current_crowd": plazas_crowd // 4, "max_capacity": plazas_max // 4, "percentage": round((plazas_crowd / plazas_max) * 100, 1) if plazas_max else 0, "status": get_status((plazas_crowd / plazas_max) * 100 if plazas_max else 0), "active_staff": planning_stats["total"], "employee_stats": planning_stats, "incidents_today": 0},
        {"id": "plazas", "name": "إدارة الساحات", "name_en": "Plazas Management", "icon": "LayoutGrid", "current_crowd": plazas_crowd, "max_capacity": plazas_max, "percentage": round((plazas_crowd / plazas_max) * 100, 1) if plazas_max else 0, "status": get_status((plazas_crowd / plazas_max) * 100 if plazas_max else 0), "active_staff": plazas_stats["total"], "employee_stats": plazas_stats, "incidents_today": 0},
        {"id": "gates", "name": "إدارة الأبواب", "name_en": "Gates Management", "icon": "DoorOpen", "current_crowd": gates_flow, "max_capacity": gates_max, "percentage": round((gates_flow / gates_max) * 100, 1) if gates_max else 0, "status": get_status((gates_flow / gates_max) * 100 if gates_max else 0), "active_staff": gates_stats["total"], "employee_stats": gates_stats, "incidents_today": 0},
        {"id": "crowd_services", "name": "إدارة خدمات حشود الحرم", "name_en": "Haram Crowd Services", "icon": "Users", "current_crowd": plazas_crowd + mataf_crowd, "max_capacity": plazas_max + mataf_max, "percentage": round(((plazas_crowd + mataf_crowd) / (plazas_max + mataf_max)) * 100, 1) if (plazas_max + mataf_max) else 0, "status": get_status(((plazas_crowd + mataf_crowd) / (plazas_max + mataf_max)) * 100 if (plazas_max + mataf_max) else 0), "active_staff": crowd_stats["total"], "employee_stats": crowd_stats, "incidents_today": 0},
        {"id": "mataf", "name": "إدارة صحن المطاف", "name_en": "Mataf Management", "icon": "Circle", "current_crowd": mataf_crowd, "max_capacity": mataf_max, "percentage": round((mataf_crowd / mataf_max) * 100, 1) if mataf_max else 0, "status": get_status((mataf_crowd / mataf_max) * 100 if mataf_max else 0), "active_staff": mataf_stats["total"], "employee_stats": mataf_stats, "incidents_today": 0},
    ]


@router.get("/dashboard/crowd-hourly")
async def get_hourly_crowd():
    return [{"hour": f"{hour:02d}:00", "count": 0, "percentage": 0} for hour in range(24)]


@router.get("/gates")
async def get_gates(status: Optional[str] = None):
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
async def get_gates_stats():
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
async def get_plazas():
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
async def get_mataf():
    mataf = await db.mataf.find({}, {"_id": 0}).to_list(10)
    for level in mataf:
        max_cap = level.get("max_capacity", 1)
        current = level.get("current_crowd", 0)
        pct = (current / max_cap) * 100 if max_cap else 0
        level["percentage"] = round(pct, 1)
        level["status"] = "normal" if pct < 70 else ("warning" if pct < 85 else "critical")
    return mataf


@router.get("/mataf/stats")
async def get_mataf_stats():
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
async def get_alerts(department: Optional[str] = None, type: Optional[str] = None):
    query = {}
    if department:
        query["department"] = department
    if type:
        query["type"] = type
    alerts = await db.alerts.find(query, {"_id": 0}).sort("timestamp", -1).to_list(100)
    return alerts


@router.put("/alerts/{alert_id}")
async def update_alert(alert_id: str, alert: AlertUpdate, user: dict = Depends(get_current_user)):
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
async def get_notifications(unread_only: bool = False):
    query = {}
    if unread_only:
        query["is_read"] = False
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


@router.get("/planning/stats")
async def get_planning_stats(user: dict = Depends(get_current_user)):
    transactions = await db.transactions.find({"department": "planning"}, {"_id": 0}).to_list(1000)
    employees = await db.employees.find({"department": "planning", "is_active": True}, {"_id": 0}).to_list(1000)
    pending = len([t for t in transactions if t.get("status") == "pending"])
    in_progress = len([t for t in transactions if t.get("status") == "in_progress"])
    completed = len([t for t in transactions if t.get("status") == "completed"])
    return {
        "total_transactions": len(transactions), "pending_transactions": pending,
        "in_progress_transactions": in_progress, "completed_transactions": completed,
        "total_employees": len(employees), "active_employees": len(employees)
    }


@router.get("/crowd-services/stats")
async def get_crowd_services_stats(user: dict = Depends(get_current_user)):
    transactions = await db.transactions.find({"department": "crowd_services"}, {"_id": 0}).to_list(1000)
    employees = await db.employees.find({"department": "crowd_services", "is_active": True}, {"_id": 0}).to_list(1000)
    return {
        "total_transactions": len(transactions),
        "pending_transactions": len([t for t in transactions if t.get("status") == "pending"]),
        "completed_transactions": len([t for t in transactions if t.get("status") == "completed"]),
        "total_employees": len(employees)
    }


@router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.status_checks.insert_one(doc)
    return status_obj


@router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks
