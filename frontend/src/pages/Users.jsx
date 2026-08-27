import React, { useEffect, useRef, useState, useCallback } from "react";
import CustomDropdown from "../components/UI/CustomDropdown";
import { useModal } from "../components/UI/ModalProvider";
import UsersP from "../components/UsersProfile/UsersProfle";
import UserEditApproval from "../components/usereditapproval/usereditapproval";

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
    { value: "personnel", label: "Personnel" },
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
    const [deleteMode, setDeleteMode] = useState(false);
    const [selectedCount, setSelectedCount] = useState(0);
    const [selectedIds, setSelectedIds] = useState([]);
    const { showAlert, showConfirm } = useModal();

    const handleSelectionChange = useCallback((count, ids) => {
        setSelectedCount(count);
        setSelectedIds(ids || []);
    }, []);

    const handleDeleteSelected = async () => {
        if (!usersRef.current || selectedIds.length === 0) return;
        const confirmed = await showConfirm(`Delete ${selectedIds.length} selected user(s)? This cannot be undone.`);
        if (!confirmed) return;
        try {
            const result = await usersRef.current.deleteSelected(selectedIds);
            if (result && result.success) {
                setSelectedCount(0);
                setSelectedIds([]);
                setDeleteMode(false);
                // Refresh list
                if (usersRef.current && usersRef.current.refresh) usersRef.current.refresh();
                await showAlert(`Successfully deleted ${selectedIds.length} user(s)`);
            } else {
                await showAlert(result?.message || 'Failed to delete selected users');
            }
        } catch (err) {
            console.error('Error deleting users:', err);
            await showAlert('An error occurred while deleting users');
        }
    };

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
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden px-4 pb-6 pt-2">
                <div className="mb-4 flex flex-col gap-2 relative">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800 mb-1">Personnel Management</h1>
                            <p className="text-xs text-gray-600 ">{deleteMode ? '\u00A0' : 'Manage your system users and assign roles.'}</p>
                        </div>
                        <div className="flex items-center gap-1.5 pt-0.5 self-start sm:self-auto flex-wrap">
                            {deleteMode && (
                                <button
                                    onClick={handleDeleteSelected}
                                    className={`inline-flex h-8 items-center rounded-lg border px-3 text-[11px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-red-400 bg-red-600 text-white hover:bg-red-700 ${selectedCount === 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
                                    disabled={selectedCount === 0}
                                >
                                    Delete Selected ({selectedCount})
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    if (deleteMode) {
                                        setDeleteMode(false);
                                        setSelectedCount(0);
                                        setSelectedIds([]);
                                        return;
                                    }
                                    setDeleteMode(true);
                                    setSelectedCount(0);
                                    setSelectedIds([]);
                                }}
                                className={`inline-flex h-8 items-center rounded-lg border px-3 text-[11px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-red-400 ${deleteMode ? 'border-red-300 bg-red-100 text-red-700 hover:bg-red-200' : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'}`}
                            >
                                {deleteMode ? 'Cancel Delete' : 'Delete'}
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 mt-2 flex-wrap">
                        <div className="relative w-full md:w-64 lg:w-72">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                            >
                                <circle cx="11" cy="11" r="7" />
                                <path d="m20 20-3.5-3.5" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search users, role, or email..."
                                className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            <CustomDropdown
                                value={approvalFilter}
                                onChange={applyApprovalFilter}
                                options={APPROVAL_FILTER_OPTIONS}
                                minWidth="min-w-[140px]"
                                size="sm"
                            />

                            <CustomDropdown
                                value={roleFilter}
                                onChange={applyRoleFilter}
                                options={ROLE_FILTER_OPTIONS}
                                minWidth="min-w-[140px]"
                                size="sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Improved header row & list view with responsive horizontal scroll wrapper */}
                <div className="overflow-x-auto flex-1 min-h-0 flex flex-col">
                    <div className="grid grid-cols-8 gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm text-xs font-semibold text-gray-700 sticky top-0 z-30 min-w-[720px]">
                        <div className="col-span-4 flex items-center">Name</div>
                        <div className="col-span-2 flex items-center justify-center">Role</div>
                        <div className="col-span-1 flex items-center justify-center">Approval Status</div>
                        <div className="col-span-1 flex items-center justify-end">Actions</div>
                    </div>
                    <div className="relative z-10 flex-1 min-h-0 overflow-y-auto pr-1 pb-24 min-w-[720px]">
                        <UsersP 
                            ref={usersRef}
                            searchTerm={searchTerm}
                            filterOptions={filterOptions}
                            onUserClick={handleUserClick}
                            deleteMode={deleteMode}
                            onSelectionChange={handleSelectionChange}
                            viewMode="list"
                        />
                    </div>
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
