"""Field Worker endpoints — density input + quick alerts"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid

from database import db
from auth import get_current_user, log_activity

router = APIRouter()


class DensityInput(BaseModel):
    zone_id: Optional[str] = None
    zone_name: Optional[str] = None
    session_id: Optional[str] = None
    value: str  # خفيف / متوسط / مزدحم / حرج
    notes: Optional[str] = None


class QuickAlert(BaseModel):
    alert_type: str  # density / security / medical / maintenance
    message: str
    location: Optional[str] = None
    priority: str = "medium"


@router.post("/field/density")
async def submit_density(data: DensityInput, user: dict = Depends(get_current_user)):
    """إدخال كثافة من الميدان"""
    doc = {
        "id": str(uuid.uuid4()),
        "zone_id": data.zone_id,
        "zone_name": data.zone_name,
        "session_id": data.session_id,
        "value": data.value,
        "notes": data.notes,
        "submitted_by": user["id"],
        "submitted_by_name": user.get("name", ""),
        "department": user.get("department"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.field_density.insert_one(doc)
    await log_activity("field_density", user, data.zone_name or data.zone_id, f"كثافة: {data.value}")
    return {"message": "تم إرسال الكثافة بنجاح", "id": doc["id"]}


@router.post("/field/alert")
async def submit_alert(data: QuickAlert, user: dict = Depends(get_current_user)):
    """إرسال تنبيه سريع من الميدان"""
    TYPE_LABELS = {
        "density": "كثافة مرتفعة",
        "security": "حالة أمنية",
        "medical": "حالة طبية",
        "maintenance": "صيانة",
        "other": "أخرى",
    }
    alert_doc = {
        "id": str(uuid.uuid4()),
        "type": data.alert_type,
        "title": TYPE_LABELS.get(data.alert_type, data.alert_type),
        "message": data.message,
        "department": user.get("department"),
        "priority": data.priority,
        "status": "وارد",
        "is_read": False,
        "location": data.location,
        "submitted_by": user["id"],
        "submitted_by_name": user.get("name", ""),
        "received_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.alerts.insert_one(alert_doc)
    await log_activity("field_alert", user, data.alert_type, data.message[:100])
    return {"message": "تم إرسال التنبيه بنجاح", "id": alert_doc["id"]}


@router.get("/field/my-submissions")
async def get_my_submissions(user: dict = Depends(get_current_user)):
    """آخر إرسالات الموظف الميداني"""
    densities = await db.field_density.find(
        {"submitted_by": user["id"]}, {"_id": 0}
    ).sort("timestamp", -1).to_list(20)

    alerts = await db.alerts.find(
        {"submitted_by": user["id"]}, {"_id": 0}
    ).sort("received_at", -1).to_list(20)

    return {"densities": densities, "alerts": alerts}
