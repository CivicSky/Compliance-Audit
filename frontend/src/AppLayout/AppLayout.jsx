import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navigation/navbar';
import Header from '../components/Header/header';
import { useModal } from '../components/UI/ModalProvider';

export default function AppLayout() {
    return (
        <>
            <Navbar />
            <main className="lg:pt-10 lg:ml-[var(--sidebar-width)] pt-[120px] bg-app min-h-screen relative z-10 transition-[margin-left] duration-200">
                <Header />
                <div className="animate-page-enter">
                    <Outlet />
                </div>
            </main>
        </>
    );
}

