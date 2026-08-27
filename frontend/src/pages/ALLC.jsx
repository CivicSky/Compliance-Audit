import CopyEventPopup from '../components/ALLC/CopyEventPopup';
import { useState, useEffect, useRef } from 'react';
import Pagination from '../components/Pagination/Pagination';
import axios from 'axios';
import SortEvents from '../components/ALLC/sortevents';
import { API_BASE_URL } from '../utils/apiBase';
import EventCard from '../components/ALLC/EventCard';
import EventPopup from '../components/ALLC/EventPopup';
import EditEventPopup from '../components/ALLC/EditEventPopup';
import { eventsAPI, usersAPI } from '../utils/api';
import { useModal } from "../components/UI/ModalProvider";
import { useToast } from '../components/UI/Toast';
import AddEventModal from '../components/Events/AddEventModal';

function ALL() {
    const [sortStatus, setSortStatus] = useState('active');
    const [events, setEvents] = useState([]);
    const [copyPopup, setCopyPopup] = useState({ open: false, event: null });
    const [editPopup, setEditPopup] = useState({ open: false, event: null });
    const [currentUser, setCurrentUser] = useState(null);
    const [deleteMode, setDeleteMode] = useState(false);
    const [selectedEventIdsForDelete, setSelectedEventIdsForDelete] = useState(new Set());
    const [isAddEventOpen, setIsAddEventOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const { showAlert, showConfirm } = useModal();
    const { toast } = useToast() || {};

    const matchesSearch = (text, searchLower) => {
        return (text?.toLowerCase() || '').includes(searchLower);
    };

    const eventMatchesSearch = (event, searchLower) => {
        return matchesSearch(event.EventName, searchLower) ||
            matchesSearch(event.EventCode, searchLower) ||
            matchesSearch(event.Description, searchLower);
    };

    const [auditorAssignments, setAuditorAssignments] = useState({ areaIds: new Set(), eventIds: new Set(), rawList: [] });

    const isAuditor = currentUser?.RoleID === 4 ||
        String(currentUser?.RoleName || '').toLowerCase().includes('auditor') ||
        currentUser?.isExternalAuditor;

    useEffect(() => {
        if (!currentUser || !isAuditor) return;
        const fetchAuditorAssignments = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_BASE_URL}/api/areas/assignments/${currentUser.UserID}`, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    const list = data.assignments || [];
                    const areaIds = new Set(list.map(a => Number(a.area_id)));
                    const eventIds = new Set(list.map(a => Number(a.EventID)));
                    setAuditorAssignments({ areaIds, eventIds, rawList: list });
                }
            } catch (err) {
                console.error('Error fetching auditor assignments in ALL:', err);
            }
        };
        fetchAuditorAssignments();
    }, [currentUser, isAuditor]);

    const filteredEvents = events.filter(event => {
        const eventStatus = String(event.status || event.Status || '').toLowerCase().trim();
        if (sortStatus === 'active' && eventStatus === 'inactive') return false;
        if (sortStatus === 'inactive' && eventStatus !== 'inactive') return false;

        if (isAuditor) {
            const isEventAssigned = auditorAssignments.eventIds.has(Number(event.EventID));
            if (!isEventAssigned) return false;
        }

        if (!searchTerm.trim()) return true;
        const searchLower = searchTerm.toLowerCase();
        return eventMatchesSearch(event, searchLower);
    });

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [expandedAreas, setExpandedAreas] = useState(new Set());
    const [expandedCriteria, setExpandedCriteria] = useState(new Set());
    const [expandedNoArea, setExpandedNoArea] = useState(new Set());
    const [areasData, setAreasData] = useState({});
    const [criteriaData, setCriteriaData] = useState({});
    const [requirementsData, setRequirementsData] = useState({});
    const [noAreaCriteriaData, setNoAreaCriteriaData] = useState({});
    const [criteriaOptionsData, setCriteriaOptionsData] = useState({});
    const [loadingAreas, setLoadingAreas] = useState(new Set());
    const [loadingCriteria, setLoadingCriteria] = useState(new Set());
    const [loadingRequirements, setLoadingRequirements] = useState(new Set());
    const [loadingNoAreaCriteria, setLoadingNoAreaCriteria] = useState(new Set());

    const isAdmin = currentUser?.RoleName === 'admin' || currentUser?.RoleID === 1;

    const abortControllersRef = useRef({});
    const itemsPerPage = 4;

    useEffect(() => {
        setCurrentPage(1);
    }, [sortStatus, searchTerm]);

    useEffect(() => {
        fetchEvents();
    }, []);

    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const response = await usersAPI.getLoggedInUser();
                if (response?.success) setCurrentUser(response.user);
            } catch (error) {
                console.error('Error fetching current user:', error);
            }
        };
        fetchCurrentUser();
    }, []);

    useEffect(() => {
        if (!isAdmin && deleteMode) {
            setDeleteMode(false);
            setSelectedEventIdsForDelete(new Set());
        }
    }, [isAdmin, deleteMode]);

    useEffect(() => {
        if (selectedEvent) {
            fetchAreasForEventSafe(selectedEvent.EventID);
        }
    }, [selectedEvent?.EventID]);

    const fetchCriteriaOptionsForEvent = async (eventId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/api/criteria/event/${eventId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCriteriaOptionsData(prev => ({ ...prev, [eventId]: response.data.data || [] }));
        } catch (err) {
            console.error('Error fetching criteria options:', err);
            setCriteriaOptionsData(prev => ({ ...prev, [eventId]: [] }));
        }
    };

    const fetchNoAreaCriteriaForEvent = async (eventId) => {
        try {
            setLoadingNoAreaCriteria(prev => new Set([...prev, eventId]));
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/api/criteria/event/${eventId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const allCriteriaForEvent = Array.isArray(response.data?.data) ? response.data.data : [];
            const noAreaCriteria = allCriteriaForEvent.filter(
                crit => crit.AreaID === null || crit.AreaID === undefined
            );

            setNoAreaCriteriaData(prev => ({ ...prev, [eventId]: noAreaCriteria }));
        } catch (err) {
            console.error('Error fetching no-area criteria:', err);
            setNoAreaCriteriaData(prev => ({ ...prev, [eventId]: [] }));
        } finally {
            setLoadingNoAreaCriteria(prev => {
                const newSet = new Set(prev);
                newSet.delete(eventId);
                return newSet;
            });
        }
    };

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/api/events`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEvents(response.data.data || []);
            setError(null);
        } catch (err) {
            console.error('Error fetching events:', err);
            if (err.response?.status === 429) {
                setError('Rate limit exceeded (Max 30 requests/min). Please try again later.');
            } else {
                setError('Failed to load events');
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchAreasForEventSafe = async (eventId) => {
        if (abortControllersRef.current[eventId]) {
            abortControllersRef.current[eventId].abort();
        }

        const controller = new AbortController();
        abortControllersRef.current[eventId] = controller;

        try {
            setLoadingAreas(prev => new Set([...prev, eventId]));
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/api/areas/event/${eventId}`, {
                headers: { Authorization: `Bearer ${token}` },
                signal: controller.signal
            });

            if (!controller.signal.aborted) {
                setAreasData({ [eventId]: response.data.data || [] });
                setCriteriaData({});
                setRequirementsData({});
            }
        } catch (err) {
            if (err.name !== 'CanceledError') {
                console.error('Error fetching areas:', err);
            }
        } finally {
            setLoadingAreas(prev => {
                const newSet = new Set(prev);
                newSet.delete(eventId);
                return newSet;
            });
        }
    };

    const openEventModal = (event) => {
        if (copyPopup.open) return;
        setExpandedAreas(new Set());
        setExpandedCriteria(new Set());
        setExpandedNoArea(new Set());
        setSelectedEvent(event);
    };

    const openCopyModal = (originalEvent) => {
        if (!originalEvent) return;
        const baseCode = originalEvent.EventCode || 'EVENT';
        const baseName = originalEvent.EventName || 'Event';
        let defaultCode = `${baseCode}-COPY`;
        let defaultName = `${baseName} (Copy)`;
        let counter = 1;
        while (events.some(e => String(e.EventCode || '').trim().toUpperCase() === defaultCode.toUpperCase())) {
            defaultCode = `${baseCode}-COPY-${counter}`;
            defaultName = `${baseName} (Copy ${counter})`;
            counter++;
        }
        setCopyPopup({ open: true, event: originalEvent, defaultCode, defaultName });
    };

    const fetchCriteriaForArea = async (areaId, force = false) => {
        if (criteriaData[areaId] && !force) return;

        try {
            setLoadingCriteria(prev => new Set([...prev, areaId]));
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/api/criteria/area/${areaId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCriteriaData(prev => ({ ...prev, [areaId]: response.data.data || [] }));
        } catch (err) {
            console.error('Error fetching criteria:', err);
        } finally {
            setLoadingCriteria(prev => {
                const newSet = new Set(prev);
                newSet.delete(areaId);
                return newSet;
            });
        }
    };

    const fetchRequirementsForCriteria = async (criteriaId, force = false) => {
        if (requirementsData[criteriaId] && !force) return;

        try {
            setLoadingRequirements(prev => new Set([...prev, criteriaId]));
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/api/requirements/criteria/${criteriaId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const requirements = Array.isArray(response.data?.data) ? response.data.data : [];

            setRequirementsData(prev => ({ ...prev, [criteriaId]: requirements }));
        } catch (err) {
            console.error('Error fetching requirements:', err);
            setRequirementsData(prev => ({ ...prev, [criteriaId]: [] }));
        } finally {
            setLoadingRequirements(prev => {
                const newSet = new Set(prev);
                newSet.delete(criteriaId);
                return newSet;
            });
        }
    };

    const toggleArea = (areaId) => {
        const newSet = new Set(expandedAreas);
        if (newSet.has(areaId)) {
            newSet.delete(areaId);
        } else {
            newSet.add(areaId);
            if (!criteriaData[areaId]) {
                fetchCriteriaForArea(areaId);
            }
        }
        setExpandedAreas(newSet);
    };

    const toggleCriteria = (criteriaId) => {
        const newSet = new Set(expandedCriteria);
        if (newSet.has(criteriaId)) {
            newSet.delete(criteriaId);
        } else {
            newSet.add(criteriaId);
            if (!requirementsData[criteriaId]) {
                fetchRequirementsForCriteria(criteriaId);
            }
        }
        setExpandedCriteria(newSet);
    };

    const toggleNoAreaSection = (eventId) => {
        setExpandedNoArea(prev => {
            const next = new Set(prev);
            if (next.has(eventId)) {
                next.delete(eventId);
            } else {
                next.add(eventId);
                if (!noAreaCriteriaData[eventId]) {
                    fetchNoAreaCriteriaForEvent(eventId);
                }
            }
            return next;
        });
    };

    const addArea = async (eventId, data) => {
        const token = localStorage.getItem('token');
        try {
            await axios.post(`${API_BASE_URL}/api/areas/add`, {
                EventChildID: eventId,
                EventID: eventId,
                AreaCode: data.AreaCode,
                AreaName: data.AreaName,
                Description: data.Description || null
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await fetchAreasForEventSafe(eventId);
        } catch (err) {
            const apiMessage = err?.response?.data?.message || err?.response?.data?.error;
            throw new Error(apiMessage || 'Failed to add area.');
        }
    };

    const editArea = async (areaId, data) => {
        const token = localStorage.getItem('token');
        try {
            await axios.put(`${API_BASE_URL}/api/areas/${areaId}`, {
                AreaCode: data.AreaCode,
                AreaName: data.AreaName,
                Description: data.Description || null
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (selectedEvent?.EventID) {
                await fetchAreasForEventSafe(selectedEvent.EventID);
            }
        } catch (err) {
            const apiMessage = err?.response?.data?.message || err?.response?.data?.error;
            throw new Error(apiMessage || 'Failed to edit area.');
        }
    };

    const editCriteria = async (criteriaId, data) => {
        const token = localStorage.getItem('token');
        try {
            await axios.put(`${API_BASE_URL}/api/criteria/${criteriaId}`, {
                CriteriaCode: data.CriteriaCode,
                CriteriaName: data.CriteriaName,
                Description: data.Description || null,
                AreaID: data.AreaID ?? null,
                ParentCriteriaID: data.ParentCriteriaID ?? null,
                EventID: data.EventID
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (selectedEvent?.EventID) {
                await fetchCriteriaOptionsForEvent(selectedEvent.EventID);
                if (data.AreaID) {
                    await fetchCriteriaForArea(Number(data.AreaID), true);
                } else {
                    await fetchNoAreaCriteriaForEvent(selectedEvent.EventID);
                }
            }
        } catch (err) {
            const apiMessage = err?.response?.data?.message || err?.response?.data?.error;
            throw new Error(apiMessage || 'Failed to edit criteria.');
        }
    };

    const addNoAreaCriteria = async (eventId, data) => {
        return addCriteria(eventId, { ...data, AreaID: null });
    };

    const addCriteria = async (eventId, data) => {
        const token = localStorage.getItem('token');
        try {
            await axios.post(`${API_BASE_URL}/api/criteria/add`, {
                EventID: eventId,
                AreaID: data.AreaID ?? null,
                CriteriaCode: data.CriteriaCode,
                CriteriaName: data.CriteriaName,
                Description: data.Description,
                ParentCriteriaID: data.ParentCriteriaID ?? null
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            await fetchCriteriaOptionsForEvent(eventId);

            if (data.AreaID) {
                await fetchCriteriaForArea(Number(data.AreaID), true);
            } else {
                await fetchNoAreaCriteriaForEvent(eventId);
            }
        } catch (err) {
            const apiMessage = err?.response?.data?.message || err?.response?.data?.error;
            throw new Error(apiMessage || 'Failed to add criteria.');
        }
    };

    const addRequirement = async (payload) => {
        const token = localStorage.getItem('token');
        try {
            await axios.post(`${API_BASE_URL}/api/requirements/add`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await fetchRequirementsForCriteria(payload.CriteriaID, true);
        } catch (err) {
            const apiMessage = err?.response?.data?.message || err?.response?.data?.error;
            throw new Error(apiMessage || 'Failed to add requirement.');
        }
    };

    const loadRequirementsByCriteria = async (criteriaId) => {
        const token = localStorage.getItem('token');
        try {
            const response = await axios.get(`${API_BASE_URL}/api/requirements/criteria/${criteriaId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const list = Array.isArray(response.data?.data) ? response.data.data : [];
            setRequirementsData(prev => ({ ...prev, [Number(criteriaId)]: list }));
            return list;
        } catch (err) {
            console.error('Error loading requirements by criteria:', err);
            setRequirementsData(prev => ({ ...prev, [Number(criteriaId)]: [] }));
            return [];
        }
    };

    const bulkDeleteHierarchy = async ({ eventId, areaIds = [], criteriaIds = [], requirementIds = [] }) => {
        const token = localStorage.getItem('token');

        const uniqueAreaIds = [...new Set((areaIds || []).map(Number).filter(Boolean))];
        const uniqueCriteriaIds = [...new Set((criteriaIds || []).map(Number).filter(Boolean))];
        const uniqueRequirementIds = [...new Set((requirementIds || []).map(Number).filter(Boolean))];

        let criteriaIdsToDelete = [...uniqueCriteriaIds];

        if (uniqueAreaIds.length > 0) {
            const criteriaResponse = await axios.get(`${API_BASE_URL}/api/criteria/event/${eventId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const eventCriteria = Array.isArray(criteriaResponse.data?.data) ? criteriaResponse.data.data : [];
            const derivedCriteriaIds = eventCriteria
                .filter(crit => uniqueAreaIds.includes(Number(crit.AreaID)))
                .map(crit => Number(crit.CriteriaID));
            criteriaIdsToDelete = [...new Set([...criteriaIdsToDelete, ...derivedCriteriaIds])];
        }

        let requirementIdsToDelete = [...uniqueRequirementIds];
        if (criteriaIdsToDelete.length > 0) {
            const requirementsResponse = await axios.get(`${API_BASE_URL}/api/requirements/all`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const allRequirements = Array.isArray(requirementsResponse.data?.data) ? requirementsResponse.data.data : [];
            const derivedRequirementIds = allRequirements
                .filter(req => criteriaIdsToDelete.includes(Number(req.CriteriaID)))
                .map(req => Number(req.RequirementID));
            requirementIdsToDelete = [...new Set([...requirementIdsToDelete, ...derivedRequirementIds])];
        }

        try {
            if (requirementIdsToDelete.length > 0) {
                await axios.post(
                    `${API_BASE_URL}/api/requirements/delete`,
                    { requirementIds: requirementIdsToDelete },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }

            if (criteriaIdsToDelete.length > 0) {
                await axios.delete(`${API_BASE_URL}/api/criteria/delete`, {
                    data: { criteriaIds: criteriaIdsToDelete },
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            if (uniqueAreaIds.length > 0) {
                await axios.post(
                    `${API_BASE_URL}/api/areas/delete`,
                    { areaIds: uniqueAreaIds },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }
        } catch (err) {
            const apiMessage = err?.response?.data?.message || err?.response?.data?.error;
            throw new Error(apiMessage || 'Failed to delete selected items.');
        }

        await fetchAreasForEventSafe(eventId);
        await fetchNoAreaCriteriaForEvent(eventId);
        await fetchCriteriaOptionsForEvent(eventId);
        setRequirementsData({});
        setNoAreaCriteriaData({});
        try {
            await Promise.all(Array.from(expandedAreas || []).map(id => fetchCriteriaForArea(id, true)));
        } catch (err) {
            console.error('Failed to refresh criteria after delete', err);
        }
        try {
            await Promise.all(Array.from(expandedCriteria || []).map(id => fetchRequirementsForCriteria(id, true)));
        } catch (err) {
            console.error('Failed to refresh requirements after delete', err);
        }
    };

    const closeModal = () => {
        setSelectedEvent(null);
        setExpandedAreas(new Set());
        setExpandedCriteria(new Set());
        setExpandedNoArea(new Set());
        setAreasData({});
        setCriteriaData({});
        setRequirementsData({});
        setNoAreaCriteriaData({});
        setCriteriaOptionsData({});
    };

    if (loading) return <div className="text-center py-8 text-lg">Loading standards...</div>;

    if (error) return <div className="text-center py-8 text-red-600 text-lg">Unable to load standards: {error}</div>;

    const totalPages = Math.max(1, Math.ceil(filteredEvents.length / itemsPerPage));
    const startIdx = (currentPage - 1) * itemsPerPage;
    const visibleEvents = filteredEvents.slice(startIdx, startIdx + itemsPerPage);

    return (
        <div className="w-full h-full flex flex-col bg-app overflow-hidden">
            {/* Header and Controls matching Organization layout */}
            <div className="flex flex-col gap-0 px-4 pt-1.5 pb-0 shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 mb-0.5">Compliance Standards</h1>
                        <p className="text-[11px] text-gray-500">Manage event structures, criteria, and requirement flows.</p>
                    </div>

                    {isAdmin && (
                        <div className="flex items-center gap-1.5 pt-0.5 self-start sm:self-auto flex-wrap">
                            {deleteMode && (
                                <button
                                    onClick={async () => {
                                        const ids = Array.from(selectedEventIdsForDelete).map(Number).filter(Boolean);
                                        if (ids.length === 0) return await showAlert('Select at least one standard to delete.');
                                        const confirmed = await showConfirm(`Delete ${ids.length} selected standard(s)? This cannot be undone.`);
                                        if (!confirmed) return;
                                        try {
                                            const { eventsAPI } = await import('../utils/api');
                                            const resp = await eventsAPI.deleteEvents(ids);
                                            if (resp && resp.success) {
                                                toast?.({
                                                    title: 'Events Deleted',
                                                    description: resp.message || `${ids.length} event(s) deleted successfully`,
                                                    variant: 'success',
                                                    duration: 3000,
                                                });
                                                await fetchEvents();
                                            } else {
                                                toast?.({
                                                    title: 'Delete Failed',
                                                    description: resp?.message || 'Failed to delete selected events.',
                                                    variant: 'error',
                                                    duration: 3000,
                                                });
                                            }
                                        } catch (err) {
                                            console.error('Delete events error', err);
                                            await showAlert(err?.message || 'Error deleting selected standards.');
                                        } finally {
                                            setDeleteMode(false);
                                            setSelectedEventIdsForDelete(new Set());
                                        }
                                    }}
                                    className={`inline-flex h-8 items-center rounded-lg border px-3 text-[11px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-red-400 bg-red-600 text-white hover:bg-red-700 ${selectedEventIdsForDelete.size === 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
                                    disabled={selectedEventIdsForDelete.size === 0}
                                >
                                    Delete Selected ({selectedEventIdsForDelete.size})
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => {
                                    if (deleteMode) {
                                        setDeleteMode(false);
                                        setSelectedEventIdsForDelete(new Set());
                                        return;
                                    }
                                    setDeleteMode(true);
                                    setSelectedEventIdsForDelete(new Set());
                                }}
                                className={`inline-flex h-8 items-center rounded-lg border px-3 text-[11px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-red-400 ${deleteMode
                                        ? 'border-red-300 bg-red-100 text-red-700 hover:bg-red-200'
                                        : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                                    }`}
                            >
                                {deleteMode ? 'Cancel Delete' : 'Delete'}
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsAddEventOpen(true)}
                                className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-[11px] font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                            >
                                <span className="text-sm leading-none">+</span>
                                Add
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex w-full items-center justify-between gap-2 py-1.5">
                    <div className="relative w-full max-w-sm">
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
                            placeholder="Search events, codes, or descriptions..."
                            className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            value={searchTerm}
                            onChange={handleSearchChange}
                        />
                    </div>

                    <div className="flex items-center gap-1">
                        <div className="flex h-9 items-center justify-end gap-1">
                            <div className="relative inline-block">
                                <SortEvents value={sortStatus} onChange={setSortStatus} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Events Grid */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-4">
                {visibleEvents.map((event) => {
                    const eventAssignments = (auditorAssignments?.rawList || []).filter(a => Number(a.EventID) === Number(event.EventID));
                    return (
                        <EventCard
                            key={event.EventID}
                            event={event}
                            assignedAreas={eventAssignments}
                            showCheckbox={deleteMode}
                            isChecked={selectedEventIdsForDelete.has(Number(event.EventID))}
                            onToggleSelect={(ev, checked) => {
                                setSelectedEventIdsForDelete(prev => {
                                    const next = new Set(prev);
                                    const id = Number(ev.EventID);
                                    if (checked) next.add(id);
                                    else next.delete(id);
                                    return next;
                                });
                            }}
                            onClick={() => {
                                if (deleteMode) {
                                    setSelectedEventIdsForDelete(prev => {
                                        const next = new Set(prev);
                                        const id = Number(event.EventID);
                                        if (next.has(id)) next.delete(id);
                                        else next.add(id);
                                        return next;
                                    });
                                    return;
                                }
                                openEventModal(event);
                            }}
                            onCopy={(originalEvent) => {
                                openCopyModal(originalEvent);
                            }}
                            onEdit={(originalEvent) => {
                                setEditPopup({ open: true, event: originalEvent });
                            }}
                            onDelete={async (targetEvent) => {
                                const eventId = Number(targetEvent?.EventID);
                                if (!eventId) return;

                                setSelectedEvent(null);

                                const confirmed = await showConfirm(`Delete event "${targetEvent?.EventName || eventId}"? This cannot be undone.`);
                                if (!confirmed) return;

                                try {
                                    const resp = await eventsAPI.deleteEvents([eventId]);
                                    if (resp?.success) {
                                        toast?.({
                                            title: 'Event Deleted',
                                            description: `Event "${targetEvent?.EventName || targetEvent?.EventCode || eventId}" deleted successfully`,
                                            variant: 'success',
                                            duration: 3000,
                                        });
                                        await fetchEvents();
                                        if (selectedEvent?.EventID === eventId) {
                                            setSelectedEvent(null);
                                        }
                                    } else {
                                        toast?.({
                                            title: 'Delete Failed',
                                            description: resp?.message || 'Failed to delete event.',
                                            variant: 'error',
                                            duration: 3000,
                                        });
                                    }
                                } catch (err) {
                                    console.error('Delete event error', err);
                                    toast?.({
                                        title: 'Delete Error',
                                        description: err?.message || 'Error deleting event.',
                                        variant: 'error',
                                        duration: 3000,
                                    });
                                }
                            }}
                        />
                    );
                })}
                </div>
            </div>

            {/* Pagination */}
            <div className="w-full flex justify-center py-2 shrink-0 bg-transparent">
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={page => setCurrentPage(page)}
                    fixed={true}
                    showWhenSinglePage={true}
                />
            </div>

            {/* Edit Event Popup */}
            <EditEventPopup
                open={editPopup.open}
                event={editPopup.event}
                onCancel={() => {
                    setEditPopup({ open: false, event: null });
                }}
                onConfirm={async ({ EventName, EventCode, Description, status, accreditation_level, EventID }) => {
                    const eventId = EventID || editPopup.event?.EventID;
                    if (!eventId) return;
                    try {
                        await eventsAPI.updateEvent(eventId, {
                            EventName,
                            EventCode,
                            Description,
                            status,
                            accreditation_level
                        });
                        await fetchEvents();
                        setEditPopup({ open: false, event: null });
                        setSelectedEvent(prev => prev && (prev.EventID === eventId || prev.EventID === Number(eventId)) ? {
                            ...prev,
                            EventName,
                            EventCode,
                            Description,
                            status,
                            accreditation_level
                        } : prev);
                        await showAlert('Event updated successfully!', 'success');
                    } catch (err) {
                        await showAlert('Failed to update event: ' + (err?.response?.data?.message || err.message), 'error');
                    }
                }}
            />

            {/* Add Event Modal triggered from Actions menu */}
            {isAddEventOpen && (
                <AddEventModal
                    isOpen={isAddEventOpen}
                    onClose={() => setIsAddEventOpen(false)}
                    onSuccess={async (data) => {
                        setIsAddEventOpen(false);
                        try {
                            await fetchEvents();
                        } catch (err) {
                            console.error('Failed to refresh events after add', err);
                        }
                    }}
                />
            )}

            {/* Modal */}
            {!copyPopup.open && !editPopup.open && (
                <EventPopup
                    selectedEvent={selectedEvent}
                    areasData={areasData}
                    criteriaData={criteriaData}
                    requirementsData={requirementsData}
                    expandedAreas={expandedAreas}
                    expandedCriteria={expandedCriteria}
                    expandedNoArea={expandedNoArea}
                    noAreaCriteriaData={noAreaCriteriaData}
                    criteriaOptions={criteriaOptionsData[selectedEvent?.EventID] || []}
                    loadingAreas={loadingAreas}
                    loadingCriteria={loadingCriteria}
                    loadingRequirements={loadingRequirements}
                    loadingNoAreaCriteria={loadingNoAreaCriteria}
                    onClose={closeModal}
                    onToggleArea={toggleArea}
                    onToggleCriteria={toggleCriteria}
                    onToggleNoArea={() => toggleNoAreaSection(selectedEvent?.EventID)}
                    onAddArea={addArea}
                    onAddNoAreaCriteria={addNoAreaCriteria}
                    onAddCriteria={addCriteria}
                    onAddRequirement={addRequirement}
                    onLoadRequirementsByCriteria={loadRequirementsByCriteria}
                    onPrepareStructureData={() => {
                        if (selectedEvent?.EventID && !criteriaOptionsData[selectedEvent.EventID]) {
                            fetchCriteriaOptionsForEvent(selectedEvent.EventID);
                        }
                    }}
                    onEditArea={editArea}
                    onEditCriteria={editCriteria}
                    onBulkDelete={bulkDeleteHierarchy}
                    onEditEvent={(evt) => setEditPopup({ open: true, event: evt })}
                    onCopyEvent={(evt) => openCopyModal(evt)}
                    isAdmin={isAdmin}
                />
            )}
            {/* Copy Event Popup */}
            {copyPopup.open && (
                <CopyEventPopup
                    open={copyPopup.open}
                    defaultName={copyPopup.defaultName || (copyPopup.event?.EventName ? copyPopup.event.EventName + ' (Copy)' : '')}
                    defaultCode={copyPopup.defaultCode || (copyPopup.event?.EventCode ? copyPopup.event.EventCode + '-COPY' : '')}
                    defaultDescription={copyPopup.event?.Description || ''}
                    onCancel={() => setCopyPopup({ open: false, event: null })}
                    onConfirm={async ({ eventName, eventCode, description }) => {
                        try {
                            const token = localStorage.getItem('token');
                            await axios.post(`${API_BASE_URL}/api/events/copy`, {
                                sourceEventId: copyPopup.event.EventID,
                                newEventName: eventName,
                                newEventCode: eventCode,
                                newDescription: description
                            }, {
                                headers: { Authorization: `Bearer ${token}` }
                            });
                            setCopyPopup({ open: false, event: null });
                            await fetchEvents();
                            toast?.({
                                title: 'Event Copied',
                                description: `Successfully copied "${eventName}"`,
                                variant: 'success',
                                duration: 3000,
                            });
                        } catch (err) {
                            toast?.({
                                title: 'Copy Failed',
                                description: err?.response?.data?.message || err.message || 'Failed to copy event',
                                variant: 'error',
                                duration: 3000,
                            });
                        }
                    }}
                />
            )}
        </div>
    );
}

export default ALL;
