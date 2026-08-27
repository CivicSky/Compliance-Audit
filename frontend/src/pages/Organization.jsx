import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Sortoffice from "../components/Organization/sortoffice";
import CustomDropdown from "../components/UI/CustomDropdown";
import EventsAddDelete from "../components/ALLC/eventsadddelete";
import EventTabs from "../components/Organization/EventTabs";
import OfficeAddDelete from "../components/Organization/officeadddelete";
import AddEventModal from "../components/Events/AddEventModal";
import { officesAPI, officeHeadsAPI, officetypesAPI, eventsAPI, usersAPI, masterlistAPI } from "../utils/api";
import OfficesP from "../components/OfficesP/OfficesP";
import AddOfficeModal from "../components/Organization/AddOfficeModal";
import EditOfficeModal from "../components/Organization/EditOfficeModal";
import ViewReqPasscuModal from "../components/ViewReqPasscuModal/ViewReqPasscuModal";
import ViewReqPASSCUModal from "../components/ViewReqPASSCUModal/ViewReqPASSCUModal";
import AddReqOffModal from "../components/AddReqOffModal/AddReqOffModal";
import { useModal } from "../components/UI/ModalProvider";
import { useLiveRefresh } from "../utils/liveSync";

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

export default function Organization({ selectedEventIdProp, onEventSelect }) {
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
    const [selectedEventType, setSelectedEventType] = useState(selectedEventIdProp || ''); // will hold EventID

    useEffect(() => {
        if (selectedEventIdProp) {
            setSelectedEventType(selectedEventIdProp);
        }
    }, [selectedEventIdProp]);

    const handleEventTabChange = (eventId) => {
        setSelectedEventType(eventId);
        if (typeof onEventSelect === 'function') {
            onEventSelect(eventId);
        }
    };
    const [events, setEvents] = useState([]);
    const [currentUser, setCurrentUser] = useState(() => {
        try {
            const stored = localStorage.getItem('user');
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });
    const isAdmin = currentUser?.RoleName === 'admin' || currentUser?.RoleID === 1;
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

    // Allow normal scrolling
    useEffect(() => {
        return () => {};
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
        fetchAvailableMasterList(selectedEventType);
    };

    // Real-time live syncing on mutations or window focus
    const refreshOrgData = useCallback(() => {
        if (officesPRef.current?.refresh) {
            officesPRef.current.refresh();
        }
        if (selectedEventType) {
            fetchAvailableMasterList(selectedEventType);
        }
    }, [selectedEventType]);

    useLiveRefresh(refreshOrgData, { deps: [selectedEventType] });

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
            const { officesAPI } = await import('../utils/api');
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
                await showAlert('Office personnel updated successfully!', 'success');
                return { success: true };
            } else {
                await showAlert(response?.message || 'Failed to update office personnel', 'error');
                return { success: false, message: response?.message };
            }
        } catch (err) {
            console.error(err);
            await showAlert('Error updating office', 'error');
            return { success: false, message: err.message };
        }
    };

    // Delete selected offices
    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return;
        const ok = await showConfirm(`Delete ${selectedIds.length} office(s)?`);
        if (!ok) return;

        try {
            await officesAPI.deleteMultipleOffices(selectedIds);

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

    // Draggable categories (Master List) sidebar states
    const [masterListItems, setMasterListItems] = useState([]);
    const [masterListLoading, setMasterListLoading] = useState(false);
    const [categorySearchTerm, setCategorySearchTerm] = useState("");
    const [activeCategoryTab, setActiveCategoryTab] = useState("All");
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [showAddSidebar, setShowAddSidebar] = useState(false);
    const [draggedItem, setDraggedItem] = useState(null);

    useEffect(() => {
        if (!selectedEventType) {
            setShowAddSidebar(false);
        }
    }, [selectedEventType]);

    const fetchAvailableMasterList = useCallback(async (eventId) => {
        if (!eventId) {
            setMasterListItems([]);
            return;
        }
        setMasterListLoading(true);
        try {
            const res = await masterlistAPI.getAvailableForEvent(eventId);
            const items = Array.isArray(res) ? res : (res.data || []);
            setMasterListItems(items);
        } catch (err) {
            console.error("Failed to fetch available master list items:", err);
            setMasterListItems([]);
        } finally {
            setMasterListLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAvailableMasterList(selectedEventType);
    }, [selectedEventType, fetchAvailableMasterList]);

    const filteredMasterListItems = useMemo(() => {
        let items = masterListItems;

        if (activeCategoryTab === "Programs") {
            items = items.filter(item => item.entityTypeId === 1 || item.type === 'Academic Program');
        } else if (activeCategoryTab === "Offices") {
            items = items.filter(item => item.entityTypeId !== 1 && item.type !== 'Academic Program');
        }

        const query = categorySearchTerm.trim().toLowerCase();
        if (!query) return items;

        return items.filter((item) => {
            const name = String(item.name || "").toLowerCase();
            const type = String(item.type || "").toLowerCase();
            const dept = String(item.department || "").toLowerCase();
            return name.includes(query) || type.includes(query) || dept.includes(query);
        });
    }, [masterListItems, categorySearchTerm, activeCategoryTab]);

    const handleInstantAddCategory = async (item) => {
        if (!selectedEventType) return;
        try {
            const isAcademic = item.entityTypeId === 1 || item.type === 'Academic Program';
            const matchedType = officeTypes.find(t => {
                const name = String(t.TypeName || t.name || '').toLowerCase();
                if (isAcademic) {
                    return name.includes('academic') && !name.includes('non');
                } else {
                    return name.includes('non');
                }
            });
            const typeId = matchedType ? (matchedType.OfficeTypeID || matchedType.id) : (isAcademic ? 2 : 1);

            const payload = {
                master_list_id: parseInt(item.id),
                OfficeName: item.name || "",
                OfficeTypeID: parseInt(typeId),
                HeadIDs: [],
                EventID: parseInt(selectedEventType)
            };

            const res = await officesAPI.createOffice(payload);
            const success = res?.success === true || res?.data?.success === true || res?.office || res?.OfficeID || res?.id;

            if (success) {
                await showAlert(`Successfully added "${item.name}" to the audit event!`);
                if (officesPRef.current?.refresh) {
                    officesPRef.current.refresh();
                }
                fetchAvailableMasterList(selectedEventType);
            } else {
                const errorMsg = res?.details || res?.error || res?.message || 'Failed to add category';
                await showAlert(`Error adding category: ${errorMsg}`);
            }
        } catch (err) {
            console.error("Failed to add category:", err);
            const errorMsg = err.response?.data?.details || err.response?.data?.error || err.message || "Failed to add category.";
            await showAlert(`Database error: ${errorMsg}`);
        }
    };

    // Ensure selection is cleared in OfficesP when deleteMode is turned off
    useEffect(() => {
        if (!deleteMode && officesPRef.current && officesPRef.current.clearSelection) {
            officesPRef.current.clearSelection();
        }
    }, [deleteMode]);


    return (
        <div className="w-full h-full flex flex-col bg-app overflow-hidden">
            {/* Fixed header */}
            <div ref={headerRef} style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'transparent' }}>
            </div>

            {/* Fixed controls and filters */}
            <div className="flex flex-col gap-0 px-4 pt-1.5 pb-0" style={{ marginTop: headerRef.current ? headerRef.current.offsetHeight : 0 }}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div ref={controlsRef}>
                        <h1 className="text-xl font-bold text-gray-800 mb-0.5">Programs &amp; Offices</h1>
                        <p className="text-[11px] text-gray-500">
                            {deleteMode
                                ? ' '
                                : 'Manage and monitor all academic programs, offices, and compliance assignments.'}
                        </p>
                    </div>
                    {isAdmin && (
                        <div className="flex items-center gap-1.5 pt-0.5 self-start sm:self-auto flex-wrap">
                            {deleteMode && (
                                <button
                                    type="button"
                                    onClick={handleDeleteSelected}
                                    className="inline-flex h-8 items-center rounded-lg border px-3 text-[11px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-red-400 bg-red-600 text-white hover:bg-red-700"
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
                                onClick={() => {
                                    if (!selectedEventType) {
                                        showAlert("Please select an Event tab first (e.g. RQAT, PACUCOA 2026) to add categories.");
                                        return;
                                    }
                                    setShowAddSidebar(prev => !prev);
                                }}
                                className={`inline-flex h-8 items-center gap-1 rounded-lg px-3 text-[11px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                                    showAddSidebar
                                        ? 'bg-slate-200 text-slate-700 hover:bg-slate-350'
                                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                }`}
                            >
                                <span className="text-sm leading-none">+</span>
                                {showAddSidebar ? 'Close Panel' : 'Add'}
                            </button>
                        </div>
                    )}
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
                            placeholder="Search offices..."
                            className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <CustomDropdown
                            value={selectedOfficeTypeFilter}
                            onChange={setSelectedOfficeTypeFilter}
                            options={[
                                { value: '', label: 'All Office Types' },
                                { value: 'academic', label: 'Academic' },
                                { value: 'non_academic', label: 'Non Academic' },
                            ]}
                            minWidth="min-w-[140px]"
                            size="sm"
                        />

                        <CustomDropdown
                            value={selectedDepartmentFilter}
                            onChange={setSelectedDepartmentFilter}
                            options={[
                                { value: '', label: 'All Departments' },
                                ...departments.map((d) => ({
                                    value: String(d.id ?? d.ID ?? d.DepartmentID),
                                    label: d.name ?? d.DepartmentName ?? d.Name,
                                })),
                            ]}
                            minWidth="min-w-[140px]"
                            size="sm"
                        />

                        <div className="relative inline-block">
                            <Sortoffice value={sortStatus} onChange={setSortStatus} />
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

            {/* Event Tabs (replaces dropdown) */}
            <div className="px-4 mb-2 mt-0.5 overflow-x-auto">
                <EventTabs selectedEventId={selectedEventType} onChange={handleEventTabChange} />
            </div>

            {/* List header (rendered outside scrollable area so it doesn't move) */}
            {viewMode === 'list' && (
                <div className="px-4 overflow-x-auto">
                    <div className="hidden md:grid grid-cols-[minmax(120px,1fr)_160px_160px_100px_140px_80px] gap-6 px-6 py-3 mb-1 bg-white border border-slate-200 rounded-xl shadow-sm text-xs font-semibold text-gray-700 w-full min-w-[720px]">
                        <div className="flex items-center">Office Name</div>
                        <div className="flex items-center justify-center">Office Type</div>
                        <div className="flex items-center justify-center">Compliance Status</div>
                        <div className="flex items-center justify-center">Requirements</div>
                        <div className="flex items-center justify-start">Personnel</div>
                        <div className="flex items-center justify-end">Actions</div>
                    </div>
                </div>
            )}

            {/* Split layout: Left Available Categories (Drag Sources) + Right Grid/List */}
            <div 
                className="flex-1 min-h-0 px-4 pb-2 flex gap-4 overflow-hidden"
                style={{ marginTop: 0 }}
            >
                {/* Left Panel: Available Master List Categories (collapsible/persistent sidebar) */}
                {isAdmin && selectedEventType && showAddSidebar && (
                    <div className="w-72 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col p-4 shrink-0 h-full min-h-0">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-2 shrink-0">
                            <h3 className="text-xs font-bold text-slate-800">
                                Available for {events.find(e => String(e.EventID) === String(selectedEventType))?.EventCode || 'Event'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowAddSidebar(false)}
                                className="text-slate-400 hover:text-slate-600 transition"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        {/* Search Category */}
                        <div className="mb-2 shrink-0">
                            <input
                                type="text"
                                placeholder="Search available..."
                                value={categorySearchTerm}
                                onChange={(e) => setCategorySearchTerm(e.target.value)}
                                className="h-8 w-full rounded-md border border-slate-200 px-3 text-[10px] text-gray-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                disabled={masterListLoading}
                            />
                        </div>
                        
                        {/* Category Type Filter Tabs */}
                        <div className="flex border-b border-slate-200 mb-2 shrink-0">
                            {["All", "Programs", "Offices"].map((tab) => {
                                const isSelected = activeCategoryTab === tab;
                                return (
                                    <button
                                        key={tab}
                                        type="button"
                                        onClick={() => setActiveCategoryTab(tab)}
                                        className={`pb-1 px-2.5 text-[10px] font-semibold transition-all border-b-2 -mb-[1px] ${
                                            isSelected 
                                                ? 'border-blue-600 text-blue-600' 
                                                : 'border-transparent text-slate-500 hover:text-slate-800'
                                        }`}
                                    >
                                        {tab}
                                    </button>
                                );
                            })}
                        </div>
                        
                        {/* Draggable Category List */}
                        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0">
                            {masterListLoading ? (
                                <div className="flex h-32 items-center justify-center text-center text-xs text-slate-400">
                                    Loading categories...
                                </div>
                            ) : filteredMasterListItems.length === 0 ? (
                                <div className="flex h-32 items-center justify-center text-center text-xs text-slate-400 p-4 border border-dashed border-slate-100 rounded-lg">
                                    No available categories found
                                </div>
                            ) : (
                                filteredMasterListItems.map((item) => (
                                    <div
                                        key={item.id}
                                        draggable
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData("text/plain", item.id);
                                            e.dataTransfer.effectAllowed = "move";
                                            setDraggedItem(item);
                                        }}
                                        onDragEnd={() => setDraggedItem(null)}
                                        onClick={() => handleInstantAddCategory(item)}
                                        className="flex flex-col gap-0.5 p-2 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-lg text-[10px] cursor-grab select-none transition-all duration-150 group relative animate-fadeIn"
                                        title="Drag to right grid, or click to add instantly"
                                    >
                                        <div className="font-semibold text-slate-800 flex items-center justify-between">
                                            <span className="truncate pr-1">{item.name}</span>
                                            <span className="opacity-0 group-hover:opacity-100 text-blue-600 text-[9px] font-bold shrink-0 transition-opacity">
                                                + Add
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className={`px-1 rounded-[3px] text-[8px] font-semibold border ${
                                                item.entityTypeId === 1 || item.type === 'Academic Program'
                                                    ? 'bg-blue-50/50 text-blue-700 border-blue-100'
                                                    : 'bg-emerald-50/50 text-emerald-700 border-emerald-100'
                                            }`}>
                                                {item.type === 'Academic Program' ? 'Program' : 'Office'}
                                            </span>
                                            {item.department && (
                                                <span className="text-[9px] text-slate-400 truncate">
                                                    {item.department}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Right Panel: Grid / List of assigned categories */}
                <div
                    onDragOver={(e) => {
                        if (isAdmin && selectedEventType) {
                            e.preventDefault();
                            setIsDraggingOver(true);
                        }
                    }}
                    onDragLeave={() => setIsDraggingOver(false)}
                    onDrop={async (e) => {
                        if (!isAdmin || !selectedEventType) return;
                        e.preventDefault();
                        setIsDraggingOver(false);
                        const categoryId = e.dataTransfer.getData("text/plain");
                        const item = draggedItem || masterListItems.find(i => String(i.id) === String(categoryId));
                        if (item) {
                            await handleInstantAddCategory(item);
                        }
                    }}
                    className={`flex-1 overflow-hidden transition-all duration-300 rounded-xl relative border-2 ${
                        isDraggingOver 
                            ? 'border-dashed border-blue-500 bg-blue-50/10 shadow-inner' 
                            : 'border-transparent'
                    }`}
                >
                    {isDraggingOver && (
                        <div className="absolute inset-0 z-[20] flex items-center justify-center bg-blue-500/10 pointer-events-none rounded-xl backdrop-blur-[1px]">
                            <div className="bg-white border-2 border-blue-500 shadow-xl px-6 py-4 rounded-xl flex flex-col items-center gap-2 max-w-sm text-center">
                                <svg className="h-8 w-8 text-blue-500 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                                <p className="text-sm font-bold text-slate-800">Drop here to assign to current event</p>
                                <p className="text-[10px] text-slate-400">Instantly assigns category with 0 heads (heads can be assigned later)</p>
                            </div>
                        </div>
                    )}

                    <div className="relative z-10 w-full h-full">
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
