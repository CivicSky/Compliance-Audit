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
    <div className={`fixed top-24 right-4 z-50 w-[min(28rem,calc(100%-2rem))] max-w-full rounded-3xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-800 shadow-lg shadow-cyan-100/80 transition-all duration-300 ease-out ${isMounted ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
      <div className="font-semibold text-base text-cyan-900">{title}</div>
      <div className="mt-2 leading-6">{message}</div>
    </div>,
    document.body
  )
}
