import { NavLink } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import auditrackLogo from "../../assets/images/logo.png";
import { usersAPI } from "../../utils/api";

export default function Navbar() {
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const profileMenuRef = useRef(null);
    const mobileMenuRef = useRef(null);

    // Get current user from localStorage and fetch full user data
    useEffect(() => {
        const getCurrentUserData = async () => {
            try {
                const storedUser = localStorage.getItem("user");
                if (storedUser) {
                    const user = JSON.parse(storedUser);
                    console.log('Stored user from localStorage:', user);
                    
                    // Fetch current user data from API to ensure it's up to date
                    if (user.Email) {
                        const response = await usersAPI.getCurrentUser(user.Email);
                        if (response.success) {
                            setCurrentUser(response.user);
                            console.log('Current user updated:', response.user);
                        }
                    } else {
                        // If no email in stored user, use what we have
                        setCurrentUser(user);
                    }
                }
            } catch (error) {
                console.error('Error fetching current user:', error);
                // Fallback to stored user if API call fails
                const storedUser = localStorage.getItem("user");
                if (storedUser) {
                    setCurrentUser(JSON.parse(storedUser));
                }
            }
        };

        getCurrentUserData();
    }, []);

    // Close menu when clicking outside
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

    return (
        <>
            {/* Desktop Sidebar Navigation */}
            <nav className="hidden lg:flex fixed top-0 left-0 h-screen w-64 bg-gray-900 shadow-xl z-50 flex-col justify-between p-4">
            <div className="flex flex-col space-y-4">
                {/* Logo Section */}
                <div className="mb-4 flex items-center gap-3">
                    <img
                        src={auditrackLogo}
                        alt="Auditrack Logo"
                        className="w-10 h-10 object-contain"
                    />
                    <span className="font-bold text-white text-xl">
                        Auditrack
                    </span>
                </div>

                {/* Dashboard Section */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 px-3 py-1">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Analyze</span>
                    </div>
                    
                    <NavLink
                        to="/home"
                        end
                        onClick={(e) => {
                            // Force navigation if React Router seems blocked
                            if (window.location.pathname === '/home/officehead') {
                                e.preventDefault();
                                window.location.href = '/home';
                            }
                        }}
                        className={({ isActive }) =>
                            `flex items-center gap-3 py-2 px-3 rounded-lg transition-colors duration-200 text-white ${
                                isActive ? 'bg-blue-600 shadow-inner' : 'hover:bg-gray-800'
                            }`
                        }
                    >
                        <span className="w-4 text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9.75L12 4l9 5.75V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.75z" />
                            </svg>
                        </span>
                        <span className="text-sm font-medium">Dashboard</span>
                    </NavLink>
                </div>

                {/* Management Section */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 px-3 py-1">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Management</span>
                    </div>
                    
                    <NavLink
                        to="/home/organizations"
                        onClick={(e) => {
                            // Force navigation if React Router seems blocked
                            if (window.location.pathname === '/home/officehead') {
                                e.preventDefault();
                                window.location.href = '/home/organizations';
                            }
                        }}
                        className={({ isActive }) =>
                            `flex items-center gap-3 py-2 px-3 rounded-lg transition-colors duration-200 text-white ${
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
                        <span className="text-sm font-medium">Offices</span>
                    </NavLink>

                    <NavLink
                        to="/home/requirements"
                        onClick={(e) => {
                            // Force navigation if React Router seems blocked
                            if (window.location.pathname === '/home/officehead') {
                                e.preventDefault();
                                window.location.href = '/home/requirements';
                            }
                        }}
                        className={({ isActive }) =>
                            `flex items-center gap-3 py-2 px-3 rounded-lg transition-colors duration-200 text-white ${
                                isActive ? 'bg-blue-600 shadow-inner' : 'hover:bg-gray-800'
                            }`
                        }
                    >
                        <span className="w-4 text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </span>
                        <span className="text-sm font-medium">Requirements</span>
                    </NavLink>

                    <NavLink
                        to="/home/events"
                        onClick={(e) => {
                            // Force navigation if React Router seems blocked
                            if (window.location.pathname === '/home/officehead') {
                                e.preventDefault();
                                window.location.href = '/home/events';
                            }
                        }}
                        className={({ isActive }) =>
                            `flex items-center gap-3 py-2 px-3 rounded-lg transition-colors duration-200 text-white ${
                                isActive ? 'bg-blue-600 shadow-inner' : 'hover:bg-gray-800'
                            }`
                        }
                    >
                        <span className="w-4 text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </span>
                        <span className="text-sm font-medium">Events</span>
                    </NavLink>

                    <NavLink
                        to="/home/criteria"
                        onClick={(e) => {
                            // Force navigation if React Router seems blocked
                            if (window.location.pathname === '/home/officehead') {
                                e.preventDefault();
                                window.location.href = '/home/criteria';
                            }
                        }}
                        className={({ isActive }) =>
                            `flex items-center gap-3 py-2 px-3 rounded-lg transition-colors duration-200 text-white ${
                                isActive ? 'bg-blue-600 shadow-inner' : 'hover:bg-gray-800'
                            }`
                        }
                    >
                        <span className="w-4 text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                        </span>
                        <span className="text-sm font-medium">Criteria</span>
                    </NavLink>
                </div>

                {/* Users Section */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 px-3 py-1">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Users</span>
                    </div>
                    
                    <NavLink
                        to="/home/officehead"
                        className={({ isActive }) =>
                            `flex items-center gap-3 py-2 px-3 rounded-lg transition-colors duration-200 text-white ${
                                isActive ? 'bg-blue-600 shadow-inner' : 'hover:bg-gray-800'
                            }`
                        }
                    >
                        <span className="w-4 text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </span>
                        <span className="text-sm font-medium">Office Heads</span>
                    </NavLink>

                    <NavLink
                        to="/home/users"
                        onClick={(e) => {
                            // Force navigation if React Router seems blocked
                            if (window.location.pathname === '/home/officehead') {
                                e.preventDefault();
                                window.location.href = '/home/users';
                            }
                        }}
                        className={({ isActive }) =>
                            `flex items-center gap-3 py-2 px-3 rounded-lg transition-colors duration-200 text-white ${
                                isActive ? 'bg-blue-600 shadow-inner' : 'hover:bg-gray-800'
                            }`
                        }
                    >
                        <span className="w-4 text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                            </svg>
                        </span>
                        <span className="text-sm font-medium">Users</span>
                    </NavLink>
                </div>

                {/* Logs Section */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 px-3 py-1">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Logs</span>
                    </div>
                    
                    <NavLink
                        to="/home/audit-logs"
                        onClick={(e) => {
                            // Force navigation if React Router seems blocked
                            if (window.location.pathname === '/home/officehead') {
                                e.preventDefault();
                                window.location.href = '/home/audit-logs';
                            }
                        }}
                        className={({ isActive }) =>
                            `flex items-center gap-3 py-2 px-3 rounded-lg transition-colors duration-200 text-white ${
                                isActive ? 'bg-blue-600 shadow-inner' : 'hover:bg-gray-800'
                            }`
                        }
                    >
                        <span className="w-4 text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </span>
                        <span className="text-sm font-medium">Audit Logs</span>
                    </NavLink>
                </div>
            </div>
            
            {/* Profile Section with Menu */}
            <div className="relative border-t border-gray-700 pt-3" ref={profileMenuRef}>
                <div className="flex items-center justify-between p-2 hover:bg-gray-800 rounded-lg transition-colors duration-200">
                    <NavLink
                        to="/home/Profile"
                        onClick={(e) => {
                            // Force navigation if React Router seems blocked
                            if (window.location.pathname === '/home/officehead') {
                                e.preventDefault();
                                window.location.href = '/home/Profile';
                            }
                        }}
                        className="flex items-center gap-3 flex-1"
                    >
                        <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-medium text-white">
                                {currentUser ? currentUser.FullName : 'Loading...'}
                            </span>
                            <span className="text-[10px] text-gray-400">
                                {currentUser && currentUser.RoleName ? currentUser.RoleName : 'View Profile'}
                            </span>
                        </div>
                    </NavLink>
                    
                    <button
                        onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                        className="p-1 rounded-md hover:bg-gray-700 transition-colors duration-200"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                    </button>
                </div>
                
                {/* Dropdown Menu */}
                {isProfileMenuOpen && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1">
                        <NavLink
                            to="/"
                            className="flex items-center gap-3 px-3 py-2 text-xs text-red-300 hover:text-red-400 hover:bg-gray-700 transition-colors duration-200"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 0v-8a1 1 0 00-1-1H5a1 1 0 00-1 1v8" />
                            </svg>
                            <span>Sign Out</span>
                        </NavLink>
                    </div>
                )}
            </div>

        </nav>

        {/* Mobile Navigation */}
        <div className="lg:hidden">
            {/* Mobile Top Bar */}
            <nav className="fixed top-0 left-0 right-0 bg-gray-900 shadow-xl z-50 p-4">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <img
                            src={auditrackLogo}
                            alt="Auditrack Logo"
                            className="w-8 h-8 object-contain"
                        />
                        <span className="font-bold text-white text-lg">
                            Auditrack
                        </span>
                    </div>
                    
                    {/* Hamburger Menu Button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="p-2 rounded-md text-white hover:bg-gray-800 transition-colors duration-200"
                    >
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
            {isMobileMenuOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setIsMobileMenuOpen(false)}></div>
            )}

            {/* Mobile Menu Sidebar */}
            <div 
                ref={mobileMenuRef}
                className={`fixed top-0 left-0 h-screen w-80 bg-gray-900 shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
                    isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                } flex flex-col justify-between p-4`}
            >
                <div className="flex flex-col space-y-4 mt-16">
                    {/* Mobile Logo */}
                    <div className="mb-4 flex items-center gap-3 pb-4 border-b border-gray-700">
                        <img
                            src={auditrackLogo}
                            alt="Auditrack Logo"
                            className="w-10 h-10 object-contain"
                        />
                        <span className="font-bold text-white text-xl">
                            Auditrack
                        </span>
                    </div>

                    {/* Dashboard Section */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 px-3 py-1">
                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Analyze</span>
                        </div>
                        
                        <NavLink
                            to="/home"
                            end
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center gap-3 py-2 px-3 rounded-lg transition-colors duration-200 text-white ${
                                    isActive ? 'bg-blue-600 shadow-inner' : 'hover:bg-gray-800'
                                }`
                            }
                        >
                            <span className="w-4 text-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9.75L12 4l9 5.75V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.75z" />
                                </svg>
                            </span>
                            <span className="text-sm font-medium">Dashboard</span>
                        </NavLink>
                    </div>

                    {/* Management Section */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 px-3 py-1">
                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Management</span>
                        </div>
                        
                        <NavLink
                            to="/home/organizations"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center gap-3 py-2 px-3 rounded-lg transition-colors duration-200 text-white ${
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
                            <span className="text-sm font-medium">Offices</span>
                        </NavLink>

                        <NavLink
                            to="/home/requirements"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center gap-3 py-2 px-3 rounded-lg transition-colors duration-200 text-white ${
                                    isActive ? 'bg-blue-600 shadow-inner' : 'hover:bg-gray-800'
                                }`
                            }
                        >
                            <span className="w-4 text-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </span>
                            <span className="text-sm font-medium">Requirements</span>
                        </NavLink>

                        <NavLink
                            to="/home/events"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center gap-3 py-2 px-3 rounded-lg transition-colors duration-200 text-white ${
                                    isActive ? 'bg-blue-600 shadow-inner' : 'hover:bg-gray-800'
                                }`
                            }
                        >
                            <span className="w-4 text-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </span>
                            <span className="text-sm font-medium">Events</span>
                        </NavLink>

                        <NavLink
                            to="/home/criteria"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center gap-3 py-2 px-3 rounded-lg transition-colors duration-200 text-white ${
                                    isActive ? 'bg-blue-600 shadow-inner' : 'hover:bg-gray-800'
                                }`
                            }
                        >
                            <span className="w-4 text-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                            </span>
                            <span className="text-sm font-medium">Criteria</span>
                        </NavLink>
                    </div>

                    {/* Users Section */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 px-3 py-1">
                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Users</span>
                        </div>
                        
                        <NavLink
                            to="/home/officehead"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center gap-3 py-2 px-3 rounded-lg transition-colors duration-200 text-white ${
                                    isActive ? 'bg-blue-600 shadow-inner' : 'hover:bg-gray-800'
                                }`
                            }
                        >
                            <span className="w-4 text-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </span>
                            <span className="text-sm font-medium">Office Heads</span>
                        </NavLink>

                        <NavLink
                            to="/home/users"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center gap-3 py-2 px-3 rounded-lg transition-colors duration-200 text-white ${
                                    isActive ? 'bg-blue-600 shadow-inner' : 'hover:bg-gray-800'
                                }`
                            }
                        >
                            <span className="w-4 text-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                                </svg>
                            </span>
                            <span className="text-sm font-medium">Users</span>
                        </NavLink>
                    </div>

                    {/* Logs Section */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 px-3 py-1">
                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Logs</span>
                        </div>
                        
                        <NavLink
                            to="/home/audit-logs"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center gap-3 py-2 px-3 rounded-lg transition-colors duration-200 text-white ${
                                    isActive ? 'bg-blue-600 shadow-inner' : 'hover:bg-gray-800'
                                }`
                            }
                        >
                            <span className="w-4 text-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </span>
                            <span className="text-sm font-medium">Audit Logs</span>
                        </NavLink>
                    </div>
                </div>
                
                {/* Mobile Profile Section */}
                <div className="relative border-t border-gray-700 pt-3">
                    <div className="flex items-center justify-between p-2 hover:bg-gray-800 rounded-lg transition-colors duration-200">
                        <NavLink
                            to="/home/Profile"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-3 flex-1"
                        >
                            <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-medium text-white">
                                    {currentUser ? currentUser.FullName : 'Loading...'}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                    {currentUser && currentUser.RoleName ? currentUser.RoleName : 'View Profile'}
                                </span>
                            </div>
                        </NavLink>
                        
                        <NavLink
                            to="/"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="p-2 rounded-md text-red-300 hover:text-red-400 hover:bg-gray-800 transition-colors duration-200"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 0v-8a1 1 0 00-1-1H5a1 1 0 00-1 1v8" />
                            </svg>
                        </NavLink>
                    </div>
                </div>
            </div>
        </div>
        </>
    );
};

