import { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

  const fetchMenuItems = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setMenuItems([]);
        setLoading(false);
        return;
      }
      
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
  }, []);

  const refreshMenu = useCallback(() => {
    fetchMenuItems();
  }, [fetchMenuItems]);

  useEffect(() => {
    fetchMenuItems();
  }, [fetchMenuItems]);

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
