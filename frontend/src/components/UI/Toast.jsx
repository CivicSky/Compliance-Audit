import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext({
  toast: () => {},
});

/**
 * Hook to access the toast notification system.
 * @returns {{ toast: (options: { title: string, description?: string, variant?: 'success' | 'error' | 'warning' | 'info', duration?: number }) => void }}
 */
export const useToast = () => useContext(ToastContext);

let toastIdCounter = 0;

/**
 * Toast Provider component that manages toast state and renders toasts.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback(({ title, description, variant = 'info', duration = 4000 }) => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, title, description, variant, duration }].slice(-5));
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {typeof document !== 'undefined' && createPortal(
        <div className="fixed top-4 right-4 z-[70] flex flex-col gap-3 pointer-events-none">
          {toasts.map(t => (
            <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(onDismiss, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast, onDismiss]);

  const variants = {
    success: { color: 'bg-[var(--success-500,#22c55e)]', Icon: CheckCircle, iconColor: 'text-[var(--success-500,#22c55e)]' },
    error: { color: 'bg-[var(--danger-500,#ef4444)]', Icon: XCircle, iconColor: 'text-[var(--danger-500,#ef4444)]' },
    warning: { color: 'bg-[var(--warning-500,#f59e0b)]', Icon: AlertTriangle, iconColor: 'text-[var(--warning-500,#f59e0b)]' },
    info: { color: 'bg-[var(--info-500,#3b82f6)]', Icon: Info, iconColor: 'text-[var(--info-500,#3b82f6)]' },
  };

  const { color, Icon, iconColor } = variants[toast.variant] || variants.info;

  return (
    <div className="pointer-events-auto bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden flex min-w-[300px] max-w-sm animate-in slide-in-from-right-8 fade-in duration-300">
      <div className={`w-1 flex-shrink-0 ${color}`} />
      <div className="flex-1 p-4 flex items-start gap-3">
        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-gray-900">{toast.title}</h4>
          {toast.description && <p className="text-sm text-gray-500 mt-1">{toast.description}</p>}
        </div>
        <button 
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
