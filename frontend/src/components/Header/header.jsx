import React, { useEffect, useState } from 'react';
import { usersAPI } from '../../utils/api';

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
        <div className="text-lg text-gray-600 font-mono">
          {formattedDate} {formattedTime}
        </div>
      </div>
    </div>
  );
}
