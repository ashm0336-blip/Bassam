from fastapi import FastAPI, APIRouter, Query, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'al-haram-os-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="Al-Haram OS API", description="منصة خدمات الحشود API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# ============= Auth Models =============
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "field_staff"  # system_admin, general_manager, department_manager, field_staff, monitoring_team
    department: Optional[str] = None  # planning, plazas, gates, crowd_services, mataf

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    password: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    department: Optional[str] = None
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# ============= Data Models =============
class GateCreate(BaseModel):
    name: str
    number: int
    plaza: str  # الساحة الشرقية، الشمالية، الجنوبية، الغربية
    plaza_color: str  # Color code
    gate_type: str  # رئيسي، فرعي، سلم كهربائي، مصعد، درج، جسر، مشابة، عبارة، مزلقان
    direction: str  # دخول، خروج، دخول وخروج
    category: List[str]  # محرمين، مصلين، عربات (multiple selection)
    classification: str  # عام، رجال، نساء، طوارئ، خدمات، جنائز
    status: str = "متاح"  # متاح، مغلق، متوسط، مزدحم
    current_indicator: str = "مغلق"  # مغلق، خفيف، متوسط، مزدحم
    current_flow: int = 0
    max_flow: int = 5000

class GateUpdate(BaseModel):
    name: Optional[str] = None
    plaza: Optional[str] = None
    plaza_color: Optional[str] = None
    gate_type: Optional[str] = None
    direction: Optional[str] = None
    category: Optional[List[str]] = None
    classification: Optional[str] = None
    status: Optional[str] = None
    current_indicator: Optional[str] = None
    current_flow: Optional[int] = None
    max_flow: Optional[int] = None

class PlazaCreate(BaseModel):
    name: str
    zone: str  # north, south, east, west, masa, ajyad
    current_crowd: int = 0
    max_capacity: int = 40000

class PlazaUpdate(BaseModel):
    name: Optional[str] = None
    current_crowd: Optional[int] = None
    max_capacity: Optional[int] = None

class MatafLevelCreate(BaseModel):
    level: str  # الطابق الأرضي, الطابق الأول, سطح الحرم
    current_crowd: int = 0
    max_capacity: int = 50000
    average_tawaf_time: int = 45

class MatafLevelUpdate(BaseModel):
    current_crowd: Optional[int] = None
    max_capacity: Optional[int] = None
    average_tawaf_time: Optional[int] = None

class AlertCreate(BaseModel):
    type: str  # emergency, warning, info
    title: str
    message: str
    department: str
    priority: str = "medium"  # critical, high, medium, low

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# ============= Auth Functions =============
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
    """Requires system_admin role only"""
    if user["role"] != "system_admin":
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية - يتطلب صلاحيات مسؤول النظام")
    return user

async def require_department_manager(user: dict = Depends(get_current_user)):
    """Requires department_manager, general_manager or system_admin"""
    if user["role"] not in ["system_admin", "general_manager", "department_manager"]:
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية - يتطلب صلاحيات مدير أو أعلى")
    return user

def check_department_access(user: dict, department: str) -> bool:
    """Check if user has access to specific department"""
    if user["role"] == "system_admin":
        return True
    if user["role"] == "general_manager":
        return True  # Can view all departments
    if user["role"] == "monitoring_team":
        return True  # Can view all departments
    if user["role"] == "department_manager":
        return user.get("department") == department
    if user["role"] == "field_staff":
        return user.get("department") == department
    return False

# ============= Auth Routes =============
@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="بيانات الدخول غير صحيحة")
    
    token = create_token(user["id"], user["email"], user["role"], user.get("department"))
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            role=user["role"],
            department=user.get("department"),
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        department=user.get("department"),
        created_at=user["created_at"]
    )

# Admin-only user creation
@api_router.post("/users", response_model=UserResponse)
async def create_user(user_data: UserCreate, admin: dict = Depends(require_admin)):
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="البريد الإلكتروني مسجل مسبقاً")
    
    # Validate department for roles that need it
    if user_data.role in ["department_manager", "field_staff"] and not user_data.department:
        raise HTTPException(status_code=400, detail="يجب تحديد الإدارة لهذا الدور")
    
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "role": user_data.role,
        "department": user_data.department,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user)
    
    return UserResponse(
        id=user_id,
        email=user_data.email,
        name=user_data.name,
        role=user_data.role,
        department=user_data.department,
        created_at=user["created_at"]
    )

# Get all users (admin only)
@api_router.get("/users", response_model=List[UserResponse])
async def get_all_users(admin: dict = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return [UserResponse(**user) for user in users]

# Update user (admin only)
@api_router.put("/users/{user_id}", response_model=UserResponse)
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
    
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        department=user.get("department"),
        created_at=user["created_at"]
    )

# Delete user (admin only)
@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    # Don't allow deleting yourself
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="لا يمكنك حذف حسابك الخاص")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    return {"message": "تم حذف المستخدم بنجاح"}

# ============= Admin Routes - Gates =============
@api_router.post("/admin/gates")
async def create_gate(gate: GateCreate, user: dict = Depends(require_admin)):
    gate_id = str(uuid.uuid4())
    gate_doc = {
        "id": gate_id,
        **gate.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.gates.insert_one(gate_doc)
    return {"message": "تم إضافة الباب بنجاح", "id": gate_id}

@api_router.put("/admin/gates/{gate_id}")
async def update_gate(gate_id: str, gate: GateUpdate, user: dict = Depends(require_admin)):
    update_data = {k: v for k, v in gate.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.gates.update_one({"id": gate_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="الباب غير موجود")
    return {"message": "تم تحديث الباب بنجاح"}

@api_router.delete("/admin/gates/{gate_id}")
async def delete_gate(gate_id: str, user: dict = Depends(require_admin)):
    result = await db.gates.delete_one({"id": gate_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="الباب غير موجود")
    return {"message": "تم حذف الباب بنجاح"}

# ============= Admin Routes - Plazas =============
@api_router.post("/admin/plazas")
async def create_plaza(plaza: PlazaCreate, user: dict = Depends(require_admin)):
    plaza_id = str(uuid.uuid4())
    plaza_doc = {
        "id": plaza_id,
        **plaza.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.plazas.insert_one(plaza_doc)
    return {"message": "تم إضافة الساحة بنجاح", "id": plaza_id}

@api_router.put("/admin/plazas/{plaza_id}")
async def update_plaza(plaza_id: str, plaza: PlazaUpdate, user: dict = Depends(require_admin)):
    update_data = {k: v for k, v in plaza.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.plazas.update_one({"id": plaza_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="الساحة غير موجودة")
    return {"message": "تم تحديث الساحة بنجاح"}

@api_router.delete("/admin/plazas/{plaza_id}")
async def delete_plaza(plaza_id: str, user: dict = Depends(require_admin)):
    result = await db.plazas.delete_one({"id": plaza_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="الساحة غير موجودة")
    return {"message": "تم حذف الساحة بنجاح"}

# ============= Admin Routes - Mataf =============
@api_router.post("/admin/mataf")
async def create_mataf_level(mataf: MatafLevelCreate, user: dict = Depends(require_admin)):
    mataf_id = str(uuid.uuid4())
    mataf_doc = {
        "id": mataf_id,
        **mataf.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.mataf.insert_one(mataf_doc)
    return {"message": "تم إضافة طابق المطاف بنجاح", "id": mataf_id}

@api_router.put("/admin/mataf/{mataf_id}")
async def update_mataf_level(mataf_id: str, mataf: MatafLevelUpdate, user: dict = Depends(require_admin)):
    update_data = {k: v for k, v in mataf.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.mataf.update_one({"id": mataf_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="طابق المطاف غير موجود")
    return {"message": "تم تحديث طابق المطاف بنجاح"}

# ============= Admin Routes - Alerts =============
@api_router.post("/admin/alerts")
async def create_alert(alert: AlertCreate, user: dict = Depends(require_admin)):
    alert_id = str(uuid.uuid4())
    alert_doc = {
        "id": alert_id,
        **alert.model_dump(),
        "is_read": False,
        "created_by": user["id"],
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.alerts.insert_one(alert_doc)
    return {"message": "تم إنشاء التنبيه بنجاح", "id": alert_id}

@api_router.delete("/admin/alerts/{alert_id}")
async def delete_alert(alert_id: str, user: dict = Depends(require_admin)):
    result = await db.alerts.delete_one({"id": alert_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="التنبيه غير موجود")
    return {"message": "تم حذف التنبيه بنجاح"}

# ============= Admin - Bulk Update =============
@api_router.put("/admin/gates/bulk-update")
async def bulk_update_gates(updates: List[dict], user: dict = Depends(require_admin)):
    for update in updates:
        gate_id = update.pop("id", None)
        if gate_id:
            update["updated_at"] = datetime.now(timezone.utc).isoformat()
            await db.gates.update_one({"id": gate_id}, {"$set": update})
    return {"message": f"تم تحديث {len(updates)} باب"}

@api_router.put("/admin/plazas/bulk-update")
async def bulk_update_plazas(updates: List[dict], user: dict = Depends(require_admin)):
    for update in updates:
        plaza_id = update.pop("id", None)
        if plaza_id:
            update["updated_at"] = datetime.now(timezone.utc).isoformat()
            await db.plazas.update_one({"id": plaza_id}, {"$set": update})
    return {"message": f"تم تحديث {len(updates)} ساحة"}

# ============= Admin - Users Management =============
@api_router.get("/admin/users")
async def get_users(user: dict = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(100)
    return users

@api_router.put("/admin/users/{user_id}/role")
async def update_user_role(user_id: str, role: str, user: dict = Depends(require_admin)):
    if role not in ["admin", "manager", "supervisor", "user"]:
        raise HTTPException(status_code=400, detail="صلاحية غير صالحة")
    result = await db.users.update_one({"id": user_id}, {"$set": {"role": role}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    return {"message": "تم تحديث صلاحيات المستخدم"}

# ============= Public API Routes =============
@api_router.get("/")
async def root():
    return {"message": "مرحباً بك في منصة خدمات الحشود", "version": "1.0.0"}

@api_router.get("/dashboard/stats")
async def get_dashboard_stats():
    """Get main dashboard statistics from database"""
    gates = await db.gates.find({}, {"_id": 0}).to_list(200)
    plazas = await db.plazas.find({}, {"_id": 0}).to_list(50)
    mataf = await db.mataf.find({}, {"_id": 0}).to_list(10)
    alerts = await db.alerts.find({"is_read": False}, {"_id": 0}).to_list(100)
    
    # If no data in DB, return zeros
    if not gates and not plazas:
        return {
            "total_visitors_today": 0,
            "current_crowd": 0,
            "max_capacity": 0,
            "active_staff": 0,
            "open_gates": 0,
            "total_gates": 0,
            "incidents_today": 0,
            "alerts_count": 0
        }
    
    total_crowd = sum(p.get("current_crowd", 0) for p in plazas) + sum(m.get("current_crowd", 0) for m in mataf)
    total_max = sum(p.get("max_capacity", 0) for p in plazas) + sum(m.get("max_capacity", 0) for m in mataf)
    open_gates = len([g for g in gates if g.get("status") == "open"])
    
    return {
        "total_visitors_today": total_crowd * 3,  # Estimate
        "current_crowd": total_crowd,
        "max_capacity": total_max,
        "active_staff": len(gates) * 10,  # Estimate
        "open_gates": open_gates,
        "total_gates": len(gates),
        "incidents_today": len([a for a in alerts if a.get("type") == "emergency"]),
        "alerts_count": len(alerts)
    }

@api_router.get("/dashboard/departments")
async def get_departments():
    """Get all departments statistics from database"""
    plazas = await db.plazas.find({}, {"_id": 0}).to_list(50)
    gates = await db.gates.find({}, {"_id": 0}).to_list(200)
    mataf = await db.mataf.find({}, {"_id": 0}).to_list(10)
    
    # Calculate stats per department
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
        {
            "id": "planning",
            "name": "إدارة تخطيط خدمات الحشود",
            "name_en": "Crowd Planning",
            "icon": "ClipboardList",
            "current_crowd": plazas_crowd // 4,
            "max_capacity": plazas_max // 4,
            "percentage": round((plazas_crowd / plazas_max) * 100, 1) if plazas_max else 0,
            "status": get_status((plazas_crowd / plazas_max) * 100 if plazas_max else 0),
            "active_staff": len(gates) * 3,
            "incidents_today": 0
        },
        {
            "id": "plazas",
            "name": "إدارة الساحات",
            "name_en": "Plazas Management",
            "icon": "LayoutGrid",
            "current_crowd": plazas_crowd,
            "max_capacity": plazas_max,
            "percentage": round((plazas_crowd / plazas_max) * 100, 1) if plazas_max else 0,
            "status": get_status((plazas_crowd / plazas_max) * 100 if plazas_max else 0),
            "active_staff": len(plazas) * 20,
            "incidents_today": 0
        },
        {
            "id": "gates",
            "name": "إدارة الأبواب",
            "name_en": "Gates Management",
            "icon": "DoorOpen",
            "current_crowd": gates_flow,
            "max_capacity": gates_max,
            "percentage": round((gates_flow / gates_max) * 100, 1) if gates_max else 0,
            "status": get_status((gates_flow / gates_max) * 100 if gates_max else 0),
            "active_staff": len(gates) * 5,
            "incidents_today": 0
        },
        {
            "id": "crowd_services",
            "name": "إدارة خدمات حشود الحرم",
            "name_en": "Haram Crowd Services",
            "icon": "Users",
            "current_crowd": plazas_crowd + mataf_crowd,
            "max_capacity": plazas_max + mataf_max,
            "percentage": round(((plazas_crowd + mataf_crowd) / (plazas_max + mataf_max)) * 100, 1) if (plazas_max + mataf_max) else 0,
            "status": get_status(((plazas_crowd + mataf_crowd) / (plazas_max + mataf_max)) * 100 if (plazas_max + mataf_max) else 0),
            "active_staff": 150,
            "incidents_today": 0
        },
        {
            "id": "mataf",
            "name": "إدارة صحن المطاف",
            "name_en": "Mataf Management",
            "icon": "Circle",
            "current_crowd": mataf_crowd,
            "max_capacity": mataf_max,
            "percentage": round((mataf_crowd / mataf_max) * 100, 1) if mataf_max else 0,
            "status": get_status((mataf_crowd / mataf_max) * 100 if mataf_max else 0),
            "active_staff": len(mataf) * 50,
            "incidents_today": 0
        }
    ]

@api_router.get("/dashboard/crowd-hourly")
async def get_hourly_crowd():
    """Get hourly crowd data - placeholder for real data"""
    hours = []
    for hour in range(24):
        hours.append({
            "hour": f"{hour:02d}:00",
            "count": 0,
            "percentage": 0
        })
    return hours

@api_router.get("/gates")
async def get_gates(status: Optional[str] = None):
    """Get all gates from database"""
    query = {}
    if status:
        query["status"] = status
    gates = await db.gates.find(query, {"_id": 0}).to_list(200)
    
    # Calculate percentage for each gate
    for gate in gates:
        max_flow = gate.get("max_flow", 1)
        current_flow = gate.get("current_flow", 0)
        gate["percentage"] = round((current_flow / max_flow) * 100, 1) if max_flow else 0
    
    return gates

@api_router.get("/gates/stats")
async def get_gates_stats():
    """Get gates summary statistics"""
    gates = await db.gates.find({}, {"_id": 0}).to_list(200)
    return {
        "total": len(gates),
        "open": len([g for g in gates if g.get("status") == "open"]),
        "closed": len([g for g in gates if g.get("status") == "closed"]),
        "maintenance": len([g for g in gates if g.get("status") == "maintenance"]),
        "total_flow": sum(g.get("current_flow", 0) for g in gates),
        "entry_gates": len([g for g in gates if g.get("direction") in ["entry", "both"]]),
        "exit_gates": len([g for g in gates if g.get("direction") in ["exit", "both"]])
    }

@api_router.get("/plazas")
async def get_plazas():
    """Get all plazas from database"""
    plazas = await db.plazas.find({}, {"_id": 0}).to_list(50)
    
    for plaza in plazas:
        max_cap = plaza.get("max_capacity", 1)
        current = plaza.get("current_crowd", 0)
        pct = (current / max_cap) * 100 if max_cap else 0
        plaza["percentage"] = round(pct, 1)
        plaza["status"] = "normal" if pct < 70 else ("warning" if pct < 85 else "critical")
    
    return plazas

@api_router.get("/plazas/stats")
async def get_plazas_stats():
    """Get plazas summary statistics"""
    plazas = await db.plazas.find({}, {"_id": 0}).to_list(50)
    total_current = sum(p.get("current_crowd", 0) for p in plazas)
    total_max = sum(p.get("max_capacity", 0) for p in plazas) or 1
    overall_pct = (total_current / total_max) * 100
    
    return {
        "total_plazas": len(plazas),
        "current_crowd": total_current,
        "max_capacity": total_max,
        "overall_percentage": round(overall_pct, 1),
        "normal": len([p for p in plazas if (p.get("current_crowd", 0) / (p.get("max_capacity", 1) or 1)) * 100 < 70]),
        "warning": len([p for p in plazas if 70 <= (p.get("current_crowd", 0) / (p.get("max_capacity", 1) or 1)) * 100 < 85]),
        "critical": len([p for p in plazas if (p.get("current_crowd", 0) / (p.get("max_capacity", 1) or 1)) * 100 >= 85])
    }

@api_router.get("/mataf")
async def get_mataf():
    """Get Mataf levels from database"""
    mataf = await db.mataf.find({}, {"_id": 0}).to_list(10)
    
    for level in mataf:
        max_cap = level.get("max_capacity", 1)
        current = level.get("current_crowd", 0)
        pct = (current / max_cap) * 100 if max_cap else 0
        level["percentage"] = round(pct, 1)
        level["status"] = "normal" if pct < 70 else ("warning" if pct < 85 else "critical")
    
    return mataf

@api_router.get("/mataf/stats")
async def get_mataf_stats():
    """Get Mataf summary statistics"""
    mataf = await db.mataf.find({}, {"_id": 0}).to_list(10)
    total_current = sum(m.get("current_crowd", 0) for m in mataf)
    total_max = sum(m.get("max_capacity", 0) for m in mataf) or 1
    avg_time = sum(m.get("average_tawaf_time", 45) for m in mataf) // max(len(mataf), 1)
    
    return {
        "total_levels": len(mataf),
        "current_crowd": total_current,
        "max_capacity": total_max,
        "overall_percentage": round((total_current / total_max) * 100, 1),
        "average_tawaf_time": avg_time,
        "status_summary": {
            "normal": len([m for m in mataf if (m.get("current_crowd", 0) / (m.get("max_capacity", 1) or 1)) * 100 < 70]),
            "warning": len([m for m in mataf if 70 <= (m.get("current_crowd", 0) / (m.get("max_capacity", 1) or 1)) * 100 < 85]),
            "critical": len([m for m in mataf if (m.get("current_crowd", 0) / (m.get("max_capacity", 1) or 1)) * 100 >= 85])
        }
    }

@api_router.get("/alerts")
async def get_alerts(department: Optional[str] = None, type: Optional[str] = None):
    """Get all alerts from database"""
    query = {}
    if department:
        query["department"] = department
    if type:
        query["type"] = type
    
    alerts = await db.alerts.find(query, {"_id": 0}).sort("timestamp", -1).to_list(100)
    return alerts

@api_router.get("/notifications")
async def get_notifications(unread_only: bool = False):
    """Get all notifications"""
    query = {}
    if unread_only:
        query["is_read"] = False
    
    notifications = await db.alerts.find(query, {"_id": 0}).sort("timestamp", -1).to_list(100)
    return notifications

@api_router.get("/reports")
async def get_reports(type: Optional[str] = None, department: Optional[str] = None):
    """Get available reports"""
    reports = [
        {"id": str(uuid.uuid4()), "title": "التقرير اليومي للحشود", "type": "daily", "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "department": "all", "summary": "تقرير شامل"},
        {"id": str(uuid.uuid4()), "title": "تقرير الأبواب", "type": "daily", "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "department": "gates", "summary": "حالة الأبواب"},
        {"id": str(uuid.uuid4()), "title": "تقرير صحن المطاف", "type": "daily", "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "department": "mataf", "summary": "حركة الطواف"},
        {"id": str(uuid.uuid4()), "title": "تقرير الساحات", "type": "daily", "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "department": "plazas", "summary": "حالة الساحات"},
    ]
    
    if type:
        reports = [r for r in reports if r["type"] == type]
    if department:
        reports = [r for r in reports if r["department"] == department]
    return reports

@api_router.get("/planning/stats")
async def get_planning_stats():
    return {
        "active_plans": 5,
        "pending_approvals": 2,
        "completed_today": 10,
        "scheduled_events": 3,
        "resource_utilization": 75,
        "staff_deployed": 200
    }

@api_router.get("/crowd-services/stats")
async def get_crowd_services_stats():
    return {
        "service_requests_today": 50,
        "resolved_requests": 45,
        "pending_requests": 5,
        "average_response_time": 8,
        "satisfaction_rate": 95,
        "active_teams": 25
    }

# Legacy endpoints
@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
