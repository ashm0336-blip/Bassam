import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { 
  Settings,
  Shield,
  Clock,
  Bell,
  Database,
  Lock,
  Key,
  AlertTriangle,
  Save
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

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

  const handleSave = () => {
    toast.success(language === 'ar' ? "تم حفظ الإعدادات بنجاح" : "Settings saved successfully");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-cairo font-bold text-xl text-left">
          {language === 'ar' ? 'إعدادات النظام' : 'System Settings'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1 text-left">
          {language === 'ar' ? 'إدارة إعدادات الأمان والنظام العامة' : 'Manage security and general system settings'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
