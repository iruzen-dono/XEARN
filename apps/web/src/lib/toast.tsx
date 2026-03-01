'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    warning: (message: string) => void;
    info: (message: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let toastId = 0;

const icons: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles: Record<ToastType, string> = {
  success: 'border-success-500/30 bg-success-500/10',
  error: 'border-danger-500/30 bg-danger-500/10',
  warning: 'border-warning-500/30 bg-warning-500/10',
  info: 'border-primary-500/30 bg-primary-500/10',
};

const iconColors: Record<ToastType, string> = {
  success: 'text-success-400',
  error: 'text-danger-400',
  warning: 'text-warning-400',
  info: 'text-primary-400',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  const toast = {
    success: (msg: string) => addToast('success', msg),
    error: (msg: string) => addToast('error', msg),
    warning: (msg: string) => addToast('warning', msg),
    info: (msg: string) => addToast('info', msg),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => {
            const Icon = icons[t.type];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 80, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 80, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className={`pointer-events-auto flex items-start gap-3 border rounded-xl px-4 py-3 shadow-lg backdrop-blur-xl ${styles[t.type]}`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColors[t.type]}`} />
                <span className="text-sm font-medium text-white flex-1">{t.message}</span>
                <button onClick={() => removeToast(t.id)} className="text-dark-400 hover:text-white flex-shrink-0 transition-colors">
                  <X className="w-4 h-4" />
                </button>
                {/* Progress bar */}
                <motion.div
                  className={`absolute bottom-0 left-0 h-0.5 rounded-full ${iconColors[t.type]} opacity-40`}
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 4, ease: 'linear' }}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.toast;
}
