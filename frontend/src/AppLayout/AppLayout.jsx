import { Outlet } from "react-router-dom";
import Navbar from "../components/Navigation/navbar";

export default function AppLayout() {
    return (
        <>
            <Navbar />
            <main className="pt-20 ml-64">
                <Outlet />
            </main>
        </>
    );
};

