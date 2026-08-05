import React, { createContext, useContext, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useToast } from './Toast'

const ModalContext = createContext(null)

export function ModalProvider({ children }) {
  const [modal, setModal] = useState({ open: false })
  const { toast } = useToast()

  const showAlert = useCallback((message, title = 'Notice') => {
    toast({ title, description: message, variant: 'info', duration: 1500 })
    return Promise.resolve(true)
  }, [toast])

  const showConfirm = useCallback((message, title = 'Confirm') => {
    return new Promise((resolve) => {
      setModal({
        open: true,
        type: 'confirm',
        title,
        message,
        onConfirm: () => {
          setModal({ open: false })
          resolve(true)
        },
        onCancel: () => {
          setModal({ open: false })
          resolve(false)
        },
      })
    })
  }, [])

  const value = {
    showAlert,
    showConfirm,
  }

  return (
    <ModalContext.Provider value={value}>
      {children}
      {modal.open && <ModalRoot {...modal} />}
    </ModalContext.Provider>
  )
}

export function useModal() {
  const ctx = useContext(ModalContext)
  if (!ctx) throw new Error('useModal must be used within ModalProvider')
  return ctx
}

function ModalRoot({ type, title, message, onConfirm, onCancel }) {
  if (type === 'alert') return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg w-96 max-w-full p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <div className="mb-6 text-sm text-gray-700">{message}</div>
        <div className="flex justify-end space-x-3">
          {type === 'confirm' && (
            <button
              className="px-4 py-2 rounded bg-red-50 text-red-700 hover:bg-red-100"
              onClick={onCancel}
            >
              Cancel
            </button>
          )}
          <button
            className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
            onClick={onConfirm}
          >
            OK
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default ModalProvider
