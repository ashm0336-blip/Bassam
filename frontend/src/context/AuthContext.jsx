import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useRealtimeRefresh, useWsDisconnect, useWsReconnect } from './WebSocketContext';

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
  general_admin: { ar: 'الإدارة العامة', en: 'General Administration' },
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
  const prevGroupRef = useRef(undefined);
  const disconnectWs = useWsDisconnect();
  const reconnectWs = useWsReconnect();

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
      let permissions = [];
      let dept_permissions = {};
      let page_permissions = {};
      try {
        const permRes = await axios.get(`${API}/auth/my-permissions`);
        permissions = permRes.data.permissions || [];
        dept_permissions = permRes.data.dept_permissions || {};
        page_permissions = permRes.data.page_permissions || {};
      } catch {}
      const fullUser = { ...userData, permissions, dept_permissions, page_permissions };
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
      const newGroupName = meRes.data.permission_group_name || permRes.data.permission_group_name;
      const oldRole = prevRoleRef.current;
      const oldGroupName = prevGroupRef.current;

      // Detect permission group change
      if (oldGroupName !== undefined && newGroupName !== oldGroupName) {
        setRoleChangeAlert({ oldRole: oldGroupName || oldRole, newRole: newGroupName || newRole });
      } else if (oldRole && newRole !== oldRole) {
        setRoleChangeAlert({ oldRole, newRole });
      }
      prevRoleRef.current = newRole;
      prevGroupRef.current = newGroupName;
      setUser(prev => prev ? {
        ...prev,
        ...meRes.data,
        permissions: permRes.data.permissions || prev.permissions || [],
        dept_permissions: permRes.data.dept_permissions || prev.dept_permissions || {},
        page_permissions: permRes.data.page_permissions || prev.page_permissions || {},
        permission_group_id: permRes.data.permission_group_id ?? null,
        permission_group_name: permRes.data.permission_group_name ?? null,
        permission_group_rank: permRes.data.permission_group_rank ?? 1,
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

      let permissions = [];
      let dept_permissions = {};
      let page_permissions = {};
      let permission_group_id = null;
      let permission_group_name = null;
      let permission_group_rank = 1;
      try {
        const permRes = await axios.get(`${API}/auth/my-permissions`, {
          headers: { Authorization: `Bearer ${access_token}` }
        });
        permissions = permRes.data.permissions || [];
        dept_permissions = permRes.data.dept_permissions || {};
        page_permissions = permRes.data.page_permissions || {};
        permission_group_id = permRes.data.permission_group_id || null;
        permission_group_name = permRes.data.permission_group_name || null;
        permission_group_rank = permRes.data.permission_group_rank || 1;
      } catch {}

      const fullUser = { ...userData, must_change_pin: !!must_change_pin, permissions, dept_permissions, page_permissions, permission_group_id, permission_group_name, permission_group_rank };
      prevRoleRef.current = userData.role;
      setUser(fullUser);
      reconnectWs();
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

  const canReadDept = (permission, department) => {
    if (!user) return false;
    if (user.role === 'system_admin') return true;
    if (!department) return canRead(permission);
    const dp = user.dept_permissions || {};
    const level = dp[`${department}:${permission}`];
    if (!level) return false;
    return level === 'read' || level === 'write';
  };

  const canWriteDept = (permission, department) => {
    if (!user) return false;
    if (user.role === 'system_admin') return true;
    if (!department) return canWrite(permission);
    const dp = user.dept_permissions || {};
    const level = dp[`${department}:${permission}`];
    return level === 'write';
  };

  const canViewPage = (href) => {
    if (!user) return false;
    if (user.role === 'system_admin') return true;
    const pp = user.page_permissions || {};
    return pp[href]?.visible === true;
  };

  const canEditPage = (href) => {
    if (!user) return false;
    if (user.role === 'system_admin') return true;
    const pp = user.page_permissions || {};
    return pp[href]?.editable === true;
  };

  const refreshPermissions = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/auth/my-permissions`);
      setUser(prev => prev ? { ...prev,
        permissions: res.data.permissions || [],
        dept_permissions: res.data.dept_permissions || {},
        page_permissions: res.data.page_permissions || {},
        permission_group_id: res.data.permission_group_id || null,
        permission_group_name: res.data.permission_group_name || null,
        permission_group_rank: res.data.permission_group_rank || 1,
      } : prev);
    } catch {}
  }, [token]);

  useRealtimeRefresh(["permissions"], refreshPermissions);

  const handleForceLogout = useCallback((data) => {
    if (data?.user_id === user?.id) {
      logout();
      window.location.href = '/login';
    }
  }, [user?.id]);
  useRealtimeRefresh(["force_logout"], handleForceLogout);

  const logout = () => {
    disconnectWs();
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    prevRoleRef.current = null;
    setRoleChangeAlert(null);
  };

  const isAdmin = () => user?.role === 'system_admin';
  const isGeneralManager = () => user?.role === 'general_manager' || user?.role === 'system_admin';

  const DEPT_PATH_MAP = {
    general_admin: '/general-admin',
    planning: '/planning',
    haram_map: '/haram-map',
    gates: '/gates',
    plazas: '/plazas',
    crowd_services: '/crowd-services',
    mataf: '/mataf',
  };

  const canManageDepartment = (department) => {
    if (user?.role === 'system_admin') return true;
    const prefix = DEPT_PATH_MAP[department];
    if (prefix) {
      const pp = user?.page_permissions || {};
      const settingsHref = `${prefix}?tab=settings`;
      if (pp[settingsHref]?.editable) return true;
    }
    if (hasPermission('manage_settings', 'write')) return true;
    if (user?.role === 'department_manager' && user?.department === department) return true;
    return false;
  };

  const canViewDepartment = (department) => {
    if (user?.role === 'system_admin') return true;
    if (user?.department === department) return true;
    const pp = user?.page_permissions || {};
    const prefix = DEPT_PATH_MAP[department];
    if (prefix) {
      for (const [href, perm] of Object.entries(pp)) {
        if (href.startsWith(prefix) && perm?.visible) return true;
      }
    }
    return false;
  };

  const canAddAlerts = () => {
    if (user?.role === 'system_admin') return true;
    const pp = user?.page_permissions || {};
    if (pp['/alerts']?.editable) return true;
    return hasPermission('page_alerts', 'write');
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
      isReadOnly, hasPermission, canRead, canWrite,
      canReadDept, canWriteDept, canViewPage, canEditPage,
      refreshPermissions,
      isAuthenticated: !!user,
      roleChangeAlert, dismissRoleChange,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
