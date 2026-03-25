import "@/App.css";
import { useEffect, useState } from "react";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { WebSocketProvider } from "@/context/WebSocketContext";
import { HeaderProvider } from "@/context/HeaderContext";
import { MobileSettingsProvider } from "@/context/MobileSettingsContext";
import SplashScreen from "@/components/SplashScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DepartmentProtectedRoute, AdminProtectedRoute, PermissionProtectedRoute } from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import ManagerDashboard from "@/pages/ManagerDashboard";
import PlanningDepartment from "@/pages/PlanningDepartment";
import PlazasDepartment from "@/pages/PlazasDepartment";
import GatesDepartment from "@/pages/GatesDepartment";
import CrowdServicesDepartment from "@/pages/CrowdServicesDepartment";
import MatafDepartment from "@/pages/MatafDepartment";
import AlertsPage from "@/pages/AlertsPage";
import NotificationsPage from "@/pages/NotificationsPage";
import SettingsPage from "@/pages/SettingsPage";
import ProhibitedItemsPage from "@/pages/ProhibitedItemsPage";
import LoginPage from "@/pages/LoginPage";
import AdminPage from "@/pages/AdminPage";
import HaramMapPage from "@/pages/HaramMapPage";
import DailySessionsPage from "@/pages/DailySessionsPage";
import DailyGateSessionsPage from "@/pages/DailyGateSessionsPage";
import FieldWorkerPage from "@/pages/FieldWorkerPage";
import EmployeeProfilePage from "@/pages/EmployeeProfilePage";
import DailyStatsPage from "@/pages/DailyStatsPage";
import StatsAnalyticsPage from "@/pages/StatsAnalyticsPage";
import ActivityLogPage from "@/pages/ActivityLogPage";
import WelcomePage from "@/pages/WelcomePage";

// Everyone lands on WelcomePage as the home page
function ConditionalDashboard() {
  return <WelcomePage />;
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
        <Route path="welcome" element={<Navigate to="/" replace />} />
        <Route path="dashboard" element={
          <PermissionProtectedRoute permission="page_dashboard">
            <Dashboard />
          </PermissionProtectedRoute>
        } />
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
        <Route path="daily-stats" element={
          <DailyStatsPage />
        } />
        <Route path="stats-analytics" element={
          <StatsAnalyticsPage />
        } />
        <Route path="activity-log" element={
          <PermissionProtectedRoute permission="page_activity_log">
            <ActivityLogPage />
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

  const [splashDone, setSplashDone] = useState(false);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <MobileSettingsProvider>
            <WebSocketProvider>
              <AuthProvider>
                <SidebarProvider>
                  <HeaderProvider>
                    <BrowserRouter>
                      {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
                      <AppRoutes />
                      <PWAInstallPrompt />
                    </BrowserRouter>
                    <Toaster position="top-left" />
                  </HeaderProvider>
                </SidebarProvider>
              </AuthProvider>
            </WebSocketProvider>
          </MobileSettingsProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
