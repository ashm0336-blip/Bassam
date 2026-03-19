from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import datetime, timezone
import uuid

from database import db
from auth import get_current_user, require_admin, log_activity, check_department_access, hash_password
from models import EmployeeCreate, EmployeeUpdate, MonthlyScheduleCreate, ScheduleAssignmentUpdate
from employee_status import build_employee_statuses, aggregate_statuses, get_sa_now

router = APIRouter()


async def _auto_create_user_account(employee_id: str, employee_doc: dict):
    """إنشاء حساب نظام تلقائي عند إضافة موظف — يبقى معلقاً حتى يُفعله المدير"""
    national_id = employee_doc.get("national_id")
    employee_number = employee_doc.get("employee_number", "")

    if not national_id:
        return None  # لا حساب بدون رقم هوية

    default_pin = employee_number or "0000"

    # التحقق من وجود حساب مسبق (مثلاً موظف أُنهيت خدمته وأُعيد تعيينه أو نُقل لقسم آخر)
    existing = await db.users.find_one({"national_id": national_id})
    if existing:
        old_status = existing.get("account_status", "pending")
        if old_status == "terminated":
            # حساب منتهي الخدمة — إعادة تهيئة كاملة (فرصة ثانية)
            await db.users.update_one(
                {"id": existing["id"]},
                {"$set": {
                    "password": hash_password(default_pin),
                    "name": employee_doc.get("name", existing.get("name", "")),
                    "department": employee_doc.get("department"),
                    "account_status": "pending",
                    "must_change_pin": True,
                    "failed_attempts": 0,
                    "employee_id": employee_id,
                    "is_active": False,
                }}
            )
        else:
            # حساب نشط/معلق/مجمّد — تحديث القسم والربط فقط (نقل بدون رسّت)
            await db.users.update_one(
                {"id": existing["id"]},
                {"$set": {
                    "department": employee_doc.get("department"),
                    "employee_id": employee_id,
                    "name": employee_doc.get("name", existing.get("name", "")),
                }}
            )
        return existing["id"]

    # حساب جديد تماماً
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": None,
        "national_id": national_id,
        "password": hash_password(default_pin),
        "name": employee_doc.get("name", ""),
        "role": "field_staff",
        "department": employee_doc.get("department"),
        "allowed_departments": [employee_doc.get("department")] if employee_doc.get("department") else [],
        "permission_group_id": employee_doc.get("permission_group_id"),
        "custom_permissions": {},
        "account_status": "pending",
        "must_change_pin": True,
        "failed_attempts": 0,
        "employee_id": employee_id,
        "is_active": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)
    return user_id


@router.get("/employees/check-national-id")
async def check_national_id(national_id: str, exclude_emp_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    """التحقق من توفر رقم هوية — يُرجع فقط متاح/غير متاح بدون أي بيانات أخرى"""
    import re
    if not re.match(r'^[12]\d{9}$', national_id):
        return {"available": False, "reason": "format"}
    query = {"national_id": national_id}
    if exclude_emp_id:
        query["id"] = {"$ne": exclude_emp_id}
    existing = await db.employees.find_one(query, {"_id": 0, "id": 1})
    return {"available": existing is None}



@router.get("/employees/availability")
async def get_employees_availability(department: str, user: dict = Depends(get_current_user)):
    """
    يعيد قائمة الموظفين مع حالة توفرهم الحالية:
      on_duty_now  → مداوم الآن
      off_shift    → خارج الوردية
      on_rest      → في راحة
      no_schedule  → غير محدد (لا جدول معتمد)
    """
    now_sa = get_sa_now()
    current_month = now_sa.strftime("%Y-%m")

    # جلب البيانات بالتوازي
    employees  = await db.employees.find({"department": department}, {"_id": 0}).to_list(500)
    schedule   = await db.monthly_schedules.find_one(
        {"department": department, "month": current_month, "status": "active"}, {"_id": 0}
    )
    shifts_raw = await db.department_settings.find(
        {"department": department, "setting_type": "shifts"}, {"_id": 0}
    ).to_list(50)

    status_map = build_employee_statuses(employees, schedule, shifts_raw)
    aggregated = aggregate_statuses(status_map)

    result = []
    for emp in employees:
        s = status_map.get(emp["id"], "no_schedule")
        result.append({
            "id":           emp["id"],
            "name":         emp.get("name", ""),
            "job_title":    emp.get("job_title", ""),
            "shift":        emp.get("shift", ""),
            "employment_type": emp.get("employment_type", "permanent"),
            "availability_status": s,
        })

    # ترتيب: مداوم أولاً، ثم خارج الوردية، ثم غير محدد، ثم راحة
    order = {"on_duty_now": 0, "off_shift": 1, "no_schedule": 2, "on_rest": 3}
    result.sort(key=lambda x: order.get(x["availability_status"], 4))

    return {"employees": result, "summary": aggregated, "schedule_status": schedule.get("status") if schedule else None}



@router.get("/employees")
async def get_employees(department: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if user["role"] == "department_manager":
        query["department"] = user.get("department")
    elif department and user["role"] in ["system_admin", "general_manager"]:
        query["department"] = department
    employees = await db.employees.find(query, {"_id": 0}).to_list(1000)
    # إضافة حالة الحساب والدور ومجموعة الصلاحيات لكل موظف
    for emp in employees:
        if emp.get("user_id"):
            u = await db.users.find_one({"id": emp["user_id"]}, {"_id": 0, "account_status": 1, "role": 1, "allowed_departments": 1, "permission_group_id": 1})
            emp["account_status"] = u.get("account_status", "no_account") if u else "no_account"
            emp["user_role"] = u.get("role", "field_staff") if u else "field_staff"
            emp["permission_group_id"] = u.get("permission_group_id") if u else None
            emp["allowed_departments"] = u.get("allowed_departments", [emp.get("department")] if emp.get("department") else []) if u else []
        else:
            emp["account_status"] = "no_account"
            emp["user_role"] = None
            emp["permission_group_id"] = None
            emp["allowed_departments"] = [emp.get("department")] if emp.get("department") else []
    return employees


@router.post("/employees")
async def create_employee(employee: EmployeeCreate, user: dict = Depends(get_current_user)):
    if user["role"] == "department_manager" and employee.department != user.get("department"):
        raise HTTPException(status_code=403, detail="يمكنك إضافة موظفين لقسمك فقط")
    if user["role"] not in ["system_admin", "general_manager", "department_manager"]:
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية")

    # التحقق من تكرار رقم الهوية
    if employee.national_id:
        # تحقق من صحة التنسيق
        import re
        if not re.match(r'^[12]\d{9}$', employee.national_id):
            raise HTTPException(status_code=400, detail="رقم الهوية غير صحيح — يجب أن يكون 10 أرقام ويبدأ بـ 1 أو 2")
        existing_emp = await db.employees.find_one({"national_id": employee.national_id})
        if existing_emp:
            # لا نكشف أي بيانات — فقط "مسجل"
            raise HTTPException(status_code=400, detail="رقم الهوية مسجل مسبقاً في النظام")

    employee_id = str(uuid.uuid4())
    employee_doc = {
        "id": employee_id, **employee.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    # إنشاء حساب تلقائي إذا كان عنده رقم هوية
    user_id = await _auto_create_user_account(employee_id, employee_doc)
    if user_id:
        employee_doc["user_id"] = user_id

    await db.employees.insert_one(employee_doc)
    await log_activity("employee_created", user, employee.name,
        f"تم إضافة موظف: {employee.name} ({employee.department})"
        + (" — تم إنشاء حساب تلقائي (معلق)" if user_id else " — لا رقم هوية، لا حساب")
    )
    return {
        "message": "تم إضافة الموظف بنجاح",
        "id": employee_id,
        "user_id": user_id,
        "account_created": user_id is not None,
    }


@router.put("/employees/{employee_id}")
async def update_employee(employee_id: str, employee: EmployeeUpdate, user: dict = Depends(get_current_user)):
    existing = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="الموظف غير موجود")
    if user["role"] == "department_manager" and existing["department"] != user.get("department"):
        raise HTTPException(status_code=403, detail="يمكنك تعديل موظفي قسمك فقط")
    if user["role"] not in ["system_admin", "general_manager", "department_manager"]:
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
    dump = employee.model_dump()
    update_data = {}
    for k, v in dump.items():
        if k == "rest_days" and v is not None:
            update_data[k] = v
        elif v is not None:
            update_data[k] = v
    if "rest_days" in dump and dump["rest_days"] is not None:
        update_data["rest_days"] = dump["rest_days"]
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.employees.update_one({"id": employee_id}, {"$set": update_data})

    # ──── مزامنة البيانات مع حساب المستخدم ────
    if existing.get("user_id"):
        user_sync = {}
        if "name" in update_data:
            user_sync["name"] = update_data["name"]
        if "department" in update_data:
            user_sync["department"] = update_data["department"]
        if "allowed_departments" in dump and dump["allowed_departments"] is not None:
            user_sync["allowed_departments"] = dump["allowed_departments"]
        if "permission_group_id" in dump and dump["permission_group_id"] is not None:
            user_sync["permission_group_id"] = dump["permission_group_id"]
        if user_sync:
            await db.users.update_one({"id": existing["user_id"]}, {"$set": user_sync})

    await log_activity("employee_updated", user, update_data.get("name", existing["name"]), f"تم تحديث: {existing['name']}")
    return {"message": "تم تحديث الموظف بنجاح"}


@router.post("/employees/{employee_id}/activate-account")
async def activate_employee_account(employee_id: str, user: dict = Depends(get_current_user)):
    """تفعيل حساب الموظف (من pending إلى active)"""
    emp = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not emp:
        raise HTTPException(status_code=404, detail="الموظف غير موجود")
    if user["role"] == "department_manager" and emp["department"] != user.get("department"):
        raise HTTPException(status_code=403, detail="إدارتك فقط")
    if user["role"] not in ["system_admin", "general_manager", "department_manager"]:
        raise HTTPException(status_code=403, detail="غير مصرح")

    uid = emp.get("user_id")
    if not uid:
        # إنشاء حساب جديد إذا لم يكن موجوداً
        uid = await _auto_create_user_account(employee_id, emp)
        if not uid:
            raise HTTPException(status_code=400, detail="لا يوجد رقم هوية للموظف — أضفه أولاً")
        await db.employees.update_one({"id": employee_id}, {"$set": {"user_id": uid}})

    # دائماً إعادة ضبط كلمة المرور للرقم الوظيفي عند التفعيل
    default_pin = emp.get("employee_number") or "0000"
    await db.users.update_one(
        {"id": uid},
        {"$set": {
            "account_status": "active",
            "is_active": True,
            "failed_attempts": 0,
            "password": hash_password(default_pin),
            "must_change_pin": True,
        }}
    )
    await log_activity("account_activated", user, emp["name"], f"تفعيل حساب: {emp['name']}")
    
    # Get login info for the admin
    u = await db.users.find_one({"id": uid}, {"_id": 0, "national_id": 1, "must_change_pin": 1})
    nat_id = u.get("national_id", "") if u else ""
    default_pin = emp.get("employee_number") or "0000"
    
    return {
        "message": f"تم تفعيل حساب {emp['name']} ✅",
        "user_id": uid,
        "login_info": f"رقم الهوية: {nat_id} — الرقم السري: {default_pin}",
        "national_id": nat_id,
        "default_pin": default_pin,
    }


@router.post("/employees/{employee_id}/freeze-account")
async def freeze_employee_account(employee_id: str, user: dict = Depends(get_current_user)):
    """تجميد حساب الموظف مؤقتاً"""
    emp = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not emp or not emp.get("user_id"):
        raise HTTPException(status_code=404, detail="لا يوجد حساب لهذا الموظف")
    if user["role"] == "department_manager" and emp["department"] != user.get("department"):
        raise HTTPException(status_code=403, detail="إدارتك فقط")

    await db.users.update_one(
        {"id": emp["user_id"]},
        {"$set": {"account_status": "frozen", "is_active": False}}
    )
    await log_activity("account_frozen", user, emp["name"], f"تجميد حساب: {emp['name']}")
    return {"message": f"تم تجميد حساب {emp['name']} 🔒"}


@router.post("/employees/{employee_id}/terminate-account")
async def terminate_employee_account(employee_id: str, user: dict = Depends(get_current_user)):
    """إنهاء خدمة الموظف نهائياً"""
    emp = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not emp or not emp.get("user_id"):
        raise HTTPException(status_code=404, detail="لا يوجد حساب لهذا الموظف")
    if user["role"] == "department_manager" and emp["department"] != user.get("department"):
        raise HTTPException(status_code=403, detail="إدارتك فقط")

    await db.users.update_one(
        {"id": emp["user_id"]},
        {"$set": {"account_status": "terminated", "is_active": False}}
    )
    await log_activity("account_terminated", user, emp["name"], f"إنهاء خدمة: {emp['name']}")
    return {"message": f"تم إنهاء خدمة {emp['name']} — الحساب مغلق نهائياً 🔴"}


@router.post("/employees/{employee_id}/reset-pin")
async def reset_employee_pin(employee_id: str, user: dict = Depends(get_current_user)):
    """إعادة تعيين PIN للموظف (يعود للرقم الوظيفي)"""
    emp = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not emp or not emp.get("user_id"):
        raise HTTPException(status_code=404, detail="لا يوجد حساب لهذا الموظف")
    if user["role"] == "department_manager" and emp["department"] != user.get("department"):
        raise HTTPException(status_code=403, detail="إدارتك فقط")

    default_pin = emp.get("employee_number") or "0000"
    await db.users.update_one(
        {"id": emp["user_id"]},
        {"$set": {
            "password": hash_password(default_pin),
            "must_change_pin": True,
            "failed_attempts": 0,
            "account_status": "active",
            "is_active": True,
        }}
    )
    await log_activity("reset_pin", user, emp["name"],
        f"{user['name']} أعاد تعيين PIN لـ {emp['name']}"
    )
    return {"message": f"تم إعادة تعيين PIN بنجاح — الرقم السري الجديد: {default_pin}"}


@router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str, user: dict = Depends(get_current_user)):
    existing = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="الموظف غير موجود")
    if user["role"] == "department_manager" and existing["department"] != user.get("department"):
        raise HTTPException(status_code=403, detail="يمكنك حذف موظفي قسمك فقط")
    if user["role"] not in ["system_admin", "general_manager", "department_manager"]:
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية")

    # ──── حذف شامل: تنظيف كل البيانات المرتبطة بالموظف ────
    # 1) حذف حساب المستخدم نهائياً
    if existing.get("user_id"):
        await db.users.delete_one({"id": existing["user_id"]})
    elif existing.get("national_id"):
        await db.users.delete_one({"national_id": existing["national_id"]})

    # 2) حذف المهام المُسندة لهذا الموظف فقط، وإزالته من المهام المشتركة
    # مهام مُسندة له وحده
    await db.tasks.delete_many({"assignee_ids": [employee_id]})
    # إزالته من مهام مشتركة مع موظفين آخرين
    await db.tasks.update_many(
        {"assignee_ids": employee_id},
        {"$pull": {"assignee_ids": employee_id}}
    )

    # 3) إزالته من الجداول الشهرية
    await db.monthly_schedules.update_many(
        {"assignments.employee_id": employee_id},
        {"$pull": {"assignments": {"employee_id": employee_id}}}
    )

    # 4) حذف الإشعارات المرتبطة
    if existing.get("user_id"):
        await db.alerts.delete_many({"target_user_id": existing["user_id"]})

    # 5) حذف سجل الموظف نفسه
    await db.employees.delete_one({"id": employee_id})

    await log_activity("employee_deleted", user, existing["name"],
        f"تم حذف الموظف نهائياً: {existing['name']} من {existing['department']} (مع جميع البيانات المرتبطة)")
    return {"message": "تم حذف الموظف وجميع بياناته المرتبطة بنجاح"}


@router.get("/employees/{employee_id}/profile")
async def get_employee_profile(employee_id: str, user: dict = Depends(get_current_user)):
    """ملف شخصي كامل للموظف"""
    emp = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not emp:
        raise HTTPException(status_code=404, detail="الموظف غير موجود")
    if not check_department_access(user, emp.get("department", "")):
        raise HTTPException(status_code=403, detail="لا يمكنك الوصول لبيانات هذه الإدارة")

    # Get user account info
    account = None
    if emp.get("national_id"):
        account = await db.users.find_one({"national_id": emp["national_id"]}, {"_id": 0, "password": 0})

    # Get recent activity
    activities = await db.activity_logs.find(
        {"$or": [{"user_name": emp.get("name")}, {"target": emp.get("name")}]},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(10)

    # Get schedules
    schedules = await db.monthly_schedules.find(
        {"department": emp.get("department"), "assignments.employee_id": employee_id},
        {"_id": 0}
    ).sort("month", -1).to_list(5)

    # Get tasks assigned to this employee
    tasks = await db.tasks.find(
        {"assigned_to": employee_id},
        {"_id": 0}
    ).sort("due_date", -1).to_list(20)

    return {
        "employee": emp,
        "account": account,
        "activities": activities,
        "schedules": schedules,
        "tasks": tasks,
    }


@router.get("/auth/my-profile")
async def get_my_profile(user: dict = Depends(get_current_user)):
    """الموظف يشوف بياناته الشخصية"""
    emp = await db.employees.find_one({"national_id": user.get("national_id")}, {"_id": 0})
    if not emp:
        # Fallback: return basic user info
        return {"employee": None, "account": {k: v for k, v in user.items() if k != "password"}, "activities": [], "schedules": [], "tasks": []}

    activities = await db.activity_logs.find(
        {"$or": [{"user_name": emp.get("name")}, {"target": emp.get("name")}]},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(10)

    schedules = await db.monthly_schedules.find(
        {"department": emp.get("department"), "assignments.employee_id": emp["id"]},
        {"_id": 0}
    ).sort("month", -1).to_list(5)

    tasks = await db.tasks.find(
        {"assigned_to": emp["id"]},
        {"_id": 0}
    ).sort("due_date", -1).to_list(20)

    return {
        "employee": emp,
        "account": {k: v for k, v in user.items() if k != "password"},
        "activities": activities,
        "schedules": schedules,
        "tasks": tasks,
    }


# ============= Monthly Schedules =============
@router.get("/schedules/{department}")
async def get_schedules(department: str, month: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"department": department}
    if month:
        query["month"] = month
    schedules = await db.monthly_schedules.find(query, {"_id": 0}).sort("month", -1).to_list(60)
    return schedules


@router.get("/schedules/{department}/{month}")
async def get_schedule(department: str, month: str, user: dict = Depends(get_current_user)):
    schedule = await db.monthly_schedules.find_one({"department": department, "month": month}, {"_id": 0})
    return schedule


@router.post("/admin/schedules")
async def create_schedule(data: MonthlyScheduleCreate, user: dict = Depends(get_current_user)):
    if user["role"] not in ["system_admin", "general_manager", "department_manager"]:
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
    existing = await db.monthly_schedules.find_one({"department": data.department, "month": data.month}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="يوجد جدول لهذا الشهر بالفعل")

    assignments = []
    if data.clone_from:
        source = await db.monthly_schedules.find_one({"department": data.department, "month": data.clone_from}, {"_id": 0})
        if source:
            assignments = source.get("assignments", [])
    
    if not assignments:
        employees = await db.employees.find({"department": data.department}, {"_id": 0}).to_list(500)
        assignments = [
            {"employee_id": e["id"], "rest_days": e.get("rest_days", []), "location": e.get("location", ""), "shift": e.get("shift", "")}
            for e in employees
        ]

    schedule_id = str(uuid.uuid4())
    doc = {
        "id": schedule_id, "department": data.department, "month": data.month,
        "status": "draft", "assignments": assignments,
        "created_by": user.get("name", ""), "approved_by": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.monthly_schedules.insert_one(doc)
    await log_activity("schedule_created", user, data.month, f"تم إنشاء جدول شهري: {data.month} - {data.department}")
    doc.pop("_id", None)
    return doc


@router.put("/admin/schedules/{schedule_id}/assignment/{employee_id}")
async def update_assignment(schedule_id: str, employee_id: str, data: ScheduleAssignmentUpdate, user: dict = Depends(get_current_user)):
    if user["role"] not in ["system_admin", "general_manager", "department_manager"]:
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
    schedule = await db.monthly_schedules.find_one({"id": schedule_id}, {"_id": 0})
    if not schedule:
        raise HTTPException(status_code=404, detail="الجدول غير موجود")

    assignments = schedule.get("assignments", [])
    found = False
    for a in assignments:
        if a["employee_id"] == employee_id:
            if data.rest_days is not None:
                a["rest_days"] = data.rest_days
            if data.location is not None:
                a["location"] = data.location
            if data.shift is not None:
                a["shift"] = data.shift
            if data.is_tasked is not None:
                a["is_tasked"] = data.is_tasked
            found = True
            break
    
    if not found:
        new_a = {
            "employee_id": employee_id,
            "rest_days": data.rest_days or [],
            "location": data.location or "",
            "shift": data.shift or "",
            "is_tasked": data.is_tasked if data.is_tasked is not None else False
        }
        assignments.append(new_a)

    await db.monthly_schedules.update_one(
        {"id": schedule_id},
        {"$set": {"assignments": assignments, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "تم تحديث التعيين بنجاح"}


@router.put("/admin/schedules/{schedule_id}/status")
async def update_schedule_status(schedule_id: str, status: str = "active", user: dict = Depends(get_current_user)):
    if user["role"] not in ["system_admin", "general_manager", "department_manager"]:
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
    schedule = await db.monthly_schedules.find_one({"id": schedule_id}, {"_id": 0})
    if not schedule:
        raise HTTPException(status_code=404, detail="الجدول غير موجود")

    if status == "active":
        await db.monthly_schedules.update_many(
            {"department": schedule["department"], "status": "active"},
            {"$set": {"status": "archived"}}
        )

    await db.monthly_schedules.update_one(
        {"id": schedule_id},
        {"$set": {"status": status, "approved_by": user.get("name", ""), "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    action = "اعتماد" if status == "active" else "أرشفة"
    await log_activity("schedule_status", user, schedule["month"], f"تم {action} جدول شهري: {schedule['month']}")
    return {"message": f"تم {action} الجدول بنجاح"}


@router.put("/admin/schedules/{schedule_id}/unlock")
async def unlock_schedule(schedule_id: str, user: dict = Depends(get_current_user)):
    """فتح الجدول المعتمد للتعديل - للمدير والأدمن فقط"""
    if user["role"] not in ["system_admin", "department_manager"]:
        raise HTTPException(status_code=403, detail="فقط مدير الإدارة والأدمن يمكنهم فتح الجدول")
    schedule = await db.monthly_schedules.find_one({"id": schedule_id}, {"_id": 0})
    if not schedule:
        raise HTTPException(status_code=404, detail="الجدول غير موجود")
    if schedule.get("status") != "active":
        raise HTTPException(status_code=400, detail="الجدول غير معتمد")
    await db.monthly_schedules.update_one(
        {"id": schedule_id},
        {"$set": {"status": "draft", "unlocked_by": user.get("name", ""), "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    await log_activity("schedule_unlocked", user, schedule["month"], f"تم فتح الجدول للتعديل: {schedule['month']}")
    return {"message": "تم فتح الجدول للتعديل"}


@router.delete("/admin/schedules/{schedule_id}")
async def delete_schedule(schedule_id: str, user: dict = Depends(get_current_user)):
    if user["role"] not in ["system_admin", "general_manager", "department_manager"]:
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
    schedule = await db.monthly_schedules.find_one({"id": schedule_id}, {"_id": 0})
    if not schedule:
        raise HTTPException(status_code=404, detail="الجدول غير موجود")
    if schedule.get("status") == "active":
        raise HTTPException(status_code=400, detail="لا يمكن حذف جدول نشط")
    await db.monthly_schedules.delete_one({"id": schedule_id})
    await log_activity("schedule_deleted", user, schedule["month"], f"تم حذف جدول شهري: {schedule['month']}")
    return {"message": "تم حذف الجدول بنجاح"}
