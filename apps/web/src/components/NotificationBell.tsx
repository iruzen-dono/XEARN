'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { notificationsApi, API_URL } from '@/lib/api';
import { timeAgo } from '@/lib/utils';

const TYPE_ICONS: Record<string, string> = {
  WELCOME: '👋',
  TASK_COMPLETED: '✅',
  COMMISSION_RECEIVED: '💰',
  WITHDRAWAL_APPROVED: '🎉',
  WITHDRAWAL_REJECTED: '❌',
  ACCOUNT_ACTIVATED: '⚡',
  NEW_REFERRAL: '👥',
  SYSTEM: '🔔',
};

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // SSE real-time stream with polling fallback
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    // Initial fetch
    const fetchCount = async () => {
      try {
        const data = await notificationsApi.getUnreadCount(token);
        if (!cancelled) setUnreadCount(data.count);
      } catch {
        /* ignore */
      }
    };
    fetchCount();

    // Try SSE first
    let eventSource: EventSource | null = null;
    let pollingInterval: ReturnType<typeof setInterval> | null = null;

    try {
      eventSource = new EventSource(`${API_URL}/api/notifications/stream`, {
        withCredentials: true,
      });

      eventSource.onmessage = (event) => {
        try {
          const notification = JSON.parse(event.data) as Notification;
          setNotifications((prev) => [notification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        } catch {
          /* ignore parse errors */
        }
      };

      eventSource.onerror = () => {
        // SSE failed, fall back to polling
        eventSource?.close();
        eventSource = null;
        if (!cancelled) {
          pollingInterval = setInterval(fetchCount, 30000);
        }
      };
    } catch {
      // EventSource not supported, fall back to polling
      pollingInterval = setInterval(fetchCount, 30000);
    }

    return () => {
      cancelled = true;
      eventSource?.close();
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [token]);

  // Fetch notifications when opening dropdown
  const openDropdown = async () => {
    setOpen(true);
    if (!token) return;
    setLoading(true);
    try {
      const data = await notificationsApi.getAll(token);
      setNotifications(data.notifications || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) {
      document.addEventListener('mousedown', handleClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const markAsRead = async (id: string) => {
    if (!token) return;
    try {
      await notificationsApi.markAsRead(token, id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      /* ignore */
    }
  };

  const markAllAsRead = async () => {
    if (!token) return;
    try {
      await notificationsApi.markAllAsRead(token);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => (open ? setOpen(false) : openDropdown())}
        className="relative p-2 text-dark-400 hover:text-white rounded-lg hover:bg-dark-800 transition-colors"
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Notifications"
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-dark-900 border border-dark-700 rounded-xl shadow-2xl z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-dark-800">
            <h3 className="font-semibold text-sm">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Tout marquer lu
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 text-dark-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-8 h-8 bg-dark-800 rounded-full animate-pulse shrink-0" />
                    <div className="flex-1">
                      <div className="h-4 w-3/4 bg-dark-800 rounded animate-pulse mb-1" />
                      <div className="h-3 w-full bg-dark-800 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-10 px-4">
                <Bell className="w-10 h-10 text-dark-600 mx-auto mb-3" />
                <p className="text-dark-400 text-sm">Aucune notification</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex gap-3 px-4 py-3 border-b border-dark-800 last:border-0 transition-colors cursor-pointer hover:bg-dark-800/50 ${
                    !n.read ? 'bg-primary-500/5' : ''
                  }`}
                  onClick={() => !n.read && markAsRead(n.id)}
                >
                  <div className="text-xl shrink-0 mt-0.5">{TYPE_ICONS[n.type] || '🔔'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-sm font-medium truncate ${!n.read ? 'text-white' : 'text-dark-300'}`}
                      >
                        {n.title}
                      </p>
                      {!n.read && (
                        <div className="w-2 h-2 bg-primary-400 rounded-full shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-xs text-dark-400 line-clamp-2 mt-0.5">{n.message}</p>
                    <p className="text-xs text-dark-500 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
