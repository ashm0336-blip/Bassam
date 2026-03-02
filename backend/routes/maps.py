from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Optional
from datetime import datetime, timezone
import uuid

from database import db
from auth import require_admin, log_activity, get_current_user
from models import (
    InteractiveMap, InteractiveMapCreate, MapMarker, MapMarkerCreate,
    MapFloor, MapFloorCreate, MapZone, MapZoneCreate, MapZoneUpdate,
    GateMapFloor, GateMapFloorCreate, GateMarker, GateMarkerCreate, GateMarkerUpdate,
    GateDailyLog,
)

router = APIRouter()


# ============= Interactive Maps =============
@router.get("/maps")
async def get_maps(department: Optional[str] = None):
    query = {"is_active": True}
    if department:
        query["department"] = department
    maps = await db.maps.find(query, {"_id": 0}).to_list(100)
    return maps


@router.get("/maps/{map_id}/markers")
async def get_map_markers(map_id: str, type: Optional[str] = None):
    query = {"map_id": map_id}
    if type:
        query["type"] = type
    markers = await db.map_markers.find(query, {"_id": 0}).to_list(1000)
    enriched_markers = []
    for marker in markers:
        enriched = marker.copy()
        if marker.get("entity_id"):
            if marker["type"] == "gate":
                gate = await db.gates.find_one({"id": marker["entity_id"]}, {"_id": 0})
                if gate:
                    enriched["live_data"] = {"status": gate.get("status"), "current_flow": gate.get("current_flow", 0), "max_flow": gate.get("max_flow", 0), "current_indicator": gate.get("current_indicator")}
            elif marker["type"] == "employee":
                employee = await db.employees.find_one({"id": marker["entity_id"]}, {"_id": 0})
                if employee:
                    enriched["live_data"] = {"name": employee.get("name"), "job_title": employee.get("job_title"), "shift": employee.get("shift"), "is_active": employee.get("is_active")}
        enriched_markers.append(enriched)
    return enriched_markers


@router.post("/admin/maps")
async def create_map(map_data: InteractiveMapCreate, admin: dict = Depends(require_admin)):
    map_obj = InteractiveMap(**map_data.model_dump())
    await db.maps.insert_one(map_obj.model_dump())
    await log_activity("إضافة خريطة", admin, map_obj.id, f"خريطة {map_data.name_ar}")
    return map_obj


@router.post("/admin/maps/markers")
async def create_marker(marker: MapMarkerCreate, admin: dict = Depends(require_admin)):
    marker_obj = MapMarker(**marker.model_dump())
    await db.map_markers.insert_one(marker_obj.model_dump())
    await log_activity("إضافة علامة على الخريطة", admin, marker_obj.id, f"{marker.label_ar}")
    return marker_obj


@router.delete("/admin/maps/markers/{marker_id}")
async def delete_marker(marker_id: str, admin: dict = Depends(require_admin)):
    result = await db.map_markers.delete_one({"id": marker_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="العلامة غير موجودة")
    await log_activity("حذف علامة من الخريطة", admin, marker_id, "تم الحذف")
    return {"message": "تم حذف العلامة بنجاح"}


# ============= Floor/Layer Management =============
@router.get("/floors")
async def get_floors():
    floors = await db.map_floors.find({"is_active": True}, {"_id": 0}).sort("order", 1).to_list(100)
    return floors


@router.get("/floors/{floor_id}")
async def get_floor(floor_id: str):
    floor = await db.map_floors.find_one({"id": floor_id}, {"_id": 0})
    if not floor:
        raise HTTPException(status_code=404, detail="الطابق غير موجود")
    return floor


@router.post("/admin/floors")
async def create_floor(floor_data: MapFloorCreate, admin: dict = Depends(require_admin)):
    floor_obj = MapFloor(**floor_data.model_dump())
    await db.map_floors.insert_one(floor_obj.model_dump())
    await log_activity("إضافة طابق", admin, floor_obj.id, f"طابق {floor_data.name_ar}")
    return floor_obj


@router.put("/admin/floors/{floor_id}")
async def update_floor(floor_id: str, floor_data: dict, admin: dict = Depends(require_admin)):
    existing = await db.map_floors.find_one({"id": floor_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="الطابق غير موجود")
    update_data = {k: v for k, v in floor_data.items() if v is not None}
    if update_data:
        await db.map_floors.update_one({"id": floor_id}, {"$set": update_data})
    updated = await db.map_floors.find_one({"id": floor_id}, {"_id": 0})
    return updated


@router.delete("/admin/floors/{floor_id}")
async def delete_floor(floor_id: str, admin: dict = Depends(require_admin)):
    result = await db.map_floors.delete_one({"id": floor_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="الطابق غير موجود")
    await db.map_zones.delete_many({"floor_id": floor_id})
    await log_activity("حذف طابق", admin, floor_id, "تم الحذف")
    return {"message": "تم حذف الطابق بنجاح"}


# ============= Zone Management =============
@router.get("/zones")
async def get_all_zones(floor_id: Optional[str] = None, zone_type: Optional[str] = None):
    query = {"is_active": True}
    if floor_id:
        query["floor_id"] = floor_id
    if zone_type:
        query["zone_type"] = zone_type
    zones = await db.map_zones.find(query, {"_id": 0}).to_list(500)
    for zone in zones:
        max_cap = zone.get("max_capacity", 1) or 1
        current = zone.get("current_crowd", 0)
        percentage = round((current / max_cap) * 100, 1)
        zone["percentage"] = percentage
        if percentage < 50: zone["crowd_status"] = "normal"
        elif percentage < 70: zone["crowd_status"] = "moderate"
        elif percentage < 85: zone["crowd_status"] = "crowded"
        else: zone["crowd_status"] = "critical"
    return zones


@router.get("/floors/{floor_id}/zones")
async def get_floor_zones(floor_id: str):
    zones = await db.map_zones.find({"floor_id": floor_id, "is_active": True}, {"_id": 0}).to_list(500)
    for zone in zones:
        max_cap = zone.get("max_capacity", 1) or 1
        current = zone.get("current_crowd", 0)
        zone["percentage"] = round((current / max_cap) * 100, 1)
    return zones


@router.get("/zones/{zone_id}")
async def get_zone(zone_id: str):
    zone = await db.map_zones.find_one({"id": zone_id}, {"_id": 0})
    if not zone:
        raise HTTPException(status_code=404, detail="المنطقة غير موجودة")
    return zone


@router.post("/admin/zones")
async def create_zone(zone_data: MapZoneCreate, admin: dict = Depends(require_admin)):
    zone_obj = MapZone(**zone_data.model_dump())
    await db.map_zones.insert_one(zone_obj.model_dump())
    await log_activity("إضافة منطقة", admin, zone_obj.id, f"منطقة {zone_data.name_ar} ({zone_data.zone_code})")
    return zone_obj


@router.put("/admin/zones/{zone_id}")
async def update_zone(zone_id: str, zone_data: MapZoneUpdate, admin: dict = Depends(require_admin)):
    existing = await db.map_zones.find_one({"id": zone_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="المنطقة غير موجودة")
    update_data = {k: v for k, v in zone_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    if update_data:
        await db.map_zones.update_one({"id": zone_id}, {"$set": update_data})
    updated = await db.map_zones.find_one({"id": zone_id}, {"_id": 0})
    return updated


@router.delete("/admin/zones/{zone_id}")
async def delete_zone(zone_id: str, admin: dict = Depends(require_admin)):
    result = await db.map_zones.delete_one({"id": zone_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="المنطقة غير موجودة")
    await log_activity("حذف منطقة", admin, zone_id, "تم الحذف")
    return {"message": "تم حذف المنطقة بنجاح"}


@router.put("/admin/zones/bulk-update-crowd")
async def bulk_update_zone_crowd(request: Request, admin: dict = Depends(require_admin)):
    updates = await request.json()
    updated_count = 0
    for update in updates:
        zone_id = update.get("zone_id")
        if zone_id:
            update_data = {"current_crowd": update.get("current_crowd", 0), "crowd_status": update.get("crowd_status", "normal"), "updated_at": datetime.now(timezone.utc).isoformat()}
            result = await db.map_zones.update_one({"id": zone_id}, {"$set": update_data})
            if result.modified_count > 0:
                updated_count += 1
    await log_activity("تحديث كثافة المناطق", admin, "bulk", f"تم تحديث {updated_count} منطقة")
    return {"message": f"تم تحديث {updated_count} منطقة"}


@router.get("/zones/stats/summary")
async def get_zones_stats():
    zones = await db.map_zones.find({"is_active": True}, {"_id": 0}).to_list(500)
    total_current = sum(z.get("current_crowd", 0) for z in zones)
    total_max = sum(z.get("max_capacity", 0) for z in zones) or 1
    zone_types = {}
    for zone in zones:
        zt = zone.get("zone_type", "other")
        if zt not in zone_types:
            zone_types[zt] = {"count": 0, "current_crowd": 0, "max_capacity": 0}
        zone_types[zt]["count"] += 1
        zone_types[zt]["current_crowd"] += zone.get("current_crowd", 0)
        zone_types[zt]["max_capacity"] += zone.get("max_capacity", 0)
    status_counts = {"normal": 0, "moderate": 0, "crowded": 0, "critical": 0}
    for zone in zones:
        max_cap = zone.get("max_capacity", 1) or 1
        pct = (zone.get("current_crowd", 0) / max_cap) * 100
        if pct < 50: status_counts["normal"] += 1
        elif pct < 70: status_counts["moderate"] += 1
        elif pct < 85: status_counts["crowded"] += 1
        else: status_counts["critical"] += 1
    return {"total_zones": len(zones), "total_current_crowd": total_current, "total_max_capacity": total_max, "overall_percentage": round((total_current / total_max) * 100, 1), "by_zone_type": zone_types, "by_status": status_counts}


# ============= Gate Map =============
@router.get("/gate-map/floors")
async def get_gate_map_floors():
    floors = await db.gate_map_floors.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return floors


@router.post("/admin/gate-map/floors")
async def create_gate_map_floor(floor_data: GateMapFloorCreate, admin: dict = Depends(require_admin)):
    floor = GateMapFloor(**floor_data.model_dump())
    doc = floor.model_dump()
    await db.gate_map_floors.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/admin/gate-map/floors/{floor_id}")
async def update_gate_map_floor(floor_id: str, floor_data: dict, admin: dict = Depends(require_admin)):
    existing = await db.gate_map_floors.find_one({"id": floor_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="الطابق غير موجود")
    update_data = {k: v for k, v in floor_data.items() if v is not None}
    if update_data:
        await db.gate_map_floors.update_one({"id": floor_id}, {"$set": update_data})
    updated = await db.gate_map_floors.find_one({"id": floor_id}, {"_id": 0})
    return updated


@router.delete("/admin/gate-map/floors/{floor_id}")
async def delete_gate_map_floor(floor_id: str, admin: dict = Depends(require_admin)):
    await db.gate_map_floors.delete_one({"id": floor_id})
    await db.gate_markers.delete_many({"floor_id": floor_id})
    return {"message": "تم الحذف"}


@router.get("/gate-map/markers")
async def get_gate_markers(floor_id: Optional[str] = None):
    query = {}
    if floor_id:
        query["floor_id"] = floor_id
    markers = await db.gate_markers.find(query, {"_id": 0}).to_list(500)
    return markers


@router.post("/admin/gate-map/markers")
async def create_gate_marker(data: GateMarkerCreate, admin: dict = Depends(require_admin)):
    marker = GateMarker(**data.model_dump())
    doc = marker.model_dump()
    await db.gate_markers.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/admin/gate-map/markers/{marker_id}")
async def update_gate_marker(marker_id: str, data: GateMarkerUpdate, admin: dict = Depends(require_admin)):
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.gate_markers.update_one({"id": marker_id}, {"$set": update})
    updated = await db.gate_markers.find_one({"id": marker_id}, {"_id": 0})
    return updated


@router.delete("/admin/gate-map/markers/{marker_id}")
async def delete_gate_marker(marker_id: str, admin: dict = Depends(require_admin)):
    await db.gate_markers.delete_one({"id": marker_id})
    return {"message": "تم الحذف"}


@router.put("/admin/gate-map/markers/bulk-status")
async def bulk_update_gate_markers(request: Request, admin: dict = Depends(require_admin)):
    updates = await request.json()
    count = 0
    for u in updates:
        mid = u.get("id")
        if mid:
            upd = {k: v for k, v in u.items() if k != "id" and v is not None}
            upd["updated_at"] = datetime.now(timezone.utc).isoformat()
            r = await db.gate_markers.update_one({"id": mid}, {"$set": upd})
            if r.modified_count: count += 1
    return {"message": f"تم تحديث {count} باب"}


@router.post("/admin/gate-map/sync-gates")
async def sync_gates_to_markers(request: Request, admin: dict = Depends(require_admin)):
    """Sync gates from gates collection to gate markers for a specific floor."""
    data = await request.json()
    floor_id = data.get("floor_id")
    if not floor_id:
        raise HTTPException(status_code=400, detail="floor_id مطلوب")
    floor = await db.gate_map_floors.find_one({"id": floor_id}, {"_id": 0})
    if not floor:
        raise HTTPException(status_code=404, detail="الطابق غير موجود")
    existing_markers = await db.gate_markers.find({"floor_id": floor_id}, {"_id": 0}).to_list(500)
    existing_gate_names = {m.get("name_ar") for m in existing_markers}
    gates = await db.gates.find({}, {"_id": 0}).to_list(500)
    created = 0
    for gate in gates:
        gate_name = gate.get("name", "")
        if gate_name and gate_name not in existing_gate_names:
            marker = GateMarker(
                floor_id=floor_id,
                gate_id=gate.get("id"),
                name_ar=gate_name,
                name_en=gate.get("name_en", ""),
                x=50.0,
                y=50.0,
                gate_type=gate.get("gate_type", "main"),
                direction=gate.get("direction", "both"),
                classification=gate.get("classification", "general"),
                status=gate.get("status", "open"),
                current_flow=gate.get("current_flow", 0),
                max_flow=gate.get("max_flow", 5000),
            )
            doc = marker.model_dump()
            await db.gate_markers.insert_one(doc)
            doc.pop("_id", None)
            created += 1
            existing_gate_names.add(gate_name)
    return {"created": created, "total_markers": len(existing_markers) + created}


@router.get("/gate-map/daily-logs")
async def get_gate_daily_logs(limit: int = 30):
    logs = await db.gate_daily_logs.find({}, {"_id": 0}).sort("date", -1).to_list(limit)
    return logs


@router.post("/admin/gate-map/daily-logs")
async def create_gate_daily_log(request: Request, admin: dict = Depends(require_admin)):
    data = await request.json()
    log = GateDailyLog(**data)
    existing = await db.gate_daily_logs.find_one({"date": log.date}, {"_id": 0})
    if existing:
        await db.gate_daily_logs.update_one({"date": log.date}, {"$set": log.model_dump()})
    else:
        await db.gate_daily_logs.insert_one(log.model_dump())
    result = log.model_dump()
    result.pop("_id", None)
    return result


@router.post("/admin/gate-map/auto-log")
async def auto_create_daily_log(admin: dict = Depends(require_admin)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    markers = await db.gate_markers.find({}, {"_id": 0}).to_list(500)
    total = len(markers)
    open_g = sum(1 for m in markers if m.get("status") == "open")
    closed_g = sum(1 for m in markers if m.get("status") == "closed")
    total_flow = sum(m.get("current_flow", 0) for m in markers)
    log = GateDailyLog(date=today, total_gates=total, open_gates=open_g, closed_gates=closed_g, total_flow=total_flow)
    existing = await db.gate_daily_logs.find_one({"date": today}, {"_id": 0})
    if existing:
        await db.gate_daily_logs.update_one({"date": today}, {"$set": log.model_dump()})
    else:
        await db.gate_daily_logs.insert_one(log.model_dump())
    result = log.model_dump()
    result.pop("_id", None)
    return result


# ============= External Data =============
@router.get("/external/haramain-density")
async def get_haramain_density():
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
        mataf = [
            {"level": "سطح المطاف", "code": "2", "status": "خفيفة", "percentage": 0},
            {"level": "مطاف الدور الأول", "code": "1", "status": "خفيفة", "percentage": 0},
            {"level": "مطاف الدور الأرضي", "code": "G", "status": "خفيفة", "percentage": 0},
            {"level": "صحن المطاف", "code": "Ground", "status": "خفيفة", "percentage": 0}
        ]
        masa = [
            {"level": "المسعى الدور الثاني", "code": "2", "status": "خفيفة", "percentage": 0},
            {"level": "المسعى الدور الأول", "code": "1", "status": "خفيفة", "percentage": 0},
            {"level": "المسعى الدور الأرضي", "code": "G", "status": "خفيفة", "percentage": 0}
        ]
        overall_density = "خفيفة"
        if "متوسطة" in text: overall_density = "متوسطة"
        elif "كثيفة" in text: overall_density = "كثيفة"
        return {"mataf_levels": mataf, "masa_levels": masa, "overall_density": overall_density, "last_updated": datetime.now(timezone.utc).isoformat(), "source": "alharamain.gov.sa"}
    except Exception as e:
        return {"mataf_levels": [], "masa_levels": [], "overall_density": "غير متاح", "last_updated": datetime.now(timezone.utc).isoformat(), "error": str(e)}
