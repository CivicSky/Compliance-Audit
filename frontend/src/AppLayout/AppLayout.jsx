import { Outlet } from "react-router-dom";
import Navbar from "../components/Navigation/navbar";

export default function AppLayout() {
    return (
        <>
            <Navbar />
            <main className="lg:pt-20 lg:ml-64 pt-28 bg-gray-50 min-h-screen relative z-10">
                <Outlet />
            </main>
        </>
    );
};

