import { Outlet } from "react-router-dom";
import Navbar from "../components/Navigation/navbar";

export default function AppLayout() {
    return (
        <>
            <Navbar />
            <main className="page-content lg:pt-16 lg:ml-[var(--sidebar-width)] pt-24 bg-gray-100 min-h-screen relative z-10 transition-[margin-left] duration-200">
                <Outlet />
            </main>
        </>
    );
};

