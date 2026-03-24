import { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { useHeader } from "@/context/HeaderContext";
import { useMobileSettings } from "@/context/MobileSettingsContext";
import axios from "axios";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, LogIn, Loader2, Upload, Save,
  Image as ImageIcon, Sun, Moon, Monitor, Globe, Smartphone,
  Bell, Languages, Palette, LogOut, UserCircle, RefreshCw, Wifi, WifiOff,
  Navigation as NavIcon, Minus, Plus, Eye, EyeOff, Layers,
  GripVertical, Check, X as XIcon,
  LayoutDashboard, ClipboardList, LayoutGrid, DoorOpen, Users, Circle,
  FileText, MapPin, Navigation, Database, Archive, Folder,
  Calendar, BarChart3, PieChart, TrendingUp, Activity, User, Menu,
  Shield, ShieldAlert, Home, UserCheck, Building, List, Grid, Map,
} from "lucide-react";
import { useSidebar } from "@/context/SidebarContext";
import { Slider } from "@/components/ui/slider";
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

const BOTTOM_NAV_ICON_MAP = {
  LayoutDashboard, ClipboardList, LayoutGrid, DoorOpen, Users, Circle,
  FileText, Bell, Settings, Map, Shield, ShieldAlert, Home, UserCheck, Building,
  MapPin, Navigation, Layers, List, Grid, Database, Archive, Folder,
  Calendar, BarChart3, PieChart, TrendingUp, Activity, User, Menu
};

function BottomNavConfigurator({ sidebarItems, selectedItems, onChange, isAr }) {
  const [expandedParents, setExpandedParents] = useState({});

  const allItems = (sidebarItems || [])
    .filter(i => i.is_active)
    .map(i => ({
      id: i.id,
      href: i.href,
      name_ar: i.name_ar,
      name_en: i.name_en,
      icon: i.icon,
      parent_id: i.parent_id,
    }));

  const parents = allItems.filter(i => !i.parent_id);
  const childrenMap = {};
  allItems.filter(i => i.parent_id).forEach(child => {
    if (!childrenMap[child.parent_id]) childrenMap[child.parent_id] = [];
    childrenMap[child.parent_id].push(child);
  });

  const allFlat = [];
  parents.forEach(p => {
    allFlat.push(p);
    (childrenMap[p.id] || []).forEach(c => allFlat.push(c));
  });

  const selected = selectedItems || parents.slice(0, 4).map(i => i.href);

  const selectedDetails = selected
    .map(href => allFlat.find(i => i.href === href))
    .filter(Boolean);

  const isSelected = (href) => selected.includes(href);

  const toggleItem = (href) => {
    if (isSelected(href)) {
      onChange(selected.filter(h => h !== href));
    } else {
      if (selected.length >= 6) return;
      onChange([...selected, href]);
    }
  };

  const moveUp = (index) => {
    if (index === 0) return;
    const next = [...selected];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  };

  const moveDown = (index) => {
    if (index >= selected.length - 1) return;
    const next = [...selected];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  };

  const toggleExpand = (parentId) => {
    setExpandedParents(prev => ({ ...prev, [parentId]: !prev[parentId] }));
  };

  return (
    <div className="space-y-5">
      {selected.length > 0 && (
        <div>
          <Label className="font-medium block mb-2">
            {isAr ? `العناصر المختارة (${selected.length})` : `Selected Items (${selected.length})`}
          </Label>
          <p className="text-[11px] text-muted-foreground mb-3">
            {isAr ? 'غيّر الترتيب بأسهم الأعلى والأسفل — زر "المزيد" يُضاف تلقائياً' : 'Reorder with arrows — "More" button added automatically'}
          </p>
          <div className="space-y-1.5">
            {selectedDetails.map((item, idx) => {
              const Icon = BOTTOM_NAV_ICON_MAP[item.icon] || LayoutDashboard;
              const isChild = !!item.parent_id;
              return (
                <div key={item.href} className={`flex items-center gap-2 p-2.5 rounded-lg border bg-card hover:bg-muted/50 transition-colors ${isChild ? 'border-primary/20 bg-primary/5' : ''}`}>
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveUp(idx)} disabled={idx === 0}
                      className="w-5 h-3 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors">
                      <svg width="10" height="6" viewBox="0 0 10 6"><path d="M1 5l4-4 4 4" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>
                    </button>
                    <button onClick={() => moveDown(idx)} disabled={idx === selectedDetails.length - 1}
                      className="w-5 h-3 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors">
                      <svg width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>
                    </button>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium block truncate">{isAr ? item.name_ar : item.name_en}</span>
                    {isChild && <span className="text-[10px] text-muted-foreground">{isAr ? 'صفحة فرعية' : 'Sub-page'}</span>}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">{idx + 1}</span>
                  <button onClick={() => toggleItem(item.href)}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors">
                    <XIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
            <div className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed bg-muted/30">
              <div className="w-5" />
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Menu className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="flex-1 text-sm text-muted-foreground">{isAr ? 'المزيد (تلقائي)' : 'More (auto)'}</span>
            </div>
          </div>
        </div>
      )}

      {selected.length === 0 && (
        <div className="text-center py-4 rounded-lg border-2 border-dashed">
          <Menu className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{isAr ? 'لم يتم اختيار أي عنصر — الشريط السفلي سيعرض زر "المزيد" فقط' : 'No items selected — bottom bar shows "More" only'}</p>
        </div>
      )}

      <div>
        <Label className="font-medium block mb-2">
          {isAr ? 'اختر من الصفحات' : 'Choose from Pages'}
        </Label>
        <p className="text-[11px] text-muted-foreground mb-3">
          {isAr ? 'اضغط على أي صفحة لإضافتها أو إزالتها — افتح القسم لرؤية الصفحات الفرعية' : 'Click any page to add/remove — expand sections to see sub-pages'}
        </p>
        <div className="space-y-0.5 rounded-lg border overflow-hidden">
          {parents.map(parent => {
            const Icon = BOTTOM_NAV_ICON_MAP[parent.icon] || LayoutDashboard;
            const children = childrenMap[parent.id] || [];
            const hasChildren = children.length > 0;
            const isExpanded = expandedParents[parent.id];
            const parentSelected = isSelected(parent.href);

            return (
              <div key={parent.id}>
                <div className={`flex items-center gap-2 px-3 py-2.5 transition-colors cursor-pointer ${parentSelected ? 'bg-primary/10' : 'hover:bg-muted/50'}`}>
                  {hasChildren ? (
                    <button onClick={() => toggleExpand(parent.id)} className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                      <svg width="10" height="6" viewBox="0 0 10 6" className={`transition-transform ${isExpanded ? '' : '-rotate-90'}`}>
                        <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      </svg>
                    </button>
                  ) : <div className="w-5" />}
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${parentSelected ? 'bg-primary text-white' : 'bg-muted'}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className={`flex-1 text-sm ${parentSelected ? 'font-semibold text-primary' : 'text-foreground'}`}>
                    {isAr ? parent.name_ar : parent.name_en}
                  </span>
                  <button onClick={() => toggleItem(parent.href)} disabled={!parentSelected && selected.length >= 6}
                    className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                      parentSelected
                        ? 'bg-primary text-white hover:bg-primary/80'
                        : 'border border-dashed hover:border-primary/50 hover:bg-primary/5 disabled:opacity-30'
                    }`}>
                    {parentSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                </div>

                {hasChildren && isExpanded && (
                  <div className="bg-muted/20">
                    {children.map(child => {
                      const ChildIcon = BOTTOM_NAV_ICON_MAP[child.icon] || LayoutDashboard;
                      const childSelected = isSelected(child.href);
                      return (
                        <div key={child.id} className={`flex items-center gap-2 px-3 py-2 pr-10 transition-colors cursor-pointer ${childSelected ? 'bg-primary/10' : 'hover:bg-muted/50'}`}>
                          <div className="w-5 flex justify-center">
                            <div className="w-px h-4 bg-border" />
                          </div>
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${childSelected ? 'bg-primary text-white' : 'bg-muted/70'}`}>
                            <ChildIcon className="w-3 h-3" />
                          </div>
                          <span className={`flex-1 text-xs ${childSelected ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                            {isAr ? child.name_ar : child.name_en}
                          </span>
                          <button onClick={() => toggleItem(child.href)} disabled={!childSelected && selected.length >= 6}
                            className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                              childSelected
                                ? 'bg-primary text-white hover:bg-primary/80'
                                : 'border border-dashed hover:border-primary/50 disabled:opacity-30'
                            }`}>
                            {childSelected ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3 text-muted-foreground" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border-2 border-dashed p-3">
        <Label className="text-xs text-muted-foreground block mb-2 text-center">{isAr ? 'معاينة الشريط السفلي' : 'Bottom Bar Preview'}</Label>
        <div className="flex items-center justify-around h-14 rounded-lg bg-muted/50 px-1">
          {selectedDetails.map(item => {
            const Icon = BOTTOM_NAV_ICON_MAP[item.icon] || LayoutDashboard;
            return (
              <div key={item.href} className="flex flex-col items-center gap-0.5 flex-1">
                <Icon className="w-5 h-5 text-primary" />
                <span className="text-[8px] font-cairo text-foreground truncate max-w-[50px] text-center">
                  {isAr ? item.name_ar : item.name_en}
                </span>
              </div>
            );
          })}
          <div className="flex flex-col items-center gap-0.5 flex-1">
            <Menu className="w-5 h-5 text-muted-foreground" />
            <span className="text-[8px] font-cairo text-muted-foreground">{isAr ? 'المزيد' : 'More'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SystemSettings() {
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { refreshHeader } = useHeader();
  const { refreshMobileSettings } = useMobileSettings();
  const { menuItems: sidebarMenuItems } = useSidebar();
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

  const [pwaSettings, setPwaSettings] = useState({
    app_name_ar: "منصة خدمات الحشود",
    app_name_short_ar: "حشود",
    app_name_en: "Crowd Services",
    theme_color: "#004D38",
    show_install_prompt: true,
    icon_url: null,
    bottom_nav_count: 4,
    bottom_nav_items: null,
    show_sidebar_notifications: true,
    show_sidebar_language: true,
    show_sidebar_theme: true,
    show_sidebar_logout: true,
    show_sidebar_profile: true,
    pull_to_refresh: true,
    splash_enabled: true,
    splash_bg_color: "#004D38",
    splash_logo_url: null,
    splash_title_ar: "خدمات الحشود",
    splash_title_en: "Crowd Services",
    splash_subtitle_ar: "الإدارة العامة لخدمات الحشود",
    splash_subtitle_en: "General Administration of Crowd Services",
    splash_text_color: "#FFFFFF",
    splash_duration: 2000,
    offline_enabled: false,
    offline_cache_pages: true,
    offline_cache_images: false,
  });
  const [pwaIconPreview, setPwaIconPreview] = useState(null);

  useEffect(() => { fetchLoginSettings(); fetchHeaderSettings(); fetchPwaSettings(); }, []);

  const fetchPwaSettings = async () => {
    try {
      const r = await axios.get(`${API}/settings/pwa`);
      setPwaSettings(r.data);
      if (r.data.icon_url) setPwaIconPreview(r.data.icon_url);
    } catch {}
  };

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

  const handlePwaIconUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      setPwaIconPreview(dataUrl);
      setPwaSettings({ ...pwaSettings, icon_url: dataUrl });
      toast.success(isAr ? 'تم رفع الأيقونة' : 'Icon uploaded');
    };
    reader.readAsDataURL(file);
  };

  const handleSavePwaSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/admin/settings/pwa`, pwaSettings, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      toast.success(isAr ? 'تم حفظ إعدادات الجوال ✅' : 'Mobile settings saved ✅');
      refreshMobileSettings();
    } catch { toast.error(isAr ? 'فشل الحفظ' : 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
        <TabsList className="grid w-full h-auto p-1" style={{gridTemplateColumns: 'repeat(4, 1fr)'}}>
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
          <TabsTrigger value="mobile" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-white" data-testid="tab-mobile">
            <Smartphone className="w-5 h-5" />
            <span className="text-xs">{isAr ? 'الجوال' : 'Mobile'}</span>
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
        {/* Mobile / PWA Settings */}
        <TabsContent value="mobile" className="mt-6">
          <div className="space-y-6">

            {/* 1. App Identity */}
            <SettingSection icon={Smartphone} title={isAr ? 'هوية التطبيق' : 'App Identity'}
              description={isAr ? 'الأيقونة والاسم ولون السمة' : 'Icon, name, and theme color'}>
              <div className="space-y-5" dir="rtl">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-dashed border-border flex items-center justify-center bg-muted shrink-0">
                    {pwaIconPreview ? (
                      <img src={pwaIconPreview} alt="App Icon" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full rounded-2xl flex items-center justify-center" style={{ background: pwaSettings.theme_color }}>
                        <span className="text-white font-cairo font-bold text-2xl">{pwaSettings.app_name_short_ar?.charAt(0) || 'ح'}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => document.getElementById('pwa-icon-upload').click()} data-testid="pwa-icon-upload-btn">
                        <Upload className="w-4 h-4 ml-2" />{isAr ? 'رفع أيقونة' : 'Upload Icon'}
                      </Button>
                      {pwaIconPreview && (
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"
                          onClick={() => { setPwaIconPreview(null); setPwaSettings({ ...pwaSettings, icon_url: null }); }}>
                          {isAr ? 'إزالة' : 'Remove'}
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{isAr ? 'PNG أو JPG — يُفضّل 512×512' : 'PNG or JPG — 512×512 preferred'}</p>
                    <input id="pwa-icon-upload" type="file" accept="image/*" onChange={handlePwaIconUpload} className="hidden" />
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground block mb-1">{isAr ? 'الاسم الكامل' : 'Full Name'}</Label>
                    <Input value={pwaSettings.app_name_ar} onChange={(e) => setPwaSettings({ ...pwaSettings, app_name_ar: e.target.value })} className="text-right" data-testid="pwa-name-ar" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground block mb-1">{isAr ? 'الاسم المختصر' : 'Short Name'}</Label>
                    <Input value={pwaSettings.app_name_short_ar} onChange={(e) => setPwaSettings({ ...pwaSettings, app_name_short_ar: e.target.value })} className="text-right" maxLength={12} data-testid="pwa-short-name" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground block mb-1">{isAr ? 'لون السمة (شريط الحالة)' : 'Theme Color'}</Label>
                  <div className="flex gap-2 items-center">
                    <Input type="color" value={pwaSettings.theme_color} onChange={(e) => setPwaSettings({ ...pwaSettings, theme_color: e.target.value })} className="w-12 h-10 p-1 cursor-pointer" />
                    <Input value={pwaSettings.theme_color} onChange={(e) => setPwaSettings({ ...pwaSettings, theme_color: e.target.value })} className="flex-1 text-right" data-testid="pwa-theme-color" />
                  </div>
                </div>
                <SettingItem label={isAr ? 'إظهار بانر التثبيت' : 'Show Install Banner'}
                  description={isAr ? 'يظهر بانر "ثبّت التطبيق" للمستخدمين' : 'Shows install prompt to users'}>
                  <Switch checked={pwaSettings.show_install_prompt} onCheckedChange={(v) => setPwaSettings({ ...pwaSettings, show_install_prompt: v })} data-testid="pwa-install-toggle" />
                </SettingItem>
              </div>
            </SettingSection>

            {/* 2. Bottom Navigation Bar */}
            <SettingSection icon={NavIcon} title={isAr ? 'شريط التنقل السفلي' : 'Bottom Navigation'}
              description={isAr ? 'اختر العناصر التي تظهر في الشريط السفلي وحدد ترتيبها' : 'Choose and reorder bottom bar items'}>
              <div className="space-y-4" dir="rtl">
                <BottomNavConfigurator
                  sidebarItems={sidebarMenuItems}
                  selectedItems={pwaSettings.bottom_nav_items}
                  onChange={(items) => setPwaSettings({ ...pwaSettings, bottom_nav_items: items, bottom_nav_count: items.length })}
                  isAr={isAr}
                />
              </div>
            </SettingSection>

            {/* 3. Sidebar Controls */}
            <SettingSection icon={Layers} title={isAr ? 'القائمة الجانبية (الجوال)' : 'Mobile Sidebar'}
              description={isAr ? 'التحكم بإظهار/إخفاء عناصر القائمة' : 'Show/hide sidebar elements'}>
              <div className="space-y-1" dir="rtl">
                {[
                  { key: 'show_sidebar_profile', icon: UserCircle, label: isAr ? 'بطاقة الملف الشخصي' : 'Profile Card' },
                  { key: 'show_sidebar_notifications', icon: Bell, label: isAr ? 'زر التنبيهات' : 'Notifications Button' },
                  { key: 'show_sidebar_language', icon: Languages, label: isAr ? 'زر تبديل اللغة' : 'Language Toggle' },
                  { key: 'show_sidebar_theme', icon: Palette, label: isAr ? 'زر تبديل المظهر' : 'Theme Toggle' },
                  { key: 'show_sidebar_logout', icon: LogOut, label: isAr ? 'زر تسجيل الخروج' : 'Logout Button' },
                ].map(({ key, icon: Icon, label }) => (
                  <div key={key}>
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <Label className="font-medium text-sm">{label}</Label>
                      </div>
                      <Switch checked={pwaSettings[key]} onCheckedChange={(v) => setPwaSettings({ ...pwaSettings, [key]: v })} />
                    </div>
                    <Separator />
                  </div>
                ))}
                <SettingItem label={isAr ? 'السحب للتحديث' : 'Pull to Refresh'}
                  description={isAr ? 'اسحب الصفحة لأسفل لتحديث البيانات' : 'Pull page down to refresh data'}>
                  <Switch checked={pwaSettings.pull_to_refresh} onCheckedChange={(v) => setPwaSettings({ ...pwaSettings, pull_to_refresh: v })} />
                </SettingItem>
              </div>
            </SettingSection>

            {/* 4. Splash Screen */}
            <SettingSection icon={Smartphone} title={isAr ? 'شاشة البداية (Splash)' : 'Splash Screen'}
              description={isAr ? 'الشاشة التي تظهر عند فتح التطبيق' : 'Screen shown when opening the app'}>
              <div className="space-y-5" dir="rtl">
                <SettingItem label={isAr ? 'تفعيل شاشة البداية' : 'Enable Splash Screen'}
                  description={isAr ? 'تظهر فقط في وضع التطبيق (PWA)' : 'Only shows in app mode (PWA)'}>
                  <Switch checked={pwaSettings.splash_enabled} onCheckedChange={(v) => setPwaSettings({ ...pwaSettings, splash_enabled: v })} />
                </SettingItem>

                {pwaSettings.splash_enabled && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground block mb-1">{isAr ? 'العنوان (عربي)' : 'Title (Arabic)'}</Label>
                        <Input value={pwaSettings.splash_title_ar} onChange={(e) => setPwaSettings({ ...pwaSettings, splash_title_ar: e.target.value })} className="text-right" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground block mb-1">{isAr ? 'العنوان (إنجليزي)' : 'Title (English)'}</Label>
                        <Input value={pwaSettings.splash_title_en} onChange={(e) => setPwaSettings({ ...pwaSettings, splash_title_en: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground block mb-1">{isAr ? 'الوصف (عربي)' : 'Subtitle (Arabic)'}</Label>
                        <Input value={pwaSettings.splash_subtitle_ar} onChange={(e) => setPwaSettings({ ...pwaSettings, splash_subtitle_ar: e.target.value })} className="text-right" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground block mb-1">{isAr ? 'الوصف (إنجليزي)' : 'Subtitle (English)'}</Label>
                        <Input value={pwaSettings.splash_subtitle_en} onChange={(e) => setPwaSettings({ ...pwaSettings, splash_subtitle_en: e.target.value })} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground block mb-1">{isAr ? 'لون الخلفية' : 'Background Color'}</Label>
                        <div className="flex gap-2 items-center">
                          <Input type="color" value={pwaSettings.splash_bg_color} onChange={(e) => setPwaSettings({ ...pwaSettings, splash_bg_color: e.target.value })} className="w-12 h-10 p-1 cursor-pointer" />
                          <Input value={pwaSettings.splash_bg_color} onChange={(e) => setPwaSettings({ ...pwaSettings, splash_bg_color: e.target.value })} className="flex-1" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground block mb-1">{isAr ? 'لون النص' : 'Text Color'}</Label>
                        <div className="flex gap-2 items-center">
                          <Input type="color" value={pwaSettings.splash_text_color} onChange={(e) => setPwaSettings({ ...pwaSettings, splash_text_color: e.target.value })} className="w-12 h-10 p-1 cursor-pointer" />
                          <Input value={pwaSettings.splash_text_color} onChange={(e) => setPwaSettings({ ...pwaSettings, splash_text_color: e.target.value })} className="flex-1" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground block mb-1">{isAr ? `مدة العرض: ${(pwaSettings.splash_duration / 1000).toFixed(1)} ثانية` : `Duration: ${(pwaSettings.splash_duration / 1000).toFixed(1)}s`}</Label>
                      <Slider
                        value={[pwaSettings.splash_duration]}
                        onValueChange={([v]) => setPwaSettings({ ...pwaSettings, splash_duration: v })}
                        min={1000} max={5000} step={500}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground block mb-2">{isAr ? 'شعار شاشة البداية' : 'Splash Logo'}</Label>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-dashed border-border flex items-center justify-center shrink-0" style={{ background: pwaSettings.splash_bg_color }}>
                          {pwaSettings.splash_logo_url ? (
                            <img src={pwaSettings.splash_logo_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-cairo font-bold text-xl" style={{ color: pwaSettings.splash_text_color }}>{(pwaSettings.splash_title_ar || 'ح').charAt(0)}</span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Button variant="outline" size="sm" onClick={() => document.getElementById('splash-logo-upload').click()}>
                            <Upload className="w-4 h-4 ml-2" />{isAr ? 'رفع شعار' : 'Upload Logo'}
                          </Button>
                          {pwaSettings.splash_logo_url && (
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setPwaSettings({ ...pwaSettings, splash_logo_url: null })}>
                              {isAr ? 'إزالة' : 'Remove'}
                            </Button>
                          )}
                          <input id="splash-logo-upload" type="file" accept="image/*" onChange={(e) => {
                            const file = e.target.files[0];
                            if (!file || !file.type.startsWith('image/')) return;
                            const reader = new FileReader();
                            reader.onloadend = () => setPwaSettings({ ...pwaSettings, splash_logo_url: reader.result });
                            reader.readAsDataURL(file);
                          }} className="hidden" />
                        </div>
                      </div>
                    </div>

                    {/* Splash Preview */}
                    <div className="rounded-xl border border-border overflow-hidden">
                      <p className="text-xs text-muted-foreground p-3 pb-0 text-right">{isAr ? 'معاينة:' : 'Preview:'}</p>
                      <div className="flex flex-col items-center justify-center py-8 px-4" style={{ backgroundColor: pwaSettings.splash_bg_color, color: pwaSettings.splash_text_color }}>
                        {pwaSettings.splash_logo_url ? (
                          <img src={pwaSettings.splash_logo_url} alt="" className="w-16 h-16 rounded-2xl object-cover mb-4" />
                        ) : (
                          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(255,255,255,0.15)' }}>
                            <span className="font-cairo font-bold text-2xl">{(pwaSettings.splash_title_ar || 'ح').charAt(0)}</span>
                          </div>
                        )}
                        <h3 className="font-cairo font-bold text-lg mb-1">{isAr ? pwaSettings.splash_title_ar : pwaSettings.splash_title_en}</h3>
                        <p className="text-xs opacity-70">{isAr ? pwaSettings.splash_subtitle_ar : pwaSettings.splash_subtitle_en}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </SettingSection>

            {/* 5. Offline Mode */}
            <SettingSection icon={pwaSettings.offline_enabled ? Wifi : WifiOff} title={isAr ? 'وضع عدم الاتصال' : 'Offline Mode'}
              description={isAr ? 'تمكين التخزين المؤقت للعمل بدون إنترنت' : 'Enable caching to work without internet'}>
              <div className="space-y-1" dir="rtl">
                <SettingItem label={isAr ? 'تفعيل وضع عدم الاتصال' : 'Enable Offline Mode'}
                  description={isAr ? 'حفظ البيانات محلياً للاستخدام بدون إنترنت' : 'Cache data locally for offline use'}>
                  <Switch checked={pwaSettings.offline_enabled} onCheckedChange={(v) => setPwaSettings({ ...pwaSettings, offline_enabled: v })} />
                </SettingItem>
                {pwaSettings.offline_enabled && (
                  <>
                    <Separator />
                    <SettingItem label={isAr ? 'تخزين الصفحات' : 'Cache Pages'}
                      description={isAr ? 'حفظ الصفحات المزورة للعرض بدون إنترنت' : 'Save visited pages for offline viewing'}>
                      <Switch checked={pwaSettings.offline_cache_pages} onCheckedChange={(v) => setPwaSettings({ ...pwaSettings, offline_cache_pages: v })} />
                    </SettingItem>
                    <Separator />
                    <SettingItem label={isAr ? 'تخزين الصور' : 'Cache Images'}
                      description={isAr ? 'حفظ الصور المحملة (يستهلك مساحة أكبر)' : 'Save loaded images (uses more storage)'}>
                      <Switch checked={pwaSettings.offline_cache_images} onCheckedChange={(v) => setPwaSettings({ ...pwaSettings, offline_cache_images: v })} />
                    </SettingItem>
                  </>
                )}
              </div>
            </SettingSection>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button onClick={handleSavePwaSettings} className="bg-primary hover:bg-primary/90" disabled={saving} data-testid="pwa-save-btn">
                {saving ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" />{isAr ? 'جاري الحفظ...' : 'Saving...'}</> : <><Save className="w-4 h-4 ml-2" />{isAr ? 'حفظ إعدادات الجوال' : 'Save Mobile Settings'}</>}
              </Button>
            </div>

          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
