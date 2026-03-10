"""نظام إدارة المهام اليومية — Tasks API"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid

from database import db
from auth import get_current_user, log_activity
from models import TaskCreate, TaskUpdate, TaskStatusUpdate

router = APIRouter()

SA_TZ = timezone(timedelta(hours=3))

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def today_str():
    return datetime.now(SA_TZ).strftime("%Y-%m-%d")

MANAGER_ROLES = {"system_admin", "general_manager", "department_manager"}


# ── GET: جلب المهام ─────────────────────────────────────────────
@router.get("/tasks")
async def get_tasks(department: Optional[str] = None, status: Optional[str] = None,
                    user: dict = Depends(get_current_user)):
    role = user.get("role", "")
    query = {}

    if role in MANAGER_ROLES:
        # المدير يرى كل مهام إدارته
        dept = department or user.get("department")
        if role != "system_admin" and dept:
            query["department"] = dept
        elif department:
            query["department"] = department
    else:
        # الموظف يرى مهامه فقط
        emp = await db.employees.find_one({"user_id": user["id"]}, {"_id": 0})
        if not emp:
            return []
        query["assignee_ids"] = {"$in": [emp["id"]]}

    if status:
        query["status"] = status

    tasks = await db.tasks.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)

    # إضافة بيانات الموظفين للعرض
    all_emp_ids = list({eid for t in tasks for eid in t.get("assignee_ids", [])})
    emp_map = {}
    if all_emp_ids:
        emps = await db.employees.find({"id": {"$in": all_emp_ids}}, {"_id": 0}).to_list(500)
        emp_map = {e["id"]: {"name": e["name"], "job_title": e.get("job_title", ""), "employment_type": e.get("employment_type", "permanent")} for e in emps}

    for t in tasks:
        t["assignees_info"] = [emp_map.get(eid, {"name": eid}) for eid in t.get("assignee_ids", [])]
        # حساب حالة التأخير
        if t.get("due_at") and t.get("status") not in ("done", "canceled"):
            due = datetime.fromisoformat(t["due_at"].replace("Z", "+00:00"))
            if due < datetime.now(timezone.utc):
                t["status"] = "overdue"

    return tasks


# ── GET: إحصائيات المهام ─────────────────────────────────────────
@router.get("/tasks/stats")
async def get_tasks_stats(department: Optional[str] = None, user: dict = Depends(get_current_user)):
    role = user.get("role", "")
    query = {}
    if role in MANAGER_ROLES:
        dept = department or user.get("department")
        if role != "system_admin" and dept:
            query["department"] = dept
        elif department:
            query["department"] = department
    else:
        emp = await db.employees.find_one({"user_id": user["id"]}, {"_id": 0})
        if emp:
            query["assignee_ids"] = {"$in": [emp["id"]]}

    tasks = await db.tasks.find(query, {"_id": 0}).to_list(1000)
    now = datetime.now(timezone.utc)

    # تحديث الحالة المتأخرة
    total    = len(tasks)
    pending  = sum(1 for t in tasks if t.get("status") == "pending")
    progress = sum(1 for t in tasks if t.get("status") == "in_progress")
    done     = sum(1 for t in tasks if t.get("status") == "done")
    canceled = sum(1 for t in tasks if t.get("status") == "canceled")
    overdue  = sum(1 for t in tasks
                   if t.get("due_at") and t.get("status") not in ("done", "canceled")
                   and datetime.fromisoformat(t["due_at"].replace("Z", "+00:00")) < now)

    return {"total": total, "pending": pending, "in_progress": progress,
            "done": done, "canceled": canceled, "overdue": overdue}


# ── POST: إنشاء مهمة ────────────────────────────────────────────
@router.post("/tasks")
async def create_task(data: TaskCreate, user: dict = Depends(get_current_user)):
    if user.get("role") not in MANAGER_ROLES:
        raise HTTPException(status_code=403, detail="فقط المدير يمكنه إنشاء مهام")
    if not data.assignee_ids:
        raise HTTPException(status_code=400, detail="يجب تحديد موظف واحد على الأقل")

    task_id = str(uuid.uuid4())
    task = {
        "id": task_id,
        "title": data.title,
        "description": data.description or "",
        "department": data.department,
        "assignee_ids": data.assignee_ids,
        "priority": data.priority,
        "status": "pending",
        "due_at": data.due_at,
        "created_by": user.get("name", user.get("email", "")),
        "created_by_id": user.get("id"),
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "history": [{
            "action": "created",
            "by": user.get("name", ""),
            "at": now_iso(),
            "note": "تم إنشاء المهمة"
        }]
    }
    await db.tasks.insert_one(task)

    # إنشاء إشعارات للموظفين المكلفين
    emps = await db.employees.find({"id": {"$in": data.assignee_ids}}, {"_id": 0}).to_list(50)
    for emp in emps:
        if emp.get("user_id"):
            alert = {
                "id": str(uuid.uuid4()),
                "type": "task",
                "title": f"مهمة جديدة: {data.title}",
                "message": f"تم تكليفك بمهمة جديدة من {user.get('name', 'المدير')}",
                "priority": "high" if data.priority in ("high", "urgent") else "normal",
                "department": data.department,
                "task_id": task_id,
                "target_user_id": emp["user_id"],
                "is_read": False,
                "received_at": now_iso(),
            }
            await db.alerts.insert_one(alert)

    await log_activity("task_created", user, data.title, f"تم إنشاء مهمة لـ {len(emps)} موظف")
    task.pop("_id", None)
    return task


# ── PUT: تعديل مهمة ─────────────────────────────────────────────
@router.put("/tasks/{task_id}")
async def update_task(task_id: str, data: TaskUpdate, user: dict = Depends(get_current_user)):
    if user.get("role") not in MANAGER_ROLES:
        raise HTTPException(status_code=403, detail="فقط المدير يمكنه تعديل المهام")

    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="المهمة غير موجودة")

    update = {k: v for k, v in data.model_dump().items() if v is not None}
    update["updated_at"] = now_iso()

    history_entry = {"action": "updated", "by": user.get("name", ""), "at": now_iso(), "note": "تم تعديل المهمة"}
    await db.tasks.update_one({"id": task_id}, {
        "$set": update,
        "$push": {"history": history_entry}
    })
    return {"message": "تم تحديث المهمة"}


# ── PUT: تحديث حالة المهمة ──────────────────────────────────────
@router.put("/tasks/{task_id}/status")
async def update_task_status(task_id: str, data: TaskStatusUpdate, user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="المهمة غير موجودة")

    # الموظف يمكنه فقط تحديث مهامه
    if user.get("role") not in MANAGER_ROLES:
        emp = await db.employees.find_one({"user_id": user["id"]}, {"_id": 0})
        if not emp or emp["id"] not in task.get("assignee_ids", []):
            raise HTTPException(status_code=403, detail="لا يمكنك تعديل هذه المهمة")

    STATUS_LABELS = {
        "pending": "قيد الانتظار", "in_progress": "جارية",
        "done": "مكتملة", "canceled": "ملغاة"
    }
    update = {
        "status": data.status,
        "updated_at": now_iso(),
    }
    if data.status == "done":
        update["completed_at"] = now_iso()

    history_entry = {
        "action": "status_changed",
        "by": user.get("name", ""),
        "at": now_iso(),
        "note": data.note or f"تم تغيير الحالة إلى: {STATUS_LABELS.get(data.status, data.status)}"
    }
    await db.tasks.update_one({"id": task_id}, {
        "$set": update,
        "$push": {"history": history_entry}
    })

    # إشعار للمدير عند اكتمال المهمة
    if data.status == "done" and task.get("created_by_id"):
        creator = await db.users.find_one({"id": task["created_by_id"]}, {"_id": 0})
        if creator:
            alert = {
                "id": str(uuid.uuid4()),
                "type": "task_done",
                "title": f"✅ مهمة مكتملة: {task['title']}",
                "message": f"أتم {user.get('name', 'الموظف')} المهمة بنجاح",
                "priority": "normal",
                "department": task.get("department"),
                "task_id": task_id,
                "target_user_id": task["created_by_id"],
                "is_read": False,
                "received_at": now_iso(),
            }
            await db.alerts.insert_one(alert)

    return {"message": f"تم تحديث الحالة إلى: {STATUS_LABELS.get(data.status, data.status)}"}


# ── DELETE: حذف مهمة ────────────────────────────────────────────
@router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user: dict = Depends(get_current_user)):
    if user.get("role") not in MANAGER_ROLES:
        raise HTTPException(status_code=403, detail="فقط المدير يمكنه حذف المهام")
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="المهمة غير موجودة")
    await db.tasks.delete_one({"id": task_id})
    return {"message": "تم حذف المهمة"}
