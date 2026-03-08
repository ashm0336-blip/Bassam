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
  HelpCircle,
  ChevronLeft,
  Moon,
  Sun,
  Monitor,
  Eye,
  EyeOff,
  Loader2,
  Check,
  Lock,
  Mail,
  UserCircle,
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
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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
  const { user, setUser } = useAuth();
  
  // Profile state
  const [profileData, setProfileData] = useState({ name: user?.name || '', email: user?.email || '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Password state
  const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '', confirm: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false });

  const [notifications, setNotifications] = useState({
    email: true, push: true, sound: false, alerts: true
  });

  const handleProfileSave = async () => {
    if (!profileData.name.trim()) { toast.error('الاسم مطلوب'); return; }
    setProfileLoading(true);
    try {
      const res = await axios.put(`${API}/auth/update-profile`, profileData);
      toast.success(res.data?.message || 'تم الحفظ');
      setUser(prev => prev ? { ...prev, name: profileData.name, email: profileData.email } : prev);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'فشل الحفظ');
    } finally { setProfileLoading(false); }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.current_password) { toast.error('أدخل كلمة المرور الحالية'); return; }
    if (!passwordData.new_password || passwordData.new_password.length < 4) {
      toast.error('كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل'); return;
    }
    if (passwordData.new_password !== passwordData.confirm) {
      toast.error('كلمة المرور الجديدة وتأكيدها غير متطابقين'); return;
    }
    setPasswordLoading(true);
    try {
      const res = await axios.post(`${API}/auth/change-password`, {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });
      toast.success(res.data?.message || 'تم التغيير');
      setPasswordData({ current_password: '', new_password: '', confirm: '' });
    } catch (e) {
      toast.error(e.response?.data?.detail || 'فشل التغيير');
    } finally { setPasswordLoading(false); }
  };

  const roleLabels = {
    system_admin: 'مسؤول النظام',
    general_manager: 'المدير العام',
    department_manager: 'مدير الإدارة',
    shift_supervisor: 'مشرف الوردية',
    field_staff: 'عامل ميداني',
    monitoring_team: 'فريق المراقبة',
  };

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
        {/* My Account - حسابي */}
        <SettingsSection
          icon={UserCircle}
          title={language === 'ar' ? 'حسابي' : 'My Account'}
          description={language === 'ar' ? 'إدارة بيانات حسابك الشخصي' : 'Manage your account details'}
        >
          <div className="space-y-4">
            {/* Avatar + Role badge */}
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="font-cairo font-bold text-2xl text-primary">
                  {user?.name?.charAt(0) || 'م'}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold" data-testid="profile-display-name">{user?.name || 'مستخدم'}</h3>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary" data-testid="profile-role-badge">
                  {roleLabels[user?.role] || user?.role}
                </span>
                {user?.email && <p className="text-xs text-muted-foreground mt-1">{user.email}</p>}
              </div>
            </div>
            
            <Separator />
            
            {/* Editable fields */}
            <div className="space-y-3">
              <div>
                <Label className="text-sm flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  {language === 'ar' ? 'الاسم' : 'Name'}
                </Label>
                <Input
                  value={profileData.name}
                  onChange={e => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1"
                  data-testid="profile-name-input"
                />
              </div>
              <div>
                <Label className="text-sm flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                </Label>
                <Input
                  value={profileData.email}
                  onChange={e => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                  className="mt-1" dir="ltr"
                  data-testid="profile-email-input"
                />
              </div>
            </div>
            
            <Button
              onClick={handleProfileSave}
              disabled={profileLoading}
              className="w-full bg-primary hover:bg-primary/90"
              data-testid="profile-save-btn"
            >
              {profileLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" />
                : profileSaved ? <><Check className="w-4 h-4 ml-2" />{language === 'ar' ? 'تم الحفظ' : 'Saved'}</>
                : language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'
              }
            </Button>
          </div>
        </SettingsSection>

        {/* Change Password - تغيير كلمة المرور */}
        <SettingsSection
          icon={Lock}
          title={language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
          description={language === 'ar' ? 'تحديث كلمة المرور الخاصة بحسابك' : 'Update your account password'}
        >
          <div className="space-y-3">
            <div>
              <Label className="text-sm">{language === 'ar' ? 'كلمة المرور الحالية' : 'Current Password'}</Label>
              <div className="relative mt-1">
                <Input
                  type={showPasswords.current ? "text" : "password"}
                  value={passwordData.current_password}
                  onChange={e => setPasswordData(prev => ({ ...prev, current_password: e.target.value }))}
                  placeholder="••••••••" dir="ltr"
                  data-testid="current-password-input"
                />
                <button type="button" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}>
                  {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-sm">{language === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}</Label>
              <div className="relative mt-1">
                <Input
                  type={showPasswords.new ? "text" : "password"}
                  value={passwordData.new_password}
                  onChange={e => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                  placeholder="••••••••" dir="ltr"
                  data-testid="new-password-input"
                />
                <button type="button" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}>
                  {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-sm">{language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}</Label>
              <Input
                type="password"
                value={passwordData.confirm}
                onChange={e => setPasswordData(prev => ({ ...prev, confirm: e.target.value }))}
                placeholder="••••••••" dir="ltr" className="mt-1"
                data-testid="confirm-password-input"
              />
              {passwordData.new_password && passwordData.confirm && passwordData.new_password !== passwordData.confirm && (
                <p className="text-[11px] text-red-500 mt-1">{language === 'ar' ? 'غير متطابقة' : 'Passwords do not match'}</p>
              )}
            </div>
            <Button
              onClick={handlePasswordChange}
              disabled={passwordLoading || !passwordData.current_password || !passwordData.new_password}
              variant="outline"
              className="w-full border-primary text-primary hover:bg-primary hover:text-white"
              data-testid="change-password-submit-btn"
            >
              {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" />
                : language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'
              }
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

        {/* Security Info */}
        <SettingsSection
          icon={Shield}
          title={language === 'ar' ? 'معلومات الأمان' : 'Security Info'}
          description={language === 'ar' ? 'حالة أمان حسابك' : 'Your account security status'}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm">{language === 'ar' ? 'حالة الحساب' : 'Account Status'}</span>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" data-testid="account-status-badge">
                {language === 'ar' ? 'نشط' : 'Active'}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between py-2">
              <span className="text-sm">{language === 'ar' ? 'الدور' : 'Role'}</span>
              <span className="text-sm text-muted-foreground">{roleLabels[user?.role] || user?.role}</span>
            </div>
            {user?.department && <>
              <Separator />
              <div className="flex items-center justify-between py-2">
                <span className="text-sm">{language === 'ar' ? 'الإدارة' : 'Department'}</span>
                <span className="text-sm text-muted-foreground">{user.department}</span>
              </div>
            </>}
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
