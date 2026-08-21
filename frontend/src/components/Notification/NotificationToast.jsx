import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export default function NotificationToast({ title = 'Notice', message = '', visible = false, duration = 1500, onDismiss }) {

  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    if (!visible) {
      setIsMounted(false)
      return
    }

    const enterDelay = 10
    const exitDelay = enterDelay + duration
    const exitTransition = 220

    const enterTimer = window.setTimeout(() => setIsMounted(true), enterDelay)
    const exitTimer = window.setTimeout(() => setIsMounted(false), exitDelay)
    const removeTimer = window.setTimeout(() => {
      onDismiss?.()
    }, exitDelay + exitTransition)

    return () => {
      window.clearTimeout(enterTimer)
      window.clearTimeout(exitTimer)
      window.clearTimeout(removeTimer)
    }
  }, [visible, duration, onDismiss])

  if (!visible && !isMounted) return null

  return createPortal(
    <div className={`fixed top-20 right-4 z-[20011] inline-flex items-center gap-2.5 max-w-full rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm text-cyan-800 shadow-md shadow-cyan-100/80 transition-all duration-300 ease-out ${isMounted ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
      <span className="font-semibold text-cyan-900 whitespace-nowrap">{title}:</span>
      <span className="text-cyan-800">{message}</span>
    </div>,
    document.body
  )
}

