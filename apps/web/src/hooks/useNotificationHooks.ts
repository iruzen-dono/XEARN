import { useMemo } from 'react';
import { useNotificationsSSE } from './useNotificationsSSE';

export function useUnreadNotifications() {
  const { notifications, isConnected } = useNotificationsSSE();

  const unread = useMemo(() => notifications.filter((n) => !n.read), [notifications]);

  return { unreadCount: unread.length, notifications: unread, isConnected };
}

export function useNotificationsByType(type: string) {
  const { notifications, isConnected } = useNotificationsSSE();

  const filtered = useMemo(
    () => notifications.filter((n) => n.type === type && !n.read),
    [notifications, type],
  );

  return { notifications: filtered, count: filtered.length, isConnected };
}
