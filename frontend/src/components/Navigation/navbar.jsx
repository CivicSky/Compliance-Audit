import axios from "axios";
import { NavLink } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import auditrackLogo from "../../assets/images/logo.png";
import { usersAPI } from "../../utils/api";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from '../../utils/apiBase';

let toggleMobileNavbarHandler = null;

export function toggleMobileNavbar() {
    if (typeof toggleMobileNavbarHandler === 'function') {
        toggleMobileNavbarHandler();
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('toggleMobileMenu'));
    }
}

export default function Navbar({ isMobileMenuOpen: propIsMobileMenuOpen, setIsMobileMenuOpen: propSetIsMobileMenuOpen }) {
    const getInitialSidebarExpanded = () => {
        if (typeof window === 'undefined') return false;
        const stored = window.localStorage.getItem('sidebarExpanded');
        const expanded = stored === null ? false : stored === 'true';
        // Keep layout offset at collapsed width so hover/expand overlays content.
        document.documentElement.style.setProperty('--sidebar-width', 'calc(4rem / 0.9)');
        return expanded;
    };

    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [internalIsMobileMenuOpen, setInternalIsMobileMenuOpen] = useState(false);
    const isMobileMenuOpen = propIsMobileMenuOpen !== undefined ? propIsMobileMenuOpen : internalIsMobileMenuOpen;
    const setIsMobileMenuOpen = propSetIsMobileMenuOpen || setInternalIsMobileMenuOpen;
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(getInitialSidebarExpanded);
    const [isHoverExpanded, setIsHoverExpanded] = useState(false);
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

    // Persist explicit expanded state, but don't override hover-driven temporary expansion.
    useEffect(() => {
        localStorage.setItem('sidebarExpanded', String(isSidebarExpanded));
    }, [isSidebarExpanded]);

    const effectiveExpanded = isSidebarExpanded || isHoverExpanded;
    useEffect(() => {
        // Keep layout offset fixed; sidebar expands as an overlay.
        document.documentElement.style.setProperty('--sidebar-width', 'calc(4rem / 0.9)');
    }, [effectiveExpanded]);

    // Close menus on outside click & listen for header mobile menu toggle
    useEffect(() => {
        toggleMobileNavbarHandler = () => {
            setIsMobileMenuOpen(prev => !prev);
        };

        function handleClickOutside(event) {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setIsProfileMenuOpen(false);
            }
        }

        const handleToggleMobileMenu = () => {
            setIsMobileMenuOpen(prev => !prev);
        };
        const handleOpenMobileMenu = () => {
            setIsMobileMenuOpen(true);
        };
        const handleCloseMobileMenu = () => {
            setIsMobileMenuOpen(false);
        };

        window.addEventListener('toggleMobileMenu', handleToggleMobileMenu);
        window.addEventListener('openMobileMenu', handleOpenMobileMenu);
        window.addEventListener('closeMobileMenu', handleCloseMobileMenu);
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            toggleMobileNavbarHandler = null;
            window.removeEventListener('toggleMobileMenu', handleToggleMobileMenu);
            window.removeEventListener('openMobileMenu', handleOpenMobileMenu);
            window.removeEventListener('closeMobileMenu', handleCloseMobileMenu);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // NavLink style function matching user design
    const navLinkClass = ({ isActive }) =>
        `flex items-center rounded-xl transition-all duration-150 text-xs font-semibold ${
            effectiveExpanded ? 'gap-3 px-3.5 py-2.5 justify-start' : 'h-10 w-10 mx-auto px-0 justify-center'
        } ${
            isActive
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 font-bold'
                : 'text-slate-200 hover:text-white hover:bg-white/5 font-semibold'
        }`;

    const labelStyle = {
        maxWidth: effectiveExpanded ? '12rem' : '0px',
    };

    const labelClass = `text-xs font-semibold whitespace-nowrap overflow-hidden transition-[max-width,opacity,transform] duration-200 ${
        effectiveExpanded ? 'opacity-100 translate-x-0 delay-150' : 'opacity-0 -translate-x-2 delay-0'
    }`;

    const sectionStyle = {
        maxHeight: effectiveExpanded ? '30px' : '0px',
    };

    const sectionClass = `flex items-center gap-2 px-3 pt-3 pb-1 overflow-hidden transition-[max-height,opacity,transform] duration-200 ${
        effectiveExpanded ? 'opacity-100 translate-x-0 delay-150' : 'opacity-0 -translate-x-2 delay-0 pointer-events-none'
    }`;

    const renderSharedPeopleIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2a5 5 0 00-10 0v2m10 0H7m6-13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    );

    const renderSingleUserIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
    );

    const mobileNavLinkClass = ({ isActive }) =>
        `flex items-center gap-3 py-2.5 px-3.5 rounded-xl transition-all duration-150 text-xs font-semibold ${
            isActive
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 font-bold'
                : 'text-slate-200 hover:text-white hover:bg-white/5'
        }`;

    const mobileSectionClass = "flex items-center gap-2 px-3 pt-3 pb-1";

    return (
        <>
            {/* Desktop Sidebar */}
            <nav
                onMouseEnter={() => { if (!isSidebarExpanded) setIsHoverExpanded(true); }}
                onMouseLeave={() => { if (!isSidebarExpanded) setIsHoverExpanded(false); }}
                className={`nav-no-zoom hidden lg:flex fixed top-0 left-0 h-screen border-r border-slate-800/80 shadow-2xl z-50 flex-col justify-between p-3.5 overflow-hidden transition-[width] duration-200 ease-in-out ${effectiveExpanded ? 'w-64' : 'w-16'}`}
                style={{ background: '#090e1a' }}
            >
                <div className="flex flex-col space-y-1.5">
                    {/* Logo & Collapse Header */}
                    <div className="mb-2 flex items-center gap-2.5 px-0.5">
                        <button
                            onClick={() => setIsSidebarExpanded((prev) => !prev)}
                            className="p-1.5 rounded-lg border border-slate-700/60 bg-slate-800/50 hover:bg-slate-700/60 text-slate-300 hover:text-white transition-colors duration-200 shrink-0 cursor-pointer"
                            aria-label={effectiveExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
                            title={effectiveExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {effectiveExpanded ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                )}
                            </svg>
                        </button>
                        <div className="flex items-center gap-2 min-w-0">
                            <img src={auditrackLogo} alt="Auditrack Logo" className="w-7 h-7 object-contain shrink-0" />
                            <span
                                className="font-bold text-white text-base truncate whitespace-nowrap overflow-hidden tracking-wide transition-[max-width,opacity,transform] duration-200"
                                style={{ maxWidth: effectiveExpanded ? '10rem' : '0px' }}
                            >
                                Auditrack
                            </span>
                        </div>
                    </div>

                    {/* Section: ANALYZE */}
                    {currentUser && currentUser.RoleID === 1 && (
                        <div className="space-y-1">
                            <div className={sectionClass} style={sectionStyle}>
                                <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-500">Analyze</span>
                            </div>
                            <NavLink to="/home" className={navLinkClass}>
                                <span className="w-4 text-center shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9.75L12 4l9 5.75V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.75z" />
                                    </svg>
                                </span>
                                <span className={labelClass} style={labelStyle}>Dashboard</span>
                            </NavLink>
                        </div>
                    )}

                    {/* Section: MANAGEMENT */}
                    <div className="space-y-1">
                        <div className={sectionClass} style={sectionStyle}>
                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-500">Management</span>
                        </div>

                        {(!currentUser || (currentUser.RoleID !== 4 && currentUser.RoleName !== 'Auditor' && !currentUser.isExternalAuditor)) && (
                            <NavLink
                                to="/home/events"
                                onClick={(e) => {
                                    if (window.location.pathname === '/home/officehead') {
                                        e.preventDefault();
                                        window.location.href = '/home/events';
                                    }
                                }}
                                className={navLinkClass}
                            >
                                <span className="w-4 text-center shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </span>
                                <span className={labelClass} style={labelStyle}>Downloads</span>
                            </NavLink>
                        )}

                        <NavLink
                            to="/home/allc"
                            className={navLinkClass}
                        >
                            <span className="w-4 text-center shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <rect x="6" y="5" width="12" height="16" rx="2" strokeWidth="2" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3h6a1 1 0 011 1v2H8V4a1 1 0 011-1z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6M9 14h6M9 18h4" />
                                </svg>
                            </span>
                            <span className={labelClass} style={labelStyle}>Accreditation</span>
                        </NavLink>

                        <NavLink
                            to="/home/master-list"
                            className={navLinkClass}
                        >
                            <span className="w-4 text-center shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                            </span>
                            <span className={labelClass} style={labelStyle}>Master List</span>
                        </NavLink>

                        <NavLink
                            to="/home/acc-management"
                            className={navLinkClass}
                        >
                            <span className="w-4 text-center shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <rect x="3" y="3" width="7" height="7" rx="1.5" strokeWidth="2" />
                                    <rect x="14" y="3" width="7" height="7" rx="1.5" strokeWidth="2" />
                                    <rect x="14" y="14" width="7" height="7" rx="1.5" strokeWidth="2" />
                                    <rect x="3" y="14" width="7" height="7" rx="1.5" strokeWidth="2" />
                                </svg>
                            </span>
                            <span className={labelClass} style={labelStyle}>Programs and Offices</span>
                        </NavLink>
                    </div>

                    {/* Section: USERS */}
                    <div className="space-y-1">
                        <div className={sectionClass} style={sectionStyle}>
                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-500">Users</span>
                        </div>
                        {currentUser && currentUser.RoleID === 1 && (
                            <NavLink to="/home/officehead" className={navLinkClass}>
                                <span className="w-4 text-center shrink-0">
                                    {renderSharedPeopleIcon()}
                                </span>
                                <span className={labelClass} style={labelStyle}>Office Personnel</span>
                            </NavLink>
                        )}
                        {currentUser && currentUser.RoleID === 1 && (
                            <NavLink to="/home/external-auditors" className={navLinkClass}>
                                <span className="w-4 text-center shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                </span>
                                <span className={labelClass} style={labelStyle}>External Auditors</span>
                            </NavLink>
                        )}
                        {currentUser && currentUser.RoleID === 1 && (
                            <NavLink to="/home/users" className={navLinkClass}>
                                <span className="w-4 text-center shrink-0">
                                    {renderSingleUserIcon()}
                                </span>
                                <span className={labelClass} style={labelStyle}>Users</span>
                            </NavLink>
                        )}
                    </div>

                    {/* Section: LOGS */}
                    {currentUser && currentUser.RoleID === 1 && (
                        <div className="space-y-1">
                            <div className={sectionClass} style={sectionStyle}>
                                <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-500">Logs</span>
                            </div>
                            <NavLink to="/home/audit-logs" className={navLinkClass}>
                                <span className="w-4 text-center shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                </span>
                                <span className={labelClass} style={labelStyle}>Audit Logs</span>
                            </NavLink>
                        </div>
                    )}
                </div>

                {/* Bottom Profile Section */}
                <div className="relative border-t border-slate-800/80 pt-2.5 mt-auto" ref={profileMenuRef}>
                    <div className={`flex items-center p-1.5 hover:bg-white/5 rounded-xl transition-colors duration-200 ${effectiveExpanded ? 'justify-between' : 'justify-center'}`}>
                        <NavLink to="/home/Profile" className={`flex items-center ${effectiveExpanded ? 'gap-2.5 flex-1 min-w-0' : 'justify-center'}`}>
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-slate-700/60 shadow-sm">
                                {currentUser && currentUser.ProfilePic ? (
                                    <img
                                        src={`${API_BASE_URL}/uploads/profile-pics/${currentUser.ProfilePic}`}
                                        alt="Profile"
                                        className="w-8 h-8 object-cover rounded-full"
                                        onError={e => { e.target.onerror = null; e.target.src = '/default-avatar.png'; }}
                                    />
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                )}
                            </div>
                            <div
                                className={`flex flex-col whitespace-nowrap overflow-hidden transition-[max-width,opacity,transform] duration-200 ${
                                    effectiveExpanded ? 'opacity-100 translate-x-0 delay-150' : 'opacity-0 -translate-x-2 delay-0'
                                }`}
                                style={{ maxWidth: effectiveExpanded ? '11rem' : '0px' }}
                            >
                                <span className="text-xs font-bold text-white leading-tight truncate">
                                    {currentUser
                                        ? `${currentUser.FirstName}${currentUser.MiddleInitial ? ' ' + currentUser.MiddleInitial + '.' : ''} ${currentUser.LastName}`
                                        : 'Loading...'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium leading-tight truncate mt-0.5">View Profile</span>
                            </div>
                        </NavLink>

                        {effectiveExpanded && (
                            <button
                                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors duration-200 cursor-pointer"
                                aria-label="Profile actions"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {isProfileMenuOpen && (
                        <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl shadow-2xl overflow-hidden py-1" style={{ background: '#090e1a', border: '1px solid rgba(59,130,246,0.3)' }}>
                            <button
                                onClick={handleLogout}
                                className="flex w-full items-center gap-3 px-3.5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors duration-200 cursor-pointer"
                            >
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </nav>

            {/* Mobile Navigation Drawer */}
            <div className="lg:hidden">
                {/* Mobile Menu Backdrop */}
                {isMobileMenuOpen && (
                    <div
                        className="fixed inset-0 bg-black/60 z-[9998] backdrop-blur-xs transition-opacity duration-300"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                )}

                {/* Mobile Sidebar Drawer */}
                <div
                    ref={mobileMenuRef}
                    className={`nav-no-zoom fixed top-0 left-0 h-screen w-72 max-w-[85vw] shadow-2xl z-[9999] transform transition-transform duration-300 ease-in-out ${
                        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                    } flex flex-col justify-between p-4`}
                    style={{ background: '#090e1a' }}
                >
                    {/* Mobile Drawer Top Brand & Close Button */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 shrink-0">
                        <div className="flex items-center gap-2.5">
                            <img src={auditrackLogo} alt="Auditrack Logo" className="w-7 h-7 object-contain" />
                            <span className="font-bold text-white text-base">Auditrack</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="p-1.5 rounded-lg border border-slate-700/60 bg-slate-800/50 hover:bg-slate-700/60 text-slate-300 hover:text-white transition-colors cursor-pointer"
                            aria-label="Close menu"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto flex flex-col space-y-4 py-3 min-h-0">
                        {/* Analyze */}
                        {currentUser && currentUser.RoleID === 1 && (
                            <div className="space-y-1">
                                <div className={mobileSectionClass}>
                                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-500">Analyze</span>
                                </div>
                                <NavLink
                                    to="/home"
                                    className={mobileNavLinkClass}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <span className="w-4 text-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9.75L12 4l9 5.75V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.75z" />
                                        </svg>
                                    </span>
                                    <span className="text-xs font-semibold">Dashboard</span>
                                </NavLink>
                            </div>
                        )}

                        {/* Management */}
                        <div className="space-y-1">
                            <div className={mobileSectionClass}>
                                <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-500">Management</span>
                            </div>

                            <NavLink
                                to="/home/events"
                                onClick={(e) => {
                                    if (window.location.pathname === '/home/officehead') {
                                        e.preventDefault();
                                        window.location.href = '/home/events';
                                        return;
                                    }
                                    setIsMobileMenuOpen(false);
                                }}
                                className={mobileNavLinkClass}
                            >
                                <span className="w-4 text-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </span>
                                <span className="text-xs font-semibold">Downloads</span>
                            </NavLink>

                            <NavLink
                                to="/home/allc"
                                className={mobileNavLinkClass}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <span className="w-4 text-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <rect x="6" y="5" width="12" height="16" rx="2" strokeWidth="2" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3h6a1 1 0 011 1v2H8V4a1 1 0 011-1z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6M9 14h6M9 18h4" />
                                    </svg>
                                </span>
                                <span className="text-xs font-medium">Accreditation</span>
                            </NavLink>

                            <NavLink
                                to="/home/master-list"
                                className={mobileNavLinkClass}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <span className="w-4 text-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7a2 2 0 012-2h3l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6" />
                                    </svg>
                                </span>
                                <span className="text-xs font-medium">Master List</span>
                            </NavLink>

                            <NavLink
                                to="/home/acc-management"
                                className={mobileNavLinkClass}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <span className="w-4 text-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <rect x="3" y="3" width="7" height="7" rx="1.5" strokeWidth="2" />
                                        <rect x="14" y="3" width="7" height="7" rx="1.5" strokeWidth="2" />
                                        <rect x="14" y="14" width="7" height="7" rx="1.5" strokeWidth="2" />
                                        <rect x="3" y="14" width="7" height="7" rx="1.5" strokeWidth="2" />
                                    </svg>
                                </span>
                                <span className="text-xs font-semibold">Programs and Offices</span>
                            </NavLink>
                        </div>

                        {/* Users */}
                        <div className="space-y-1">
                            <div className={mobileSectionClass}>
                                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#60a5fa' }}>Users</span>
                            </div>
                            {currentUser && currentUser.RoleID === 1 && (
                                <NavLink
                                    to="/home/officehead"
                                    className={mobileNavLinkClass}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <span className="w-4 text-center">{renderSharedPeopleIcon()}</span>
                                    <span className="text-xs font-medium">Office Personnel</span>
                                </NavLink>
                            )}
                            {currentUser && currentUser.RoleID === 1 && (
                                <NavLink
                                    to="/home/external-auditors"
                                    className={mobileNavLinkClass}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <span className="w-4 text-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                    </span>
                                    <span className="text-xs font-medium">External Auditors</span>
                                </NavLink>
                            )}
                            {currentUser && currentUser.RoleID === 1 && (
                                <NavLink
                                    to="/home/users"
                                    className={mobileNavLinkClass}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <span className="w-4 text-center">{renderSingleUserIcon()}</span>
                                    <span className="text-xs font-medium">Users</span>
                                </NavLink>
                            )}
                        </div>

                        {/* Logs */}
                        {currentUser && currentUser.RoleID === 1 && (
                            <div className="space-y-1">
                                <div className={mobileSectionClass}>
                                    <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#60a5fa' }}>Logs</span>
                                </div>
                                <NavLink
                                    to="/home/audit-logs"
                                    className={mobileNavLinkClass}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <span className="w-4 text-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                        </svg>
                                    </span>
                                    <span className="text-xs font-medium">Audit Logs</span>
                                </NavLink>
                            </div>
                        )}
                    </div>

                    {/* Mobile Profile Section */}
                    <div className="relative border-t border-blue-900/60 pt-3 shrink-0">
                        <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
                            <NavLink
                                to="/home/Profile"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="flex items-center gap-2.5 flex-1 min-w-0 pr-2 hover:opacity-90 transition-opacity"
                            >
                                <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-blue-400/40 shadow-sm">
                                    {currentUser && currentUser.ProfilePic ? (
                                        <img
                                            src={`${API_BASE_URL}/uploads/profile-pics/${currentUser.ProfilePic}`}
                                            alt="Profile"
                                            className="w-9 h-9 object-cover rounded-full"
                                            onError={e => { e.target.onerror = null; e.target.src = '/default-avatar.png'; }}
                                        />
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    )}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-semibold text-white truncate">
                                        {currentUser
                                            ? `${currentUser.FirstName || ''}${currentUser.MiddleInitial ? ' ' + currentUser.MiddleInitial + '.' : ''} ${currentUser.LastName || ''}`.trim() || currentUser.FullName || 'User'
                                            : 'Loading...'}
                                    </span>
                                    <span className="text-[10px] text-blue-300 truncate">
                                        {currentUser?.RoleName || 'View Profile'}
                                    </span>
                                </div>
                            </NavLink>

                            {/* Mobile Logout Button */}
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-200 hover:text-white bg-red-500/20 hover:bg-red-600 border border-red-500/30 transition-colors cursor-pointer shrink-0"
                                title="Sign Out"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                <span>Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

        </>
    );
};
