# Crowd Services Platform - PRD

## Original Problem Statement
Build a highly interactive and efficient "Crowd Services Platform" with two main modules: "Gates Management" and "Prayer Area Management."

## User Language
Arabic (العربية)

## Architecture
- **Backend:** FastAPI + MongoDB
- **Frontend:** React + Shadcn/UI + Tailwind CSS
- **Auth:** JWT-based (admin@crowd.sa / admin123)

## What's Been Implemented ✅

### Authentication & Security
- National ID + PIN/Employee Number login (dynamic labels, helper text)
- Email + Password login (admin)
- Account lockout (5 attempts), manager PIN reset, forced PIN change on first login
- Re-hire flow: deleted+re-added employees get auto-reset accounts
- Secure error messages (don't reveal which field is wrong)

### Role Awareness System
- Header role badge (color-coded per role)
- Smart welcome toast ("مرحباً أحمد — مشرف الوردية في إدارة البوابات")
- Silent periodic refresh (every 5 min) for role/permission changes
- Sticky role change alert banner with "فهمت" dismiss
- Unified ROLE_LABELS/DEPT_LABELS constants

### Admin Panel (6 tabs)
1. نظرة عامة (Overview)
2. حسابي (My Account) — profile edit + password change
3. الصلاحيات (Permissions) — RBAC checklist
4. سجل النشاط (Activity Log)
5. إعدادات النظام (System Settings) — Login page + Header + Appearance/Language
6. القائمة الجانبية (Sidebar)

### Mobile Responsive Header
- Mobile: clean header (page name + short greeting + hamburger only)
- Sidebar: date at top, user info + role badge, action buttons (notifications, theme, logout)
- Desktop: full header with all elements

### Core Features
- Gates Management, Prayer Area Management
- Interactive maps with pan/zoom, zone drawing/editing
- Density management with heatmap, employee assignment
- Smart archiving, monthly scheduling
- Dual Hijri/Gregorian Calendar, Prayer sessions (6/day)
- Dark mode ("Forest Night"), responsive design
- Professional employee table (compact UI, icons, tooltips)
- Dynamic RBAC, data isolation between departments

## Credentials
- Admin: admin@crowd.sa / admin123
- Employees: National ID + Employee Number (first login)

---

## 📋 MASTER TASK LIST (مرتبة بالأولوية)

### 🔴 P0 — حرجة (التأثير الأكبر على الاحترافية)

#### 1. إعادة بناء لوحة التحكم الرئيسية بالكامل
- خريطة حرارية مصغرة للبوابات
- مؤشرات حية (gauges) بدل أرقام جافة
- تنبيهات ذكية ملونة
- آخر الأحداث مباشرة (timeline)
- إحساس "غرفة عمليات"

#### 2. بيانات تجريبية احترافية (Seed Data)
- 200+ بوابة ببيانات واقعية
- 50+ موظف بأسماء عربية حقيقية
- جداول شهرية + ورديات + إجازات
- يحيي الموقع ويجعله يبدو حقيقي

#### 3. واجهة مبسطة للعاملين الميدانيين (Mobile-First)
- شاشة مخصصة لإدخال الكثافات وإرسال التنبيهات بأقل نقرات

#### 4. عرض احترافي مضغوط للبوابات (200+ بوابة)
- جداول مجمعة حسب الساحات

### 🟠 P1 — مهمة (تحسينات كبيرة)

#### 5. إصلاح "نظرة عامة" في لوحة الأدمن
- حذف بيانات تجريبية (TEST_TAKEN_UI)
- تنبيهات ذكية (عقود على وشك الانتهاء، حسابات مجمّدة)
- توصيات فورية بدل أرقام جافة

#### 6. تحسين الهوية البصرية لكل إدارة
- أيقونة + لون مميز لكل إدارة
- Dashboard مخصص لطبيعة عمل كل إدارة
- بدل التصميم المتكرر الحالي

#### 7. تحسين القائمة الجانبية
- الأقسام الفرعية تظهر فقط لما تضغط على الإدارة (بدل التكرار)

#### 8. نقل الممنوعات لإعدادات إدارة البوابات

#### 9. نظام تنبيهات ذكي في الباك إند
- تنبيهات بقواعد محددة (كثافة تتجاوز السعة، عقد ينتهي)

#### 10. صفحة ملف شخصي كامل لكل موظف
- /employee/[id] — تاريخ التعيينات، الجداول، الأداء

#### 11. تصدير التقارير PDF/Excel

### 🔵 P2 — مستقبلية (Backlog)

#### 12. تحسين صفحة تسجيل الدخول
- Animation خفيف عند الدخول
- تأثيرات بصرية احترافية

#### 13. بحث شامل Ctrl+K
- بحث عالمي عن موظفين، بوابات، جلسات

#### 14. توحيد صفحات الجلسات اليومية
- مكوّن واحد يتكيف حسب الإدارة

#### 15. إعادة تصميم المواسم بطريقة أفضل

#### 16. نظام تنبيهات صوتي خفيف عند تغيّر الدور

---

## Key API Endpoints
- POST /api/auth/login, POST /api/auth/change-pin
- PUT /api/auth/update-profile, POST /api/auth/change-password
- GET/POST /api/permissions
- POST /api/employees/check-national-id
- POST /api/employees/{id}/account-status
