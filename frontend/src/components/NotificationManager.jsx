import { useEffect, useRef, useCallback, useState } from 'react';
import { useContext } from 'react';
import { toast } from 'sonner';
import { Bell, CheckCircle2, AlertTriangle, ClipboardList } from 'lucide-react';

// Web Audio beep with different tones
let audioCtx = null;
const getAudioCtx = () => {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  return audioCtx;
};

const playNotifSound = (priority = 'normal') => {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    if (priority === 'high' || priority === 'urgent' || priority === 'critical') {
      // Double chime — urgent
      [0, 0.2].forEach(delay => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = delay === 0 ? 880 : 1100;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.25, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.15);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.15);
      });
    } else {
      // Single gentle chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 660;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch {}
};

// Request browser notification permission
const requestNotifPermission = () => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
};

// Show browser notification (works even when tab is not focused)
const showBrowserNotification = (title, body, icon = '/favicon.ico') => {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        body,
        icon,
        badge: icon,
        dir: 'rtl',
        lang: 'ar',
        tag: `notif-${Date.now()}`,
        requireInteraction: false,
      });
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
      setTimeout(() => notif.close(), 8000);
    } catch {}
  }
};

// Custom toast notification with icon
const showNotifToast = (title, message, priority, action) => {
  const isTask = action === 'new_task';
  const isDone = action === 'task_done';
  const isAlert = action === 'new_alert';
  const isHigh = ['high', 'urgent', 'critical'].includes(priority);

  toast(title, {
    description: message,
    duration: isHigh ? 8000 : 5000,
    icon: isDone ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> :
          isTask ? <ClipboardList className="w-5 h-5 text-blue-500" /> :
          isHigh ? <AlertTriangle className="w-5 h-5 text-red-500" /> :
                   <Bell className="w-5 h-5 text-amber-500" />,
    className: `font-cairo ${isHigh ? 'border-red-200 bg-red-50' : ''}`,
  });
};

export function NotificationManager({ lastEvent, userId }) {
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('notif_sound') !== 'off');
  const processedRef = useRef(new Set());

  // Request permission on mount
  useEffect(() => {
    requestNotifPermission();
  }, []);

  // Handle incoming WebSocket notifications
  useEffect(() => {
    if (!lastEvent || lastEvent.type !== 'notification') return;
    
    const eventKey = `${lastEvent.action}-${lastEvent._ts}`;
    if (processedRef.current.has(eventKey)) return;
    processedRef.current.add(eventKey);
    // Keep set small
    if (processedRef.current.size > 50) {
      const arr = [...processedRef.current];
      processedRef.current = new Set(arr.slice(-25));
    }

    const payload = lastEvent.payload || {};
    const { title, message, priority, target_user_ids } = payload;

    // If notification has specific targets, only show to them
    if (target_user_ids && target_user_ids.length > 0 && userId) {
      if (!target_user_ids.includes(userId)) return;
    }

    // Show toast
    if (title) {
      showNotifToast(title, message || '', priority, lastEvent.action);
    }

    // Play sound
    if (soundEnabled && title) {
      playNotifSound(priority);
    }

    // Show browser notification (when tab not focused)
    if (document.hidden && title) {
      showBrowserNotification(title, message || '');
    }
  }, [lastEvent, userId, soundEnabled]);

  return null; // This is a listener-only component
}

export function NotificationSoundToggle() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem('notif_sound') !== 'off');

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem('notif_sound', next ? 'on' : 'off');
    if (next) {
      const ctx = getAudioCtx();
      if (ctx?.state === 'suspended') ctx.resume();
      playNotifSound('normal');
    }
  };

  return (
    <button
      onClick={toggle}
      className={`p-2 rounded-lg border transition-all ${
        enabled
          ? 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
          : 'text-muted-foreground bg-muted/50 border-border hover:bg-muted'
      }`}
      title={enabled ? 'صوت الإشعارات مفعّل' : 'صوت الإشعارات معطّل'}
      data-testid="notif-sound-toggle"
    >
      {enabled ? (
        <Bell className="w-4 h-4" />
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
      )}
    </button>
  );
}

export default NotificationManager;
