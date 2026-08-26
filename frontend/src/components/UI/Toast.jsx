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

  const toast = useCallback(({ title = 'Notice', description, variant = 'info', duration = 1500 }) => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, title: title || 'Notice', description, variant, duration }].slice(-5));
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {typeof document !== 'undefined' && createPortal(
        <div className="fixed top-20 right-4 z-[999999] flex flex-col items-end gap-2 pointer-events-none">
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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const enterTimer = setTimeout(() => setIsMounted(true), 10);
    let timer;
    if (toast.duration && toast.duration > 0) {
      timer = setTimeout(() => {
        setIsMounted(false);
        setTimeout(onDismiss, 300);
      }, toast.duration);
    }
    return () => {
      clearTimeout(enterTimer);
      if (timer) clearTimeout(timer);
    };
  }, [toast, onDismiss]);

  const messageText = toast.description || (typeof toast.title === 'string' && toast.title !== 'Notice' ? toast.title : '');
  const displayTitle = toast.description ? (toast.title || 'Notice') : 'Notice';

  const variantStyles = {
    error: {
      container: 'border-rose-600 bg-rose-600 text-white shadow-lg shadow-rose-600/30',
      title: 'text-white font-extrabold',
      text: 'text-rose-50 font-medium',
      button: 'text-white hover:text-rose-100 hover:bg-rose-700/80',
      Icon: XCircle,
      iconColor: 'text-white'
    },
    success: {
      container: 'border-emerald-600 bg-emerald-600 text-white shadow-lg shadow-emerald-600/30',
      title: 'text-white font-extrabold',
      text: 'text-emerald-50 font-medium',
      button: 'text-white hover:text-emerald-100 hover:bg-emerald-700/80',
      Icon: CheckCircle,
      iconColor: 'text-white'
    },
    warning: {
      container: 'border-amber-200 bg-amber-50 text-amber-900 shadow-amber-100/80',
      title: 'text-amber-950',
      text: 'text-amber-800',
      button: 'text-amber-600 hover:text-amber-900 hover:bg-amber-100',
      Icon: AlertTriangle,
      iconColor: 'text-amber-600'
    },
    info: {
      container: 'border-blue-200 bg-blue-50 text-blue-900 shadow-blue-100/80',
      title: 'text-blue-950',
      text: 'text-blue-800',
      button: 'text-blue-600 hover:text-blue-900 hover:bg-blue-100',
      Icon: Info,
      iconColor: 'text-blue-600'
    }
  };

  const currentVariant = variantStyles[toast.variant] || variantStyles.info;
  const VariantIcon = currentVariant.Icon;

  return (
    <div className={`pointer-events-auto inline-flex items-center gap-2.5 max-w-full rounded-full border px-4 py-2.5 text-sm shadow-md transition-all duration-300 ease-out ${currentVariant.container} ${isMounted ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
      <VariantIcon className={`w-4 h-4 shrink-0 ${currentVariant.iconColor}`} />
      <span className={`font-semibold whitespace-nowrap ${currentVariant.title}`}>{displayTitle}:</span>
      <span className={currentVariant.text}>{messageText}</span>
      <button 
        onClick={() => { setIsMounted(false); setTimeout(onDismiss, 300); }} 
        className={`ml-1 transition-colors p-0.5 rounded-full ${currentVariant.button}`}
        aria-label="Close"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}


