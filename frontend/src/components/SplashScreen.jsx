import { useState, useEffect } from "react";
import { useMobileSettings } from "@/context/MobileSettingsContext";
import { useLanguage } from "@/context/LanguageContext";

export default function SplashScreen({ onDone }) {
  const { mobileSettings } = useMobileSettings();
  const { language } = useLanguage();
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  const isStandalone = window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;

  const alreadyShown = sessionStorage.getItem("splash_shown");

  useEffect(() => {
    if (!mobileSettings.splash_enabled || !isStandalone || alreadyShown) {
      setVisible(false);
      onDone();
      return;
    }

    sessionStorage.setItem("splash_shown", "1");

    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, mobileSettings.splash_duration - 400);

    const doneTimer = setTimeout(() => {
      setVisible(false);
      onDone();
    }, mobileSettings.splash_duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  if (!visible) return null;

  const title = language === 'ar' ? mobileSettings.splash_title_ar : mobileSettings.splash_title_en;
  const subtitle = language === 'ar' ? mobileSettings.splash_subtitle_ar : mobileSettings.splash_subtitle_en;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-400 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
      style={{
        backgroundColor: mobileSettings.splash_bg_color,
        color: mobileSettings.splash_text_color,
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {mobileSettings.splash_logo_url ? (
        <img
          src={mobileSettings.splash_logo_url}
          alt=""
          className="w-24 h-24 rounded-3xl object-cover mb-6 animate-pulse"
        />
      ) : (
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6 animate-pulse"
          style={{ background: 'rgba(255,255,255,0.15)' }}
        >
          <span className="font-cairo font-bold text-4xl" style={{ color: mobileSettings.splash_text_color }}>
            {(mobileSettings.splash_title_ar || 'ح').charAt(0)}
          </span>
        </div>
      )}

      <h1 className="font-cairo font-bold text-2xl mb-2 text-center px-8">{title}</h1>
      <p className="text-sm opacity-70 text-center px-8">{subtitle}</p>

      <div className="absolute bottom-12 flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 rounded-full border-t-transparent animate-spin" style={{ borderColor: `${mobileSettings.splash_text_color}40`, borderTopColor: 'transparent' }} />
      </div>
    </div>
  );
}
