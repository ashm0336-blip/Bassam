from fastapi import APIRouter, Depends, HTTPException, Request, Body
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import copy

from database import db
from auth import require_department_manager, log_activity
from models import (
    SessionZone, MapSession, MapSessionCreate, MapSessionUpdate, SessionZoneUpdate,
    GateSession, GateSessionCreate, GateSessionUpdate, SessionGateUpdate,
)

router = APIRouter()


# ============= Daily Map Sessions =============
@router.get("/map-sessions")
async def get_map_sessions(floor_id: Optional[str] = None, limit: int = 60, parent_session_id: Optional[str] = None, session_type: Optional[str] = None):
    query = {}
    if floor_id:
        query["floor_id"] = floor_id
    if parent_session_id:
        query["parent_session_id"] = parent_session_id
    if session_type:
        query["session_type"] = session_type
    else:
        # Default: only return daily sessions unless filtering by parent
        if not parent_session_id:
            query["session_type"] = {"$in": ["daily", None]}
            query["$or"] = [{"session_type": "daily"}, {"session_type": {"$exists": False}}, {"prayer": {"$exists": False}}]
    sessions = await db.map_sessions.find(query, {"_id": 0}).sort("date", -1).to_list(limit)
    return sessions


@router.get("/map-sessions/{session_id}")
async def get_map_session(session_id: str):
    session = await db.map_sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="الجلسة غير موجودة")
    return session


def _clone_zones_from_source(source_zones):
    zones = []
    for z in source_zones:
        if z.get("is_removed"):
            continue
        sz = SessionZone(
            original_zone_id=z.get("original_zone_id") or z.get("id"),
            floor_id=z.get("floor_id"),
            zone_code=z.get("zone_code", ""),
            name_ar=z.get("name_ar", ""),
            name_en=z.get("name_en", ""),
            zone_type=z.get("zone_type", "service"),
            polygon_points=z.get("polygon_points", []),
            fill_color=z.get("fill_color", "#22c55e"),
            stroke_color=z.get("stroke_color", "#000000"),
            opacity=z.get("opacity", 0.4),
            stroke_opacity=z.get("stroke_opacity", 1.0),
            max_capacity=z.get("max_capacity", 1000),
            area_sqm=z.get("area_sqm", 0),
            per_person_sqm=z.get("per_person_sqm", 0.8),
            description_ar=z.get("description_ar"),
            description_en=z.get("description_en"),
            change_type="unchanged"
        )
        zones.append(sz.model_dump())
    return zones


@router.post("/admin/map-sessions")
async def create_map_session(data: MapSessionCreate, admin: dict = Depends(require_department_manager)):
    # For prayer sessions: check uniqueness by date + floor + prayer
    if data.session_type == "prayer" and data.prayer:
        existing = await db.map_sessions.find_one({"date": data.date, "floor_id": data.floor_id, "prayer": data.prayer}, {"_id": 0})
        if existing:
            raise HTTPException(status_code=400, detail=f"توجد جلسة {data.prayer} بالفعل لهذا اليوم")
    else:
        # Daily session: check uniqueness by date + floor (no prayer field)
        existing = await db.map_sessions.find_one({"date": data.date, "floor_id": data.floor_id, "session_type": {"$in": ["daily", None]}, "$or": [{"prayer": None}, {"prayer": {"$exists": False}}]}, {"_id": 0})
        if existing:
            raise HTTPException(status_code=400, detail="توجد جلسة بالفعل لهذا التاريخ والطابق")

    floor = await db.map_floors.find_one({"id": data.floor_id}, {"_id": 0})
    if not floor:
        raise HTTPException(status_code=404, detail="الطابق غير موجود")

    zones_snapshot = []
    changes_summary = {"added": 0, "removed": 0, "modified": 0, "unchanged": 0}

    # For prayer sessions: clone from parent daily session by default
    clone_source_id = data.clone_from
    if data.session_type == "prayer" and not clone_source_id and data.parent_session_id:
        # Try to clone from the previous prayer session, or from parent daily session
        PRAYER_ORDER = ["fajr", "dhuhr", "asr", "maghrib", "isha", "taraweeh"]
        if data.prayer in PRAYER_ORDER:
            idx = PRAYER_ORDER.index(data.prayer)
            # Try previous prayers in order
            for prev_prayer in reversed(PRAYER_ORDER[:idx]):
                prev_prayer_session = await db.map_sessions.find_one({"parent_session_id": data.parent_session_id, "prayer": prev_prayer}, {"_id": 0})
                if prev_prayer_session:
                    clone_source_id = prev_prayer_session["id"]
                    break
            if not clone_source_id:
                clone_source_id = data.parent_session_id  # clone from daily session

    if clone_source_id == "empty":
        pass
    elif clone_source_id == "master":
        master_zones = await db.map_zones.find({"floor_id": data.floor_id, "is_active": True}, {"_id": 0}).to_list(500)
        zones_snapshot = _clone_zones_from_source(master_zones)
        changes_summary["unchanged"] = len(zones_snapshot)
    elif clone_source_id:
        prev_session = await db.map_sessions.find_one({"id": clone_source_id}, {"_id": 0})
        if prev_session and prev_session.get("zones"):
            zones_snapshot = _clone_zones_from_source(prev_session["zones"])
            changes_summary["unchanged"] = len(zones_snapshot)
    else:
        prev = await db.map_sessions.find_one({"floor_id": data.floor_id, "date": {"$lt": data.date}, "session_type": {"$in": ["daily", None]}}, {"_id": 0}, sort=[("date", -1)])
        if prev and prev.get("zones"):
            zones_snapshot = _clone_zones_from_source(prev["zones"])
            changes_summary["unchanged"] = len(zones_snapshot)
        else:
            master_zones = await db.map_zones.find({"floor_id": data.floor_id, "is_active": True}, {"_id": 0}).to_list(500)
            zones_snapshot = _clone_zones_from_source(master_zones)
            changes_summary["unchanged"] = len(zones_snapshot)

    session = MapSession(
        date=data.date, floor_id=data.floor_id, floor_name=floor.get("name_ar", ""),
        status="draft", created_by=admin.get("name", ""),
        session_type=data.session_type, prayer=data.prayer, parent_session_id=data.parent_session_id,
        zones=zones_snapshot, changes_summary=changes_summary
    )
    doc = session.model_dump()
    doc["session_history"] = []  # مصفوفة أحداث مستوى الجلسة
    await db.map_sessions.insert_one(doc)

    actor = admin.get("name", "النظام")
    if data.session_type == "prayer" and data.prayer:
        prayer_name = _pt(data.prayer)
        # سجّل في الجلسة الجديدة
        await _push_session_event(session.id, "prayer_started", actor,
            f"🕌 بدأت جولة صلاة {prayer_name}\n   التاريخ: {data.date}\n   المنفذ: {actor}",
            icon="🕌")
        # سجّل في الجلسة الأم (الجولة اليومية) إن وجدت
        if data.parent_session_id:
            await _push_session_event(data.parent_session_id, "prayer_started", actor,
                f"🕌 بدأت جولة {prayer_name}\n   المنفذ: {actor}",
                icon="🕌")
    else:
        await _push_session_event(session.id, "session_created", actor,
            f"📋 إنشاء جولة يومية جديدة\n   التاريخ: {data.date}\n   المنفذ: {actor}",
            icon="📋")

    await log_activity("إنشاء جلسة خريطة", admin, session.id, f"صلاة {data.prayer}" if data.prayer else f"تاريخ: {data.date}")
    result = doc.copy()
    result.pop("_id", None)
    return result


@router.put("/admin/map-sessions/{session_id}")
async def update_map_session(session_id: str, data: MapSessionUpdate, admin: dict = Depends(require_department_manager)):
    existing = await db.map_sessions.find_one({"id": session_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="الجلسة غير موجودة")
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    actor = admin.get("name", "النظام")
    prayer_name = _pt(existing.get("prayer","")) if existing.get("prayer") else None
    is_prayer = existing.get("session_type") == "prayer"
    parent_id = existing.get("parent_session_id")

    # تسجيل الأحداث حسب التغيير
    new_status = update_data.get("status")
    if new_status == "completed":
        if is_prayer and prayer_name:
            note = f"✅ اكتملت جولة {prayer_name}\n   المنفذ: {actor}"
            icon = "✅"
            action = "prayer_completed"
        else:
            note = f"🏁 اكتملت الجولة اليومية بالكامل\n   المنفذ: {actor}\n   التاريخ: {existing.get('date','')}"
            icon = "🏁"
            action = "session_completed"
        await _push_session_event(session_id, action, actor, note, icon)
        if parent_id and is_prayer:
            await _push_session_event(parent_id, action, actor,
                f"✅ اكتملت جولة {prayer_name}\n   المنفذ: {actor}", "✅")

    elif new_status == "skipped":
        note = f"⏭️ تم تجاوز جولة {prayer_name or 'الصلاة'}\n   المنفذ: {actor}"
        await _push_session_event(session_id, "prayer_skipped", actor, note, "⏭️")
        if parent_id:
            await _push_session_event(parent_id, "prayer_skipped", actor,
                f"⏭️ تجاوز {prayer_name or 'الصلاة'}\n   المنفذ: {actor}", "⏭️")

    elif new_status == "draft" and existing.get("status") in ("skipped", "completed"):
        verb = "فك تجاوز" if existing.get("status") == "skipped" else "إعادة فتح"
        note = f"🔄 {verb} جولة {prayer_name or 'الجولة'}\n   المنفذ: {actor}"
        await _push_session_event(session_id, "session_reopened", actor, note, "🔄")
        if parent_id:
            await _push_session_event(parent_id, "session_reopened", actor,
                f"🔄 {verb} {prayer_name or 'الجولة'}\n   المنفذ: {actor}", "🔄")

    elif update_data.get("supervisor_notes") and update_data["supervisor_notes"] != existing.get("supervisor_notes",""):
        note_text = update_data["supervisor_notes"][:120]
        await _push_session_event(session_id, "notes_added", actor,
            f"📝 ملاحظات المشرف:\n   {note_text}", "📝")

    await db.map_sessions.update_one({"id": session_id}, {"$set": update_data})
    updated = await db.map_sessions.find_one({"id": session_id}, {"_id": 0})
    return updated


@router.delete("/admin/map-sessions/{session_id}")
async def delete_map_session(session_id: str, admin: dict = Depends(require_department_manager)):
    result = await db.map_sessions.delete_one({"id": session_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="الجلسة غير موجودة")
    await log_activity("حذف جلسة خريطة", admin, session_id, "تم الحذف")
    return {"message": "تم حذف الجلسة بنجاح"}


@router.post("/admin/map-sessions/batch")
async def batch_create_sessions(request: Request, admin: dict = Depends(require_department_manager)):
    body = await request.json()
    start_date = body.get("start_date")
    end_date = body.get("end_date")
    floor_id = body.get("floor_id")
    clone_from = body.get("clone_from", "master")
    if not start_date or not end_date or not floor_id:
        raise HTTPException(status_code=400, detail="يجب تحديد تاريخ البداية والنهاية والطابق")
    floor = await db.map_floors.find_one({"id": floor_id}, {"_id": 0})
    if not floor:
        raise HTTPException(status_code=404, detail="الطابق غير موجود")

    zones_template = []
    if clone_from == "empty":
        pass
    elif clone_from == "master":
        master_zones = await db.map_zones.find({"floor_id": floor_id, "is_active": True}, {"_id": 0}).to_list(500)
        for z in master_zones:
            zones_template.append({"original_zone_id": z.get("id"), "floor_id": z.get("floor_id"), "zone_code": z.get("zone_code", ""), "name_ar": z.get("name_ar", ""), "name_en": z.get("name_en", ""), "zone_type": z.get("zone_type", "service"), "polygon_points": z.get("polygon_points", []), "fill_color": z.get("fill_color", "#22c55e"), "stroke_color": z.get("stroke_color", "#000000"), "opacity": z.get("opacity", 0.4), "stroke_opacity": z.get("stroke_opacity", 1.0), "max_capacity": z.get("max_capacity", 1000), "area_sqm": z.get("area_sqm", 0), "per_person_sqm": z.get("per_person_sqm", 0.8), "description_ar": z.get("description_ar"), "description_en": z.get("description_en"), "change_type": "unchanged", "is_removed": False, "assigned_employee_ids": []})
    else:
        prev_session = await db.map_sessions.find_one({"id": clone_from}, {"_id": 0})
        if prev_session and prev_session.get("zones"):
            for z in prev_session["zones"]:
                if z.get("is_removed"):
                    continue
                zones_template.append({"original_zone_id": z.get("original_zone_id"), "floor_id": z.get("floor_id"), "zone_code": z.get("zone_code", ""), "name_ar": z.get("name_ar", ""), "name_en": z.get("name_en", ""), "zone_type": z.get("zone_type", "service"), "polygon_points": z.get("polygon_points", []), "fill_color": z.get("fill_color", "#22c55e"), "stroke_color": z.get("stroke_color", "#000000"), "opacity": z.get("opacity", 0.4), "stroke_opacity": z.get("stroke_opacity", 1.0), "max_capacity": z.get("max_capacity", 1000), "area_sqm": z.get("area_sqm", 0), "per_person_sqm": z.get("per_person_sqm", 0.8), "description_ar": z.get("description_ar"), "description_en": z.get("description_en"), "change_type": "unchanged", "is_removed": False, "assigned_employee_ids": []})

    from datetime import date as date_type
    start = date_type.fromisoformat(start_date)
    end = date_type.fromisoformat(end_date)
    if end < start:
        raise HTTPException(status_code=400, detail="تاريخ النهاية يجب أن يكون بعد تاريخ البداية")
    if (end - start).days > 60:
        raise HTTPException(status_code=400, detail="الحد الأقصى 60 يوماً")

    created, skipped = [], []
    current = start
    while current <= end:
        date_str = current.isoformat()
        existing = await db.map_sessions.find_one({"date": date_str, "floor_id": floor_id}, {"_id": 0})
        if existing:
            skipped.append(date_str)
            current += timedelta(days=1)
            continue
        session_zones = []
        for zt in zones_template:
            zone_copy = copy.deepcopy(zt)
            zone_copy["id"] = str(uuid.uuid4())
            session_zones.append(zone_copy)
        session = MapSession(date=date_str, floor_id=floor_id, floor_name=floor.get("name_ar", ""), status="draft", created_by=admin.get("name", ""), zones=session_zones, changes_summary={"added": 0, "removed": 0, "modified": 0, "unchanged": len(session_zones)})
        doc = session.model_dump()
        await db.map_sessions.insert_one(doc)
        created.append(date_str)
        current += timedelta(days=1)
    await log_activity("إنشاء جلسات متعددة", admin, floor_id, f"تم إنشاء {len(created)} جلسة")
    return {"created": created, "skipped": skipped, "total_created": len(created), "total_skipped": len(skipped)}


def _recalc_summary(zones):
    summary = {"added": 0, "removed": 0, "modified": 0, "unchanged": 0}
    for z in zones:
        ct = z.get("change_type", "unchanged")
        if ct == "added": summary["added"] += 1
        elif ct in ("removed",): summary["removed"] += 1
        elif ct in ("modified", "category_changed", "moved"): summary["modified"] += 1
        else: summary["unchanged"] += 1
    return summary


def _now_iso():
    return datetime.now(timezone.utc).isoformat()

# ── أسماء أنواع المصليات ──────────────────────────────────────
ZONE_TYPE_AR = {
    "men_prayer":"مصلى رجال","women_prayer":"مصلى نساء","mixed_prayer":"مصلى مختلط",
    "children_prayer":"مصلى أطفال","elderly_prayer":"مصلى كبار السن",
    "disabled_prayer":"مصلى ذوي الاحتياجات","quran_recitation":"حلقة قرآن",
    "lecture_hall":"قاعة محاضرات","emergency_exit":"مخرج طوارئ","storage":"مخزن",
    "service_area":"منطقة خدمات","corridor":"ممر","wudu_area":"منطقة وضوء",
    "men_only":"رجال فقط","women_only":"نساء فقط",
}

# ── أسماء أوقات الصلاة ──────────────────────────────────────
PRAYER_AR = {
    "fajr":"الفجر","sunrise":"الشروق","duha":"الضحى","dhuhr":"الظهر",
    "asr":"العصر","maghrib":"المغرب","isha":"العشاء","tarawih":"التراويح",
}

def _zt(key: str) -> str:
    return ZONE_TYPE_AR.get(key, key or "غير محدد")

def _pt(key: str) -> str:
    return PRAYER_AR.get(key, key or "صلاة")


def _push_history(zone: dict, action: str, by: str, note: str = "") -> dict:
    if "history" not in zone:
        zone["history"] = []
    zone["history"].append({"action":action,"by":by,"at":_now_iso(),"note":note})
    return zone


async def _push_session_event(session_id: str, action: str, by: str, note: str, icon: str = "📌"):
    """يسجّل حدث على مستوى الجلسة كاملة (للصلوات والإنهاء والملاحظات)"""
    event = {"action":action,"by":by,"at":_now_iso(),"note":note,"icon":icon}
    await db.map_sessions.update_one(
        {"id": session_id},
        {"$push": {"session_history": event}, "$set": {"updated_at": _now_iso()}}
    )


@router.put("/admin/map-sessions/{session_id}/zones/{zone_id}")
async def update_session_zone(session_id: str, zone_id: str, data: SessionZoneUpdate, admin: dict = Depends(require_department_manager)):
    session = await db.map_sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="الجلسة غير موجودة")
    if session.get("status") == "completed":
        raise HTTPException(status_code=400, detail="لا يمكن تعديل جلسة مكتملة - أعد فتحها أولاً")
    zones = session.get("zones", [])
    zone_idx = next((i for i, z in enumerate(zones) if z["id"] == zone_id), None)
    if zone_idx is None:
        raise HTTPException(status_code=404, detail="المنطقة غير موجودة في هذه الجلسة")

    update_fields = {k: v for k, v in data.model_dump().items() if v is not None}
    zone = zones[zone_idx]
    zone_name = zone.get('name_ar') or zone.get('zone_code') or 'منطقة'
    actor = admin.get("name", "النظام")

    if update_fields.get("is_removed"):
        zone["change_type"] = "removed"
        _push_history(zone, "removed", actor,
            f"🗑️ تم حذف منطقة «{zone_name}»"
            f"\n   الفئة: {_zt(zone.get('zone_type',''))}"
            f"\n   الطاقة: {zone.get('max_capacity',0)} مصلٍّ")
    else:
        # تجميع كل التغييرات في سجل واحد شامل
        all_changes = []
        new_action = "modified"

        if update_fields.get("zone_type") and update_fields["zone_type"] != zone.get("zone_type"):
            old_t = _zt(zone.get("zone_type",""))
            new_t = _zt(update_fields["zone_type"])
            all_changes.append(f"الفئة: {old_t} → {new_t}")
            new_action = "category_changed"

        if update_fields.get("polygon_points"):
            pts_old = len(zone.get("polygon_points",[]))
            pts_new = len(update_fields["polygon_points"])
            all_changes.append(f"الحدود: {pts_old} → {pts_new} نقطة")
            if new_action == "modified": new_action = "moved"

        if "name_ar" in update_fields and update_fields["name_ar"] != zone.get("name_ar"):
            all_changes.append(f"الاسم: «{zone.get('name_ar','')}» → «{update_fields['name_ar']}»")

        if "max_capacity" in update_fields and update_fields["max_capacity"] != zone.get("max_capacity"):
            old_c, new_c = zone.get("max_capacity",0), update_fields["max_capacity"]
            diff = new_c - old_c
            sign = "▲" if diff > 0 else "▼"
            all_changes.append(f"الطاقة: {old_c} → {new_c} مصلٍّ ({sign}{abs(diff)})")

        if "fill_color" in update_fields and update_fields["fill_color"] != zone.get("fill_color"):
            all_changes.append(f"اللون: {zone.get('fill_color','?')} → {update_fields['fill_color']}")

        if "per_person_sqm" in update_fields and update_fields["per_person_sqm"] != zone.get("per_person_sqm"):
            all_changes.append(f"م²/شخص: {zone.get('per_person_sqm',0)} → {update_fields['per_person_sqm']}")

        if "area_sqm" in update_fields and update_fields["area_sqm"] != zone.get("area_sqm"):
            all_changes.append(f"المساحة: {zone.get('area_sqm',0)} → {update_fields['area_sqm']} م²")

        if "daily_note" in update_fields and update_fields["daily_note"] != zone.get("daily_note",""):
            new_note = update_fields["daily_note"]
            all_changes.append(f"ملاحظة: {new_note[:80] or '(حُذفت)'}")

        if "fill_type" in update_fields and update_fields["fill_type"] != zone.get("fill_type"):
            ft = lambda k: {"solid":"لون صلب","pattern":"نقش"}.get(k,k)
            all_changes.append(f"التعبئة: {ft(zone.get('fill_type',''))} → {ft(update_fields['fill_type'])}")

        if all_changes:
            action_icons = {"category_changed":"🔄","moved":"📐","modified":"✏️"}
            icon = action_icons.get(new_action,"✏️")
            full_note = f"{icon} تعديل «{zone_name}»\n   " + "\n   ".join(all_changes)
            zone["change_type"] = new_action
            _push_history(zone, new_action, actor, full_note)

    for k, v in update_fields.items():
        zone[k] = v
    zones[zone_idx] = zone
    summary = _recalc_summary(zones)
    await db.map_sessions.update_one({"id": session_id}, {"$set": {"zones": zones, "changes_summary": summary, "updated_at": _now_iso()}})
    updated = await db.map_sessions.find_one({"id": session_id}, {"_id": 0})
    return updated


@router.post("/admin/map-sessions/{session_id}/zones")
async def add_session_zone(session_id: str, request: Request, admin: dict = Depends(require_department_manager)):
    session = await db.map_sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="الجلسة غير موجودة")
    if session.get("status") == "completed":
        raise HTTPException(status_code=400, detail="لا يمكن إضافة مناطق لجلسة مكتملة - أعد فتحها أولاً")
    body = await request.json()
    actor = admin.get("name", "النظام")
    zone_name = body.get('name_ar', 'منطقة جديدة')
    zone_type  = _zt(body.get('zone_type', ''))
    capacity   = body.get('max_capacity', 0)
    area       = body.get('area_sqm', 0)
    new_zone = SessionZone(
        floor_id=session["floor_id"],
        zone_code=body.get("zone_code", "NEW"),
        name_ar=zone_name,
        name_en=body.get("name_en", "New Zone"),
        zone_type=body.get("zone_type", "men_prayer"),
        polygon_points=body.get("polygon_points", []),
        fill_color=body.get("fill_color", "#22c55e"),
        stroke_color=body.get("stroke_color", "#000000"),
        opacity=body.get("opacity", 0.4),
        stroke_opacity=body.get("stroke_opacity", 1.0),
        fill_type=body.get("fill_type", "solid"),
        pattern_type=body.get("pattern_type"),
        pattern_fg_color=body.get("pattern_fg_color", "#000000"),
        pattern_bg_color=body.get("pattern_bg_color", "#ffffff"),
        max_capacity=capacity,
        area_sqm=area,
        change_type="added",
    )
    zone_dict = new_zone.model_dump()
    _push_history(zone_dict, "added", actor,
        f"➕ إضافة منطقة جديدة «{zone_name}»"
        f"\n   الفئة: {zone_type}"
        f"\n   الطاقة: {capacity} مصلٍّ"
        + (f"\n   المساحة: {area} م²" if area else "")
        + f"\n   الكود: {body.get('zone_code','')}"
    )
    zones = session.get("zones", [])
    zones.append(zone_dict)
    summary = _recalc_summary(zones)
    await db.map_sessions.update_one({"id": session_id}, {"$set": {"zones": zones, "changes_summary": summary, "updated_at": _now_iso()}})
    updated = await db.map_sessions.find_one({"id": session_id}, {"_id": 0})
    return updated


@router.delete("/admin/map-sessions/{session_id}/zones/{zone_id}")
async def remove_session_zone(session_id: str, zone_id: str, admin: dict = Depends(require_department_manager)):
    session = await db.map_sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="الجلسة غير موجودة")
    if session.get("status") == "completed":
        raise HTTPException(status_code=400, detail="لا يمكن حذف مناطق من جلسة مكتملة - أعد فتحها أولاً")
    zones = session.get("zones", [])
    zone_idx = next((i for i, z in enumerate(zones) if z["id"] == zone_id), None)
    if zone_idx is None:
        raise HTTPException(status_code=404, detail="المنطقة غير موجودة")
    zone = zones[zone_idx]
    zone_name = zone.get('name_ar') or zone.get('zone_code') or 'منطقة'
    actor = admin.get("name", "النظام")
    # Soft delete مع تسجيل كامل
    zone["is_removed"] = True
    zone["change_type"] = "removed"
    pts_count = len(zone.get("polygon_points", []))
    _push_history(zone, "removed", actor,
        f"🗑️ حذف منطقة «{zone_name}»"
        f"\n   الفئة: {_zt(zone.get('zone_type',''))}"
        f"\n   الطاقة: {zone.get('max_capacity', 0)} مصلٍّ"
        f"\n   عدد نقاط الحدود: {pts_count}"
        + (f"\n   ملاحظة: {zone.get('daily_note','')}" if zone.get('daily_note') else "")
    )
    zones[zone_idx] = zone
    summary = _recalc_summary(zones)
    await db.map_sessions.update_one(
        {"id": session_id},
        {"$set": {"zones": zones, "changes_summary": summary, "updated_at": _now_iso()}}
    )
    updated = await db.map_sessions.find_one({"id": session_id}, {"_id": 0})
    return updated


@router.put("/admin/map-sessions/{session_id}/density-batch")
async def batch_update_density(session_id: str, data: dict = Body(...), admin: dict = Depends(require_department_manager)):
    session = await db.map_sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="الجلسة غير موجودة")
    updates = data.get("updates", [])
    zones = session.get("zones", [])
    for upd in updates:
        zid = upd.get("zone_id")
        for z in zones:
            if z["id"] == zid:
                if "current_count" in upd and upd["current_count"] is not None:
                    z["current_count"] = max(0, int(upd["current_count"]))
                if "max_capacity" in upd and upd["max_capacity"] is not None:
                    z["max_capacity"] = max(1, int(upd["max_capacity"]))
                if "prayer_counts" in upd and upd["prayer_counts"] is not None:
                    existing = z.get("prayer_counts", {"fajr": 0, "dhuhr": 0, "asr": 0, "maghrib": 0, "isha": 0, "taraweeh": 0})
                    for prayer, count in upd["prayer_counts"].items():
                        if prayer in existing:
                            existing[prayer] = max(0, int(count))
                    z["prayer_counts"] = existing
                break
    await db.map_sessions.update_one({"id": session_id}, {"$set": {"zones": zones, "updated_at": datetime.now(timezone.utc).isoformat()}})
    updated = await db.map_sessions.find_one({"id": session_id}, {"_id": 0})
    return updated


@router.get("/map-sessions/compare/{session_id_1}/{session_id_2}")
async def compare_sessions(session_id_1: str, session_id_2: str):
    s1 = await db.map_sessions.find_one({"id": session_id_1}, {"_id": 0})
    s2 = await db.map_sessions.find_one({"id": session_id_2}, {"_id": 0})
    if not s1 or not s2:
        raise HTTPException(status_code=404, detail="إحدى الجلستين غير موجودة")
    zones1 = {z.get("original_zone_id") or z["id"]: z for z in s1.get("zones", []) if not z.get("is_removed")}
    zones2 = {z.get("original_zone_id") or z["id"]: z for z in s2.get("zones", []) if not z.get("is_removed")}
    added, removed, modified, unchanged = [], [], [], []
    for key in set(list(zones1.keys()) + list(zones2.keys())):
        in_s1 = key in zones1
        in_s2 = key in zones2
        if in_s1 and not in_s2: removed.append(zones1[key])
        elif in_s2 and not in_s1: added.append(zones2[key])
        else:
            z1, z2 = zones1[key], zones2[key]
            if z1.get("zone_type") != z2.get("zone_type") or z1.get("name_ar") != z2.get("name_ar"):
                modified.append({"before": z1, "after": z2})
            else:
                unchanged.append(z2)
    return {"session_1": {"id": s1["id"], "date": s1["date"]}, "session_2": {"id": s2["id"], "date": s2["date"]}, "added": added, "removed": removed, "modified": modified, "unchanged_count": len(unchanged)}


# ============= Daily Gate Sessions =============
def _build_gate_snapshot(marker, master_gate=None):
    snap = {
        "id": str(uuid.uuid4()), "original_marker_id": marker.get("id"),
        "gate_id": marker.get("gate_id"), "floor_id": marker.get("floor_id"),
        "name_ar": marker.get("name_ar", ""), "name_en": marker.get("name_en", ""),
        "x": marker.get("x", 50), "y": marker.get("y", 50),
        "gate_type": marker.get("gate_type", "main"), "direction": marker.get("direction", "both"),
        "classification": marker.get("classification", "general"),
        "plaza": marker.get("plaza", ""), "plaza_color": marker.get("plaza_color", ""),
        "category": marker.get("category", []),
        "status": marker.get("status", "open"), "indicator": marker.get("indicator", "light"),
        "current_flow": marker.get("current_flow", 0), "max_flow": marker.get("max_flow", 5000),
        "assigned_staff": marker.get("assigned_staff", 0), "is_removed": False, "change_type": "unchanged",
    }
    if master_gate:
        snap["plaza"] = master_gate.get("plaza", snap["plaza"])
        snap["plaza_color"] = master_gate.get("plaza_color", snap["plaza_color"])
        snap["category"] = master_gate.get("category", snap["category"])
    return snap


async def _enrich_gates_with_master(gates_snapshot):
    """Enrich session gates with plaza/category from master gates collection."""
    master_gates = await db.gates.find({}, {"_id": 0}).to_list(500)
    name_map = {g.get("name"): g for g in master_gates}
    for gs in gates_snapshot:
        mg = name_map.get(gs.get("name_ar"))
        if mg:
            if not gs.get("plaza"):
                gs["plaza"] = mg.get("plaza", "")
            if not gs.get("plaza_color"):
                gs["plaza_color"] = mg.get("plaza_color", "")
            if not gs.get("category"):
                gs["category"] = mg.get("category", [])


@router.get("/gate-sessions")
async def get_gate_sessions(floor_id: Optional[str] = None, limit: int = 60):
    query = {}
    if floor_id:
        query["floor_id"] = floor_id
    sessions = await db.gate_sessions.find(query, {"_id": 0}).sort("date", -1).to_list(limit)
    return sessions


@router.get("/gate-sessions/{session_id}")
async def get_gate_session(session_id: str):
    session = await db.gate_sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="الجلسة غير موجودة")
    return session


@router.post("/admin/gate-sessions")
async def create_gate_session(data: GateSessionCreate, admin: dict = Depends(require_department_manager)):
    existing = await db.gate_sessions.find_one({"date": data.date, "floor_id": data.floor_id}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="توجد جلسة بالفعل لهذا التاريخ والطابق")
    floor = await db.gate_map_floors.find_one({"id": data.floor_id}, {"_id": 0})
    if not floor:
        raise HTTPException(status_code=404, detail="الطابق غير موجود")
    gates_snapshot = []
    if data.clone_from == "empty":
        pass
    elif data.clone_from and data.clone_from != "master":
        prev = await db.gate_sessions.find_one({"id": data.clone_from}, {"_id": 0})
        if prev and prev.get("gates"):
            for g in prev["gates"]:
                if not g.get("is_removed"):
                    gates_snapshot.append(_build_gate_snapshot(g))
    else:
        if data.clone_from != "master":
            prev = await db.gate_sessions.find_one({"floor_id": data.floor_id, "date": {"$lt": data.date}}, {"_id": 0}, sort=[("date", -1)])
            if prev and prev.get("gates"):
                for g in prev["gates"]:
                    if not g.get("is_removed"):
                        gates_snapshot.append(_build_gate_snapshot(g))
        if not gates_snapshot:
            markers = await db.gate_markers.find({"floor_id": data.floor_id}, {"_id": 0}).to_list(500)
            for m in markers:
                gates_snapshot.append(_build_gate_snapshot(m))
    await _enrich_gates_with_master(gates_snapshot)
    session = GateSession(date=data.date, floor_id=data.floor_id, floor_name=floor.get("name_ar", ""), created_by=admin.get("name", ""), gates=gates_snapshot, changes_summary={"added": 0, "removed": 0, "modified": 0, "unchanged": len(gates_snapshot)})
    doc = session.model_dump()
    await db.gate_sessions.insert_one(doc)
    result = doc.copy()
    result.pop("_id", None)
    return result


@router.put("/admin/gate-sessions/{session_id}")
async def update_gate_session(session_id: str, data: GateSessionUpdate, admin: dict = Depends(require_department_manager)):
    existing = await db.gate_sessions.find_one({"id": session_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="الجلسة غير موجودة")
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.gate_sessions.update_one({"id": session_id}, {"$set": update_data})
    return await db.gate_sessions.find_one({"id": session_id}, {"_id": 0})


@router.delete("/admin/gate-sessions/{session_id}")
async def delete_gate_session(session_id: str, admin: dict = Depends(require_department_manager)):
    result = await db.gate_sessions.delete_one({"id": session_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="الجلسة غير موجودة")
    return {"message": "تم حذف الجلسة بنجاح"}


@router.put("/admin/gate-sessions/{session_id}/gates/{gate_id}")
async def update_session_gate(session_id: str, gate_id: str, data: SessionGateUpdate, admin: dict = Depends(require_department_manager)):
    session = await db.gate_sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="الجلسة غير موجودة")
    gates = session.get("gates", [])
    idx = next((i for i, g in enumerate(gates) if g["id"] == gate_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="الباب غير موجود")
    update_fields = {k: v for k, v in data.model_dump().items() if v is not None}
    gate = gates[idx]
    if update_fields.get("is_removed"): gate["change_type"] = "removed"
    elif update_fields.get("status") and update_fields["status"] != gate.get("status"): gate["change_type"] = "status_changed"
    elif any(k in update_fields for k in ["direction", "classification", "assigned_staff", "name_ar"]): gate["change_type"] = "modified"
    for k, v in update_fields.items():
        gate[k] = v
    gates[idx] = gate
    summary = {"added": 0, "removed": 0, "modified": 0, "unchanged": 0}
    for g in gates:
        ct = g.get("change_type", "unchanged")
        if ct == "added": summary["added"] += 1
        elif ct == "removed": summary["removed"] += 1
        elif ct in ("modified", "status_changed"): summary["modified"] += 1
        else: summary["unchanged"] += 1
    await db.gate_sessions.update_one({"id": session_id}, {"$set": {"gates": gates, "changes_summary": summary, "updated_at": datetime.now(timezone.utc).isoformat()}})
    return await db.gate_sessions.find_one({"id": session_id}, {"_id": 0})


@router.post("/admin/gate-sessions/batch")
async def batch_create_gate_sessions(request: Request, admin: dict = Depends(require_department_manager)):
    body = await request.json()
    start_date, end_date, floor_id = body.get("start_date"), body.get("end_date"), body.get("floor_id")
    clone_from = body.get("clone_from", "master")
    if not all([start_date, end_date, floor_id]):
        raise HTTPException(status_code=400, detail="يجب تحديد تاريخ البداية والنهاية والطابق")
    floor = await db.gate_map_floors.find_one({"id": floor_id}, {"_id": 0})
    if not floor:
        raise HTTPException(status_code=404, detail="الطابق غير موجود")
    template = []
    if clone_from != "empty":
        if clone_from == "master":
            markers = await db.gate_markers.find({"floor_id": floor_id}, {"_id": 0}).to_list(500)
            template = [_build_gate_snapshot(m) for m in markers]
        else:
            prev = await db.gate_sessions.find_one({"id": clone_from}, {"_id": 0})
            if prev:
                template = [_build_gate_snapshot(g) for g in prev.get("gates", []) if not g.get("is_removed")]
    from datetime import date as date_type
    start = date_type.fromisoformat(start_date)
    end = date_type.fromisoformat(end_date)
    if (end - start).days > 60:
        raise HTTPException(status_code=400, detail="الحد الأقصى 60 يوماً")
    created, skipped = [], []
    current = start
    while current <= end:
        ds = current.isoformat()
        if await db.gate_sessions.find_one({"date": ds, "floor_id": floor_id}, {"_id": 0}):
            skipped.append(ds)
        else:
            sg = []
            for t in template:
                gate_copy = copy.deepcopy(t)
                gate_copy["id"] = str(uuid.uuid4())
                sg.append(gate_copy)
            session = GateSession(date=ds, floor_id=floor_id, floor_name=floor.get("name_ar", ""), created_by=admin.get("name", ""), gates=sg, changes_summary={"added": 0, "removed": 0, "modified": 0, "unchanged": len(sg)})
            doc = session.model_dump()
            await db.gate_sessions.insert_one(doc)
            created.append(ds)
        current += timedelta(days=1)
    return {"created": created, "skipped": skipped, "total_created": len(created), "total_skipped": len(skipped)}
