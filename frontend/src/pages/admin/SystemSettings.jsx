import { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { useHeader } from "@/context/HeaderContext";
import axios from "axios";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, LogIn, Loader2, Upload, Save,
  Image as ImageIcon, Sun, Moon, Monitor, Globe,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
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
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { refreshHeader } = useHeader();
  const isAr = language === 'ar';
  const [activeTab, setActiveTab] = useState("login");

  const [loginSettings, setLoginSettings] = useState({
    site_name_ar: "خدمات الحشود", site_name_en: "Crowd Services",
    subtitle_ar: "منصة إدارة الحشود في الحرم المكي الشريف",
    subtitle_en: "Crowd Management Platform at Al-Haram",
    logo_url: "", logo_link: "/", logo_size: 150,
    background_url: "", primary_color: "#DC2626",
    welcome_text_ar: "مرحباً بك", welcome_text_en: "Welcome"
  });

  const [headerSettings, setHeaderSettings] = useState({
    background_color: "#FFFFFF", text_color: "#000000",
    show_shadow: true, show_date: true, show_page_name: true,
    show_user_name: true, show_language_toggle: true,
    show_theme_toggle: true, show_logout_button: true,
    show_notifications_bell: true,
    custom_greeting_ar: "أهلاً", custom_greeting_en: "Hello",
    show_logo: false, header_logo_url: "",
    header_height: 64, border_style: "solid", transparency: 100
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchLoginSettings(); fetchHeaderSettings(); }, []);

  const fetchHeaderSettings = async () => {
    try { const r = await axios.get(`${API}/settings/header`); setHeaderSettings(r.data); } catch {}
  };

  const fetchLoginSettings = async () => {
    try { const r = await axios.get(`${API}/settings/login-page`); setLoginSettings(r.data); } catch {} finally { setLoading(false); }
  };

  const handleSaveLoginSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/admin/settings/login-page`, loginSettings, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      toast.success(isAr ? "تم حفظ إعدادات شاشة الدخول" : "Login settings saved");
    } catch { toast.error(isAr ? "فشل الحفظ" : "Save failed"); } finally { setSaving(false); }
  };

  const handleSaveHeaderSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/admin/settings/header`, headerSettings, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      toast.success(isAr ? "تم حفظ إعدادات الهيدر" : "Header settings saved");
      refreshHeader();
    } catch { toast.error(isAr ? "فشل الحفظ" : "Save failed"); } finally { setSaving(false); }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onloadend = () => { setLoginSettings({ ...loginSettings, logo_url: reader.result }); toast.success(isAr ? 'تم رفع الشعار' : 'Logo uploaded'); };
    reader.readAsDataURL(file);
  };

  const handleBackgroundUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onloadend = () => { setLoginSettings({ ...loginSettings, background_url: reader.result }); toast.success(isAr ? 'تم رفع الخلفية' : 'Background uploaded'); };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1">
          <TabsTrigger value="login" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-white">
            <LogIn className="w-5 h-5" />
            <span className="text-xs">{isAr ? 'شاشة الدخول' : 'Login Page'}</span>
          </TabsTrigger>
          <TabsTrigger value="header" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-white">
            <Settings className="w-5 h-5" />
            <span className="text-xs">{isAr ? 'الهيدر' : 'Header'}</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-white">
            <Globe className="w-5 h-5" />
            <span className="text-xs">{isAr ? 'المظهر واللغة' : 'Appearance'}</span>
          </TabsTrigger>
        </TabsList>

        {/* Login Page Settings */}
        <TabsContent value="login" className="mt-6">
          <SettingSection icon={LogIn} title={isAr ? 'إعدادات شاشة الدخول' : 'Login Page Settings'}
            description={isAr ? 'تخصيص شاشة الدخول والشعار' : 'Customize login page and branding'}>
            <div className="space-y-6" dir="rtl">
              {/* Logo */}
              <div>
                <Label className="font-medium mb-3 block text-right">{isAr ? 'الشعار' : 'Logo'}</Label>
                <div className="flex items-start gap-4 mb-4 flex-row-reverse">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50" style={{ width: '192px', height: '192px' }}>
                    {loginSettings.logo_url ? (
                      <img src={loginSettings.logo_url} alt="Logo" className="object-contain" style={{ width: `${loginSettings.logo_size}px`, height: `${loginSettings.logo_size}px`, maxWidth: '100%', maxHeight: '100%' }} />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <ImageIcon className="w-12 h-12 mx-auto mb-2" />
                        <p className="text-xs">{isAr ? 'لا يوجد شعار' : 'No logo'}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" onClick={() => setLoginSettings({ ...loginSettings, logo_url: "" })}>{isAr ? 'إزالة' : 'Remove'}</Button>
                    <Button variant="default" onClick={() => document.getElementById('logo-upload').click()}>{isAr ? 'رفع' : 'Upload'}</Button>
                    <input id="logo-upload" type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </div>
                </div>
                <div className="mb-4">
                  <Label className="text-sm text-right block mb-2">{isAr ? 'حجم الشعار' : 'Logo Size'}: {loginSettings.logo_size}px</Label>
                  <input type="range" min="50" max="300" value={loginSettings.logo_size} onChange={(e) => setLoginSettings({ ...loginSettings, logo_size: parseInt(e.target.value) })} className="w-full" dir="rtl" />
                </div>
              </div>

              <Separator />

              {/* Site Name */}
              <div>
                <Label className="font-medium mb-2 block text-right">{isAr ? 'اسم الموقع' : 'Site Name'}</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground text-right block">{isAr ? 'عربي' : 'Arabic'}</Label>
                    <Input value={loginSettings.site_name_ar} onChange={(e) => setLoginSettings({ ...loginSettings, site_name_ar: e.target.value })} className="mt-1 text-right" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground text-right block">{isAr ? 'إنجليزي' : 'English'}</Label>
                    <Input value={loginSettings.site_name_en} onChange={(e) => setLoginSettings({ ...loginSettings, site_name_en: e.target.value })} className="mt-1" />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Welcome + Subtitle */}
              <div>
                <Label className="font-medium mb-2 block text-right">{isAr ? 'نص الترحيب' : 'Welcome Text'}</Label>
                <Input value={loginSettings.welcome_text_ar} onChange={(e) => setLoginSettings({ ...loginSettings, welcome_text_ar: e.target.value })} className="text-right" />
              </div>

              <Separator />

              <div>
                <Label className="font-medium mb-2 block text-right">{isAr ? 'الوصف' : 'Description'}</Label>
                <Textarea value={loginSettings.subtitle_ar} onChange={(e) => setLoginSettings({ ...loginSettings, subtitle_ar: e.target.value })} rows={3} className="text-right" />
              </div>

              <Separator />

              {/* Background */}
              <div>
                <Label className="font-medium mb-2 block text-right">{isAr ? 'صورة الخلفية' : 'Background Image'}</Label>
                <Button variant="outline" className="w-full" onClick={() => document.getElementById('bg-upload').click()}>
                  <Upload className="w-4 h-4 ml-2" />{isAr ? 'رفع صورة' : 'Upload Image'}
                </Button>
                <input id="bg-upload" type="file" accept="image/*" onChange={handleBackgroundUpload} className="hidden" />
                {loginSettings.background_url && <p className="text-xs text-emerald-600 mt-2 text-right">{isAr ? 'تم رفع الخلفية' : 'Background uploaded'}</p>}
              </div>

              <Separator />

              {/* Primary Color */}
              <div>
                <Label className="font-medium mb-2 block text-right">{isAr ? 'اللون الرئيسي' : 'Primary Color'}</Label>
                <div className="flex gap-2 flex-row-reverse">
                  <Input value={loginSettings.primary_color} onChange={(e) => setLoginSettings({ ...loginSettings, primary_color: e.target.value })} className="flex-1 text-right" />
                  <Input type="color" value={loginSettings.primary_color} onChange={(e) => setLoginSettings({ ...loginSettings, primary_color: e.target.value })} className="w-16 h-10" />
                </div>
              </div>
            </div>

            <Separator className="my-6" />
            <div className="flex justify-end">
              <Button onClick={handleSaveLoginSettings} className="bg-primary hover:bg-primary/90" disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" />{isAr ? 'جاري الحفظ...' : 'Saving...'}</> : <><Save className="w-4 h-4 ml-2" />{isAr ? 'حفظ التغييرات' : 'Save'}</>}
              </Button>
            </div>
          </SettingSection>
        </TabsContent>

        {/* Header Settings */}
        <TabsContent value="header" className="mt-6">
          <SettingSection icon={Settings} title={isAr ? 'إعدادات الهيدر' : 'Header Settings'}
            description={isAr ? 'تخصيص الشريط العلوي' : 'Customize the header bar'}>
            <div className="space-y-6" dir="rtl">
              {/* Colors */}
              <div>
                <Label className="font-medium mb-3 block text-right">{isAr ? 'الألوان' : 'Colors'}</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-right block mb-2">{isAr ? 'لون الخلفية' : 'Background'}</Label>
                    <div className="flex gap-2 flex-row-reverse">
                      <Input value={headerSettings.background_color} onChange={(e) => setHeaderSettings({ ...headerSettings, background_color: e.target.value })} className="flex-1 text-right" />
                      <Input type="color" value={headerSettings.background_color} onChange={(e) => setHeaderSettings({ ...headerSettings, background_color: e.target.value })} className="w-16" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-right block mb-2">{isAr ? 'لون النص' : 'Text'}</Label>
                    <div className="flex gap-2 flex-row-reverse">
                      <Input value={headerSettings.text_color} onChange={(e) => setHeaderSettings({ ...headerSettings, text_color: e.target.value })} className="flex-1 text-right" />
                      <Input type="color" value={headerSettings.text_color} onChange={(e) => setHeaderSettings({ ...headerSettings, text_color: e.target.value })} className="w-16" />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Height + Shadow */}
              <div className="space-y-3">
                <SettingItem label={isAr ? 'إظهار الظل' : 'Show Shadow'}>
                  <Switch checked={headerSettings.show_shadow} onCheckedChange={(v) => setHeaderSettings({ ...headerSettings, show_shadow: v })} />
                </SettingItem>
                <Separator />
                <div>
                  <Label className="text-sm text-right block mb-2">{isAr ? 'الارتفاع' : 'Height'}: {headerSettings.header_height}px</Label>
                  <input type="range" min="48" max="96" value={headerSettings.header_height} onChange={(e) => setHeaderSettings({ ...headerSettings, header_height: parseInt(e.target.value) })} className="w-full" dir="rtl" />
                </div>
              </div>

              <Separator />

              {/* Display Elements */}
              <div>
                <Label className="font-medium mb-3 block text-right">{isAr ? 'عناصر العرض' : 'Display Elements'}</Label>
                <div className="space-y-1">
                  {[
                    ['show_date', isAr ? 'التاريخ' : 'Date'],
                    ['show_page_name', isAr ? 'اسم الصفحة' : 'Page Name'],
                    ['show_user_name', isAr ? 'اسم المستخدم' : 'User Name'],
                    ['show_language_toggle', isAr ? 'زر اللغة' : 'Language Toggle'],
                    ['show_theme_toggle', isAr ? 'زر المظهر' : 'Theme Toggle'],
                    ['show_logout_button', isAr ? 'تسجيل الخروج' : 'Logout'],
                    ['show_notifications_bell', isAr ? 'جرس التنبيهات' : 'Notifications'],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <SettingItem label={label}>
                        <Switch checked={headerSettings[key]} onCheckedChange={(v) => setHeaderSettings({ ...headerSettings, [key]: v })} />
                      </SettingItem>
                      <Separator />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Greeting */}
              <div>
                <Label className="font-medium mb-3 block text-right">{isAr ? 'نص الترحيب' : 'Greeting'}</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground block mb-1">{isAr ? 'عربي' : 'Arabic'}</Label>
                    <Input value={headerSettings.custom_greeting_ar} onChange={(e) => setHeaderSettings({ ...headerSettings, custom_greeting_ar: e.target.value })} className="text-right" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground block mb-1">{isAr ? 'إنجليزي' : 'English'}</Label>
                    <Input value={headerSettings.custom_greeting_en} onChange={(e) => setHeaderSettings({ ...headerSettings, custom_greeting_en: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>

            <Separator className="my-6" />
            <div className="flex justify-end">
              <Button onClick={handleSaveHeaderSettings} className="bg-primary hover:bg-primary/90" disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" />{isAr ? 'جاري الحفظ...' : 'Saving...'}</> : <><Save className="w-4 h-4 ml-2" />{isAr ? 'حفظ التغييرات' : 'Save'}</>}
              </Button>
            </div>
          </SettingSection>
        </TabsContent>

        {/* Appearance & Language */}
        <TabsContent value="appearance" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SettingSection icon={Sun} title={isAr ? 'المظهر' : 'Appearance'}
              description={isAr ? 'تخصيص شكل التطبيق' : 'Customize app appearance'}>
              <div dir="rtl">
                <Label className="text-sm mb-3 block">{isAr ? 'السمة' : 'Theme'}</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'light', icon: Sun, label: isAr ? 'فاتح' : 'Light' },
                    { value: 'dark', icon: Moon, label: isAr ? 'داكن' : 'Dark' },
                    { value: 'system', icon: Monitor, label: isAr ? 'تلقائي' : 'Auto' },
                  ].map(({ value, icon: Icon, label }) => (
                    <Button key={value} variant={theme === value ? "default" : "outline"}
                      className={`flex flex-col gap-2 h-auto py-4 ${theme === value ? "bg-primary" : ""}`}
                      onClick={() => setTheme(value)} data-testid={`theme-${value}`}>
                      <Icon className="w-5 h-5" />
                      <span className="text-xs">{label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </SettingSection>

            <SettingSection icon={Globe} title={isAr ? 'اللغة' : 'Language'}
              description={isAr ? 'تغيير لغة التطبيق' : 'Change app language'}>
              <div dir="rtl">
                <Label className="text-sm mb-3 block">{isAr ? 'لغة التطبيق' : 'App Language'}</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant={language === "ar" ? "default" : "outline"}
                    className={`flex items-center gap-2 h-12 ${language === "ar" ? "bg-primary" : ""}`}
                    onClick={() => setLanguage("ar")} data-testid="lang-ar">
                    <span>العربية</span>
                  </Button>
                  <Button variant={language === "en" ? "default" : "outline"}
                    className={`flex items-center gap-2 h-12 ${language === "en" ? "bg-primary" : ""}`}
                    onClick={() => setLanguage("en")} data-testid="lang-en">
                    <span>English</span>
                  </Button>
                </div>
              </div>
            </SettingSection>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
