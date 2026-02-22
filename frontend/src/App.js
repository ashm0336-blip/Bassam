import "@/App.css";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { HeaderProvider } from "@/context/HeaderContext";
import { DepartmentProtectedRoute, AdminProtectedRoute } from "@/components/ProtectedRoute";
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
import MapPage from "@/pages/MapPage";
import ProhibitedItemsPage from "@/pages/ProhibitedItemsPage";
import TransactionsPage from "@/pages/TransactionsPage";
import LoginPage from "@/pages/LoginPage";
import AdminPage from "@/pages/AdminPage";
import HaramMapPage from "@/pages/HaramMapPage";
import MapManagementPage from "@/pages/MapManagementPage";
import GateMapPage from "@/pages/GateMapPage";
import DailySessionsPage from "@/pages/DailySessionsPage";

// Conditional Dashboard
function ConditionalDashboard() {
  const { user } = useAuth();
  
  // General Manager sees unified dashboard
  if (user?.role === 'general_manager') {
    return <ManagerDashboard />;
  }
  
  // Department Managers see their department page directly
  if (user?.role === 'department_manager' && user?.department) {
    const departmentRoutes = {
      'planning': '/planning',
      'gates': '/gates',
      'plazas': '/plazas',
      'mataf': '/mataf',
      'crowd_services': '/crowd-services'
    };
    const route = departmentRoutes[user.department];
    if (route) {
      return <Navigate to={route} replace />;
    }
  }
  
  // Admin and others see main dashboard
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

// Public Route (redirect to dashboard if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return null;
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
        <Route path="map" element={<MapPage />} />
        <Route path="planning" element={
          <DepartmentProtectedRoute department="planning">
            <PlanningDepartment />
          </DepartmentProtectedRoute>
        } />
        <Route path="plazas" element={
          <DepartmentProtectedRoute department="plazas">
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
        <Route path="reports" element={<ReportsPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="prohibited-items" element={<ProhibitedItemsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="haram-map" element={<HaramMapPage />} />
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
          <AdminProtectedRoute>
            <DailySessionsPage />
          </AdminProtectedRoute>
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
