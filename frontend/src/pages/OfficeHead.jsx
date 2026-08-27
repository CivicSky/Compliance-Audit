import React, { useState, useRef, useEffect, useCallback } from "react";
import OfficeHeadP from "../components/OfficeHeadP/OfficeHeadP";
import AddOfficeHeadModal from "../components/OfficeHead/AddOfficeHeadModal";
import Sortoffice from "../components/OfficeHead/sorthead";
import { usersAPI } from "../utils/api";
import { useModal } from "../components/UI/ModalProvider";

export default function OfficeHead() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortType, setSortType] = useState('name');
    const [deleteMode, setDeleteMode] = useState(false);
    const [selectedCount, setSelectedCount] = useState(0);
    const [selectedIds, setSelectedIds] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [inviteModalOpen, setInviteModalOpen] = useState(false);
    const [institutionalInviteLink, setInstitutionalInviteLink] = useState("");
    const [standardInviteLink, setStandardInviteLink] = useState("");
    const [institutionalCopied, setInstitutionalCopied] = useState(false);
    const [standardCopied, setStandardCopied] = useState(false);
    const [activeInviteTab, setActiveInviteTab] = useState("institutional");
    const [inviteLoading, setInviteLoading] = useState(false);
    const officePRef = useRef();
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const { showAlert, showConfirm } = useModal();

    // Fetch current user on mount
    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const response = await usersAPI.getLoggedInUser();
                if (response.success) setCurrentUser(response.user);
            } catch (error) {
                console.error('Error fetching current user:', error);
            }
        };
        fetchCurrentUser();
    }, []);

    // Reset all states when component unmounts or navigation happens
    useEffect(() => {
        // Clear any blocking states when component mounts
        setDeleteMode(false);
        setSelectedCount(0);
        setSelectedIds([]);
        
        return () => {
            // Cleanup function
            setDeleteMode(false);
            setSelectedCount(0);
            setSelectedIds([]);
            setIsModalOpen(false);
        };
    }, []);

    // Keep page chrome fixed; list scrolling happens inside the content panel.
    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    const handleSuccess = (newOfficeHead) => {
        console.log('New office head added:', newOfficeHead);
        
        // Refresh the OfficeP component to show the new data
        if (officePRef.current && officePRef.current.refresh) {
            officePRef.current.refresh();
        }
    };

    const handleSearchChange = (term) => {
        setSearchTerm(term);
    };

    const handleSortChange = (type) => {
        setSortType(type);
    };

    const handleDeleteModeToggle = (mode) => {
        setDeleteMode(mode);
        if (!mode) {
            setSelectedCount(0);
            setSelectedIds([]);
        }
    };

    // Memoize handleSelectionChange to prevent infinite loops
    const handleSelectionChange = useCallback((count, ids) => {
        setSelectedCount(count);
        setSelectedIds(ids);
    }, []);

    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0 || !officePRef.current) return;
        
        // Confirm deletion
        const confirmed = await showConfirm(
            `Are you sure you want to delete ${selectedIds.length} office personnel? This action cannot be undone.`
        );
        if (!confirmed) return;
        
        try {
            const result = await officePRef.current.deleteSelected(selectedIds);
            if (result.success) {
                // Reset selection state
                setSelectedCount(0);
                setSelectedIds([]);
                setDeleteMode(false);
                // Show success message
                console.log('Successfully deleted selected office heads');
                await showAlert(`Successfully deleted ${selectedIds.length} office personnel`);
            } else {
                // Show error message
                console.error('Failed to delete office heads:', result.message);
                await showAlert(result.message || 'Failed to delete office personnel');
            }
        } catch (error) {
            console.error('Error deleting office heads:', error);
            await showAlert('An error occurred while deleting office personnel');
        }
    };

    const handleCreateInvite = async () => {
        setInviteLoading(true);
        setInstitutionalInviteLink("");
        setStandardInviteLink("");
        setInstitutionalCopied(false);
        setStandardCopied(false);

        try {
            const [instRes, stdRes] = await Promise.all([
                usersAPI.createRegistrationInvite({ roleId: 3, allowAnyEmail: false }),
                usersAPI.createRegistrationInvite({ roleId: 3, allowAnyEmail: true })
            ]);

            if (!instRes.success || !instRes.inviteUrl) {
                throw new Error(instRes.message || "Failed to generate institutional invite link");
            }
            if (!stdRes.success || !stdRes.inviteUrl) {
                throw new Error(stdRes.message || "Failed to generate standard invite link");
            }

            setInstitutionalInviteLink(instRes.inviteUrl);
            setStandardInviteLink(stdRes.inviteUrl);
            setInviteModalOpen(true);
        } catch (error) {
            console.error("Error creating invite links:", error);
            await showAlert(error.response?.data?.message || error.message || "Failed to generate invite links");
        } finally {
            setInviteLoading(false);
        }
    };

    const handleCopyInvite = async (link, type) => {
        if (!link) return;

        try {
            await navigator.clipboard.writeText(link);
            if (type === 'institutional') setInstitutionalCopied(true);
            else setStandardCopied(true);
            setTimeout(() => {
                if (type === 'institutional') setInstitutionalCopied(false);
                else setStandardCopied(false);
            }, 2500);
        } catch (error) {
            const textArea = document.createElement("textarea");
            textArea.value = link;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            if (type === 'institutional') setInstitutionalCopied(true);
            else setStandardCopied(true);
            setTimeout(() => {
                if (type === 'institutional') setInstitutionalCopied(false);
                else setStandardCopied(false);
            }, 2500);
        }
    };

    return (
        <div className="h-screen w-full flex flex-col overflow-hidden">
            {/* Control panel and header label fixed at the top, cards area scrollable */}
            <div className="flex-1 min-h-0 flex flex-col px-4 pb-6 pt-2 bg-gray-100">
                {/* Control panel (title, search, filters, buttons) */}
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
                                className={`inline-flex h-8 items-center rounded-lg border px-3 text-[11px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-red-400 ${
                                    deleteMode
                                        ? 'border-red-300 bg-red-100 text-red-700 hover:bg-red-200'
                                        : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                                }`}
                            >
                                {deleteMode ? 'Cancel Delete' : 'Delete'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(true)}
                                className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-[11px] font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                            >
                                <span className="text-sm leading-none">+</span>
                                Add
                            </button>
                            <button
                                type="button"
                                onClick={handleCreateInvite}
                                disabled={inviteLoading}
                                className={`inline-flex h-8 items-center rounded-lg border px-3 text-[11px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    inviteLoading
                                        ? "cursor-not-allowed border-blue-200 bg-blue-100 text-blue-500"
                                        : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                                }`}
                            >
                                {inviteLoading ? "Generating..." : "Invite"}
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
                                placeholder="Search personnel, office, or email..."
                                className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="relative inline-block">
                                <Sortoffice value={sortType} onChange={setSortType} />
                            </div>
                            <div className="flex items-center">
                                <div className="flex h-7 items-center gap-0.5 rounded-md border border-slate-200 bg-slate-100 p-0.5">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
                                            viewMode === 'grid'
                                                ? 'bg-white text-indigo-600'
                                                : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                        title="Grid View"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
                                            viewMode === 'list'
                                                ? 'bg-white text-indigo-600'
                                                : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                        title="List View"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Sticky header row for list view with responsive horizontal scroll wrapper */}
                <div className={`relative z-10 flex-1 min-h-0 ${viewMode === 'list' ? 'overflow-y-auto pr-1' : 'overflow-hidden'} overflow-x-auto`}>
                    {viewMode === 'list' && (
                        <div
                            className="grid grid-cols-8 gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm text-xs font-semibold text-gray-700 sticky z-30 min-w-[720px]"
                            style={{ top: 0, marginBottom: 0, zIndex: 3 }}
                        >
                            <div className="col-span-4 flex items-center">Name</div>
                            <div className="col-span-2 flex items-center justify-center">Role</div>
                            <div className="col-span-1 flex items-center justify-center">Status</div>
                            <div className="col-span-1 flex items-center justify-end">Actions</div>
                        </div>
                    )}
                    <div className={`${viewMode === 'list' ? 'flex flex-col gap-0 min-w-[720px]' : ''}`}>
                        <OfficeHeadP 
                            ref={officePRef} 
                            searchTerm={searchTerm} 
                            sortType={sortType}
                            deleteMode={deleteMode}
                            viewMode={viewMode}
                            onSelectionChange={handleSelectionChange}
                        />
                    </div>
                </div>
            </div>
            {/* Modal */}
            {isModalOpen && (
                <AddOfficeHeadModal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handleSuccess}
                />
            )}
            {inviteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs px-4">
                    <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-start justify-between gap-3 mb-4">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Personnel Registration Invites</h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Generated links expire in 10 minutes. Choose the appropriate invite link below.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setInviteModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* 1. Institutional Invite (@lccbonline.edu.ph) */}
                            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-blue-900">🏛️ Institutional Invite</span>
                                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200">
                                            @lccbonline.edu.ph required
                                        </span>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-600 mb-2.5">
                                    Enforces registration exclusively with official school accounts ending with <strong>@lccbonline.edu.ph</strong>.
                                </p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={institutionalInviteLink}
                                        className="h-9 min-w-0 flex-1 rounded-lg border border-blue-200 bg-white px-3 text-xs text-slate-700 shadow-2xs select-all font-mono"
                                        onFocus={(event) => event.target.select()}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleCopyInvite(institutionalInviteLink, 'institutional')}
                                        className={`h-9 px-3.5 rounded-lg text-xs font-semibold transition shadow-2xs flex items-center gap-1.5 ${
                                            institutionalCopied
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                                        }`}
                                    >
                                        {institutionalCopied ? '✓ Copied' : 'Copy Link'}
                                    </button>
                                </div>
                            </div>

                            {/* 2. Standard / External Email Invite (Bypasses @lccbonline for testing & external accounts) */}
                            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-amber-950">🌐 Standard Email Invite</span>
                                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                                            Any Email (Gmail / Testing)
                                        </span>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-600 mb-2.5">
                                    Bypasses the institutional domain check. Allows personnel to register with any valid email (e.g. Gmail, Yahoo, personal email).
                                </p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={standardInviteLink}
                                        className="h-9 min-w-0 flex-1 rounded-lg border border-amber-200 bg-white px-3 text-xs text-slate-700 shadow-2xs select-all font-mono"
                                        onFocus={(event) => event.target.select()}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleCopyInvite(standardInviteLink, 'standard')}
                                        className={`h-9 px-3.5 rounded-lg text-xs font-semibold transition shadow-2xs flex items-center gap-1.5 ${
                                            standardCopied
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-amber-600 hover:bg-amber-700 text-white'
                                        }`}
                                    >
                                        {standardCopied ? '✓ Copied' : 'Copy Link'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setInviteModalOpen(false)}
                                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
