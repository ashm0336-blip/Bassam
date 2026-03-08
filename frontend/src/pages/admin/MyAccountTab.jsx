import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import {
  UserCircle, User, Mail, Lock, Eye, EyeOff,
  Loader2, Check, Shield, Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const roleLabels = {
  system_admin: 'مسؤول النظام',
  general_manager: 'المدير العام',
  department_manager: 'مدير الإدارة',
  shift_supervisor: 'مشرف الوردية',
  field_staff: 'عامل ميداني',
  monitoring_team: 'فريق المراقبة',
};

export default function MyAccountTab() {
  const { language } = useLanguage();
  const { user, setUser } = useAuth();
  const isAr = language === 'ar';

  const [profileData, setProfileData] = useState({ name: user?.name || '', email: user?.email || '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '', confirm: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false });

  const handleProfileSave = async () => {
    if (!profileData.name.trim()) { toast.error(isAr ? 'الاسم مطلوب' : 'Name is required'); return; }
    setProfileLoading(true);
    try {
      const res = await axios.put(`${API}/auth/update-profile`, profileData);
      toast.success(res.data?.message || (isAr ? 'تم الحفظ' : 'Saved'));
      setUser(prev => prev ? { ...prev, name: profileData.name, email: profileData.email } : prev);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (e) {
      toast.error(e.response?.data?.detail || (isAr ? 'فشل الحفظ' : 'Save failed'));
    } finally { setProfileLoading(false); }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.current_password) { toast.error(isAr ? 'أدخل كلمة المرور الحالية' : 'Enter current password'); return; }
    if (!passwordData.new_password || passwordData.new_password.length < 4) {
      toast.error(isAr ? 'كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل' : 'New password must be at least 4 characters'); return;
    }
    if (passwordData.new_password !== passwordData.confirm) {
      toast.error(isAr ? 'كلمة المرور الجديدة وتأكيدها غير متطابقين' : 'Passwords do not match'); return;
    }
    setPasswordLoading(true);
    try {
      const res = await axios.post(`${API}/auth/change-password`, {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });
      toast.success(res.data?.message || (isAr ? 'تم التغيير' : 'Changed'));
      setPasswordData({ current_password: '', new_password: '', confirm: '' });
    } catch (e) {
      toast.error(e.response?.data?.detail || (isAr ? 'فشل التغيير' : 'Change failed'));
    } finally { setPasswordLoading(false); }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Card */}
        <Card data-testid="my-account-profile">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <UserCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-cairo text-base">{isAr ? 'البيانات الشخصية' : 'Personal Info'}</CardTitle>
                <CardDescription className="text-xs">{isAr ? 'تعديل الاسم والبريد الإلكتروني' : 'Edit name and email'}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Avatar + Role */}
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="font-cairo font-bold text-xl text-primary">
                  {user?.name?.charAt(0) || 'م'}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold" data-testid="profile-display-name">{user?.name}</h3>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary" data-testid="profile-role-badge">
                  {roleLabels[user?.role] || user?.role}
                </span>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div>
                <Label className="text-sm flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  {isAr ? 'الاسم' : 'Name'}
                </Label>
                <Input value={profileData.name} onChange={e => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1" data-testid="profile-name-input" />
              </div>
              <div>
                <Label className="text-sm flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  {isAr ? 'البريد الإلكتروني' : 'Email'}
                </Label>
                <Input value={profileData.email} onChange={e => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                  className="mt-1" dir="ltr" data-testid="profile-email-input" />
              </div>
            </div>

            <Button onClick={handleProfileSave} disabled={profileLoading}
              className="w-full bg-primary hover:bg-primary/90" data-testid="profile-save-btn">
              {profileLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" />
                : profileSaved ? <><Check className="w-4 h-4 ml-2" />{isAr ? 'تم الحفظ' : 'Saved'}</>
                : isAr ? 'حفظ التغييرات' : 'Save Changes'
              }
            </Button>
          </CardContent>
        </Card>

        {/* Password Card */}
        <Card data-testid="my-account-password">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <CardTitle className="font-cairo text-base">{isAr ? 'تغيير كلمة المرور' : 'Change Password'}</CardTitle>
                <CardDescription className="text-xs">{isAr ? 'تحديث كلمة المرور الخاصة بحسابك' : 'Update your account password'}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm">{isAr ? 'كلمة المرور الحالية' : 'Current Password'}</Label>
              <div className="relative mt-1">
                <Input type={showPasswords.current ? "text" : "password"} value={passwordData.current_password}
                  onChange={e => setPasswordData(prev => ({ ...prev, current_password: e.target.value }))}
                  placeholder="••••••••" dir="ltr" data-testid="current-password-input" />
                <button type="button" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}>
                  {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-sm">{isAr ? 'كلمة المرور الجديدة' : 'New Password'}</Label>
              <div className="relative mt-1">
                <Input type={showPasswords.new ? "text" : "password"} value={passwordData.new_password}
                  onChange={e => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                  placeholder="••••••••" dir="ltr" data-testid="new-password-input" />
                <button type="button" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}>
                  {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-sm">{isAr ? 'تأكيد كلمة المرور' : 'Confirm Password'}</Label>
              <Input type="password" value={passwordData.confirm}
                onChange={e => setPasswordData(prev => ({ ...prev, confirm: e.target.value }))}
                placeholder="••••••••" dir="ltr" className="mt-1" data-testid="confirm-password-input" />
              {passwordData.new_password && passwordData.confirm && passwordData.new_password !== passwordData.confirm && (
                <p className="text-[11px] text-red-500 mt-1">{isAr ? 'غير متطابقة' : 'Do not match'}</p>
              )}
            </div>
            <Button onClick={handlePasswordChange}
              disabled={passwordLoading || !passwordData.current_password || !passwordData.new_password}
              variant="outline" className="w-full border-amber-500 text-amber-600 hover:bg-amber-500 hover:text-white"
              data-testid="change-password-submit-btn">
              {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : isAr ? 'تغيير كلمة المرور' : 'Change Password'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Account Info */}
      <Card data-testid="my-account-info">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="font-cairo text-base">{isAr ? 'معلومات الحساب' : 'Account Info'}</CardTitle>
              <CardDescription className="text-xs">{isAr ? 'تفاصيل حسابك في النظام' : 'Your system account details'}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-xs text-muted-foreground mb-1">{isAr ? 'الحالة' : 'Status'}</p>
              <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" data-testid="account-status-badge">
                {isAr ? 'نشط' : 'Active'}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-xs text-muted-foreground mb-1">{isAr ? 'الدور' : 'Role'}</p>
              <p className="text-sm font-medium">{roleLabels[user?.role] || user?.role}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-xs text-muted-foreground mb-1">{isAr ? 'الإدارة' : 'Department'}</p>
              <p className="text-sm font-medium">{user?.department || (isAr ? 'جميع الإدارات' : 'All')}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-xs text-muted-foreground mb-1">{isAr ? 'إصدار النظام' : 'Version'}</p>
              <p className="text-sm font-medium font-mono">v1.0.0</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
