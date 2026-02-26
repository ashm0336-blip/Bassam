from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timezone, timedelta
from typing import Optional
import jwt
import bcrypt
import os
import uuid
import logging

from database import db

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

security = HTTPBearer()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


def create_token(user_id: str, email: str, role: str, department: Optional[str] = None) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "department": department,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="المستخدم غير موجود")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="انتهت صلاحية الجلسة")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="رمز غير صالح")


async def require_admin(user: dict = Depends(get_current_user)):
    if user["role"] != "system_admin":
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية - يتطلب صلاحيات مسؤول النظام")
    return user


async def require_department_manager(user: dict = Depends(get_current_user)):
    if user["role"] not in ["system_admin", "general_manager", "department_manager"]:
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية - يتطلب صلاحيات مدير أو أعلى")
    return user


def check_department_access(user: dict, department: str) -> bool:
    if user["role"] in ["system_admin", "general_manager", "monitoring_team"]:
        return True
    if user["role"] == "department_manager":
        return user.get("department") == department
    return False


async def log_activity(action: str, user: dict, target: str = None, details: str = None):
    try:
        activity = {
            "id": str(uuid.uuid4()),
            "action": action,
            "user_id": user["id"],
            "user_name": user["name"],
            "user_email": user["email"],
            "target": target,
            "details": details,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await db.activity_logs.insert_one(activity)
    except Exception as e:
        logging.error(f"Failed to log activity: {e}")
