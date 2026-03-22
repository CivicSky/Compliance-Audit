import axios from "axios";
import { NavLink } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import auditrackLogo from "../../assets/images/logo.png";
import { usersAPI } from "../../utils/api";
import { useNavigate } from "react-router-dom";
import NotificationPopup from "../notif/notif";

export default function Navbar() {
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const profileMenuRef = useRef(null);
    const mobileMenuRef = useRef(null);
    const notificationRef = useRef(null);
    const notificationPopupRef = useRef(null);
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

    // Fetch notification counts
    useEffect(() => {
        if (currentUser && currentUser.UserID) {
            fetchNotificationCounts();
            // Refresh counts every 30 seconds
            const interval = setInterval(fetchNotificationCounts, 30000);
            return () => clearInterval(interval);
        }
    }, [currentUser]);

    const fetchNotificationCounts = async () => {
        if (!currentUser || !currentUser.UserID) return;
        
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `http://localhost:5000/api/notifications/user/${currentUser.UserID}/counts`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            
            if (response.data.success) {
                setUnreadCount(response.data.data.unread || 0);
            }
        } catch (error) {
            console.error('Error fetching notification counts:', error);
        }
    };

    // Close menus on outside click
    useEffect(() => {
        function handleClickOutside(event) {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setIsProfileMenuOpen(false);
            }
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
                setIsMobileMenuOpen(false);
            }
            if (notificationRef.current && !notificationRef.current.contains(event.target) && 
                notificationPopupRef.current && !notificationPopupRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // NavLink style function
    const navLinkClass = ({ isActive }) =>
        `flex items-center gap-2 py-2.5 px-3 rounded-lg transition-colors duration-200 text-white text-xs font-medium ${isActive ? 'bg-blue-600 shadow-inner' : 'hover:bg-gray-800'}`;

    return (
        <>
            {/* Desktop Sidebar */}
            <nav className="hidden lg:flex fixed top-0 left-0 h-screen w-64 bg-gray-900 shadow-xl z-50 flex-col justify-between p-4">
                <div className="flex flex-col space-y-2">
                    {/* Logo */}
                    <div className="mb-2 flex items-center gap-2">
                        <img src={auditrackLogo} alt="Auditrack Logo" className="w-8 h-8 object-contain" />
                        <span className="font-bold text-white text-base">Auditrack</span>
                    </div>

                    {/* Sections */}
                    {currentUser && currentUser.RoleID === 1 && (
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 px-3 py-0.5">
                                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Analyze</span>
                            </div>
                            <NavLink to="/home" className={navLinkClass}>
                                <span className="w-4 text-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9.75L12 4l9 5.75V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.75z" />
                                    </svg>
                                </span>
                                <span className="text-xs font-medium">Dashboard</span>
                            </NavLink>
                        </div>
                    )}

                {/* Management Section */}
                <div className="space-y-1">
                    <div className="flex items-center gap-2 px-3 py-0.5">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Management</span>
                    </div>
                    
                    {/* Reordered: Events > ALLC > (Area, Criteria, Requirements commented) > Offices */}
                    <NavLink
                        to="/home/setup"
                        className={({ isActive }) =>
                            `flex items-center gap-2 py-2.5 px-3 rounded-lg transition-colors duration-200 text-white ${
                                isActive ? 'bg-blue-600 shadow-inner' : 'hover:bg-gray-800'
                            }`
                        }
                    >
                        <span className="w-4 text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                            </svg>
                        </span>
                        <span className="text-xs font-medium">Setup</span>
                    </NavLink>

                    <NavLink
                        to="/home/events"
                        onClick={(e) => {
                            if (window.location.pathname === '/home/officehead') {
                                e.preventDefault();
                                window.location.href = '/home/events';
                            }
                        }}
                        className={({ isActive }) =>
                            `flex items-center gap-2 py-2.5 px-3 rounded-lg transition-colors duration-200 text-white ${
                                isActive ? 'bg-blue-600 shadow-inner' : 'hover:bg-gray-800'
                            }`
                        }
                    >
                        <span className="w-4 text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </span>
                        <span className="text-xs font-medium">Events</span>
                    </NavLink>

             
                    <NavLink
                        to="/home/allc"
                        className={({ isActive }) =>
                            `flex items-center gap-2 py-2.5 px-3 rounded-lg transition-colors duration-200 text-white ${
                                isActive ? 'bg-blue-600 shadow-inner' : 'hover:bg-gray-800'
                            }`
                        }
                    >
                        <span className="w-4 text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8M12 8v8" />
                            </svg>
                        </span>
                        <span className="text-xs font-medium">ALLC</span>
                    </NavLink>

                    {/* Area — hidden from nav (restore by uncommenting)
                    <NavLink
                        to="/home/area"
                        className={({ isActive }) =>
                            `flex items-center gap-2 py-2.5 px-3 rounded-lg transition-colors duration-200 text-white ${
                                isActive ? 'bg-blue-600 shadow-inner' : 'hover:bg-gray-800'
                            }`
                        }
                    >
                        <span className="w-4 text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8M12 8v8" />
                            </svg>
                        </span>
                        <span className="text-xs font-medium">Area</span>
                    </NavLink>

                    <NavLink
                        to="/home/criteria"
                        onClick={(e) => {
                            if (window.location.pathname === '/home/officehead') {
                                e.preventDefault();
                                window.location.href = '/home/criteria';
                            }
                        }}
                        className={({ isActive }) =>
                            `flex items-center gap-2 py-2.5 px-3 rounded-lg transition-colors duration-200 text-white ${
                                isActive ? 'bg-blue-600 shadow-inner' : 'hover:bg-gray-800'
                            }`
                        }
                    >
                        <span className="w-4 text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                        </span>
                        <span className="text-xs font-medium">Criteria</span>
                    </NavLink>

                    <NavLink
                        to="/home/requirements"
                        onClick={(e) => {
                            if (window.location.pathname === '/home/officehead') {
                                e.preventDefault();
                                window.location.href = '/home/requirements';
                            }
                        }}
                        className={({ isActive }) =>
                            `flex items-center gap-2 py-2.5 px-3 rounded-lg transition-colors duration-200 text-white ${
                                isActive ? 'bg-blue-600 shadow-inner' : 'hover:bg-gray-800'
                            }`
                        }
                    >
                        <span className="w-4 text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </span>
                        <span className="text-xs font-medium">Requirements</span>
                    </NavLink>
                    */}
                                        <NavLink
                        to="/home/organizations"
                        onClick={(e) => {
                            if (window.location.pathname === '/home/officehead') {
                                e.preventDefault();
                                window.location.href = '/home/organizations';
                            }
                        }}
                        className={({ isActive }) =>
                            `flex items-center gap-2 py-2.5 px-3 rounded-lg transition-colors duration-200 text-white ${
                                isActive ? 'bg-blue-600 shadow-inner' : 'hover:bg-gray-800'
                            }`
                        }
                    >
                        <span className="w-4 text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M7 21V7a2 2 0 012-2h6a2 2 0 012 2v14" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h.01M15 10h.01M9 14h.01M15 14h.01" />
                            </svg>
                        </span>
                        <span className="text-xs font-medium">Offices</span>
                    </NavLink>
                </div>

                    {/* Users */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 px-3 py-0.5">
                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Users</span>
                        </div>
                        {currentUser && currentUser.RoleID === 1 && (
                            <NavLink to="/home/officehead" className={navLinkClass}>Office Personnel</NavLink>
                        )}
                        {currentUser && currentUser.RoleID === 1 && (
                            <NavLink to="/home/users" className={navLinkClass}>Users</NavLink>
                        )}
                    </div>

                    {/* Logs */}
                    {currentUser && currentUser.RoleID === 1 && (
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 px-3 py-0.5">
                                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Logs</span>
                            </div>
                            <NavLink to="/home/audit-logs" className={navLinkClass}>Audit Logs</NavLink>
                        </div>
                    )}
                </div>

                {/* Notifications */}
                <div className="relative mb-3" ref={notificationRef}>
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors duration-200 text-white hover:bg-gray-800 relative"
                    >
                        <div className="w-4 text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM10.586 17H7a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2v5.586l-4 4H10.586z" />
                            </svg>
                        </div>
                        <span className="text-xs font-medium">Notifications</span>
                        {unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center ml-auto">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* Profile Menu */}
                <div className="relative border-t border-gray-700 pt-2" ref={profileMenuRef}>
                    <div className="flex items-center justify-between p-1.5 hover:bg-gray-800 rounded-lg transition-colors duration-200">
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
                                <span className="text-[11px] font-medium text-white">
                                    {currentUser
                                        ? `${currentUser.FirstName}${currentUser.MiddleInitial ? ' ' + currentUser.MiddleInitial + '.' : ''} ${currentUser.LastName}`
                                        : 'Loading...'}
                                </span>
                                <span className="text-[9px] text-gray-400">View Profile</span>
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

                    {/* Mobile Notifications */}
                    <div className="mb-3">
                        <button
                            onClick={() => {
                                setShowNotifications(!showNotifications);
                                setIsMobileMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors duration-200 text-white hover:bg-gray-800 relative"
                        >
                            <div className="w-4 text-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM10.586 17H7a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2v5.586l-4 4H10.586z" />
                                </svg>
                            </div>
                            <span className="text-xs font-medium">Notifications</span>
                            {unreadCount > 0 && (
                                <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center ml-auto">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </button>
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

            {/* Notification Overlay */}
            {showNotifications && (
                <div 
                    ref={notificationPopupRef}
                    className="fixed top-4 left-72 w-[420px] h-[560px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50"
                >
                    <NotificationPopup onClose={() => setShowNotifications(false)} />
                </div>
            )}

            {/* Mobile Notification Popup Modal */}
            {showNotifications && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="fixed inset-0 bg-black/50" onClick={() => setShowNotifications(false)}></div>
                    <div className="fixed inset-x-4 top-20 bottom-4 bg-white rounded-xl shadow-2xl overflow-hidden">
                        <NotificationPopup onClose={() => setShowNotifications(false)} />
                    </div>
                </div>
            )}
        </>
    );
};
