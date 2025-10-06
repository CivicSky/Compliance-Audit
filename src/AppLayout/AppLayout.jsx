import { Outlet } from "react-router-dom";
import  Navbar  from "../components/Navigation/navbar";

const AppLayout = () => {
    return (
        <>
        <Navbar/>
        <main className="pt-20">
            <Outlet/>
        </main>
        </>
    );
};

export default AppLayout;