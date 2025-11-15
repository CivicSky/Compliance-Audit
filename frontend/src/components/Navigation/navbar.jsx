import { NavLink } from "react-router-dom";

export default function Navbar() {
    return (
        <nav className="fixed top-0 left-0 h-screen w-64 bg-blue-900 shadow-xl z-50 flex flex-col justify-between p-6">
            <div className="flex flex-col space-y-5">
                <div className="mb-6 block">
                    <span className="font-semibold text-white text-sm">
                        Compliance and Audit
                    </span>
                </div>

                {/* nav items with active highlight */}
                <NavLink
                    to="/home"
                    end
                    className={({ isActive }) =>
                        `flex items-center gap-3 py-2 px-3 rounded-md transition-colors duration-200 text-white ${
                            isActive ? 'bg-blue-800 shadow-inner' : 'hover:bg-blue-800/60'
                        }`
                    }
                >
                    <span className="w-6 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9.75L12 4l9 5.75V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.75z" />
                        </svg>
                    </span>
                    <span className="text-lg font-medium">Dashboard</span>
                </NavLink>

                <NavLink
                    to="/home/organizations"
                    className={({ isActive }) =>
                        `flex items-center gap-3 py-2 px-3 rounded-md transition-colors duration-200 text-white ${
                            isActive ? 'bg-blue-800 shadow-inner' : 'hover:bg-blue-800/60'
                        }`
                    }
                >
                    <span className="w-6 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M7 21V7a2 2 0 012-2h6a2 2 0 012 2v14" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h.01M15 10h.01M9 14h.01M15 14h.01" />
                        </svg>
                    </span>
                    <span className="text-lg font-light">Offices</span>
                </NavLink>

                <NavLink
                    to="/home/audit"
                    className={({ isActive }) =>
                        `flex items-center gap-3 py-2 px-3 rounded-md transition-colors duration-200 text-white ${
                            isActive ? 'bg-blue-800 shadow-inner' : 'hover:bg-blue-800/60'
                        }`
                    }
                >
                    <span className="w-6 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 2h6a2 2 0 012 2v0a2 2 0 01-2 2H9a2 2 0 01-2-2v0a2 2 0 012-2z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10v10a2 2 0 01-2 2H9a2 2 0 01-2-2V8z" />
                        </svg>
                    </span>
                    <span className="text-lg font-light">Audits</span>
                </NavLink>

                <NavLink
                    to="/home/requirements"
                    className={({ isActive }) =>
                        `flex items-center gap-3 py-2 px-3 rounded-md transition-colors duration-200 text-white ${
                            isActive ? 'bg-blue-800 shadow-inner' : 'hover:bg-blue-800/60'
                        }`
                    }
                >
                    <span className="w-6 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21s-8-5.686-8-10a8 8 0 1116 0c0 4.314-8 10-8 10z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11a3 3 0 100-6 3 3 0 000 6z" />
                        </svg>
                    </span>
                    <span className="text-lg font-light">Requirements</span>
                </NavLink>

                <NavLink
                    to="/home/officehead"
                    className={({ isActive }) =>
                        `flex items-center gap-3 py-2 px-3 rounded-md transition-colors duration-200 text-white ${
                            isActive ? 'bg-blue-800 shadow-inner' : 'hover:bg-blue-800/60'
                        }`
                    }
                >
                    <span className="w-6 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </span>
                    <span className="text-lg font-light">Office Heads</span>
                </NavLink>

                <NavLink
                    to="/home/Profile"
                    className={({ isActive }) =>
                        `flex items-center gap-3 py-2 px-3 rounded-md transition-colors duration-200 text-white ${
                            isActive ? 'bg-blue-800 shadow-inner' : 'hover:bg-blue-800/60'
                        }`
                    }
                >
                    <span className="w-6 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A9 9 0 0112 15a9 9 0 016.879 2.804M15 11a3 3 0 10-6 0 3 3 0 006 0z" />
                        </svg>
                    </span>
                    <span className="text-lg font-light">Profile</span>
                </NavLink>
            </div>
            <div>
                <NavLink
                    to="/"
                    className="flex items-center gap-3 py-2 px-3 text-lg font-medium text-red-300 hover:text-red-400 rounded-md transition-colors duration-200"
                >
                    <span className="w-6 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8v8" />
                        </svg>
                    </span>
                    <span>Sign out</span>
                </NavLink>
            </div>




        </nav>
    );
};

