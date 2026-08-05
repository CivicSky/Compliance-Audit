import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Info } from 'lucide-react';

/**
 * Confirmation Dialog component.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the dialog is open
 * @param {Function} props.onConfirm - Confirm handler
 * @param {Function} props.onCancel - Cancel handler
 * @param {string} props.title - Dialog title
 * @param {string} props.message - Dialog message
 * @param {string} [props.confirmText='Confirm'] - Confirm button text
 * @param {string} [props.cancelText='Cancel'] - Cancel button text
 * @param {'danger' | 'info'} [props.variant='info'] - Dialog variant
 * @param {boolean} [props.loading=false] - Loading state for confirm button
 */
export default function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
  loading = false,
}) {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Focus the confirm button when opened
      setTimeout(() => {
        confirmRef.current?.focus();
      }, 50);
      
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onCancel();
        } else if (e.key === 'Enter') {
          if (confirmRef.current && document.activeElement !== confirmRef.current) {
            e.preventDefault();
            if (!loading) onConfirm();
          }
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onCancel, onConfirm, loading]);

  if (!isOpen || typeof document === 'undefined') return null;

  const isDanger = variant === 'danger';
  const Icon = isDanger ? AlertTriangle : Info;
  const iconColorClass = isDanger ? 'text-[var(--danger-600,#dc2626)] bg-[var(--danger-500,#ef4444)] bg-opacity-10' : 'text-[var(--info-600,#2563eb)] bg-[var(--info-500,#3b82f6)] bg-opacity-10';
  const confirmBtnClass = isDanger 
    ? 'bg-[var(--danger-600,#dc2626)] hover:bg-[var(--danger-700,#b91c1c)] text-white focus:ring-[var(--danger-500,#ef4444)]' 
    : 'bg-[var(--info-600,#2563eb)] hover:bg-[var(--info-700,#1d4ed8)] text-white focus:ring-[var(--info-500,#3b82f6)]';

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div 
        className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${iconColorClass}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 pt-1">
              <h3 id="dialog-title" className="text-lg font-semibold text-gray-900 mb-2">
                {title}
              </h3>
              <p className="text-sm text-gray-500">
                {message}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-xl border-t border-gray-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--brand-500,#3b82f6)] disabled:opacity-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center min-w-[80px] transition-colors ${confirmBtnClass}`}
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
