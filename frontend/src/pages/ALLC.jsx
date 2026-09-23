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
import { StandardsSkeleton } from '../components/UI/Skeleton';
import ServerOfflineState from '../components/UI/ServerOfflineState';
import { useLiveRefresh } from '../utils/liveSync';
import ViewModeToggle from '../components/UI/ViewModeToggle';

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
    const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'
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
    const itemsPerPage = viewMode === 'list' ? 8 : 4;

    useEffect(() => {
        setCurrentPage(1);
    }, [sortStatus, searchTerm, viewMode]);

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

    const [isRetrying, setIsRetrying] = useState(false);

    const fetchEvents = async (options = false) => {
        const isRetry = options === true;
        const isSilent = Boolean(options && typeof options === 'object' && options.silent);

        try {
            if (isRetry) setIsRetrying(true);
            else if (!isSilent) setLoading(true);
            
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/api/events`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEvents(response.data?.data || []);
            setError(null);
        } catch (err) {
            console.error('Error fetching events:', err);
            if (!isSilent) {
                if (err.response?.status === 429) {
                    setError('Rate limit exceeded (Max 30 requests/min). Please try again later.');
                } else if (!err.response || err.code === 'ERR_NETWORK' || err.message?.toLowerCase().includes('network error') || err.message?.toLowerCase().includes('failed to fetch')) {
                    setError('Server Offline');
                } else {
                    setError(err.response?.data?.message || 'Failed to load events');
                }
            }
        } finally {
            if (!isSilent) setLoading(false);
            if (isRetry) setIsRetrying(false);
        }
    };

    // Real-time live synchronization for events
    useLiveRefresh(fetchEvents);

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

    const totalPages = Math.max(1, Math.ceil(filteredEvents.length / itemsPerPage));
    const startIdx = (currentPage - 1) * itemsPerPage;
    const visibleEvents = filteredEvents.slice(startIdx, startIdx + itemsPerPage);
    const activeCount = events.filter(e => String(e.status || e.Status || '').toLowerCase().trim() !== 'inactive').length;

    const handleDeleteEvent = async (targetEvent) => {
        const eventId = Number(targetEvent?.EventID);
        if (!eventId) return;

        setSelectedEvent(null);

        const confirmed = await showConfirm(`Delete accreditation "${targetEvent?.EventName || targetEvent?.EventCode || eventId}"? This cannot be undone.`);
        if (!confirmed) return;

        try {
            const resp = await eventsAPI.deleteEvents([eventId]);
            if (resp?.success) {
                toast?.({
                    title: 'Accreditation Deleted',
                    description: `Accreditation "${targetEvent?.EventName || targetEvent?.EventCode || eventId}" deleted successfully`,
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
                    description: resp?.message || 'Failed to delete standard.',
                    variant: 'error',
                    duration: 3000,
                });
            }
        } catch (err) {
            console.error('Delete standard error', err);
            toast?.({
                title: 'Delete Error',
                description: err?.message || 'Error deleting standard.',
                variant: 'error',
                duration: 3000,
            });
        }
    };

    return (
        <div className="w-full flex-1 flex flex-col min-w-0 bg-slate-50/50 overflow-hidden">
            {/* Top Header & Metrics */}
            <div className="px-4 sm:px-6 pt-4 pb-3 shrink-0 border-b border-slate-200/70 bg-white shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-500/20 shrink-0">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">Accreditation & Quality Standards</h1>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Manage accreditation frameworks, quality audit criteria, and requirement structures.
                            </p>
                        </div>
                    </div>

                    {isAdmin && (
                        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
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
                                                    title: 'Standards Deleted',
                                                    description: resp.message || `${ids.length} standard(s) deleted successfully`,
                                                    variant: 'success',
                                                    duration: 3000,
                                                });
                                                await fetchEvents();
                                            } else {
                                                toast?.({
                                                    title: 'Delete Failed',
                                                    description: resp?.message || 'Failed to delete selected standards.',
                                                    variant: 'error',
                                                    duration: 3000,
                                                });
                                            }
                                        } catch (err) {
                                            console.error('Delete standards error', err);
                                            await showAlert(err?.message || 'Error deleting selected standards.');
                                        } finally {
                                            setDeleteMode(false);
                                            setSelectedEventIdsForDelete(new Set());
                                        }
                                    }}
                                    disabled={selectedEventIdsForDelete.size === 0}
                                    className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold shadow-xs transition-all ${
                                        selectedEventIdsForDelete.size === 0
                                            ? 'border-red-200 bg-red-50/50 text-red-400 cursor-not-allowed'
                                            : 'border-red-600 bg-red-600 text-white hover:bg-red-700 active:scale-95 shadow-red-500/20 cursor-pointer'
                                    }`}
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
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
                                className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-all cursor-pointer ${
                                    deleteMode
                                        ? 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                                        : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-300'
                                }`}
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={deleteMode ? "M6 18L18 6M6 6l12 12" : "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"} />
                                </svg>
                                {deleteMode ? 'Cancel' : 'Delete Mode'}
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsAddEventOpen(true)}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-emerald-700 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                Add Accreditation
                            </button>
                        </div>
                    )}
                </div>

                {/* Toolbar: Search, Filter, View Mode */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mt-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2 flex-1 max-w-md">
                        <div className="relative w-full">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                            >
                                <circle cx="11" cy="11" r="7" />
                                <path d="m20 20-3.5-3.5" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search accreditations or codes..."
                                className="h-9 w-full rounded-xl border border-slate-200/90 bg-slate-50/60 pl-9.5 pr-8 text-xs text-slate-800 placeholder-slate-400 shadow-2xs transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                value={searchTerm}
                                onChange={handleSearchChange}
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md cursor-pointer"
                                    aria-label="Clear search"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                        <div className="relative inline-block">
                            <SortEvents value={sortStatus} onChange={setSortStatus} />
                        </div>

                        {/* View Switcher: Grid vs List */}
                        <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
                    </div>
                </div>
            </div>

            {/* Events Grid / List / Skeleton / Offline / Empty View */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 pb-16 min-h-0 flex flex-col">
                {loading ? (
                    <StandardsSkeleton count={4} />
                ) : error ? (
                    <ServerOfflineState
                        onRetry={() => fetchEvents(true)}
                        isRetrying={isRetrying}
                        title={error === 'Server Offline' ? 'Backend Server Unavailable' : 'Unable to Load Standards'}
                        message={error === 'Server Offline' 
                            ? 'The backend server is unreachable or offline. If you stopped the backend server, please start it and click Retry Connection.' 
                            : error}
                    />
                ) : filteredEvents.length === 0 ? (
                    <div className="flex-1 w-full min-h-[360px] flex flex-col items-center justify-center p-8 text-center bg-white border border-dashed border-slate-200 rounded-2xl animate-fadeIn my-auto shadow-2xs">
                        <div className="h-16 w-16 rounded-2xl bg-blue-50 border border-blue-100 text-blue-500 flex items-center justify-center mb-3.5 shadow-2xs">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                        </div>
                        <h3 className="text-base font-bold text-slate-800 mb-1">No Standards Found</h3>
                        <p className="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed">
                            {searchTerm ? 'No accreditations match your search query.' : 'No accreditations have been created yet.'}
                        </p>
                        {searchTerm ? (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition cursor-pointer"
                            >
                                Clear Search Filter
                            </button>
                        ) : isAdmin ? (
                            <button
                                type="button"
                                onClick={() => setIsAddEventOpen(true)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition shadow-sm cursor-pointer"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                                Add First Accreditation
                            </button>
                        ) : null}
                    </div>
                ) : viewMode === 'grid' ? (
                    /* Grid Layout (2x2 / responsive cards) */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
                        {visibleEvents.map((event) => {
                            const eventAssignments = (auditorAssignments?.rawList || []).filter(a => Number(a.EventID) === Number(event.EventID));
                            return (
                                <EventCard
                                    key={event.EventID}
                                    event={event}
                                    assignedAreas={eventAssignments}
                                    isAdmin={isAdmin}
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
                                    onDelete={handleDeleteEvent}
                                />
                            );
                        })}
                    </div>
                ) : (
                    /* List / Table Layout */
                    <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
                        <div className="overflow-x-auto flex-1 custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                        {deleteMode && <th className="py-3 px-4 w-10 text-center">Select</th>}
                                        <th className="py-3 px-4">Accreditation & Code</th>
                                        <th className="py-3 px-4">Level</th>
                                        <th className="py-3 px-4">Status</th>
                                        {isAuditor && <th className="py-3 px-4">Assigned Areas</th>}
                                        <th className="py-3 px-4">Timestamps</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {visibleEvents.map((event) => {
                                        const eventAssignments = (auditorAssignments?.rawList || []).filter(a => Number(a.EventID) === Number(event.EventID));
                                        const isActive = String(event.status || event.Status || '').toLowerCase().trim() !== 'inactive';
                                        const isChecked = selectedEventIdsForDelete.has(Number(event.EventID));

                                        return (
                                            <tr
                                                key={event.EventID}
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
                                                className={`group transition-colors cursor-pointer ${
                                                    isChecked ? 'bg-blue-50/50' : 'hover:bg-slate-50/80'
                                                }`}
                                            >
                                                {deleteMode && (
                                                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={(e) => {
                                                                setSelectedEventIdsForDelete(prev => {
                                                                    const next = new Set(prev);
                                                                    const id = Number(event.EventID);
                                                                    if (e.target.checked) next.add(id);
                                                                    else next.delete(id);
                                                                    return next;
                                                                });
                                                            }}
                                                            aria-label={`Select ${event.EventName}`}
                                                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                        />
                                                    </td>
                                                )}
                                                <td className="py-3.5 px-4">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 border border-blue-100 text-blue-600 shrink-0 font-bold text-xs">
                                                            {event.EventCode ? event.EventCode.slice(0, 2).toUpperCase() : 'ST'}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                                                                {event.EventName}
                                                            </div>
                                                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
                                                                <span className="font-semibold text-blue-600">{event.EventCode || 'STANDARD'}</span>
                                                                {event.Description && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span className="truncate">{event.Description}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    {event.accreditation_level && event.accreditation_level.toUpperCase() !== 'N/A' ? (
                                                        <span className="inline-flex items-center rounded-md bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                                                            {event.accreditation_level}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 text-[11px]">—</span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                        isActive
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                                                    }`}>
                                                        <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                                        {isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                {isAuditor && (
                                                    <td className="py-3.5 px-4">
                                                        {eventAssignments.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1 max-w-xs">
                                                                {eventAssignments.slice(0, 2).map(a => (
                                                                    <span key={a.id || a.area_id} className="inline-flex items-center rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                                                                        {a.AreaCode || a.AreaName}
                                                                    </span>
                                                                ))}
                                                                {eventAssignments.length > 2 && (
                                                                    <span className="text-[10px] text-slate-500 font-semibold self-center">
                                                                        +{eventAssignments.length - 2} more
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400 text-[11px]">—</span>
                                                        )}
                                                    </td>
                                                )}
                                                <td className="py-3.5 px-4 whitespace-nowrap text-[11px] text-slate-500">
                                                    <div>{new Date(event.CreatedAt).toLocaleDateString()}</div>
                                                    <div className="text-[10px] text-slate-400">Updated: {new Date(event.UpdatedAt || event.CreatedAt).toLocaleDateString()}</div>
                                                </td>
                                                <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => openEventModal(event)}
                                                            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200/60 px-2.5 py-1 text-xs font-semibold text-blue-700 transition cursor-pointer"
                                                        >
                                                            Structure
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                                            </svg>
                                                        </button>
                                                        {isAdmin && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setEditPopup({ open: true, event })}
                                                                    title="Edit Standard"
                                                                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition cursor-pointer"
                                                                >
                                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                    </svg>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openCopyModal(event)}
                                                                    title="Copy Standard"
                                                                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 transition cursor-pointer"
                                                                >
                                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                                                    </svg>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteEvent(event)}
                                                                    title="Delete Standard"
                                                                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                                                >
                                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
                                                                    </svg>
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {!loading && !error && filteredEvents.length > 0 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(p) => setCurrentPage(p)}
                    fixed={true}
                    showWhenSinglePage={true}
                />
            )}

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
