import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navigation/navbar';
import Header from '../components/Header/header';
import { socket } from '../utils/socket';
import { dataCache } from '../utils/dataCache';

function getCurrentTokenSid() {
    try {
        const storedSid = localStorage.getItem('sessionId');
        if (storedSid) return storedSid;
        const token = localStorage.getItem('token');
        if (!token) return null;
        const payloadPart = token.split('.')[1];
        if (!payloadPart) return null;
        const decoded = JSON.parse(atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/')));
        return decoded?.sid || null;
    } catch {
        return null;
    }
}

function getCurrentUserId() {
    try {
        const raw = localStorage.getItem('user');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return Number(parsed?.userid ?? parsed?.UserID ?? parsed?.id ?? 0) || null;
    } catch {
        return null;
    }
}

function checkIsAdminUser(user) {
    if (!user) return false;
    const roleid = Number(user.roleid ?? user.roleid ?? 0);
    const rolename = String(user.rolename ?? user.rolename ?? '').toLowerCase();
    return roleid === 1 || rolename === 'admin' || rolename === 'administrator';
}

function getStoredIsAdmin() {
    try {
        const raw = localStorage.getItem('user');
        if (!raw) return false;
        return checkIsAdminUser(JSON.parse(raw));
    } catch {
        return false;
    }
}

export default function AppLayout() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isAdmin, setIsAdmin] = useState(getStoredIsAdmin);

    useEffect(() => {
        const syncAdminStatus = () => {
            const adminStatus = getStoredIsAdmin();
            setIsAdmin(adminStatus);
            if (typeof document !== 'undefined') {
                document.documentElement.style.setProperty(
                    '--sidebar-width',
                    adminStatus ? 'calc(4rem / 0.9)' : '0px'
                );
            }
        };

        syncAdminStatus();

        const onStorage = (e) => {
            if (e.key === 'user') syncAdminStatus();
            if (e.key === 'token' && !e.newValue && window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        };
        const onProfileUpdated = () => syncAdminStatus();

        const onSessionReplaced = (payload) => {
            const myUserId = getCurrentUserId();
            if (!myUserId || Number(payload?.userid) !== myUserId) return;

            const mySid = getCurrentTokenSid();
            if (payload?.newSid && mySid !== payload.newSid) {
                try {
                    sessionStorage.setItem(
                        'sessionReplacedMessage',
                        'Your session has ended because your account was signed in on another browser or device.'
                    );
                } catch {}
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('sessionId');
                try { dataCache.clear(); } catch {}
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }
        };

        window.addEventListener('storage', onStorage);
        window.addEventListener('profileUpdated', onProfileUpdated);
        socket.on('session_replaced', onSessionReplaced);
        return () => {
            window.removeEventListener('storage', onStorage);
            window.removeEventListener('profileUpdated', onProfileUpdated);
            socket.off('session_replaced', onSessionReplaced);
        };
    }, []);

    return (
        <>
            {isAdmin && (
                <Navbar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
            )}
            <main className={`pt-14 ${isAdmin ? 'lg:ml-[var(--sidebar-width)]' : 'lg:ml-0'} bg-app min-h-screen relative z-10 transition-[margin-left] duration-200 flex flex-col`}>
                <Header onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)} isAdmin={isAdmin} />
                <div className="animate-page-enter min-h-[calc(100vh-3.5rem)] flex-1 flex flex-col">
                    <Outlet />
                </div>
            </main>
        </>
    );
}

