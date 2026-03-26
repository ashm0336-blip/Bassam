import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";

const WebSocketContext = createContext(null);
const WsStatusContext = createContext(false);

const WsControlContext = createContext({ disconnect: () => {}, reconnect: () => {} });

export function WebSocketProvider({ children }) {
  const [lastEvent, setLastEvent] = useState(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const intentionalClose = useRef(false);

  const connect = useCallback(() => {
    intentionalClose.current = false;
    if (wsRef.current && wsRef.current.readyState <= 1) return;
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
        setConnected(false);
        if (!intentionalClose.current) {
          console.log("[WS] Disconnected — reconnecting in 3s");
          reconnectTimer.current = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    } catch {
      if (!intentionalClose.current) {
        reconnectTimer.current = setTimeout(connect, 5000);
      }
    }
  }, []);

  const disconnectWs = useCallback(() => {
    intentionalClose.current = true;
    clearTimeout(reconnectTimer.current);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  const reconnectWs = useCallback(() => {
    disconnectWs();
    setTimeout(() => connect(), 100);
  }, [disconnectWs, connect]);

  useEffect(() => {
    connect();
    return () => {
      intentionalClose.current = true;
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  return (
    <WsControlContext.Provider value={{ disconnect: disconnectWs, reconnect: reconnectWs }}>
      <WsStatusContext.Provider value={connected}>
        <WebSocketContext.Provider value={lastEvent}>
          {children}
        </WebSocketContext.Provider>
      </WsStatusContext.Provider>
    </WsControlContext.Provider>
  );
}

export function useWsDisconnect() {
  const { disconnect } = useContext(WsControlContext);
  return disconnect;
}

export function useWsReconnect() {
  const { reconnect } = useContext(WsControlContext);
  return reconnect;
}

/**
 * Hook: subscribe to real-time events for specific channels.
 * When an event arrives on any of the given channels, calls `onRefresh`.
 * Debounces rapid events (default 500ms) to avoid cascading API calls.
 *
 * @param {string[]} channels - e.g. ["employees", "schedules"]
 * @param {Function} onRefresh - function to call when data should refresh
 * @param {number} debounceMs - debounce delay in ms (default 500)
 */
export function useRealtimeRefresh(channels, onRefresh, debounceMs = 500) {
  const lastEvent = useContext(WebSocketContext);
  const prevTs = useRef(0);
  const timerRef = useRef(null);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!lastEvent || lastEvent._ts === prevTs.current) return;
    if (channels.includes(lastEvent.channel)) {
      prevTs.current = lastEvent._ts;
      if (timerRef.current) clearTimeout(timerRef.current);
      const evt = lastEvent;
      timerRef.current = setTimeout(() => {
        onRefreshRef.current(evt);
      }, debounceMs);
    }
  }, [lastEvent, channels, debounceMs]);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);
}

export function useLastEvent() {
  return useContext(WebSocketContext);
}

export function useWsConnected() {
  return useContext(WsStatusContext);
}
