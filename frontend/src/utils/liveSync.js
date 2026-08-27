import { useEffect, useRef, useCallback } from 'react';

/**
 * Dispatches a global event indicating that data was mutated in the application.
 * @param {string} [entityType] - Optional entity name or URL that was changed.
 */
export function notifyDataChanged(entityType = 'all') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('app:data-sync', {
        detail: { entityType, timestamp: Date.now() },
      })
    );
  }
}

/**
 * Custom hook that automatically re-triggers a data fetch callback:
 * 1. When another part of the application mutates data (app:data-sync event)
 * 2. When the user returns to or focuses the window/tab
 * 3. Periodically in the background (default: every 20s if visible)
 *
 * @param {Function} refreshCallback - Async or sync function that fetches fresh data
 * @param {Object} [options]
 * @param {boolean} [options.enableSyncEvent=true] - Listen to app:data-sync
 * @param {boolean} [options.enableFocus=true] - Re-fetch on window focus / tab visibility
 * @param {number} [options.intervalMs=25000] - Polling interval in ms (0 to disable)
 * @param {Array} [options.deps=[]] - Additional dependencies to trigger refresh
 */
export function useLiveRefresh(refreshCallback, options = {}) {
  const {
    enableSyncEvent = true,
    enableFocus = true,
    intervalMs = 0,
    deps = [],
  } = options;

  const callbackRef = useRef(refreshCallback);
  const lastRunRef = useRef(0);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    callbackRef.current = refreshCallback;
  }, [refreshCallback]);

  const executeRefresh = useCallback((immediate = false) => {
    if (typeof callbackRef.current !== 'function') return;

    const now = Date.now();
    // Prevent spamming if called multiple times within 3 seconds unless immediate
    if (!immediate && now - lastRunRef.current < 3000) {
      return;
    }

    lastRunRef.current = now;
    callbackRef.current();
  }, []);

  useEffect(() => {
    // 1. Data mutation listener
    const handleDataSync = () => {
      executeRefresh(false);
    };

    // 2. Focus & Visibility listener
    const handleFocusOrVisibility = () => {
      if (document.visibilityState === 'visible') {
        executeRefresh(false);
      }
    };

    if (enableSyncEvent) {
      window.addEventListener('app:data-sync', handleDataSync);
    }

    if (enableFocus) {
      window.addEventListener('focus', handleFocusOrVisibility);
      document.addEventListener('visibilitychange', handleFocusOrVisibility);
    }

    // 3. Periodic background refresh (only while tab is visible)
    let intervalId = null;
    if (intervalMs > 0) {
      intervalId = setInterval(() => {
        if (document.visibilityState === 'visible') {
          executeRefresh(false);
        }
      }, intervalMs);
    }

    return () => {
      if (enableSyncEvent) {
        window.removeEventListener('app:data-sync', handleDataSync);
      }
      if (enableFocus) {
        window.removeEventListener('focus', handleFocusOrVisibility);
        document.removeEventListener('visibilitychange', handleFocusOrVisibility);
      }
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [enableSyncEvent, enableFocus, intervalMs, executeRefresh, ...deps]);
}
