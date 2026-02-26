from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from pathlib import Path
import uuid
import aiofiles

from auth import require_admin, log_activity

router = APIRouter()

ROOT_DIR = Path(__file__).parent.parent
UPLOADS_DIR = ROOT_DIR / "uploads" / "maps"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/admin/upload/map-image")
async def upload_map_image(file: UploadFile = File(...), admin: dict = Depends(require_admin)):
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="نوع الملف غير مدعوم. الرجاء رفع ملف صورة")
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    unique_filename = f"{uuid.uuid4()}.{file_ext}"
    file_path = UPLOADS_DIR / unique_filename
    try:
        async with aiofiles.open(file_path, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)
        file_url = f"/api/uploads/maps/{unique_filename}"
        await log_activity("رفع صورة خريطة", admin, unique_filename, file.filename)
        return {"success": True, "filename": unique_filename, "original_name": file.filename, "url": file_url, "content_type": file.content_type, "size": len(content)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"خطأ في رفع الملف: {str(e)}")


@router.delete("/admin/upload/map-image/{filename}")
async def delete_map_image(filename: str, admin: dict = Depends(require_admin)):
    file_path = UPLOADS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="الملف غير موجود")
    try:
        file_path.unlink()
        await log_activity("حذف صورة خريطة", admin, filename, "تم الحذف")
        return {"success": True, "message": "تم حذف الملف بنجاح"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"خطأ في حذف الملف: {str(e)}")
