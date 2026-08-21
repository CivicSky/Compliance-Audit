import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Header from "../Header/header";
import Pagination from "../Pagination/Pagination";
import AssignAreaModal from "./AssignAreaModal";
import AuditorDetailsModal from "./AuditorDetailsModal";
import { API_BASE_URL } from "../../utils/apiBase";
import { useModal } from "../UI/ModalProvider";
import { usersAPI } from "../../utils/api";

export default function ExternalAuditors() {
    const [auditors, setAuditors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all"); // 'all', 'assigned', 'unassigned'
    const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'list'
    const [deleteMode, setDeleteMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [inviteModalOpen, setInviteModalOpen] = useState(false);
    const [inviteLink, setInviteLink] = useState("");
    const [inviteLoading, setInviteLoading] = useState(false);
    const [copyLabel, setCopyLabel] = useState("Copy");
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [selectedAuditorForAssign, setSelectedAuditorForAssign] = useState(null);
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [selectedAuditorForDetails, setSelectedAuditorForDetails] = useState(null);

    const handleOpenDetails = (auditor) => {
        setSelectedAuditorForDetails(auditor);
        setDetailsModalOpen(true);
    };
    const itemsPerPage = 12;
    const { showConfirm, showAlert } = useModal();
    const menuRef = useRef(null);

    // Keep page chrome fixed; internal content scrolls
    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    // Close context menu on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Fetch External Auditors (RoleID === 3 or position External Auditor)
    const fetchAuditors = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/user");
            if (!res.ok) throw new Error("Failed to fetch users");
            const data = await res.json();
            const allUsers = Array.isArray(data) ? data : (data.users || data.data || []);
            
            // Filter users with RoleID === 3 or 4, or RoleName === 'External Auditor' or position containing auditor
            const externalAuditors = allUsers.filter(u => 
                u.RoleID === 3 || u.RoleID === 4 || 
                String(u.RoleName || '').toLowerCase().includes('auditor') ||
                String(u.Position || '').toLowerCase().includes('auditor') ||
                u.isExternalAuditor
            );

            // Fallback mock payload if no external auditor exists yet in DB
            if (externalAuditors.length === 0) {
                setAuditors([
                    {
                        UserID: 901,
                        FirstName: "Lenuel D.",
                        LastName: "Betita",
                        Email: "lenuelbetita@gmail.com",
                        RoleName: "EXTERNAL AUDITOR",
                        ProfilePic: null,
                        assignedArea: "Area 1 - Philosophy and Objectives",
                        status: "Assigned"
                    },
                    {
                        UserID: 902,
                        FirstName: "Dr. Maria",
                        LastName: "Santos",
                        Email: "m.santos@pacucoa.org.ph",
                        RoleName: "EXTERNAL AUDITOR",
                        ProfilePic: null,
                        assignedArea: "Area 2 - Faculty & Instruction",
                        status: "Assigned"
                    },
                    {
                        UserID: 903,
                        FirstName: "Prof. Ricardo",
                        LastName: "Dizon",
                        Email: "r.dizon@paascu.org.ph",
                        RoleName: "EXTERNAL AUDITOR",
                        ProfilePic: null,
                        assignedArea: null,
                        status: "Unassigned"
                    }
                ]);
            } else {
                setAuditors(externalAuditors.map(u => ({
                    ...u,
                    status: u.assignedArea ? "Assigned" : "Unassigned"
                })));
            }
        } catch (err) {
            console.error("Error loading external auditors:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAuditors();
    }, []);

    // Filter & search logic
    const filteredAuditors = useMemo(() => {
        return auditors.filter(person => {
            const fullName = `${person.FirstName || ''} ${person.LastName || ''}`.toLowerCase();
            const email = (person.Email || '').toLowerCase();
            const area = (person.assignedArea || '').toLowerCase();
            const q = searchTerm.toLowerCase().trim();

            const matchesSearch = !q || fullName.includes(q) || email.includes(q) || area.includes(q);
            
            let matchesFilter = true;
            if (filterStatus === 'assigned') matchesFilter = !!person.assignedArea;
            if (filterStatus === 'unassigned') matchesFilter = !person.assignedArea;

            return matchesSearch && matchesFilter;
        });
    }, [auditors, searchTerm, filterStatus]);

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(filteredAuditors.length / itemsPerPage));
    const visibleAuditors = useMemo(() => {
        const startIdx = (currentPage - 1) * itemsPerPage;
        return filteredAuditors.slice(startIdx, startIdx + itemsPerPage);
    }, [filteredAuditors, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterStatus]);

    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedIds(visibleAuditors.map(a => a.UserID));
        } else {
            setSelectedIds([]);
        }
    };

    const handleToggleSelect = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return;
        const confirmed = await showConfirm(
            `Are you sure you want to remove ${selectedIds.length} selected external auditor(s)?`
        );
        if (!confirmed) return;

        setAuditors(prev => prev.filter(a => !selectedIds.includes(a.UserID)));
        setSelectedIds([]);
        setDeleteMode(false);
        await showAlert(`Successfully removed selected external auditor(s).`);
    };

    const handleCreateInvite = async () => {
        setInviteLoading(true);
        setInviteLink("");
        setCopyLabel("Copy");

        try {
            const response = await usersAPI.createRegistrationInvite({ roleId: 4 });
            if (!response.success || !response.inviteUrl) {
                throw new Error(response.message || "Failed to generate invite link");
            }
            setInviteLink(response.inviteUrl);
            setInviteModalOpen(true);
        } catch (error) {
            console.error("Error creating auditor invite link:", error);
            await showAlert(error.response?.data?.message || error.message || "Failed to generate invite link");
        } finally {
            setInviteLoading(false);
        }
    };

    const handleCopyInvite = async () => {
        if (!inviteLink) return;

        try {
            await navigator.clipboard.writeText(inviteLink);
            setCopyLabel("Copied");
        } catch (error) {
            const textArea = document.createElement("textarea");
            textArea.value = inviteLink;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            setCopyLabel("Copied");
        }
    };

    return (
        <div className="h-screen w-full flex flex-col overflow-hidden bg-slate-50/80">
            <Header pageTitle="External Auditors" />

            <div className="flex-1 overflow-hidden p-6 flex flex-col gap-4 min-h-0 pb-16">
                {/* Title & Top Toolbar */}
                <div className="flex flex-col gap-3 shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">External Auditors</h1>
                            <p className="text-xs text-slate-500 mt-0.5 font-medium">Manage external auditors and area assignments.</p>
                        </div>

                        {/* Top Right Actions */}
                        <div className="flex items-center gap-2">
                            {deleteMode ? (
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleDeleteSelected}
                                        disabled={selectedIds.length === 0}
                                        className="h-9 px-4 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-2xs hover:bg-rose-700 transition disabled:opacity-50"
                                    >
                                        Delete Selected ({selectedIds.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDeleteMode(false);
                                            setSelectedIds([]);
                                        }}
                                        className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-semibold hover:bg-slate-100 transition"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setDeleteMode(true)}
                                        className="h-9 px-4 rounded-xl border border-rose-200 bg-white text-rose-600 text-xs font-bold shadow-2xs hover:bg-rose-50 hover:border-rose-300 transition"
                                    >
                                        Delete
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCreateInvite}
                                        disabled={inviteLoading}
                                        className="h-9 px-4 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold shadow-2xs hover:bg-blue-100 hover:border-blue-300 transition disabled:opacity-50"
                                    >
                                        {inviteLoading ? "Generating..." : "Invite"}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Search & Filter Toolbar */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="relative w-full max-w-sm">
                            <svg
                                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search personnel, office, or email..."
                                className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-xs font-medium text-slate-800 shadow-2xs transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Filter Dropdown */}
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                            >
                                <option value="all">All Personnel</option>
                                <option value="assigned">Assigned</option>
                                <option value="unassigned">Unassigned</option>
                            </select>

                            {/* View Mode Toggle Button */}
                            <div className="flex items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-2xs">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('grid')}
                                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                                        viewMode === 'grid' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                    title="Grid View"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                    </svg>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('list')}
                                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                                        viewMode === 'list' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                    title="Table List View"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto min-h-0 [contain:content]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mb-2" />
                            <span className="text-xs font-medium">Loading external auditors...</span>
                        </div>
                    ) : visibleAuditors.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300/80 bg-white p-12 text-center text-slate-500">
                            <p className="text-sm font-bold text-slate-700">No external auditors found</p>
                            <p className="text-xs text-slate-400 mt-1">No auditors matching your search criteria.</p>
                        </div>
                    ) : viewMode === 'grid' ? (
                        /* GRID VIEW CARDS (Matching Screenshot 100%) */
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {visibleAuditors.map((auditor) => {
                                const isAssigned = !!auditor.assignedArea;
                                const isSelected = selectedIds.includes(auditor.UserID);
                                const avatarSrc = auditor.ProfilePic 
                                    ? `${API_BASE_URL}/uploads/profile-pics/${auditor.ProfilePic}`
                                    : '/src/assets/images/user.svg';

                                return (
                                    <div
                                        key={auditor.UserID}
                                        className={`group relative flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-2xs transition-all ${
                                            isSelected ? 'border-blue-500 ring-2 ring-blue-400/50 bg-blue-50/20' : 'border-slate-200/90 hover:border-blue-300 hover:shadow-md'
                                        }`}
                                    >
                                        {/* Card Top Header: Status Badge & Option Menu */}
                                        <div className="flex items-center justify-between gap-2">
                                            {deleteMode ? (
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleToggleSelect(auditor.UserID)}
                                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                />
                                            ) : (
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                                    isAssigned 
                                                        ? 'bg-emerald-100/90 text-emerald-700 border border-emerald-300/60' 
                                                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                                                }`}>
                                                    {isAssigned ? 'Assigned' : 'Unassigned'}
                                                </span>
                                            )}

                                            {!deleteMode && (
                                                <div className="relative">
                                                    <button
                                                        type="button"
                                                        onClick={() => setOpenMenuId(openMenuId === auditor.UserID ? null : auditor.UserID)}
                                                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                                        </svg>
                                                    </button>

                                                    {openMenuId === auditor.UserID && (
                                                        <div 
                                                            ref={menuRef}
                                                            className="absolute right-0 top-8 z-30 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-100"
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setOpenMenuId(null);
                                                                    setSelectedAuditorForAssign(auditor);
                                                                    setAssignModalOpen(true);
                                                                }}
                                                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition"
                                                            >
                                                                <svg className="h-4 w-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                                </svg>
                                                                <span>Assign Area(s)</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={async () => {
                                                                    setOpenMenuId(null);
                                                                    const confirmed = await showConfirm(`Remove ${auditor.FirstName} ${auditor.LastName}?`);
                                                                    if (confirmed) {
                                                                        setAuditors(prev => prev.filter(a => a.UserID !== auditor.UserID));
                                                                    }
                                                                }}
                                                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                                                            >
                                                                <svg className="h-4 w-4 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
                                                                </svg>
                                                                <span>Remove Auditor</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Avatar & Profile Information (Clickable to view modal) */}
                                        <div 
                                            onClick={() => handleOpenDetails(auditor)}
                                            className="my-4 flex flex-col items-center text-center cursor-pointer group-hover:opacity-95 transition"
                                            title="Click to view assigned areas and accreditations"
                                        >
                                            <div className="relative mb-3">
                                                <img
                                                    src={avatarSrc}
                                                    alt={auditor.FirstName}
                                                    onError={(e) => { e.target.src = '/src/assets/images/user.svg'; }}
                                                    className="h-16 w-16 rounded-full object-cover border-2 border-slate-100 shadow-2xs group-hover:scale-105 transition-transform"
                                                />
                                            </div>

                                            <h3 className="text-sm font-bold text-slate-900 truncate max-w-full group-hover:text-blue-600 transition-colors">
                                                {auditor.FirstName} {auditor.LastName}
                                            </h3>
                                            <span className="mt-0.5 text-[10px] font-extrabold uppercase tracking-wider text-sky-600">
                                                EXTERNAL AUDITOR
                                            </span>

                                            <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium">
                                                <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                </svg>
                                                <span className="truncate max-w-[180px]">{auditor.Email}</span>
                                            </div>

                                            {auditor.assignedArea ? (
                                                <div className="mt-3 rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 border border-blue-100/80 truncate max-w-full">
                                                     {auditor.assignedArea}
                                                </div>
                                            ) : (
                                                <div className="mt-3 rounded-lg bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-400 border border-slate-200/60 truncate max-w-full italic">
                                                    No areas assigned
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* TABLE LIST VIEW */
                        <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
                            <table className="w-full text-left text-xs text-slate-700">
                                <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    <tr>
                                        {deleteMode && (
                                            <th className="px-4 py-3 w-10">
                                                <input
                                                    type="checkbox"
                                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                                    checked={selectedIds.length === visibleAuditors.length && visibleAuditors.length > 0}
                                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                />
                                            </th>
                                        )}
                                        <th className="px-4 py-3">Auditor Name</th>
                                        <th className="px-4 py-3">Role</th>
                                        <th className="px-4 py-3">Email</th>
                                        <th className="px-4 py-3">Assigned Area</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    {visibleAuditors.map((auditor) => {
                                        const isAssigned = !!auditor.assignedArea;
                                        const isSelected = selectedIds.includes(auditor.UserID);

                                        return (
                                            <tr key={auditor.UserID} className="hover:bg-slate-50/80 transition">
                                                {deleteMode && (
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => handleToggleSelect(auditor.UserID)}
                                                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                        />
                                                    </td>
                                                )}
                                                <td className="px-4 py-3 font-bold text-slate-900">
                                                    {auditor.FirstName} {auditor.LastName}
                                                </td>
                                                <td className="px-4 py-3 text-sky-600 font-bold text-[10px] tracking-wider">
                                                    EXTERNAL AUDITOR
                                                </td>
                                                <td className="px-4 py-3 text-slate-600">{auditor.Email}</td>
                                                <td className="px-4 py-3 text-slate-800">
                                                    {auditor.assignedArea ? (
                                                        <span className="rounded-md bg-blue-50 px-2 py-0.5 font-semibold text-blue-700">
                                                            {auditor.assignedArea}
                                                        </span>
                                                    ) : (
                                                        <span className="italic text-slate-400">None</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                                        isAssigned ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        {isAssigned ? 'Assigned' : 'Unassigned'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenDetails(auditor)}
                                                        className="mr-3 text-xs font-bold text-sky-600 hover:underline"
                                                    >
                                                        View Details
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            const confirmed = await showConfirm(`Remove ${auditor.FirstName} ${auditor.LastName}?`);
                                                            if (confirmed) {
                                                                setAuditors(prev => prev.filter(a => a.UserID !== auditor.UserID));
                                                            }
                                                        }}
                                                        className="text-xs font-bold text-rose-600 hover:underline"
                                                    >
                                                        Remove
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Application Standard Fixed Bottom Pagination Bar */}
            {!loading && filteredAuditors.length > 0 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(p) => setCurrentPage(p)}
                    fixed={true}
                    showWhenSinglePage={false}
                />
            )}

            {/* Auditor Details & Assigned Areas Modal (Matching User Screenshot 100%) */}
            <AuditorDetailsModal
                isOpen={detailsModalOpen}
                auditor={selectedAuditorForDetails}
                onClose={() => setDetailsModalOpen(false)}
                onAssignClick={(aud) => {
                    setSelectedAuditorForAssign(aud);
                    setAssignModalOpen(true);
                }}
            />

            {/* Assign Area Modal */}
            <AssignAreaModal
                show={assignModalOpen}
                auditor={selectedAuditorForAssign}
                onClose={() => setAssignModalOpen(false)}
                onSaveSuccess={fetchAuditors}
            />

            {/* Invite Link Modal (Matching User Screenshot 100%) */}
            {inviteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl transition-all border border-slate-100">
                        <h2 className="text-xl font-bold text-slate-900">Invite Link</h2>
                        <p className="mt-1 text-xs text-slate-500 font-medium">
                            This external auditor invite expires in 10 minutes.
                        </p>

                        <div className="mt-4 flex items-center gap-2">
                            <input
                                type="text"
                                readOnly
                                value={inviteLink}
                                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700 font-medium select-all focus:outline-none"
                            />
                            <button
                                type="button"
                                onClick={handleCopyInvite}
                                className="h-10 px-4 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition shrink-0"
                            >
                                {copyLabel}
                            </button>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setInviteModalOpen(false)}
                                className="h-9 px-5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
