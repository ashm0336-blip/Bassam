import "@/App.css";
import { useEffect } from "react";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { HeaderProvider } from "@/context/HeaderContext";
import { DepartmentProtectedRoute, AdminProtectedRoute, PermissionProtectedRoute } from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import ManagerDashboard from "@/pages/ManagerDashboard";
import PlanningDepartment from "@/pages/PlanningDepartment";
import PlazasDepartment from "@/pages/PlazasDepartment";
import GatesDepartment from "@/pages/GatesDepartment";
import CrowdServicesDepartment from "@/pages/CrowdServicesDepartment";
import MatafDepartment from "@/pages/MatafDepartment";
import ReportsPage from "@/pages/ReportsPage";
import AlertsPage from "@/pages/AlertsPage";
import NotificationsPage from "@/pages/NotificationsPage";
import SettingsPage from "@/pages/SettingsPage";
import ProhibitedItemsPage from "@/pages/ProhibitedItemsPage";
import LoginPage from "@/pages/LoginPage";
import AdminPage from "@/pages/AdminPage";
import HaramMapPage from "@/pages/HaramMapPage";
import MapManagementPage from "@/pages/MapManagementPage";
import GateMapPage from "@/pages/GateMapPage";
import DailySessionsPage from "@/pages/DailySessionsPage";
import DailyGateSessionsPage from "@/pages/DailyGateSessionsPage";
import FieldWorkerPage from "@/pages/FieldWorkerPage";
import EmployeeProfilePage from "@/pages/EmployeeProfilePage";

// Conditional Dashboard
function ConditionalDashboard() {
  const { user, hasPermission } = useAuth();
  
  // Department users — only redirect if they have page_overview permission
  if (user?.department && user?.role !== 'system_admin' && user?.role !== 'general_manager') {
    if (hasPermission('page_overview')) {
      const departmentRoutes = {
        'planning': '/planning',
        'haram_map': '/haram-map',
        'gates': '/gates',
        'plazas': '/plazas',
        'squares': '/plazas',
        'mataf': '/mataf',
        'crowd_services': '/crowd-services'
      };
      const route = departmentRoutes[user.department];
      if (route) {
        return <Navigate to={route} replace />;
      }
    }
  }
  
  // Check dashboard permission for non-admin users
  if (user?.role !== 'system_admin' && user?.role !== 'general_manager' && !hasPermission('page_dashboard')) {
    if (hasPermission('page_alerts')) {
      return <Navigate to="/notifications" replace />;
    }
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-destructive text-2xl">⛔</span>
          </div>
          <h2 className="font-cairo font-bold text-xl mb-2">غير مصرح بالدخول</h2>
          <p className="text-muted-foreground">ليس لديك صلاحية للوصول إلى لوحة التحكم</p>
        </div>
      </div>
    );
  }
  
  // Everyone with permission sees the same Dashboard (غرفة العمليات)
  return <Dashboard />;
}

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary mx-auto flex items-center justify-center mb-4 animate-pulse">
            <span className="text-white font-cairo font-bold text-2xl">ح</span>
          </div>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Public Route (redirect to dashboard if authenticated, but allow PIN change modal)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  
  if (loading) {
    return null;
  }
  
  // If authenticated AND must change PIN — stay on login page to show modal
  if (isAuthenticated && user?.must_change_pin) {
    return children;
  }
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      } />
      
      {/* Protected Routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<ConditionalDashboard />} />
        {/* map route removed */}
        <Route path="planning" element={
          <DepartmentProtectedRoute department="planning">
            <PlanningDepartment />
          </DepartmentProtectedRoute>
        } />
        <Route path="plazas" element={
          <DepartmentProtectedRoute department="squares">
            <PlazasDepartment />
          </DepartmentProtectedRoute>
        } />
        <Route path="gates" element={
          <DepartmentProtectedRoute department="gates">
            <GatesDepartment />
          </DepartmentProtectedRoute>
        } />
        <Route path="crowd-services" element={
          <DepartmentProtectedRoute department="crowd_services">
            <CrowdServicesDepartment />
          </DepartmentProtectedRoute>
        } />
        <Route path="mataf" element={
          <DepartmentProtectedRoute department="mataf">
            <MatafDepartment />
          </DepartmentProtectedRoute>
        } />
        <Route path="reports" element={
          <PermissionProtectedRoute permission="page_reports">
            <ReportsPage />
          </PermissionProtectedRoute>
        } />
        <Route path="alerts" element={
          <PermissionProtectedRoute permission="page_alerts">
            <AlertsPage />
          </PermissionProtectedRoute>
        } />
        <Route path="notifications" element={
          <PermissionProtectedRoute permission="page_alerts">
            <NotificationsPage />
          </PermissionProtectedRoute>
        } />
        <Route path="prohibited-items" element={
          <PermissionProtectedRoute permission="page_alerts">
            <ProhibitedItemsPage />
          </PermissionProtectedRoute>
        } />
        <Route path="settings" element={<Navigate to="/admin" replace />} />
        <Route path="haram-map" element={
          <DepartmentProtectedRoute department="haram_map">
            <HaramMapPage />
          </DepartmentProtectedRoute>
        } />
        <Route path="map-management" element={
          <AdminProtectedRoute>
            <MapManagementPage />
          </AdminProtectedRoute>
        } />
        <Route path="gate-map" element={
          <AdminProtectedRoute>
            <GateMapPage />
          </AdminProtectedRoute>
        } />
        <Route path="daily-sessions" element={
          <PermissionProtectedRoute permission="view_daily_sessions">
            <DailySessionsPage />
          </PermissionProtectedRoute>
        } />
        <Route path="daily-gates" element={
          <PermissionProtectedRoute permission="view_daily_sessions">
            <DailyGateSessionsPage />
          </PermissionProtectedRoute>
        } />
        <Route path="field" element={
          <PermissionProtectedRoute permission="page_field">
            <FieldWorkerPage />
          </PermissionProtectedRoute>
        } />
        <Route path="employee/:id" element={
          <PermissionProtectedRoute permission="page_employees">
            <EmployeeProfilePage />
          </PermissionProtectedRoute>
        } />
        <Route path="my-profile" element={
          <EmployeeProfilePage self />
        } />
        <Route path="admin" element={
          <AdminProtectedRoute>
            <AdminPage />
          </AdminProtectedRoute>
        } />
      </Route>
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  // Suppress ResizeObserver errors
  useEffect(() => {
    // Override console.error to filter ResizeObserver errors
    const originalError = console.error;
    console.error = (...args) => {
      if (typeof args[0] === 'string' && args[0].includes('ResizeObserver')) {
        return;
      }
      originalError.apply(console, args);
    };

    // Handle window errors
    const errorHandler = (e) => {
      if (e.message && e.message.includes('ResizeObserver')) {
        e.stopImmediatePropagation();
        e.preventDefault();
        return false;
      }
    };
    
    window.addEventListener('error', errorHandler);
    
    return () => {
      console.error = originalError;
      window.removeEventListener('error', errorHandler);
    };
  }, []);

  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <SidebarProvider>
            <HeaderProvider>
              <BrowserRouter>
                <AppRoutes />
                <PWAInstallPrompt />
              </BrowserRouter>
              <Toaster position="top-left" />
            </HeaderProvider>
          </SidebarProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
