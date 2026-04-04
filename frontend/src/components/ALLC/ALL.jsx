import CopyEventPopup from './CopyEventPopup';
import { useState, useEffect, useRef } from 'react';
import Pagination from '../Pagination/Pagination';
import Header from '../Header/header';
import axios from 'axios';
import SortEvents from './sortevents';

import EventCard from './EventCard';
import EventPopup from './EventPopup';

import EditEventPopup from './EditEventPopup';
import { eventsAPI, usersAPI } from '../../utils/api';
import AddEventModal from '../AddEvent/AddEventModal';


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
        // Search helpers
        const matchesSearch = (text, searchLower) => {
            return (text?.toLowerCase() || '').includes(searchLower);
        };

        const eventMatchesSearch = (event, searchLower) => {
            return matchesSearch(event.EventName, searchLower) ||
                   matchesSearch(event.EventCode, searchLower) ||
                   matchesSearch(event.Description, searchLower);
        };


    // Filter by search and status
    const filteredEvents = events.filter(event => {
        // Status filter (normalize backend field variants)
        const eventStatus = String(event.status || event.Status || '').toLowerCase().trim();
        if (sortStatus === 'active' && eventStatus !== 'active') return false;
        if (sortStatus === 'inactive' && eventStatus !== 'inactive') return false;
        // Search filter
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
    
    // Track abort controllers to cancel stale requests
    const abortControllersRef = useRef({});
    
    const itemsPerPage = 4; // 2x2 grid


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

    // Removed auto-selecting the first event to prevent modal from opening automatically

    // When event changes, fetch its areas
    useEffect(() => {
        if (selectedEvent) {
            fetchAreasForEventSafe(selectedEvent.EventID);
            fetchNoAreaCriteriaForEvent(selectedEvent.EventID);
            fetchCriteriaOptionsForEvent(selectedEvent.EventID);
        }
    }, [selectedEvent?.EventID]);

    const fetchCriteriaOptionsForEvent = async (eventId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`http://localhost:5000/api/criteria/event/${eventId}`, {
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
            const response = await axios.get(`http://localhost:5000/api/criteria/event/${eventId}`, {
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
            const response = await axios.get('http://localhost:5000/api/events', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEvents(response.data.data || []);
            setError(null);
        } catch (err) {
            console.error('Error fetching events:', err);
            setError('Failed to load events');
        } finally {
            setLoading(false);
        }
    };

    const fetchAreasForEvent = async (eventId, force = false) => {
        // Skip if already cached and not forcing refresh
        if (!force && areasData[eventId]) return;
        
        try {
            setLoadingAreas(prev => new Set([...prev, eventId]));
            const token = localStorage.getItem('token');
            const response = await axios.get(`http://localhost:5000/api/areas/event/${eventId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAreasData(prev => ({ ...prev, [eventId]: response.data.data || [] }));
        } catch (err) {
            console.error('❌ Error fetching areas:', err);
        } finally {
            setLoadingAreas(prev => {
                const newSet = new Set(prev);
                newSet.delete(eventId);
                return newSet;
            });
        }
    };

    const fetchAreasForEventSafe = async (eventId) => {
        // Cancel any previous request for this event
        if (abortControllersRef.current[eventId]) {
            abortControllersRef.current[eventId].abort();
        }

        // Create new abort controller for this request
        const controller = new AbortController();
        abortControllersRef.current[eventId] = controller;

        try {
            setLoadingAreas(prev => new Set([...prev, eventId]));
            const token = localStorage.getItem('token');
            const response = await axios.get(`http://localhost:5000/api/areas/event/${eventId}`, {
                headers: { Authorization: `Bearer ${token}` },
                signal: controller.signal
            });

            // Only update if request wasn't aborted
            if (!controller.signal.aborted) {
                // CLEAR OLD DATA and set only new event's data
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
        // Prevent opening EventPopup if copy popup is active
        if (copyPopup.open) return;
        // Reset expanded states
        setExpandedAreas(new Set());
        setExpandedCriteria(new Set());
        setExpandedNoArea(new Set());
        // Set the selected event - useEffect will auto-fetch areas
        setSelectedEvent(event);
    };

    const fetchCriteriaForArea = async (areaId, force = false) => {
        // Skip if already cached and not forcing refresh
        if (criteriaData[areaId] && !force) return;
        
        try {
            setLoadingCriteria(prev => new Set([...prev, areaId]));
            const token = localStorage.getItem('token');
            const response = await axios.get(`http://localhost:5000/api/criteria/area/${areaId}`, {
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
        // Skip if already cached and not forcing refresh
        if (requirementsData[criteriaId] && !force) return;
        
        try {
            setLoadingRequirements(prev => new Set([...prev, criteriaId]));
            const token = localStorage.getItem('token');
            let requirements = [];

            try {
                const response = await axios.get(`http://localhost:5000/api/requirements/criteria/${criteriaId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                requirements = Array.isArray(response.data?.data) ? response.data.data : [];
            } catch {
                // Fallback for older backend instances where /criteria/:id is unavailable
            }

            if (requirements.length === 0) {
                const fallbackResponse = await axios.get('http://localhost:5000/api/requirements/all', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const allRequirements = Array.isArray(fallbackResponse.data?.data) ? fallbackResponse.data.data : [];
                requirements = allRequirements.filter(req => Number(req.CriteriaID) === Number(criteriaId));
            }

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
            // Fetch criteria if not already cached
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
            // Fetch requirements if not already cached
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
            }
            return next;
        });
    };

    const addArea = async (eventId, data) => {
        const token = localStorage.getItem('token');
        try {
            await axios.post('http://localhost:5000/api/areas/add', {
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
            await axios.put(`http://localhost:5000/api/areas/${areaId}`, {
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
            await axios.put(`http://localhost:5000/api/criteria/${criteriaId}`, {
                CriteriaCode: data.CriteriaCode,
                CriteriaName: data.CriteriaName,
                Description: data.Description || null,
                AreaID: data.AreaID ?? null,
                ParentCriteriaID: data.ParentCriteriaID ?? null,
                EventID: data.EventID
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Refresh criteria lists for event
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
            await axios.post('http://localhost:5000/api/criteria/add', {
                EventID: eventId,
                AreaID: data.AreaID ?? null,
                CriteriaCode: data.CriteriaCode,
                CriteriaName: data.CriteriaName,
                Description: data.Description,
                ParentCriteriaID: null
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
            await axios.post('http://localhost:5000/api/requirements/add', payload, {
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
            const response = await axios.get(`http://localhost:5000/api/requirements/criteria/${criteriaId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const list = Array.isArray(response.data?.data) ? response.data.data : [];
            setRequirementsData(prev => ({ ...prev, [Number(criteriaId)]: list }));
            return list;
        } catch {
            const fallback = await axios.get('http://localhost:5000/api/requirements/all', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const all = Array.isArray(fallback.data?.data) ? fallback.data.data : [];
            const list = all.filter(req => Number(req.CriteriaID) === Number(criteriaId));
            setRequirementsData(prev => ({ ...prev, [Number(criteriaId)]: list }));
            return list;
        }
    };

    const bulkDeleteHierarchy = async ({ eventId, areaIds = [], criteriaIds = [], requirementIds = [] }) => {
        const token = localStorage.getItem('token');

        const uniqueAreaIds = [...new Set((areaIds || []).map(Number).filter(Boolean))];
        const uniqueCriteriaIds = [...new Set((criteriaIds || []).map(Number).filter(Boolean))];
        const uniqueRequirementIds = [...new Set((requirementIds || []).map(Number).filter(Boolean))];

        let criteriaIdsToDelete = [...uniqueCriteriaIds];

        if (uniqueAreaIds.length > 0) {
            const criteriaResponse = await axios.get(`http://localhost:5000/api/criteria/event/${eventId}`, {
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
            const requirementsResponse = await axios.get('http://localhost:5000/api/requirements/all', {
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
                    'http://localhost:5000/api/requirements/delete',
                    { requirementIds: requirementIdsToDelete },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }

            if (criteriaIdsToDelete.length > 0) {
                await axios.delete('http://localhost:5000/api/criteria/delete', {
                    data: { criteriaIds: criteriaIdsToDelete },
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            if (uniqueAreaIds.length > 0) {
                await axios.post(
                    'http://localhost:5000/api/areas/delete',
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
        // Clear cached requirements so UI won't show stale data
        setRequirementsData({});
        setNoAreaCriteriaData({});
        // Refresh criteria for any expanded areas (so criteria lists are repopulated)
        try {
            await Promise.all(Array.from(expandedAreas || []).map(id => fetchCriteriaForArea(id, true)));
        } catch (err) {
            console.error('Failed to refresh criteria after delete', err);
        }
        // Refresh requirements for any currently-expanded criteria so the UI reflects deletions immediately
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

    // Always render the header and controls even when there are no events.
    // The empty-state message will be shown in the events grid area below.

    // Pagination
    const totalPages = Math.ceil(events.length / itemsPerPage);
    const startIdx = (currentPage - 1) * itemsPerPage;
    const paginatedEvents = events.slice(startIdx, startIdx + itemsPerPage);

    return (
        <div className="px-4 pb-6 pt-6 w-full overflow-hidden">
            <Header />
            <div className="mb-4 flex flex-col gap-2 relative">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 mb-1">Compliance Standards</h1>
                        <p className="text-xs text-gray-600 ">{deleteMode ? '\u00A0' : 'Manage event structures, criteria, and requirement flows.'}</p>
                    </div>

                    {isAdmin && (
                    <div className="flex items-center gap-1 pt-0.5">
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
                            onClick={() => setIsAddEventOpen(true)}
                            className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-[11px] font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <span className="text-sm leading-none">+</span>
                            Add
                        </button>
                    </div>
                    )}
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
                                placeholder="Search events, codes, or descriptions..."
                                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-[9px] text-slate-700 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
                {isAdmin && deleteMode && (
                    <div style={{ position: 'absolute', left: -9, bottom: -9 }} className="flex items-center gap-2 rounded px-3 py-2">
                        <button
                            onClick={() => { setDeleteMode(false); setSelectedEventIdsForDelete(new Set()); }}
                            className="px-3 py-2 rounded border-2 border-gray-200 text-gray-700 hover:bg-gray-100"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={async () => {
                                const ids = Array.from(selectedEventIdsForDelete).map(Number).filter(Boolean);
                                if (ids.length === 0) {
                                    alert('Select at least one standard to delete.');
                                    return;
                                }
                                const confirmed = window.confirm(`Delete ${ids.length} selected standard(s)? This cannot be undone.`);
                                if (!confirmed) return;
                                try {
                                    const { eventsAPI } = await import('../../utils/api');
                                    const resp = await eventsAPI.deleteEvents(ids);
                                    if (resp && resp.success) {
                                        alert(resp.message || 'Selected standards deleted.');
                                        await fetchEvents();
                                    } else {
                                        alert(resp?.message || 'Failed to delete selected standards.');
                                    }
                                } catch (err) {
                                    console.error('Delete events error', err);
                                    alert(err?.message || 'Error deleting selected standards.');
                                } finally {
                                    setDeleteMode(false);
                                    setSelectedEventIdsForDelete(new Set());
                                }
                            }}
                            className={`px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700 ${selectedEventIdsForDelete.size === 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
                            disabled={selectedEventIdsForDelete.size === 0}
                        >
                            Delete Selected ({selectedEventIdsForDelete.size})
                        </button>
                    </div>
                )}
            </div>

            {/* Events Grid 2x2 */}
            <div className="grid grid-cols-2 gap-6 mb-8">
                {filteredEvents.slice(startIdx, startIdx + itemsPerPage).map((event) => (
                    <EventCard
                        key={event.EventID}
                        event={event}
                        onClick={() => {
                            if (deleteMode) {
                                // toggle selection when clicking card in delete mode
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
                            setCopyPopup({ open: true, event: originalEvent });
                        }}
                        onEdit={(originalEvent) => {
                            setEditPopup({ open: true, event: originalEvent });
                        }}
                        onDelete={async (targetEvent) => {
                            const eventId = Number(targetEvent?.EventID);
                            if (!eventId) return;

                            const confirmed = window.confirm(`Delete event "${targetEvent?.EventName || eventId}"? This cannot be undone.`);
                            if (!confirmed) return;

                            try {
                                const resp = await eventsAPI.deleteEvents([eventId]);
                                if (resp?.success) {
                                    await fetchEvents();
                                    if (selectedEvent?.EventID === eventId) {
                                        setSelectedEvent(null);
                                    }
                                } else {
                                    alert(resp?.message || 'Failed to delete event.');
                                }
                            } catch (err) {
                                console.error('Delete event error', err);
                                alert(err?.message || 'Error deleting event.');
                            }
                        }}
                        showCheckbox={deleteMode}
                        isAdmin={isAdmin}
                        isChecked={selectedEventIdsForDelete.has(Number(event.EventID))}
                        onToggleSelect={(evt, checked) => {
                            setSelectedEventIdsForDelete(prev => {
                                const next = new Set(prev);
                                const id = Number(evt.EventID);
                                if (checked) next.add(id); else next.delete(id);
                                return next;
                            });
                        }}
                    />
                ))}
                {/* Edit Event Popup */}
                <EditEventPopup
                    open={editPopup.open}
                    event={editPopup.event}
                    onCancel={() => {
                        setEditPopup({ open: false, event: null });
                        setSelectedEvent(null);
                    }}
                    onConfirm={async ({ EventName, EventCode, Description, status, EventID }) => {
                        const eventId = EventID || editPopup.event?.EventID;
                        if (!eventId) return;
                        try {
                            await eventsAPI.updateEvent(eventId, {
                                EventName,
                                EventCode,
                                Description,
                                status
                            });
                            await fetchEvents();
                            setEditPopup({ open: false, event: null });
                            setSelectedEvent(null);
                            alert('Event updated successfully!');
                        } catch (err) {
                            alert('Failed to update event: ' + (err?.response?.data?.message || err.message));
                        }
                    }}
                />
            </div>

            <div className="w-full flex justify-center mt-1 -mt-5 mb-">
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={page => setCurrentPage(page)}
                    fixed={true}
                    showWhenSinglePage={true}
                />
            </div>

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
            {/* Only show EventPopup if not copying or editing */}
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
                    onEditArea={editArea}
                    onEditCriteria={editCriteria}
                    onBulkDelete={bulkDeleteHierarchy}
                />
            )}
            {/* Copy Event Popup */}
            {copyPopup.open && (
                <CopyEventPopup
                    open={copyPopup.open}
                    defaultName={copyPopup.event?.EventName ? copyPopup.event.EventName + ' (Copy)' : ''}
                    defaultCode={copyPopup.event?.EventCode ? copyPopup.event.EventCode + '-COPY' : ''}
                    defaultDescription={copyPopup.event?.Description || ''}
                    onCancel={() => setCopyPopup({ open: false, event: null })}
                    onConfirm={async ({ eventName, eventCode, description }) => {
                        try {
                            const token = localStorage.getItem('token');
                            await axios.post('http://localhost:5000/api/events/copy', {
                                sourceEventId: copyPopup.event.EventID,
                                newEventName: eventName,
                                newEventCode: eventCode,
                                newDescription: description
                            }, {
                                headers: { Authorization: `Bearer ${token}` }
                            });
                            setCopyPopup({ open: false, event: null });
                            await fetchEvents();
                            alert('Event copied successfully!');
                        } catch (err) {
                            alert('Failed to copy event: ' + (err?.response?.data?.message || err.message));
                        }
                    }}
                />
            )}
        </div>
    );
}

export default ALL;
