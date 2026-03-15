import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useRealtimeRefresh } from './WebSocketContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const ROLE_LABELS = {
  system_admin: { ar: 'مسؤول النظام', en: 'System Admin', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  general_manager: { ar: 'المدير العام', en: 'General Manager', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  department_manager: { ar: 'مدير الإدارة', en: 'Dept. Manager', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  shift_supervisor: { ar: 'مشرف الوردية', en: 'Shift Supervisor', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  field_staff: { ar: 'موظف ميداني', en: 'Field Staff', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  admin_staff: { ar: 'موظف إداري', en: 'Admin Staff', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
};

export const DEPT_LABELS = {
  planning: { ar: 'إدارة التخطيط', en: 'Planning' },
  haram_map: { ar: 'إدارة المصليات', en: 'Prayer Areas' },
  gates: { ar: 'إدارة الأبواب', en: 'Gates' },
  plazas: { ar: 'إدارة الساحات', en: 'Plazas' },
  crowd_services: { ar: 'خدمات الحشود', en: 'Crowd Services' },
  mataf: { ar: 'صحن المطاف', en: 'Mataf' },
};

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

const REFRESH_INTERVAL = 60 * 1000; // كل دقيقة

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [roleChangeAlert, setRoleChangeAlert] = useState(null);
  const prevRoleRef = useRef(null);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  // Periodic refresh every 5 minutes
  useEffect(() => {
    if (!token || !user) return;
    const interval = setInterval(() => { refreshUserSilently(); }, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [token, user?.id]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      const userData = response.data;
      // Fetch permissions
      let permissions = [];
      try {
        const permRes = await axios.get(`${API}/auth/my-permissions`);
        permissions = permRes.data.permissions || [];
      } catch {}
      const fullUser = { ...userData, permissions };
      prevRoleRef.current = userData.role;
      setUser(fullUser);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const refreshUserSilently = useCallback(async () => {
    if (!token) return;
    try {
      const [meRes, permRes] = await Promise.all([
        axios.get(`${API}/auth/me`),
        axios.get(`${API}/auth/my-permissions`).catch(() => ({ data: { permissions: [] } })),
      ]);
      const newRole = meRes.data.role;
      const oldRole = prevRoleRef.current;

      // Detect role change
      if (oldRole && newRole !== oldRole) {
        setRoleChangeAlert({ oldRole, newRole });
      }
      prevRoleRef.current = newRole;
      setUser(prev => prev ? {
        ...prev,
        ...meRes.data,
        permissions: permRes.data.permissions || prev.permissions || [],
      } : prev);
    } catch {}
  }, [token]);

  const dismissRoleChange = () => setRoleChangeAlert(null);

  const login = async (identifier, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { identifier, password });
      const { access_token, user: userData, must_change_pin } = response.data;
      
      localStorage.setItem('token', access_token);
      if (must_change_pin) localStorage.setItem('must_change_pin', '1');
      else localStorage.removeItem('must_change_pin');
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      setToken(access_token);

      // Fetch effective permissions
      let permissions = [];
      try {
        const permRes = await axios.get(`${API}/auth/my-permissions`, {
          headers: { Authorization: `Bearer ${access_token}` }
        });
        permissions = permRes.data.permissions || [];
      } catch {}

      const fullUser = { ...userData, must_change_pin: !!must_change_pin, permissions };
      prevRoleRef.current = userData.role;
      setUser(fullUser);
      return { success: true, must_change_pin, user: fullUser };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'فشل تسجيل الدخول' 
      };
    }
  };

  const hasPermission = (permission, requiredLevel = 'read') => {
    if (!user) return false;
    if (user.role === 'system_admin') return true;
    const perms = user.permissions || {};
    // Support old array format
    if (Array.isArray(perms)) return perms.includes(permission);
    // New dict format: {"perm": "read"|"write"}
    const level = perms[permission];
    if (!level) return false;
    if (requiredLevel === 'read') return level === 'read' || level === 'write';
    if (requiredLevel === 'write') return level === 'write';
    return false;
  };

  const canRead = (permission) => hasPermission(permission, 'read');
  const canWrite = (permission) => hasPermission(permission, 'write');

  const refreshPermissions = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/auth/my-permissions`);
      setUser(prev => prev ? { ...prev, permissions: res.data.permissions || [] } : prev);
    } catch {}
  }, [token]);

  // Auto-refresh permissions when admin changes them
  useRealtimeRefresh(["permissions"], refreshPermissions);

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    prevRoleRef.current = null;
    setRoleChangeAlert(null);
  };

  const isAdmin = () => user?.role === 'system_admin';
  const isGeneralManager = () => user?.role === 'general_manager';

  const canManageDepartment = (department) => {
    if (user?.role === 'system_admin') return true;
    if (user?.role === 'department_manager' && user?.department === department) return true;
    return false;
  };

  const canViewDepartment = (department) => {
    if (user?.role === 'system_admin') return true;
    if (user?.role === 'general_manager') return true;
    const depts = user?.allowed_departments || (user?.department ? [user.department] : []);
    return depts.includes(department);
  };

  const canAddAlerts = () => {
    return user?.role === 'system_admin' || user?.role === 'department_manager' || user?.role === 'field_staff' || user?.role === 'shift_supervisor';
  };

  const isReadOnly = () => {
    if (!user) return true;
    if (user.role === 'system_admin') return false;
    // Check if user has ANY write permission
    const perms = user.permissions || {};
    if (Array.isArray(perms)) return false;
    return !Object.values(perms).some(v => v === 'write');
  };

  return (
    <AuthContext.Provider value={{ 
      user, token, loading, login, logout, setUser,
      isAdmin, isGeneralManager,
      canManageDepartment, canViewDepartment, canAddAlerts,
      isReadOnly, hasPermission, canRead, canWrite, refreshPermissions,
      isAuthenticated: !!user,
      roleChangeAlert, dismissRoleChange,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
