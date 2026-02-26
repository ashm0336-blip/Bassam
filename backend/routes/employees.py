from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import datetime, timezone
import uuid

from database import db
from auth import get_current_user, require_admin, log_activity, check_department_access
from models import EmployeeCreate, EmployeeUpdate

router = APIRouter()


@router.get("/employees")
async def get_employees(department: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if user["role"] == "department_manager":
        query["department"] = user.get("department")
    elif department and user["role"] in ["system_admin", "general_manager", "monitoring_team"]:
        query["department"] = department
    employees = await db.employees.find(query, {"_id": 0}).to_list(1000)
    return employees


@router.post("/employees")
async def create_employee(employee: EmployeeCreate, user: dict = Depends(get_current_user)):
    if user["role"] == "department_manager" and employee.department != user.get("department"):
        raise HTTPException(status_code=403, detail="يمكنك إضافة موظفين لقسمك فقط")
    if user["role"] not in ["system_admin", "general_manager", "department_manager"]:
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
    employee_id = str(uuid.uuid4())
    employee_doc = {
        "id": employee_id, **employee.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.employees.insert_one(employee_doc)
    await log_activity("employee_created", user, employee.name, f"تم إضافة موظف جديد: {employee.name} - {employee.job_title} ({employee.department})")
    return {"message": "تم إضافة الموظف بنجاح", "id": employee_id}


@router.put("/employees/{employee_id}")
async def update_employee(employee_id: str, employee: EmployeeUpdate, user: dict = Depends(get_current_user)):
    existing = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="الموظف غير موجود")
    if user["role"] == "department_manager" and existing["department"] != user.get("department"):
        raise HTTPException(status_code=403, detail="يمكنك تعديل موظفي قسمك فقط")
    if user["role"] not in ["system_admin", "general_manager", "department_manager"]:
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
    update_data = {k: v for k, v in employee.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.employees.update_one({"id": employee_id}, {"$set": update_data})
    await log_activity("employee_updated", user, existing["name"], f"تم تحديث بيانات الموظف: {existing['name']}")
    return {"message": "تم تحديث الموظف بنجاح"}


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
