'use client';

import { useState } from 'react';
import { useUnreadNotifications } from '@/hooks';
import { notificationsApi } from '@/lib/api';

export function NotificationPanel() {
  const { notifications, unreadCount, isConnected } = useUnreadNotifications();
  const [marking, setMarking] = useState<string | null>(null);

  async function handleMarkAsRead(notificationId: string) {
    setMarking(notificationId);
    try {
      await notificationsApi.markAsRead('', notificationId);
    } catch {
      // handled by api layer
    } finally {
      setMarking(null);
    }
  }

  return (
    <div className="notification-panel">
      <div className="mb-4">
        <span
          className={`inline-block w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`}
        />
        <span className="text-xs text-gray-500">{isConnected ? 'Connecté' : 'Connexion...'}</span>
      </div>

      <h3 className="text-lg font-semibold">Notifications ({unreadCount})</h3>

      {notifications.length === 0 && (
        <p className="text-gray-500 text-sm mt-2">Aucune notification</p>
      )}

      <div className="space-y-2 mt-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-3 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer transition ${marking === notification.id ? 'opacity-50' : ''}`}
            onClick={() => handleMarkAsRead(notification.id)}
          >
            <h4 className="font-semibold text-sm">{notification.title}</h4>
            <p className="text-xs text-gray-600">{notification.message}</p>
            <span className="text-xs text-gray-500">
              {new Date(notification.createdAt).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
