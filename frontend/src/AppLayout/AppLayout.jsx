import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navigation/navbar';
import Header from '../components/Header/header';

export default function AppLayout() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <>
            <Navbar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
            <main className="pt-14 lg:ml-[var(--sidebar-width)] bg-app min-h-screen relative z-10 transition-[margin-left] duration-200">
                <Header onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)} />
                <div className="animate-page-enter min-h-[calc(100vh-3.5rem)] flex flex-col">
                    <Outlet />
                </div>
            </main>
        </>
    );
}

