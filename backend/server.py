from fastapi import FastAPI, APIRouter, Query, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="Al-Haram OS API", description="منصة خدمات الحشود API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ============= Models =============
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class DepartmentStats(BaseModel):
    id: str
    name: str
    name_en: str
    icon: str
    current_crowd: int
    max_capacity: int
    percentage: float
    status: str  # normal, warning, critical
    active_staff: int
    incidents_today: int

class CrowdData(BaseModel):
    timestamp: str
    count: int
    department: str

class Alert(BaseModel):
    id: str
    type: str  # emergency, warning, info
    title: str
    message: str
    department: str
    timestamp: str
    is_read: bool = False

class DashboardStats(BaseModel):
    total_visitors_today: int
    current_crowd: int
    max_capacity: int
    active_staff: int
    open_gates: int
    total_gates: int
    incidents_today: int
    alerts_count: int

class GateInfo(BaseModel):
    id: str
    name: str
    number: int
    status: str  # open, closed, maintenance
    direction: str  # entry, exit, both
    current_flow: int
    max_flow: int
    location: str

class PlazaInfo(BaseModel):
    id: str
    name: str
    current_crowd: int
    max_capacity: int
    percentage: float
    status: str
    zone: str

class MatafInfo(BaseModel):
    id: str
    level: str
    current_crowd: int
    max_capacity: int
    percentage: float
    average_tawaf_time: int  # minutes
    status: str

class Report(BaseModel):
    id: str
    title: str
    type: str
    date: str
    department: str
    summary: str

class Notification(BaseModel):
    id: str
    type: str
    title: str
    message: str
    timestamp: str
    is_read: bool
    priority: str

# ============= Mock Data Generators =============
def generate_department_stats() -> List[DepartmentStats]:
    departments = [
        {"id": "planning", "name": "إدارة تخطيط خدمات الحشود", "name_en": "Crowd Planning", "icon": "ClipboardList", "max": 50000},
        {"id": "plazas", "name": "إدارة الساحات", "name_en": "Plazas Management", "icon": "LayoutGrid", "max": 150000},
        {"id": "gates", "name": "إدارة الأبواب", "name_en": "Gates Management", "icon": "DoorOpen", "max": 80000},
        {"id": "crowd_services", "name": "إدارة خدمات حشود الحرم", "name_en": "Haram Crowd Services", "icon": "Users", "max": 200000},
        {"id": "mataf", "name": "إدارة صحن المطاف", "name_en": "Mataf Management", "icon": "Circle", "max": 100000},
    ]
    
    result = []
    for dept in departments:
        current = random.randint(int(dept["max"] * 0.4), int(dept["max"] * 0.95))
        percentage = (current / dept["max"]) * 100
        status = "normal" if percentage < 70 else ("warning" if percentage < 85 else "critical")
        
        result.append(DepartmentStats(
            id=dept["id"],
            name=dept["name"],
            name_en=dept["name_en"],
            icon=dept["icon"],
            current_crowd=current,
            max_capacity=dept["max"],
            percentage=round(percentage, 1),
            status=status,
            active_staff=random.randint(50, 200),
            incidents_today=random.randint(0, 15)
        ))
    
    return result

def generate_hourly_crowd_data() -> List[dict]:
    hours = []
    base_crowd = 80000
    for hour in range(24):
        # Simulate crowd patterns
        if 4 <= hour <= 6:  # Fajr
            multiplier = 1.8
        elif 12 <= hour <= 14:  # Dhuhr
            multiplier = 1.5
        elif 15 <= hour <= 17:  # Asr
            multiplier = 1.4
        elif 18 <= hour <= 20:  # Maghrib/Isha
            multiplier = 2.0
        elif 21 <= hour <= 23:  # Night
            multiplier = 1.6
        else:
            multiplier = 0.8 + random.uniform(0, 0.4)
        
        count = int(base_crowd * multiplier * (0.9 + random.uniform(0, 0.2)))
        hours.append({
            "hour": f"{hour:02d}:00",
            "count": count,
            "percentage": round((count / 200000) * 100, 1)
        })
    return hours

def generate_alerts() -> List[Alert]:
    alerts_data = [
        {"type": "warning", "title": "ازدحام في باب الملك عبدالعزيز", "message": "نسبة الإشغال وصلت 85%", "department": "gates"},
        {"type": "info", "title": "صيانة مجدولة", "message": "صيانة المصاعد في الساحة الشرقية", "department": "plazas"},
        {"type": "emergency", "title": "حالة طوارئ طبية", "message": "حالة إسعافية في صحن المطاف", "department": "mataf"},
        {"type": "warning", "title": "تدفق عالي", "message": "زيادة في تدفق الزوار من الباب 79", "department": "gates"},
        {"type": "info", "title": "تغيير المسارات", "message": "تم تحويل مسار الخروج إلى الباب 94", "department": "planning"},
    ]
    
    return [
        Alert(
            id=str(uuid.uuid4()),
            type=a["type"],
            title=a["title"],
            message=a["message"],
            department=a["department"],
            timestamp=datetime.now(timezone.utc).isoformat(),
            is_read=random.choice([True, False])
        ) for a in alerts_data
    ]

def generate_gates() -> List[GateInfo]:
    gates = []
    gate_names = [
        "باب الملك عبدالعزيز", "باب الفتح", "باب العمرة", "باب الملك فهد",
        "باب السلام", "باب إبراهيم", "باب الحجون", "باب علي",
        "باب العباس", "باب النبي", "باب جبريل", "باب الصفا"
    ]
    locations = ["الجهة الشمالية", "الجهة الجنوبية", "الجهة الشرقية", "الجهة الغربية"]
    
    for i, name in enumerate(gate_names):
        max_flow = random.randint(3000, 8000)
        current_flow = random.randint(int(max_flow * 0.3), max_flow)
        gates.append(GateInfo(
            id=str(uuid.uuid4()),
            name=name,
            number=i + 1,
            status=random.choice(["open", "open", "open", "closed", "maintenance"]),
            direction=random.choice(["entry", "exit", "both"]),
            current_flow=current_flow,
            max_flow=max_flow,
            location=random.choice(locations)
        ))
    return gates

def generate_plazas() -> List[PlazaInfo]:
    plazas_data = [
        {"name": "الساحة الشمالية", "zone": "north", "max": 40000},
        {"name": "الساحة الجنوبية", "zone": "south", "max": 35000},
        {"name": "الساحة الشرقية", "zone": "east", "max": 45000},
        {"name": "الساحة الغربية", "zone": "west", "max": 38000},
        {"name": "ساحة المسعى", "zone": "masa", "max": 50000},
        {"name": "ساحة أجياد", "zone": "ajyad", "max": 30000},
    ]
    
    plazas = []
    for p in plazas_data:
        current = random.randint(int(p["max"] * 0.4), int(p["max"] * 0.95))
        percentage = (current / p["max"]) * 100
        status = "normal" if percentage < 70 else ("warning" if percentage < 85 else "critical")
        plazas.append(PlazaInfo(
            id=str(uuid.uuid4()),
            name=p["name"],
            current_crowd=current,
            max_capacity=p["max"],
            percentage=round(percentage, 1),
            status=status,
            zone=p["zone"]
        ))
    return plazas

def generate_mataf_levels() -> List[MatafInfo]:
    levels = [
        {"level": "الطابق الأرضي", "max": 50000},
        {"level": "الطابق الأول", "max": 40000},
        {"level": "سطح الحرم", "max": 35000},
    ]
    
    mataf = []
    for l in levels:
        current = random.randint(int(l["max"] * 0.5), int(l["max"] * 0.9))
        percentage = (current / l["max"]) * 100
        status = "normal" if percentage < 70 else ("warning" if percentage < 85 else "critical")
        mataf.append(MatafInfo(
            id=str(uuid.uuid4()),
            level=l["level"],
            current_crowd=current,
            max_capacity=l["max"],
            percentage=round(percentage, 1),
            average_tawaf_time=random.randint(25, 55),
            status=status
        ))
    return mataf

def generate_notifications() -> List[Notification]:
    notifications_data = [
        {"type": "alert", "title": "تنبيه ازدحام", "message": "ازدحام شديد في الساحة الشمالية", "priority": "high"},
        {"type": "system", "title": "تحديث النظام", "message": "تم تحديث بيانات الحشود", "priority": "low"},
        {"type": "alert", "title": "حالة طوارئ", "message": "حالة طبية طارئة في صحن المطاف", "priority": "critical"},
        {"type": "info", "title": "إشعار إداري", "message": "اجتماع المشرفين الساعة 3 عصراً", "priority": "medium"},
        {"type": "system", "title": "صيانة مجدولة", "message": "صيانة نظام الكاميرات غداً", "priority": "low"},
    ]
    
    return [
        Notification(
            id=str(uuid.uuid4()),
            type=n["type"],
            title=n["title"],
            message=n["message"],
            timestamp=datetime.now(timezone.utc).isoformat(),
            is_read=random.choice([True, False]),
            priority=n["priority"]
        ) for n in notifications_data
    ]

# ============= API Routes =============
@api_router.get("/")
async def root():
    return {"message": "مرحباً بك في منصة خدمات الحشود", "version": "1.0.0"}

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    """Get main dashboard statistics"""
    departments = generate_department_stats()
    total_current = sum(d.current_crowd for d in departments)
    total_max = sum(d.max_capacity for d in departments)
    
    return DashboardStats(
        total_visitors_today=random.randint(800000, 1200000),
        current_crowd=total_current,
        max_capacity=total_max,
        active_staff=sum(d.active_staff for d in departments),
        open_gates=random.randint(80, 100),
        total_gates=105,
        incidents_today=sum(d.incidents_today for d in departments),
        alerts_count=random.randint(3, 12)
    )

@api_router.get("/dashboard/departments", response_model=List[DepartmentStats])
async def get_departments():
    """Get all departments statistics"""
    return generate_department_stats()

@api_router.get("/dashboard/crowd-hourly")
async def get_hourly_crowd():
    """Get hourly crowd data for charts"""
    return generate_hourly_crowd_data()

@api_router.get("/alerts", response_model=List[Alert])
async def get_alerts(department: Optional[str] = None, type: Optional[str] = None):
    """Get all alerts with optional filtering"""
    alerts = generate_alerts()
    if department:
        alerts = [a for a in alerts if a.department == department]
    if type:
        alerts = [a for a in alerts if a.type == type]
    return alerts

@api_router.get("/gates", response_model=List[GateInfo])
async def get_gates(status: Optional[str] = None):
    """Get all gates information"""
    gates = generate_gates()
    if status:
        gates = [g for g in gates if g.status == status]
    return gates

@api_router.get("/gates/stats")
async def get_gates_stats():
    """Get gates summary statistics"""
    gates = generate_gates()
    return {
        "total": len(gates),
        "open": len([g for g in gates if g.status == "open"]),
        "closed": len([g for g in gates if g.status == "closed"]),
        "maintenance": len([g for g in gates if g.status == "maintenance"]),
        "total_flow": sum(g.current_flow for g in gates),
        "entry_gates": len([g for g in gates if g.direction in ["entry", "both"]]),
        "exit_gates": len([g for g in gates if g.direction in ["exit", "both"]])
    }

@api_router.get("/plazas", response_model=List[PlazaInfo])
async def get_plazas():
    """Get all plazas information"""
    return generate_plazas()

@api_router.get("/plazas/stats")
async def get_plazas_stats():
    """Get plazas summary statistics"""
    plazas = generate_plazas()
    total_current = sum(p.current_crowd for p in plazas)
    total_max = sum(p.max_capacity for p in plazas)
    return {
        "total_plazas": len(plazas),
        "current_crowd": total_current,
        "max_capacity": total_max,
        "overall_percentage": round((total_current / total_max) * 100, 1),
        "normal": len([p for p in plazas if p.status == "normal"]),
        "warning": len([p for p in plazas if p.status == "warning"]),
        "critical": len([p for p in plazas if p.status == "critical"])
    }

@api_router.get("/mataf", response_model=List[MatafInfo])
async def get_mataf():
    """Get Mataf levels information"""
    return generate_mataf_levels()

@api_router.get("/mataf/stats")
async def get_mataf_stats():
    """Get Mataf summary statistics"""
    mataf = generate_mataf_levels()
    total_current = sum(m.current_crowd for m in mataf)
    total_max = sum(m.max_capacity for m in mataf)
    avg_time = sum(m.average_tawaf_time for m in mataf) // len(mataf)
    return {
        "total_levels": len(mataf),
        "current_crowd": total_current,
        "max_capacity": total_max,
        "overall_percentage": round((total_current / total_max) * 100, 1),
        "average_tawaf_time": avg_time,
        "status_summary": {
            "normal": len([m for m in mataf if m.status == "normal"]),
            "warning": len([m for m in mataf if m.status == "warning"]),
            "critical": len([m for m in mataf if m.status == "critical"])
        }
    }

@api_router.get("/notifications", response_model=List[Notification])
async def get_notifications(unread_only: bool = False):
    """Get all notifications"""
    notifications = generate_notifications()
    if unread_only:
        notifications = [n for n in notifications if not n.is_read]
    return notifications

@api_router.get("/reports")
async def get_reports(type: Optional[str] = None, department: Optional[str] = None):
    """Get available reports"""
    reports = [
        {"id": str(uuid.uuid4()), "title": "التقرير اليومي للحشود", "type": "daily", "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "department": "all", "summary": "إجمالي الزوار: 950,000"},
        {"id": str(uuid.uuid4()), "title": "تقرير الأبواب الأسبوعي", "type": "weekly", "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "department": "gates", "summary": "متوسط التدفق اليومي: 85,000"},
        {"id": str(uuid.uuid4()), "title": "تقرير صحن المطاف", "type": "daily", "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "department": "mataf", "summary": "متوسط وقت الطواف: 42 دقيقة"},
        {"id": str(uuid.uuid4()), "title": "التقرير الشهري للساحات", "type": "monthly", "date": datetime.now(timezone.utc).strftime("%Y-%m"), "department": "plazas", "summary": "نسبة الإشغال المتوسطة: 72%"},
    ]
    
    if type:
        reports = [r for r in reports if r["type"] == type]
    if department:
        reports = [r for r in reports if r["department"] == department]
    return reports

@api_router.get("/planning/stats")
async def get_planning_stats():
    """Get planning department statistics"""
    return {
        "active_plans": random.randint(5, 15),
        "pending_approvals": random.randint(2, 8),
        "completed_today": random.randint(10, 25),
        "scheduled_events": random.randint(3, 10),
        "resource_utilization": random.randint(70, 95),
        "staff_deployed": random.randint(150, 300)
    }

@api_router.get("/crowd-services/stats")
async def get_crowd_services_stats():
    """Get crowd services department statistics"""
    return {
        "service_requests_today": random.randint(50, 150),
        "resolved_requests": random.randint(40, 120),
        "pending_requests": random.randint(5, 30),
        "average_response_time": random.randint(5, 15),
        "satisfaction_rate": random.randint(85, 98),
        "active_teams": random.randint(20, 40)
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
