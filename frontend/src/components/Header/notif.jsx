import React, { useEffect, useState, useRef } from 'react';
import { usersAPI } from '../../utils/api';
import NotificationPopup from '../notif/notif';

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
        const response = await fetch(`http://localhost:5000/api/notifications/user/${userId}/counts`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success && data.data && typeof data.data.unread === 'number') {
          setUnreadCount(data.data.unread);
        }
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // poll every 30s
    return () => clearInterval(interval);
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
    <div className="fixed top-0 left-0 w-full bg-white shadow z-50" style={{margin:0, borderRadius:0, height:'72px'}}>
      <div
        className="flex items-center justify-between h-full px-8"
        style={{
          marginLeft: '260px', // sidebar width
          maxWidth: '1100px',
          marginRight: 'auto',
        }}
      >
        <div className="text-2xl font-semibold text-gray-800">
          Hello{name ? `, ${name}` : ''}
        </div>
        <div className="flex items-center gap-6">
          <div className="text-lg text-gray-600 font-mono">
            {formattedDate} {formattedTime}
          </div>
          {/* Notification Bell */}
          <div className="relative">
            <button
              ref={notificationButtonRef}
              className="relative focus:outline-none bg-white rounded-md shadow-lg border border-gray-200 p-1.5 hover:shadow-2xl transition-all duration-200 flex items-center justify-center"
              onClick={() => setShowNotifications((v) => !v)}
              aria-label="Show notifications"
              style={{ boxShadow: '0 4px 16px 0 rgba(0,0,0,0.10), 0 1.5px 4px 0 rgba(0,0,0,0.08)' }}
            >
              {/* Bell Icon */}
              <svg className="w-5 h-5 text-gray-500 hover:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 15V11a6 6 0 10-12 0v4c0 .386-.146.735-.405 1.005L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] rounded-full px-1 py-0.5 min-w-[16px] text-center font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
            {/* Notification Popup */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-[420px] max-h-[560px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50">
                <NotificationPopup onClose={() => setShowNotifications(false)} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
