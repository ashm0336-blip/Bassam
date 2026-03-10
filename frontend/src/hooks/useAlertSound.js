import { useEffect, useRef, useCallback } from 'react';

// Sound URLs (base64 encoded short beeps for critical alerts)
const ALERT_SOUNDS = {
  critical: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdW+Hk5WHc2JfaHKCjpGMgHRtcH2IkZKNgXdxdoCKkpOPg3l0eYKLkpKPg3p0eYKKkZGOgnt1eYGJkJCNgXt1eIGIj4+MgHx2eICHjo6LgH12d3+Gjo2KgH12d36FjYyJf312dn6EjIuIf352dn2Di4qHfn52dX2CioqGfn52dXyCiYmFfX52dXuBiIiEfX52dHuAh4eDfX52dHp/hoaCfH12dHl+hYWBe312c3l9hIR/e312c3h8g4N+ent1c3d7goJ9ent1cnZ6gYF7eXt0cnV5f397eHp0cXR4fn56d3l0cHN3fX15dnh0cHJ2fHx4dXdzb3F1e3t3dHZybnB0ent2c3VxbW9zeXl1cnRwa25yeHh0cXNvam1xdnd0cHJuamtwd3ZzcHFsaWpvcHNzcHBrZ2luc3JycG9rZmhrcnFxcG5qZWdqcHBwbm1pZGZpcG9vbWxoY2VobW5ubGtmYmRna2xtbGpkYWNmamtramliYGJlZ2lqaGhhX2FkZmhoaGZgXmBjZWdnZ2ReXmBiZGZmZWNdXV9hY2VlZGJcXF5gYmRkY2FbW11fYWNjYmBaWlxeYGJhYF9ZWVtdX2FhYF5YWFpcXmBfX11XV1lbXV9fXlxWVlhaXF5eXVtVVVdZW11dXFpUVFZYWlxcW1lTU1VXWVtbWlhSUlRWWFpaWVdRUVNVV1lZWFZQUFJUVlhYV1VPT1FTVVdXVlROTlBSVFZWVFNNTU9RU1VVVFJMTE5QUlRUU1FLTM5OUFJTUlBKSkxOUFJSUU9JSUtNT1FRT05ISEpMTlBQT01HRklLTU9PTkxGRkhKTE5OTEtFRUdJS01NTEpEREZISktMS0lDQ0VHSU1LSkhCQkRGSEpKSUdBQUNFR0lJSEZAQEJERkhIR0U/P0FDRUVHR0ZEPT9BQ0VHRkVEPj5AQkRGRkVDPT0/QUJERET',
  warning: 'data:audio/wav;base64,UklGRjIHAABXQVZFZm10IBAAAAABAAEAESsAACJWAAABAAgAZGF0YQ4HAABhZmhqam1ub3BxcnN0dXZ3eHh5enp7fH19fn9/gIGBgoODhIWFhoaHiImJiouLjI2Njo+PkJGRkpOTlJWVlpeXmJmZmputra2vr7CxsbKzs7S1tba3t7i5ubq7u7y9vb6/v8DBwcLDw8TFxcbHx8jJycrLy8zNzc7Pz9DR0dLT09TV1dbX19jZ2dra29zc3d7e3+Dg4eLi4+Tk5ebm5+jo6err6+zs7e7u7/Dw8fHy8/P09fX29/f4+Pn5+vv7/P39/v7/',
  info: 'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA='
};

export const useAlertSound = () => {
  const audioRef = useRef(null);
  const lastPlayedRef = useRef(0);

  const playSound = useCallback((type = 'warning') => {
    // Throttle: don't play more than once every 5 seconds
    const now = Date.now();
    if (now - lastPlayedRef.current < 5000) return;
    lastPlayedRef.current = now;

    try {
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      
      audioRef.current.src = ALERT_SOUNDS[type] || ALERT_SOUNDS.warning;
      audioRef.current.volume = 0.5;
      audioRef.current.play().catch(console.error);
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }, []);

  return { playSound };
};

// Alert Monitor Component
export const AlertMonitor = ({ alerts, enabled = true }) => {
  const { playSound } = useAlertSound();
  const processedAlertsRef = useRef(new Set());

  useEffect(() => {
    if (!enabled || !alerts?.length) return;

    alerts.forEach(alert => {
      // Only process new alerts
      if (processedAlertsRef.current.has(alert.id)) return;
      processedAlertsRef.current.add(alert.id);

      // Check for critical conditions
      if (alert.type === 'emergency' || alert.priority === 'critical') {
        playSound('critical');
      } else if (alert.type === 'warning' || alert.priority === 'high') {
        playSound('warning');
      }
    });

    // Cleanup old alerts from processed set
    if (processedAlertsRef.current.size > 100) {
      const ids = Array.from(processedAlertsRef.current);
      processedAlertsRef.current = new Set(ids.slice(-50));
    }
  }, [alerts, enabled, playSound]);

  return null;
};

// Crowd Alert Monitor - checks for critical occupancy
export const CrowdAlertMonitor = ({ departments, plazas, mataf, enabled = true, threshold = 85 }) => {
  const { playSound } = useAlertSound();
  const alertedAreasRef = useRef(new Set());

  useEffect(() => {
    if (!enabled) return;

    const checkCritical = (items, idField = 'id') => {
      items?.forEach(item => {
        const percentage = item.percentage || 0;
        const id = item[idField];
        
        if (percentage >= threshold && !alertedAreasRef.current.has(id)) {
          alertedAreasRef.current.add(id);
          playSound('critical');
          
          // Show browser notification if permitted
          if (Notification.permission === 'granted') {
            new Notification('تنبيه ازدحام حرج', {
              body: `${item.name || item.level}: نسبة الإشغال ${percentage}%`,
              icon: '/favicon.ico',
              tag: `crowd-alert-${id}`
            });
          }
        } else if (percentage < threshold - 5) {
          // Remove from alerted when goes back to safe
          alertedAreasRef.current.delete(id);
        }
      });
    };

    checkCritical(departments);
    checkCritical(plazas);
    checkCritical(mataf);
  }, [departments, plazas, mataf, enabled, threshold, playSound]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return null;
};

export default useAlertSound;
