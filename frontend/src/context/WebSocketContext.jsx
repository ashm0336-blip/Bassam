import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
  const [lastEvent, setLastEvent] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);

  const connect = useCallback(() => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const ws = new WebSocket(`${protocol}//${host}/ws`);

      ws.onopen = () => {
        console.log("[WS] Connected");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastEvent({ ...data, _ts: Date.now() });
        } catch {}
      };

      ws.onclose = () => {
        console.log("[WS] Disconnected — reconnecting in 3s");
        reconnectTimer.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    } catch {
      reconnectTimer.current = setTimeout(connect, 5000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  return (
    <WebSocketContext.Provider value={lastEvent}>
      {children}
    </WebSocketContext.Provider>
  );
}

/**
 * Hook: subscribe to real-time events for specific channels.
 * When an event arrives on any of the given channels, calls `onRefresh`.
 *
 * @param {string[]} channels - e.g. ["employees", "schedules"]
 * @param {Function} onRefresh - function to call when data should refresh
 */
export function useRealtimeRefresh(channels, onRefresh) {
  const lastEvent = useContext(WebSocketContext);
  const prevTs = useRef(0);

  useEffect(() => {
    if (!lastEvent || lastEvent._ts === prevTs.current) return;
    if (channels.includes(lastEvent.channel)) {
      prevTs.current = lastEvent._ts;
      onRefresh(lastEvent);
    }
  }, [lastEvent, channels, onRefresh]);
}
