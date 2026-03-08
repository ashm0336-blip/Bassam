import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (identifier, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { identifier, password });
      const { access_token, user: userData, must_change_pin } = response.data;
      
      localStorage.setItem('token', access_token);
      if (must_change_pin) localStorage.setItem('must_change_pin', '1');
      else localStorage.removeItem('must_change_pin');
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      setToken(access_token);
      setUser({ ...userData, must_change_pin: !!must_change_pin });
      
      return { success: true, must_change_pin };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'فشل تسجيل الدخول' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  const isAdmin = () => {
    return user?.role === 'system_admin';
  };

  const isGeneralManager = () => {
    return user?.role === 'general_manager';
  };

  const canManageDepartment = (department) => {
    if (user?.role === 'system_admin') return true;
    if (user?.role === 'department_manager' && user?.department === department) return true;
    return false;
  };

  const canViewDepartment = (department) => {
    if (user?.role === 'system_admin') return true;
    if (user?.role === 'general_manager') return true;
    if (user?.role === 'monitoring_team') return true;
    if (user?.role === 'department_manager' && user?.department === department) return true;
    if (user?.role === 'field_staff' && user?.department === department) return true;
    return false;
  };

  const canAddAlerts = () => {
    return user?.role === 'system_admin' || user?.role === 'department_manager' || user?.role === 'field_staff';
  };

  const isReadOnly = () => {
    return user?.role === 'general_manager' || user?.role === 'monitoring_team';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading, 
      login, 
      logout,
      setUser,
      isAdmin,
      isGeneralManager,
      canManageDepartment,
      canViewDepartment,
      canAddAlerts,
      isReadOnly,
      isAuthenticated: !!user 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
