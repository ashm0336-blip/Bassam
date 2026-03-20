from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid

from database import db
from auth import require_admin, log_activity, hash_password
from models import (
    GateCreate, GateUpdate, PlazaCreate, PlazaUpdate,
    MatafLevelCreate, MatafLevelUpdate, AlertCreate, AlertUpdate,
    GateMarker,
)

router = APIRouter()


# ============= Security Monitoring Dashboard =============
@router.get("/admin/security-stats")
async def get_security_stats(admin: dict = Depends(require_admin)):
    """Security monitoring dashboard data"""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    yesterday_start = (now - timedelta(days=1)).isoformat()
    week_ago = (now - timedelta(days=7)).isoformat()

    # Failed login attempts (today)
    failed_today = await db.activity_logs.count_documents({
        "action": "login",
        "details": {"$regex": "خاطئة|failed|فاشل"},
        "timestamp": {"$gte": today_start}
    })

    # All failed login logs (last 7 days) for the table
    failed_logs = await db.activity_logs.find(
        {"action": "login", "details": {"$regex": "خاطئة|failed|فاشل"}, "timestamp": {"$gte": week_ago}},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(50)

    # Frozen accounts
    frozen_users = await db.users.find(
        {"account_status": "frozen"},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "national_id": 1, "failed_attempts": 1, "last_login": 1, "department": 1}
    ).to_list(50)

    # Pending accounts
    pending_users = await db.users.find(
        {"account_status": "pending"},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "national_id": 1, "department": 1, "created_at": 1}
    ).to_list(50)

    # Permission changes (last 24h)
    perm_actions = ["تغيير مجموعة صلاحيات", "تخصيص صلاحيات فردية", "نسخ صلاحيات",
                     "إنشاء مجموعة صلاحيات", "تحديث مجموعة صلاحيات", "حذف مجموعة صلاحيات",
                     "role_changed"]
    perm_changes = await db.activity_logs.find(
        {"action": {"$in": perm_actions}, "timestamp": {"$gte": yesterday_start}},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(50)

    # Account status changes (last 7 days)
    account_actions = ["account_activated", "account_frozen", "account_terminated",
                        "reset_pin", "account_active"]
    account_changes = await db.activity_logs.find(
        {"action": {"$in": account_actions}, "timestamp": {"$gte": week_ago}},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(50)

    # Terminated accounts
    terminated_count = await db.users.count_documents({"account_status": "terminated"})

    return {
        "failed_logins_today": failed_today,
        "frozen_count": len(frozen_users),
        "pending_count": len(pending_users),
        "perm_changes_24h": len(perm_changes),
        "terminated_count": terminated_count,
        "frozen_users": frozen_users,
        "pending_users": pending_users,
        "failed_login_logs": failed_logs,
        "permission_change_logs": perm_changes,
        "account_change_logs": account_changes,
    }


@router.post("/admin/security/unfreeze/{user_id}")
async def unfreeze_user(user_id: str, admin: dict = Depends(require_admin)):
    """Quick unfreeze a frozen account from security dashboard"""
    target = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    if target.get("account_status") != "frozen":
        raise HTTPException(status_code=400, detail="الحساب ليس مجمّداً")

    # Reset to active with 0 failed attempts
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"account_status": "active", "is_active": True, "failed_attempts": 0}}
    )
    await log_activity("account_active", admin, target.get("name", user_id),
        f"فك تجميد حساب {target.get('name')} بواسطة {admin.get('name')}")
    return {"message": f"تم فك تجميد حساب {target.get('name')} بنجاح"}


# ============= Admin Routes - Gates =============
@router.post("/admin/gates")
async def create_gate(gate: GateCreate, user: dict = Depends(require_admin)):
    gate_id = str(uuid.uuid4())
    gate_doc = {
        "id": gate_id, **gate.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.gates.insert_one(gate_doc)
    first_floor = await db.gate_map_floors.find_one({}, {"_id": 0}, sort=[("order", 1)])
    if first_floor:
        type_map = {"رئيسي": "main", "فرعي": "secondary", "سلم كهربائي": "escalator", "مصعد": "elevator", "درج": "stairs", "جسر": "bridge", "عربات": "wheelchair", "طوارئ": "emergency"}
        dir_map = {"دخول": "entry", "خروج": "exit", "دخول وخروج": "both"}
        status_map = {"مفتوح": "open", "متاح": "open", "مغلق": "closed", "مزدحم": "crowded", "صيانة": "maintenance"}
        class_map = {"عام": "general", "رجال": "men", "نساء": "women", "طوارئ": "emergency", "جنائز": "funeral"}
        count = await db.gate_markers.count_documents({"floor_id": first_floor["id"]})
        col = count % 5
        row = count // 5
        marker_doc = GateMarker(
            floor_id=first_floor["id"], gate_id=gate_id, name_ar=gate.name, name_en="",
            x=10 + col * 18, y=10 + row * 16,
            gate_type=type_map.get(gate.gate_type, "main"),
            direction=dir_map.get(gate.direction, "both"),
            classification=class_map.get(gate.classification, "general"),
            status=status_map.get(gate.status, "open"),
            current_flow=gate.current_flow, max_flow=gate.max_flow
        ).model_dump()
        await db.gate_markers.insert_one(marker_doc)
    await log_activity("gate_created", user, gate.name, f"تم إضافة باب جديد: {gate.name} (رقم {gate.number})")
    return {"message": "تم إضافة الباب بنجاح", "id": gate_id}


@router.put("/admin/gates/{gate_id}")
async def update_gate(gate_id: str, gate: GateUpdate, user: dict = Depends(require_admin)):
    old_gate = await db.gates.find_one({"id": gate_id}, {"_id": 0})
    if not old_gate:
        raise HTTPException(status_code=404, detail="الباب غير موجود")
    update_data = {k: v for k, v in gate.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    if update_data.get("status") == "مغلق" and old_gate.get("status") != "مغلق":
        gate_name = old_gate.get("name")
        result = await db.employees.update_many({"location": gate_name, "department": "gates"}, {"$set": {"location": ""}})
        if result.modified_count > 0:
            await log_activity("إزالة الموظفين من باب مغلق", user, gate_id, f"تم إزالة {result.modified_count} موظف من {gate_name}")
    result = await db.gates.update_one({"id": gate_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="الباب غير موجود")
    status_map = {"مفتوح": "open", "متاح": "open", "مغلق": "closed", "مزدحم": "crowded", "صيانة": "maintenance"}
    marker_update = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if "status" in update_data:
        marker_update["status"] = status_map.get(update_data["status"], "open")
    if "current_flow" in update_data:
        marker_update["current_flow"] = update_data["current_flow"]
    if "max_flow" in update_data:
        marker_update["max_flow"] = update_data["max_flow"]
    if "name" in update_data:
        marker_update["name_ar"] = update_data["name"]
    await db.gate_markers.update_many({"gate_id": gate_id}, {"$set": marker_update})
    return {"message": "تم تحديث الباب بنجاح"}


@router.delete("/admin/gates/{gate_id}")
async def delete_gate(gate_id: str, user: dict = Depends(require_admin)):
    result = await db.gates.delete_one({"id": gate_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="الباب غير موجود")
    await db.gate_markers.delete_many({"gate_id": gate_id})
    return {"message": "تم حذف الباب بنجاح"}


# ============= Admin Routes - Plazas =============
@router.post("/admin/plazas")
async def create_plaza(plaza: PlazaCreate, user: dict = Depends(require_admin)):
    plaza_id = str(uuid.uuid4())
    plaza_doc = {"id": plaza_id, **plaza.model_dump(), "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.plazas.insert_one(plaza_doc)
    return {"message": "تم إضافة الساحة بنجاح", "id": plaza_id}


@router.put("/admin/plazas/{plaza_id}")
async def update_plaza(plaza_id: str, plaza: PlazaUpdate, user: dict = Depends(require_admin)):
    update_data = {k: v for k, v in plaza.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.plazas.update_one({"id": plaza_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="الساحة غير موجودة")
    return {"message": "تم تحديث الساحة بنجاح"}


@router.delete("/admin/plazas/{plaza_id}")
async def delete_plaza(plaza_id: str, user: dict = Depends(require_admin)):
    result = await db.plazas.delete_one({"id": plaza_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="الساحة غير موجودة")
    return {"message": "تم حذف الساحة بنجاح"}


# ============= Admin Routes - Mataf =============
@router.post("/admin/mataf")
async def create_mataf_level(mataf: MatafLevelCreate, user: dict = Depends(require_admin)):
    mataf_id = str(uuid.uuid4())
    mataf_doc = {"id": mataf_id, **mataf.model_dump(), "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.mataf.insert_one(mataf_doc)
    return {"message": "تم إضافة طابق المطاف بنجاح", "id": mataf_id}


@router.put("/admin/mataf/{mataf_id}")
async def update_mataf_level(mataf_id: str, mataf: MatafLevelUpdate, user: dict = Depends(require_admin)):
    update_data = {k: v for k, v in mataf.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.mataf.update_one({"id": mataf_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="طابق المطاف غير موجود")
    return {"message": "تم تحديث طابق المطاف بنجاح"}


# ============= Admin Routes - Alerts =============
@router.post("/admin/alerts")
async def create_alert(alert: AlertCreate, user: dict = Depends(require_admin)):
    received_dt = datetime.fromisoformat(alert.received_at.replace('Z', '+00:00'))
    if received_dt > datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="لا يمكن أن يكون تاريخ الاستلام في المستقبل")
    alert_id = str(uuid.uuid4())
    alert_doc = {
        "id": alert_id, **alert.model_dump(), "is_read": False,
        "created_by": user["id"], "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(), "closed_at": None
    }
    await db.alerts.insert_one(alert_doc)
    await log_activity("إنشاء بلاغ", user, alert_id, f"بلاغ: {alert.title}")

    # Broadcast real-time notification
    from ws_manager import ws_manager
    await ws_manager.broadcast({
        "type": "notification",
        "channel": "alerts",
        "action": "new_alert",
        "payload": {
            "title": alert.title,
            "message": alert.message[:120] if alert.message else "",
            "priority": alert.priority,
            "department": alert.department,
        }
    })

    return {"message": "تم إنشاء البلاغ بنجاح", "id": alert_id}


@router.delete("/admin/alerts/{alert_id}")
async def delete_alert(alert_id: str, user: dict = Depends(require_admin)):
    result = await db.alerts.delete_one({"id": alert_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="التنبيه غير موجود")
    return {"message": "تم حذف التنبيه بنجاح"}


# ============= Admin - Bulk Update =============
@router.put("/admin/gates/bulk-update")
async def bulk_update_gates(updates: List[dict], user: dict = Depends(require_admin)):
    for update in updates:
        gate_id = update.pop("id", None)
        if gate_id:
            update["updated_at"] = datetime.now(timezone.utc).isoformat()
            await db.gates.update_one({"id": gate_id}, {"$set": update})
    return {"message": f"تم تحديث {len(updates)} باب"}


@router.put("/admin/plazas/bulk-update")
async def bulk_update_plazas(updates: List[dict], user: dict = Depends(require_admin)):
    for update in updates:
        plaza_id = update.pop("id", None)
        if plaza_id:
            update["updated_at"] = datetime.now(timezone.utc).isoformat()
            await db.plazas.update_one({"id": plaza_id}, {"$set": update})
    return {"message": f"تم تحديث {len(updates)} ساحة"}


# ============= Admin - Users Management =============
@router.get("/admin/users")
async def get_users(user: dict = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(100)
    return users


@router.put("/admin/users/{user_id}/role")
async def update_user_role(user_id: str, role: str, user: dict = Depends(require_admin)):
    if role not in ["admin", "manager", "supervisor", "user"]:
        raise HTTPException(status_code=400, detail="صلاحية غير صالحة")
    result = await db.users.update_one({"id": user_id}, {"$set": {"role": role}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    return {"message": "تم تحديث صلاحيات المستخدم"}
