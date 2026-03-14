"""Gates Import/Export — Excel bulk operations"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from typing import Optional
from datetime import datetime, timezone
import uuid
import io

from database import db
from auth import get_current_user, require_department_manager, log_activity

router = APIRouter()

GATE_COLUMNS = ["number", "name", "plaza", "gate_type", "direction", "category", "classification", "status", "max_flow"]
GATE_HEADERS_AR = ["رقم الباب", "اسم الباب", "المنطقة", "النوع", "المسار", "الفئة", "التصنيف", "الحالة", "السعة القصوى"]

COLUMN_MAP = {
    "رقم الباب": "number", "Number": "number",
    "اسم الباب": "name", "Name": "name",
    "المنطقة": "plaza", "Plaza": "plaza",
    "النوع": "gate_type", "Type": "gate_type",
    "المسار": "direction", "Direction": "direction",
    "الفئة": "category", "Category": "category",
    "التصنيف": "classification", "Classification": "classification",
    "الحالة": "status", "Status": "status",
    "السعة القصوى": "max_flow", "Max Flow": "max_flow",
}


@router.get("/gates/export")
async def export_gates(user: dict = Depends(get_current_user)):
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from fastapi.responses import StreamingResponse

    gates = await db.gates.find({}, {"_id": 0}).sort("number", 1).to_list(5000)

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "الأبواب"
    ws.sheet_view.rightToLeft = True

    header_font = Font(name="Cairo", bold=True, size=11, color="FFFFFF")
    header_fill = PatternFill(start_color="047857", end_color="047857", fill_type="solid")
    header_align = Alignment(horizontal="center", vertical="center")
    thin_border = Border(
        left=Side(style="thin", color="D1D5DB"), right=Side(style="thin", color="D1D5DB"),
        top=Side(style="thin", color="D1D5DB"), bottom=Side(style="thin", color="D1D5DB"),
    )

    for col_idx, header in enumerate(GATE_HEADERS_AR, 1):
        cell = ws.cell(row=1, column=col_idx, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_align
        cell.border = thin_border

    for row_idx, gate in enumerate(gates, 2):
        for col_idx, field in enumerate(GATE_COLUMNS, 1):
            val = gate.get(field, "")
            if isinstance(val, list):
                val = " + ".join(val)
            cell = ws.cell(row=row_idx, column=col_idx, value=val)
            cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.border = thin_border

    for col_idx in range(1, len(GATE_COLUMNS) + 1):
        ws.column_dimensions[openpyxl.utils.get_column_letter(col_idx)].width = 18

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                             headers={"Content-Disposition": "attachment; filename=gates.xlsx"})


@router.get("/gates/export/template")
async def download_gates_template():
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from fastapi.responses import StreamingResponse

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "قالب الأبواب"
    ws.sheet_view.rightToLeft = True

    header_font = Font(name="Cairo", bold=True, size=11, color="FFFFFF")
    header_fill = PatternFill(start_color="1D4ED8", end_color="1D4ED8", fill_type="solid")
    example_fill = PatternFill(start_color="F0F9FF", end_color="F0F9FF", fill_type="solid")
    thin_border = Border(
        left=Side(style="thin", color="D1D5DB"), right=Side(style="thin", color="D1D5DB"),
        top=Side(style="thin", color="D1D5DB"), bottom=Side(style="thin", color="D1D5DB"),
    )

    for col_idx, header in enumerate(GATE_HEADERS_AR, 1):
        cell = ws.cell(row=1, column=col_idx, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = thin_border

    example = ["1", "باب الملك عبدالعزيز", "الساحة الشمالية", "رئيسي", "دخول", "محرمين", "عام", "مفتوح", "5000"]
    for col_idx, val in enumerate(example, 1):
        cell = ws.cell(row=2, column=col_idx, value=val)
        cell.fill = example_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = thin_border

    for col_idx in range(1, len(GATE_COLUMNS) + 1):
        ws.column_dimensions[openpyxl.utils.get_column_letter(col_idx)].width = 20

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                             headers={"Content-Disposition": "attachment; filename=gates_template.xlsx"})


@router.post("/gates/import")
async def import_gates(file: UploadFile = File(...), user: dict = Depends(require_department_manager)):
    import openpyxl

    content = await file.read()
    wb = openpyxl.load_workbook(io.BytesIO(content))
    ws = wb.active

    headers = [str(cell.value or "").strip() for cell in ws[1]]
    col_map = {}
    for idx, h in enumerate(headers):
        if h in COLUMN_MAP:
            col_map[COLUMN_MAP[h]] = idx

    if "name" not in col_map:
        raise HTTPException(status_code=400, detail="عمود 'اسم الباب' مطلوب في الملف")

    added = 0
    skipped = 0
    for row in ws.iter_rows(min_row=2, values_only=False):
        vals = [str(cell.value or "").strip() for cell in row]
        if not any(vals):
            continue

        name = vals[col_map["name"]] if "name" in col_map else ""
        if not name:
            skipped += 1
            continue

        existing = await db.gates.find_one({"name": name}, {"_id": 0})
        if existing:
            skipped += 1
            continue

        gate = {
            "id": str(uuid.uuid4()),
            "number": vals[col_map.get("number", -1)] if "number" in col_map and col_map["number"] < len(vals) else "",
            "name": name,
            "plaza": vals[col_map.get("plaza", -1)] if "plaza" in col_map and col_map["plaza"] < len(vals) else "",
            "gate_type": vals[col_map.get("gate_type", -1)] if "gate_type" in col_map and col_map["gate_type"] < len(vals) else "رئيسي",
            "direction": vals[col_map.get("direction", -1)] if "direction" in col_map and col_map["direction"] < len(vals) else "دخول",
            "category": [c.strip() for c in (vals[col_map.get("category", -1)] if "category" in col_map and col_map["category"] < len(vals) else "").split("+")] if "category" in col_map else [],
            "classification": vals[col_map.get("classification", -1)] if "classification" in col_map and col_map["classification"] < len(vals) else "عام",
            "status": vals[col_map.get("status", -1)] if "status" in col_map and col_map["status"] < len(vals) else "مفتوح",
            "max_flow": int(vals[col_map.get("max_flow", -1)] or 5000) if "max_flow" in col_map and col_map["max_flow"] < len(vals) else 5000,
            "current_flow": 0,
            "current_indicator": "خفيف",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.gates.insert_one({**gate})
        added += 1

    await log_activity("استيراد أبواب", user, f"{added}", f"تم استيراد {added} باب، تخطي {skipped}")
    return {"message": f"تم استيراد {added} باب بنجاح", "added": added, "skipped": skipped}
