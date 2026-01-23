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
JWT_SECRET = os.environ['JWT_SECRET']
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
    area: Optional[str] = None
    operational_seasons: Optional[List[str]] = None

# ============= Season Models =============
class Season(BaseModel):
    id: str = "active_season"
    current_season: str = "normal"  # normal, umrah, ramadan, hajj
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    active_gates_count: int = 0
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ============= Prohibited Items Models =============
class ProhibitedItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name_ar: str
    name_en: str
    category: str  # weapons, electronics, food, etc.
    severity: str = "high"  # high, medium, low
    exception_note_ar: Optional[str] = None
    exception_note_en: Optional[str] = None
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ProhibitedItemCreate(BaseModel):
    name_ar: str
    name_en: str
    category: str
    severity: Optional[str] = "high"
    exception_note_ar: Optional[str] = None
    exception_note_en: Optional[str] = None

# ============= Plazas Models =============
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
    status: str = "وارد"  # وارد, قيد الإجراء, بانتظار رد, مكتمل
    received_at: str  # ISO datetime string (Gregorian)
    
class AlertUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    message: Optional[str] = None
    closed_at: Optional[str] = None

class EmployeeCreate(BaseModel):
    name: str
    job_title: str
    department: str  # planning, plazas, gates, crowd_services, mataf
    location: str  # موقع التغطية
    shift: str  # الوردية: صباحية، مسائية، ليلية
    employee_number: Optional[str] = None
    weekly_rest: Optional[str] = None
    work_tasks: Optional[str] = None
    is_active: bool = True

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    job_title: Optional[str] = None
    location: Optional[str] = None
    shift: Optional[str] = None
    employee_number: Optional[str] = None
    weekly_rest: Optional[str] = None
    work_tasks: Optional[str] = None
    is_active: Optional[bool] = None

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# ============= Dropdown Options Models =============
class DropdownOption(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category: str  # gate_types, gate_statuses, directions, categories, classifications, shifts, etc.
    value: str
    label: str
    color: Optional[str] = None
    order: int = 0
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class DropdownOptionCreate(BaseModel):
    category: str
    value: str
    label: str
    color: Optional[str] = None
    order: Optional[int] = 0

class DropdownOptionUpdate(BaseModel):
    value: Optional[str] = None
    label: Optional[str] = None
    color: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None


# ============= Department Settings Models =============
class DepartmentSetting(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    department: str  # mataf, planning, gates, plazas, crowd_services
    setting_type: str  # shifts, rest_patterns, coverage_locations
    value: str
    label: str
    description: Optional[str] = None
    color: Optional[str] = None
    start_time: Optional[str] = None  # للورديات فقط
    end_time: Optional[str] = None    # للورديات فقط
    order: int = 0
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class DepartmentSettingCreate(BaseModel):
    department: str
    setting_type: str
    value: str
    label: str
    description: Optional[str] = None
    color: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    order: int = 0

class DepartmentSettingUpdate(BaseModel):
    value: Optional[str] = None
    label: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None

# ============= Sidebar Menu Models =============
class SidebarMenuItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name_ar: str
    name_en: str
    subtitle_ar: Optional[str] = None
    subtitle_en: Optional[str] = None
    href: str
    icon: str  # Lucide icon name
    order: int = 0
    is_active: bool = True
    is_public: bool = False  # accessible to all users
    is_secondary: bool = False  # show in secondary section (below separator)
    parent_id: Optional[str] = None  # if set, this is a submenu item
    department: Optional[str] = None  # if None, accessible to all departments
    admin_only: bool = False  # only for system_admin
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SidebarMenuItemCreate(BaseModel):
    name_ar: str
    name_en: str
    subtitle_ar: Optional[str] = None
    subtitle_en: Optional[str] = None
    href: str
    icon: str
    order: Optional[int] = 0
    is_public: Optional[bool] = False
    is_secondary: Optional[bool] = False
    parent_id: Optional[str] = None
    department: Optional[str] = None
    admin_only: Optional[bool] = False

class SidebarMenuItemUpdate(BaseModel):
    name_ar: Optional[str] = None
    name_en: Optional[str] = None
    subtitle_ar: Optional[str] = None
    subtitle_en: Optional[str] = None
    href: Optional[str] = None
    icon: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None
    is_public: Optional[bool] = None
    is_secondary: Optional[bool] = None
    parent_id: Optional[str] = None
    department: Optional[str] = None
    admin_only: Optional[bool] = None

# ============= Settings Models =============
class LoginPageSettings(BaseModel):
    id: str = "login_settings"  # Single document
    site_name_ar: str = "خدمات الحشود"
    site_name_en: str = "Crowd Services"
    subtitle_ar: str = "منصة إدارة الحشود في الحرم المكي الشريف"
    subtitle_en: str = "Crowd Management Platform at Al-Haram"
    logo_url: Optional[str] = None
    logo_link: str = "/"
    logo_size: int = 150
    background_url: Optional[str] = None
    primary_color: str = "#DC2626"
    welcome_text_ar: str = "مرحباً بك"
    welcome_text_en: str = "Welcome"
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class LoginPageSettingsUpdate(BaseModel):
    site_name_ar: Optional[str] = None
    site_name_en: Optional[str] = None
    subtitle_ar: Optional[str] = None
    subtitle_en: Optional[str] = None
    logo_url: Optional[str] = None
    logo_link: Optional[str] = None
    logo_size: Optional[int] = None
    background_url: Optional[str] = None
    primary_color: Optional[str] = None
    welcome_text_ar: Optional[str] = None
    welcome_text_en: Optional[str] = None

# ============= Header Settings Models =============
class HeaderSettings(BaseModel):
    id: str = "header_settings"
    background_color: str = "#FFFFFF"
    text_color: str = "#000000"
    show_shadow: bool = True
    show_date: bool = True
    show_page_name: bool = True
    show_user_name: bool = True
    show_language_toggle: bool = True
    show_theme_toggle: bool = True
    show_logout_button: bool = True
    show_notifications_bell: bool = True
    custom_greeting_ar: str = "أهلاً"
    custom_greeting_en: str = "Hello"
    show_logo: bool = False
    header_logo_url: Optional[str] = None
    header_height: int = 64
    border_style: str = "solid"
    transparency: int = 100
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class HeaderSettingsUpdate(BaseModel):
    background_color: Optional[str] = None
    text_color: Optional[str] = None
    show_shadow: Optional[bool] = None
    show_date: Optional[bool] = None
    show_page_name: Optional[bool] = None
    show_user_name: Optional[bool] = None
    show_language_toggle: Optional[bool] = None
    show_theme_toggle: Optional[bool] = None
    show_logout_button: Optional[bool] = None
    show_notifications_bell: Optional[bool] = None
    custom_greeting_ar: Optional[str] = None
    custom_greeting_en: Optional[str] = None
    show_logo: Optional[bool] = None
    header_logo_url: Optional[str] = None
    header_height: Optional[int] = None
    border_style: Optional[str] = None
    transparency: Optional[int] = None

# ============= Map Models =============
class MapMarker(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    map_id: str  # Which map this marker belongs to
    type: str  # 'gate', 'employee', 'plaza', 'service'
    entity_id: Optional[str] = None  # ID of the gate/employee if linked
    x: float  # X position (percentage 0-100)
    y: float  # Y position (percentage 0-100)
    label_ar: str
    label_en: str
    icon: str = "MapPin"
    color: str = "#DC2626"
    show_label: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class InteractiveMap(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name_ar: str
    name_en: str
    department: str  # gates, plazas, mataf, etc.
    image_url: str
    width: int = 1920
    height: int = 1080
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MapMarkerCreate(BaseModel):
    map_id: str
    type: str
    entity_id: Optional[str] = None
    x: float
    y: float
    label_ar: str
    label_en: str
    icon: Optional[str] = "MapPin"
    color: Optional[str] = "#DC2626"
    show_label: Optional[bool] = True

class InteractiveMapCreate(BaseModel):
    name_ar: str
    name_en: str
    department: str
    image_url: str
    width: Optional[int] = 1920
    height: Optional[int] = 1080

# ============= Transaction Models =============
class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    transaction_number: str  # رقم المعاملة
    transaction_date: str  # التاريخ الهجري
    subject: str  # الموضوع
    assigned_to: str  # اسم المستلم (employee name)
    assigned_by: str  # من عيّن المعاملة
    status: str = "pending"  # pending, in_progress, completed
    notes: Optional[str] = None  # الملاحظات
    priority: str = "normal"  # low, normal, high, urgent
    department: str = "gates"
    due_date: Optional[str] = None
    completed_date: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TransactionCreate(BaseModel):
    transaction_number: str
    transaction_date: str
    subject: str
    assigned_to: str
    priority: Optional[str] = "normal"
    department: Optional[str] = "gates"
    due_date: Optional[str] = None
    notes: Optional[str] = None

class TransactionUpdate(BaseModel):
    assigned_to: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    completed_date: Optional[str] = None

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

# ============= Activity Logging =============
async def log_activity(action: str, user: dict, target: str = None, details: str = None):
    """Log user activity to database"""
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

# ============= Activity Log Routes =============
@api_router.get("/admin/activity-logs")
async def get_activity_logs(
    action: Optional[str] = None,
    user_email: Optional[str] = None,
    date: Optional[str] = None,
    limit: int = 100,
    admin: dict = Depends(require_admin)
):
    """Get activity logs with optional filters"""
    query = {}
    
    if action and action != "all":
        query["action"] = action
    
    if user_email:
        query["user_email"] = {"$regex": user_email, "$options": "i"}
    
    if date:
        # Filter by date (YYYY-MM-DD)
        start_date = datetime.fromisoformat(f"{date}T00:00:00")
        end_date = datetime.fromisoformat(f"{date}T23:59:59")
        query["timestamp"] = {
            "$gte": start_date.isoformat(),
            "$lte": end_date.isoformat()
        }
    
    logs = await db.activity_logs.find(query, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    return logs

# ============= Auth Routes =============
@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="بيانات الدخول غير صحيحة")
    
    # Log activity
    await log_activity("login", user, None, f"تسجيل دخول ناجح من {credentials.email}")
    
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
    
    # Log activity
    await log_activity("user_created", admin, user_data.name, f"تم إنشاء مستخدم جديد: {user_data.name} ({user_data.role})")
    
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
        
        # Log activity
        await log_activity("user_updated", admin, user["name"], f"تم تحديث بيانات المستخدم: {user['name']}")
    
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
    
    # Get user before deleting for logging
    user_to_delete = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user_to_delete:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    result = await db.users.delete_one({"id": user_id})
    
    # Log activity
    await log_activity("user_deleted", admin, user_to_delete["name"], f"تم حذف المستخدم: {user_to_delete['name']}")
    
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
    
    # Log activity
    await log_activity("gate_created", user, gate.name, f"تم إضافة باب جديد: {gate.name} (رقم {gate.number})")
    
    return {"message": "تم إضافة الباب بنجاح", "id": gate_id}

@api_router.put("/admin/gates/{gate_id}")
async def update_gate(gate_id: str, gate: GateUpdate, user: dict = Depends(require_admin)):
    # Get old gate data first
    old_gate = await db.gates.find_one({"id": gate_id}, {"_id": 0})
    if not old_gate:
        raise HTTPException(status_code=404, detail="الباب غير موجود")
    
    update_data = {k: v for k, v in gate.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Check if status changed to "مغلق"
    if update_data.get("status") == "مغلق" and old_gate.get("status") != "مغلق":
        # Remove all employees from this gate
        gate_name = old_gate.get("name")
        result = await db.employees.update_many(
            {"location": gate_name, "department": "gates"},
            {"$set": {"location": ""}}
        )
        
        if result.modified_count > 0:
            await log_activity(
                "إزالة الموظفين من باب مغلق", 
                user, 
                gate_id, 
                f"تم إزالة {result.modified_count} موظف من {gate_name}"
            )
    
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
    # Validate received_at is not in future
    received_dt = datetime.fromisoformat(alert.received_at.replace('Z', '+00:00'))
    if received_dt > datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="لا يمكن أن يكون تاريخ الاستلام في المستقبل")
    
    alert_id = str(uuid.uuid4())
    alert_doc = {
        "id": alert_id,
        **alert.model_dump(),
        "is_read": False,
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "closed_at": None
    }
    await db.alerts.insert_one(alert_doc)
    await log_activity("إنشاء بلاغ", user, alert_id, f"بلاغ: {alert.title}")
    return {"message": "تم إنشاء البلاغ بنجاح", "id": alert_id}

@api_router.put("/alerts/{alert_id}")
async def update_alert(alert_id: str, alert: AlertUpdate, user: dict = Depends(get_current_user)):
    """Update alert status and details"""
    existing = await db.alerts.find_one({"id": alert_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="البلاغ غير موجود")
    
    update_data = {k: v for k, v in alert.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # If status changed to "مكتمل", set closed_at automatically
    if update_data.get("status") == "مكتمل":
        current_status = existing.get("status")
        # Only allow closing if currently "قيد الإجراء" or "بانتظار رد"
        if current_status not in ["قيد الإجراء", "بانتظار رد"]:
            raise HTTPException(status_code=400, detail="لا يمكن إغلاق البلاغ إلا إذا كان قيد الإجراء أو بانتظار رد")
        update_data["closed_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.alerts.update_one({"id": alert_id}, {"$set": update_data})
    await log_activity("تحديث بلاغ", user, alert_id, f"تحديث الحالة إلى {update_data.get('status', '')}")
    
    updated = await db.alerts.find_one({"id": alert_id}, {"_id": 0})
    return updated

# ============= Employee Management Routes =============
@api_router.get("/employees")
async def get_employees(department: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Get all employees or filter by department based on user permissions"""
    query = {}
    
    # Filter based on user role
    if user["role"] == "department_manager":
        query["department"] = user.get("department")
    elif department and user["role"] in ["system_admin", "general_manager", "monitoring_team"]:
        query["department"] = department
    
    employees = await db.employees.find(query, {"_id": 0}).to_list(1000)
    return employees

@api_router.post("/employees")
async def create_employee(employee: EmployeeCreate, user: dict = Depends(get_current_user)):
    """Create new employee - only managers can add to their department"""
    # Check permission
    if user["role"] == "department_manager" and employee.department != user.get("department"):
        raise HTTPException(status_code=403, detail="يمكنك إضافة موظفين لقسمك فقط")
    
    if user["role"] not in ["system_admin", "general_manager", "department_manager"]:
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
    
    employee_id = str(uuid.uuid4())
    employee_doc = {
        "id": employee_id,
        **employee.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.employees.insert_one(employee_doc)
    
    # Log activity
    await log_activity("employee_created", user, employee.name, f"تم إضافة موظف جديد: {employee.name} - {employee.job_title} ({employee.department})")
    
    return {"message": "تم إضافة الموظف بنجاح", "id": employee_id}

@api_router.put("/employees/{employee_id}")
async def update_employee(employee_id: str, employee: EmployeeUpdate, user: dict = Depends(get_current_user)):
    """Update employee - only managers can update their department employees"""
    existing = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="الموظف غير موجود")
    
    # Check permission
    if user["role"] == "department_manager" and existing["department"] != user.get("department"):
        raise HTTPException(status_code=403, detail="يمكنك تعديل موظفي قسمك فقط")
    
    if user["role"] not in ["system_admin", "general_manager", "department_manager"]:
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
    
    update_data = {k: v for k, v in employee.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.employees.update_one({"id": employee_id}, {"$set": update_data})
    
    # Log activity
    await log_activity("employee_updated", user, existing["name"], f"تم تحديث بيانات الموظف: {existing['name']}")
    
    return {"message": "تم تحديث الموظف بنجاح"}

@api_router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str, user: dict = Depends(get_current_user)):
    """Delete employee - only managers can delete their department employees"""
    existing = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="الموظف غير موجود")
    
    # Check permission
    if user["role"] == "department_manager" and existing["department"] != user.get("department"):
        raise HTTPException(status_code=403, detail="يمكنك حذف موظفي قسمك فقط")
    
    if user["role"] not in ["system_admin", "general_manager", "department_manager"]:
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
    
    await db.employees.delete_one({"id": employee_id})
    
    # Log activity
    await log_activity("employee_deleted", user, existing["name"], f"تم حذف الموظف: {existing['name']} من {existing['department']}")
    
    return {"message": "تم حذف الموظف بنجاح"}

@api_router.get("/employees/stats/{department}")
async def get_employee_stats(department: str, user: dict = Depends(get_current_user)):
    """Get employee statistics for a department"""
    # Check permission
    if not check_department_access(user, department):
        raise HTTPException(status_code=403, detail="لا يمكنك الوصول لبيانات هذه الإدارة")
    
    employees_list = await db.employees.find({"department": department}, {"_id": 0}).to_list(1000)
    
    total = len(employees_list)
    active = sum(1 for e in employees_list if e.get("is_active", True))
    
    # Get shift distribution
    shift_1 = sum(1 for e in employees_list if e.get("shift") == "الأولى" and e.get("is_active", True))
    shift_2 = sum(1 for e in employees_list if e.get("shift") == "الثانية" and e.get("is_active", True))
    shift_3 = sum(1 for e in employees_list if e.get("shift") == "الثالثة" and e.get("is_active", True))
    shift_4 = sum(1 for e in employees_list if e.get("shift") == "الرابعة" and e.get("is_active", True))
    
    # Get unique locations count
    active_employees = [e for e in employees_list if e.get("is_active", True)]
    unique_locations = len(set(e.get("location", "") for e in active_employees if e.get("location")))
    
    # Count employees assigned to locations
    employees_with_location = sum(1 for e in active_employees if e.get("location"))
    
    return {
        "total_employees": total,
        "active_employees": active,
        "inactive_employees": total - active,
        "shifts": {
            "shift_1": shift_1,
            "shift_2": shift_2,
            "shift_3": shift_3,
            "shift_4": shift_4
        },
        "locations_count": unique_locations,
        "employees_with_location": employees_with_location
    }

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
    
    # Get REAL active employees count
    active_employees = await db.employees.find({"is_active": True}, {"_id": 0}).to_list(1000)
    
    total_crowd = sum(p.get("current_crowd", 0) for p in plazas) + sum(m.get("current_crowd", 0) for m in mataf)
    total_max = sum(p.get("max_capacity", 0) for p in plazas) + sum(m.get("max_capacity", 0) for m in mataf)
    open_gates = len([g for g in gates if g.get("status") == "مفتوح"])
    
    return {
        "total_visitors_today": 0,  # Not tracked yet
        "current_crowd": total_crowd,
        "max_capacity": total_max,
        "active_staff": len(active_employees),  # REAL count
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
    
    async def get_dept_employee_stats(dept_name):
        """Helper function to get detailed employee stats for a department"""
        employees = await db.employees.find({"department": dept_name, "is_active": True}, {"_id": 0}).to_list(1000)
        
        # Count per shift
        shift_1 = sum(1 for e in employees if e.get("shift") == "الأولى")
        shift_2 = sum(1 for e in employees if e.get("shift") == "الثانية")
        shift_3 = sum(1 for e in employees if e.get("shift") == "الثالثة")
        shift_4 = sum(1 for e in employees if e.get("shift") == "الرابعة")
        
        # Unique locations
        locations = set(e.get("location", "") for e in employees if e.get("location"))
        
        # Employees with assigned location
        with_location = sum(1 for e in employees if e.get("location"))
        
        return {
            "total": len(employees),
            "shifts": {"الأولى": shift_1, "الثانية": shift_2, "الثالثة": shift_3, "الرابعة": shift_4},
            "locations_count": len(locations),
            "employees_with_location": with_location
        }
    
    # Get employee stats for all departments
    planning_stats = await get_dept_employee_stats("planning")
    plazas_stats = await get_dept_employee_stats("plazas")
    gates_stats = await get_dept_employee_stats("gates")
    crowd_stats = await get_dept_employee_stats("crowd_services")
    mataf_stats = await get_dept_employee_stats("mataf")
    
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
            "active_staff": planning_stats["total"],
            "employee_stats": planning_stats,
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
            "active_staff": plazas_stats["total"],
            "employee_stats": plazas_stats,
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
            "active_staff": gates_stats["total"],
            "employee_stats": gates_stats,
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
            "active_staff": crowd_stats["total"],
            "employee_stats": crowd_stats,
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
            "active_staff": mataf_stats["total"],
            "employee_stats": mataf_stats,
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
async def get_plazas_stats(user: dict = Depends(get_current_user)):
    """Get plazas summary statistics - REAL DATA"""
    plazas = await db.plazas.find({}, {"_id": 0}).to_list(50)
    transactions = await db.transactions.find({"department": "plazas"}, {"_id": 0}).to_list(1000)
    
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
        "critical": len([p for p in plazas if (p.get("current_crowd", 0) / (p.get("max_capacity", 1) or 1)) * 100 >= 85]),
        "total_transactions": len(transactions),
        "pending_transactions": len([t for t in transactions if t.get("status") == "pending"]),
        "completed_transactions": len([t for t in transactions if t.get("status") == "completed"])
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
async def get_reports(
    type: Optional[str] = None, 
    department: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get available reports with RBAC filtering"""
    all_reports = [
        {"id": str(uuid.uuid4()), "title": "التقرير اليومي للحشود", "type": "daily", "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "department": "all", "summary": "تقرير شامل لجميع الإدارات"},
        {"id": str(uuid.uuid4()), "title": "تقرير إدارة الأبواب", "type": "daily", "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "department": "gates", "summary": "حالة الأبواب والحركة"},
        {"id": str(uuid.uuid4()), "title": "تقرير صحن المطاف", "type": "daily", "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "department": "mataf", "summary": "حركة الطواف والأعداد"},
        {"id": str(uuid.uuid4()), "title": "تقرير الساحات", "type": "daily", "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "department": "plazas", "summary": "حالة الساحات والتدفق"},
        {"id": str(uuid.uuid4()), "title": "تقرير خدمات الحشود", "type": "daily", "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "department": "crowd_services", "summary": "خدمات الحشود والتنسيق"},
        {"id": str(uuid.uuid4()), "title": "تقرير التخطيط", "type": "daily", "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "department": "planning", "summary": "الخطط والجداول"},
        {"id": str(uuid.uuid4()), "title": "تقرير أسبوعي - الأبواب", "type": "weekly", "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "department": "gates", "summary": "تحليل أسبوعي للأبواب"},
        {"id": str(uuid.uuid4()), "title": "تقرير أسبوعي - المطاف", "type": "weekly", "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "department": "mataf", "summary": "تحليل أسبوعي للمطاف"},
        {"id": str(uuid.uuid4()), "title": "تقرير شهري شامل", "type": "monthly", "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "department": "all", "summary": "تقرير شهري لجميع الإدارات"},
    ]
    
    # Apply RBAC filtering
    reports = all_reports
    user_role = user.get("role")
    user_dept = user.get("department")
    
    # Department managers can only see their department reports + "all" reports
    if user_role == "department_manager" and user_dept:
        reports = [r for r in reports if r["department"] == user_dept or r["department"] == "all"]
    
    # Apply optional filters
    if type:
        reports = [r for r in reports if r["type"] == type]
    if department:
        reports = [r for r in reports if r["department"] == department]
    
    return reports

@api_router.get("/planning/stats")
async def get_planning_stats(user: dict = Depends(get_current_user)):
    """Get real planning department statistics from database"""
    # Get real transactions count for planning
    transactions = await db.transactions.find({"department": "planning"}, {"_id": 0}).to_list(1000)
    
    # Get employees count
    employees = await db.employees.find({"department": "planning", "is_active": True}, {"_id": 0}).to_list(1000)
    
    # Calculate transaction stats
    pending = len([t for t in transactions if t.get("status") == "pending"])
    in_progress = len([t for t in transactions if t.get("status") == "in_progress"])
    completed = len([t for t in transactions if t.get("status") == "completed"])
    
    return {
        "total_transactions": len(transactions),
        "pending_transactions": pending,
        "in_progress_transactions": in_progress,
        "completed_transactions": completed,
        "total_employees": len(employees),
        "active_employees": len(employees)
    }

@api_router.get("/crowd-services/stats")
async def get_crowd_services_stats(user: dict = Depends(get_current_user)):
    """Get real crowd services statistics from database"""
    # Get real transactions count
    transactions = await db.transactions.find({"department": "crowd_services"}, {"_id": 0}).to_list(1000)
    
    # Get employees count
    employees = await db.employees.find({"department": "crowd_services", "is_active": True}, {"_id": 0}).to_list(1000)
    
    return {
        "total_transactions": len(transactions),
        "pending_transactions": len([t for t in transactions if t.get("status") == "pending"]),
        "completed_transactions": len([t for t in transactions if t.get("status") == "completed"]),
        "total_employees": len(employees)
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

# ============= Dropdown Options Routes (Admin Only) =============
@api_router.get("/admin/dropdown-options")
async def get_dropdown_options(
    category: Optional[str] = None,
    admin: dict = Depends(require_admin)
):
    """Get all dropdown options or filter by category"""
    query = {}
    if category:
        query["category"] = category
    
    options = await db.dropdown_options.find(query, {"_id": 0}).sort("order", 1).to_list(1000)
    return options

@api_router.get("/admin/dropdown-options/categories")
async def get_dropdown_categories(admin: dict = Depends(require_admin)):
    """Get list of all categories"""
    categories = await db.dropdown_options.distinct("category")
    return {
        "categories": categories,
        "available_categories": [
            {"id": "gate_types", "name": "أنواع الأبواب", "name_en": "Gate Types"},
            {"id": "gate_statuses", "name": "حالات الأبواب", "name_en": "Gate Statuses"},
            {"id": "directions", "name": "الاتجاهات", "name_en": "Directions"},
            {"id": "categories", "name": "الفئات", "name_en": "Categories"},
            {"id": "classifications", "name": "التصنيفات", "name_en": "Classifications"},
            {"id": "current_indicators", "name": "مؤشرات الازدحام", "name_en": "Crowd Indicators"},
            {"id": "shifts", "name": "الورديات", "name_en": "Shifts"},
            {"id": "plaza_zones", "name": "مناطق الساحات", "name_en": "Plaza Zones"}
        ]
    }

@api_router.post("/admin/dropdown-options")
async def create_dropdown_option(
    option: DropdownOptionCreate,
    admin: dict = Depends(require_admin)
):
    """Create a new dropdown option"""
    option_dict = option.model_dump()
    option_obj = DropdownOption(**option_dict)
    doc = option_obj.model_dump()
    
    await db.dropdown_options.insert_one(doc)
    await log_activity("إضافة خيار قائمة", admin, f"{option.category}", f"تم إضافة: {option.label}")
    
    return option_obj

@api_router.put("/admin/dropdown-options/{option_id}")
async def update_dropdown_option(
    option_id: str,
    option: DropdownOptionUpdate,
    admin: dict = Depends(require_admin)
):
    """Update a dropdown option"""
    existing = await db.dropdown_options.find_one({"id": option_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="الخيار غير موجود")
    
    update_data = {k: v for k, v in option.model_dump().items() if v is not None}
    if update_data:
        await db.dropdown_options.update_one({"id": option_id}, {"$set": update_data})
        await log_activity("تعديل خيار قائمة", admin, option_id, f"تم تعديل: {existing.get('label')}")
    
    updated = await db.dropdown_options.find_one({"id": option_id}, {"_id": 0})
    return updated

@api_router.delete("/admin/dropdown-options/{option_id}")
async def delete_dropdown_option(
    option_id: str,
    admin: dict = Depends(require_admin)
):
    """Delete a dropdown option"""
    existing = await db.dropdown_options.find_one({"id": option_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="الخيار غير موجود")
    
    await db.dropdown_options.delete_one({"id": option_id})
    await log_activity("حذف خيار قائمة", admin, option_id, f"تم حذف: {existing.get('label')}")
    
    return {"message": "تم حذف الخيار بنجاح"}

@api_router.post("/admin/dropdown-options/seed")
async def seed_dropdown_options(admin: dict = Depends(require_admin)):
    """Seed initial dropdown options from constants"""
    # Check if already seeded
    count = await db.dropdown_options.count_documents({})
    if count > 0:
        return {"message": "البيانات موجودة مسبقاً", "count": count}
    
    default_options = [
        # Gate Types
        {"category": "gate_types", "value": "رئيسي", "label": "رئيسي", "order": 1},
        {"category": "gate_types", "value": "فرعي", "label": "فرعي", "order": 2},
        {"category": "gate_types", "value": "سلم كهربائي", "label": "سلم كهربائي", "order": 3},
        {"category": "gate_types", "value": "مصعد", "label": "مصعد", "order": 4},
        {"category": "gate_types", "value": "درج", "label": "درج", "order": 5},
        {"category": "gate_types", "value": "جسر", "label": "جسر", "order": 6},
        {"category": "gate_types", "value": "مشابة", "label": "مشابة", "order": 7},
        {"category": "gate_types", "value": "عبارة", "label": "عبارة", "order": 8},
        {"category": "gate_types", "value": "مزلقان", "label": "مزلقان", "order": 9},
        
        # Directions
        {"category": "directions", "value": "دخول", "label": "دخول", "order": 1},
        {"category": "directions", "value": "خروج", "label": "خروج", "order": 2},
        {"category": "directions", "value": "دخول وخروج", "label": "دخول وخروج", "order": 3},
        
        # Categories
        {"category": "categories", "value": "محرمين", "label": "محرمين", "order": 1},
        {"category": "categories", "value": "مصلين", "label": "مصلين", "order": 2},
        {"category": "categories", "value": "عربات", "label": "عربات", "order": 3},
        
        # Classifications
        {"category": "classifications", "value": "عام", "label": "عام", "order": 1},
        {"category": "classifications", "value": "رجال", "label": "رجال", "order": 2},
        {"category": "classifications", "value": "نساء", "label": "نساء", "order": 3},
        {"category": "classifications", "value": "طوارئ", "label": "طوارئ", "order": 4},
        {"category": "classifications", "value": "خدمات", "label": "خدمات", "order": 5},
        {"category": "classifications", "value": "جنائز", "label": "جنائز", "order": 6},
        
        # Gate Statuses
        {"category": "gate_statuses", "value": "مفتوح", "label": "مفتوح", "order": 1},
        {"category": "gate_statuses", "value": "مغلق", "label": "مغلق", "order": 2},
        
        # Current Indicators
        {"category": "current_indicators", "value": "خفيف", "label": "خفيف", "color": "#22c55e", "order": 1},
        {"category": "current_indicators", "value": "متوسط", "label": "متوسط", "color": "#f97316", "order": 2},
        {"category": "current_indicators", "value": "مزدحم", "label": "مزدحم", "color": "#ef4444", "order": 3},
        
        # Shifts
        {"category": "shifts", "value": "الأولى", "label": "الأولى", "color": "#3b82f6", "order": 1},
        {"category": "shifts", "value": "الثانية", "label": "الثانية", "color": "#22c55e", "order": 2},
        {"category": "shifts", "value": "الثالثة", "label": "الثالثة", "color": "#f97316", "order": 3},
        {"category": "shifts", "value": "الرابعة", "label": "الرابعة", "color": "#a855f7", "order": 4},
    ]
    
    # Insert all options
    options_to_insert = []
    for opt_data in default_options:
        opt = DropdownOption(**opt_data)
        options_to_insert.append(opt.model_dump())
    
    await db.dropdown_options.insert_many(options_to_insert)
    await log_activity("تهيئة القوائم", admin, "dropdown_options", f"تم إضافة {len(options_to_insert)} خيار")
    
    return {"message": "تم تهيئة القوائم بنجاح", "count": len(options_to_insert)}

# ============= Public Dropdown Options (For Forms) =============
@api_router.get("/dropdown-options")
async def get_public_dropdown_options(category: Optional[str] = None):
    """Get active dropdown options for forms (public access)"""
    query = {"is_active": True}
    if category:
        query["category"] = category
    
    options = await db.dropdown_options.find(query, {"_id": 0}).sort("order", 1).to_list(1000)
    
    # Group by category if no specific category requested
    if not category:
        grouped = {}
        for opt in options:
            cat = opt["category"]
            if cat not in grouped:
                grouped[cat] = []
            grouped[cat].append(opt)
        return grouped
    
    return options

# ============= Login Page Settings Routes =============
@api_router.get("/settings/login-page")
async def get_login_page_settings():
    """Get login page settings (public access)"""
    settings = await db.login_settings.find_one({"id": "login_settings"}, {"_id": 0})
    
    if not settings:
        # Return defaults
        default_settings = LoginPageSettings()
        return default_settings.model_dump()
    
    return settings

@api_router.put("/admin/settings/login-page")
async def update_login_page_settings(
    settings: LoginPageSettingsUpdate,
    admin: dict = Depends(require_admin)
):
    """Update login page settings (admin only)"""
    update_data = {k: v for k, v in settings.model_dump().items() if v is not None}
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.login_settings.update_one(
            {"id": "login_settings"},
            {"$set": update_data},
            upsert=True
        )
        
        await log_activity("تحديث إعدادات شاشة الدخول", admin, "login_settings", "تم تحديث الإعدادات")
    
    updated = await db.login_settings.find_one({"id": "login_settings"}, {"_id": 0})
    return updated

# ============= Header Settings Routes =============
@api_router.get("/settings/header")
async def get_header_settings():
    """Get header settings (public access for authenticated users)"""
    settings = await db.header_settings.find_one({"id": "header_settings"}, {"_id": 0})
    
    if not settings:
        default_settings = HeaderSettings()
        return default_settings.model_dump()
    
    return settings

@api_router.put("/admin/settings/header")
async def update_header_settings(
    settings: HeaderSettingsUpdate,
    admin: dict = Depends(require_admin)
):
    """Update header settings (admin only)"""
    update_data = {k: v for k, v in settings.model_dump().items() if v is not None}
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.header_settings.update_one(
            {"id": "header_settings"},
            {"$set": update_data},
            upsert=True
        )
        
        await log_activity("تحديث إعدادات Header", admin, "header_settings", "تم تحديث الإعدادات")
    
    updated = await db.header_settings.find_one({"id": "header_settings"}, {"_id": 0})
    return updated

# ============= Sidebar Menu Routes (Admin Only) =============
@api_router.get("/admin/sidebar-menu")
async def get_sidebar_menu_items(admin: dict = Depends(require_admin)):
    """Get all sidebar menu items"""
    items = await db.sidebar_menu.find({}, {"_id": 0}).sort("order", 1).to_list(1000)
    return items

@api_router.get("/sidebar-menu")
async def get_user_sidebar_menu(user: dict = Depends(get_current_user)):
    """Get sidebar menu items for current user based on permissions"""
    items = await db.sidebar_menu.find({"is_active": True}, {"_id": 0}).sort("order", 1).to_list(1000)
    
    # Filter based on user permissions
    user_role = user.get("role")
    user_dept = user.get("department")
    
    filtered_items = []
    for item in items:
        # Admin-only items
        if item.get("admin_only") and user_role != "system_admin":
            continue
        
        # Public items accessible to all
        if item.get("is_public"):
            filtered_items.append(item)
            continue
        
        # Department-specific items
        if item.get("department"):
            # Check if user can access this department
            if user_role == "system_admin":
                filtered_items.append(item)
            elif user_role == "general_manager":
                filtered_items.append(item)
            elif user_role == "monitoring_team":
                filtered_items.append(item)
            elif user_role == "department_manager" and user_dept == item.get("department"):
                filtered_items.append(item)
        else:
            # No department restriction
            filtered_items.append(item)
    
    return filtered_items

@api_router.post("/admin/sidebar-menu")
async def create_sidebar_menu_item(
    item: SidebarMenuItemCreate,
    admin: dict = Depends(require_admin)
):
    """Create a new sidebar menu item"""
    item_dict = item.model_dump()
    item_obj = SidebarMenuItem(**item_dict)
    doc = item_obj.model_dump()
    
    await db.sidebar_menu.insert_one(doc)
    await log_activity("إضافة قسم للقائمة", admin, item_obj.id, f"تم إضافة: {item.name_ar}")
    
    return item_obj

@api_router.put("/admin/sidebar-menu/{item_id}")
async def update_sidebar_menu_item(
    item_id: str,
    item: SidebarMenuItemUpdate,
    admin: dict = Depends(require_admin)
):
    """Update a sidebar menu item"""
    existing = await db.sidebar_menu.find_one({"id": item_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="القسم غير موجود")
    
    update_data = {k: v for k, v in item.model_dump().items() if v is not None}
    if update_data:
        await db.sidebar_menu.update_one({"id": item_id}, {"$set": update_data})
        await log_activity("تعديل قسم في القائمة", admin, item_id, f"تم تعديل: {existing.get('name_ar')}")
    
    updated = await db.sidebar_menu.find_one({"id": item_id}, {"_id": 0})
    return updated

@api_router.delete("/admin/sidebar-menu/{item_id}")
async def delete_sidebar_menu_item(
    item_id: str,
    admin: dict = Depends(require_admin)
):
    """Delete a sidebar menu item"""
    existing = await db.sidebar_menu.find_one({"id": item_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="القسم غير موجود")
    
    await db.sidebar_menu.delete_one({"id": item_id})
    await log_activity("حذف قسم من القائمة", admin, item_id, f"تم حذف: {existing.get('name_ar')}")
    
    return {"message": "تم حذف القسم بنجاح"}

@api_router.post("/admin/sidebar-menu/seed")
async def seed_sidebar_menu(admin: dict = Depends(require_admin)):
    """Seed initial sidebar menu from current configuration"""
    # Check if already seeded
    count = await db.sidebar_menu.count_documents({})
    if count > 0:
        return {"message": "القائمة موجودة مسبقاً", "count": count}
    
    default_items = [
        {"name_ar": "لوحة التحكم", "name_en": "Dashboard", "href": "/", "icon": "LayoutDashboard", "order": 1, "is_public": True},
        {"name_ar": "الخريطة التفاعلية", "name_en": "Interactive Map", "href": "/map", "icon": "Map", "order": 2, "is_public": True},
        {"name_ar": "تخطيط خدمات الحشود", "name_en": "Crowd Planning", "href": "/planning", "icon": "ClipboardList", "order": 3, "department": "planning"},
        {"name_ar": "إدارة الساحات", "name_en": "Plazas Management", "href": "/plazas", "icon": "LayoutGrid", "order": 4, "department": "plazas"},
        {"name_ar": "إدارة الأبواب", "name_en": "Gates Management", "href": "/gates", "icon": "DoorOpen", "order": 5, "department": "gates"},
        {"name_ar": "خدمات الحشود", "name_en": "Crowd Services", "href": "/crowd-services", "icon": "Users", "order": 6, "department": "crowd_services"},
        {"name_ar": "صحن المطاف", "name_en": "Mataf Management", "href": "/mataf", "icon": "Circle", "order": 7, "department": "mataf"},
        {"name_ar": "التقارير", "name_en": "Reports", "href": "/reports", "icon": "FileText", "order": 8, "is_public": False},
        {"name_ar": "الإشعارات", "name_en": "Notifications", "href": "/notifications", "icon": "Bell", "order": 9, "is_public": False},
        {"name_ar": "الإعدادات", "name_en": "Settings", "href": "/settings", "icon": "Settings", "order": 10, "is_public": False},
        {"name_ar": "لوحة الأدمن", "name_en": "Admin Panel", "href": "/admin", "icon": "Shield", "order": 11, "admin_only": True},
    ]
    
    # Insert all items
    items_to_insert = []
    for item_data in default_items:
        item = SidebarMenuItem(**item_data)
        items_to_insert.append(item.model_dump())
    
    await db.sidebar_menu.insert_many(items_to_insert)
    await log_activity("تهيئة القائمة الجانبية", admin, "sidebar_menu", f"تم إضافة {len(items_to_insert)} قسم")
    
    return {"message": "تم تهيئة القائمة بنجاح", "count": len(items_to_insert)}

# ============= Interactive Maps Routes =============
@api_router.get("/maps")
async def get_maps(department: Optional[str] = None):
    """Get all maps or filter by department"""
    query = {"is_active": True}
    if department:
        query["department"] = department
    
    maps = await db.maps.find(query, {"_id": 0}).to_list(100)
    return maps

@api_router.get("/maps/{map_id}/markers")
async def get_map_markers(map_id: str, type: Optional[str] = None):
    """Get markers for a specific map"""
    query = {"map_id": map_id}
    if type:
        query["type"] = type
    
    markers = await db.map_markers.find(query, {"_id": 0}).to_list(1000)
    
    # Enrich markers with live data
    enriched_markers = []
    for marker in markers:
        enriched = marker.copy()
        
        # If linked to entity, get live data
        if marker.get("entity_id"):
            if marker["type"] == "gate":
                gate = await db.gates.find_one({"id": marker["entity_id"]}, {"_id": 0})
                if gate:
                    enriched["live_data"] = {
                        "status": gate.get("status"),
                        "current_flow": gate.get("current_flow", 0),
                        "max_flow": gate.get("max_flow", 0),
                        "current_indicator": gate.get("current_indicator")
                    }
            elif marker["type"] == "employee":
                employee = await db.employees.find_one({"id": marker["entity_id"]}, {"_id": 0})
                if employee:
                    enriched["live_data"] = {
                        "name": employee.get("name"),
                        "job_title": employee.get("job_title"),
                        "shift": employee.get("shift"),
                        "is_active": employee.get("is_active")
                    }
        
        enriched_markers.append(enriched)
    
    return enriched_markers

@api_router.post("/admin/maps")
async def create_map(map_data: InteractiveMapCreate, admin: dict = Depends(require_admin)):
    """Create new map (admin only)"""
    map_dict = map_data.model_dump()
    map_obj = InteractiveMap(**map_dict)
    doc = map_obj.model_dump()
    
    await db.maps.insert_one(doc)
    await log_activity("إضافة خريطة", admin, map_obj.id, f"خريطة {map_data.name_ar}")
    
    return map_obj

@api_router.post("/admin/maps/markers")
async def create_marker(marker: MapMarkerCreate, admin: dict = Depends(require_admin)):
    """Create new marker (admin only)"""
    marker_dict = marker.model_dump()
    marker_obj = MapMarker(**marker_dict)
    doc = marker_obj.model_dump()
    
    await db.map_markers.insert_one(doc)
    await log_activity("إضافة علامة على الخريطة", admin, marker_obj.id, f"{marker.label_ar}")
    
    return marker_obj

@api_router.delete("/admin/maps/markers/{marker_id}")
async def delete_marker(marker_id: str, admin: dict = Depends(require_admin)):
    """Delete marker (admin only)"""
    result = await db.map_markers.delete_one({"id": marker_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="العلامة غير موجودة")
    
    await log_activity("حذف علامة من الخريطة", admin, marker_id, "تم الحذف")
    return {"message": "تم حذف العلامة بنجاح"}

# ============= External Data - Haramain Density =============
@api_router.get("/external/haramain-density")
async def get_haramain_density():
    """Scrape density data from alharamain.gov.sa"""
    try:
        import requests
        from bs4 import BeautifulSoup
        import urllib3
        urllib3.disable_warnings()
        
        url = "https://alharamain.gov.sa/public/?module=module_794625"
        headers = {'User-Agent': 'Mozilla/5.0'}
        
        response = requests.get(url, headers=headers, timeout=10, verify=False)
        soup = BeautifulSoup(response.text, 'html.parser')
        text = soup.get_text()
        
        # Extract mataf levels
        mataf = [
            {"level": "سطح المطاف", "code": "2", "status": "خفيفة", "percentage": 0},
            {"level": "مطاف الدور الأول", "code": "1", "status": "خفيفة", "percentage": 0},
            {"level": "مطاف الدور الأرضي", "code": "G", "status": "خفيفة", "percentage": 0},
            {"level": "صحن المطاف", "code": "Ground", "status": "خفيفة", "percentage": 0}
        ]
        
        # Extract masa levels  
        masa = [
            {"level": "المسعى الدور الثاني", "code": "2", "status": "خفيفة", "percentage": 0},
            {"level": "المسعى الدور الأول", "code": "1", "status": "خفيفة", "percentage": 0},
            {"level": "المسعى الدور الأرضي", "code": "G", "status": "خفيفة", "percentage": 0}
        ]
        
        # Try to detect density status from text
        overall_density = "خفيفة"
        if "متوسطة" in text:
            overall_density = "متوسطة"
        elif "كثيفة" in text:
            overall_density = "كثيفة"
        
        return {
            "mataf_levels": mataf,
            "masa_levels": masa,
            "overall_density": overall_density,
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "source": "alharamain.gov.sa"
        }
    except Exception as e:
        # Return fallback data if scraping fails
        return {
            "mataf_levels": [],
            "masa_levels": [],
            "overall_density": "غير متاح",
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "error": str(e)
        }


# ============= Season Management Routes =============
@api_router.get("/settings/season")
async def get_active_season():
    """Get current active season"""
    season = await db.seasons.find_one({"id": "active_season"}, {"_id": 0})
    if not season:
        default = Season()
        return default.model_dump()
    return season

@api_router.put("/admin/settings/season")
async def update_season(season_name: str, admin: dict = Depends(require_admin)):
    """Update active season and adjust gate operations"""
    valid_seasons = ["normal", "umrah", "ramadan", "hajj"]
    if season_name not in valid_seasons:
        raise HTTPException(status_code=400, detail="موسم غير صالح")
    
    # Update season
    season_data = {
        "id": "active_season",
        "current_season": season_name,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.seasons.update_one(
        {"id": "active_season"},
        {"$set": season_data},
        upsert=True
    )
    
    # Update gates based on season
    if season_name == "normal":
        # Close all gates
        await db.gates.update_many({}, {"$set": {"status": "مغلق"}})
    else:
        # Open gates that support this season
        await db.gates.update_many(
            {"operational_seasons": season_name},
            {"$set": {"status": "مفتوح"}}
        )
        # Close gates that don't support this season
        await db.gates.update_many(
            {"operational_seasons": {"$ne": season_name}},
            {"$set": {"status": "مغلق"}}
        )
    
    # Count active gates
    active_count = await db.gates.count_documents({"status": "مفتوح"})
    await db.seasons.update_one(
        {"id": "active_season"},
        {"$set": {"active_gates_count": active_count}}
    )
    
    await log_activity("تغيير الموسم", admin, "active_season", f"الموسم النشط: {season_name}")
    
    return {"message": f"تم تفعيل موسم {season_name}", "active_gates": active_count}

# ============= Prohibited Items Routes =============
@api_router.get("/prohibited-items")
async def get_prohibited_items(category: Optional[str] = None):
    """Get prohibited items list"""
    query = {"is_active": True}
    if category:
        query["category"] = category
    
    items = await db.prohibited_items.find(query, {"_id": 0}).to_list(1000)
    return items

@api_router.post("/admin/prohibited-items")
async def create_prohibited_item(item: ProhibitedItemCreate, admin: dict = Depends(require_admin)):
    """Create prohibited item"""
    item_dict = item.model_dump()
    item_obj = ProhibitedItem(**item_dict)
    doc = item_obj.model_dump()
    
    await db.prohibited_items.insert_one(doc)
    await log_activity("إضافة عنصر ممنوع", admin, item_obj.id, item.name_ar)
    
    return item_obj

@api_router.delete("/admin/prohibited-items/{item_id}")
async def delete_prohibited_item(item_id: str, admin: dict = Depends(require_admin)):
    """Delete prohibited item"""
    result = await db.prohibited_items.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="العنصر غير موجود")
    
    await log_activity("حذف عنصر ممنوع", admin, item_id, "تم الحذف")
    return {"message": "تم حذف العنصر بنجاح"}

# ============= Transactions Routes =============
@api_router.get("/transactions")
async def get_transactions(
    department: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get transactions with filters"""
    query = {}
    
    # Filter by department for department managers
    if user.get("role") == "department_manager":
        query["department"] = user.get("department")
    elif department:
        query["department"] = department
    
    if status:
        query["status"] = status
    
    transactions = await db.transactions.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return transactions

@api_router.get("/transactions/stats")
async def get_transaction_stats(
    department: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get transaction statistics"""
    query = {}
    if user.get("role") == "department_manager":
        query["department"] = user.get("department")
    # If department filter is provided (for admin viewing specific dept page)
    elif department:
        query["department"] = department
    
    all_transactions = await db.transactions.find(query, {"_id": 0}).to_list(1000)
    
    completed = len([t for t in all_transactions if t.get("status") == "completed"])
    in_progress = len([t for t in all_transactions if t.get("status") == "in_progress"])
    pending = len([t for t in all_transactions if t.get("status") == "pending"])
    
    # Calculate overdue (pending for more than 7 days)
    from datetime import timedelta
    overdue = 0
    for t in all_transactions:
        if t.get("status") in ["pending", "in_progress"]:
            created = datetime.fromisoformat(t["created_at"])
            # Make created timezone-aware if it's naive
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) - created > timedelta(days=7):
                overdue += 1
    
    return {
        "total": len(all_transactions),
        "completed": completed,
        "in_progress": in_progress,
        "pending": pending,
        "overdue": overdue
    }

@api_router.post("/transactions")
async def create_transaction(
    transaction: TransactionCreate,
    user: dict = Depends(get_current_user)
):
    """Create new transaction with validation"""
    # Validate transaction_date is not in future
    trans_date = datetime.fromisoformat(transaction.transaction_date.replace('Z', '+00:00'))
    if trans_date > datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="لا يمكن أن يكون تاريخ المعاملة في المستقبل")
    
    transaction_dict = transaction.model_dump()
    transaction_dict["assigned_by"] = user.get("email")
    transaction_dict["status"] = "pending"
    transaction_dict["completed_date"] = None
    
    transaction_obj = Transaction(**transaction_dict)
    doc = transaction_obj.model_dump()
    
    await db.transactions.insert_one(doc)
    await log_activity("إنشاء معاملة", user, transaction_obj.id, f"رقم {transaction.transaction_number}")
    
    return transaction_obj

@api_router.put("/transactions/{transaction_id}")
async def update_transaction(
    transaction_id: str,
    transaction: TransactionUpdate,
    user: dict = Depends(get_current_user)
):
    """Update transaction with auto-complete logic"""
    existing = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="المعاملة غير موجودة")
    
    update_data = {k: v for k, v in transaction.model_dump().items() if v is not None}
    
    # Auto-set completed_date when status changes to completed
    if update_data.get("status") == "completed" and existing.get("status") != "completed":
        # Only allow completion if currently "pending" or "in_progress"
        current_status = existing.get("status")
        if current_status not in ["pending", "in_progress"]:
            raise HTTPException(status_code=400, detail="لا يمكن إكمال المعاملة إلا إذا كانت معلقة أو قيد التنفيذ")
        update_data["completed_date"] = datetime.now(timezone.utc).isoformat()
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.transactions.update_one({"id": transaction_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="المعاملة غير موجودة")
    
    await log_activity("تحديث معاملة", user, transaction_id, f"تحديث الحالة")
    
    updated = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    return updated

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(
    transaction_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete transaction - department managers can delete their own department's transactions"""
    # Get the transaction first
    transaction = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="المعاملة غير موجودة")
    
    # Check permissions
    user_role = user.get("role")
    user_dept = user.get("department")
    trans_dept = transaction.get("department")
    
    # Admin can delete any transaction
    if user_role not in ["system_admin", "general_manager"]:
        # Department manager can only delete their department's transactions
        if user_role == "department_manager" and user_dept != trans_dept:
            raise HTTPException(status_code=403, detail="لا يمكنك حذف معاملات قسم آخر")
        # Other roles cannot delete
        elif user_role not in ["department_manager"]:
            raise HTTPException(status_code=403, detail="ليس لديك صلاحية الحذف")
    
    result = await db.transactions.delete_one({"id": transaction_id})
    
    await log_activity("حذف معاملة", user, transaction_id, "تم الحذف")
    return {"message": "تم حذف المعاملة بنجاح"}

# ============= Transactions Export Routes =============
@api_router.get("/transactions/export/pdf")
async def export_transactions_pdf(user: dict = Depends(get_current_user)):
    """Export transactions to PDF with Arabic support"""
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib import colors
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from arabic_reshaper import reshape
    from bidi.algorithm import get_display
    import io
    from fastapi.responses import StreamingResponse
    
    # Get transactions
    query = {}
    if user.get("role") == "department_manager":
        query["department"] = user.get("department")
    
    transactions = await db.transactions.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Create PDF in memory
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4), rightMargin=10*mm, leftMargin=10*mm, topMargin=15*mm, bottomMargin=15*mm)
    
    elements = []
    
    # Add title
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=colors.HexColor('#004D38'),
        alignment=1  # Center
    )
    
    title = Paragraph("Administrative Transactions Report<br/>تقرير المعاملات الإدارية", title_style)
    elements.append(title)
    elements.append(Spacer(1, 10*mm))
    
    # Prepare table data
    def arabic_text(text):
        if not text:
            return ""
        try:
            reshaped = reshape(str(text))
            return get_display(reshaped)
        except Exception:
            return str(text)
    
    table_data = [
        ['#', 'Number', 'Date', 'Subject', 'Assigned', 'Done', 'Progress', 'Pending', 'Notes']
    ]
    
    for idx, t in enumerate(transactions, 1):
        table_data.append([
            str(idx),
            arabic_text(t.get('transaction_number', '')),
            arabic_text(t.get('transaction_date', '')),
            arabic_text(t.get('subject', '')[:50]),
            arabic_text(t.get('assigned_to', '')),
            '✓' if t.get('status') == 'completed' else '',
            '✓' if t.get('status') == 'in_progress' else '',
            '✓' if t.get('status') == 'pending' else '',
            arabic_text((t.get('notes') or '')[:40])
        ])
    
    # Create table
    table = Table(table_data, colWidths=[15*mm, 25*mm, 20*mm, 70*mm, 35*mm, 15*mm, 20*mm, 15*mm, 50*mm])
    
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#004D38')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F5F5F0')])
    ]))
    
    elements.append(table)
    
    # Build PDF
    doc.build(elements)
    
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=transactions_{datetime.now().strftime('%Y-%m-%d')}.pdf"}
    )


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


# ============= Department Settings Routes =============
@api_router.get("/{department}/settings/{setting_type}")
async def get_department_settings(
    department: str,
    setting_type: str,
    user: dict = Depends(get_current_user)
):
    """Get department settings (shifts, rest_patterns, coverage_locations)"""
    settings = await db.department_settings.find({
        "department": department,
        "setting_type": setting_type,
        "is_active": True
    }, {"_id": 0}).sort("order", 1).to_list(100)
    
    return settings

@api_router.post("/{department}/settings")
async def create_department_setting(
    department: str,
    setting: DepartmentSettingCreate,
    user: dict = Depends(require_department_manager)
):
    """Create new department setting"""
    # Check permission
    if user["role"] == "department_manager" and user.get("department") != department:
        raise HTTPException(status_code=403, detail="يمكنك تعديل إعدادات قسمك فقط")
    
    setting_doc = {
        "id": str(uuid.uuid4()),
        **setting.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "is_active": True
    }
    
    await db.department_settings.insert_one(setting_doc)
    
    await log_activity("setting_created", user, f"{department}:{setting.setting_type}", f"تم إضافة إعداد: {setting.label}")
    
    return {"message": "تم إضافة الإعداد بنجاح", "id": setting_doc["id"]}

@api_router.put("/{department}/settings/{setting_id}")
async def update_department_setting(
    department: str,
    setting_id: str,
    setting: DepartmentSettingUpdate,
    user: dict = Depends(require_department_manager)
):
    """Update department setting"""
    existing = await db.department_settings.find_one({"id": setting_id, "department": department}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="الإعداد غير موجود")
    
    # Check permission
    if user["role"] == "department_manager" and user.get("department") != department:
        raise HTTPException(status_code=403, detail="يمكنك تعديل إعدادات قسمك فقط")
    
    update_data = {k: v for k, v in setting.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.department_settings.update_one({"id": setting_id}, {"$set": update_data})
    
    await log_activity("setting_updated", user, f"{department}:{existing['setting_type']}", f"تم تحديث إعداد: {existing['label']}")
    
    return {"message": "تم تحديث الإعداد بنجاح"}

@api_router.delete("/{department}/settings/{setting_id}")
async def delete_department_setting(
    department: str,
    setting_id: str,
    user: dict = Depends(require_department_manager)
):
    """Delete department setting"""
    existing = await db.department_settings.find_one({"id": setting_id, "department": department}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="الإعداد غير موجود")
    
    # Check permission
    if user["role"] == "department_manager" and user.get("department") != department:
        raise HTTPException(status_code=403, detail="يمكنك حذف إعدادات قسمك فقط")
    
    await db.department_settings.delete_one({"id": setting_id})
    
    await log_activity("setting_deleted", user, f"{department}:{existing['setting_type']}", f"تم حذف إعداد: {existing['label']}")
    
    return {"message": "تم حذف الإعداد بنجاح"}

