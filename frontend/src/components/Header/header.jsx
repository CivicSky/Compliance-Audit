import React, { useEffect, useState, useRef } from 'react';
import { Bell, Menu } from 'lucide-react';
import { usersAPI } from '../../utils/api';
import NotificationPopup from '../notif/notif';
import { API_BASE_URL } from '../../utils/apiBase';
import { toggleMobileNavbar } from '../Navigation/navbar';

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

function readStoredUserRole() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return '';
    const u = JSON.parse(raw);
    if (u.RoleName) return u.RoleName;
    const roleId = Number(u.RoleID);
    if (roleId === 1) return 'Administrator';
    if (roleId === 4) return 'Auditor';
    if (roleId === 3) return 'Office Head';
    if (roleId === 2) return 'Staff';
    return '';
  } catch {
    return '';
  }
}

export default function Header({ onToggleMobileMenu }) {
  const [dateTime, setDateTime] = useState(new Date());
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationWrapperRef = useRef(null);

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notificationWrapperRef.current && !notificationWrapperRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  // Fetch unread count
  useEffect(() => {
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
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          const unread = Number(data?.data?.unread ?? data?.unread ?? 0);
          setUnreadCount(Number.isFinite(unread) ? unread : 0);
        }
      } catch (err) {
        // silent fail
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);

    const onNotificationsUpdated = () => fetchUnread();
    window.addEventListener('notificationsUpdated', onNotificationsUpdated);
    window.addEventListener('app:data-sync', onNotificationsUpdated);
    return () => {
      clearInterval(interval);
      window.removeEventListener('notificationsUpdated', onNotificationsUpdated);
      window.removeEventListener('app:data-sync', onNotificationsUpdated);
    };
  }, []);

  // User profile and clock sync
  useEffect(() => {
    setName(readStoredDisplayName());
    setRole(readStoredUserRole());

    const refreshFromServer = async () => {
      try {
        const response = await usersAPI.getLoggedInUser();
        if (response.success && response.user) {
          const n = displayNameFromUser(response.user);
          if (n) setName(n);
          if (response.user.RoleName) setRole(response.user.RoleName);
        }
      } catch {
        setName(readStoredDisplayName());
        setRole(readStoredUserRole());
      }
    };
    refreshFromServer();

    const onProfileUpdated = () => refreshFromServer();
    const onStorage = (e) => {
      if (e.key === 'user' || e.key === 'name') {
        setName(readStoredDisplayName());
        setRole(readStoredUserRole());
      }
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

  // Calm, human-friendly date & time formatting
  const formattedDate = dateTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = dateTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <header
      className="fixed top-0 left-0 w-full z-40 lg:left-[var(--sidebar-width)] lg:w-[calc(100%-var(--sidebar-width))] transition-[left,width] duration-200"
      style={{ height: '56px' }}
    >
      <div className="flex items-center justify-between h-full px-4 sm:px-6 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        {/* Left Side: Mobile Hamburger Menu + Human Context & Greeting */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleMobileMenu) {
                onToggleMobileMenu();
              } else {
                toggleMobileNavbar();
              }
            }}
            className="lg:hidden p-1.5 -ml-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 shrink-0 cursor-pointer"
            aria-label="Open navigation menu"
            title="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Clean User Identity Breadcrumb */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-slate-400 hidden sm:inline select-none tracking-wide uppercase">
              Auditrack
            </span>
            <span className="text-slate-300 hidden sm:inline select-none">/</span>
            <span className="text-sm font-semibold text-slate-800 truncate">
              {name ? `Hello, ${name}` : 'Welcome'}
            </span>
            {role && (
              <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase bg-slate-100 text-slate-600 border border-slate-200/80 select-none">
                {role}
              </span>
            )}
          </div>
        </div>

        {/* Right Side: Neutral Date/Time Pill + Refined Notification Bell */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Human-formatted Live Date/Time */}
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50/80 border border-slate-200/70 text-xs text-slate-600 font-medium select-none shadow-2xs">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]" title="Connected" />
            <span className="text-slate-700 font-semibold">{formattedDate}</span>
            <span className="text-slate-300 font-light">·</span>
            <span className="text-slate-500 font-medium">{formattedTime}</span>
          </div>

          {/* Notification Bell */}
          <div className="relative" ref={notificationWrapperRef}>
            <button
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200/90 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-300"
              onClick={() => setShowNotifications((v) => !v)}
              aria-label="Show notifications"
              title={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'Notifications'}
            >
              <Bell className="w-[18px] h-[18px] text-slate-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white ring-2 ring-white shadow-xs pointer-events-none select-none leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Popup */}
            {showNotifications && (
              <div className="absolute right-0 z-50 mt-2 flex w-[360px] sm:w-[390px] max-h-[min(540px,calc(100vh-5.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xl animate-in fade-in zoom-in-95 duration-100">
                <NotificationPopup onClose={() => setShowNotifications(false)} />
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
