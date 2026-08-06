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
        <div className="fixed top-20 right-4 z-[100] flex flex-col items-end gap-2 pointer-events-none">
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

  return (
    <div className={`pointer-events-auto inline-flex items-center gap-2.5 max-w-full rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm text-cyan-800 shadow-md shadow-cyan-100/80 transition-all duration-300 ease-out ${isMounted ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
      <span className="font-semibold text-cyan-900 whitespace-nowrap">{displayTitle}:</span>
      <span className="text-cyan-800">{messageText}</span>
      <button 
        onClick={() => { setIsMounted(false); setTimeout(onDismiss, 300); }} 
        className="ml-1 text-cyan-600 hover:text-cyan-900 transition-colors p-0.5 rounded-full hover:bg-cyan-100"
        aria-label="Close"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}


