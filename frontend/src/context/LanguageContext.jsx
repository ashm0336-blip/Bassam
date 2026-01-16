import { createContext, useContext, useState, useEffect } from 'react';

// Translations
const translations = {
  ar: {
    // Navigation
    dashboard: 'لوحة التحكم',
    interactiveMap: 'الخريطة التفاعلية',
    crowdPlanning: 'تخطيط خدمات الحشود',
    plazasManagement: 'إدارة الساحات',
    gatesManagement: 'إدارة الأبواب',
    crowdServices: 'خدمات حشود الحرم',
    matafManagement: 'صحن المطاف',
    reports: 'التقارير',
    notifications: 'الإشعارات',
    settings: 'الإعدادات',
    adminPanel: 'لوحة الإدارة',
    logout: 'تسجيل الخروج',
    
    // Dashboard
    totalVisitorsToday: 'إجمالي الزوار اليوم',
    currentCrowd: 'الحشود الحالية',
    openGates: 'الأبواب المفتوحة',
    activeAlerts: 'التنبيهات النشطة',
    departmentStatus: 'حالة الإدارات',
    detailedReport: 'تقرير مفصل',
    crowdMovement: 'حركة الحشود على مدار اليوم',
    latestAlerts: 'آخر التنبيهات',
    viewAll: 'عرض الكل',
    
    // Status
    normal: 'طبيعي',
    warning: 'مرتفع',
    critical: 'حرج',
    open: 'مفتوح',
    closed: 'مغلق',
    maintenance: 'صيانة',
    
    // Actions
    add: 'إضافة',
    edit: 'تعديل',
    delete: 'حذف',
    save: 'حفظ',
    cancel: 'إلغاء',
    refresh: 'تحديث',
    export: 'تصدير',
    exportPDF: 'تصدير PDF',
    exportExcel: 'تصدير Excel',
    
    // Common
    name: 'الاسم',
    status: 'الحالة',
    percentage: 'النسبة',
    currentFlow: 'التدفق الحالي',
    maxCapacity: 'الطاقة القصوى',
    location: 'الموقع',
    direction: 'الاتجاه',
    entry: 'دخول',
    exit: 'خروج',
    both: 'دخول/خروج',
    
    // Time
    sinceFajr: 'منذ الفجر',
    liveUpdate: 'تحديث مباشر',
    lastUpdate: 'آخر تحديث',
    
    // Login
    login: 'تسجيل الدخول',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    welcomeBack: 'مرحباً بعودتك',
    loginDescription: 'أدخل بياناتك للدخول إلى النظام',
    loggingIn: 'جاري تسجيل الدخول...',
    demoAccount: 'حساب تجريبي',
    
    // Platform
    platformName: 'منصة خدمات الحشود',
    platformSubtitle: 'نظام إداري متكامل للحرم المكي الشريف',
    departments: 'إدارات',
    gates: 'باب',
    monitoring: 'مراقبة',
    
    // Settings
    myData: 'بياناتي',
    appearance: 'المظهر',
    language: 'اللغة',
    theme: 'السمة',
    light: 'فاتح',
    dark: 'داكن',
    auto: 'تلقائي',
  },
  en: {
    // Navigation
    dashboard: 'Dashboard',
    interactiveMap: 'Interactive Map',
    crowdPlanning: 'Crowd Planning',
    plazasManagement: 'Plazas Management',
    gatesManagement: 'Gates Management',
    crowdServices: 'Crowd Services',
    matafManagement: 'Mataf Management',
    reports: 'Reports',
    notifications: 'Notifications',
    settings: 'Settings',
    adminPanel: 'Admin Panel',
    logout: 'Logout',
    
    // Dashboard
    totalVisitorsToday: 'Total Visitors Today',
    currentCrowd: 'Current Crowd',
    openGates: 'Open Gates',
    activeAlerts: 'Active Alerts',
    departmentStatus: 'Department Status',
    detailedReport: 'Detailed Report',
    crowdMovement: 'Crowd Movement Throughout Day',
    latestAlerts: 'Latest Alerts',
    viewAll: 'View All',
    
    // Status
    normal: 'Normal',
    warning: 'High',
    critical: 'Critical',
    open: 'Open',
    closed: 'Closed',
    maintenance: 'Maintenance',
    
    // Actions
    add: 'Add',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    refresh: 'Refresh',
    export: 'Export',
    exportPDF: 'Export PDF',
    exportExcel: 'Export Excel',
    
    // Common
    name: 'Name',
    status: 'Status',
    percentage: 'Percentage',
    currentFlow: 'Current Flow',
    maxCapacity: 'Max Capacity',
    location: 'Location',
    direction: 'Direction',
    entry: 'Entry',
    exit: 'Exit',
    both: 'Both',
    
    // Time
    sinceFajr: 'Since Fajr',
    liveUpdate: 'Live Update',
    lastUpdate: 'Last Update',
    
    // Login
    login: 'Login',
    email: 'Email',
    password: 'Password',
    welcomeBack: 'Welcome Back',
    loginDescription: 'Enter your credentials to access the system',
    loggingIn: 'Logging in...',
    demoAccount: 'Demo Account',
    
    // Platform
    platformName: 'Crowd Services Platform',
    platformSubtitle: 'Integrated Management System for Al-Haram',
    departments: 'Departments',
    gates: 'Gates',
    monitoring: 'Monitoring',
    
    // Settings
    myData: 'My Data',
    appearance: 'Appearance',
    language: 'Language',
    theme: 'Theme',
    light: 'Light',
    dark: 'Dark',
    auto: 'Auto',
  }
};

const LanguageContext = createContext(null);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('language');
    return saved || 'ar';
  });

  useEffect(() => {
    // Update document direction
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key) => {
    return translations[language]?.[key] || translations['ar'][key] || key;
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'ar' ? 'en' : 'ar');
  };

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage, 
      toggleLanguage,
      t,
      isRTL: language === 'ar'
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;
