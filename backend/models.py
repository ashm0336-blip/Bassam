from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
from datetime import datetime, timezone
import uuid


# ============= Auth Models =============
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "field_staff"
    department: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    password: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    department: Optional[str] = None
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# ============= Data Models =============
class GateCreate(BaseModel):
    name: str
    number: int
    plaza: str
    plaza_color: str
    gate_type: str
    direction: str
    category: List[str]
    classification: str
    status: str = "متاح"
    current_indicator: str = "مغلق"
    current_flow: int = 0
    max_flow: int = 5000

class GateUpdate(BaseModel):
    name: Optional[str] = None
    plaza: Optional[str] = None
    plaza_color: Optional[str] = None
    gate_type: Optional[str] = None
    direction: Optional[str] = None
    category: Optional[List[str]] = None
    classification: Optional[str] = None
    status: Optional[str] = None
    current_indicator: Optional[str] = None
    current_flow: Optional[int] = None
    max_flow: Optional[int] = None
    area: Optional[str] = None
    operational_seasons: Optional[List[str]] = None

# ============= Season Models =============
class Season(BaseModel):
    id: str = "active_season"
    current_season: str = "normal"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    active_gates_count: int = 0
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ============= Prohibited Items Models =============
class ProhibitedItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name_ar: str
    name_en: str
    category: str
    severity: str = "high"
    exception_note_ar: Optional[str] = None
    exception_note_en: Optional[str] = None
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ProhibitedItemCreate(BaseModel):
    name_ar: str
    name_en: str
    category: str
    severity: Optional[str] = "high"
    exception_note_ar: Optional[str] = None
    exception_note_en: Optional[str] = None

# ============= Plazas Models =============
class PlazaCreate(BaseModel):
    name: str
    zone: str
    current_crowd: int = 0
    max_capacity: int = 40000

class PlazaUpdate(BaseModel):
    name: Optional[str] = None
    current_crowd: Optional[int] = None
    max_capacity: Optional[int] = None

class MatafLevelCreate(BaseModel):
    level: str
    current_crowd: int = 0
    max_capacity: int = 50000
    average_tawaf_time: int = 45

class MatafLevelUpdate(BaseModel):
    current_crowd: Optional[int] = None
    max_capacity: Optional[int] = None
    average_tawaf_time: Optional[int] = None

class AlertCreate(BaseModel):
    type: str
    title: str
    message: str
    department: str
    priority: str = "medium"
    status: str = "وارد"
    received_at: str

class AlertUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    message: Optional[str] = None
    closed_at: Optional[str] = None

class EmployeeCreate(BaseModel):
    name: str
    job_title: str
    department: str
    location: str
    shift: str
    employee_number: Optional[str] = None
    weekly_rest: Optional[str] = None
    rest_days: Optional[List[str]] = None
    work_tasks: Optional[str] = None
    is_active: bool = True

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    job_title: Optional[str] = None
    location: Optional[str] = None
    shift: Optional[str] = None
    employee_number: Optional[str] = None
    weekly_rest: Optional[str] = None
    rest_days: Optional[List[str]] = None
    work_tasks: Optional[str] = None
    is_active: Optional[bool] = None

# ============= Monthly Schedule Models =============
class ScheduleAssignment(BaseModel):
    employee_id: str
    rest_days: List[str] = []
    location: str = ""
    shift: str = ""

class MonthlySchedule(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    department: str
    month: str
    status: str = "draft"
    assignments: List[ScheduleAssignment] = []
    created_by: Optional[str] = None
    approved_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MonthlyScheduleCreate(BaseModel):
    department: str
    month: str
    clone_from: Optional[str] = None

class ScheduleAssignmentUpdate(BaseModel):
    rest_days: Optional[List[str]] = None
    location: Optional[str] = None
    shift: Optional[str] = None

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# ============= Dropdown Options Models =============
class DropdownOption(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category: str
    value: str
    label: str
    color: Optional[str] = None
    order: int = 0
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class DropdownOptionCreate(BaseModel):
    category: str
    value: str
    label: str
    color: Optional[str] = None
    order: Optional[int] = 0

class DropdownOptionUpdate(BaseModel):
    value: Optional[str] = None
    label: Optional[str] = None
    color: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None

# ============= Department Settings Models =============
class DepartmentSetting(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    department: str
    setting_type: str
    value: str
    label: str
    description: Optional[str] = None
    color: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    rest_days: Optional[List[str]] = None
    order: int = 0
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class DepartmentSettingCreate(BaseModel):
    department: str
    setting_type: str
    value: str
    label: str
    description: Optional[str] = None
    color: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    rest_days: Optional[List[str]] = None
    order: int = 0

class DepartmentSettingUpdate(BaseModel):
    value: Optional[str] = None
    label: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    rest_days: Optional[List[str]] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None

# ============= Sidebar Menu Models =============
class SidebarMenuItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name_ar: str
    name_en: str
    subtitle_ar: Optional[str] = None
    subtitle_en: Optional[str] = None
    href: str
    icon: str
    order: int = 0
    is_active: bool = True
    is_public: bool = False
    is_secondary: bool = False
    parent_id: Optional[str] = None
    department: Optional[str] = None
    admin_only: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SidebarMenuItemCreate(BaseModel):
    name_ar: str
    name_en: str
    subtitle_ar: Optional[str] = None
    subtitle_en: Optional[str] = None
    href: str
    icon: str
    order: Optional[int] = 0
    is_public: Optional[bool] = False
    is_secondary: Optional[bool] = False
    parent_id: Optional[str] = None
    department: Optional[str] = None
    admin_only: Optional[bool] = False

class SidebarMenuItemUpdate(BaseModel):
    name_ar: Optional[str] = None
    name_en: Optional[str] = None
    subtitle_ar: Optional[str] = None
    subtitle_en: Optional[str] = None
    href: Optional[str] = None
    icon: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None
    is_public: Optional[bool] = None
    is_secondary: Optional[bool] = None
    parent_id: Optional[str] = None
    department: Optional[str] = None
    admin_only: Optional[bool] = None

# ============= Zone Category Models =============
class ZoneCategory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    value: str
    label_ar: str
    label_en: str
    color: str = "#22c55e"
    icon: str = "M"
    order: int = 0
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ZoneCategoryCreate(BaseModel):
    value: str
    label_ar: str
    label_en: str
    color: str = "#22c55e"
    icon: str = "M"
    order: Optional[int] = 0

class ZoneCategoryUpdate(BaseModel):
    value: Optional[str] = None
    label_ar: Optional[str] = None
    label_en: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None

# ============= Settings Models =============
class LoginPageSettings(BaseModel):
    id: str = "login_settings"
    site_name_ar: str = "خدمات الحشود"
    site_name_en: str = "Crowd Services"
    subtitle_ar: str = "منصة إدارة الحشود في الحرم المكي الشريف"
    subtitle_en: str = "Crowd Management Platform at Al-Haram"
    logo_url: Optional[str] = None
    logo_link: str = "/"
    logo_size: int = 150
    background_url: Optional[str] = None
    primary_color: str = "#DC2626"
    welcome_text_ar: str = "مرحباً بك"
    welcome_text_en: str = "Welcome"
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class LoginPageSettingsUpdate(BaseModel):
    site_name_ar: Optional[str] = None
    site_name_en: Optional[str] = None
    subtitle_ar: Optional[str] = None
    subtitle_en: Optional[str] = None
    logo_url: Optional[str] = None
    logo_link: Optional[str] = None
    logo_size: Optional[int] = None
    background_url: Optional[str] = None
    primary_color: Optional[str] = None
    welcome_text_ar: Optional[str] = None
    welcome_text_en: Optional[str] = None

# ============= Header Settings Models =============
class HeaderSettings(BaseModel):
    id: str = "header_settings"
    background_color: str = "#FFFFFF"
    text_color: str = "#000000"
    show_shadow: bool = True
    show_date: bool = True
    show_page_name: bool = True
    show_user_name: bool = True
    show_language_toggle: bool = True
    show_theme_toggle: bool = True
    show_logout_button: bool = True
    show_notifications_bell: bool = True
    custom_greeting_ar: str = "أهلاً"
    custom_greeting_en: str = "Hello"
    show_logo: bool = False
    header_logo_url: Optional[str] = None
    header_height: int = 64
    border_style: str = "solid"
    transparency: int = 100
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class HeaderSettingsUpdate(BaseModel):
    background_color: Optional[str] = None
    text_color: Optional[str] = None
    show_shadow: Optional[bool] = None
    show_date: Optional[bool] = None
    show_page_name: Optional[bool] = None
    show_user_name: Optional[bool] = None
    show_language_toggle: Optional[bool] = None
    show_theme_toggle: Optional[bool] = None
    show_logout_button: Optional[bool] = None
    show_notifications_bell: Optional[bool] = None
    custom_greeting_ar: Optional[str] = None
    custom_greeting_en: Optional[str] = None
    show_logo: Optional[bool] = None
    header_logo_url: Optional[str] = None
    header_height: Optional[int] = None
    border_style: Optional[str] = None
    transparency: Optional[int] = None

# ============= Map Models =============
class MapMarker(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    map_id: str
    type: str
    entity_id: Optional[str] = None
    x: float
    y: float
    label_ar: str
    label_en: str
    icon: str = "MapPin"
    color: str = "#DC2626"
    show_label: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class InteractiveMap(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name_ar: str
    name_en: str
    department: str
    image_url: str
    width: int = 1920
    height: int = 1080
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MapMarkerCreate(BaseModel):
    map_id: str
    type: str
    entity_id: Optional[str] = None
    x: float
    y: float
    label_ar: str
    label_en: str
    icon: Optional[str] = "MapPin"
    color: Optional[str] = "#DC2626"
    show_label: Optional[bool] = True

class InteractiveMapCreate(BaseModel):
    name_ar: str
    name_en: str
    department: str
    image_url: str
    width: Optional[int] = 1920
    height: Optional[int] = 1080

class InteractiveMapUpdate(BaseModel):
    name_ar: Optional[str] = None
    name_en: Optional[str] = None
    image_url: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    is_active: Optional[bool] = None

# ============= Floor/Layer Models =============
class MapFloor(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name_ar: str
    name_en: str
    floor_number: int
    image_url: str
    is_active: bool = True
    order: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MapFloorCreate(BaseModel):
    name_ar: str
    name_en: str
    floor_number: int
    image_url: str
    order: Optional[int] = 0

# ============= Interactive Zone Models =============
class MapZone(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    floor_id: str
    zone_code: str
    name_ar: str
    name_en: str
    zone_type: str
    polygon_points: List[dict]
    fill_color: str = "#22c55e"
    stroke_color: str = "#000000"
    opacity: float = 0.4
    stroke_opacity: float = 1.0
    current_crowd: int = 0
    max_capacity: int = 1000
    area_sqm: float = 0
    per_person_sqm: float = 0.8
    crowd_status: str = "normal"
    assigned_employees: int = 0
    description_ar: Optional[str] = None
    description_en: Optional[str] = None
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MapZoneCreate(BaseModel):
    floor_id: str
    zone_code: str
    name_ar: str
    name_en: str
    zone_type: str
    polygon_points: List[dict]
    fill_color: Optional[str] = "#22c55e"
    stroke_color: Optional[str] = "#000000"
    opacity: Optional[float] = 0.4
    stroke_opacity: Optional[float] = 1.0
    max_capacity: Optional[int] = 1000
    area_sqm: Optional[float] = 0
    per_person_sqm: Optional[float] = 0.8
    description_ar: Optional[str] = None
    description_en: Optional[str] = None

class MapZoneUpdate(BaseModel):
    zone_code: Optional[str] = None
    name_ar: Optional[str] = None
    name_en: Optional[str] = None
    zone_type: Optional[str] = None
    polygon_points: Optional[List[dict]] = None
    fill_color: Optional[str] = None
    stroke_color: Optional[str] = None
    opacity: Optional[float] = None
    stroke_opacity: Optional[float] = None
    current_crowd: Optional[int] = None
    max_capacity: Optional[int] = None
    area_sqm: Optional[float] = None
    per_person_sqm: Optional[float] = None
    crowd_status: Optional[str] = None
    assigned_employees: Optional[int] = None
    description_ar: Optional[str] = None
    description_en: Optional[str] = None
    is_active: Optional[bool] = None

# ============= Gate Map Models =============
class GateMapFloor(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name_ar: str
    name_en: str = ""
    image_url: str = ""
    order: int = 0
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class GateMapFloorCreate(BaseModel):
    name_ar: str
    name_en: str = ""
    image_url: str = ""
    order: int = 0

class GateMarker(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    floor_id: str
    gate_id: Optional[str] = None
    name_ar: str
    name_en: str = ""
    x: float
    y: float
    gate_type: str = "main"
    direction: str = "both"
    classification: str = "general"
    status: str = "open"
    current_flow: int = 0
    max_flow: int = 5000
    icon_size: float = 2.0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class GateMarkerCreate(BaseModel):
    floor_id: str
    gate_id: Optional[str] = None
    name_ar: str
    name_en: str = ""
    x: float
    y: float
    gate_type: str = "main"
    direction: str = "both"
    classification: str = "general"
    status: str = "open"
    current_flow: int = 0
    max_flow: int = 5000

class GateMarkerUpdate(BaseModel):
    name_ar: Optional[str] = None
    name_en: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None
    gate_type: Optional[str] = None
    direction: Optional[str] = None
    classification: Optional[str] = None
    status: Optional[str] = None
    current_flow: Optional[int] = None
    max_flow: Optional[int] = None
    gate_id: Optional[str] = None

class GateDailyLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str
    total_gates: int = 0
    open_gates: int = 0
    closed_gates: int = 0
    total_flow: int = 0
    notes: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ============= Daily Gate Session Models =============
class SessionGate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    original_marker_id: Optional[str] = None
    gate_id: Optional[str] = None
    floor_id: str
    name_ar: str
    name_en: str = ""
    x: float
    y: float
    gate_type: str = "main"
    direction: str = "both"
    classification: str = "general"
    status: str = "open"
    indicator: str = "light"
    current_flow: int = 0
    max_flow: int = 5000
    assigned_staff: int = 0
    daily_note: Optional[str] = None
    is_removed: bool = False
    change_type: Optional[str] = None

class GateSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str
    floor_id: str
    floor_name: str = ""
    status: str = "draft"
    supervisor_notes: Optional[str] = None
    created_by: Optional[str] = None
    gates: List[SessionGate] = []
    changes_summary: dict = Field(default_factory=lambda: {"added": 0, "removed": 0, "modified": 0, "unchanged": 0})
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class GateSessionCreate(BaseModel):
    date: str
    floor_id: str
    clone_from: Optional[str] = None

class GateSessionUpdate(BaseModel):
    status: Optional[str] = None
    supervisor_notes: Optional[str] = None

class SessionGateUpdate(BaseModel):
    name_ar: Optional[str] = None
    status: Optional[str] = None
    indicator: Optional[str] = None
    direction: Optional[str] = None
    classification: Optional[str] = None
    current_flow: Optional[int] = None
    assigned_staff: Optional[int] = None
    daily_note: Optional[str] = None
    is_removed: Optional[bool] = None
    x: Optional[float] = None
    y: Optional[float] = None

# ============= Daily Map Session Models =============
class SessionZone(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    original_zone_id: Optional[str] = None
    floor_id: str
    zone_code: str
    name_ar: str
    name_en: str
    zone_type: str
    polygon_points: List[dict]
    fill_color: str = "#22c55e"
    stroke_color: str = "#000000"
    opacity: float = 0.4
    stroke_opacity: float = 1.0
    stroke_width: float = 0.3
    stroke_style: str = "dashed"
    max_capacity: int = 1000
    current_count: int = 0
    prayer_counts: dict = Field(default_factory=lambda: {"fajr": 0, "dhuhr": 0, "asr": 0, "maghrib": 0, "isha": 0, "taraweeh": 0})
    area_sqm: float = 0
    length_m: float = 0
    width_m: float = 0
    per_person_sqm: float = 0.55
    carpet_length: float = 1.2
    carpet_width: float = 0.7
    description_ar: Optional[str] = None
    description_en: Optional[str] = None
    is_removed: bool = False
    daily_note: Optional[str] = None
    change_type: Optional[str] = None

class MapSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str
    floor_id: str
    floor_name: str = ""
    status: str = "draft"
    supervisor_notes: Optional[str] = None
    created_by: Optional[str] = None
    zones: List[SessionZone] = []
    changes_summary: dict = Field(default_factory=lambda: {"added": 0, "removed": 0, "modified": 0, "unchanged": 0})
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MapSessionCreate(BaseModel):
    date: str
    floor_id: str
    clone_from: Optional[str] = None

class MapSessionUpdate(BaseModel):
    status: Optional[str] = None
    supervisor_notes: Optional[str] = None

class SessionZoneUpdate(BaseModel):
    zone_code: Optional[str] = None
    zone_type: Optional[str] = None
    name_ar: Optional[str] = None
    name_en: Optional[str] = None
    is_removed: Optional[bool] = None
    daily_note: Optional[str] = None
    fill_color: Optional[str] = None
    stroke_color: Optional[str] = None
    opacity: Optional[float] = None
    stroke_opacity: Optional[float] = None
    stroke_width: Optional[float] = None
    stroke_style: Optional[str] = None
    polygon_points: Optional[List[dict]] = None
    current_count: Optional[int] = None
    prayer_counts: Optional[dict] = None
    max_capacity: Optional[int] = None
    area_sqm: Optional[float] = None
    length_m: Optional[float] = None
    width_m: Optional[float] = None
    per_person_sqm: Optional[float] = None
    carpet_length: Optional[float] = None
    carpet_width: Optional[float] = None

# ============= Transaction Models =============
class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    transaction_number: str
    transaction_date: str
    subject: str
    assigned_to: str
    assigned_by: str
    status: str = "pending"
    notes: Optional[str] = None
    priority: str = "normal"
    department: str = "gates"
    due_date: Optional[str] = None
    completed_date: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TransactionCreate(BaseModel):
    transaction_number: str
    transaction_date: str
    subject: str
    assigned_to: str
    priority: Optional[str] = "normal"
    department: Optional[str] = "gates"
    due_date: Optional[str] = None
    notes: Optional[str] = None

class TransactionUpdate(BaseModel):
    assigned_to: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    completed_date: Optional[str] = None
