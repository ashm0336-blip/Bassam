from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from pathlib import Path
import uuid
import aiofiles

from auth import require_admin, require_department_manager, log_activity

router = APIRouter()

ROOT_DIR = Path(__file__).parent.parent
UPLOADS_DIR = ROOT_DIR / "uploads" / "maps"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

@router.post("/admin/upload/map-image")
async def upload_map_image(file: UploadFile = File(...), admin: dict = Depends(require_department_manager)):
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="نوع الملف غير مدعوم. الرجاء رفع ملف صورة")
    allowed_ext = {"png", "jpg", "jpeg", "webp", "svg"}
    file_ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if file_ext not in allowed_ext:
        raise HTTPException(status_code=400, detail=f"امتداد غير مسموح. المسموح: {', '.join(allowed_ext)}")
    unique_filename = f"{uuid.uuid4()}.{file_ext}"
    file_path = UPLOADS_DIR / unique_filename
    try:
        async with aiofiles.open(file_path, 'wb') as out_file:
            content = await file.read()
            if len(content) > MAX_FILE_SIZE:
                raise HTTPException(status_code=400, detail="حجم الملف يتجاوز 10MB")
            await out_file.write(content)
        file_url = f"/api/uploads/maps/{unique_filename}"
        await log_activity("رفع صورة خريطة", admin, unique_filename, file.filename)
        return {"success": True, "filename": unique_filename, "original_name": file.filename, "url": file_url, "content_type": file.content_type, "size": len(content)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"خطأ في رفع الملف: {str(e)}")


@router.delete("/admin/upload/map-image/{filename}")
async def delete_map_image(filename: str, admin: dict = Depends(require_department_manager)):
    file_path = UPLOADS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="الملف غير موجود")
    try:
        file_path.unlink()
        await log_activity("حذف صورة خريطة", admin, filename, "تم الحذف")
        return {"success": True, "message": "تم حذف الملف بنجاح"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"خطأ في حذف الملف: {str(e)}")
