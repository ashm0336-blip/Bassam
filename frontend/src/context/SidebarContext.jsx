import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SidebarContext = createContext(null);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return context;
};

export const SidebarProvider = ({ children }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchMenuItems = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || !user) {
      setMenuItems([]);
      setLoading(false);
      return;
    }
    
    try {
      const response = await axios.get(`${API}/sidebar-menu`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMenuItems(response.data);
    } catch (error) {
      console.error("Error fetching menu items:", error);
      setMenuItems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refreshMenu = useCallback(() => {
    fetchMenuItems();
  }, [fetchMenuItems]);

  useEffect(() => {
    if (user) {
      fetchMenuItems();
    }
  }, [user, fetchMenuItems]);

  const value = {
    menuItems,
    loading,
    refreshMenu
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};
