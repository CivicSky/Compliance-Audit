import React, { useEffect, useRef, useState } from "react";
import Header from "../Header/header";
import UsersP from "../UsersProfile/UsersProfle";
import UserEditApproval from "../usereditapproval/usereditapproval";

const APPROVAL_FILTER_OPTIONS = [
    { value: "all", label: "All Personnel" },
    { value: "approved", label: "Approved" },
    { value: "pending", label: "Pending" },
    { value: "denied", label: "Denied" },
];

const ROLE_FILTER_OPTIONS = [
    { value: "all", label: "All Roles" },
    { value: "admin", label: "Admin" },
    { value: "user", label: "User" },
    { value: "office head", label: "Office Head" },
];

export default function Users() {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterOptions, setFilterOptions] = useState({
        approvalStatus: [],
        roles: []
    });
    const [approvalFilter, setApprovalFilter] = useState('all');
    const [roleFilter, setRoleFilter] = useState('all');
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [showRoleDropdown, setShowRoleDropdown] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const usersRef = useRef();
    const filterDropdownRef = useRef(null);
    const roleDropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                showFilterDropdown &&
                filterDropdownRef.current &&
                !filterDropdownRef.current.contains(event.target)
            ) {
                setShowFilterDropdown(false);
            }

            if (
                showRoleDropdown &&
                roleDropdownRef.current &&
                !roleDropdownRef.current.contains(event.target)
            ) {
                setShowRoleDropdown(false);
            }

        };

        const handleEscapeKey = (event) => {
            if (event.key === 'Escape') {
                setShowFilterDropdown(false);
                setShowRoleDropdown(false);
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscapeKey);
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [showFilterDropdown, showRoleDropdown]);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    const applyApprovalFilter = (value) => {
        setApprovalFilter(value);
        setFilterOptions((prev) => ({
            ...prev,
            approvalStatus: value === 'all' ? [] : [value],
        }));
    };

    const applyRoleFilter = (value) => {
        setRoleFilter(value);
        setFilterOptions((prev) => ({
            ...prev,
            roles: value === 'all' ? [] : [value],
        }));
    };

    const handleUserClick = (user) => {
        setSelectedUser(user);
        setShowApprovalModal(true);
    };

    const handleCloseModal = () => {
        setShowApprovalModal(false);
        setSelectedUser(null);
    };

    const handleUpdateSuccess = () => {
        // Refresh users list
        if (usersRef.current && usersRef.current.refresh) {
            usersRef.current.refresh();
        }
    };

    return (
        <div className="h-screen w-full flex flex-col overflow-hidden">
            <Header />

            <div className="flex-1 min-h-0 flex flex-col overflow-hidden px-4 pb-6 pt-6">
                <div className="mb-4 flex flex-col gap-2 relative">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 mb-1">Users</h1>
                        <p className="text-xs text-gray-600">Manage user approvals and account roles.</p>
                    </div>

                    <div className="flex w-full items-center justify-between gap-1">
                        <div className="relative w-full max-w-sm">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                                >
                                    <circle cx="11" cy="11" r="7" />
                                    <path d="m20 20-3.5-3.5" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search users, role, or email..."
                                    className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-[9px] text-slate-700 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                        </div>

                        <div className="flex items-center gap-1">
                            <div className="flex h-9 items-center justify-end gap-1">
                            <div className="relative inline-block" ref={filterDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setShowFilterDropdown((prev) => !prev)}
                                    className="flex h-7 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-[8px] text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    title="Filter users by approval status"
                                    style={{ width: '140px' }}
                                >
                                    <span className="flex items-center justify-center gap-1 whitespace-nowrap overflow-hidden">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 flex-shrink-0 text-slate-600" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M3 5a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-.293.707L12 13.414V17a1 1 0 01-1.447.894L7 15H4a1 1 0 01-1-1V5z" />
                                        </svg>
                                        <span className="font-normal">
                                            {APPROVAL_FILTER_OPTIONS.find((opt) => opt.value === approvalFilter)?.label || 'All Personnel'}
                                        </span>
                                    </span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="ml-1 h-2.5 w-2.5 flex-shrink-0 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                                    </svg>
                                </button>

                                {showFilterDropdown && (
                                    <div className="absolute right-0 z-30 mt-2 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                                        {APPROVAL_FILTER_OPTIONS.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => {
                                                    applyApprovalFilter(option.value);
                                                    setShowFilterDropdown(false);
                                                }}
                                                className={`w-full px-2.5 py-1.5 text-center text-[8px] transition ${approvalFilter === option.value ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50'}`}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="relative inline-block" ref={roleDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setShowRoleDropdown((prev) => !prev)}
                                    className="flex h-7 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-[8px] text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    title="Filter users by role"
                                    style={{ width: '128px' }}
                                >
                                    <span className="flex items-center justify-center gap-1 whitespace-nowrap overflow-hidden">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 flex-shrink-0 text-slate-600" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M10 2a4 4 0 100 8 4 4 0 000-8zM3 17a7 7 0 1114 0H3z" />
                                        </svg>
                                        <span className="font-normal">
                                            {ROLE_FILTER_OPTIONS.find((opt) => opt.value === roleFilter)?.label || 'All Roles'}
                                        </span>
                                    </span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="ml-1 h-2.5 w-2.5 flex-shrink-0 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                                    </svg>
                                </button>

                                {showRoleDropdown && (
                                    <div className="absolute right-0 z-30 mt-2 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                                        {ROLE_FILTER_OPTIONS.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => {
                                                    applyRoleFilter(option.value);
                                                    setShowRoleDropdown(false);
                                                }}
                                                className={`w-full px-2.5 py-1.5 text-center text-[8px] transition ${roleFilter === option.value ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50'}`}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 flex-1 min-h-0 overflow-y-auto pr-1">
                    <UsersP 
                        ref={usersRef}
                        searchTerm={searchTerm}
                        filterOptions={filterOptions}
                        onUserClick={handleUserClick}
                        viewMode="list"
                    />
                </div>
            </div>

            {/* Approval Status Modal Component */}
            {showApprovalModal && selectedUser && (
                <UserEditApproval 
                    selectedUser={selectedUser}
                    onClose={handleCloseModal}
                    onSuccess={handleUpdateSuccess}
                />
            )}
        </div>
    );
}



