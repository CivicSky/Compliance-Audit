import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { officesAPI, requirementsAPI, usersAPI } from "../../utils/api";
import userIcon from "../../assets/images/user.svg";
import Pagination from "../Pagination/Pagination";

const OfficesP = forwardRef(
    ({ searchTerm, deleteMode, onSelectionChange, onOfficeClick, onEditOffice, onAddRequirements, onDeleteOffice, eventType, officeTypes, heads, viewMode = 'grid', sortStatus, highlightOfficeId = null }, ref) => {
        const [offices, setOffices] = useState([]);
        const [selectedIds, setSelectedIds] = useState([]);
        const [loading, setLoading] = useState(true);
        const [openMenuOfficeId, setOpenMenuOfficeId] = useState(null);
        const [activeHighlightOfficeId, setActiveHighlightOfficeId] = useState(null);
        const [myAssignedOfficeCounts, setMyAssignedOfficeCounts] = useState({});
        const [currentUser, setCurrentUser] = useState(null);

        const isAdmin = currentUser?.RoleName === 'admin' || currentUser?.RoleID === 1;

        // Fetch offices from backend
        const fetchOffices = async () => {
            try {
                setLoading(true);
                const [res, myAssignmentsRes] = await Promise.all([
                    officesAPI.getAll(),
                    requirementsAPI.getMyAssignments().catch(() => null),
                ]);

                const officesData = Array.isArray(res) ? res : (res && res.data) || [];
                const assignmentRows = Array.isArray(myAssignmentsRes?.data) ? myAssignmentsRes.data : [];
                const countsByOffice = assignmentRows.reduce((acc, row) => {
                    const officeId = String(row?.OfficeID ?? '');
                    if (!officeId) return acc;
                    acc[officeId] = (acc[officeId] || 0) + 1;
                    return acc;
                }, {});

                setOffices(officesData);
                setMyAssignedOfficeCounts(countsByOffice);
                setSelectedIds([]);
            } catch (err) {
                console.error("Failed to load offices:", err);
                setOffices([]);
                setMyAssignedOfficeCounts({});
            } finally {
                setLoading(false);
            }
        };

        // Expose refresh + delete via ref
        useImperativeHandle(ref, () => ({
            refresh: fetchOffices,
            deleteSelected: async (ids) => {
                try {
                    for (let id of ids) await officesAPI.deleteOffice(id);
                    fetchOffices();
                    return { success: true };
                } catch (err) {
                    console.error(err);
                    return { success: false, message: err.message };
                }
            },
            clearSelection: () => setSelectedIds([]),
            openOfficeById: (officeId, options = {}) => {
                const targetId = String(officeId || '');
                if (!targetId) return false;

                const targetIndex = filtered.findIndex(
                    (office) => String(office?.id ?? office?.OfficeID ?? '') === targetId
                );

                if (targetIndex === -1) return false;

                const targetOffice = filtered[targetIndex];
                const targetPage = Math.floor(targetIndex / itemsPerPage) + 1;

                setCurrentPage(targetPage);
                setActiveHighlightOfficeId(targetId);

                setTimeout(() => {
                    setActiveHighlightOfficeId((prev) => (prev === targetId ? null : prev));
                }, 5000);

                if (options?.openModal !== false && typeof onOfficeClick === 'function') {
                    onOfficeClick(targetOffice);
                }

                return true;
            },
        }));

        // Clear selection when deleteMode is turned off
        useEffect(() => {
            if (!deleteMode) setSelectedIds([]);
        }, [deleteMode]);

        useEffect(() => {
            if (!openMenuOfficeId) return;

            const handleOutsideClick = (event) => {
                const target = event.target;
                if (target.closest('.office-card-actions-menu') || target.closest('.office-card-actions-button')) {
                    return;
                }

                setOpenMenuOfficeId(null);
            };

            document.addEventListener('mousedown', handleOutsideClick);
            return () => document.removeEventListener('mousedown', handleOutsideClick);
        }, [openMenuOfficeId]);

        useEffect(() => {
            const nextId = highlightOfficeId ? String(highlightOfficeId) : null;
            if (!nextId) return;

            setActiveHighlightOfficeId(nextId);
            const timer = setTimeout(() => {
                setActiveHighlightOfficeId((prev) => (prev === nextId ? null : prev));
            }, 5000);

            return () => clearTimeout(timer);
        }, [highlightOfficeId]);

        // Load on mount
        useEffect(() => {
            fetchOffices();
            // fetch current user for permission checks
            const fetchCurrentUser = async () => {
                try {
                    const res = await usersAPI.getLoggedInUser().catch(() => null);
                    if (res && res.success) setCurrentUser(res.user);
                } catch (err) {
                    console.error('Failed to load current user:', err);
                }
            };
            fetchCurrentUser();
        }, []);

        // Notify parent when selected changes
        useEffect(() => {
            onSelectionChange(selectedIds.length, selectedIds);
        }, [selectedIds, onSelectionChange]);

        const handleCheckboxChange = (id, checked) => {
            if (checked) setSelectedIds([...selectedIds, id]);
            else setSelectedIds(selectedIds.filter((i) => i !== id));
        };

        const handleExportOffice = async (office) => {
            try {
                const officeId = office?.id || office?.OfficeID;
                if (!officeId) return;

                const officeName = office?.office_name || office?.OfficeName || `office-${officeId}`;
                const { url, fileName } = await officesAPI.exportOfficeExcel(officeId, officeName);

                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                setTimeout(() => {
                    window.URL.revokeObjectURL(url);
                }, 200);
            } catch (err) {
                console.error('Failed to export office:', err);
                alert(err?.response?.data?.message || err?.message || 'Failed to export office data.');
            }
        };

        // Get status badge style
        const getStatusStyle = (status) => {
            switch(status) {
                case 'Complied':
                    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
                case 'Partially Complied':
                    return 'bg-amber-50 text-amber-700 border-amber-200';
                default:
                    return 'bg-rose-50 text-rose-700 border-rose-200';
            }
        };

        const getStatusDot = (status) => {
            switch(status) {
                case 'Complied': return 'bg-emerald-500';
                case 'Partially Complied': return 'bg-amber-500';
                default: return 'bg-rose-500';
            }
        };

        // Search filter
        const filteredBySearch = offices.filter((o) => {
            const officeName = (o.office_name || '').toLowerCase();
            const headName = (o.head_name || 'unassigned').toLowerCase();
            const officeType = (o.office_type_name || '').toLowerCase();
            const search = searchTerm.toLowerCase();
            
            return officeName.includes(search) || 
                   headName.includes(search) || 
                   officeType.includes(search);
        });

        // Filter by event type
        const filteredByEvent = eventType
            ? filteredBySearch.filter((o) => String(o.event_id) === String(eventType))
            : filteredBySearch;

        // Normalize office overall_status to keys: 'compiled', 'partially_compiled', 'not_compiled'
        const getStatusKey = (status) => {
            const s = (status || '').toLowerCase().trim();
            // common variations from DB: 'Complied', 'Partially Complied', 'Not Complied',
            // also handle phrases like 'Partially Complied - 50%' or 'Not yet complied'
            if (!s) return 'not_compiled';
            if (s.includes('partial') || s.includes('partially')) return 'partially_compiled';
            if (s.includes('not') || s.includes("n't") || s.includes('incomplete') || s.includes('pending') || s.includes('un') || s.includes('no')) return 'not_compiled';
            if (s.includes('complied') || s.includes('compiled') || s.includes('complete') || s.includes('done') || s.includes('passed') || s.includes('yes')) return 'compiled';
            // fallback heuristics
            if (s.includes('comp')) return 'compiled';
            if (s.includes('part')) return 'partially_compiled';
            return 'not_compiled';
        };

        // Debug: log distinct overall_status values once so we can adapt matching if needed
        useEffect(() => {
            if (!offices || offices.length === 0) return;
            const statuses = Array.from(new Set(offices.map(o => (o.overall_status || '').toString()))).slice(0, 50);
            console.debug('OfficesP: distinct overall_status values:', statuses);
        }, [offices]);

        // Filter by compile status if provided (compiled / partially_compiled / not_compiled)
        // Treat 'all' as no filter
        const filtered = (sortStatus && sortStatus !== 'all')
            ? filteredByEvent.filter((o) => getStatusKey(o.overall_status) === sortStatus)
            : filteredByEvent;

        // Pagination
        const [currentPage, setCurrentPage] = useState(1);
        const itemsPerPage = 6; // 3 columns x 2 rows
        const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
        const startIdx = (currentPage - 1) * itemsPerPage;
        const paginated = filtered.slice(startIdx, startIdx + itemsPerPage);

        useEffect(() => {
            if (currentPage > totalPages) setCurrentPage(1);
        }, [filtered.length, totalPages]);

        if (loading) {
            return (
                <div className="w-full py-12">
                    <div className="flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
                        <span className="mt-3 text-sm text-gray-500">Loading office operations...</span>
                    </div>
                </div>
            );
        }

        if (filtered.length === 0) {
            return (
                <div className="w-full py-12">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center">
                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <h3 className="text-sm font-medium text-gray-900 mb-1">No matching offices</h3>
                        <p className="text-xs text-gray-500">
                            {searchTerm ? 'Try broadening your search terms.' : 'No offices are assigned to the selected event yet.'}
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-2 relative pb-4">
                {/* Grid View */}
                {viewMode === 'grid' && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-3">
                        {paginated.map((office) => {
                            const officeId = String(office?.id ?? office?.OfficeID ?? '');
                            const officeHeads = office.heads || [];
                            const compliancePercent = Math.max(0, Math.min(100, Number(office.compliance_percent || 0)));
                            const statusLabel = office.overall_status === 'Partially Complied' ? 'Partial' : office.overall_status;

                            const isSelected = selectedIds.includes(office.id);
                            const isHighlighted = officeId && officeId === String(activeHighlightOfficeId || '');
                            const isAssignedToMe = (myAssignedOfficeCounts[officeId] || 0) > 0;

                            return (
                                <div
                                    key={office.id}
                                    onClick={() => !deleteMode && onOfficeClick(office)}
                                    className={`
                                        relative min-h-[190px] overflow-visible rounded-2xl border transition-all duration-200
                                        ${deleteMode 
                                            ? 'border-gray-200 hover:border-gray-300' 
                                            : 'border-gray-100 hover:border-cyan-200 hover:shadow-[0_14px_28px_rgba(15,23,42,0.12)] cursor-pointer'
                                        }
                                        ${isAssignedToMe ? 'border-cyan-400 bg-cyan-50/40 ring-1 ring-cyan-200' : ''}
                                        ${isSelected ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/30' : 'bg-white'}
                                        ${isHighlighted ? 'ring-2 ring-cyan-500 border-cyan-300 shadow-[0_0_0_3px_rgba(6,182,212,0.15)]' : ''}
                                    `}
                                >
                                    <div className="h-full p-2 rounded-2xl overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/60 flex flex-col">
                                        {/* Header */}
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <div className="min-w-0 flex items-start gap-2.5">
                                                <div
                                                    className={`flex h-7 items-center justify-center overflow-hidden transition-all duration-200 ${deleteMode ? 'w-5 opacity-100' : 'w-0 opacity-0'}`}
                                                    aria-hidden={!deleteMode}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) => {
                                                            e.stopPropagation();
                                                            handleCheckboxChange(office.id, e.target.checked);
                                                        }}
                                                        className="h-3.5 w-3.5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                                        aria-label="Select office for deletion"
                                                    />
                                                </div>

                                                <div className="mt-0.5 h-8 w-8 flex-shrink-0 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                    </svg>
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className={`text-[15px] font-semibold text-slate-900 truncate transition-transform duration-200 ${deleteMode ? 'translate-x-1' : 'translate-x-0'}`}>
                                                        {office.office_name}
                                                    </h3>
                                                    <p className="mt-0.5 text-[11px] text-slate-500 truncate">
                                                        {office.event_name || office.EventName || 'No event'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-1.5">
                                                <span className="px-2 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 shrink-0">
                                                    {office.office_type_name}
                                                </span>

                                                {!deleteMode && isAdmin && (
                                                    <div className="relative">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setOpenMenuOfficeId((prev) => (prev === office.id ? null : office.id));
                                                            }}
                                                            className="office-card-actions-button inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
                                                            aria-label="Open office actions"
                                                        >
                                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6h.01M12 12h.01M12 18h.01" />
                                                            </svg>
                                                        </button>

                                                        {openMenuOfficeId === office.id && (
                                                            <div className="office-card-actions-menu absolute right-0 top-8 z-30 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setOpenMenuOfficeId(null);
                                                                        onEditOffice?.(office);
                                                                    }}
                                                                    className="w-full px-3 py-2 text-left text-xs text-slate-700 transition hover:bg-slate-50"
                                                                >
                                                                    Edit Office Info
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setOpenMenuOfficeId(null);
                                                                        onAddRequirements?.(office);
                                                                    }}
                                                                    className="w-full px-3 py-2 text-left text-xs text-slate-700 transition hover:bg-slate-50"
                                                                >
                                                                    Add Requirements
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        setOpenMenuOfficeId(null);
                                                                        await handleExportOffice(office);
                                                                    }}
                                                                    className="w-full px-3 py-2 text-left text-xs text-slate-700 transition hover:bg-slate-50"
                                                                >
                                                                    Export Excel
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        setOpenMenuOfficeId(null);
                                                                        await onDeleteOffice?.(office);
                                                                    }}
                                                                    className="w-full px-3 py-2 text-left text-xs text-red-600 transition hover:bg-red-50"
                                                                >
                                                                    Delete Office
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Requirement and status */}
                                        <div className="rounded-xl border border-slate-200 bg-white/80 px-2.5 py-1 mb-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-slate-500">
                                                    {office.total_requirements || 0} requirements
                                                </span>
                                                <span className={`
                                                    inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border
                                                    ${getStatusStyle(office.overall_status)}
                                                `}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(office.overall_status)}`}></span>
                                                    {statusLabel}
                                                </span>
                                            </div>
                                            <div className="mt-2">
                                                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                                                    <span>Compliance</span>
                                                    <span className="font-semibold text-slate-700">{compliancePercent.toFixed(0)}%</span>
                                                </div>
                                                <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500"
                                                        style={{ width: `${compliancePercent}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Personnel Section */}
                                        <div className="mt-auto border-t border-gray-100 pt-1">
                                            <p className="text-xs font-semibold text-slate-600 mb-2">Personnel</p>
                                            
                                            {officeHeads.length === 0 ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                                                        <img src={userIcon} alt="Unassigned" className="w-6 h-6 opacity-50" />
                                                    </div>
                                                    <span className="text-xs text-gray-400">Unassigned</span>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            {officeHeads.map((head) => {
                                                                const headPicUrl = head.ProfilePic
                                                                    ? `http://localhost:5000/uploads/profile-pics/${head.ProfilePic}`
                                                                    : userIcon;
                                                                return (
                                                                    <div key={head.HeadID} className="group relative">
                                                                        <img
                                                                            src={headPicUrl}
                                                                            alt={head.full_name}
                                                                            className="h-7 w-7 rounded-full object-cover border-2 border-white shadow-sm"
                                                                            onError={(e) => { e.target.src = userIcon; }}
                                                                        />
                                                                        <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow transition-opacity duration-150 group-hover:opacity-100">
                                                                            {head.full_name}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        <span className="text-xs font-medium text-slate-600">
                                                            {officeHeads.length}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 truncate" title={officeHeads.map((h) => h.full_name).join(', ')}>
                                                        {officeHeads.map((h) => h.full_name.split(' ')[0]).join(', ')}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                    </div>
                                </div>
                            );
                        })}
                        </div>
                    </>
                )}

                {/* List View */}
                {viewMode === 'list' && (
                    <>
                        <div className="space-y-2">
                        {paginated.map((office) => {
                            const officeHeads = office.heads || [];
                            const primaryHead = officeHeads[0];
                            const officeId = String(office?.id ?? office?.OfficeID ?? '');
                            const profilePicUrl = primaryHead?.ProfilePic 
                                ? `http://localhost:5000/uploads/profile-pics/${primaryHead.ProfilePic}`
                                : (office.head_profile_pic 
                                    ? `http://localhost:5000/uploads/profile-pics/${office.head_profile_pic}`
                                    : userIcon);

                            const isSelected = selectedIds.includes(office.id);
                            const isHighlighted = officeId && officeId === String(activeHighlightOfficeId || '');
                            const isAssignedToMe = (myAssignedOfficeCounts[officeId] || 0) > 0;

                            return (
                                <div
                                    key={office.id}
                                    onClick={() => !deleteMode && onOfficeClick(office)}
                                    className={`
                                        bg-white rounded-lg border transition-all duration-200
                                        ${deleteMode 
                                            ? 'border-gray-200 hover:border-gray-300' 
                                            : 'border-gray-100 hover:border-indigo-200 hover:shadow-sm cursor-pointer'
                                        }
                                        ${isAssignedToMe ? 'border-cyan-400 bg-cyan-50/40 ring-1 ring-cyan-200' : ''}
                                        ${isSelected ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/30' : ''}
                                        ${isHighlighted ? 'ring-2 ring-cyan-500 border-cyan-300 bg-cyan-50/40' : ''}
                                    `}
                                >
                                    <div className="px-4 py-3 rounded-lg overflow-hidden">
                                        <div className="flex items-center gap-4">
                                            {/* Office Icon */}
                                            <div className="flex-shrink-0 w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                                                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                </svg>
                                            </div>

                                            {/* Office Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-sm font-medium text-gray-900">
                                                        {office.office_name}
                                                    </h3>
                                                    <span className="px-2 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-full">
                                                        {office.office_type_name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-xs text-gray-500">
                                                        {office.total_requirements || 0} requirements
                                                    </span>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusStyle(office.overall_status)}`}>
                                                        <span className={`w-1 h-1 rounded-full ${getStatusDot(office.overall_status)}`}></span>
                                                        {office.overall_status}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Personnel */}
                                            <div className="flex items-center gap-2">
                                                {officeHeads.length > 0 ? (
                                                    <>
                                                        <div className="flex items-center gap-1">
                                                            {officeHeads.slice(0, 3).map((head) => (
                                                                <img
                                                                    key={head.HeadID}
                                                                    src={head.ProfilePic ? `http://localhost:5000/uploads/profile-pics/${head.ProfilePic}` : userIcon}
                                                                    alt={head.full_name}
                                                                    className="w-6 h-6 rounded-full object-cover border-2 border-white"
                                                                    onError={(e) => { e.target.src = userIcon; }}
                                                                />
                                                            ))}
                                                        </div>
                                                        <span className="text-xs text-gray-500">
                                                            {officeHeads.length}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-gray-400">No personnel</span>
                                                )}
                                            </div>

                                            {!deleteMode && isAdmin && (
                                                <div className="relative">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenuOfficeId((prev) => (prev === office.id ? null : office.id));
                                                        }}
                                                        className="office-card-actions-button inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
                                                        aria-label="Open office actions"
                                                    >
                                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6h.01M12 12h.01M12 18h.01" />
                                                        </svg>
                                                    </button>

                                                    {openMenuOfficeId === office.id && (
                                                        <div className="office-card-actions-menu absolute right-0 top-8 z-30 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setOpenMenuOfficeId(null);
                                                                    onEditOffice?.(office);
                                                                }}
                                                                className="w-full px-3 py-2 text-left text-xs text-slate-700 transition hover:bg-slate-50"
                                                            >
                                                                Edit Office Info
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setOpenMenuOfficeId(null);
                                                                    onAddRequirements?.(office);
                                                                }}
                                                                className="w-full px-3 py-2 text-left text-xs text-slate-700 transition hover:bg-slate-50"
                                                            >
                                                                Add Requirements
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    setOpenMenuOfficeId(null);
                                                                    await handleExportOffice(office);
                                                                }}
                                                                className="w-full px-3 py-2 text-left text-xs text-slate-700 transition hover:bg-slate-50"
                                                            >
                                                                Export Excel
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    setOpenMenuOfficeId(null);
                                                                    await onDeleteOffice?.(office);
                                                                }}
                                                                className="w-full px-3 py-2 text-left text-xs text-red-600 transition hover:bg-red-50"
                                                            >
                                                                Delete Office
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Delete Checkbox */}
                                            {deleteMode && (
                                                <div className="flex-shrink-0">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            e.stopPropagation();
                                                            handleCheckboxChange(office.id, e.target.checked);
                                                        }}
                                                        className="w-3.5 h-3.5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        </div>
                    </>
                )}

                {/* Pagination controls */}
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => setCurrentPage(p)} fixed={true} showWhenSinglePage={true} />
            </div>
        );
    }
);

export default OfficesP;