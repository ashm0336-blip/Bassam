import { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import axios from "axios";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings,
  Shield,
  Clock,
  Bell,
  Database,
  Lock,
  Key,
  AlertTriangle,
  Save,
  Trash2,
  LogIn,
  Upload,
  Image as ImageIcon,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SettingSection = ({ icon: Icon, title, description, children }) => (
  <Card className="card-hover">
    <CardHeader className="pb-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <CardTitle className="font-cairo text-base">{title}</CardTitle>
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
      <Label className="font-medium text-sm">{label}</Label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
    {children}
  </div>
);

export default function SystemSettings() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState("login");
  
  const [settings, setSettings] = useState({
    platformName: "منصة خدمات الحشود",
    sessionDuration: "24",
    passwordMinLength: "8",
    requireSpecialChars: true,
    require2FA: false,
    autoLogout: true,
    autoLogoutMinutes: "30",
    enableEmailNotifications: true,
    enablePushNotifications: true,
    enableActivityLog: true,
    autoBackup: true,
    backupFrequency: "daily"
  });

  const [loginSettings, setLoginSettings] = useState({
    site_name_ar: "خدمات الحشود",
    site_name_en: "Crowd Services",
    subtitle_ar: "منصة إدارة الحشود في الحرم المكي الشريف",
    subtitle_en: "Crowd Management Platform at Al-Haram",
    logo_url: "",
    background_url: "",
    primary_color: "#DC2626",
    welcome_text_ar: "مرحباً بك",
    welcome_text_en: "Welcome"
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLoginSettings();
  }, []);

  const fetchLoginSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings/login-page`);
      setLoginSettings(response.data);
    } catch (error) {
      console.error("Error fetching login settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLoginSettings = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      
      await axios.put(`${API}/admin/settings/login-page`, loginSettings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(language === 'ar' ? "تم حفظ إعدادات شاشة الدخول بنجاح" : "Login page settings saved successfully");
    } catch (error) {
      console.error("Error saving login settings:", error);
      toast.error(language === 'ar' ? "فشل حفظ الإعدادات" : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    toast.success(language === 'ar' ? "تم حفظ الإعدادات بنجاح" : "Settings saved successfully");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-cairo font-bold text-xl text-right">
          {language === 'ar' ? 'إعدادات النظام' : 'System Settings'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1 text-right">
          {language === 'ar' ? 'إدارة إعدادات الأمان والنظام العامة' : 'Manage security and general system settings'}
        </p>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6 h-auto p-1">
          <TabsTrigger value="login" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-white">
            <LogIn className="w-5 h-5" />
            <span className="text-xs">{language === 'ar' ? 'شاشة الدخول' : 'Login Page'}</span>
          </TabsTrigger>
          <TabsTrigger value="general" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-white">
            <Settings className="w-5 h-5" />
            <span className="text-xs">{language === 'ar' ? 'عامة' : 'General'}</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-white">
            <Shield className="w-5 h-5" />
            <span className="text-xs">{language === 'ar' ? 'الأمان' : 'Security'}</span>
          </TabsTrigger>
          <TabsTrigger value="session" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-white">
            <Clock className="w-5 h-5" />
            <span className="text-xs">{language === 'ar' ? 'الجلسة' : 'Session'}</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-white">
            <Bell className="w-5 h-5" />
            <span className="text-xs">{language === 'ar' ? 'الإشعارات' : 'Notifications'}</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-white">
            <Database className="w-5 h-5" />
            <span className="text-xs">{language === 'ar' ? 'البيانات' : 'Data'}</span>
          </TabsTrigger>
        </TabsList>

        {/* Login Page Settings Tab */}
        <TabsContent value="login" className="mt-6">
          <SettingSection
            icon={LogIn}
            title={language === 'ar' ? 'إعدادات شاشة الدخول' : 'Login Page Settings'}
            description={language === 'ar' ? 'تخصيص شاشة الدخول والشعار' : 'Customize login page and branding'}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm">{language === 'ar' ? 'اسم الموقع (عربي)' : 'Site Name (Arabic)'}</Label>
                  <Input 
                    value={loginSettings.site_name_ar}
                    onChange={(e) => setLoginSettings({...loginSettings, site_name_ar: e.target.value})}
                    className="mt-1"
                    placeholder="خدمات الحشود"
                  />
                </div>

                <div>
                  <Label className="text-sm">{language === 'ar' ? 'اسم الموقع (إنجليزي)' : 'Site Name (English)'}</Label>
                  <Input 
                    value={loginSettings.site_name_en}
                    onChange={(e) => setLoginSettings({...loginSettings, site_name_en: e.target.value})}
                    className="mt-1"
                    placeholder="Crowd Services"
                  />
                </div>

                <div>
                  <Label className="text-sm">{language === 'ar' ? 'النص الترحيبي (عربي)' : 'Welcome Text (Arabic)'}</Label>
                  <Input 
                    value={loginSettings.welcome_text_ar}
                    onChange={(e) => setLoginSettings({...loginSettings, welcome_text_ar: e.target.value})}
                    className="mt-1"
                    placeholder="مرحباً بك"
                  />
                </div>

                <div>
                  <Label className="text-sm">{language === 'ar' ? 'النص الترحيبي (إنجليزي)' : 'Welcome Text (English)'}</Label>
                  <Input 
                    value={loginSettings.welcome_text_en}
                    onChange={(e) => setLoginSettings({...loginSettings, welcome_text_en: e.target.value})}
                    className="mt-1"
                    placeholder="Welcome"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm">{language === 'ar' ? 'الوصف (عربي)' : 'Subtitle (Arabic)'}</Label>
                  <Textarea 
                    value={loginSettings.subtitle_ar}
                    onChange={(e) => setLoginSettings({...loginSettings, subtitle_ar: e.target.value})}
                    className="mt-1"
                    rows={2}
                    placeholder="منصة إدارة الحشود..."
                  />
                </div>

                <div>
                  <Label className="text-sm">{language === 'ar' ? 'الوصف (إنجليزي)' : 'Subtitle (English)'}</Label>
                  <Textarea 
                    value={loginSettings.subtitle_en}
                    onChange={(e) => setLoginSettings({...loginSettings, subtitle_en: e.target.value})}
                    className="mt-1"
                    rows={2}
                    placeholder="Crowd Management Platform..."
                  />
                </div>

                <div>
                  <Label className="text-sm">{language === 'ar' ? 'رابط الشعار (Logo URL)' : 'Logo URL'}</Label>
                  <Input 
                    value={loginSettings.logo_url}
                    onChange={(e) => setLoginSettings({...loginSettings, logo_url: e.target.value})}
                    className="mt-1"
                    placeholder="https://example.com/logo.png"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {language === 'ar' ? 'رابط مباشر للصورة' : 'Direct image URL'}
                  </p>
                </div>

                <div>
                  <Label className="text-sm">{language === 'ar' ? 'رابط صورة الخلفية' : 'Background Image URL'}</Label>
                  <Input 
                    value={loginSettings.background_url}
                    onChange={(e) => setLoginSettings({...loginSettings, background_url: e.target.value})}
                    className="mt-1"
                    placeholder="https://example.com/background.jpg"
                  />
                </div>

                <div>
                  <Label className="text-sm">{language === 'ar' ? 'اللون الأساسي' : 'Primary Color'}</Label>
                  <div className="flex gap-2 mt-1">
                    <Input 
                      type="color"
                      value={loginSettings.primary_color}
                      onChange={(e) => setLoginSettings({...loginSettings, primary_color: e.target.value})}
                      className="w-16 h-10"
                    />
                    <Input 
                      value={loginSettings.primary_color}
                      onChange={(e) => setLoginSettings({...loginSettings, primary_color: e.target.value})}
                      placeholder="#DC2626"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="flex justify-end">
              <Button 
                onClick={handleSaveLoginSettings} 
                className="bg-primary hover:bg-primary/90"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Save className="w-4 h-4 ml-2 animate-spin" />
                    {language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 ml-2" />
                    {language === 'ar' ? 'حفظ إعدادات شاشة الدخول' : 'Save Login Page Settings'}
                  </>
                )}
              </Button>
            </div>
          </SettingSection>
        </div>

        {/* General Settings */}
        <SettingSection
          icon={Settings}
          title={language === 'ar' ? 'الإعدادات العامة' : 'General Settings'}
          description={language === 'ar' ? 'إعدادات المنصة الأساسية' : 'Basic platform settings'}
        >
          <div className="space-y-3">
            <div>
              <Label className="text-sm">{language === 'ar' ? 'اسم المنصة' : 'Platform Name'}</Label>
              <Input 
                value={settings.platformName}
                onChange={(e) => setSettings({...settings, platformName: e.target.value})}
                className="mt-1"
              />
            </div>
          </div>
        </SettingSection>

        {/* Security Settings */}
        <SettingSection
          icon={Shield}
          title={language === 'ar' ? 'إعدادات الأمان' : 'Security Settings'}
          description={language === 'ar' ? 'إدارة أمان النظام' : 'Manage system security'}
        >
          <div className="space-y-1">
            <SettingItem 
              label={language === 'ar' ? 'طول كلمة المرور الأدنى' : 'Minimum Password Length'}
            >
              <Input 
                type="number"
                value={settings.passwordMinLength}
                onChange={(e) => setSettings({...settings, passwordMinLength: e.target.value})}
                className="w-20"
              />
            </SettingItem>
            
            <Separator />
            
            <SettingItem 
              label={language === 'ar' ? 'طلب رموز خاصة' : 'Require Special Characters'}
              description={language === 'ar' ? 'فرض استخدام رموز خاصة في كلمات المرور' : 'Enforce special characters in passwords'}
            >
              <Switch 
                checked={settings.requireSpecialChars}
                onCheckedChange={(checked) => setSettings({...settings, requireSpecialChars: checked})}
              />
            </SettingItem>
            
            <Separator />
            
            <SettingItem 
              label={language === 'ar' ? 'المصادقة الثنائية' : 'Two-Factor Authentication'}
              description={language === 'ar' ? 'تفعيل 2FA للمستخدمين' : 'Enable 2FA for users'}
            >
              <Switch 
                checked={settings.require2FA}
                onCheckedChange={(checked) => setSettings({...settings, require2FA: checked})}
              />
            </SettingItem>
          </div>
        </SettingSection>

        {/* Session Settings */}
        <SettingSection
          icon={Clock}
          title={language === 'ar' ? 'إعدادات الجلسة' : 'Session Settings'}
          description={language === 'ar' ? 'إدارة جلسات المستخدمين' : 'Manage user sessions'}
        >
          <div className="space-y-1">
            <SettingItem 
              label={language === 'ar' ? 'مدة الجلسة (ساعات)' : 'Session Duration (hours)'}
            >
              <Input 
                type="number"
                value={settings.sessionDuration}
                onChange={(e) => setSettings({...settings, sessionDuration: e.target.value})}
                className="w-20"
              />
            </SettingItem>
            
            <Separator />
            
            <SettingItem 
              label={language === 'ar' ? 'تسجيل خروج تلقائي' : 'Auto Logout'}
              description={language === 'ar' ? 'عند عدم النشاط' : 'On inactivity'}
            >
              <Switch 
                checked={settings.autoLogout}
                onCheckedChange={(checked) => setSettings({...settings, autoLogout: checked})}
              />
            </SettingItem>
            
            {settings.autoLogout && (
              <>
                <Separator />
                <SettingItem 
                  label={language === 'ar' ? 'مدة عدم النشاط (دقائق)' : 'Inactivity Duration (minutes)'}
                >
                  <Input 
                    type="number"
                    value={settings.autoLogoutMinutes}
                    onChange={(e) => setSettings({...settings, autoLogoutMinutes: e.target.value})}
                    className="w-20"
                  />
                </SettingItem>
              </>
            )}
          </div>
        </SettingSection>

        {/* Notification Settings */}
        <SettingSection
          icon={Bell}
          title={language === 'ar' ? 'إعدادات الإشعارات' : 'Notification Settings'}
          description={language === 'ar' ? 'إدارة إشعارات النظام' : 'Manage system notifications'}
        >
          <div className="space-y-1">
            <SettingItem 
              label={language === 'ar' ? 'إشعارات البريد' : 'Email Notifications'}
              description={language === 'ar' ? 'إرسال إشعارات عبر البريد الإلكتروني' : 'Send email notifications'}
            >
              <Switch 
                checked={settings.enableEmailNotifications}
                onCheckedChange={(checked) => setSettings({...settings, enableEmailNotifications: checked})}
              />
            </SettingItem>
            
            <Separator />
            
            <SettingItem 
              label={language === 'ar' ? 'الإشعارات الفورية' : 'Push Notifications'}
              description={language === 'ar' ? 'إشعارات داخل التطبيق' : 'In-app notifications'}
            >
              <Switch 
                checked={settings.enablePushNotifications}
                onCheckedChange={(checked) => setSettings({...settings, enablePushNotifications: checked})}
              />
            </SettingItem>
          </div>
        </SettingSection>

        {/* Data & Backup Settings */}
        <SettingSection
          icon={Database}
          title={language === 'ar' ? 'البيانات والنسخ الاحتياطي' : 'Data & Backup'}
          description={language === 'ar' ? 'إدارة البيانات والنسخ الاحتياطية' : 'Manage data and backups'}
        >
          <div className="space-y-1">
            <SettingItem 
              label={language === 'ar' ? 'تفعيل سجل النشاط' : 'Enable Activity Log'}
              description={language === 'ar' ? 'تسجيل جميع الإجراءات' : 'Log all actions'}
            >
              <Switch 
                checked={settings.enableActivityLog}
                onCheckedChange={(checked) => setSettings({...settings, enableActivityLog: checked})}
              />
            </SettingItem>
            
            <Separator />
            
            <SettingItem 
              label={language === 'ar' ? 'النسخ الاحتياطي التلقائي' : 'Auto Backup'}
            >
              <Switch 
                checked={settings.autoBackup}
                onCheckedChange={(checked) => setSettings({...settings, autoBackup: checked})}
              />
            </SettingItem>
            
            {settings.autoBackup && (
              <>
                <Separator />
                <SettingItem 
                  label={language === 'ar' ? 'تكرار النسخ الاحتياطي' : 'Backup Frequency'}
                >
                  <Select value={settings.backupFrequency} onValueChange={(value) => setSettings({...settings, backupFrequency: value})}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="hourly">{language === 'ar' ? 'كل ساعة' : 'Hourly'}</SelectItem>
                      <SelectItem value="daily">{language === 'ar' ? 'يومي' : 'Daily'}</SelectItem>
                      <SelectItem value="weekly">{language === 'ar' ? 'أسبوعي' : 'Weekly'}</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingItem>
              </>
            )}
            
            <Separator />
            
            <div className="pt-2">
              <Button variant="outline" className="w-full">
                <Database className="w-4 h-4 ml-2" />
                {language === 'ar' ? 'تنزيل نسخة احتياطية الآن' : 'Download Backup Now'}
              </Button>
            </div>
          </div>
        </SettingSection>

        {/* Danger Zone */}
        <SettingSection
          icon={AlertTriangle}
          title={language === 'ar' ? 'منطقة الخطر' : 'Danger Zone'}
          description={language === 'ar' ? 'إجراءات حساسة ونهائية' : 'Sensitive and final actions'}
        >
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start text-destructive border-destructive/50 hover:bg-destructive/10">
              <Trash2 className="w-4 h-4 ml-2" />
              {language === 'ar' ? 'مسح جميع سجلات النشاط' : 'Clear All Activity Logs'}
            </Button>
            <Button variant="outline" className="w-full justify-start text-destructive border-destructive/50 hover:bg-destructive/10">
              <AlertTriangle className="w-4 h-4 ml-2" />
              {language === 'ar' ? 'إعادة تعيين النظام' : 'Reset System'}
            </Button>
          </div>
        </SettingSection>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button variant="outline">
          {language === 'ar' ? 'إلغاء' : 'Cancel'}
        </Button>
        <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
          <Save className="w-4 h-4 ml-2" />
          {language === 'ar' ? 'حفظ الإعدادات' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
