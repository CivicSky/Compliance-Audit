import { Outlet } from "react-router-dom";
import Navbar from "../components/Navigation/navbar";

export default function AppLayout() {
    return (
        <>
            <Navbar />
            <main className="page-content lg:pt-16 lg:ml-64 pt-24 bg-gray-50 min-h-screen relative z-10">
                <Outlet />
            </main>
        </>
    );
};

