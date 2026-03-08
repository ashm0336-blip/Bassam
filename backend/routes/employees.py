from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import datetime, timezone
import uuid

from database import db
from auth import get_current_user, require_admin, log_activity, check_department_access, hash_password
from models import EmployeeCreate, EmployeeUpdate, MonthlyScheduleCreate, ScheduleAssignmentUpdate

router = APIRouter()


async def _auto_create_user_account(employee_id: str, employee_doc: dict):
    """إنشاء حساب نظام تلقائي عند إضافة موظف — يبقى معلقاً حتى يُفعله المدير"""
    national_id = employee_doc.get("national_id")
    employee_number = employee_doc.get("employee_number", "")

    if not national_id:
        return None  # لا حساب بدون رقم هوية

    # التحقق من عدم وجود حساب مسبق
    existing = await db.users.find_one({"national_id": national_id})
    if existing:
        return existing["id"]

    # PIN الافتراضي = الرقم الوظيفي (يُغيَّر بأول دخول)
    default_pin = employee_number or "0000"

    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": None,
        "national_id": national_id,
        "password": hash_password(default_pin),
        "name": employee_doc.get("name", ""),
        "role": "field_staff",
        "department": employee_doc.get("department"),
        "account_status": "pending",          # ينتظر تفعيل المدير
        "must_change_pin": True,              # يُجبر على تغيير PIN
        "failed_attempts": 0,
        "employee_id": employee_id,
        "is_active": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)
    return user_id


@router.get("/employees")
async def get_employees(department: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if user["role"] == "department_manager":
        query["department"] = user.get("department")
    elif department and user["role"] in ["system_admin", "general_manager", "monitoring_team"]:
        query["department"] = department
    employees = await db.employees.find(query, {"_id": 0}).to_list(1000)
    # إضافة حالة الحساب لكل موظف
    for emp in employees:
        if emp.get("user_id"):
            u = await db.users.find_one({"id": emp["user_id"]}, {"_id": 0, "account_status": 1})
            emp["account_status"] = u.get("account_status", "no_account") if u else "no_account"
        else:
            emp["account_status"] = "no_account"
    return employees


@router.post("/employees")
async def create_employee(employee: EmployeeCreate, user: dict = Depends(get_current_user)):
    if user["role"] == "department_manager" and employee.department != user.get("department"):
        raise HTTPException(status_code=403, detail="يمكنك إضافة موظفين لقسمك فقط")
    if user["role"] not in ["system_admin", "general_manager", "department_manager"]:
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية")

    # التحقق من تكرار رقم الهوية
    if employee.national_id:
        existing_emp = await db.employees.find_one({"national_id": employee.national_id})
        if existing_emp:
            raise HTTPException(status_code=400, detail="رقم الهوية مسجل لموظف آخر")

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
    await log_activity("employee_updated", user, existing["name"], f"تم تحديث: {existing['name']}")
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

    await db.users.update_one(
        {"id": uid},
        {"$set": {"account_status": "active", "is_active": True, "failed_attempts": 0}}
    )
    await log_activity("account_activated", user, emp["name"], f"تفعيل حساب: {emp['name']}")
    return {"message": f"تم تفعيل حساب {emp['name']} ✅", "user_id": uid}


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
    return {"message": f"تم إعادة تعيين PIN — كلمة المرور الجديدة: {default_pin}"}


@router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str, user: dict = Depends(get_current_user)):
    existing = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="الموظف غير موجود")
    if user["role"] == "department_manager" and existing["department"] != user.get("department"):
        raise HTTPException(status_code=403, detail="يمكنك حذف موظفي قسمك فقط")
    if user["role"] not in ["system_admin", "general_manager", "department_manager"]:
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
    await db.employees.delete_one({"id": employee_id})
    await log_activity("employee_deleted", user, existing["name"], f"تم حذف الموظف: {existing['name']} من {existing['department']}")
    return {"message": "تم حذف الموظف بنجاح"}


@router.get("/employees/stats/{department}")
async def get_employee_stats(department: str, user: dict = Depends(get_current_user)):
    if not check_department_access(user, department):
        raise HTTPException(status_code=403, detail="لا يمكنك الوصول لبيانات هذه الإدارة")
    employees_list = await db.employees.find({"department": department}, {"_id": 0}).to_list(1000)
    total = len(employees_list)
    active = sum(1 for e in employees_list if e.get("is_active", True))
    shift_1 = sum(1 for e in employees_list if e.get("shift") == "الأولى" and e.get("is_active", True))
    shift_2 = sum(1 for e in employees_list if e.get("shift") == "الثانية" and e.get("is_active", True))
    shift_3 = sum(1 for e in employees_list if e.get("shift") == "الثالثة" and e.get("is_active", True))
    shift_4 = sum(1 for e in employees_list if e.get("shift") == "الرابعة" and e.get("is_active", True))
    active_employees = [e for e in employees_list if e.get("is_active", True)]
    unique_locations = len(set(e.get("location", "") for e in active_employees if e.get("location")))
    employees_with_location = sum(1 for e in active_employees if e.get("location"))
    return {
        "total_employees": total, "active_employees": active, "inactive_employees": total - active,
        "shifts": {"shift_1": shift_1, "shift_2": shift_2, "shift_3": shift_3, "shift_4": shift_4},
        "locations_count": unique_locations, "employees_with_location": employees_with_location
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
            found = True
            break
    
    if not found:
        new_a = {"employee_id": employee_id, "rest_days": data.rest_days or [], "location": data.location or "", "shift": data.shift or ""}
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
