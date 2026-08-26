import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { createPortal } from 'react-dom';
import user from "../../assets/images/user.svg";
import { usersAPI } from "../../utils/api";
import { useModal } from "../UI/ModalProvider";
import Pagination from "../Pagination/Pagination";
import { API_BASE_URL } from '../../utils/apiBase';
import { CardListSkeleton } from "../UI/Skeleton";
import { useLiveRefresh } from "../../utils/liveSync";

const UsersP = forwardRef(({ searchTerm = '', filterOptions = {}, deleteMode = false, onSelectionChange, onUserClick, viewMode = 'list' }, ref) => {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedUsers, setSelectedUsers] = useState(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [currentUserID, setCurrentUserID] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const isAdmin = currentUser?.RoleName === 'admin' || currentUser?.RoleID === 1;
    const [actionMenuUserId, setActionMenuUserId] = useState(null);
    const [actionMenuAnchorRect, setActionMenuAnchorRect] = useState(null);
    const { showConfirm } = useModal();

    const normalizeRoleKey = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const getRoleLabel = (person) => person.RoleName || (person.RoleID === 1 ? 'Admin' : 'User');
    const getRoleBadgeClass = (person) => {
        if (person.RoleID === 1) return 'bg-purple-100 text-purple-800 border-purple-200';
        if (person.RoleID === 2) return 'bg-blue-100 text-blue-800 border-blue-200';
        if (person.RoleID === 3) return 'bg-green-100 text-green-800 border-green-200';
        return 'bg-gray-100 text-gray-800 border-gray-200';
    };
    const getApprovalLabel = (person) => {
        const status = String(person.approval_status || 'pending');
        return status.charAt(0).toUpperCase() + status.slice(1);
    };
    const getApprovalBadgeClass = (person) => {
        const status = String(person.approval_status || 'pending').toLowerCase();
        if (status === 'approved') return 'bg-green-100 text-green-800 border-green-200';
        if (status === 'pending') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        if (status === 'denied') return 'bg-red-100 text-red-800 border-red-200';
        return 'bg-gray-100 text-gray-800 border-gray-200';
    };

    const itemsPerPage = 30; // limit to 30 per page for users pagination

    // Fetch current user ID from token
    useEffect(() => {
        {
            const fetchCurrentUser = async () => {
                {
                    try {
                        {
                            const response = await usersAPI.getLoggedInUser();
                            if (response && response.success && response.user) {
                                {
                                    setCurrentUserID(response.user.UserID);
                                    setCurrentUser(response.user);
                                }
                            }
                        }
                    } catch (error) {
                        {
                            console.error('Error fetching current user:', error);
                        }
                    }
                }
            };
            fetchCurrentUser();
        }
    }, []);

    // Close action menu when clicking outside
    useEffect(() => {
        if (!actionMenuUserId) return;
        const closeOnOutside = (event) => {
            const target = event.target;
            if (target.closest && (target.closest('.user-actions-menu') || target.closest('.user-actions-button'))) {
                return;
            }
            setActionMenuUserId(null);
            setActionMenuAnchorRect(null);
        };
        document.addEventListener('mousedown', closeOnOutside);
        return () => document.removeEventListener('mousedown', closeOnOutside);
    }, [actionMenuUserId]);

    // Close action menu on scroll/resize (portal is anchored to a DOM rect)
    useEffect(() => {
        if (!actionMenuUserId) return;

        const closeMenu = () => {
            setActionMenuUserId(null);
            setActionMenuAnchorRect(null);
        };

        window.addEventListener('resize', closeMenu);
        window.addEventListener('scroll', closeMenu, true);
        return () => {
            window.removeEventListener('resize', closeMenu);
            window.removeEventListener('scroll', closeMenu, true);
        };
    }, [actionMenuUserId]);

    // Fetch users data from database
    useEffect(() => {
        fetchUsers();
    }, []);

    // Live syncing on mutations / window focus
    useLiveRefresh(fetchUsers);

    // Filter and sort users based on search term and approval status
    useEffect(() => {
        let filtered = users;

        // Apply search filter
        if (searchTerm.trim()) {
            filtered = users.filter(person => {
                const fullName = `${person.FirstName}${person.MiddleInitial ? ' ' + person.MiddleInitial + '.' : ''} ${person.LastName}`.toLowerCase();
                const email = person.Email?.toLowerCase() || '';
                const role = person.RoleName?.toLowerCase() || '';
                const searchLower = searchTerm.toLowerCase();

                return fullName.includes(searchLower) ||
                    email.includes(searchLower) ||
                    role.includes(searchLower);
            });
        }

        // Apply approval status filter
        if (filterOptions.approvalStatus && filterOptions.approvalStatus.length > 0) {
            filtered = filtered.filter(person =>
                filterOptions.approvalStatus.includes(person.approval_status || 'pending')
            );
        }

        // Apply role filter
        if (filterOptions.roles && filterOptions.roles.length > 0) {
            filtered = filtered.filter(person => {
                const selectedRoles = filterOptions.roles.map(normalizeRoleKey);
                const userRole = normalizeRoleKey(person.RoleName || (person.RoleID === 1 ? 'admin' : 'user'));
                return selectedRoles.includes(userRole);
            });
        }

        // Sort by name in ascending order
        const sortedFiltered = [...filtered].sort((a, b) => {
            const nameA = `${a.FirstName} ${a.LastName}`.toLowerCase();
            const nameB = `${b.FirstName} ${b.LastName}`.toLowerCase();
            return nameA.localeCompare(nameB);
        });

        setFilteredUsers(sortedFiltered);
    }, [users, searchTerm, filterOptions]);

    // Pagination: reset page when filters or search change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterOptions]);

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
    const startIdx = (currentPage - 1) * itemsPerPage;
    const paginatedUsers = filteredUsers.slice(startIdx, startIdx + itemsPerPage);
    const visibleUsers = viewMode === 'list' ? paginatedUsers : filteredUsers;

    // Handle selection changes and notify parent component
    useEffect(() => {
        if (onSelectionChange) {
            onSelectionChange(selectedUsers.size, Array.from(selectedUsers));
        }
    }, [selectedUsers, onSelectionChange]);

    // Clear selections when delete mode is turned off
    useEffect(() => {
        if (!deleteMode) {
            setSelectedUsers(new Set());
        }
    }, [deleteMode]);

    const handleCheckboxChange = (userId, isChecked) => {
        setSelectedUsers(prev => {
            const newSet = new Set(prev);
            if (isChecked) {
                newSet.add(userId);
            } else {
                newSet.delete(userId);
            }
            return newSet;
        });
    };

    const deleteSelectedUsers = async (userIds) => {
        try {
            if (!Array.isArray(userIds) || userIds.length === 0) {
                return { success: false, message: 'No user IDs provided' };
            }

            const response = await usersAPI.deleteUsers(userIds);
            if (response && response.success) {
                // refresh local list
                await fetchUsers();
                return { success: true, message: response.message };
            }

            return { success: false, message: response?.message || 'Deletion failed' };
        } catch (error) {
            console.error('Error deleting users:', error);
            if (error.response) {
                return { success: false, message: error.response.data?.message || error.response.statusText };
            }
            if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
                return { success: false, message: 'Network error. Please check if the backend server is running.' };
            }
            return { success: false, message: `Error deleting users: ${error.message}` };
        }
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await usersAPI.getAllUsers();

            if (response.success) {
                setUsers(response.users);
            } else {
                setError('Failed to fetch users');
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            setError('Error loading users. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Function to refresh data (can be called from parent component)
    const refreshData = () => {
        fetchUsers();
    };

    // Expose refresh function to parent
    useImperativeHandle(ref, () => ({
        refresh: refreshData,
        deleteSelected: deleteSelectedUsers
    }));

    if (loading) {
        return (
            <div className="mt-6 w-full">
                <CardListSkeleton count={4} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="mt-6 w-full">
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="flex items-center">
                        <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-red-700">{error}</span>
                        <button
                            onClick={fetchUsers}
                            className="ml-4 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (filteredUsers.length === 0 && !loading) {
        if (searchTerm.trim()) {
            return (
                <div className="mt-6 w-full">
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-8 text-center">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
                        <p className="text-gray-600">No users match your search for "{searchTerm}".</p>
                        <p className="text-gray-500 text-sm mt-2">Try adjusting your search terms or browse all users.</p>
                    </div>
                </div>
            );
        } else if (users.length === 0) {
            return (
                <div className="mt-6 w-full">
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-8 text-center">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM9 9a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Users Found</h3>
                        <p className="text-gray-600">No users available in the system yet.</p>
                    </div>
                </div>
            );
        }
    }

    return (
        <div className="mt-1 w-full">
            {/* Search Results Counter */}
            {searchTerm.trim() && (
                <div className="text-sm text-gray-600 mb-4">
                    Showing {filteredUsers.length} of {users.length} users
                    {filteredUsers.length !== users.length && ` matching "${searchTerm}"`}
                </div>
            )}

            <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20' : 'space-y-2'}>
                {visibleUsers.map((person) => {
                    // Construct full name
                    const fullName = `${person.FirstName || ''}${person.MiddleInitial ? ' ' + person.MiddleInitial + '.' : ''} ${person.LastName || ''}`.trim() || 'User';
                    const initials = `${(person.FirstName || '').trim().charAt(0)}${(person.LastName || '').trim().charAt(0)}`.toUpperCase() || 'U';
                    const roleLabel = getRoleLabel(person);
                    const approvalLabel = getApprovalLabel(person);
                    const roleBadgeClass = getRoleBadgeClass(person);
                    const approvalBadgeClass = getApprovalBadgeClass(person);

                    const avatarPalettes = [
                        { bg: 'bg-gradient-to-br from-indigo-500 to-blue-600', ring: 'ring-indigo-100' },
                        { bg: 'bg-gradient-to-br from-violet-500 to-purple-600', ring: 'ring-purple-100' },
                        { bg: 'bg-gradient-to-br from-sky-500 to-cyan-600', ring: 'ring-sky-100' },
                        { bg: 'bg-gradient-to-br from-emerald-500 to-teal-600', ring: 'ring-emerald-100' },
                        { bg: 'bg-gradient-to-br from-amber-500 to-orange-600', ring: 'ring-amber-100' },
                        { bg: 'bg-gradient-to-br from-rose-500 to-pink-600', ring: 'ring-rose-100' },
                    ];
                    let hash = 0;
                    for (let i = 0; i < fullName.length; i++) hash = fullName.charCodeAt(i) + ((hash << 5) - hash);
                    const avatarStyle = avatarPalettes[Math.abs(hash) % avatarPalettes.length];

                    // Profile photo logic: use preview if available, else use uploaded filename, else null
                    let profilePicUrl = null;
                    if (person.TempPreview) {
                        profilePicUrl = person.TempPreview;
                    } else if (person.ProfilePic) {
                        profilePicUrl = `${API_BASE_URL}/uploads/profile-pics/${person.ProfilePic}`;
                    }

                    if (viewMode === 'list') {
                        return (
                            <div
                                key={person.UserID}
                                onClick={() => !deleteMode && onUserClick && onUserClick(person)}
                                className={`relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs transition-all duration-200 ${selectedUsers.has(person.UserID) ? 'ring-2 ring-indigo-500 border-indigo-500' : ''
                                    } ${currentUserID === person.UserID ? 'border-indigo-300 bg-indigo-50/30' : ''
                                    } ${deleteMode ? 'cursor-pointer hover:border-gray-300' : 'cursor-pointer hover:border-indigo-200 hover:shadow-md'}`}
                            >
                                <div className="grid grid-cols-8 items-center gap-2 px-3 py-2">
                                    {/* Name & Email */}
                                    <div className="flex items-center gap-3 col-span-4 min-w-0">
                                        {deleteMode && (
                                            <div className="flex-shrink-0">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedUsers.has(person.UserID)}
                                                    onChange={(e) => handleCheckboxChange(person.UserID, e.target.checked)}
                                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                        )}
                                        <div className="h-9 w-9 flex-shrink-0 rounded-xl overflow-hidden relative">
                                            {profilePicUrl ? (
                                                <img
                                                    src={profilePicUrl}
                                                    alt={fullName}
                                                    className="h-full w-full rounded-xl object-cover ring-2 ring-slate-100"
                                                    onError={e => {
                                                        e.target.style.display = 'none';
                                                        if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'flex';
                                                    }}
                                                />
                                            ) : null}
                                            <div className={`h-full w-full rounded-xl flex items-center justify-center font-bold text-white text-xs ${avatarStyle.bg} ${profilePicUrl ? 'hidden' : 'flex'}`}>
                                                {initials}
                                            </div>
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="truncate text-[13px] font-semibold text-gray-900">{fullName}</h3>
                                            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-gray-600">
                                                <span className="truncate">{person.Email}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Role */}
                                    <div className="flex items-center col-span-2 justify-center">
                                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${roleBadgeClass}`}>
                                            {roleLabel}
                                        </span>
                                    </div>
                                    {/* Approval Status */}
                                    <div className="flex items-center col-span-1 justify-center">
                                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${approvalBadgeClass}`}>
                                            {approvalLabel}
                                        </span>
                                    </div>
                                    {/* Actions */}
                                    <div className="flex items-center col-span-1 justify-end">
                                        {isAdmin && (
                                            <div className="relative">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        setActionMenuUserId((prev) => {
                                                            const next = prev === person.UserID ? null : person.UserID;
                                                            return next;
                                                        });
                                                        setActionMenuAnchorRect((prev) => {
                                                            if (actionMenuUserId === person.UserID) return null;
                                                            return rect;
                                                        });
                                                    }}
                                                    className="user-actions-button inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
                                                    aria-label="User actions"
                                                    title="User actions"
                                                >
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6h.01M12 12h.01M12 18h.01" />
                                                    </svg>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div
                            key={person.UserID}
                            onClick={() => !deleteMode && onUserClick && onUserClick(person)}
                            className={`group relative flex flex-col justify-between rounded-2xl border bg-white shadow-xs hover:shadow-xl transition-all duration-200 hover:-translate-y-1 overflow-hidden min-h-[200px] ${selectedUsers.has(person.UserID)
                                    ? 'border-indigo-500 ring-2 ring-indigo-400/50 bg-indigo-50/15'
                                    : currentUserID === person.UserID
                                        ? 'border-indigo-300 bg-indigo-50/20'
                                        : 'border-slate-200/90 hover:border-indigo-300/80'
                                } ${deleteMode ? 'cursor-pointer hover:border-slate-300' : 'cursor-pointer'}`}
                        >
                            <div className="p-4 flex flex-col flex-1 justify-between gap-3">
                                {/* Card Top: Approval Badge & Actions / Checkbox */}
                                <div className="flex items-center justify-between gap-2">
                                    {deleteMode ? (
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={selectedUsers.has(person.UserID)}
                                                onChange={(e) => handleCheckboxChange(person.UserID, e.target.checked)}
                                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <span className="text-[11px] font-semibold text-slate-600">Select</span>
                                        </label>
                                    ) : (
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide border ${approvalBadgeClass}`}>
                                            {approvalLabel}
                                        </span>
                                    )}

                                    <div className="flex items-center gap-1.5">
                                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${roleBadgeClass}`}>
                                            {roleLabel}
                                        </span>

                                        {!deleteMode && isAdmin && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    setActionMenuUserId((prev) => (prev === person.UserID ? null : person.UserID));
                                                    setActionMenuAnchorRect((prev) => (actionMenuUserId === person.UserID ? null : rect));
                                                }}
                                                className="user-actions-button flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                                                aria-label="User actions"
                                                title="User actions"
                                            >
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6h.01M12 12h.01M12 18h.01" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Profile Info */}
                                <div className="flex items-center gap-3">
                                    <div className="relative shrink-0">
                                        {profilePicUrl ? (
                                            <img
                                                src={profilePicUrl}
                                                alt={fullName}
                                                className="h-12 w-12 rounded-xl object-cover ring-2 ring-slate-100 shadow-xs"
                                                onError={e => {
                                                    e.target.style.display = 'none';
                                                    if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'flex';
                                                }}
                                            />
                                        ) : null}
                                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center font-bold text-white text-sm shadow-xs ring-2 ${avatarStyle.ring} ${avatarStyle.bg} ${profilePicUrl ? 'hidden' : 'flex'}`}>
                                            {initials}
                                        </div>
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-[14px] font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                                            {fullName}
                                        </h3>
                                        {currentUserID === person.UserID && (
                                            <span className="inline-block mt-0.5 text-[9px] font-bold text-indigo-600 uppercase tracking-wider">
                                                (You)
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Email Container */}
                                <div className="flex items-center gap-2 rounded-xl bg-slate-50/80 px-2.5 py-1.5 border border-slate-100 text-[11px] text-slate-600 group-hover:bg-slate-100/70 transition-colors">
                                    <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <span className="truncate font-medium">{person.Email}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Portal action menu (prevents clipping inside card/list containers) */}
            {isAdmin && actionMenuUserId && actionMenuAnchorRect && typeof document !== 'undefined' && (() => {
                const menuPerson = users.find((u) => String(u.UserID) === String(actionMenuUserId))
                    || filteredUsers.find((u) => String(u.UserID) === String(actionMenuUserId));

                if (!menuPerson) return null;

                const menuWidth = 220;
                const viewportRight = window.innerWidth - 8;
                const left = Math.min((actionMenuAnchorRect.right || 0) - menuWidth + window.scrollX, viewportRight - menuWidth);
                const top = (actionMenuAnchorRect.bottom || 0) + window.scrollY + 8;

                return createPortal(
                    <div
                        className="user-actions-menu"
                        style={{ position: 'fixed', top, left: Math.max(8, left), width: menuWidth, zIndex: 9999 }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-100">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActionMenuUserId(null);
                                    setActionMenuAnchorRect(null);
                                    if (onUserClick) onUserClick(menuPerson);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition whitespace-nowrap"
                            >
                                <svg className="h-4 w-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span>Edit User</span>
                            </button>
                            <button
                                type="button"
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    setActionMenuUserId(null);
                                    setActionMenuAnchorRect(null);
                                    const confirmed = await showConfirm(`Delete user ${menuPerson.FirstName} ${menuPerson.LastName}? This cannot be undone.`);
                                    if (!confirmed) return;
                                    try {
                                        const result = await deleteSelectedUsers([menuPerson.UserID]);
                                        if (result?.success) {
                                            fetchUsers();
                                        } else {
                                            setUsers((prev) => prev.filter((u) => u.UserID !== menuPerson.UserID));
                                            console.warn('Delete user API not available, removed locally');
                                        }
                                    } catch (err) {
                                        console.error('Error deleting user:', err);
                                        setUsers((prev) => prev.filter((u) => u.UserID !== menuPerson.UserID));
                                    }
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 transition whitespace-nowrap"
                            >
                                <svg className="h-4 w-4 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
                                </svg>
                                <span>Delete User</span>
                            </button>
                        </div>
                    </div>,
                    document.body
                );
            })()}
            {viewMode === 'list' && (
                <div className="pt-1">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={(p) => setCurrentPage(p)}
                        fixed={false}
                        showWhenSinglePage={true}
                    />
                </div>
            )}
        </div>
    );
});

export default UsersP;
