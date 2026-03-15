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

def parse_due(due_str):
    """تحويل تاريخ الانتهاء إلى datetime مع timezone دائماً"""
    if not due_str:
        return None
    try:
        dt = datetime.fromisoformat(due_str.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None

def get_time_status(due_at_str, status):
    """
    إرجاع حالة الوقت المتبقي:
    - overdue    : انتهى الوقت
    - critical   : أقل من ساعة
    - warning    : أقل من 3 ساعات
    - soon       : أقل من 24 ساعة
    - normal     : أكثر من 24 ساعة
    - none       : لا يوجد موعد
    """
    if status in ("done",):
        return "none"
    due = parse_due(due_at_str)
    if not due:
        return "none"
    now = datetime.now(timezone.utc)
    diff_h = (due - now).total_seconds() / 3600
    if diff_h < 0:
        return "overdue"
    if diff_h < 1:
        return "critical"
    if diff_h < 3:
        return "warning"
    if diff_h < 24:
        return "soon"
    return "normal"

def now_iso():
    return datetime.now(timezone.utc).isoformat()

    return datetime.now(SA_TZ).strftime("%Y-%m-%d")

MANAGER_ROLES = {"system_admin", "general_manager", "department_manager"}


# ── GET: جلب المهام (مع فلترة بالتاريخ/الشهر) ───────────────────
@router.get("/tasks")
async def get_tasks(department: Optional[str] = None, status: Optional[str] = None,
                    work_date: Optional[str] = None,   # YYYY-MM-DD  فلتر يوم محدد
                    month: Optional[str] = None,        # YYYY-MM     فلتر شهر
                    user: dict = Depends(get_current_user)):
    role = user.get("role", "")
    query = {}

    if role in MANAGER_ROLES:
        dept = department or user.get("department")
        if dept:
            query["department"] = dept
    else:
        emp = await db.employees.find_one({"user_id": user["id"]}, {"_id": 0})
        if not emp:
            return []
        query["assignee_ids"] = {"$in": [emp["id"]]}

    if status:
        query["status"] = status

    # فلتر التاريخ
    if work_date:
        query["work_date"] = work_date
    elif month:
        # كل أيام الشهر
        query["work_date"] = {"$regex": f"^{month}"}

    tasks = await db.tasks.find(query, {"_id": 0}).sort([("work_date", -1), ("created_at", -1)]).to_list(1000)

    # إضافة بيانات الموظفين للعرض
    all_emp_ids = list({eid for t in tasks for eid in t.get("assignee_ids", [])})
    emp_map = {}
    if all_emp_ids:
        emps = await db.employees.find({"id": {"$in": all_emp_ids}}, {"_id": 0}).to_list(500)
        emp_map = {e["id"]: {"name": e["name"], "job_title": e.get("job_title", ""), "employment_type": e.get("employment_type", "permanent")} for e in emps}

    for t in tasks:
        t["assignees_info"] = [emp_map.get(eid, {"name": eid}) for eid in t.get("assignee_ids", [])]
        # حساب حالة الوقت وإضافة time_status
        ts = get_time_status(t.get("due_at"), t.get("status", ""))
        t["time_status"] = ts
        # تحديث الحالة إلى overdue تلقائياً
        if ts == "overdue" and t.get("status") not in ("done",):
            t["status"] = "overdue"
        # إضافة الوقت المتبقي بالدقائق للفرونتند
        due = parse_due(t.get("due_at"))
        if due:
            diff_mins = int((due - datetime.now(timezone.utc)).total_seconds() / 60)
            t["remaining_minutes"] = diff_mins
        else:
            t["remaining_minutes"] = None
        # بيانات الأداء للمهام المكتملة
        if t.get("status") == "done":
            t.setdefault("completion_performance", "no_due")
            t.setdefault("completion_delta_minutes", None)

    return tasks


# ── GET: إحصائيات المهام ─────────────────────────────────────────
@router.get("/tasks/stats")
async def get_tasks_stats(department: Optional[str] = None,
                          work_date: Optional[str] = None,
                          month: Optional[str] = None,
                          user: dict = Depends(get_current_user)):
    role = user.get("role", "")
    query = {}
    if role in MANAGER_ROLES:
        dept = department or user.get("department")
        if dept:
            query["department"] = dept
    else:
        emp = await db.employees.find_one({"user_id": user["id"]}, {"_id": 0})
        if emp:
            query["assignee_ids"] = {"$in": [emp["id"]]}

    # فلتر التاريخ
    if work_date:
        query["work_date"] = work_date
    elif month:
        query["work_date"] = {"$regex": f"^{month}"}

    tasks = await db.tasks.find(query, {"_id": 0}).to_list(1000)

    total    = len(tasks)
    pending  = sum(1 for t in tasks if t.get("status") == "pending")
    progress = sum(1 for t in tasks if t.get("status") == "in_progress")
    done     = sum(1 for t in tasks if t.get("status") == "done")
    overdue  = sum(1 for t in tasks
                   if get_time_status(t.get("due_at"), t.get("status", "")) == "overdue")
    # إحصائيات الأداء للمهام المنجزة
    early    = sum(1 for t in tasks if t.get("status") == "done" and t.get("completion_performance") == "early")
    on_time  = sum(1 for t in tasks if t.get("status") == "done" and t.get("completion_performance") == "on_time")
    late_done = sum(1 for t in tasks if t.get("status") == "done" and t.get("completion_performance") == "late")

    return {"total": total, "pending": pending, "in_progress": progress,
            "done": done, "overdue": overdue,
            "early": early, "on_time": on_time, "late_done": late_done}


# ── GET: بيانات التقويم الشهري ───────────────────────────────────
@router.get("/tasks/calendar")
async def get_tasks_calendar(department: str, month: str,
                              user: dict = Depends(get_current_user)):
    """
    يعيد ملخصاً لكل يوم في الشهر:
    {
      "2026-03-01": { "total": 3, "done": 2, "pending": 1, "overdue": 0, "pct": 67 },
      ...
    }
    """
    role = user.get("role", "")
    query = {"work_date": {"$regex": f"^{month}"}}

    if role in MANAGER_ROLES:
        dept = department or user.get("department")
        if dept:
            query["department"] = dept
    else:
        emp = await db.employees.find_one({"user_id": user["id"]}, {"_id": 0})
        if not emp:
            return {}
        query["assignee_ids"] = {"$in": [emp["id"]]}

    tasks = await db.tasks.find(query, {"_id": 0,
        "work_date": 1, "status": 1, "due_at": 1, "completion_performance": 1
    }).to_list(2000)

    # تجميع حسب اليوم
    calendar = {}
    for t in tasks:
        d = t.get("work_date", "")
        if not d:
            continue
        if d not in calendar:
            calendar[d] = {"total": 0, "done": 0, "pending": 0,
                           "in_progress": 0, "overdue": 0, "early": 0}
        calendar[d]["total"] += 1
        st = t.get("status", "pending")
        # فحص التأخير
        if st not in ("done",) and get_time_status(t.get("due_at"), st) == "overdue":
            st = "overdue"
        calendar[d][st] = calendar[d].get(st, 0) + 1
        if t.get("completion_performance") == "early":
            calendar[d]["early"] += 1

    # إضافة نسبة الإنجاز
    for d in calendar:
        total = calendar[d]["total"]
        done  = calendar[d]["done"]
        over  = calendar[d]["overdue"]
        calendar[d]["pct"] = round(done / total * 100) if total else 0
        # تصنيف اليوم: great | good | partial | bad | empty
        if total == 0:
            calendar[d]["day_status"] = "empty"
        elif done == total:
            calendar[d]["day_status"] = "great"
        elif over > 0:
            calendar[d]["day_status"] = "bad"
        elif done >= total * 0.5:
            calendar[d]["day_status"] = "good"
        else:
            calendar[d]["day_status"] = "partial"

    return calendar


# ── GET: أرشيف الأشهر ────────────────────────────────────────────
@router.get("/tasks/archive")
async def get_tasks_archive(department: str, user: dict = Depends(get_current_user)):
    """
    يعيد ملخصاً لكل شهر فيه مهام: [ { month, total, done, pct, early } ]
    """
    role = user.get("role", "")
    query = {}
    if role in MANAGER_ROLES:
        dept = department or user.get("department")
        if dept:
            query["department"] = dept
    else:
        emp = await db.employees.find_one({"user_id": user["id"]}, {"_id": 0})
        if not emp:
            return []
        query["assignee_ids"] = {"$in": [emp["id"]]}

    tasks = await db.tasks.find(query, {"_id": 0,
        "work_date": 1, "status": 1, "completion_performance": 1
    }).to_list(5000)

    months = {}
    for t in tasks:
        d = t.get("work_date", "")
        m = d[:7] if d else ""  # YYYY-MM
        if not m:
            continue
        if m not in months:
            months[m] = {"month": m, "total": 0, "done": 0, "early": 0, "overdue": 0}
        months[m]["total"] += 1
        if t.get("status") == "done":
            months[m]["done"] += 1
        if t.get("status") == "overdue":
            months[m]["overdue"] += 1
        if t.get("completion_performance") == "early":
            months[m]["early"] += 1

    result = sorted(months.values(), key=lambda x: x["month"], reverse=True)
    for r in result:
        r["pct"] = round(r["done"] / r["total"] * 100) if r["total"] else 0
    return result


# ── POST: إنشاء مهمة ────────────────────────────────────────────
@router.post("/tasks")
async def create_task(data: TaskCreate, user: dict = Depends(get_current_user)):
    if user.get("role") not in MANAGER_ROLES:
        raise HTTPException(status_code=403, detail="فقط المدير يمكنه إنشاء مهام")
    if not data.assignee_ids:
        raise HTTPException(status_code=400, detail="يجب تحديد موظف واحد على الأقل")

    task_id = str(uuid.uuid4())
    # work_date: تاريخ المهمة (اليوم بتوقيت SA إذا لم يُحدد)
    work_date = data.work_date or datetime.now(SA_TZ).strftime("%Y-%m-%d")
    task = {
        "id": task_id,
        "title": data.title,
        "description": data.description or "",
        "department": data.department,
        "assignee_ids": data.assignee_ids,
        "priority": data.priority,
        "status": "pending",
        "due_at": data.due_at,
        "work_date": work_date,
        "created_by": user.get("name", user.get("email", "")),
        "created_by_id": user.get("id"),
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "history": [{
            "action": "created",
            "by": user.get("name", ""),
            "at": now_iso(),
            "note": f"تم إنشاء المهمة ليوم {work_date}"
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
        "pending": "قيد الانتظار", "in_progress": "جارية", "done": "مكتملة"
    }
    if data.status not in STATUS_LABELS:
        raise HTTPException(status_code=400, detail="حالة غير صحيحة")

    now = datetime.now(timezone.utc)
    update = {
        "status": data.status,
        "updated_at": now.isoformat(),
    }

    # ── حساب الأداء عند الإنجاز ──────────────────────────────────
    performance_data = {}
    if data.status == "done":
        completed_at = now
        update["completed_at"] = completed_at.isoformat()

        due = parse_due(task.get("due_at"))
        if due:
            # الفرق بالدقائق (موجب = أُنجز قبل الموعد، سالب = بعده)
            delta_mins = int((due - completed_at).total_seconds() / 60)
            update["completion_delta_minutes"] = delta_mins

            if delta_mins > 15:
                perf = "early"        # مبكر (أكثر من 15 دقيقة قبل)
            elif delta_mins >= -15:
                perf = "on_time"      # في الوقت (هامش ±15 دقيقة)
            else:
                perf = "late"         # متأخر
            update["completion_performance"] = perf
            performance_data = {"performance": perf, "delta_mins": delta_mins}
        else:
            # لا يوجد موعد → لا تقييم وقتي
            update["completion_performance"] = "no_due"
            performance_data = {"performance": "no_due", "delta_mins": None}

    # ── وصف الأداء للإشعار ──────────────────────────────────────
    perf_desc = ""
    if performance_data:
        p = performance_data["performance"]
        dm = performance_data.get("delta_mins")
        if p == "early" and dm:
            h, m = divmod(abs(dm), 60)
            t_str = f"{h} س {m} د" if h else f"{m} د"
            perf_desc = f" — أُنجزت قبل الموعد بـ {t_str} ⭐"
        elif p == "late" and dm:
            h, m = divmod(abs(dm), 60)
            t_str = f"{h} س {m} د" if h else f"{m} د"
            perf_desc = f" — تأخرت {t_str}"
        elif p == "on_time":
            perf_desc = " — في الوقت المحدد ✅"

    history_entry = {
        "action": "status_changed",
        "by": user.get("name", ""),
        "at": now.isoformat(),
        "note": data.note or f"تم تغيير الحالة إلى: {STATUS_LABELS.get(data.status, data.status)}{perf_desc}"
    }
    await db.tasks.update_one({"id": task_id}, {
        "$set": update,
        "$push": {"history": history_entry}
    })

    # ── إشعار للمدير عند اكتمال المهمة (مع نتيجة الأداء) ──────────
    if data.status == "done" and task.get("created_by_id"):
        p = performance_data.get("performance", "")
        perf_icons = {"early": "⭐", "on_time": "✅", "late": "⚠️", "no_due": "✅"}
        icon = perf_icons.get(p, "✅")
        alert = {
            "id": str(uuid.uuid4()),
            "type": "task_done",
            "title": f"{icon} مهمة مكتملة: {task['title']}",
            "message": f"أتم {user.get('name', 'الموظف')} المهمة{perf_desc}",
            "priority": "high" if p == "early" else "normal",
            "department": task.get("department"),
            "task_id": task_id,
            "target_user_id": task["created_by_id"],
            "is_read": False,
            "received_at": now.isoformat(),
        }
        await db.alerts.insert_one(alert)

    return {
        "message": f"تم تحديث الحالة إلى: {STATUS_LABELS.get(data.status, data.status)}{perf_desc}",
        **performance_data
    }


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
