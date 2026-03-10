import { useEffect, useRef, useCallback, useState } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Web Audio API beep generator
let audioCtx = null;
const getAudioContext = () => {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  return audioCtx;
};

const playBeep = (type = 'warning') => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    // Resume if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') ctx.resume();

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    if (type === 'critical') {
      oscillator.frequency.value = 880;
      oscillator.type = 'square';
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime + 0.18);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime + 0.36);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } else if (type === 'warning') {
      oscillator.frequency.value = 660;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime + 0.25);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.4);
    } else {
      oscillator.frequency.value = 520;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {
    console.error('Sound error:', e);
  }
};

export const useAlertSound = () => {
  const lastPlayedRef = useRef(0);
  const playSound = useCallback((type = 'warning') => {
    const now = Date.now();
    if (now - lastPlayedRef.current < 2000) return;
    lastPlayedRef.current = now;
    playBeep(type);
  }, []);
  return { playSound };
};

// Main Alert Monitor Component
export const CrowdAlertMonitor = () => {
  const { playSound } = useAlertSound();
  const knownIdsRef = useRef(new Set());
  const initializedRef = useRef(false);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('alert_sound') !== 'off');

  useEffect(() => {
    const checkAlerts = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await axios.get(`${API}/alerts`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const alerts = res.data || [];
        const currentIds = new Set(alerts.map(a => a.id));

        if (!initializedRef.current) {
          // First run — just record existing IDs, no sound
          knownIdsRef.current = currentIds;
          initializedRef.current = true;
          return;
        }

        // Find NEW alerts (IDs we haven't seen before)
        const newAlerts = alerts.filter(a => !knownIdsRef.current.has(a.id));
        if (newAlerts.length > 0 && soundEnabled) {
          const hasCritical = newAlerts.some(a => a.priority === 'critical' || a.type === 'security' || a.type === 'medical');
          playSound(hasCritical ? 'critical' : 'warning');
        }

        knownIdsRef.current = currentIds;
      } catch (e) { /* silent */ }
    };

    checkAlerts();
    const interval = setInterval(checkAlerts, 8000);
    return () => clearInterval(interval);
  }, [soundEnabled, playSound]);

  const toggleSound = () => {
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    localStorage.setItem('alert_sound', newVal ? 'on' : 'off');
    // Unlock audio context and play test beep on enable
    if (newVal) {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') ctx.resume();
      playBeep('info');
    }
  };

  return (
    <button
      onClick={toggleSound}
      className={`p-2 rounded-lg border transition-all ${soundEnabled ? 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100' : 'text-muted-foreground bg-muted/50 border-border hover:bg-muted'}`}
      title={soundEnabled ? 'صوت التنبيهات مفعّل — اضغط للإيقاف' : 'صوت التنبيهات مُعطّل — اضغط للتفعيل'}
      data-testid="sound-toggle"
    >
      {soundEnabled ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
      )}
    </button>
  );
};

export const AlertMonitor = CrowdAlertMonitor;
export default useAlertSound;
