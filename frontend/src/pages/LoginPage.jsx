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
    site_name_ar: "خدمات الحشود",
    site_name_en: "Crowd Services",
    subtitle_ar: "منصة إدارة الحشود في الحرم المكي الشريف",
    subtitle_en: "Crowd Management Platform at Al-Haram",
    logo_url: "",
    background_url: "https://images.unsplash.com/photo-1758985776354-4df674930917?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTB8MHwxfHNlYXJjaHwzfHxrYWFiYSUyMG1lY2NhJTIwaXNsYW1pYyUyMG1vc3F1ZSUyMHBpbGdyaW1hZ2V8ZW58MHx8fHwxNzY4NTc2NTEwfDA&ixlib=rb-4.1.0&q=85",
    primary_color: "#DC2626",
    welcome_text_ar: "مرحباً بك",
    welcome_text_en: "Welcome"
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

  return (
    <div className="min-h-screen flex" dir="rtl" data-testid="login-page">
      {/* Left Side - Login Form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 bg-[#F8F8F6]">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-10">
            {pageSettings.logo_url ? (
              <img 
                src={pageSettings.logo_url} 
                alt="Logo" 
                className="w-20 h-20 mx-auto mb-5 object-contain"
              />
            ) : (
              <div 
                className="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-5 shadow-lg"
                style={{ background: `linear-gradient(135deg, ${pageSettings.primary_color}, ${pageSettings.primary_color}dd)` }}
              >
                <div className="w-14 h-14 rounded-full bg-white/30 flex items-center justify-center">
                  <span className="text-white font-cairo font-bold text-2xl">ح</span>
                </div>
              </div>
            )}
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

      {/* Right Side - Background Image */}
      <div 
        className="hidden lg:flex lg:w-[55%] relative bg-cover bg-center"
        style={{ 
          backgroundImage: `url(${BACKGROUND_IMAGE})`,
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-l from-black/70 via-black/50 to-black/30" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12 text-center">
          <div className="max-w-lg">
            {/* Decorative Line */}
            <div className="w-20 h-1 bg-secondary mx-auto mb-8 rounded-full" />
            
            <h2 className="font-cairo font-bold text-4xl text-white mb-4 leading-tight">
              منصة خدمات الحشود
            </h2>
            <p className="text-lg text-white/80 leading-relaxed">
              نظام إداري متكامل للحرم المكي الشريف
            </p>
            
            {/* Decorative Line */}
            <div className="w-20 h-1 bg-secondary mx-auto mt-8 rounded-full" />
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mt-12">
              <div className="text-center">
                <p className="text-3xl font-cairo font-bold text-white">5</p>
                <p className="text-sm text-white/60 mt-1">إدارات</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-cairo font-bold text-white">105</p>
                <p className="text-sm text-white/60 mt-1">باب</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-cairo font-bold text-white">24/7</p>
                <p className="text-sm text-white/60 mt-1">مراقبة</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
