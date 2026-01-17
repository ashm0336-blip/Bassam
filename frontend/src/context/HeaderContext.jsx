import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const HeaderContext = createContext(null);

export const useHeader = () => {
  const context = useContext(HeaderContext);
  if (!context) {
    throw new Error('useHeader must be used within HeaderProvider');
  }
  return context;
};

export const HeaderProvider = ({ children }) => {
  const [headerSettings, setHeaderSettings] = useState({
    background_color: "#FFFFFF",
    text_color: "#000000",
    show_shadow: true,
    show_date: true,
    show_page_name: true,
    show_user_name: true,
    show_language_toggle: true,
    show_theme_toggle: true,
    show_logout_button: true,
    custom_greeting_ar: "أهلاً",
    custom_greeting_en: "Hello",
    show_logo: false,
    header_logo_url: "",
    header_height: 64,
    border_style: "solid",
    transparency: 100
  });
  const [loading, setLoading] = useState(true);

  const fetchHeaderSettings = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/settings/header`);
      setHeaderSettings(response.data);
    } catch (error) {
      console.error("Error fetching header settings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshHeader = useCallback(() => {
    fetchHeaderSettings();
  }, [fetchHeaderSettings]);

  useEffect(() => {
    fetchHeaderSettings();
  }, [fetchHeaderSettings]);

  const value = {
    headerSettings,
    loading,
    refreshHeader
  };

  return (
    <HeaderContext.Provider value={value}>
      {children}
    </HeaderContext.Provider>
  );
};
