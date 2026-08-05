import React, { useEffect, useState, useRef } from 'react';
import { usersAPI } from '../../utils/api';
import NotificationPopup from '../notif/notif';
import { API_BASE_URL } from '../../utils/apiBase';

function displayNameFromUser(user) {
  if (!user || typeof user !== 'object') return '';
  if (user.FullName && String(user.FullName).trim()) return String(user.FullName).trim();
  const { FirstName, MiddleInitial, LastName } = user;
  if (!FirstName && !LastName) return '';
  const mid = MiddleInitial ? ` ${MiddleInitial}.` : '';
  return `${FirstName || ''}${mid} ${LastName || ''}`.replace(/\s+/g, ' ').trim();
}

function readStoredDisplayName() {
  const legacy = localStorage.getItem('name');
  if (legacy && legacy.trim()) return legacy.trim();
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return '';
    return displayNameFromUser(JSON.parse(raw));
  } catch {
    return '';
  }
}

export default function Header() {
  const [dateTime, setDateTime] = useState(new Date());
  const [name, setName] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationButtonRef = useRef(null);
  // Fetch unread count from NotificationPopup logic
  useEffect(() => {
    // Get current user from localStorage
    const token = localStorage.getItem('token');
    let userId = null;
    if (token) {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          userId = JSON.parse(userData).UserID;
        } catch {}
      }
    }
    if (!userId) return;
    const fetchUnread = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/notifications/user/${userId}/counts`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (data && data.success && data.data) {
          const unread = Number(data.data.unread);
          setUnreadCount(Number.isFinite(unread) ? unread : 0);
        }
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // poll every 30s

    const onNotificationsUpdated = () => {
      fetchUnread();
    };

    window.addEventListener('notificationsUpdated', onNotificationsUpdated);
    return () => {
      clearInterval(interval);
      window.removeEventListener('notificationsUpdated', onNotificationsUpdated);
    };
  }, []);

  useEffect(() => {
    setName(readStoredDisplayName());

    const refreshFromServer = async () => {
      try {
        const response = await usersAPI.getLoggedInUser();
        if (response.success && response.user) {
          const n = displayNameFromUser(response.user);
          if (n) setName(n);
        }
      } catch {
        setName(readStoredDisplayName());
      }
    };
    refreshFromServer();

    const onProfileUpdated = () => {
      refreshFromServer();
    };
    const onStorage = (e) => {
      if (e.key === 'user' || e.key === 'name') setName(readStoredDisplayName());
    };
    window.addEventListener('profileUpdated', onProfileUpdated);
    window.addEventListener('storage', onStorage);

    const timer = setInterval(() => {
      setDateTime(new Date());
    }, 1000);
    return () => {
      clearInterval(timer);
      window.removeEventListener('profileUpdated', onProfileUpdated);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const formattedDate = dateTime.toLocaleDateString();
  const formattedTime = dateTime.toLocaleTimeString();

  return (
    <div
      className="fixed top-16 left-0 w-full z-40 lg:top-0 lg:ml-[var(--sidebar-width)] lg:w-[calc(100%-var(--sidebar-width))]"
      style={{ margin: 0, borderRadius: 0, height: '56px' }}
    >
      {/* Blue-tinted glass header bar */}
      <div
        className="flex items-center justify-between h-full px-5 w-full lg:w-[calc(100%-var(--sidebar-width))] lg:ml-[var(--sidebar-width)] transition-[margin-left,width] duration-200"
        style={{
          background: 'linear-gradient(90deg, #ffffff 0%, #f0f5ff 100%)',
          borderBottom: '1px solid #dbeafe',
          boxShadow: '0 1px 8px rgba(37,99,235,0.08)',
        }}
      >
        {/* Greeting */}
        <div className="flex items-center gap-3">
          <div className="h-7 w-1 rounded-full" style={{ background: 'linear-gradient(180deg, #2563eb, #60a5fa)' }} />
          <div className="text-base font-semibold" style={{ color: '#1e3a8a' }}>
            Hello{name ? `, ${name}` : ''}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <div className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ color: '#475569', background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
            {formattedDate} · {formattedTime}
          </div>

          {/* Notification Bell */}
          <div className="relative">
            <button
              ref={notificationButtonRef}
              className="relative focus:outline-none rounded-lg p-1.5 transition-all duration-200 flex items-center justify-center"
              onClick={() => setShowNotifications((v) => !v)}
              aria-label="Show notifications"
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                boxShadow: '0 1px 4px rgba(37,99,235,0.12)',
              }}
            >
              {/* Bell Icon */}
              <svg className="w-4.5 h-4.5" style={{ color: '#2563eb', width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 15V11a6 6 0 10-12 0v4c0 .386-.146.735-.405 1.005L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] rounded-full px-1 py-0.5 min-w-[16px] text-center font-bold">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            {/* Notification Popup */}
            {showNotifications && (
              <div className="absolute right-0 z-50 mt-2 flex w-[420px] max-h-[min(560px,calc(100vh-5.5rem))] flex-col overflow-hidden rounded-xl border border-blue-100 bg-white shadow-2xl">
                <NotificationPopup onClose={() => setShowNotifications(false)} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
