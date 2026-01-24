import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import axios from 'axios';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock, Mail, Eye, EyeOff, Loader2 } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [pageSettings, setPageSettings] = useState({
    site_name_ar: "منصة التخطيط وخدمات الحشود",
    site_name_en: "Planning and Crowd Services Platform",
    subtitle_ar: "نظام متطور لإدارة تخطيط وخدمات الحشود",
    subtitle_en: "Advanced Planning and Crowd Services Management System",
    logo_url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABDEAAAJCCAYAAADZbFzYAAAACXBIWXMAAC4jAAAuIwF4pT92AAAL72lUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgOS4xLWMwMDMgNzkuOTY5MGE4NywgMjAyNS8wMy8wNi0xOToxMjowMyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdFJlZj0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlUmVmIyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1sbnM6aWxsdXN0cmF0b3I9Imh0dHA6Ly9ucy5hZG9iZS5jb20vaWxsdXN0cmF0b3IvMS4wLyIgeG1sbnM6cGRmPSJodHRwOi8vbnMuYWRvYmUuY29tL3BkZi8xLjMvIiB4bWxuczpwaG90b3Nob3A9Imh0dHA6Ly9ucy5hZG9iZS5jb20vcGhvdG9zaG9wLzEuMC8iIHhtbG5zOnRpZmY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vdGlmZi8xLjAvIiB4bWxuczpleGlmPSJodHRwOi8vbnMuYWRvYmUuY29tL2V4aWYvMS4wLyIgZGM6Zm9ybWF0PSJpbWFnZS9wbmciIHhtcDpNZXRhZGF0YURhdGU9IjIwMjUtMTItMjlUMTA6NDA6MjUrMDM6MDAiIHhtcDpNb2RpZnlEYXRlPSIyMDI1LTEyLTI5VDEwOjQwOjI1KzAzOjAwIiB4bXA6Q3JlYXRlRGF0ZT0iMjAyNC0wMy0xMVQxNDowMjoyOSswMzowMCIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBJbGx1c3RyYXRvciAyOC4xIChNYWNpbnRvc2gpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjdhZmZjODE0LTA4MzEtNDQ0Ni04M2ZiLTA3ODE3ODVlNmZiNSIgeG1wTU06RG9jdW1lbnRJRD0iYWRvYmU6ZG9jaWQ6cGhvdG9zaG9wOjJhMTgwYWNhLWI2YzAtNjc0Ni05NDYzLTQzMzEzNTUzMDhjNiIgeG1wTU06T3JpZ2luYWxEb2N1bWVudElEPSJ1dWlkOjVEMjA4OTI0OTNCRkRCMTE5MTRBODU5MEQzMTUwOEM4IiB4bXBNTTpSZW5kaXRpb25DbGFzcz0icHJvb2Y6cGRmIiBpbGx1c3RyYXRvcjpTdGFydHVwUHJvZmlsZT0iUHJpbnQiIGlsbHVzdHJhdG9yOkNyZWF0b3JTdWJUb29sPSJBZG9iZSBJbGx1c3RyYXRvciIgcGRmOlByb2R1Y2VyPSJBZG9iZSBQREYgbGlicmFyeSAxNy4wMCIgcGhvdG9zaG9wOkNvbG9yTW9kZT0iMyIgdGlmZjpJbWFnZVdpZHRoPSIzMDcxIiB0aWZmOkltYWdlTGVuZ3RoPSIxOTA4IiB0aWZmOlBob3RvbWV0cmljSW50ZXJwcmV0YXRpb249IjUiIHRpZmY6U2FtcGxlc1BlclBpeGVsPSI0IiB0aWZmOlhSZXNvbHV0aW9uPSI3Mi8xIiB0aWZmOllSZXNvbHV0aW9uPSI3Mi8xIiB0aWZmOlJlc29sdXRpb25Vbml0PSIyIiBleGlmOkV4aWZWZXJzaW9uPSIwMjMxIiBleGlmOkNvbG9yU3BhY2U9IjY1NTM1IiBleGlmOlBpeGVsWERpbWVuc2lvbj0iMzA3MSIgZXhpZjpQaXhlbFlEaW1lbnNpb249IjE5MDgiPiA8ZGM6dGl0bGU+IDxyZGY6QWx0PiA8cmRmOmxpIHhtbDpsYW5nPSJ4LWRlZmF1bHQiPkFsaGFyYW1haW5fTG9nb19DTVlLX0ZBVzwvcmRmOmxpPiA8L3JkZjpBbHQ+IDwvZGM6dGl0bGU+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOmRiY2YxN2QxLTkzZDMtMzE0OC1iOTUxLTgzZGM0YTRiMmJiOSIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo1MDYwOTgyMC0yODE1LTQyNWYtOGU0Ni05ZTExNjdjYWQ1NWUiIHN0UmVmOm9yaWdpbmFsRG9jdW1lbnRJRD0idXVpZDo1RDIwODkyNDkzQkZEQjExOTE0QTg1OTBEMzE1MDhDOCIgc3RSZWY6cmVuZGl0aW9uQ2xhc3M9InByb29mOnBkZiIvPiA8eG1wTU06SGlzdG9yeT4gPHJkZjpTZXE+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJzYXZlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDpjZWM3ZWUyMi0xMDJhLTQzNmYtYTUwMy0xNWVhYWI1ODRkMjMiIHN0RXZ0OndoZW49IjIwMjQtMDItMTRUMTU6Mjk6MzMrMDM6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIElsbHVzdHJhdG9yIDI4LjEgKE1hY2ludG9zaCkiIHN0RXZ0OmNoYW5nZWQ9Ii8iLz4gPHJkZjpsaSBzdEV2dDphY3Rpb249InNhdmVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOmRiY2YxN2QxLTkzZDMtMzE0OC1iOTUxLTgzZGM0YTRiMmJiOSIgc3RFdnQ6d2hlbj0iMjAyNS0xMi0yOVQxMDo0MDoyNSswMzowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIDI2LjEwIChXaW5kb3dzKSIgc3RFdnQ6Y2hhbmdlZD0iLyIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iY29udmVydGVkIiBzdEV2dDpwYXJhbWV0ZXJzPSJmcm9tIGltYWdlL2pwZWcgdG8gaW1hZ2UvcG5nIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJkZXJpdmVkIiBzdEV2dDpwYXJhbWV0ZXJzPSJjb252ZXJ0ZWQgZnJvbSBpbWFnZS9qcGVnIHRvIGltYWdlL3BuZyIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0ic2F2ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6N2FmZmM4MTQtMDgzMS00NDQ2LTgzZmItMDc4MTc4NWU2ZmI1IiBzdEV2dDp3aGVuPSIyMDI1LTEyLTI5VDEwOjQwOjI1KzAzOjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgMjYuMTAgKFdpbmRvd3MpIiBzdEV2dDpjaGFuZ2VkPSIvIi8+IDwvcmRmOlNlcT4gPC94bXBNTTpIaXN0b3J5PiA8dGlmZjpCaXRzUGVyU2FtcGxlPiA8cmRmOlNlcT4gPHJkZjpsaT44PC9yZGY6bGk+IDxyZGY6bGk+ODwvcmRmOmxpPiA8cmRmOmxpPjg8L3JkZjpsaT4gPHJkZjpsaT44PC9yZGY6bGk+IDwvcmRmOlNlcT4gPC90aWZmOkJpdHNQZXJTYW1wbGU+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+stfoQgACr...",
    background_url: "https://images.unsplash.com/photo-1758985776354-4df674930917?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTB8MHwxfHNlYXJjaHwzfHxrYWFiYSUyMG1lY2NhJTIwaXNsYW1pYyUyMG1vc3F1ZSUyMHBpbGdyaW1hZ2V8ZW58MHx8fHwxNzY4NTc2NTEwfDA&ixlib=rb-4.1.0&q=85",
    primary_color: "#047857",
    welcome_text_ar: "أهلاً وسهلاً",
    welcome_text_en: "Welcome",
    logo_size: 150
  });

  useEffect(() => {
    fetchPageSettings();
  }, []);

  const fetchPageSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings/login-page`);
      setPageSettings(response.data);
    } catch (error) {
      console.error("Error fetching login settings:", error);
      // استخدام الإعدادات الافتراضية في حالة الفشل
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    
    setLoading(true);
    
    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      toast.success('تم تسجيل الدخول بنجاح');
      navigate('/');
    } else {
      toast.error(result.error);
    }
    
    setLoading(false);
  };

  // Fill demo credentials
  const fillDemoCredentials = () => {
    setFormData({
      email: 'admin@crowd.sa',
      password: 'admin123'
    });
  };

  // Show loading screen while fetching settings
  if (settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F8F6]" dir="rtl">
        <div className="text-center">
          <div 
            className="w-24 h-24 rounded-full mx-auto flex items-center justify-center mb-6 animate-pulse shadow-xl"
            style={{ 
              background: `linear-gradient(135deg, ${pageSettings.primary_color}, ${pageSettings.primary_color}dd)` 
            }}
          >
            <div className="rounded-full bg-white/30 w-16 h-16 flex items-center justify-center">
              <span className="text-white font-cairo font-bold text-3xl">ح</span>
            </div>
          </div>
          <p className="text-gray-600 font-cairo text-lg">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" dir="rtl" data-testid="login-page">
      {/* Left Side - Login Form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 bg-[#F8F8F6]">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-10">
            <a href={pageSettings.logo_link || "/"} className="inline-block">
              {pageSettings.logo_url ? (
                <img 
                  src={pageSettings.logo_url} 
                  alt="Logo" 
                  className="mx-auto mb-5 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ 
                    width: `${pageSettings.logo_size || 150}px`,
                    height: `${pageSettings.logo_size || 150}px`
                  }}
                />
              ) : (
                <div 
                  className="rounded-full mx-auto flex items-center justify-center mb-5 shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ 
                    width: `${pageSettings.logo_size || 150}px`,
                    height: `${pageSettings.logo_size || 150}px`,
                    background: `linear-gradient(135deg, ${pageSettings.primary_color}, ${pageSettings.primary_color}dd)` 
                  }}
                >
                  <div 
                    className="rounded-full bg-white/30 flex items-center justify-center"
                    style={{
                      width: `${(pageSettings.logo_size || 150) * 0.7}px`,
                      height: `${(pageSettings.logo_size || 150) * 0.7}px`
                    }}
                  >
                    <span 
                      className="text-white font-cairo font-bold"
                      style={{ fontSize: `${(pageSettings.logo_size || 150) * 0.35}px` }}
                    >
                      ح
                    </span>
                  </div>
                </div>
              )}
            </a>
            <h1 className="font-cairo font-bold text-2xl text-gray-800 mb-2">
              {language === 'ar' ? 'تسجيل الدخول' : 'Login'}
            </h1>
            <p className="text-sm text-gray-500">
              {language === 'ar' ? pageSettings.welcome_text_ar : pageSettings.welcome_text_en} 
              {' '}
              {language === 'ar' ? pageSettings.site_name_ar : pageSettings.site_name_en}
            </p>
          </div>

          {/* Login Form */}
          <Card className="border-0 shadow-none bg-transparent">
            <CardContent className="p-0">
              <form onSubmit={handleLogin} className="space-y-6">
                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 font-medium">
                    البريد الإلكتروني
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@crowd.sa"
                      className="h-12 pr-4 pl-12 bg-white border-gray-200 focus:border-primary focus:ring-primary/20 text-left"
                      dir="ltr"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      data-testid="login-email"
                    />
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  </div>
                </div>
                
                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 font-medium">
                    كلمة المرور
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="h-12 pr-4 pl-12 bg-white border-gray-200 focus:border-primary focus:ring-primary/20 text-left"
                      dir="ltr"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      data-testid="login-password"
                    />
                    <button
                      type="button"
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-medium text-base shadow-md hover:shadow-lg transition-all"
                  disabled={loading}
                  data-testid="login-submit"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                      جاري تسجيل الدخول...
                    </>
                  ) : (
                    'تسجيل الدخول'
                  )}
                </Button>

                {/* Demo Credentials */}
                <div className="pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={fillDemoCredentials}
                    className="w-full text-center text-sm text-gray-500 hover:text-primary transition-colors py-2 rounded-lg hover:bg-primary/5"
                  >
                    <span className="text-gray-400">حساب تجريبي:</span>
                    <span className="font-medium text-gray-600 mr-2">admin@crowd.sa / admin123</span>
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-10">
            © 2024 {language === 'ar' ? pageSettings.site_name_ar : pageSettings.site_name_en}
          </p>
        </div>
      </div>

      {/* Right Side - Branding */}
      <div 
        className="hidden lg:flex lg:w-[55%] bg-cover bg-center relative"
        style={{ 
          backgroundImage: `url(${pageSettings.background_url})`,
          backgroundColor: pageSettings.primary_color 
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
        <div className="relative z-10 flex flex-col items-center justify-center text-white p-12 text-center w-full">
          <h1 className="font-cairo font-bold text-5xl mb-6">
            {language === 'ar' ? pageSettings.site_name_ar : pageSettings.site_name_en}
          </h1>
          <p className="text-lg max-w-lg leading-relaxed text-white/90">
            {language === 'ar' ? pageSettings.subtitle_ar : pageSettings.subtitle_en}
          </p>
        </div>
      </div>
    </div>
  );
}
