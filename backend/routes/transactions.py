from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import io

from database import db
from auth import get_current_user, log_activity, require_page_permission, check_department_access
from models import Transaction, TransactionCreate, TransactionUpdate

router = APIRouter()


@router.get("/transactions")
async def get_transactions(department: Optional[str] = None, status: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if user.get("role") == "department_manager":
        query["department"] = user.get("department")
    elif department:
        query["department"] = department
    if status:
        query["status"] = status
    transactions = await db.transactions.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return transactions


@router.get("/transactions/stats")
async def get_transaction_stats(department: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if user.get("role") == "department_manager":
        query["department"] = user.get("department")
    elif department:
        query["department"] = department
    all_transactions = await db.transactions.find(query, {"_id": 0}).to_list(1000)
    completed = len([t for t in all_transactions if t.get("status") == "completed"])
    in_progress = len([t for t in all_transactions if t.get("status") == "in_progress"])
    pending = len([t for t in all_transactions if t.get("status") == "pending"])
    overdue = 0
    for t in all_transactions:
        if t.get("status") in ["pending", "in_progress"]:
            created = datetime.fromisoformat(t["created_at"])
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) - created > timedelta(days=7):
                overdue += 1
    return {"total": len(all_transactions), "completed": completed, "in_progress": in_progress, "pending": pending, "overdue": overdue}


@router.post("/transactions")
async def create_transaction(transaction: TransactionCreate, user: dict = Depends(get_current_user)):
    await require_page_permission(user, "/transactions", require_edit=True)
    if user.get("role") == "department_manager" and transaction.department != user.get("department"):
        raise HTTPException(status_code=403, detail="لا يمكنك إنشاء معاملات لإدارة أخرى")
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


@router.put("/transactions/{transaction_id}")
async def update_transaction(transaction_id: str, transaction: TransactionUpdate, user: dict = Depends(get_current_user)):
    await require_page_permission(user, "/transactions", require_edit=True)
    existing = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="المعاملة غير موجودة")
    if user.get("role") == "department_manager" and existing.get("department") != user.get("department"):
        raise HTTPException(status_code=403, detail="لا يمكنك تعديل معاملات إدارة أخرى")
    update_data = {k: v for k, v in transaction.model_dump().items() if v is not None}
    if update_data.get("status") == "completed" and existing.get("status") != "completed":
        if existing.get("status") not in ["pending", "in_progress"]:
            raise HTTPException(status_code=400, detail="لا يمكن إكمال المعاملة إلا إذا كانت معلقة أو قيد التنفيذ")
        update_data["completed_date"] = datetime.now(timezone.utc).isoformat()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.transactions.update_one({"id": transaction_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="المعاملة غير موجودة")
    await log_activity("تحديث معاملة", user, transaction_id, "تحديث الحالة")
    updated = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    return updated


@router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str, user: dict = Depends(get_current_user)):
    transaction = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="المعاملة غير موجودة")
    user_role = user.get("role")
    user_dept = user.get("department")
    trans_dept = transaction.get("department")
    if user_role == "system_admin":
        pass
    elif user_role == "department_manager":
        if user_dept != trans_dept:
            raise HTTPException(status_code=403, detail="لا يمكنك حذف معاملات قسم آخر")
    else:
        from auth import check_page_permission
        has_perm = await check_page_permission(user, "tab=transactions", require_edit=True)
        if not has_perm:
            raise HTTPException(status_code=403, detail="ليس لديك صلاحية الحذف")
    await db.transactions.delete_one({"id": transaction_id})
    await log_activity("حذف معاملة", user, transaction_id, "تم الحذف")
    return {"message": "تم حذف المعاملة بنجاح"}


@router.get("/transactions/export/pdf")
async def export_transactions_pdf(user: dict = Depends(get_current_user)):
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib import colors
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from arabic_reshaper import reshape
    from bidi.algorithm import get_display

    query = {}
    if user.get("role") == "department_manager":
        query["department"] = user.get("department")
    transactions = await db.transactions.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4), rightMargin=10*mm, leftMargin=10*mm, topMargin=15*mm, bottomMargin=15*mm)
    elements = []
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'], fontSize=16, textColor=colors.HexColor('#004D38'), alignment=1)
    title = Paragraph("Administrative Transactions Report<br/>تقرير المعاملات الإدارية", title_style)
    elements.append(title)
    elements.append(Spacer(1, 10*mm))

    def arabic_text(text):
        if not text:
            return ""
        try:
            reshaped = reshape(str(text))
            return get_display(reshaped)
        except Exception:
            return str(text)

    table_data = [['#', 'Number', 'Date', 'Subject', 'Assigned', 'Done', 'Progress', 'Pending', 'Notes']]
    for idx, t in enumerate(transactions, 1):
        table_data.append([
            str(idx), arabic_text(t.get('transaction_number', '')), arabic_text(t.get('transaction_date', '')),
            arabic_text(t.get('subject', '')[:50]), arabic_text(t.get('assigned_to', '')),
            '✓' if t.get('status') == 'completed' else '', '✓' if t.get('status') == 'in_progress' else '',
            '✓' if t.get('status') == 'pending' else '', arabic_text((t.get('notes') or '')[:40])
        ])

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
    doc.build(elements)
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=transactions_{datetime.now().strftime('%Y-%m-%d')}.pdf"})
