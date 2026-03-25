import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";

const WebSocketContext = createContext(null);
const WsStatusContext = createContext(false);

export function WebSocketProvider({ children }) {
  const [lastEvent, setLastEvent] = useState(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);

  const connect = useCallback(() => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const token = localStorage.getItem("token") || "";
      const ws = new WebSocket(`${protocol}//${host}/ws?token=${token}`);

      ws.onopen = () => {
        console.log("[WS] Connected");
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const channel = data.channel || data.type || null;
          setLastEvent({ ...data, channel, _ts: Date.now() });
        } catch {}
      };

      ws.onclose = () => {
        console.log("[WS] Disconnected — reconnecting in 3s");
        setConnected(false);
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
    <WsStatusContext.Provider value={connected}>
      <WebSocketContext.Provider value={lastEvent}>
        {children}
      </WebSocketContext.Provider>
    </WsStatusContext.Provider>
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

export function useLastEvent() {
  return useContext(WebSocketContext);
}

export function useWsConnected() {
  return useContext(WsStatusContext);
}
