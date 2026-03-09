import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check iOS
    const ios = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
    setIsIOS(ios);

    // Show iOS banner after 3 seconds if not dismissed before
    if (ios && !localStorage.getItem("pwa_dismissed")) {
      setTimeout(() => setShowBanner(true), 3000);
    }

    // Listen for Android/Chrome install prompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!localStorage.getItem("pwa_dismissed")) {
        setTimeout(() => setShowBanner(true), 2000);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowBanner(false);
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa_dismissed", "true");
  };

  if (!showBanner || isInstalled) return null;

  return (
    <div
      className="fixed bottom-20 lg:bottom-6 left-4 right-4 lg:left-auto lg:right-6 lg:w-80 z-50"
      data-testid="pwa-install-banner"
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-4 flex items-start gap-3">
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <span className="text-white font-cairo font-bold text-xl">ح</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0" dir="rtl">
          <p className="text-sm font-cairo font-semibold text-foreground">
            ثبّت التطبيق على جهازك
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {isIOS
              ? 'اضغط على زر المشاركة ثم "إضافة إلى الشاشة الرئيسية"'
              : "أضف منصة خدمات الحشود لشاشتك الرئيسية للوصول السريع"}
          </p>

          {!isIOS && (
            <button
              onClick={handleInstall}
              data-testid="pwa-install-btn"
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-cairo font-medium hover:bg-primary/90 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              تثبيت الآن
            </button>
          )}
        </div>

        {/* Close */}
        <button
          onClick={handleDismiss}
          data-testid="pwa-dismiss-btn"
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
