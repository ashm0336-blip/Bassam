import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DEFAULTS = {
  bottom_nav_count: 4,
  bottom_nav_items: null,
  show_sidebar_notifications: true,
  show_sidebar_language: true,
  show_sidebar_theme: true,
  show_sidebar_logout: true,
  show_sidebar_profile: true,
  pull_to_refresh: true,
  splash_enabled: true,
  splash_bg_color: "#004D38",
  splash_logo_url: null,
  splash_title_ar: "خدمات الحشود",
  splash_title_en: "Crowd Services",
  splash_subtitle_ar: "الإدارة العامة لخدمات الحشود",
  splash_subtitle_en: "General Administration of Crowd Services",
  splash_text_color: "#FFFFFF",
  splash_duration: 2000,
  offline_enabled: false,
  offline_cache_pages: true,
  offline_cache_images: false,
};

const MobileSettingsContext = createContext({ mobileSettings: DEFAULTS, refreshMobileSettings: () => {} });

export function MobileSettingsProvider({ children }) {
  const [mobileSettings, setMobileSettings] = useState(DEFAULTS);

  const fetchSettings = async () => {
    try {
      const r = await axios.get(`${API}/settings/pwa`);
      setMobileSettings({ ...DEFAULTS, ...r.data });
    } catch {}
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SET_OFFLINE_CONFIG',
        offlineEnabled: mobileSettings.offline_enabled,
        cachePages: mobileSettings.offline_cache_pages,
        cacheImages: mobileSettings.offline_cache_images,
      });
    }
  }, [mobileSettings.offline_enabled, mobileSettings.offline_cache_pages, mobileSettings.offline_cache_images]);

  return (
    <MobileSettingsContext.Provider value={{ mobileSettings, refreshMobileSettings: fetchSettings }}>
      {children}
    </MobileSettingsContext.Provider>
  );
}

export const useMobileSettings = () => useContext(MobileSettingsContext);
