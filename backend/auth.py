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


def create_token(user_id: str, email: str, role: Optional[str], department: Optional[str] = None) -> str:
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


async def _user_has_group_permission(user: dict, required_perms: list) -> bool:
    """Check if user's permission group grants any of the required permissions."""
    group_id = user.get("permission_group_id")
    if not group_id:
        return False
    group = await db.permission_groups.find_one({"id": group_id}, {"_id": 0, "page_permissions": 1})
    if not group:
        return False
    pp = group.get("page_permissions", {})
    # Check if user has editable access to any page that maps to required perms
    for href, perm in pp.items():
        if perm.get("editable"):
            return True
    return False


async def require_admin(user: dict = Depends(get_current_user)):
    """Only system_admin and general_manager can access admin functions."""
    if user["role"] in ("system_admin", "general_manager"):
        return user
    raise HTTPException(status_code=403, detail="صلاحيات غير كافية")


async def require_manager_or_above(user: dict = Depends(get_current_user)):
    """System admin, general manager, or department manager."""
    if user["role"] in ("system_admin", "general_manager", "department_manager"):
        return user
    # Check group permissions — if user has any editable page, they have manager-level access
    group_id = user.get("permission_group_id")
    if group_id:
        group = await db.permission_groups.find_one({"id": group_id}, {"_id": 0, "page_permissions": 1})
        if group:
            pp = group.get("page_permissions", {})
            has_edit = any(v.get("editable") for v in pp.values())
            if has_edit:
                return user
    raise HTTPException(status_code=403, detail="صلاحيات غير كافية")


async def require_department_manager(user: dict = Depends(get_current_user)):
    """User with department management permissions (via role OR group)."""
    if user["role"] in ["system_admin", "general_manager", "department_manager"]:
        return user
    # Check group permissions
    group_id = user.get("permission_group_id")
    if group_id:
        group = await db.permission_groups.find_one({"id": group_id}, {"_id": 0, "page_permissions": 1})
        if group:
            pp = group.get("page_permissions", {})
            has_edit = any(v.get("editable") for v in pp.values())
            if has_edit:
                return user
    raise HTTPException(status_code=403, detail="صلاحيات غير كافية")


def check_department_access(user: dict, department: str) -> bool:
    if user["role"] in ["system_admin", "general_manager"]:
        return True
    if user["role"] == "department_manager":
        return user.get("department") == department
    # For other roles: must be in the same department
    return user.get("department") == department


async def log_activity(action: str, user: dict, target: str = None, details: str = None):
    try:
        activity = {
            "id": str(uuid.uuid4()),
            "action": action,
            "user_id": user["id"],
            "user_name": user["name"],
            "user_email": user.get("email"),
            "user_role": user.get("role"),
            "department": user.get("department"),
            "target": target,
            "details": details,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await db.activity_logs.insert_one(activity)
    except Exception as e:
        logging.error(f"Failed to log activity: {e}")
