import { useState } from "react";
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
  Monitor
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
  const [theme, setTheme] = useState("light");
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
        <h1 className="font-cairo font-bold text-2xl">الإعدادات</h1>
        <p className="text-sm text-muted-foreground mt-1">إدارة إعدادات النظام والتفضيلات الشخصية</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <SettingsSection
          icon={User}
          title="بياناتي"
          description="إدارة المعلومات الشخصية"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="font-cairo font-bold text-2xl text-primary">م</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">محمد العمري</h3>
                <p className="text-sm text-muted-foreground">مدير النظام</p>
                <p className="text-xs text-muted-foreground">m.alomari@haramain.gov.sa</p>
              </div>
              <Button variant="outline" size="sm">تعديل</Button>
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <div>
                <Label className="text-sm">الاسم الكامل</Label>
                <Input defaultValue="محمد العمري" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">البريد الإلكتروني</Label>
                <Input defaultValue="m.alomari@haramain.gov.sa" className="mt-1" dir="ltr" />
              </div>
              <div>
                <Label className="text-sm">رقم الجوال</Label>
                <Input defaultValue="+966 50 123 4567" className="mt-1" dir="ltr" />
              </div>
            </div>
            
            <Button className="w-full bg-primary hover:bg-primary/90">حفظ التغييرات</Button>
          </div>
        </SettingsSection>

        {/* Appearance Settings */}
        <SettingsSection
          icon={Palette}
          title="المظهر"
          description="تخصيص شكل التطبيق"
        >
          <div className="space-y-4">
            <div>
              <Label className="text-sm mb-3 block">السمة</Label>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  className={`flex flex-col gap-2 h-auto py-4 ${theme === "light" ? "bg-primary" : ""}`}
                  onClick={() => setTheme("light")}
                  data-testid="theme-light"
                >
                  <Sun className="w-5 h-5" />
                  <span className="text-xs">فاتح</span>
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  className={`flex flex-col gap-2 h-auto py-4 ${theme === "dark" ? "bg-primary" : ""}`}
                  onClick={() => setTheme("dark")}
                  data-testid="theme-dark"
                >
                  <Moon className="w-5 h-5" />
                  <span className="text-xs">داكن</span>
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  className={`flex flex-col gap-2 h-auto py-4 ${theme === "system" ? "bg-primary" : ""}`}
                  onClick={() => setTheme("system")}
                  data-testid="theme-system"
                >
                  <Monitor className="w-5 h-5" />
                  <span className="text-xs">تلقائي</span>
                </Button>
              </div>
            </div>
            
            <Separator />
            
            <SettingItem 
              label="حجم الخط" 
              description="تغيير حجم النص في التطبيق"
            >
              <Select defaultValue="medium">
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">صغير</SelectItem>
                  <SelectItem value="medium">متوسط</SelectItem>
                  <SelectItem value="large">كبير</SelectItem>
                </SelectContent>
              </Select>
            </SettingItem>
          </div>
        </SettingsSection>

        {/* Notification Settings */}
        <SettingsSection
          icon={Bell}
          title="الإشعارات"
          description="إدارة تفضيلات الإشعارات"
        >
          <div className="space-y-1">
            <SettingItem 
              label="إشعارات البريد" 
              description="استلام إشعارات عبر البريد الإلكتروني"
            >
              <Switch 
                checked={notifications.email}
                onCheckedChange={(checked) => setNotifications(prev => ({...prev, email: checked}))}
              />
            </SettingItem>
            
            <Separator />
            
            <SettingItem 
              label="الإشعارات الفورية" 
              description="إشعارات داخل التطبيق"
            >
              <Switch 
                checked={notifications.push}
                onCheckedChange={(checked) => setNotifications(prev => ({...prev, push: checked}))}
              />
            </SettingItem>
            
            <Separator />
            
            <SettingItem 
              label="الصوت" 
              description="تشغيل صوت عند وصول إشعار"
            >
              <Switch 
                checked={notifications.sound}
                onCheckedChange={(checked) => setNotifications(prev => ({...prev, sound: checked}))}
              />
            </SettingItem>
            
            <Separator />
            
            <SettingItem 
              label="تنبيهات الطوارئ" 
              description="إشعارات فورية للحالات الحرجة"
            >
              <Switch 
                checked={notifications.alerts}
                onCheckedChange={(checked) => setNotifications(prev => ({...prev, alerts: checked}))}
              />
            </SettingItem>
          </div>
        </SettingsSection>

        {/* Language Settings */}
        <SettingsSection
          icon={Globe}
          title="اللغة"
          description="إعدادات اللغة والمنطقة"
        >
          <div className="space-y-1">
            <SettingItem label="لغة التطبيق">
              <Select defaultValue="ar">
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="en" disabled>English (قريباً)</SelectItem>
                </SelectContent>
              </Select>
            </SettingItem>
            
            <Separator />
            
            <SettingItem label="التقويم">
              <Select defaultValue="hijri">
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hijri">هجري</SelectItem>
                  <SelectItem value="gregorian">ميلادي</SelectItem>
                </SelectContent>
              </Select>
            </SettingItem>
            
            <Separator />
            
            <SettingItem label="المنطقة الزمنية">
              <Select defaultValue="riyadh">
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="riyadh">الرياض (GMT+3)</SelectItem>
                  <SelectItem value="mecca">مكة المكرمة</SelectItem>
                </SelectContent>
              </Select>
            </SettingItem>
          </div>
        </SettingsSection>

        {/* Security Settings */}
        <SettingsSection
          icon={Shield}
          title="الأمان والصلاحيات"
          description="إدارة أمان الحساب"
        >
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-between" data-testid="change-password-btn">
              تغيير كلمة المرور
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between">
              سجل النشاط
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between">
              الأجهزة المتصلة
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        </SettingsSection>

        {/* Support */}
        <SettingsSection
          icon={HelpCircle}
          title="الدعم والمساعدة"
          description="الحصول على المساعدة"
        >
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-between">
              الأسئلة الشائعة
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between">
              دليل المستخدم
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between">
              تواصل مع الدعم
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Separator />
            <div className="text-center pt-2">
              <p className="text-xs text-muted-foreground">الإصدار 1.0.0</p>
              <p className="text-xs text-muted-foreground">© 2024 منصة خدمات الحشود</p>
            </div>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}
