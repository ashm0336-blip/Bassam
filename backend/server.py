from fastapi import FastAPI, APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from pathlib import Path
import os
import logging
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from database import db, client

# Create the main app
app = FastAPI(title="Al-Haram OS API", description="منصة خدمات الحشود API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Import and include all route modules
from routes.auth import router as auth_router
from routes.admin import router as admin_router
from routes.dashboard import router as dashboard_router
from routes.employees import router as employees_router
from routes.settings import router as settings_router
from routes.maps import router as maps_router
from routes.sessions import router as sessions_router
from routes.transactions import router as transactions_router
from routes.uploads import router as uploads_router
from routes.permissions import router as permissions_router
from routes.seed import router as seed_router
from routes.ops import router as ops_router
from routes.field import router as field_router
from routes.smart_alerts import router as smart_alerts_router
from routes.employee_io import router as employee_io_router
from routes.tasks import router as tasks_router

api_router.include_router(auth_router)
api_router.include_router(admin_router)
api_router.include_router(permissions_router)
api_router.include_router(dashboard_router)
api_router.include_router(employees_router)
api_router.include_router(settings_router)
api_router.include_router(maps_router)
api_router.include_router(sessions_router)
api_router.include_router(transactions_router)
api_router.include_router(uploads_router)
api_router.include_router(seed_router)
api_router.include_router(ops_router)
api_router.include_router(field_router)
api_router.include_router(smart_alerts_router)
api_router.include_router(employee_io_router)
api_router.include_router(tasks_router)


# ============= Frontend Serving with Injected Settings =============
@app.get("/", response_class=HTMLResponse)
@app.get("/login", response_class=HTMLResponse)
async def serve_frontend_with_settings(request: Request):
    frontend_path = Path(__file__).parent.parent / "frontend" / "build" / "index.html"
    if not frontend_path.exists():
        frontend_path = Path(__file__).parent.parent / "frontend" / "public" / "index.html"
    if not frontend_path.exists():
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Frontend not found")
    html_content = frontend_path.read_text()
    try:
        settings = await db.login_settings.find_one({"id": "login_settings"}, {"_id": 0})
    except Exception:
        settings = None
    if not settings:
        settings = {
            "primary_color": "#047857",
            "background_url": "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=1920&q=80",
            "logo_url": "", "logo_size": 150, "logo_link": "/",
            "site_name_ar": "منصة خدمات الحشود", "site_name_en": "Crowd Services Platform",
            "subtitle_ar": "الإدارة العامة للتخطيط وخدمات الحشود في الحرم المكي الشريف",
            "subtitle_en": "General Administration for Planning and Crowd Services at the Grand Mosque",
            "welcome_text_ar": "مرحباً بك في", "welcome_text_en": "Welcome to"
        }
    settings_script = f"""
    <script>
        window.__LOGIN_SETTINGS__ = {json.dumps(settings)};
    </script>
    """
    html_content = html_content.replace('</head>', f'{settings_script}</head>')
    return HTMLResponse(content=html_content)


# Health check endpoint
@app.get("/health")
@app.get("/api/health")
async def health_check():
    try:
        await db.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception:
        return {"status": "healthy", "database": "disconnected", "note": "Service is running"}


# Serve uploaded files statically
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")
app.mount("/api/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="api-uploads")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup_db_client():
    """Create default admin user if no users exist - with retry for Atlas MongoDB"""
    import asyncio
    from auth import hash_password
    import uuid
    from datetime import datetime, timezone

    for attempt in range(5):
        try:
            count = await db.users.count_documents({})
            if count == 0:
                admin_doc = {
                    "id": str(uuid.uuid4()),
                    "email": "admin@crowd.sa",
                    "password": hash_password("admin123"),
                    "name": "مسؤول النظام",
                    "role": "system_admin",
                    "department": None,
                    "is_active": True,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.users.insert_one({**admin_doc})
                logger.info("✅ Default admin user created: admin@crowd.sa")
            else:
                logger.info(f"✅ Database connected — {count} user(s) found")
            break
        except Exception as e:
            logger.warning(f"⚠️ Startup DB attempt {attempt + 1}/5 failed: {e}")
            if attempt < 4:
                await asyncio.sleep(3)
            else:
                logger.error("❌ Database unavailable at startup — app will still serve requests")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
