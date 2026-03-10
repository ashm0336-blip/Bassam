import { useEffect, useRef, useCallback, useState } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Generate a proper beep sound programmatically using Web Audio API
const playBeep = (type = 'warning') => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    if (type === 'critical') {
      // Urgent: 3 fast high beeps
      oscillator.frequency.value = 880;
      oscillator.type = 'square';
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime + 0.2);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime + 0.4);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.6);
    } else if (type === 'warning') {
      // Warning: 2 medium beeps
      oscillator.frequency.value = 660;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.25, ctx.currentTime + 0.3);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } else {
      // Info: 1 soft beep
      oscillator.frequency.value = 520;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    }

    // Cleanup
    oscillator.onended = () => ctx.close();
  } catch (e) {
    console.error('Sound error:', e);
  }
};

export const useAlertSound = () => {
  const lastPlayedRef = useRef(0);

  const playSound = useCallback((type = 'warning') => {
    const now = Date.now();
    if (now - lastPlayedRef.current < 3000) return;
    lastPlayedRef.current = now;
    playBeep(type);
  }, []);

  return { playSound };
};

// Alert Monitor - polls for new alerts and plays sound
export const CrowdAlertMonitor = () => {
  const { playSound } = useAlertSound();
  const knownAlertsRef = useRef(new Set());
  const initializedRef = useRef(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('alert_sound') !== 'off';
  });

  useEffect(() => {
    const checkAlerts = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await axios.get(`${API}/alerts/unread-count`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const count = res.data.count || 0;

        // First run: just record current count, don't play sound
        if (!initializedRef.current) {
          knownAlertsRef.current = new Set([count]);
          initializedRef.current = true;
          return;
        }

        // If count increased, new alert arrived
        const prevCount = Array.from(knownAlertsRef.current)[0] || 0;
        if (count > prevCount && soundEnabled) {
          playSound('critical');
        }
        knownAlertsRef.current = new Set([count]);
      } catch (e) { /* silent */ }
    };

    checkAlerts();
    const interval = setInterval(checkAlerts, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [soundEnabled, playSound]);

  const toggleSound = () => {
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    localStorage.setItem('alert_sound', newVal ? 'on' : 'off');
    if (newVal) playSound('info'); // Play test beep when enabling
  };

  return (
    <button
      onClick={toggleSound}
      className={`p-2 rounded-lg transition-colors ${soundEnabled ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground hover:bg-muted'}`}
      title={soundEnabled ? 'الصوت مفعّل' : 'الصوت مُعطّل'}
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
