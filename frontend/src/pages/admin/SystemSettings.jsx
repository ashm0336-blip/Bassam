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
  AlertTriangle,
  Save,
  Trash2,
  LogIn,
  Loader2,
  Upload,
  Image as ImageIcon
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
    logo_link: "/",
    logo_size: 150,
    background_url: "",
    primary_color: "#DC2626",
    welcome_text_ar: "مرحباً بك",
    welcome_text_en: "Welcome"
  });

  const [headerSettings, setHeaderSettings] = useState({
    background_color: "#FFFFFF",
    text_color: "#000000",
    show_shadow: true,
    show_date: true,
    show_page_name: true,
    show_user_name: true,
    show_language_toggle: true,
    show_theme_toggle: true,
    show_logout_button: true,
    custom_greeting_ar: "أهلاً",
    custom_greeting_en: "Hello",
    show_logo: false,
    header_logo_url: "",
    header_height: 64,
    border_style: "solid",
    transparency: 100
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLoginSettings();
    fetchHeaderSettings();
  }, []);

  const fetchHeaderSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings/header`);
      setHeaderSettings(response.data);
    } catch (error) {
      console.error("Error fetching header settings:", error);
    }
  };

  const handleSaveHeaderSettings = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      
      await axios.put(`${API}/admin/settings/header`, headerSettings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(language === 'ar' ? "تم حفظ إعدادات Header بنجاح" : "Header settings saved successfully");
      window.location.reload(); // Reload to apply changes
    } catch (error) {
      console.error("Error saving header settings:", error);
      toast.error(language === 'ar' ? "فشل حفظ الإعدادات" : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

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

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(language === 'ar' ? 'يرجى اختيار صورة صالحة' : 'Please select a valid image');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setLoginSettings({...loginSettings, logo_url: reader.result});
      toast.success(language === 'ar' ? 'تم رفع الشعار' : 'Logo uploaded');
    };
    reader.readAsDataURL(file);
  };

  const handleBackgroundUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(language === 'ar' ? 'يرجى اختيار صورة صالحة' : 'Please select a valid image');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLoginSettings({...loginSettings, background_url: reader.result});
      toast.success(language === 'ar' ? 'تم رفع صورة الخلفية' : 'Background uploaded');
    };
    reader.readAsDataURL(file);
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
        <TabsList className="grid w-full grid-cols-7 h-auto p-1">
          <TabsTrigger value="login" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-white">
            <LogIn className="w-5 h-5" />
            <span className="text-xs">{language === 'ar' ? 'شاشة الدخول' : 'Login'}</span>
          </TabsTrigger>
          <TabsTrigger value="header" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-white">
            <Settings className="w-5 h-5" />
            <span className="text-xs">{language === 'ar' ? 'الهيدر' : 'Header'}</span>
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
            <div className="space-y-6" dir="rtl">
              {/* Logo Section */}
              <div>
                <Label className="font-medium mb-3 block text-right">{language === 'ar' ? 'شعار شخصي' : 'Custom Logo'}</Label>
                <p className="text-xs text-muted-foreground mb-3 text-right">
                  {language === 'ar' ? 'نحن نعرض شعار مخصص بدلا من الشعار الافتراضي' : 'Display custom logo instead of default'}
                </p>
                
                {/* Logo Preview */}
                <div className="flex items-start gap-4 mb-4 flex-row-reverse">
                  <div 
                    className="border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50"
                    style={{ width: '192px', height: '192px' }}
                  >
                    {loginSettings.logo_url ? (
                      <img 
                        src={loginSettings.logo_url} 
                        alt="Logo" 
                        className="object-contain"
                        style={{ 
                          width: `${loginSettings.logo_size}px`,
                          height: `${loginSettings.logo_size}px`,
                          maxWidth: '100%',
                          maxHeight: '100%'
                        }}
                      />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <ImageIcon className="w-12 h-12 mx-auto mb-2" />
                        <p className="text-xs">{language === 'ar' ? 'لا يوجد شعار' : 'No logo'}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      type="button"
                      variant="outline" 
                      className="border-destructive text-destructive hover:bg-destructive/10"
                      onClick={() => setLoginSettings({...loginSettings, logo_url: ""})}
                    >
                      {language === 'ar' ? 'إزالة' : 'Remove'}
                    </Button>
                    <Button 
                      type="button"
                      variant="default"
                      onClick={() => document.getElementById('logo-upload').click()}
                    >
                      {language === 'ar' ? 'رفع' : 'Upload'}
                    </Button>
                    <input 
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Logo Size Control */}
                <div className="mb-4">
                  <Label className="font-medium mb-2 block text-right">{language === 'ar' ? 'حجم الشعار' : 'Logo Size'}</Label>
                  <p className="text-xs text-muted-foreground mb-3 text-right">
                    {language === 'ar' ? 'تعيين حجم عرض الشعار في شاشة الدخول' : 'Set logo display size on login screen'}
                  </p>
                  <div className="flex items-center gap-4 flex-row-reverse">
                    <span className="text-sm text-muted-foreground w-20 text-right">{loginSettings.logo_size}px</span>
                    <input 
                      type="range" 
                      min="50" 
                      max="300" 
                      value={loginSettings.logo_size}
                      onChange={(e) => setLoginSettings({...loginSettings, logo_size: parseInt(e.target.value)})}
                      className="flex-1"
                      dir="rtl"
                    />
                    <Input 
                      type="number"
                      min="50"
                      max="300"
                      value={loginSettings.logo_size}
                      onChange={(e) => setLoginSettings({...loginSettings, logo_size: parseInt(e.target.value) || 150})}
                      className="w-24"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-right">
                    {language === 'ar' ? 'قيمة بين 50 و 300 بكسل (المثالي: 150 بكسل)' : 'Value between 50 and 300 pixels (Ideal: 150px)'}
                  </p>
                </div>

                {/* Logo Link */}
                <div>
                  <Label className="text-sm text-right block">{language === 'ar' ? 'رابط الشعار' : 'Logo Link'}</Label>
                  <Input 
                    value={loginSettings.logo_link || "/"}
                    onChange={(e) => setLoginSettings({...loginSettings, logo_link: e.target.value})}
                    className="mt-1"
                    placeholder="/"
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-right">
                    {language === 'ar' ? 'الرابط الذي يتم التوجيه إليه عند النقر على الشعار' : 'Link to redirect when clicking logo'}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Welcome Text */}
              <div>
                <Label className="font-medium mb-2 block text-right">{language === 'ar' ? 'نص الترحيب' : 'Welcome Text'}</Label>
                <p className="text-xs text-muted-foreground mb-3 text-right">
                  {language === 'ar' ? 'تعيين نص الترحيب في شاشة الدخول' : 'Set welcome text on login screen'}
                </p>
                <Input 
                  value={loginSettings.welcome_text_ar}
                  onChange={(e) => setLoginSettings({...loginSettings, welcome_text_ar: e.target.value})}
                  placeholder={language === 'ar' ? 'مرحباً بك' : 'Welcome'}
                  className="text-right"
                />
              </div>

              <Separator />

              {/* Site Name */}
              <div>
                <Label className="font-medium mb-2 block text-right">{language === 'ar' ? 'اسم الموقع' : 'Site Name'}</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground text-right block">{language === 'ar' ? 'عربي' : 'Arabic'}</Label>
                    <Input 
                      value={loginSettings.site_name_ar}
                      onChange={(e) => setLoginSettings({...loginSettings, site_name_ar: e.target.value})}
                      className="mt-1 text-right"
                      placeholder="خدمات الحشود"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground text-right block">{language === 'ar' ? 'إنجليزي' : 'English'}</Label>
                    <Input 
                      value={loginSettings.site_name_en}
                      onChange={(e) => setLoginSettings({...loginSettings, site_name_en: e.target.value})}
                      className="mt-1 text-right"
                      placeholder="Crowd Services"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Background Image Section */}
              <div>
                <Label className="font-medium mb-2 block text-right">{language === 'ar' ? 'صورة الخلفية' : 'Background Image'}</Label>
                <p className="text-xs text-muted-foreground mb-3 text-right">
                  {language === 'ar' ? 'تعرض صورة خلفية مخصصة بنصف عرض الشاشة' : 'Display custom background image at half screen width'}
                </p>
                <div className="space-y-3">
                  <Button 
                    type="button"
                    variant="outline" 
                    className="w-full"
                    onClick={() => document.getElementById('background-upload').click()}
                  >
                    <Upload className="w-4 h-4 ml-2" />
                    {language === 'ar' ? 'رفع صورة' : 'Upload Image'}
                  </Button>
                  <input 
                    id="background-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleBackgroundUpload}
                    className="hidden"
                  />
                  {loginSettings.background_url && (
                    <div className="text-xs text-muted-foreground text-right">
                      ✓ {language === 'ar' ? 'تم رفع صورة الخلفية' : 'Background uploaded'}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Custom Title (Subtitle) */}
              <div>
                <Label className="font-medium mb-2 block text-right">{language === 'ar' ? 'عنوان مخصص' : 'Custom Title'}</Label>
                <p className="text-xs text-muted-foreground mb-3 text-right">
                  {language === 'ar' ? 'تعرض عنوان مخصص فوق صورة الخلفية' : 'Display custom title above background image'}
                </p>
                <Textarea 
                  value={loginSettings.subtitle_ar}
                  onChange={(e) => setLoginSettings({...loginSettings, subtitle_ar: e.target.value})}
                  rows={3}
                  placeholder={language === 'ar' ? 'منصة إدارة الحشود في الحرم المكي الشريف' : 'Platform description...'}
                  className="text-right"
                />
              </div>

              <Separator />

              {/* Custom Text (Additional description) */}
              <div>
                <Label className="font-medium mb-2 block text-right">{language === 'ar' ? 'نص متخصص' : 'Specialist Text'}</Label>
                <p className="text-xs text-muted-foreground mb-3 text-right">
                  {language === 'ar' ? 'تعرض نص متخصص فوق صورة الخلفية' : 'Display specialist text above background image'}
                </p>
                <Textarea 
                  value={loginSettings.subtitle_en}
                  onChange={(e) => setLoginSettings({...loginSettings, subtitle_en: e.target.value})}
                  rows={4}
                  placeholder={language === 'ar' ? 'نص إضافي للوصف...' : 'Additional description text...'}
                  className="text-right"
                />
              </div>

              <Separator />

              {/* Transparency/Opacity */}
              <div>
                <Label className="font-medium mb-2 block text-right">{language === 'ar' ? 'الشفافية' : 'Transparency'}</Label>
                <p className="text-xs text-muted-foreground mb-3 text-right">
                  {language === 'ar' ? 'تعيين تعتيم التراكب' : 'Set overlay opacity'}
                </p>
                <div className="flex items-center gap-4 flex-row-reverse">
                  <Input 
                    type="number"
                    min="0"
                    max="100"
                    defaultValue="20"
                    className="w-20"
                  />
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    defaultValue="20"
                    className="flex-1"
                    dir="rtl"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-right">
                  {language === 'ar' ? 'قيمة بين 0 و 100%' : 'Value between 0 and 100%'}
                </p>
              </div>

              <Separator />

              {/* Primary Color */}
              <div>
                <Label className="font-medium mb-2 block text-right">{language === 'ar' ? 'لون العنوان المخصص' : 'Custom Title Color'}</Label>
                <p className="text-xs text-muted-foreground mb-3 text-right">
                  {language === 'ar' ? 'حدد لون النص الخاص بك لقسم العنوان المخصص' : 'Set your text color for the custom title section'}
                </p>
                <div className="flex gap-2 flex-row-reverse">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="transparent" className="text-sm">Transparent</Label>
                    <input type="checkbox" id="transparent" className="rounded" />
                  </div>
                  <Input 
                    value={loginSettings.primary_color}
                    onChange={(e) => setLoginSettings({...loginSettings, primary_color: e.target.value})}
                    placeholder="#DC2626"
                    className="flex-1 text-right"
                  />
                  <Input 
                    type="color"
                    value={loginSettings.primary_color}
                    onChange={(e) => setLoginSettings({...loginSettings, primary_color: e.target.value})}
                    className="w-16 h-10"
                  />
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="flex justify-end">
              <Button 
                onClick={handleSaveLoginSettings} 
                className="bg-primary hover:bg-primary/90"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    {language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 ml-2" />
                    {language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
                  </>
                )}
              </Button>
            </div>
          </SettingSection>
        </TabsContent>

        {/* Header Settings Tab */}
        <TabsContent value="header" className="mt-6">
          <SettingSection
            icon={Settings}
            title={language === 'ar' ? 'إعدادات Header' : 'Header Settings'}
            description={language === 'ar' ? 'تخصيص شريط العلوي للمنصة' : 'Customize platform header bar'}
          >
            <div className="space-y-6" dir="rtl">
              {/* Colors Section */}
              <div>
                <Label className="font-medium mb-3 block text-right">{language === 'ar' ? 'الألوان' : 'Colors'}</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-right block mb-2">{language === 'ar' ? 'لون الخلفية' : 'Background Color'}</Label>
                    <div className="flex gap-2 flex-row-reverse">
                      <Input 
                        value={headerSettings.background_color}
                        onChange={(e) => setHeaderSettings({...headerSettings, background_color: e.target.value})}
                        className="flex-1 text-right"
                      />
                      <Input 
                        type="color"
                        value={headerSettings.background_color}
                        onChange={(e) => setHeaderSettings({...headerSettings, background_color: e.target.value})}
                        className="w-16"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-right block mb-2">{language === 'ar' ? 'لون النص' : 'Text Color'}</Label>
                    <div className="flex gap-2 flex-row-reverse">
                      <Input 
                        value={headerSettings.text_color}
                        onChange={(e) => setHeaderSettings({...headerSettings, text_color: e.target.value})}
                        className="flex-1 text-right"
                      />
                      <Input 
                        type="color"
                        value={headerSettings.text_color}
                        onChange={(e) => setHeaderSettings({...headerSettings, text_color: e.target.value})}
                        className="w-16"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Appearance Section */}
              <div>
                <Label className="font-medium mb-3 block text-right">{language === 'ar' ? 'المظهر' : 'Appearance'}</Label>
                <div className="space-y-3">
                  <SettingItem label={language === 'ar' ? 'إظهار الظل' : 'Show Shadow'}>
                    <Switch checked={headerSettings.show_shadow} onCheckedChange={(v) => setHeaderSettings({...headerSettings, show_shadow: v})} />
                  </SettingItem>
                  
                  <Separator />
                  
                  <div>
                    <Label className="text-sm text-right block mb-2">{language === 'ar' ? 'ارتفاع Header (بكسل)' : 'Header Height (px)'}</Label>
                    <div className="flex gap-4 items-center flex-row-reverse">
                      <span className="text-sm text-muted-foreground w-16 text-right">{headerSettings.header_height}px</span>
                      <input 
                        type="range" 
                        min="48" 
                        max="96" 
                        value={headerSettings.header_height}
                        onChange={(e) => setHeaderSettings({...headerSettings, header_height: parseInt(e.target.value)})}
                        className="flex-1"
                        dir="rtl"
                      />
                      <Input 
                        type="number"
                        min="48"
                        max="96"
                        value={headerSettings.header_height}
                        onChange={(e) => setHeaderSettings({...headerSettings, header_height: parseInt(e.target.value) || 64})}
                        className="w-20"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-right">
                      {language === 'ar' ? 'بين 48 و 96 بكسل (الافتراضي: 64)' : '48-96 pixels (default: 64)'}
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-sm text-right block mb-2">{language === 'ar' ? 'الشفافية' : 'Transparency'}</Label>
                    <div className="flex gap-4 items-center flex-row-reverse">
                      <span className="text-sm text-muted-foreground w-16 text-right">{headerSettings.transparency}%</span>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={headerSettings.transparency}
                        onChange={(e) => setHeaderSettings({...headerSettings, transparency: parseInt(e.target.value)})}
                        className="flex-1"
                        dir="rtl"
                      />
                      <Input 
                        type="number"
                        min="0"
                        max="100"
                        value={headerSettings.transparency}
                        onChange={(e) => setHeaderSettings({...headerSettings, transparency: parseInt(e.target.value) || 100})}
                        className="w-20"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Display Elements */}
              <div>
                <Label className="font-medium mb-3 block text-right">{language === 'ar' ? 'عناصر العرض' : 'Display Elements'}</Label>
                <div className="space-y-3">
                  <SettingItem label={language === 'ar' ? 'إظهار التاريخ' : 'Show Date'}>
                    <Switch checked={headerSettings.show_date} onCheckedChange={(v) => setHeaderSettings({...headerSettings, show_date: v})} />
                  </SettingItem>
                  
                  <Separator />
                  
                  <SettingItem label={language === 'ar' ? 'إظهار اسم الصفحة' : 'Show Page Name'}>
                    <Switch checked={headerSettings.show_page_name} onCheckedChange={(v) => setHeaderSettings({...headerSettings, show_page_name: v})} />
                  </SettingItem>
                  
                  <Separator />
                  
                  <SettingItem label={language === 'ar' ? 'إظهار اسم المستخدم' : 'Show User Name'}>
                    <Switch checked={headerSettings.show_user_name} onCheckedChange={(v) => setHeaderSettings({...headerSettings, show_user_name: v})} />
                  </SettingItem>
                  
                  <Separator />
                  
                  <SettingItem label={language === 'ar' ? 'زر تبديل اللغة' : 'Language Toggle'}>
                    <Switch checked={headerSettings.show_language_toggle} onCheckedChange={(v) => setHeaderSettings({...headerSettings, show_language_toggle: v})} />
                  </SettingItem>
                  
                  <Separator />
                  
                  <SettingItem label={language === 'ar' ? 'زر تبديل الثيم' : 'Theme Toggle'}>
                    <Switch checked={headerSettings.show_theme_toggle} onCheckedChange={(v) => setHeaderSettings({...headerSettings, show_theme_toggle: v})} />
                  </SettingItem>
                  
                  <Separator />
                  
                  <SettingItem label={language === 'ar' ? 'زر تسجيل الخروج' : 'Logout Button'}>
                    <Switch checked={headerSettings.show_logout_button} onCheckedChange={(v) => setHeaderSettings({...headerSettings, show_logout_button: v})} />
                  </SettingItem>
                </div>
              </div>

              <Separator />

              {/* Custom Text */}
              <div>
                <Label className="font-medium mb-3 block text-right">{language === 'ar' ? 'النص المخصص' : 'Custom Text'}</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground text-right block mb-2">{language === 'ar' ? 'نص الترحيب (عربي)' : 'Greeting (Arabic)'}</Label>
                    <Input 
                      value={headerSettings.custom_greeting_ar}
                      onChange={(e) => setHeaderSettings({...headerSettings, custom_greeting_ar: e.target.value})}
                      className="text-right"
                      placeholder="أهلاً"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground text-right block mb-2">{language === 'ar' ? 'نص الترحيب (إنجليزي)' : 'Greeting (English)'}</Label>
                    <Input 
                      value={headerSettings.custom_greeting_en}
                      onChange={(e) => setHeaderSettings({...headerSettings, custom_greeting_en: e.target.value})}
                      className="text-right"
                      placeholder="Hello"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-right">
                  {language === 'ar' ? 'سيظهر: "أهلاً، اسم المستخدم"' : 'Will display: "Hello, User Name"'}
                </p>
              </div>

              <Separator />

              {/* Logo in Header */}
              <div>
                <Label className="font-medium mb-3 block text-right">{language === 'ar' ? 'شعار Header' : 'Header Logo'}</Label>
                <SettingItem label={language === 'ar' ? 'إظهار الشعار في Header' : 'Show Logo in Header'}>
                  <Switch checked={headerSettings.show_logo} onCheckedChange={(v) => setHeaderSettings({...headerSettings, show_logo: v})} />
                </SettingItem>
                
                {headerSettings.show_logo && (
                  <div className="mt-3">
                    <Label className="text-sm text-right block mb-2">{language === 'ar' ? 'رابط الشعار' : 'Logo URL'}</Label>
                    <Input 
                      value={headerSettings.header_logo_url || ""}
                      onChange={(e) => setHeaderSettings({...headerSettings, header_logo_url: e.target.value})}
                      className="text-right"
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                )}
              </div>
            </div>

            <Separator className="my-6" />

            <div className="flex justify-end">
              <Button 
                onClick={handleSaveHeaderSettings} 
                className="bg-primary hover:bg-primary/90"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    {language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 ml-2" />
                    {language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
                  </>
                )}
              </Button>
            </div>
          </SettingSection>
        </TabsContent>

        {/* General Settings Tab */}
        <TabsContent value="general" className="mt-6">
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
        </TabsContent>

        {/* Security Settings Tab */}
        <TabsContent value="security" className="mt-6">
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
        </TabsContent>

        {/* Session Settings Tab */}
        <TabsContent value="session" className="mt-6">
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
        </TabsContent>

        {/* Notification Settings Tab */}
        <TabsContent value="notifications" className="mt-6">
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
        </TabsContent>

        {/* Data & Backup Settings Tab */}
        <TabsContent value="data" className="mt-6">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
