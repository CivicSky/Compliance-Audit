import axios from "axios";
import { NavLink } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import auditrackLogo from "../../assets/images/logo.png";
import { usersAPI } from "../../utils/api";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const profileMenuRef = useRef(null);
    const mobileMenuRef = useRef(null);
    const navigate = useNavigate();

    // Unified logout function
    const handleLogout = () => {
        localStorage.removeItem("token");
        delete axios.defaults.headers.common["Authorization"];
        navigate("/login");
    };

    // Fetch current user data
    useEffect(() => {
        const getCurrentUserData = async () => {
            try {
                const response = await usersAPI.getLoggedInUser();
                if (response.success) setCurrentUser(response.user);
            } catch (error) {
                console.error('Error fetching current user:', error);
                const storedUser = localStorage.getItem("user");
                if (storedUser) setCurrentUser(JSON.parse(storedUser));
            }
        };
        getCurrentUserData();
    }, []);

    // Listen for profile updates
    useEffect(() => {
        const handleProfileUpdated = () => {
            const getCurrentUserData = async () => {
                try {
                    const response = await usersAPI.getLoggedInUser();
                    if (response.success) setCurrentUser(response.user);
                } catch (error) {
                    console.error('Error fetching current user:', error);
                }
            };
            getCurrentUserData();
        };
        window.addEventListener('profileUpdated', handleProfileUpdated);
        return () => {
            window.removeEventListener('profileUpdated', handleProfileUpdated);
        };
    }, []);

    // Close menus on outside click
    useEffect(() => {
        function handleClickOutside(event) {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setIsProfileMenuOpen(false);
            }
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
                setIsMobileMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // NavLink style function
    const navLinkClass = ({ isActive }) =>
        `flex items-center gap-3 py-2 px-3 rounded-lg transition-colors duration-200 text-white ${isActive ? 'bg-blue-600 shadow-inner' : 'hover:bg-gray-800'}`;

    return (
        <>
            {/* Desktop Sidebar */}
            <nav className="hidden lg:flex fixed top-0 left-0 h-screen w-64 bg-gray-900 shadow-xl z-50 flex-col justify-between p-4">
                <div className="flex flex-col space-y-4">
                    {/* Logo */}
                    <div className="mb-4 flex items-center gap-3">
                        <img src={auditrackLogo} alt="Auditrack Logo" className="w-10 h-10 object-contain" />
                        <span className="font-bold text-white text-xl">Auditrack</span>
                    </div>

                    {/* Sections */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 px-3 py-1">
                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Analyze</span>
                        </div>
                        <NavLink to="/home" className={navLinkClass}>
                            <span className="w-4 text-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9.75L12 4l9 5.75V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.75z" />
                                </svg>
                            </span>
                            <span className="text-sm font-medium">Dashboard</span>
                        </NavLink>
                    </div>

                    {/* Management */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 px-3 py-1">
                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Management</span>
                        </div>

                        <NavLink to="/home/organizations" className={navLinkClass}>Offices</NavLink>
                        <NavLink to="/home/requirements" className={navLinkClass}>Requirements</NavLink>
                        <NavLink to="/home/events" className={navLinkClass}>Events</NavLink>
                        <NavLink to="/home/criteria" className={navLinkClass}>Criteria</NavLink>
                        <NavLink to="/home/area" className={navLinkClass}>Area</NavLink>
                    </div>

                    {/* Users */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 px-3 py-1">
                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Users</span>
                        </div>
                        <NavLink to="/home/officehead" className={navLinkClass}>Office Heads</NavLink>
                        <NavLink to="/home/users" className={navLinkClass}>Users</NavLink>
                    </div>

                    {/* Logs */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 px-3 py-1">
                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Logs</span>
                        </div>
                        <NavLink to="/home/audit-logs" className={navLinkClass}>Audit Logs</NavLink>
                    </div>
                </div>

                {/* Profile Menu */}
                <div className="relative border-t border-gray-700 pt-3" ref={profileMenuRef}>
                    <div className="flex items-center justify-between p-2 hover:bg-gray-800 rounded-lg transition-colors duration-200">
                        <NavLink to="/home/Profile" className="flex items-center gap-3 flex-1">
                            <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden">
                                {currentUser && currentUser.ProfilePic ? (
                                    <img
                                        src={`http://localhost:5000/uploads/profile-pics/${currentUser.ProfilePic}`}
                                        alt="Profile"
                                        className="w-7 h-7 object-cover rounded-full"
                                        onError={e => { e.target.onerror = null; e.target.src = '/default-avatar.png'; }}
                                    />
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                )}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-medium text-white">
                                    {currentUser
                                        ? `${currentUser.FirstName}${currentUser.MiddleInitial ? ' ' + currentUser.MiddleInitial + '.' : ''} ${currentUser.LastName}`
                                        : 'Loading...'}
                                </span>
                                <span className="text-[10px] text-gray-400">View Profile</span>
                            </div>
                        </NavLink>

                        <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="p-1 rounded-md hover:bg-gray-700 transition-colors duration-200">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                        </button>
                    </div>

                    {isProfileMenuOpen && (
                        <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1">
                            <button
                                onClick={handleLogout}
                                className="flex w-full items-center gap-3 px-3 py-2 text-xs text-red-300 hover:text-red-400 hover:bg-gray-700 transition-colors duration-200"
                            >
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </nav>

            {/* Mobile Navigation */}
            <div className="lg:hidden">
                <nav className="fixed top-0 left-0 right-0 bg-gray-900 shadow-xl z-50 p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img src={auditrackLogo} alt="Auditrack Logo" className="w-8 h-8 object-contain" />
                            <span className="font-bold text-white text-lg">Auditrack</span>
                        </div>
                        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 rounded-md text-white hover:bg-gray-800 transition-colors duration-200">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {isMobileMenuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>
                </nav>

                {/* Mobile Menu Overlay */}
                {isMobileMenuOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setIsMobileMenuOpen(false)}></div>}

                {/* Mobile Sidebar */}
                <div ref={mobileMenuRef} className={`fixed top-0 left-0 h-screen w-80 bg-gray-900 shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col justify-between p-4`}>
                    <div className="flex flex-col space-y-4 mt-16">
                        {/* Add mobile NavLinks here using the same `navLinkClass` and closing mobile menu onClick */}
                        {/* ... same sections as desktop, just add `onClick={() => setIsMobileMenuOpen(false)}` to each NavLink */}
                    </div>

                    {/* Mobile Profile Section */}
                    <div className="relative border-t border-gray-700 pt-3">
                        <div className="flex items-center justify-between p-2 hover:bg-gray-800 rounded-lg transition-colors duration-200">
                            <NavLink to="/home/Profile" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 flex-1">
                                <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-medium text-white">{currentUser ? currentUser.FullName : 'Loading...'}</span>
                                    <span className="text-[10px] text-gray-400">{currentUser && currentUser.RoleName ? currentUser.RoleName : 'View Profile'}</span>
                                </div>
                            </NavLink>

                            {/* 🔥 Mobile Logout */}
                            <button onClick={handleLogout} className="p-2 rounded-md text-red-300 hover:text-red-400 hover:bg-gray-800 transition-colors duration-200">
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
