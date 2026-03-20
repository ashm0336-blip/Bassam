import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export const DepartmentProtectedRoute = ({ children, department }) => {
  const { canViewDepartment, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
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

  // Check department access
  const hasDeptAccess = canViewDepartment(department);

  if (!hasDeptAccess) {
    // Redirect to home instead of showing "Access Denied"
    return <Navigate to="/" replace />;
  }

  return children;
};

export const AdminProtectedRoute = ({ children }) => {
  const { isAdmin, isGeneralManager, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
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

  if (!isAdmin() && !isGeneralManager()) {
    // Redirect to home — no error message
    return <Navigate to="/" replace />;
  }

  return children;
};

export const PermissionProtectedRoute = ({ children, permission }) => {
  const { hasPermission, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
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

  if (!hasPermission(permission)) {
    // Redirect to home — no error message
    return <Navigate to="/" replace />;
  }

  return children;
};
