import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navigation/navbar';
import Header from '../components/Header/header';
import { useModal } from '../components/UI/ModalProvider';

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds


export default function AppLayout() {
    const navigate = useNavigate();
    const { showAlert } = useModal();

    useEffect(() => {
        let timer;

        const handleLogout = () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            showAlert('Session expired due to inactivity. Please log in again.');
            navigate('/login', { replace: true });
        };

        const resetTimer = () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(handleLogout, INACTIVITY_TIMEOUT);
        };

        // Events that reset the inactivity timer
        const activityEvents = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];

        activityEvents.forEach((event) => {
            window.addEventListener(event, resetTimer, { passive: true });
        });

        // Initialize timer
        resetTimer();

        return () => {
            if (timer) clearTimeout(timer);
            activityEvents.forEach((event) => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [navigate, showAlert]);

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

