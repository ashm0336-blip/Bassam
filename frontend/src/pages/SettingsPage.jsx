import { useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { 
  Settings, 
  User,
  Shield,
  Globe,
  Palette,
  Bell,
  Database,
  HelpCircle,
  ChevronLeft,
  Moon,
  Sun,
  Monitor,
  Languages
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const SettingsSection = ({ icon: Icon, title, description, children }) => (
  <Card className="card-hover">
    <CardHeader className="pb-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <CardTitle className="font-cairo text-lg">{title}</CardTitle>
          <CardDescription className="text-xs">{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

const SettingItem = ({ label, description, children }) => (
  <div className="flex items-center justify-between py-3">
    <div className="space-y-0.5">
      <Label className="font-medium">{label}</Label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
    {children}
  </div>
);

export default function SettingsPage() {
  const { theme, setTheme, isDark } = useTheme();
  const { language, setLanguage, t, isRTL } = useLanguage();
  const { user } = useAuth();
  
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sound: false,
    alerts: true
  });

  return (
    <div className="space-y-6" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="font-cairo font-bold text-2xl">{t('settings')}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {language === 'ar' ? 'إدارة إعدادات النظام والتفضيلات الشخصية' : 'Manage system settings and personal preferences'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <SettingsSection
          icon={User}
          title={t('myData')}
          description={language === 'ar' ? 'إدارة المعلومات الشخصية' : 'Manage personal information'}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="font-cairo font-bold text-2xl text-primary">
                  {user?.name?.charAt(0) || 'م'}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{user?.name || 'مستخدم'}</h3>
                <p className="text-sm text-muted-foreground">
                  {user?.role === 'admin' ? (language === 'ar' ? 'مدير النظام' : 'System Admin') : 
                   user?.role === 'manager' ? (language === 'ar' ? 'مشرف' : 'Manager') : 
                   (language === 'ar' ? 'مستخدم' : 'User')}
                </p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <Button variant="outline" size="sm">
                {language === 'ar' ? 'تعديل' : 'Edit'}
              </Button>
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <div>
                <Label className="text-sm">{language === 'ar' ? 'الاسم الكامل' : 'Full Name'}</Label>
                <Input defaultValue={user?.name || ''} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">{t('email')}</Label>
                <Input defaultValue={user?.email || ''} className="mt-1" dir="ltr" />
              </div>
            </div>
            
            <Button className="w-full bg-primary hover:bg-primary/90">
              {language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
            </Button>
          </div>
        </SettingsSection>

        {/* Appearance Settings */}
        <SettingsSection
          icon={Palette}
          title={t('appearance')}
          description={language === 'ar' ? 'تخصيص شكل التطبيق' : 'Customize app appearance'}
        >
          <div className="space-y-4">
            <div>
              <Label className="text-sm mb-3 block">{t('theme')}</Label>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  className={`flex flex-col gap-2 h-auto py-4 ${theme === "light" ? "bg-primary" : ""}`}
                  onClick={() => setTheme("light")}
                  data-testid="theme-light"
                >
                  <Sun className="w-5 h-5" />
                  <span className="text-xs">{t('light')}</span>
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  className={`flex flex-col gap-2 h-auto py-4 ${theme === "dark" ? "bg-primary" : ""}`}
                  onClick={() => setTheme("dark")}
                  data-testid="theme-dark"
                >
                  <Moon className="w-5 h-5" />
                  <span className="text-xs">{t('dark')}</span>
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  className={`flex flex-col gap-2 h-auto py-4 ${theme === "system" ? "bg-primary" : ""}`}
                  onClick={() => setTheme("system")}
                  data-testid="theme-system"
                >
                  <Monitor className="w-5 h-5" />
                  <span className="text-xs">{t('auto')}</span>
                </Button>
              </div>
            </div>
            
            <Separator />
            
            <SettingItem 
              label={language === 'ar' ? 'حجم الخط' : 'Font Size'} 
              description={language === 'ar' ? 'تغيير حجم النص في التطبيق' : 'Change text size in the app'}
            >
              <Select defaultValue="medium">
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">{language === 'ar' ? 'صغير' : 'Small'}</SelectItem>
                  <SelectItem value="medium">{language === 'ar' ? 'متوسط' : 'Medium'}</SelectItem>
                  <SelectItem value="large">{language === 'ar' ? 'كبير' : 'Large'}</SelectItem>
                </SelectContent>
              </Select>
            </SettingItem>
          </div>
        </SettingsSection>

        {/* Language Settings */}
        <SettingsSection
          icon={Globe}
          title={t('language')}
          description={language === 'ar' ? 'إعدادات اللغة والمنطقة' : 'Language and region settings'}
        >
          <div className="space-y-4">
            <div>
              <Label className="text-sm mb-3 block">
                {language === 'ar' ? 'لغة التطبيق' : 'App Language'}
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={language === "ar" ? "default" : "outline"}
                  className={`flex items-center gap-2 h-12 ${language === "ar" ? "bg-primary" : ""}`}
                  onClick={() => setLanguage("ar")}
                  data-testid="lang-ar"
                >
                  <span className="text-lg">🇸🇦</span>
                  <span>العربية</span>
                </Button>
                <Button
                  variant={language === "en" ? "default" : "outline"}
                  className={`flex items-center gap-2 h-12 ${language === "en" ? "bg-primary" : ""}`}
                  onClick={() => setLanguage("en")}
                  data-testid="lang-en"
                >
                  <span className="text-lg">🇺🇸</span>
                  <span>English</span>
                </Button>
              </div>
            </div>
            
            <Separator />
            
            <SettingItem label={language === 'ar' ? 'التقويم' : 'Calendar'}>
              <Select defaultValue="hijri">
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hijri">{language === 'ar' ? 'هجري' : 'Hijri'}</SelectItem>
                  <SelectItem value="gregorian">{language === 'ar' ? 'ميلادي' : 'Gregorian'}</SelectItem>
                </SelectContent>
              </Select>
            </SettingItem>
            
            <Separator />
            
            <SettingItem label={language === 'ar' ? 'المنطقة الزمنية' : 'Timezone'}>
              <Select defaultValue="riyadh">
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="riyadh">{language === 'ar' ? 'الرياض' : 'Riyadh'} (GMT+3)</SelectItem>
                  <SelectItem value="mecca">{language === 'ar' ? 'مكة المكرمة' : 'Makkah'}</SelectItem>
                </SelectContent>
              </Select>
            </SettingItem>
          </div>
        </SettingsSection>

        {/* Notification Settings */}
        <SettingsSection
          icon={Bell}
          title={t('notifications')}
          description={language === 'ar' ? 'إدارة تفضيلات الإشعارات' : 'Manage notification preferences'}
        >
          <div className="space-y-1">
            <SettingItem 
              label={language === 'ar' ? 'إشعارات البريد' : 'Email Notifications'} 
              description={language === 'ar' ? 'استلام إشعارات عبر البريد الإلكتروني' : 'Receive notifications via email'}
            >
              <Switch 
                checked={notifications.email}
                onCheckedChange={(checked) => setNotifications(prev => ({...prev, email: checked}))}
              />
            </SettingItem>
            
            <Separator />
            
            <SettingItem 
              label={language === 'ar' ? 'الإشعارات الفورية' : 'Push Notifications'} 
              description={language === 'ar' ? 'إشعارات داخل التطبيق' : 'In-app notifications'}
            >
              <Switch 
                checked={notifications.push}
                onCheckedChange={(checked) => setNotifications(prev => ({...prev, push: checked}))}
              />
            </SettingItem>
            
            <Separator />
            
            <SettingItem 
              label={language === 'ar' ? 'الصوت' : 'Sound'} 
              description={language === 'ar' ? 'تشغيل صوت عند وصول إشعار' : 'Play sound on notification'}
            >
              <Switch 
                checked={notifications.sound}
                onCheckedChange={(checked) => setNotifications(prev => ({...prev, sound: checked}))}
              />
            </SettingItem>
            
            <Separator />
            
            <SettingItem 
              label={language === 'ar' ? 'تنبيهات الطوارئ' : 'Emergency Alerts'} 
              description={language === 'ar' ? 'إشعارات فورية للحالات الحرجة' : 'Instant alerts for critical situations'}
            >
              <Switch 
                checked={notifications.alerts}
                onCheckedChange={(checked) => setNotifications(prev => ({...prev, alerts: checked}))}
              />
            </SettingItem>
          </div>
        </SettingsSection>

        {/* Security Settings */}
        <SettingsSection
          icon={Shield}
          title={language === 'ar' ? 'الأمان والصلاحيات' : 'Security & Permissions'}
          description={language === 'ar' ? 'إدارة أمان الحساب' : 'Manage account security'}
        >
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-between" data-testid="change-password-btn">
              {language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
              <ChevronLeft className={`w-4 h-4 ${!isRTL ? 'rotate-180' : ''}`} />
            </Button>
            <Button variant="outline" className="w-full justify-between">
              {language === 'ar' ? 'سجل النشاط' : 'Activity Log'}
              <ChevronLeft className={`w-4 h-4 ${!isRTL ? 'rotate-180' : ''}`} />
            </Button>
            <Button variant="outline" className="w-full justify-between">
              {language === 'ar' ? 'الأجهزة المتصلة' : 'Connected Devices'}
              <ChevronLeft className={`w-4 h-4 ${!isRTL ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </SettingsSection>

        {/* Support */}
        <SettingsSection
          icon={HelpCircle}
          title={language === 'ar' ? 'الدعم والمساعدة' : 'Help & Support'}
          description={language === 'ar' ? 'الحصول على المساعدة' : 'Get help'}
        >
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-between">
              {language === 'ar' ? 'الأسئلة الشائعة' : 'FAQ'}
              <ChevronLeft className={`w-4 h-4 ${!isRTL ? 'rotate-180' : ''}`} />
            </Button>
            <Button variant="outline" className="w-full justify-between">
              {language === 'ar' ? 'دليل المستخدم' : 'User Guide'}
              <ChevronLeft className={`w-4 h-4 ${!isRTL ? 'rotate-180' : ''}`} />
            </Button>
            <Button variant="outline" className="w-full justify-between">
              {language === 'ar' ? 'تواصل مع الدعم' : 'Contact Support'}
              <ChevronLeft className={`w-4 h-4 ${!isRTL ? 'rotate-180' : ''}`} />
            </Button>
            <Separator />
            <div className="text-center pt-2">
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'الإصدار' : 'Version'} 1.0.0
              </p>
              <p className="text-xs text-muted-foreground">
                © 2024 {language === 'ar' ? 'منصة خدمات الحشود' : 'Crowd Services Platform'}
              </p>
            </div>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}
