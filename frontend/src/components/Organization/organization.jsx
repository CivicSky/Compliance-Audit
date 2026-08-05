import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import Sortoffice from "./sortoffice";
import EventsAddDelete from "../ALLC/eventsadddelete";
import EventTabs from "./EventTabs";
import OfficeAddDelete from "./officeadddelete";
import AddEventModal from "../AddEvent/AddEventModal";
import { officesAPI, officeHeadsAPI, officetypesAPI, eventsAPI, usersAPI } from "../../utils/api";
import OfficesP from "../../components/OfficesP/OfficesP";
import AddOfficeModal from "../../components/AddOffice/AddOfficeModal";
import EditOfficeModal from "../../components/EditOffice/EditOfficeModal";
import ViewReqPasscuModal from "../../components/ViewReqPasscuModal/ViewReqPasscuModal";
import ViewReqPASSCUModal from "../../components/ViewReqPASSCUModal/ViewReqPASSCUModal";
import AddReqOffModal from "../../components/AddReqOffModal/AddReqOffModal";
import { useModal } from "../UI/ModalProvider";

const normalizeOfficeRecord = (office) => {
    if (!office) return null;
    return {
        ...office,
        id: office.id ?? office.OfficeID,
        OfficeID: office.OfficeID ?? office.id,
        office_name: office.office_name ?? office.OfficeName,
        OfficeName: office.OfficeName ?? office.office_name,
        event_id: office.event_id ?? office.EventID,
        EventID: office.EventID ?? office.event_id,
    };
};

export default function Organization() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [modalDeepLink, setModalDeepLink] = useState(null);
    const notifDeepLinkHandled = useRef(false);

    const [officeTypes, setOfficeTypes] = useState([]);
    const [heads, setHeads] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [programTypes, setProgramTypes] = useState([]);
    const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState('');
    const [selectedProgramTypeFilter, setSelectedProgramTypeFilter] = useState('');
    const [selectedOfficeTypeFilter, setSelectedOfficeTypeFilter] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isViewReqModalOpen, setIsViewReqModalOpen] = useState(false);
    const [isAddReqModalOpen, setIsAddReqModalOpen] = useState(false);

    const [selectedOffice, setSelectedOffice] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [deleteMode, setDeleteMode] = useState(false);
    const [selectedCount, setSelectedCount] = useState(0);
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectedEventType, setSelectedEventType] = useState(''); // will hold EventID
    const [events, setEvents] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

    const officesPRef = useRef();
    const [sortStatus, setSortStatus] = useState('all');
    const [showActions, setShowActions] = useState(false);
    const actionsButtonRef = useRef(null);
    const actionsMenuRef = useRef(null);
    const [isAddEventOpen, setIsAddEventOpen] = useState(false);

    const headerRef = React.useRef(null);
    const controlsRef = React.useRef(null);
    const [contentHeight, setContentHeight] = useState(null);

    // compute content height = viewport height - header height to keep this component fixed
    const updateContentHeight = useCallback(() => {
        const headerH = headerRef.current ? headerRef.current.offsetHeight : 0;
        const controlsH = controlsRef.current ? controlsRef.current.offsetHeight : 0;
        // leave a small gap for padding/margins
        const gap = 16;
        const h = Math.max(200, window.innerHeight - headerH - controlsH - gap);
        setContentHeight(h);
    }, []);

    useEffect(() => {
        // Measure after paint to ensure refs are populated
        updateContentHeight();
        const rafId = requestAnimationFrame(() => updateContentHeight());

        window.addEventListener('resize', updateContentHeight);
        return () => {
            cancelAnimationFrame(rafId);
            window.removeEventListener('resize', updateContentHeight);
        };
    }, [updateContentHeight]);

    // Prevent page/body scrolling while this component is mounted
    useEffect(() => {
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previous;
        };
    }, []);

    // Fetch office types and events safely
    useEffect(() => {
        async function fetchOfficeTypes() {
            try {
                const res = await officetypesAPI.getAll();
                setOfficeTypes(Array.isArray(res) ? res : []);
            } catch (err) {
                console.error("Failed to fetch office types:", err);
                setOfficeTypes([]); // fallback to empty array
            }
        }
        async function fetchEvents() {
            try {
                const res = await eventsAPI.getAllEvents();
                if (res.success && Array.isArray(res.data)) {
                    setEvents(res.data);
                    // Default to "All Offices" (empty string) instead of first event
                    // if (res.data.length > 0) setSelectedEventType(res.data[0].EventID);
                } else {
                    setEvents([]);
                }
            } catch (err) {
                setEvents([]);
            }
        }
        fetchOfficeTypes();
        fetchEvents();
    }, []);

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

    // Fetch office heads safely
        useEffect(() => {
            async function fetchHeads() {
                try {
                    const res = await officeHeadsAPI.getAllHeads();
                    setHeads(Array.isArray(res) ? res : []);
                } catch (err) {
                    console.error('Failed to fetch heads', err);
                    setHeads([]);
                }
            }
            fetchHeads();
        }, []);

    // Fetch departments and program types for dropdowns
    useEffect(() => {
        const fetchLookups = async () => {
            try {
                const [depsRes, ptypesRes] = await Promise.all([
                    fetch('/api/departments').then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] })),
                    fetch('/api/program_types').then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] })),
                ]);

                const deps = Array.isArray(depsRes) ? depsRes : (depsRes.data || []);
                const ptypes = Array.isArray(ptypesRes) ? ptypesRes : (ptypesRes.data || []);

                setDepartments(deps);
                setProgramTypes(ptypes);
            } catch (err) {
                console.error('Failed to load departments/program types:', err);
                setDepartments([]);
                setProgramTypes([]);
            }
        };

        fetchLookups();
    }, []);

    // Reset states on mount
    useEffect(() => {
        setDeleteMode(false);
        setSelectedCount(0);
        setSelectedIds([]);
    }, []);

    const handleSuccess = () => {
        if (officesPRef.current?.refresh) {
            officesPRef.current.refresh();
        }
    };

    const handleOfficeClick = (office) => {
        if (!deleteMode) {
            setSelectedOffice(normalizeOfficeRecord(office));
            setIsViewReqModalOpen(true);
        }
    };

    const openOfficeFromNotification = useCallback(async (officeId, deepLink = null) => {
        const targetId = String(officeId || '');
        if (!targetId) return false;

        if (officesPRef.current?.openOfficeById) {
            officesPRef.current.openOfficeById(targetId, { openModal: false });
        }

        try {
            const raw = await officesAPI.getById(targetId);
            const office = normalizeOfficeRecord(raw);
            if (!office?.id) return false;

            setSelectedOffice(office);
            setModalDeepLink(deepLink);
            setIsViewReqModalOpen(true);
            return true;
        } catch (err) {
            console.error('Failed to open office from notification:', err);
            return false;
        }
    }, []);

    useEffect(() => {
        if (notifDeepLinkHandled.current) return;
        if (searchParams.get('fromNotif') !== '1') return;

        const officeId = searchParams.get('officeId');
        if (!officeId) return;

        const deepLink = {
            requirementId: searchParams.get('requirementId') || null,
            openSubmission: searchParams.get('openSubmission') === '1',
            viewUserId: searchParams.get('viewUserId') || null,
        };

        const run = async () => {
            const opened = await openOfficeFromNotification(officeId, deepLink);
            if (opened) {
                notifDeepLinkHandled.current = true;
                setSearchParams({}, { replace: true });
            }
        };

        const timer = setTimeout(run, 350);
        return () => clearTimeout(timer);
    }, [searchParams, openOfficeFromNotification, setSearchParams]);

    const handleCloseViewReqModal = () => {
        setIsViewReqModalOpen(false);
        // Refresh offices list to update compliance status
        if (officesPRef.current?.refresh) {
            officesPRef.current.refresh();
        }
    };

    const handleEditOffice = (office) => {
        setIsViewReqModalOpen(false);
        setSelectedOffice(office);
        setIsEditModalOpen(true);
    };

    const handleAddRequirements = (office) => {
        setIsViewReqModalOpen(false);
        setSelectedOffice(office);
        setIsAddReqModalOpen(true);
    };

    const handleRequirementsSaved = () => {
        setIsAddReqModalOpen(false);
        setIsViewReqModalOpen(true);
        // Refresh requirements in view modal
        if (officesPRef.current?.refresh) {
            officesPRef.current.refresh();
        }
    };

    // Delete a single office from actions menu
    const handleDeleteOffice = async (office) => {
        if (!office) return;
        const ok = await showConfirm(`Delete office "${office.office_name || office.OfficeName || office.id}"? This cannot be undone.`);
        if (!ok) return;
        try {
            await officesAPI.deleteOffice(office.id || office.OfficeID);
            if (officesPRef.current?.refresh) await officesPRef.current.refresh();
            await showAlert('Office deleted');
        } catch (err) {
            console.error('Failed to delete office', err);
            await showAlert('Delete failed');
        }
    };

    const handleEditSave = async (updatedOffice) => {
        try {
            const { officesAPI } = await import('../../utils/api');
            const response = await officesAPI.updateOffice(updatedOffice.id, updatedOffice);

            if (response?.success) {
                // Refresh the offices list and fetch the updated office to update header without re-opening modal
                if (officesPRef.current?.refresh) await officesPRef.current.refresh();

                // Fetch the updated office details and update selectedOffice so the view modal shows fresh data
                try {
                    const updated = await officesAPI.getById(updatedOffice.id);
                    if (updated && updated.OfficeID) {
                        const mapped = {
                            id: updated.OfficeID,
                            office_name: updated.OfficeName,
                            office_type_id: updated.OfficeTypeID,
                            office_type_name: updated.TypeName || updated.office_type_name || '',
                            head_ids: updated.HeadIDs || [],
                            heads: updated.Heads || [],
                            head_name: updated.HeadName || (updated.Heads ? (updated.Heads.map(h=> h.full_name).join(', ')) : ''),
                            event_id: updated.EventID || updated.event_id,
                            event_name: updated.EventName || updated.EventName || '',
                            compliance_percent: updated.CompliancePercent || 0,
                            overall_status: updated.OverallStatus || updated.overall_status || 'Not Complied'
                        };
                        setSelectedOffice(mapped);
                    }
                } catch (fetchErr) {
                    console.warn('Failed to fetch updated office after save:', fetchErr);
                }

                setIsEditModalOpen(false);
                setIsViewReqModalOpen(true);
                await showAlert('Office updated successfully!');
            } else {
                await showAlert(response?.message || 'Failed to update office');
            }
        } catch (err) {
            console.error(err);
            await showAlert('Error updating office');
        }
    };

    // Delete selected offices
    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return;
        const ok = await showConfirm(`Delete ${selectedIds.length} office(s)?`);
        if (!ok) return;

        try {
            for (let id of selectedIds) {
                await officesAPI.deleteOffice(id);
            }

            setSelectedCount(0);
            setSelectedIds([]);
            setDeleteMode(false);

            // Refresh the list after deletion
            if (officesPRef.current?.refresh) {
                await officesPRef.current.refresh();
            }

            await showAlert('Deleted successfully!');
        } catch (err) {
            console.error(err);
            await showAlert('Delete failed');
        }
    };

    const handleSelectionChange = useCallback((count, ids) => {
        setSelectedCount(count);
        setSelectedIds(ids);
    }, []);

    const isPaascu = selectedEventType && (selectedEventType === 'PAASCU' || selectedEventType === 'PASSCU');

    const { showAlert, showConfirm } = useModal();

    // Ensure selection is cleared in OfficesP when deleteMode is turned off
    useEffect(() => {
        if (!deleteMode && officesPRef.current && officesPRef.current.clearSelection) {
            officesPRef.current.clearSelection();
        }
    }, [deleteMode]);


    return (
        <div className="w-full h-screen flex flex-col bg-app">
            {/* Fixed header */}
            <div ref={headerRef} style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'transparent' }}>
</div>

            {/* Fixed controls and filters */}
            <div
                className="flex flex-col gap-0 px-4 pt-6 pb-0"
                style={{ marginTop: headerRef.current ? headerRef.current.offsetHeight : 0 }}
            >
                <div className="flex items-start justify-between gap-2">
                        <div ref={controlsRef}>
                        <h1 className="text-2xl font-bold text-gray-800 mb-1">Category Management</h1>
                        <p className="text-xs text-gray-600 ">{deleteMode ? '\u00A0' : 'Manage your Categories.'}</p>
                    </div>
                    <div className="flex items-center gap-1 pt-0.5">
                        {deleteMode && (
                            <button
                                onClick={async () => {
                                    if (selectedCount === 0) return;
                                    const confirmed = await showConfirm(`Delete ${selectedCount} selected item(s)? This cannot be undone.`);
                                    if (!confirmed) return;
                                    try {
                                        await handleDeleteSelected();
                                    } catch (err) {
                                        console.error(err);
                                    }
                                }}
                                className={`ml-2 inline-flex h-8 items-center rounded-lg border px-3 text-[11px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-red-400 bg-red-600 text-white hover:bg-red-700 ${selectedCount === 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
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
                    </div>
                </div>
                <div className="flex w-full items-center justify-between gap-1 mt-2">
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
                            placeholder="Search offices..."
                            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-[9px] text-slate-700 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-brand-500"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="flex items-center gap-2 mr-2">
                            <div className="relative inline-flex">
                                <select
                                    value={selectedOfficeTypeFilter}
                                    onChange={(e) => setSelectedOfficeTypeFilter(e.target.value)}
                                    className="h-8 min-w-[146px] appearance-none rounded-md border border-slate-200 bg-white px-4 text-center text-[10px] font-medium leading-4 text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    style={{ textAlignLast: 'center' }}
                                >
                                    <option value="">All Office Types</option>
                                    <option value="academic">Academic</option>
                                    <option value="non_academic">Non Academic</option>
                                </select>
                                <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute right-2.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                                </svg>
                            </div>

                            <div className="relative inline-flex">
                                <select
                                    value={selectedDepartmentFilter}
                                    onChange={(e) => setSelectedDepartmentFilter(e.target.value)}
                                    className="h-8 min-w-[146px] appearance-none rounded-md border border-slate-200 bg-white px-4 text-center text-[10px] font-medium leading-4 text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    style={{ textAlignLast: 'center' }}
                                >
                                    <option value="">All Departments</option>
                                    {departments.map((d) => (
                                        <option key={d.id ?? d.ID ?? d.DepartmentID} value={d.id ?? d.ID ?? d.DepartmentID}>
                                            {d.name ?? d.DepartmentName ?? d.Name}
                                        </option>
                                    ))}
                                </select>
                                <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute right-2.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                                </svg>
                            </div>

                            <div className="relative inline-flex">
                                <select
                                    value={selectedProgramTypeFilter}
                                    onChange={(e) => setSelectedProgramTypeFilter(e.target.value)}
                                    className="h-8 min-w-[146px] appearance-none rounded-md border border-slate-200 bg-white px-4 text-center text-[10px] font-medium leading-4 text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    style={{ textAlignLast: 'center' }}
                                >
                                    <option value="">All Program Types</option>
                                    {programTypes.map((p) => (
                                        <option key={p.id ?? p.ID ?? p.ProgramTypeID} value={p.id ?? p.ID ?? p.ProgramTypeID}>
                                            {p.name ?? p.ProgramTypeName ?? p.Name}
                                        </option>
                                    ))}
                                </select>
                                <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute right-2.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                        <div className="relative inline-block">
                            <Sortoffice value={sortStatus} onChange={setSortStatus} />
                        </div>
                        <div className="flex h-9 items-center justify-end gap-1">
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

            {/* Event Tabs (replaces dropdown) */}
            <div className="px-4 mb-4 -mt-1">
                <EventTabs selectedEventId={selectedEventType} onChange={setSelectedEventType} />
            </div>

            {/* List header (rendered outside scrollable area so it doesn't move) */}
            {viewMode === 'list' && (
                <div className="px-4">
                    <div className="hidden md:grid grid-cols-[minmax(120px,1fr)_160px_160px_100px_140px_80px] gap-6 px-6 py-3 mb-1 bg-white border border-slate-200 rounded-xl shadow-sm text-xs font-semibold text-gray-700 w-full">
                        <div className="flex items-center">Office Name</div>
                        <div className="flex items-center justify-center">Office Type</div>
                        <div className="flex items-center justify-center">Compliance Status</div>
                        <div className="flex items-center justify-center">Requirements</div>
                        <div className="flex items-center justify-start">Personnel</div>
                        <div className="flex items-center justify-end">Actions</div>
                    </div>
                </div>
            )}

            {/* Scrollable card/container area - fixed height to prevent whole-page scrolling */}
            <div
                className="flex-1 min-h-0 px-4 pb-6 overflow-y-auto"
                style={{ marginTop: 0, height: contentHeight ? `${contentHeight}px` : undefined }}
            >
                <div className="relative z-10">
                    <div className="w-full">
                    {/* Debug logs to verify data passed to OfficesP */}
                    {console.log('Selected Event Type:', selectedEventType)}
                    {console.log('Office Types:', officeTypes)}
                    {console.log('Heads:', heads)}
                    {console.log('Sort Status:', sortStatus)}

                        <OfficesP
                        ref={officesPRef}
                        searchTerm={searchTerm}
                        deleteMode={deleteMode}
                        onSelectionChange={handleSelectionChange}
                        onOfficeClick={handleOfficeClick}
                        eventType={selectedEventType}
                        events={events}
                        viewMode={viewMode}
                        sortStatus={sortStatus}
                        officeTypes={officeTypes}   
                        heads={heads}
                        departmentFilter={selectedDepartmentFilter}
                        programTypeFilter={selectedProgramTypeFilter}
                        officeTypeFilter={selectedOfficeTypeFilter}
                        onEditOffice={handleEditOffice}
                        onAddRequirements={handleAddRequirements}
                        onDeleteOffice={handleDeleteOffice}
                        hideHeader={viewMode === 'list'}
                        />
                                {/* spacer so last card can be scrolled into view */}
                                <div className="h-6 md:h-12" aria-hidden="true" />
                    </div>
                </div>
            </div>

            {/* Add Modal */}
            {isModalOpen && (
                <AddOfficeModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handleSuccess}
                    officeTypes={officeTypes}
                    events={events}
                />
            )}

            {/* Add Event Modal (from Standards actions) */}
            {isAddEventOpen && (
                <AddEventModal
                    isOpen={isAddEventOpen}
                    onClose={() => setIsAddEventOpen(false)}
                    onSuccess={(newEvent) => {
                        setIsAddEventOpen(false);
                        if (newEvent) setEvents(prev => [newEvent, ...(Array.isArray(prev) ? prev : [])]);
                    }}
                />
            )}

            {/* View Requirements Modal - Use PASSCU Modal for PAASCU, regular for others */}
            {isViewReqModalOpen && isPaascu && (
                <ViewReqPASSCUModal
                    isOpen={isViewReqModalOpen}
                    onClose={() => {
                        setModalDeepLink(null);
                        handleCloseViewReqModal();
                    }}
                    office={selectedOffice}
                    deepLink={modalDeepLink}
                    onDeepLinkHandled={() => setModalDeepLink(null)}
                    onEditOffice={handleEditOffice}
                    onAddRequirements={handleAddRequirements}
                />
            )}

            {isViewReqModalOpen && !isPaascu && (
                <ViewReqPasscuModal
                    isOpen={isViewReqModalOpen}
                    onClose={() => {
                        setModalDeepLink(null);
                        handleCloseViewReqModal();
                    }}
                    office={selectedOffice}
                    deepLink={modalDeepLink}
                    onDeepLinkHandled={() => setModalDeepLink(null)}
                    onEditOffice={handleEditOffice}
                    onAddRequirements={handleAddRequirements}
                />
            )}

            {/* Edit Modal */}
            {isEditModalOpen && (
                (() => {
                    console.log('DEBUG: heads passed to EditOfficeModal:', heads);
                    return (
                        <EditOfficeModal
                            visible={isEditModalOpen}
                            onClose={() => {
                                setIsEditModalOpen(false);
                            }}
                            office={selectedOffice}
                            onSave={handleEditSave}
                            officeTypes={officeTypes}
                            heads={heads}
                            userRole={currentUser?.RoleID}
                        />
                    );
                })()
            )}

            {/* Add Requirements Modal */}
            {isAddReqModalOpen && (
                <AddReqOffModal
                    isOpen={isAddReqModalOpen}
                    onClose={() => {
                        setIsAddReqModalOpen(false);
                    }}
                    office={selectedOffice}
                    onSave={handleRequirementsSaved}
                />
            )}
        </div>
    );
}
