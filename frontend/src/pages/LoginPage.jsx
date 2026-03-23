import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ROLE_LABELS } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, KeyRound, Shield, Lock, ArrowLeft } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function PinChangeModal({ onSuccess }) {
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const handleChange = async (e) => {
    e.preventDefault();
    if (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) { toast.error('PIN يجب أن يكون 4–6 أرقام فقط'); return; }
    if (pin !== confirm) { toast.error('كلمة المرور وتأكيدها غير متطابقين'); return; }
    setLoading(true);
    try {
      await axios.post(`${API}/auth/change-pin`, { new_pin: pin });
      localStorage.removeItem('must_change_pin');
      toast.success('تم تغيير PIN بنجاح');
      onSuccess();
    } catch (e) { toast.error(e.response?.data?.detail || 'فشل تغيير PIN'); }
    finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm mx-4">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-3">
            <KeyRound className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="font-cairo font-bold text-xl text-gray-800">تغيير PIN الخاص بك</h2>
          <p className="text-sm text-gray-500 mt-1">هذا أول دخول لك — يجب تغيير كلمة المرور</p>
        </div>
        <form onSubmit={handleChange} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">PIN الجديد (4-6 أرقام)</label>
            <Input type="password" inputMode="numeric" dir="ltr" placeholder="••••" maxLength={6}
              className="h-12 text-center text-2xl tracking-[0.5em] font-mono bg-gray-50 border-gray-200"
              value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} required />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">تأكيد PIN</label>
            <Input type="password" inputMode="numeric" dir="ltr" placeholder="••••" maxLength={6}
              className="h-12 text-center text-2xl tracking-[0.5em] font-mono bg-gray-50 border-gray-200"
              value={confirm} onChange={e => setConfirm(e.target.value.replace(/\D/g, ''))} required />
          </div>
          <Button type="submit" disabled={loading} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-base font-bold rounded-xl">
            {loading ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <KeyRound className="w-5 h-5 ml-2" />}
            حفظ PIN الجديد
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, setUser, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showPinChange, setShowPinChange] = useState(false);
  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [focused, setFocused] = useState(null);

  useEffect(() => { if (user?.must_change_pin) setShowPinChange(true); }, [user?.must_change_pin]);

  const [pageSettings] = useState(window.__LOGIN_SETTINGS__ || {
    primary_color: "#303D48",
    background_url: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=1920&q=80",
    logo_url: "", logo_size: 150, logo_link: "/",
    site_name_ar: "منصة خدمات الحشود",
    subtitle_ar: "الإدارة العامة للتخطيط وخدمات الحشود في الحرم المكي الشريف",
    welcome_text_ar: "مرحباً بك في",
  });

  const isNationalId = /^[12]\d{0,9}$/.test(formData.identifier.trim()) && !formData.identifier.includes('@');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!formData.identifier || !formData.password) { toast.error('أدخل رقم الهوية أو البريد الإلكتروني وكلمة المرور'); return; }
    setLoading(true);
    try {
      const result = await login(formData.identifier, formData.password);
      if (result.success) {
        if (result.must_change_pin) { setShowPinChange(true); }
        else {
          const u = result.user;
          const roleName = u?.permission_group_name || ROLE_LABELS[u?.role]?.ar || u?.role;
          toast.success(`مرحباً ${u?.name} — ${roleName}`);
          navigate('/');
        }
      } else { toast.error(result.error); }
    } catch (err) {
      toast.error('حدث خطأ غير متوقع، يرجى المحاولة مجدداً');
    } finally {
      setLoading(false);
    }
  };

  const clr = pageSettings.primary_color;

  return (
    <div className="min-h-screen flex" dir="rtl" data-testid="login-page">
      {showPinChange && (
        <PinChangeModal onSuccess={() => {
          setShowPinChange(false);
          if (setUser) setUser(prev => prev ? { ...prev, must_change_pin: false } : prev);
          toast.success('مرحباً بك');
          navigate('/');
        }} />
      )}

      {/* ── Right: Login Form ── */}
      <div className="w-full lg:w-[45%] flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden relative h-44 overflow-hidden" style={{ backgroundColor: clr }}>
          <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${pageSettings.background_url})` }} />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />
          <div className="relative z-10 flex flex-col items-center justify-center h-full text-white">
            {pageSettings.logo_url
              ? <img src={pageSettings.logo_url} alt="" className="w-14 h-14 object-contain mb-2" />
              : <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2 border border-white/20"><span className="text-white font-cairo font-bold text-xl">ح</span></div>
            }
            <h2 className="font-cairo font-bold text-base">{pageSettings.site_name_ar}</h2>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center px-6 sm:px-12 py-8 bg-white">
          <div className="w-full max-w-[380px] mx-auto text-center">
            <div className="mb-8 text-center">
              <h1 className="font-cairo font-black text-3xl text-gray-900 mb-2">تسجيل الدخول</h1>
              <p className="text-gray-500 text-sm">{pageSettings.welcome_text_ar} {pageSettings.site_name_ar}</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2 text-center">رقم الهوية أو البريد الإلكتروني</label>
                <div className={`relative rounded-xl border-2 transition-all duration-300 ${focused === 'id' ? 'border-emerald-500 shadow-lg shadow-emerald-500/10' : 'border-gray-200'}`}>
                  <input type="text" inputMode={isNationalId ? "numeric" : "text"} dir="ltr" placeholder="1xxxxxxxxx"
                    className="w-full px-12 bg-transparent text-center font-mono text-base outline-none rounded-xl placeholder:text-gray-300"
                    style={{ height: '52px' }}
                    value={formData.identifier} onChange={e => setFormData({ ...formData, identifier: e.target.value })}
                    onFocus={() => setFocused('id')} onBlur={() => setFocused(null)} required
                    maxLength={isNationalId ? 10 : undefined} data-testid="login-identifier" />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    {isNationalId ? <Shield className="w-5 h-5 text-emerald-500" /> : <span className="text-gray-300 text-lg">@</span>}
                  </div>
                </div>
                {formData.identifier && (
                  <p className="text-[11px] mt-1.5 mr-1">
                    {isNationalId && formData.identifier.length === 10 ? <span className="text-emerald-600 font-medium">رقم هوية صحيح ✓</span>
                      : isNationalId ? <span className="text-gray-400">{10 - formData.identifier.length} أرقام متبقية</span>
                      : <span className="text-blue-500">بريد إلكتروني</span>}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2 text-center">{isNationalId ? 'الرقم الوظيفي / PIN' : 'كلمة المرور'}</label>
                <div className={`relative rounded-xl border-2 transition-all duration-300 ${focused === 'pw' ? 'border-emerald-500 shadow-lg shadow-emerald-500/10' : 'border-gray-200'}`}>
                  <input type={showPin ? "text" : "password"} inputMode={isNationalId ? "numeric" : "text"} dir="ltr"
                    placeholder={isNationalId ? "الرقم الوظيفي" : "••••••••"}
                    className={`w-full px-12 bg-transparent outline-none rounded-xl placeholder:text-gray-300 text-center ${isNationalId ? 'text-xl tracking-[0.4em] font-mono' : 'text-base'}`}
                    style={{ height: '52px' }}
                    value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                    onFocus={() => setFocused('pw')} onBlur={() => setFocused(null)} required data-testid="login-password" />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2"><Lock className="w-5 h-5 text-gray-300" /></div>
                  <button type="button" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors" onClick={() => setShowPin(!showPin)}>
                    {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {isNationalId && <p className="text-[11px] text-amber-600 flex items-center gap-1 mt-1.5 mr-1"><KeyRound className="w-3 h-3" />أول دخول: استخدم رقمك الوظيفي</p>}
              </div>

              <Button type="submit" disabled={loading}
                className="w-full text-base font-bold rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.01]"
                style={{ height: '52px', backgroundColor: clr }}
                data-testid="login-submit">
                {loading ? <><Loader2 className="w-5 h-5 ml-2 animate-spin" />جاري الدخول...</> : <><ArrowLeft className="w-5 h-5 ml-2" />تسجيل الدخول</>}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-xs text-gray-400">نسيت كلمة المرور؟ تواصل مع مديرك لإعادة التعيين</p>
              <p className="text-xs text-gray-300 mt-6 lg:hidden">© {new Date().getFullYear()} {pageSettings.site_name_ar}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Left: Branding ── */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden" style={{ backgroundColor: clr }}>
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${pageSettings.background_url})` }} />
        <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${clr}ee 0%, ${clr}99 40%, transparent 70%, ${clr}cc 100%)` }} />
        <div className="absolute top-12 right-12 w-32 h-32 rounded-full border border-white/10" />
        <div className="absolute bottom-20 left-16 w-48 h-48 rounded-full border border-white/5" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex justify-center">
            {pageSettings.logo_url
              ? <img src={pageSettings.logo_url} alt="" className="w-16 h-16 object-contain" />
              : <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20"><span className="text-white font-cairo font-bold text-2xl">ح</span></div>
            }
          </div>
          <div className="text-center">
            <h1 className="font-cairo font-black text-5xl text-white leading-tight mb-4">{pageSettings.site_name_ar}</h1>
            <p className="text-lg text-white/70 max-w-md leading-relaxed mx-auto">{pageSettings.subtitle_ar}</p>
            <div className="flex items-center gap-3 mt-8 max-w-xs mx-auto">
              <div className="h-px flex-1 bg-white/15" />
              <span className="text-white/30 text-xs font-cairo">Al-Haram OS</span>
              <div className="h-px flex-1 bg-white/15" />
            </div>
          </div>
          <div className="flex items-center justify-between text-white/30 text-xs">
            <span>© {new Date().getFullYear()}</span>
            <span className="font-cairo">{pageSettings.site_name_ar}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
