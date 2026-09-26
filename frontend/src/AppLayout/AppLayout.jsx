import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navigation/navbar';
import Header from '../components/Header/header';

function checkIsAdminUser(user) {
    if (!user) return false;
    const roleId = Number(user.RoleID ?? user.role_id ?? 0);
    const roleName = String(user.RoleName ?? user.role_name ?? '').toLowerCase();
    return roleId === 1 || roleName === 'admin' || roleName === 'administrator';
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
        };
        const onProfileUpdated = () => syncAdminStatus();

        window.addEventListener('storage', onStorage);
        window.addEventListener('profileUpdated', onProfileUpdated);
        return () => {
            window.removeEventListener('storage', onStorage);
            window.removeEventListener('profileUpdated', onProfileUpdated);
        };
    }, []);

    return (
        <>
            {isAdmin && (
                <Navbar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
            )}
            <main className={`pt-14 ${isAdmin ? 'lg:ml-[var(--sidebar-width)]' : 'lg:ml-0'} bg-app min-h-screen relative z-10 transition-[margin-left] duration-200`}>
                <Header onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)} isAdmin={isAdmin} />
                <div className="animate-page-enter min-h-[calc(100vh-3.5rem)] flex flex-col">
                    <Outlet />
                </div>
            </main>
        </>
    );
}

