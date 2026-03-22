import CopyEventPopup from './CopyEventPopup';
import { useState, useEffect, useRef } from 'react';
import Header from '../Header/header';
import axios from 'axios';

import EventCard from './EventCard';
import EventPopup from './EventPopup';

import EditEventPopup from './EditEventPopup';
import { eventsAPI } from '../../utils/api';


function ALL() {
    const [events, setEvents] = useState([]);
    const [copyPopup, setCopyPopup] = useState({ open: false, event: null });
    const [editPopup, setEditPopup] = useState({ open: false, event: null });
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

        // Only event-level search for now (can expand to areas/criteria if needed)
        const filteredEvents = events.filter(event => {
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
    
    // Track abort controllers to cancel stale requests
    const abortControllersRef = useRef({});
    
    const itemsPerPage = 4; // 2x2 grid


    useEffect(() => {
        fetchEvents();
    }, []);

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
            return Array.isArray(response.data?.data) ? response.data.data : [];
        } catch {
            const fallback = await axios.get('http://localhost:5000/api/requirements/all', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const all = Array.isArray(fallback.data?.data) ? fallback.data.data : [];
            return all.filter(req => Number(req.CriteriaID) === Number(criteriaId));
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

    if (loading) return <div className="text-center py-8 text-lg">Loading events...</div>;

    if (error) return <div className="text-center py-8 text-red-600 text-lg">Error: {error}</div>;

    if (!events || events.length === 0) {
        return <div className="text-center py-8 text-gray-600 text-lg">No events found. Please add an event in the system.</div>;
    }

    // Pagination
    const totalPages = Math.ceil(events.length / itemsPerPage);
    const startIdx = (currentPage - 1) * itemsPerPage;
    const paginatedEvents = events.slice(startIdx, startIdx + itemsPerPage);

    return (
        <div className="bg-gray-50 h-[calc(100vh-6rem)] lg:h-[calc(100vh-4rem)] p-6 overflow-hidden pt-24">
            <Header />
            <div className="mb-8 flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-gray-800 mb-2">Standards Management</h1>
                    <p className="text-gray-600">Compliance Audit System - Click event to view details</p>
                </div>
                <input
                    type="text"
                    placeholder="Search standards..."
                    className="border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                    style={{ minWidth: 220 }}
                    value={searchTerm}
                    onChange={handleSearchChange}
                />
            </div>

            {/* Events Grid 2x2 */}
            <div className="grid grid-cols-2 gap-6 mb-8">
                {filteredEvents.slice(startIdx, startIdx + itemsPerPage).map((event) => (
                    <EventCard
                        key={event.EventID}
                        event={event}
                        onClick={() => openEventModal(event)}
                        onCopy={(originalEvent) => {
                            setCopyPopup({ open: true, event: originalEvent });
                        }}
                        onEdit={(originalEvent) => {
                            setEditPopup({ open: true, event: originalEvent });
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
                    onConfirm={async ({ eventName, eventCode, description }) => {
                        if (!editPopup.event) return;
                        try {
                            await eventsAPI.updateEvent(editPopup.event.EventID, {
                                EventName: eventName,
                                EventCode: eventCode,
                                Description: description
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

            {/* Pagination */}
            {filteredEvents.length > itemsPerPage && (
                <div className="flex justify-center gap-2 mb-8">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
                    >
                        Previous
                    </button>
                    <div className="flex items-center gap-2">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`px-3 py-2 rounded ${
                                    currentPage === page
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                }`}
                            >
                                {page}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
                    >
                        Next
                    </button>
                </div>
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
