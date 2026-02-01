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
import { Mail, Eye, EyeOff, Loader2 } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  
  // Read settings from window object (injected by backend)
  // This eliminates FOUC by having settings available immediately
  const pageSettings = window.__LOGIN_SETTINGS__ || {
    primary_color: "#047857",
    background_url: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=1920&q=80",
    logo_url: "",
    logo_size: 150,
    logo_link: "/",
    site_name_ar: "منصة خدمات الحشود",
    site_name_en: "Crowd Services Platform",
    subtitle_ar: "الإدارة العامة للتخطيط وخدمات الحشود في الحرم المكي الشريف",
    subtitle_en: "General Administration for Planning and Crowd Services at the Grand Mosque",
    welcome_text_ar: "مرحباً بك في",
    welcome_text_en: "Welcome to"
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
