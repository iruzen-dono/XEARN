import { useEffect, useRef, useState } from 'react';
import { getApiBaseUrl } from '@/lib/api-base-url';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

const API_URL = getApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);

export function useNotificationsSSE() {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectCountRef = useRef(0);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    function connect() {
      if (eventSourceRef.current) return;

      const url = `${API_URL}/api/notifications/stream`;
      const es = new EventSource(url, { withCredentials: true });

      es.onopen = () => {
        setIsConnected(true);
        reconnectCountRef.current = 0;
      };

      es.onmessage = (event) => {
        try {
          const notification: Notification = JSON.parse(event.data);
          setNotifications((prev) => [notification, ...prev]);
        } catch {
          // malformed SSE payload — skip
        }
      };

      es.onerror = () => {
        setIsConnected(false);
        es.close();
        eventSourceRef.current = null;

        if (reconnectCountRef.current < 5) {
          reconnectCountRef.current += 1;
          const delay = Math.min(1000 * 2 ** reconnectCountRef.current, 30_000);
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      };

      eventSourceRef.current = es;
    }

    connect();

    return () => {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return { notifications, isConnected };
}
