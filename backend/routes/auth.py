from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from database import db
from auth import get_current_user, require_admin, log_activity, hash_password, verify_password, create_token
from models import (
    UserCreate, UserUpdate, UserLogin, UserResponse, TokenResponse,
)

router = APIRouter()


# ============= Activity Log Routes =============
@router.get("/admin/activity-logs")
async def get_activity_logs(
    action: Optional[str] = None,
    user_email: Optional[str] = None,
    date: Optional[str] = None,
    limit: int = 100,
    admin: dict = Depends(require_admin)
):
    query = {}
    if action and action != "all":
        query["action"] = action
    if user_email:
        query["user_email"] = {"$regex": user_email, "$options": "i"}
    if date:
        start_date = datetime.fromisoformat(f"{date}T00:00:00")
        end_date = datetime.fromisoformat(f"{date}T23:59:59")
        query["timestamp"] = {"$gte": start_date.isoformat(), "$lte": end_date.isoformat()}
    logs = await db.activity_logs.find(query, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    return logs


# ============= Auth Routes =============
@router.post("/auth/setup")
async def setup_admin():
    """Creates the default admin user if no users exist - safe to call on fresh deployments"""
    count = await db.users.count_documents({})
    if count > 0:
        return {"message": "النظام مُهيّأ مسبقاً", "users": count}
    import uuid
    from datetime import datetime, timezone
    admin_user = {
        "id": str(uuid.uuid4()),
        "email": "admin@crowd.sa",
        "password": hash_password("admin123"),
        "name": "مسؤول النظام",
        "role": "system_admin",
        "department": None,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(admin_user)
    return {"message": "✅ تم إنشاء مستخدم الأدمن بنجاح", "email": "admin@crowd.sa", "password": "admin123"}


@router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="بيانات الدخول غير صحيحة")
    await log_activity("login", user, None, f"تسجيل دخول ناجح من {credentials.email}")
    token = create_token(user["id"], user["email"], user["role"], user.get("department"))
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"], email=user["email"], name=user["name"],
            role=user["role"], department=user.get("department"), created_at=user["created_at"]
        )
    )


@router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"], email=user["email"], name=user["name"],
        role=user["role"], department=user.get("department"), created_at=user["created_at"]
    )


@router.post("/users", response_model=UserResponse)
async def create_user(user_data: UserCreate, admin: dict = Depends(require_admin)):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="البريد الإلكتروني مسجل مسبقاً")
    if user_data.role in ["department_manager", "field_staff"] and not user_data.department:
        raise HTTPException(status_code=400, detail="يجب تحديد الإدارة لهذا الدور")
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id, "email": user_data.email, "password": hash_password(user_data.password),
        "name": user_data.name, "role": user_data.role, "department": user_data.department,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    await log_activity("user_created", admin, user_data.name, f"تم إنشاء مستخدم جديد: {user_data.name} ({user_data.role})")
    return UserResponse(
        id=user_id, email=user_data.email, name=user_data.name,
        role=user_data.role, department=user_data.department, created_at=user["created_at"]
    )


@router.get("/users", response_model=List[UserResponse])
async def get_all_users(admin: dict = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return [UserResponse(**user) for user in users]


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, user_data: UserUpdate, admin: dict = Depends(require_admin)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    update_data = {}
    if user_data.name:
        update_data["name"] = user_data.name
    if user_data.role:
        update_data["role"] = user_data.role
    if user_data.department is not None:
        update_data["department"] = user_data.department
    if user_data.password:
        update_data["password"] = hash_password(user_data.password)
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
        user.update(update_data)
        await log_activity("user_updated", admin, user["name"], f"تم تحديث بيانات المستخدم: {user['name']}")
    return UserResponse(
        id=user["id"], email=user["email"], name=user["name"],
        role=user["role"], department=user.get("department"), created_at=user["created_at"]
    )


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="لا يمكنك حذف حسابك الخاص")
    user_to_delete = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user_to_delete:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    await db.users.delete_one({"id": user_id})
    await log_activity("user_deleted", admin, user_to_delete["name"], f"تم حذف المستخدم: {user_to_delete['name']}")
    return {"message": "تم حذف المستخدم بنجاح"}
