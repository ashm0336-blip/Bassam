import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ROLE_LABELS, DEPT_LABELS } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Shield, Eye, EyeOff, Loader2, KeyRound, User, Lock, RefreshCw } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ── PIN Change Modal (first login) ──────────────────────────────
function PinChangeModal({ onSuccess }) {
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = async (e) => {
    e.preventDefault();
    if (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
      toast.error('PIN يجب أن يكون 4–6 أرقام فقط');
      return;
    }
    if (pin !== confirm) {
      toast.error('كلمة المرور وتأكيدها غير متطابقين');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/auth/change-pin`, { new_pin: pin });
      localStorage.removeItem('must_change_pin');
      toast.success('تم تغيير PIN بنجاح ✅');
      onSuccess();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'فشل تغيير PIN');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-3">
            <KeyRound className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="font-cairo font-bold text-xl text-gray-800">تغيير PIN الخاص بك</h2>
          <p className="text-sm text-gray-500 mt-1">
            هذا أول دخول لك — يجب تغيير كلمة المرور الافتراضية
          </p>
        </div>

        <form onSubmit={handleChange} className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-700">PIN الجديد (4–6 أرقام)</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="● ● ● ●"
              className="mt-1 h-12 text-center text-xl tracking-[0.5em] font-mono"
              autoFocus
              data-testid="new-pin-input"
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700">تأكيد PIN</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={confirm}
              onChange={e => setConfirm(e.target.value.replace(/\D/g, ''))}
              placeholder="● ● ● ●"
              className="mt-1 h-12 text-center text-xl tracking-[0.5em] font-mono"
              data-testid="confirm-pin-input"
            />
          </div>

          {/* Strength indicator */}
          {pin && (
            <div className="flex gap-1 mt-1">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                  i <= pin.length ? (pin.length >= 6 ? 'bg-emerald-500' : pin.length >= 4 ? 'bg-amber-400' : 'bg-red-400') : 'bg-gray-200'
                }`} />
              ))}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full h-12 bg-primary mt-2" data-testid="change-pin-submit">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'حفظ PIN الجديد'}
          </Button>
        </form>
      </div>
    </div>
  );
}

// ── Main Login Page ──────────────────────────────────────────────
export default function LoginPage() {
  const navigate = useNavigate();
  const { login, setUser, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showPinChange, setShowPinChange] = useState(false);
  const [formData, setFormData] = useState({ identifier: '', password: '' });

  // If user is already logged in with must_change_pin, show modal immediately
  useEffect(() => {
    if (user?.must_change_pin) setShowPinChange(true);
  }, [user?.must_change_pin]);

  const [pageSettings, setPageSettings] = useState(window.__LOGIN_SETTINGS__ || {
    primary_color: "#047857",
    background_url: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=1920&q=80",
    logo_url: "",
    logo_size: 150,
    logo_link: "/",
    site_name_ar: "منصة خدمات الحشود",
    site_name_en: "Crowd Services Platform",
    subtitle_ar: "الإدارة العامة للتخطيط وخدمات الحشود في الحرم المكي الشريف",
    subtitle_en: "General Administration for Planning and Crowd Services",
    welcome_text_ar: "مرحباً بك في",
    welcome_text_en: "Welcome to"
  });

  useEffect(() => {
    const handler = (e) => setPageSettings(e.detail);
    window.addEventListener('loginSettingsLoaded', handler);
    return () => window.removeEventListener('loginSettingsLoaded', handler);
  }, []);

  // Detect if it's national ID (10 digits starting with 1 or 2)
  const isNationalId = /^[12]\d{0,9}$/.test(formData.identifier.trim()) && !formData.identifier.includes('@');
  const inputType = isNationalId ? 'رقم الهوية' : formData.identifier.includes('@') ? 'البريد الإلكتروني' : 'معرف الدخول';

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!formData.identifier || !formData.password) {
      toast.error('أدخل رقم الهوية / البريد الإلكتروني وكلمة المرور');
      return;
    }
    setLoading(true);
    const result = await login(formData.identifier, formData.password);
    if (result.success) {
      if (result.must_change_pin) {
        setShowPinChange(true);
      } else {
        const u = result.user;
        const groupName = u?.permission_group_name;
        const roleName = groupName || ROLE_LABELS[u?.role]?.ar || u?.role;
        const greeting = `مرحباً ${u?.name} — ${roleName}`;
        toast.success(greeting);
        navigate('/');
      }
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex" dir="rtl" data-testid="login-page">
      {showPinChange && (
        <PinChangeModal onSuccess={() => {
          setShowPinChange(false);
          // Update user in AuthContext to clear must_change_pin
          if (setUser) setUser(prev => prev ? { ...prev, must_change_pin: false } : prev);
          toast.success('مرحباً بك ✅');
          navigate('/');
        }} />
      )}

      {/* ── Left: Login Form ── */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 bg-[#F8F8F6]">
        <div className="w-full max-w-md">

          {/* Logo */}
          <div className="text-center mb-10">
            <a href={pageSettings.logo_link || "/"}>
              {pageSettings.logo_url ? (
                <img src={pageSettings.logo_url} alt="Logo"
                  className="mx-auto mb-5 object-contain"
                  style={{ width: `${pageSettings.logo_size||150}px`, height: `${pageSettings.logo_size||150}px` }}
                />
              ) : (
                <div className="rounded-full mx-auto flex items-center justify-center mb-5 shadow-lg"
                  style={{ width: `${pageSettings.logo_size||150}px`, height: `${pageSettings.logo_size||150}px`,
                    background: `linear-gradient(135deg, ${pageSettings.primary_color}, ${pageSettings.primary_color}dd)` }}>
                  <div className="rounded-full bg-white/30 flex items-center justify-center"
                    style={{ width: `${(pageSettings.logo_size||150)*0.7}px`, height: `${(pageSettings.logo_size||150)*0.7}px` }}>
                    <span className="text-white font-cairo font-bold"
                      style={{ fontSize: `${(pageSettings.logo_size||150)*0.35}px` }}>ح</span>
                  </div>
                </div>
              )}
            </a>
            <h1 className="font-cairo font-bold text-2xl text-gray-800 mb-1">تسجيل الدخول</h1>
            <p className="text-sm text-gray-500">{pageSettings.welcome_text_ar} {pageSettings.site_name_ar}</p>
          </div>

          {/* Login Form */}
          <Card className="border-0 shadow-none bg-transparent">
            <CardContent className="p-0">
              <form onSubmit={handleLogin} className="space-y-5">

                {/* Identifier Field */}
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    رقم الهوية الوطنية أو البريد الإلكتروني
                  </Label>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode={isNationalId ? "numeric" : "text"}
                      placeholder="1xxxxxxxxx"
                      dir="ltr"
                      className={`h-12 pr-4 pl-12 bg-white border-gray-200 text-left font-mono text-lg
                        focus:border-primary focus:ring-primary/20 transition-all
                        ${isNationalId ? 'tracking-widest' : ''}
                      `}
                      value={formData.identifier}
                      onChange={e => setFormData({ ...formData, identifier: e.target.value })}
                      required
                      maxLength={isNationalId ? 10 : undefined}
                      data-testid="login-identifier"
                    />
                    {/* Type indicator */}
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      {isNationalId
                        ? <Shield className="h-5 w-5 text-emerald-500" />
                        : <User className="h-5 w-5 text-gray-400" />
                      }
                    </div>
                    {/* ID format indicator */}
                    {formData.identifier && (
                      <div className="absolute -bottom-5 left-0 text-[10px]">
                        {isNationalId && formData.identifier.length === 10
                          ? <span className="text-emerald-600 font-medium">✓ رقم هوية صحيح</span>
                          : isNationalId
                          ? <span className="text-amber-500">{10 - formData.identifier.length} أرقام متبقية</span>
                          : <span className="text-blue-500">بريد إلكتروني</span>
                        }
                      </div>
                    )}
                  </div>
                </div>

                {/* PIN / Password Field */}
                <div className="space-y-2 pt-2">
                  <Label className="text-gray-700 font-medium flex items-center gap-2">
                    <Lock className="w-4 h-4 text-gray-400" />
                    {isNationalId ? 'رقم الموظف / PIN' : 'كلمة المرور'}
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPin ? "text" : "password"}
                      inputMode={isNationalId ? "numeric" : "text"}
                      placeholder={isNationalId ? "الرقم الوظيفي" : "••••••••"}
                      dir="ltr"
                      className={`h-12 pr-4 pl-12 bg-white border-gray-200 focus:border-primary focus:ring-primary/20
                        ${isNationalId ? 'text-center text-xl tracking-[0.5em] font-mono' : 'text-left'}
                      `}
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      required
                      data-testid="login-password"
                    />
                    <button type="button"
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowPin(!showPin)}>
                      {showPin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {/* Helper text for first-time login */}
                  {isNationalId && (
                    <p className="text-[11px] text-amber-600 flex items-center gap-1 mt-1">
                      <KeyRound className="w-3 h-3" />
                      أول دخول: استخدم رقمك الوظيفي — سيُطلب منك تغييره
                    </p>
                  )}
                </div>

                {/* Submit */}
                <Button type="submit" disabled={loading}
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-medium text-base shadow-md hover:shadow-lg transition-all mt-2"
                  data-testid="login-submit">
                  {loading
                    ? <><Loader2 className="w-5 h-5 ml-2 animate-spin" />جاري تسجيل الدخول...</>
                    : 'تسجيل الدخول'
                  }
                </Button>

                {/* Helper text */}
                <div className="text-center pt-2 space-y-1">
                  <p className="text-xs text-gray-400">
                    إذا نسيت كلمة المرور — تواصل مع مديرك لإعادة التعيين
                  </p>
                  <p className="text-[10px] text-gray-300">
                    يجب إدخال البيانات بشكل صحيح في الحقلين
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-gray-400 mt-10">
            © 2024 {pageSettings.site_name_ar}
          </p>
        </div>
      </div>

      {/* ── Right: Branding ── */}
      <div className="hidden lg:flex lg:w-[55%] bg-cover bg-center relative"
        style={{ backgroundImage: `url(${pageSettings.background_url})`, backgroundColor: pageSettings.primary_color }}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
        <div className="relative z-10 flex flex-col items-center justify-center text-white p-12 text-center w-full">
          <h1 className="font-cairo font-bold text-5xl mb-6">{pageSettings.site_name_ar}</h1>
          <p className="text-lg max-w-lg leading-relaxed text-white/90">{pageSettings.subtitle_ar}</p>
        </div>
      </div>
    </div>
  );
}
