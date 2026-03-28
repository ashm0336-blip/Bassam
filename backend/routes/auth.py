from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import re

from database import db
from auth import get_current_user, require_admin, require_manager_or_above, log_activity, hash_password, verify_password, create_token, check_page_permission
from models import (
    UserCreate, UserUpdate, UserLogin, UserResponse, TokenResponse,
    PinChangeRequest, AccountStatusUpdate,
)
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
router = APIRouter()

MAX_FAILED_ATTEMPTS = 5   # قفل بعد 5 محاولات
SESSION_HOURS = {          # مدة الجلسة حسب الدور
    "system_admin":      12,
    "general_manager":   8,
    "department_manager": 8,
    "shift_supervisor":  6,
    "field_staff":       4,
}

def _is_national_id(identifier: str) -> bool:
    """رقم الهوية: 10 أرقام تبدأ بـ 1 أو 2"""
    return bool(re.match(r'^[12]\d{9}$', identifier.strip()))

def _is_email(identifier: str) -> bool:
    return "@" in identifier


# ─── Activity Log ──────────────────────────────────────────────
@router.get("/admin/activity-logs")
async def get_activity_logs(
    action: Optional[str] = None,
    user_email: Optional[str] = None,
    user_name: Optional[str] = None,
    department: Optional[str] = None,
    date: Optional[str] = None,
    limit: int = 200,
    admin: dict = Depends(require_admin)
):
    query = {}
    if action and action != "all":
        query["action"] = action
    if user_email:
        safe_email = re.escape(user_email)
        query["user_email"] = {"$regex": safe_email, "$options": "i"}
    if user_name:
        safe_name = re.escape(user_name)
        query["user_name"] = {"$regex": safe_name, "$options": "i"}
    if department and department != "all":
        query["department"] = department
    if date:
        start = datetime.fromisoformat(f"{date}T00:00:00")
        end   = datetime.fromisoformat(f"{date}T23:59:59")
        query["timestamp"] = {"$gte": start.isoformat(), "$lte": end.isoformat()}
    logs = await db.activity_logs.find(query, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    return logs


@router.get("/manager/activity-logs")
async def get_manager_activity_logs(
    action: Optional[str] = None,
    limit: int = 50,
    user: dict = Depends(require_manager_or_above)
):
    admin_ids = [a["id"] async for a in db.users.find({"role": "system_admin"}, {"_id": 0, "id": 1})]
    query = {"user_role": {"$ne": "system_admin"}}
    if admin_ids:
        query["user_id"] = {"$nin": admin_ids}
    role = user.get("role")
    if role == "department_manager":
        dept = user.get("department")
        if dept:
            query["department"] = dept
    if action and action != "all":
        query["action"] = action
    logs = await db.activity_logs.find(query, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    return logs


# ─── Setup ─────────────────────────────────────────────────────
@router.post("/auth/setup")
async def setup_admin():
    count = await db.users.count_documents({})
    if count > 0:
        return {"message": "النظام مُهيّأ مسبقاً", "users": count}
    admin_user = {
        "id": str(uuid.uuid4()),
        "email": "admin@crowd.sa",
        "national_id": None,
        "password": hash_password("admin123"),
        "name": "مسؤول النظام",
        "role": "system_admin",
        "department": None,
        "account_status": "active",
        "must_change_pin": False,
        "failed_attempts": 0,
        "employee_id": None,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(admin_user)
    return {"message": "✅ تم إنشاء مستخدم الأدمن"}


# ─── Login (مرن: بريد إلكتروني أو رقم هوية) ──────────────────
@router.post("/auth/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, credentials: UserLogin):
    identifier = credentials.identifier.strip()

    # ── البحث عن المستخدم ──
    if _is_email(identifier):
        user = await db.users.find_one({"email": identifier}, {"_id": 0})
    elif _is_national_id(identifier):
        user = await db.users.find_one({"national_id": identifier}, {"_id": 0})
    else:
        raise HTTPException(status_code=401, detail="أدخل بريداً إلكترونياً أو رقم هوية صحيحاً")

    if not user:
        raise HTTPException(status_code=401, detail="بيانات الدخول غير صحيحة — تأكد من رقم الهوية وكلمة المرور")

    # ── التحقق من حالة الحساب ──
    status = user.get("account_status", "active")
    if status == "terminated":
        raise HTTPException(status_code=403, detail="تم إنهاء خدمتك. تواصل مع مديرك")
    if status == "frozen":
        raise HTTPException(status_code=403, detail="حسابك مجمَّد مؤقتاً. تواصل مع مديرك")
    if status == "pending":
        raise HTTPException(status_code=403, detail="حسابك لم يُفعَّل بعد. تواصل مع مديرك")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="الحساب غير نشط")

    # ── التحقق من الإغلاق بسبب المحاولات ──
    if user.get("failed_attempts", 0) >= MAX_FAILED_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail=f"حسابك مقفل بسبب {MAX_FAILED_ATTEMPTS} محاولات خاطئة. تواصل مع مديرك لإعادة التعيين"
        )

    # ── التحقق من كلمة المرور ──
    if not verify_password(credentials.password, user["password"]):
        new_attempts = user.get("failed_attempts", 0) + 1
        update = {"failed_attempts": new_attempts}
        if new_attempts >= MAX_FAILED_ATTEMPTS:
            update["account_status"] = "frozen"
            await db.users.update_one({"id": user["id"]}, {"$set": update})
            raise HTTPException(
                status_code=429,
                detail=f"كلمة المرور خاطئة. تم قفل الحساب بعد {MAX_FAILED_ATTEMPTS} محاولات. تواصل مع مديرك"
            )
        await db.users.update_one({"id": user["id"]}, {"$set": update})
        remaining = MAX_FAILED_ATTEMPTS - new_attempts
        raise HTTPException(
            status_code=401,
            detail=f"بيانات الدخول غير صحيحة — تأكد من رقم الهوية وكلمة المرور. متبقي {remaining} محاولة قبل القفل"
        )

    # ── نجح الدخول — أعد محاولات الفشل ──
    must_change = user.get("must_change_pin", False)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"failed_attempts": 0, "last_login": datetime.now(timezone.utc).isoformat()}}
    )

    await log_activity("login", user, None,
        f"تسجيل دخول ناجح — {identifier}"
    )

    token = create_token(user["id"], user.get("email") or user.get("national_id", ""), user["role"], user.get("department"))

    # Get permission group name
    login_grp_name = None
    login_grp_id = user.get("permission_group_id")
    if login_grp_id:
        login_grp = await db.permission_groups.find_one({"id": login_grp_id}, {"_id": 0, "name_ar": 1})
        login_grp_name = login_grp.get("name_ar") if login_grp else None

    return TokenResponse(
        access_token=token,
        must_change_pin=must_change,
        user=UserResponse(
            id=user["id"],
            email=user.get("email"),
            national_id=user.get("national_id"),
            name=user["name"],
            role=user["role"],
            department=user.get("department"),
            allowed_departments=user.get("allowed_departments", [user["department"]] if user.get("department") else []),
            account_status=user.get("account_status", "active"),
            must_change_pin=must_change,
            employee_id=user.get("employee_id"),
            permission_group_id=login_grp_id,
            permission_group_name=login_grp_name,
            created_at=user["created_at"],
        )
    )


# ─── تسجيل الخروج ──────────────────────────────────────────────
@router.post("/auth/logout")
async def logout(user: dict = Depends(get_current_user)):
    await log_activity("logout", user, user.get("name"), f"تسجيل خروج — {user.get('name','')}")
    return {"message": "تم تسجيل الخروج"}


# ─── تغيير PIN (إجباري عند أول دخول) ──────────────────────────
@router.post("/auth/change-pin")
@limiter.limit("5/minute")
async def change_pin(request: Request, data: PinChangeRequest, user: dict = Depends(get_current_user)):
    pin = data.new_pin.strip()
    if not pin.isdigit() or not (4 <= len(pin) <= 6):
        raise HTTPException(status_code=400, detail="PIN يجب أن يكون 4–6 أرقام")

    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"password": hash_password(pin), "must_change_pin": False}}
    )
    await log_activity("change_pin", user, user["name"], "تم تغيير PIN")
    return {"message": "تم تغيير PIN بنجاح"}


# ─── إعادة تعيين PIN (المدير أو الأدمن) ───────────────────────
@router.post("/auth/reset-pin/{user_id}")
@limiter.limit("10/minute")
async def reset_pin(request: Request, user_id: str, manager: dict = Depends(get_current_user)):
    target = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    if manager.get("role") != "system_admin" and user_id == manager.get("id"):
        raise HTTPException(status_code=403, detail="لا يمكنك إعادة تعيين رمزك بنفسك")

    if manager["role"] == "system_admin":
        pass
    elif manager.get("role") == "department_manager":
        if target.get("department") != manager.get("department"):
            raise HTTPException(status_code=403, detail="يمكنك إعادة تعيين PIN موظفي إدارتك فقط")
    else:
        has_perm = await check_page_permission(manager, "sub=Staff", require_edit=True)
        if not has_perm:
            raise HTTPException(status_code=403, detail="غير مصرح")

    # PIN الجديد = الرقم الوظيفي من بيانات الموظف
    default_pin = "0000"
    if target.get("employee_id"):
        emp = await db.employees.find_one({"id": target["employee_id"]}, {"_id": 0})
        if emp and emp.get("employee_number"):
            default_pin = emp["employee_number"]

    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "password": hash_password(default_pin),
            "must_change_pin": True,
            "failed_attempts": 0,
            "account_status": "active",
        }}
    )
    await log_activity("reset_pin", manager, target["name"],
        f"أعاد {manager['name']} تعيين PIN للمستخدم {target['name']}"
    )
    return {"message": f"تم إعادة تعيين PIN بنجاح — الرقم السري الجديد: {default_pin}"}


# ─── تغيير حالة الحساب (تفعيل/تجميد/إنهاء) ────────────────────
@router.put("/auth/account-status/{user_id}")
async def update_account_status(user_id: str, data: AccountStatusUpdate, manager: dict = Depends(get_current_user)):
    target = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    if manager.get("role") != "system_admin" and user_id == manager.get("id"):
        raise HTTPException(status_code=403, detail="لا يمكنك تغيير حالة حسابك بنفسك")

    if data.status not in ["active", "frozen", "terminated"]:
        raise HTTPException(status_code=400, detail="حالة غير صحيحة")

    if manager["role"] == "system_admin":
        pass
    elif manager.get("role") == "department_manager":
        if target.get("department") != manager.get("department"):
            raise HTTPException(status_code=403, detail="يمكنك إدارة موظفي إدارتك فقط")
    else:
        has_perm = await check_page_permission(manager, "sub=Staff", require_edit=True)
        if not has_perm:
            raise HTTPException(status_code=403, detail="غير مصرح")

    # لا يمكن تغيير حالة مسؤول النظام
    if target.get("role") == "system_admin" and manager["id"] != target["id"]:
        raise HTTPException(status_code=403, detail="لا يمكن تعديل حساب مسؤول النظام")

    status_labels = {"active": "مفعَّل", "frozen": "مجمَّد", "terminated": "مُنهي الخدمة"}
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"account_status": data.status, "is_active": data.status == "active"}}
    )
    await log_activity(f"account_{data.status}", manager, target["name"],
        f"{manager['name']} غيَّر حالة {target['name']} إلى: {status_labels[data.status]}"
    )
    return {"message": f"تم تغيير حالة الحساب إلى: {status_labels[data.status]}"}


# ─── Me ────────────────────────────────────────────────────────
@router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    dept = user.get("department")
    # Get permission group name
    grp_name = None
    grp_id = user.get("permission_group_id")
    if grp_id:
        grp = await db.permission_groups.find_one({"id": grp_id}, {"_id": 0, "name_ar": 1})
        grp_name = grp.get("name_ar") if grp else None
    return UserResponse(
        id=user["id"],
        email=user.get("email"),
        national_id=user.get("national_id"),
        name=user["name"],
        role=user["role"],
        department=dept,
        allowed_departments=user.get("allowed_departments", [dept] if dept else []),
        account_status=user.get("account_status", "active"),
        must_change_pin=user.get("must_change_pin", False),
        employee_id=user.get("employee_id"),
        permission_group_id=grp_id,
        permission_group_name=grp_name,
        created_at=user["created_at"],
    )


# ─── تحديث الملف الشخصي (حسابي) ────────────────────────────────
@router.put("/auth/update-profile")
async def update_profile(data: dict, user: dict = Depends(get_current_user)):
    update = {}
    if "name" in data and data["name"].strip():
        update["name"] = data["name"].strip()
    if "email" in data and data["email"].strip():
        # تحقق من عدم التكرار
        existing = await db.users.find_one({"email": data["email"].strip(), "id": {"$ne": user["id"]}})
        if existing:
            raise HTTPException(status_code=400, detail="البريد الإلكتروني مستخدم من حساب آخر")
        update["email"] = data["email"].strip()
    if not update:
        raise HTTPException(status_code=400, detail="لا توجد بيانات للتحديث")
    await db.users.update_one({"id": user["id"]}, {"$set": update})
    await log_activity("profile_updated", user, user["name"], f"تم تحديث الملف الشخصي: {', '.join(update.keys())}")
    return {"message": "تم تحديث الملف الشخصي بنجاح", **update}


# ─── تغيير كلمة المرور (يتطلب كلمة المرور الحالية) ──────────────
@router.post("/auth/change-password")
@limiter.limit("5/minute")
async def change_password(request: Request, data: dict, user: dict = Depends(get_current_user)):
    current_password = data.get("current_password", "").strip()
    new_password = data.get("new_password", "").strip()

    if not current_password or not new_password:
        raise HTTPException(status_code=400, detail="أدخل كلمة المرور الحالية والجديدة")
    if len(new_password) < 4:
        raise HTTPException(status_code=400, detail="كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل")

    # جلب البيانات الكاملة مع كلمة المرور
    full_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if not full_user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")

    if not verify_password(current_password, full_user["password"]):
        raise HTTPException(status_code=401, detail="كلمة المرور الحالية غير صحيحة")

    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"password": hash_password(new_password)}}
    )
    await log_activity("password_changed", user, user["name"], "تم تغيير كلمة المرور")
    return {"message": "تم تغيير كلمة المرور بنجاح"}



# ─── CRUD مستخدمين (للأدمن) ────────────────────────────────────
@router.post("/users", response_model=UserResponse)
async def create_user(user_data: UserCreate, admin: dict = Depends(require_admin)):
    # تحقق من التكرار
    if user_data.email:
        if await db.users.find_one({"email": user_data.email}):
            raise HTTPException(status_code=400, detail="البريد الإلكتروني مسجل مسبقاً")
    if user_data.national_id:
        if await db.users.find_one({"national_id": user_data.national_id}):
            raise HTTPException(status_code=400, detail="رقم الهوية مسجل مسبقاً")

    if user_data.role in ["department_manager", "field_staff", "shift_supervisor"] and not user_data.department:
        raise HTTPException(status_code=400, detail="يجب تحديد الإدارة لهذا الدور")

    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": user_data.email,
        "national_id": user_data.national_id,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "role": user_data.role,
        "department": user_data.department,
        "account_status": "active",
        "must_change_pin": user_data.national_id is not None,  # الميداني يغير PIN عند أول دخول
        "failed_attempts": 0,
        "employee_id": user_data.employee_id,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    await log_activity("user_created", admin, user_data.name,
        f"تم إنشاء مستخدم: {user_data.name} ({user_data.role})"
    )
    return UserResponse(**{k: v for k, v in user.items() if k != "password"})


@router.get("/users", response_model=List[UserResponse])
async def get_all_users(admin: dict = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    result = []
    for u in users:
        try:
            result.append(UserResponse(**u))
        except Exception:
            pass
    return result


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, user_data: UserUpdate, admin: dict = Depends(require_admin)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    update_data = {}
    if user_data.name:         update_data["name"] = user_data.name
    if user_data.role:         update_data["role"] = user_data.role
    if user_data.department is not None: update_data["department"] = user_data.department
    if user_data.password:     update_data["password"] = hash_password(user_data.password)
    if user_data.is_active is not None:
        update_data["is_active"] = user_data.is_active
        update_data["account_status"] = "active" if user_data.is_active else "frozen"
    if user_data.account_status: update_data["account_status"] = user_data.account_status
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
        user.update(update_data)
        await log_activity("user_updated", admin, user["name"], f"تم تحديث: {user['name']}")
    return UserResponse(**{k: v for k, v in user.items() if k != "password"})


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="لا يمكنك حذف حسابك الخاص")
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    await db.users.delete_one({"id": user_id})
    await log_activity("user_deleted", admin, user["name"], f"تم حذف: {user['name']}")
    return {"message": "تم حذف المستخدم بنجاح"}


# ─── Admin Users List ───────────────────────────────────────────
@router.get("/admin/users")
async def get_admin_users(admin: dict = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return users
