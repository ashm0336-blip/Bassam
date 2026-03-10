import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const DepartmentProtectedRoute = ({ children, department }) => {
  const { canViewDepartment, isAuthenticated, loading } = useAuth();
  const { language } = useLanguage();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary mx-auto flex items-center justify-center mb-4 animate-pulse">
            <span className="text-white font-cairo font-bold text-2xl">ح</span>
          </div>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!canViewDepartment(department)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="font-cairo font-bold text-xl mb-2">
              {language === 'ar' ? 'غير مصرح بالدخول' : 'Access Denied'}
            </h2>
            <p className="text-muted-foreground">
              {language === 'ar' 
                ? 'ليس لديك صلاحية للوصول إلى هذه الصفحة'
                : 'You do not have permission to access this page'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return children;
};

export const AdminProtectedRoute = ({ children }) => {
  const { isAdmin, isAuthenticated, loading } = useAuth();
  const { language } = useLanguage();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary mx-auto flex items-center justify-center mb-4 animate-pulse">
            <span className="text-white font-cairo font-bold text-2xl">ح</span>
          </div>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin()) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="font-cairo font-bold text-xl mb-2">
              {language === 'ar' ? 'صلاحيات إدارية مطلوبة' : 'Admin Access Required'}
            </h2>
            <p className="text-muted-foreground">
              {language === 'ar' 
                ? 'هذه الصفحة متاحة للمدير العام فقط'
                : 'This page is only accessible to super admins'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return children;
};

export const PermissionProtectedRoute = ({ children, permission }) => {
  const { hasPermission, isAuthenticated, loading } = useAuth();
  const { language } = useLanguage();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary mx-auto flex items-center justify-center mb-4 animate-pulse">
            <span className="text-white font-cairo font-bold text-2xl">ح</span>
          </div>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasPermission(permission)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="font-cairo font-bold text-xl mb-2">
              {language === 'ar' ? 'غير مصرح بالدخول' : 'Access Denied'}
            </h2>
            <p className="text-muted-foreground">
              {language === 'ar' 
                ? 'ليس لديك صلاحية للوصول إلى هذه الصفحة'
                : 'You do not have permission to access this page'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return children;
};
