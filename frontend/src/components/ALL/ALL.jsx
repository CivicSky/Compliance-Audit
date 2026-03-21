import React, { useState, useRef, useEffect, useCallback } from "react";
import Header from "../Header/header"
import AddEventModal from "../AddEvent/AddEventModal";
import UnifiedSetupWizard from "../UnifiedSetupWizard/UnifiedSetupWizard";
import { Wand2, ChevronDown, ChevronRight, Plus, X } from "lucide-react";
import { usersAPI, eventsAPI, areasAPI, requirementsAPI, criteriaAPI } from "../../utils/api";

export default function Events() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showWizard, setShowWizard] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    
    // Data states
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Expansion states - track which items are expanded
    const [expandedEvents, setExpandedEvents] = useState(new Set());
    const [expandedAreas, setExpandedAreas] = useState(new Set());
    const [expandedCriteria, setExpandedCriteria] = useState(new Set());
    
    // Nested data cache
    const [areasData, setAreasData] = useState({}); // { eventId: [areas] }
    const [criteriaData, setCriteriaData] = useState({}); // { areaId: [criteria] }
    const [requirementsData, setRequirementsData] = useState({}); // { criteriaId: [requirements] }
    const [noAreaCriteriaData, setNoAreaCriteriaData] = useState({}); // { eventId: [criteria without area] }
    
    // Loading states for nested items
    const [loadingAreas, setLoadingAreas] = useState(new Set());
    const [loadingCriteria, setLoadingCriteria] = useState(new Set());
    const [loadingRequirements, setLoadingRequirements] = useState(new Set());
    const [loadingNoAreaCriteria, setLoadingNoAreaCriteria] = useState(new Set());

    // Add Area inline form state
    const [showAddAreaForm, setShowAddAreaForm] = useState(null); // eventId or null
    const [newAreaData, setNewAreaData] = useState({ AreaCode: '', AreaName: '', Description: '' });
    const [addingArea, setAddingArea] = useState(false);

    // Add Criteria (No Area) inline form state
    const [showAddNoAreaCriteriaForm, setShowAddNoAreaCriteriaForm] = useState(null); // eventId or null
    const [newNoAreaCriteriaData, setNewNoAreaCriteriaData] = useState({ CriteriaCode: '', CriteriaName: '', Description: '' });
    const [addingNoAreaCriteria, setAddingNoAreaCriteria] = useState(false);

    // Add Criteria (under Area) inline form state
    const [showAddCriteriaForm, setShowAddCriteriaForm] = useState(null); // "eventId-areaId" key or null
    const [newCriteriaData, setNewCriteriaData] = useState({ CriteriaCode: '', CriteriaName: '', Description: '' });
    const [addingCriteria, setAddingCriteria] = useState(false);

    // Add Requirement (under Criteria) inline form state
    const [showAddRequirementForm, setShowAddRequirementForm] = useState(null); // criteriaId or null
    const [newRequirementData, setNewRequirementData] = useState({ RequirementCode: '', Description: '', ParentRequirementCode: '' });
    const [addingRequirement, setAddingRequirement] = useState(false);

    const isAdmin = !currentUser || currentUser.RoleName === 'admin' || currentUser.RoleID === 1;

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

    // Fetch events on mount
    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await eventsAPI.getAllEvents();
            if (response.success) {
                setEvents(response.data);
            } else {
                setError('Failed to fetch events');
            }
        } catch (err) {
            console.error('Error fetching events:', err);
            setError('Error loading events');
        } finally {
            setLoading(false);
        }
    };

    // Fetch areas for an event
    const fetchAreasForEvent = async (eventId, force = false) => {
        if (!force && areasData[eventId]) return; // Already cached
        
        setLoadingAreas(prev => new Set([...prev, eventId]));
        try {
            const response = await areasAPI.getByEvent(eventId);
            if (response.success) {
                setAreasData(prev => ({ ...prev, [eventId]: response.data || [] }));
            }
        } catch (err) {
            console.error('Error fetching areas:', err);
        } finally {
            setLoadingAreas(prev => {
                const next = new Set(prev);
                next.delete(eventId);
                return next;
            });
        }
        
        // Also fetch criteria without areas for this event
        fetchNoAreaCriteria(eventId);
    };

    // Fetch criteria that don't belong to any area
    const fetchNoAreaCriteria = async (eventId, force = false) => {
        if (!force && noAreaCriteriaData[eventId]) return; // Already cached
        
        setLoadingNoAreaCriteria(prev => new Set([...prev, eventId]));
        try {
            const response = await criteriaAPI.getByEvent(eventId);
            if (response.success) {
                // Filter criteria that have no AreaID (null, undefined, empty)
                const noAreaCriteria = (response.data || []).filter(c => 
                    !c.AreaID || c.AreaID === '' || c.AreaID === null
                );
                setNoAreaCriteriaData(prev => ({ ...prev, [eventId]: noAreaCriteria }));
            }
        } catch (err) {
            console.error('Error fetching no-area criteria:', err);
        } finally {
            setLoadingNoAreaCriteria(prev => {
                const next = new Set(prev);
                next.delete(eventId);
                return next;
            });
        }
    };

    // Fetch criteria for an event (filtered by area)
    const fetchCriteriaForArea = async (eventId, areaId, force = false) => {
        const key = `${eventId}-${areaId}`;
        if (!force && criteriaData[key]) return; // Already cached
        
        setLoadingCriteria(prev => new Set([...prev, key]));
        try {
            const response = await criteriaAPI.getByEvent(eventId);
            if (response.success) {
                // Filter criteria by areaId
                const filteredCriteria = (response.data || []).filter(c => 
                    String(c.AreaID) === String(areaId)
                );
                setCriteriaData(prev => ({ ...prev, [key]: filteredCriteria }));
            }
        } catch (err) {
            console.error('Error fetching criteria:', err);
        } finally {
            setLoadingCriteria(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
        }
    };

    // Fetch requirements for a criteria
    const fetchRequirementsForCriteria = async (criteriaId, force = false) => {
        if (!force && requirementsData[criteriaId]) return; // Already cached
        
        setLoadingRequirements(prev => new Set([...prev, criteriaId]));
        try {
            const response = await requirementsAPI.getAllRequirements();
            if (response.success) {
                // Filter requirements by criteriaId
                const filteredReqs = (response.data || []).filter(r => 
                    String(r.CriteriaID) === String(criteriaId)
                );
                setRequirementsData(prev => ({ ...prev, [criteriaId]: filteredReqs }));
            }
        } catch (err) {
            console.error('Error fetching requirements:', err);
        } finally {
            setLoadingRequirements(prev => {
                const next = new Set(prev);
                next.delete(criteriaId);
                return next;
            });
        }
    };

    // Toggle event expansion
    const toggleEvent = (eventId) => {
        setExpandedEvents(prev => {
            const next = new Set(prev);
            if (next.has(eventId)) {
                next.delete(eventId);
            } else {
                next.add(eventId);
                fetchAreasForEvent(eventId);
            }
            return next;
        });
    };

    // Toggle area expansion
    const toggleArea = (eventId, areaId) => {
        const key = `${eventId}-${areaId}`;
        setExpandedAreas(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
                fetchCriteriaForArea(eventId, areaId);
            }
            return next;
        });
    };

    // Toggle criteria expansion
    const toggleCriteria = (criteriaId) => {
        setExpandedCriteria(prev => {
            const next = new Set(prev);
            if (next.has(criteriaId)) {
                next.delete(criteriaId);
            } else {
                next.add(criteriaId);
                fetchRequirementsForCriteria(criteriaId);
            }
            return next;
        });
    };

    const handleSuccess = () => {
        fetchEvents();
        // Clear cache to refresh nested data
        setAreasData({});
        setCriteriaData({});
        setRequirementsData({});
        setNoAreaCriteriaData({});
    };

    const handleSearchChange = (term) => {
        setSearchTerm(term);
    };

    // Add new area under an event
    const handleAddArea = async (eventId) => {
        if (!newAreaData.AreaCode.trim() || !newAreaData.AreaName.trim()) {
            alert('Area Code and Area Name are required');
            return;
        }

        setAddingArea(true);
        try {
            const response = await areasAPI.addArea({
                EventChildID: eventId,
                AreaCode: newAreaData.AreaCode,
                AreaName: newAreaData.AreaName,
                Description: newAreaData.Description || null
            });

            if (response.success) {
                // Clear form and close
                setNewAreaData({ AreaCode: '', AreaName: '', Description: '' });
                setShowAddAreaForm(null);
                // Re-fetch areas for this event (force bypass cache)
                await fetchAreasForEvent(eventId, true);
            } else {
                alert(response.message || 'Failed to add area');
            }
        } catch (err) {
            console.error('Error adding area:', err);
            alert('Error adding area');
        } finally {
            setAddingArea(false);
        }
    };

    // Add new criteria under No Area
    const handleAddNoAreaCriteria = async (eventId) => {
        if (!newNoAreaCriteriaData.CriteriaCode.trim() || !newNoAreaCriteriaData.CriteriaName.trim() || !newNoAreaCriteriaData.Description.trim()) {
            alert('Criteria Code, Name, and Description are required');
            return;
        }

        setAddingNoAreaCriteria(true);
        try {
            const response = await criteriaAPI.addCriteria({
                EventID: eventId,
                AreaID: null, // No area
                CriteriaCode: newNoAreaCriteriaData.CriteriaCode,
                CriteriaName: newNoAreaCriteriaData.CriteriaName,
                Description: newNoAreaCriteriaData.Description,
                ParentCriteriaID: null
            });

            if (response.success) {
                // Clear form and close
                setNewNoAreaCriteriaData({ CriteriaCode: '', CriteriaName: '', Description: '' });
                setShowAddNoAreaCriteriaForm(null);
                // Re-fetch no-area criteria with force to bypass cache
                fetchNoAreaCriteria(eventId, true);
            } else {
                alert(response.message || 'Failed to add criteria');
            }
        } catch (err) {
            console.error('Error adding criteria:', err);
            alert('Error adding criteria');
        } finally {
            setAddingNoAreaCriteria(false);
        }
    };

    // Add new criteria under a specific Area
    const handleAddCriteria = async (eventId, areaId) => {
        if (!newCriteriaData.CriteriaCode.trim() || !newCriteriaData.CriteriaName.trim() || !newCriteriaData.Description.trim()) {
            alert('Criteria Code, Name, and Description are required');
            return;
        }

        setAddingCriteria(true);
        try {
            const response = await criteriaAPI.addCriteria({
                EventID: eventId,
                AreaID: areaId,
                CriteriaCode: newCriteriaData.CriteriaCode,
                CriteriaName: newCriteriaData.CriteriaName,
                Description: newCriteriaData.Description,
                ParentCriteriaID: null
            });

            if (response.success) {
                // Clear form and close
                setNewCriteriaData({ CriteriaCode: '', CriteriaName: '', Description: '' });
                setShowAddCriteriaForm(null);
                // Re-fetch criteria for this area with force to bypass cache
                fetchCriteriaForArea(eventId, areaId, true);
            } else {
                alert(response.message || 'Failed to add criteria');
            }
        } catch (err) {
            console.error('Error adding criteria:', err);
            alert('Error adding criteria');
        } finally {
            setAddingCriteria(false);
        }
    };

    // Add new requirement under a specific Criteria
    const handleAddRequirement = async (criteriaId) => {
        if (!newRequirementData.Description.trim()) {
            alert('Description is required');
            return;
        }
        // RequirementCode is required only for top-level (no parent)
        if (!newRequirementData.ParentRequirementCode && !newRequirementData.RequirementCode.trim()) {
            alert('Requirement Code is required for top-level requirements');
            return;
        }

        setAddingRequirement(true);
        try {
            const response = await requirementsAPI.addRequirement({
                RequirementCode: newRequirementData.RequirementCode || '',
                Description: newRequirementData.Description,
                CriteriaID: criteriaId,
                ParentRequirementCode: newRequirementData.ParentRequirementCode || null
            });

            if (response.success) {
                // Clear form and close
                setNewRequirementData({ RequirementCode: '', Description: '', ParentRequirementCode: '' });
                setShowAddRequirementForm(null);
                // Re-fetch requirements for this criteria with force to bypass cache
                await fetchRequirementsForCriteria(criteriaId, true);
            } else {
                alert(response.message || 'Failed to add requirement');
            }
        } catch (err) {
            console.error('Error adding requirement:', err);
            alert('Error adding requirement');
        } finally {
            setAddingRequirement(false);
        }
    };

    // Search helper functions
    const matchesSearch = (text, searchLower) => {
        return (text?.toLowerCase() || '').includes(searchLower);
    };

    const eventMatchesSearch = (event, searchLower) => {
        return matchesSearch(event.EventName, searchLower) ||
               matchesSearch(event.EventCode, searchLower) ||
               matchesSearch(event.Description, searchLower);
    };

    const areaMatchesSearch = (area, searchLower) => {
        return matchesSearch(area.AreaName, searchLower) ||
               matchesSearch(area.AreaCode, searchLower) ||
               matchesSearch(area.Description, searchLower);
    };

    const criteriaMatchesSearch = (criteria, searchLower) => {
        return matchesSearch(criteria.CriteriaName, searchLower) ||
               matchesSearch(criteria.CriteriaCode, searchLower) ||
               matchesSearch(criteria.Description, searchLower);
    };

    const requirementMatchesSearch = (req, searchLower) => {
        return matchesSearch(req.RequirementCode, searchLower) ||
               matchesSearch(req.Description, searchLower);
    };

    // Check if any child matches search (for keeping parents visible)
    const hasMatchingArea = (eventId, searchLower) => {
        const areas = areasData[eventId] || [];
        return areas.some(area => 
            areaMatchesSearch(area, searchLower) || hasMatchingCriteria(eventId, area.AreaID, searchLower)
        );
    };

    const hasMatchingCriteria = (eventId, areaId, searchLower) => {
        const key = `${eventId}-${areaId}`;
        const criteria = criteriaData[key] || [];
        return criteria.some(c => 
            criteriaMatchesSearch(c, searchLower) || hasMatchingRequirement(c.CriteriaID, searchLower)
        );
    };

    const hasMatchingNoAreaCriteria = (eventId, searchLower) => {
        const criteria = noAreaCriteriaData[eventId] || [];
        return criteria.some(c => 
            criteriaMatchesSearch(c, searchLower) || hasMatchingRequirement(c.CriteriaID, searchLower)
        );
    };

    const hasMatchingRequirement = (criteriaId, searchLower) => {
        const reqs = requirementsData[criteriaId] || [];
        return reqs.some(r => requirementMatchesSearch(r, searchLower));
    };

    // Filter events - show event if it matches OR any of its children match
    const filteredEvents = events.filter(event => {
        if (!searchTerm.trim()) return true;
        const searchLower = searchTerm.toLowerCase();
        
        // Event matches directly
        if (eventMatchesSearch(event, searchLower)) return true;
        
        // Check if any nested data matches
        if (hasMatchingArea(event.EventID, searchLower)) return true;
        if (hasMatchingNoAreaCriteria(event.EventID, searchLower)) return true;
        
        return false;
    });

    // Filter areas within an event
    const getFilteredAreas = (eventId) => {
        const areas = areasData[eventId] || [];
        if (!searchTerm.trim()) return areas;
        const searchLower = searchTerm.toLowerCase();
        
        return areas.filter(area => 
            areaMatchesSearch(area, searchLower) || hasMatchingCriteria(eventId, area.AreaID, searchLower)
        );
    };

    // Filter criteria within an area
    const getFilteredCriteria = (eventId, areaId) => {
        const key = `${eventId}-${areaId}`;
        const criteria = criteriaData[key] || [];
        if (!searchTerm.trim()) return criteria;
        const searchLower = searchTerm.toLowerCase();
        
        return criteria.filter(c => 
            criteriaMatchesSearch(c, searchLower) || hasMatchingRequirement(c.CriteriaID, searchLower)
        );
    };

    // Filter no-area criteria
    const getFilteredNoAreaCriteria = (eventId) => {
        const criteria = noAreaCriteriaData[eventId] || [];
        if (!searchTerm.trim()) return criteria;
        const searchLower = searchTerm.toLowerCase();
        
        return criteria.filter(c => 
            criteriaMatchesSearch(c, searchLower) || hasMatchingRequirement(c.CriteriaID, searchLower)
        );
    };

    // Filter requirements
    const getFilteredRequirements = (criteriaId) => {
        const reqs = requirementsData[criteriaId] || [];
        if (!searchTerm.trim()) return reqs;
        const searchLower = searchTerm.toLowerCase();
        
        return reqs.filter(r => requirementMatchesSearch(r, searchLower));
    };

    // Check if item should be highlighted (directly matches search)
    const shouldHighlight = (text) => {
        if (!searchTerm.trim()) return false;
        return matchesSearch(text, searchTerm.toLowerCase());
    };

    if (loading) {
        return (
            <div className="px-6 pb-6 pt-6 w-full">
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
                    <span className="ml-3 text-gray-600">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="px-6 pb-6 pt-6 w-full">
            <div className="flex items-center justify-between mb-4">
                <Header 
                    pageTitle="Setup Overview" 
                    onAddClick={() => setIsModalOpen(true)}
                    onSearchChange={handleSearchChange}
                    searchValue={searchTerm}
                    hideSortButton={true}
                    userRole={currentUser?.RoleID}
                />
                {isAdmin && (
                    <button 
                        onClick={() => setShowWizard(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition text-sm"
                        title="Quick setup with wizard"
                    >
                        <Wand2 size={18} /> Wizard
                    </button>
                )}
            </div>

            <UnifiedSetupWizard 
                isOpen={showWizard} 
                onClose={() => setShowWizard(false)}
                onSuccess={handleSuccess}
            />

            {/* Hierarchical View */}
            <div className="space-y-2">
                {searchTerm && (
                    <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 rounded-lg flex items-center gap-2">
                        <span>🔍</span>
                        <span>Searching across Events, Areas, Criteria & Requirements — {filteredEvents.length} event(s) with matches</span>
                    </div>
                )}

                {filteredEvents.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <p className="text-gray-500">No events found</p>
                    </div>
                ) : (
                    filteredEvents.map((event) => (
                        <div key={event.EventID} className="space-y-1">
                            {/* EVENT ROW */}
                            <div 
                                onClick={() => toggleEvent(event.EventID)}
                                className={`
                                    bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-lg shadow-md cursor-pointer
                                    hover:from-blue-700 hover:to-blue-800 transition-all
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0">
                                        {expandedEvents.has(event.EventID) ? (
                                            <ChevronDown size={18} />
                                        ) : (
                                            <ChevronRight size={18} />
                                        )}
                                    </div>
                                    <div className="flex-shrink-0">
                                        <span className="text-lg">📋</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold truncate">{event.EventName}</h3>
                                            <span className="text-xs bg-blue-500/30 px-2 py-0.5 rounded">Event</span>
                                        </div>
                                        {event.EventCode && (
                                            <p className="text-xs text-blue-200">{event.EventCode}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* EXPANDED AREAS */}
                            {expandedEvents.has(event.EventID) && (
                                <div className="ml-6 space-y-1">
                                    {/* ADD AREA BUTTON & FORM */}
                                    {isAdmin && (
                                        <>
                                            {showAddAreaForm === event.EventID ? (
                                                <div className="bg-white border-2 border-purple-300 rounded-lg p-4 shadow-md space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-sm font-semibold text-purple-700 flex items-center gap-2">
                                                            <Plus size={16} />
                                                            Add New Area
                                                        </h4>
                                                        <button
                                                            onClick={() => {
                                                                setShowAddAreaForm(null);
                                                                setNewAreaData({ AreaCode: '', AreaName: '', Description: '' });
                                                            }}
                                                            className="p-1 hover:bg-gray-100 rounded"
                                                        >
                                                            <X size={16} className="text-gray-500" />
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                                Area Code <span className="text-rose-500">*</span>
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={newAreaData.AreaCode}
                                                                onChange={(e) => setNewAreaData(prev => ({ ...prev, AreaCode: e.target.value }))}
                                                                placeholder="AREA-001"
                                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                                Area Name <span className="text-rose-500">*</span>
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={newAreaData.AreaName}
                                                                onChange={(e) => setNewAreaData(prev => ({ ...prev, AreaName: e.target.value }))}
                                                                placeholder="Financial Controls"
                                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                                            Description <span className="text-gray-400">(optional)</span>
                                                        </label>
                                                        <textarea
                                                            value={newAreaData.Description}
                                                            onChange={(e) => setNewAreaData(prev => ({ ...prev, Description: e.target.value }))}
                                                            placeholder="Add area description..."
                                                            rows={2}
                                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                                                        />
                                                    </div>
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setShowAddAreaForm(null);
                                                                setNewAreaData({ AreaCode: '', AreaName: '', Description: '' });
                                                            }}
                                                            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                                                            disabled={addingArea}
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={() => handleAddArea(event.EventID)}
                                                            disabled={addingArea}
                                                            className="px-4 py-1.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                                                        >
                                                            {addingArea ? (
                                                                <>
                                                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                                                    Adding...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Plus size={16} />
                                                                    Add Area
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : showAddNoAreaCriteriaForm === event.EventID ? (
                                                <div className="bg-white border-2 border-gray-400 rounded-lg p-4 shadow-md space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                                            <Plus size={16} />
                                                            Add Criteria (No Area)
                                                        </h4>
                                                        <button
                                                            onClick={() => {
                                                                setShowAddNoAreaCriteriaForm(null);
                                                                setNewNoAreaCriteriaData({ CriteriaCode: '', CriteriaName: '', Description: '' });
                                                            }}
                                                            className="p-1 hover:bg-gray-100 rounded"
                                                        >
                                                            <X size={16} className="text-gray-500" />
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                                Criteria Code <span className="text-rose-500">*</span>
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={newNoAreaCriteriaData.CriteriaCode}
                                                                onChange={(e) => setNewNoAreaCriteriaData(prev => ({ ...prev, CriteriaCode: e.target.value }))}
                                                                placeholder="CRIT-001"
                                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500/20 focus:border-gray-500"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                                Criteria Name <span className="text-rose-500">*</span>
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={newNoAreaCriteriaData.CriteriaName}
                                                                onChange={(e) => setNewNoAreaCriteriaData(prev => ({ ...prev, CriteriaName: e.target.value }))}
                                                                placeholder="Quality Standards"
                                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500/20 focus:border-gray-500"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                                            Description <span className="text-rose-500">*</span>
                                                        </label>
                                                        <textarea
                                                            value={newNoAreaCriteriaData.Description}
                                                            onChange={(e) => setNewNoAreaCriteriaData(prev => ({ ...prev, Description: e.target.value }))}
                                                            placeholder="Add criteria description..."
                                                            rows={2}
                                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500/20 focus:border-gray-500"
                                                        />
                                                    </div>
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setShowAddNoAreaCriteriaForm(null);
                                                                setNewNoAreaCriteriaData({ CriteriaCode: '', CriteriaName: '', Description: '' });
                                                            }}
                                                            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                                                            disabled={addingNoAreaCriteria}
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={() => handleAddNoAreaCriteria(event.EventID)}
                                                            disabled={addingNoAreaCriteria}
                                                            className="px-4 py-1.5 text-sm font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
                                                        >
                                                            {addingNoAreaCriteria ? (
                                                                <>
                                                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                                                    Adding...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Plus size={16} />
                                                                    Add Criteria
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setShowAddAreaForm(event.EventID)}
                                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-purple-300 rounded-lg text-purple-600 hover:bg-purple-50 hover:border-purple-400 transition-all"
                                                    >
                                                        <Plus size={16} />
                                                        <span className="text-sm font-medium">Add Area</span>
                                                    </button>
                                                    <button
                                                        onClick={() => setShowAddNoAreaCriteriaForm(event.EventID)}
                                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-400 rounded-lg text-gray-600 hover:bg-gray-50 hover:border-gray-500 transition-all"
                                                    >
                                                        <Plus size={16} />
                                                        <span className="text-sm font-medium">Add Criteria (No Area)</span>
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {loadingAreas.has(event.EventID) ? (
                                        <div className="py-3 px-4 text-sm text-gray-500 flex items-center gap-2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-600 border-t-transparent"></div>
                                            Loading areas...
                                        </div>
                                    ) : (
                                        <>
                                            {/* Regular Areas */}
                                            {getFilteredAreas(event.EventID).map((area) => (
                                            <div key={area.AreaID} className="space-y-1">
                                                {/* AREA ROW */}
                                                <div 
                                                    onClick={() => toggleArea(event.EventID, area.AreaID)}
                                                    className={`
                                                        bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-2.5 rounded-lg shadow cursor-pointer
                                                        hover:from-purple-700 hover:to-purple-800 transition-all
                                                    `}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-shrink-0">
                                                            {expandedAreas.has(`${event.EventID}-${area.AreaID}`) ? (
                                                                <ChevronDown size={16} />
                                                            ) : (
                                                                <ChevronRight size={16} />
                                                            )}
                                                        </div>
                                                        <div className="flex-shrink-0">
                                                            <span className="text-base">📍</span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-medium text-sm truncate">{area.AreaName}</h4>
                                                                <span className="text-xs bg-purple-500/30 px-2 py-0.5 rounded">Area</span>
                                                            </div>
                                                            {area.AreaCode && (
                                                                <p className="text-xs text-purple-200">{area.AreaCode}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* EXPANDED CRITERIA */}
                                                {expandedAreas.has(`${event.EventID}-${area.AreaID}`) && (
                                                    <div className="ml-6 space-y-1">
                                                        {/* ADD CRITERIA BUTTON & FORM */}
                                                        {isAdmin && (
                                                            <>
                                                                {showAddCriteriaForm === `${event.EventID}-${area.AreaID}` ? (
                                                                    <div className="bg-white border-2 border-indigo-300 rounded-lg p-4 shadow-md space-y-3">
                                                                        <div className="flex items-center justify-between">
                                                                            <h4 className="text-sm font-semibold text-indigo-700 flex items-center gap-2">
                                                                                <Plus size={16} />
                                                                                Add New Criteria
                                                                            </h4>
                                                                            <button
                                                                                onClick={() => {
                                                                                    setShowAddCriteriaForm(null);
                                                                                    setNewCriteriaData({ CriteriaCode: '', CriteriaName: '', Description: '' });
                                                                                }}
                                                                                className="p-1 hover:bg-gray-100 rounded"
                                                                            >
                                                                                <X size={16} className="text-gray-500" />
                                                                            </button>
                                                                        </div>
                                                                        <div className="grid grid-cols-2 gap-3">
                                                                            <div>
                                                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                                                    Criteria Code <span className="text-rose-500">*</span>
                                                                                </label>
                                                                                <input
                                                                                    type="text"
                                                                                    value={newCriteriaData.CriteriaCode}
                                                                                    onChange={(e) => setNewCriteriaData(prev => ({ ...prev, CriteriaCode: e.target.value }))}
                                                                                    placeholder="CRIT-001"
                                                                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                                                    Criteria Name <span className="text-rose-500">*</span>
                                                                                </label>
                                                                                <input
                                                                                    type="text"
                                                                                    value={newCriteriaData.CriteriaName}
                                                                                    onChange={(e) => setNewCriteriaData(prev => ({ ...prev, CriteriaName: e.target.value }))}
                                                                                    placeholder="Quality Standards"
                                                                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                                                Description <span className="text-rose-500">*</span>
                                                                            </label>
                                                                            <textarea
                                                                                value={newCriteriaData.Description}
                                                                                onChange={(e) => setNewCriteriaData(prev => ({ ...prev, Description: e.target.value }))}
                                                                                placeholder="Add criteria description..."
                                                                                rows={2}
                                                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                                                            />
                                                                        </div>
                                                                        <div className="flex justify-end gap-2">
                                                                            <button
                                                                                onClick={() => {
                                                                                    setShowAddCriteriaForm(null);
                                                                                    setNewCriteriaData({ CriteriaCode: '', CriteriaName: '', Description: '' });
                                                                                }}
                                                                                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                                                                                disabled={addingCriteria}
                                                                            >
                                                                                Cancel
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleAddCriteria(event.EventID, area.AreaID)}
                                                                                disabled={addingCriteria}
                                                                                className="px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                                                                            >
                                                                                {addingCriteria ? (
                                                                                    <>
                                                                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                                                                        Adding...
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        <Plus size={16} />
                                                                                        Add Criteria
                                                                                    </>
                                                                                )}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => setShowAddCriteriaForm(`${event.EventID}-${area.AreaID}`)}
                                                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-indigo-300 rounded-lg text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400 transition-all"
                                                                    >
                                                                        <Plus size={16} />
                                                                        <span className="text-sm font-medium">Add Criteria</span>
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}

                                                        {loadingCriteria.has(`${event.EventID}-${area.AreaID}`) ? (
                                                            <div className="py-2 px-4 text-sm text-gray-500 flex items-center gap-2">
                                                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent"></div>
                                                                Loading criteria...
                                                            </div>
                                                        ) : getFilteredCriteria(event.EventID, area.AreaID).length === 0 ? (
                                                            <div className="py-2 px-4 text-sm text-gray-400 italic bg-gray-50 rounded-lg">
                                                                No criteria found for this area
                                                            </div>
                                                        ) : (
                                                            getFilteredCriteria(event.EventID, area.AreaID).map((criteria) => (
                                                                <div key={criteria.CriteriaID} className="space-y-1">
                                                                    {/* CRITERIA ROW */}
                                                                    <div 
                                                                        onClick={() => toggleCriteria(criteria.CriteriaID)}
                                                                        className={`
                                                                            bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-4 py-2 rounded-lg shadow cursor-pointer
                                                                            hover:from-indigo-700 hover:to-indigo-800 transition-all
                                                                        `}
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="flex-shrink-0">
                                                                                {expandedCriteria.has(criteria.CriteriaID) ? (
                                                                                    <ChevronDown size={14} />
                                                                                ) : (
                                                                                    <ChevronRight size={14} />
                                                                                )}
                                                                            </div>
                                                                            <div className="flex-shrink-0">
                                                                                <span className="text-sm">📊</span>
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="flex items-center gap-2">
                                                                                    <h5 className="font-medium text-sm truncate">{criteria.CriteriaName}</h5>
                                                                                    <span className="text-xs bg-indigo-500/30 px-2 py-0.5 rounded">Criteria</span>
                                                                                </div>
                                                                                {criteria.CriteriaCode && (
                                                                                    <p className="text-xs text-indigo-200">{criteria.CriteriaCode}</p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* EXPANDED REQUIREMENTS */}
                                                                    {expandedCriteria.has(criteria.CriteriaID) && (
                                                                        <div className="ml-6 space-y-1">
                                                                            {/* Add Requirement button/form */}
                                                                            {isAdmin && (
                                                                                <>
                                                                                    {showAddRequirementForm === criteria.CriteriaID ? (
                                                                                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-2">
                                                                                            <div className="flex items-center gap-2 mb-1">
                                                                                                <span className="text-sm">✅</span>
                                                                                                <span className="text-sm font-medium text-emerald-800">New Requirement</span>
                                                                                            </div>
                                                                                            <div className="grid grid-cols-1 gap-2">
                                                                                                {/* Parent Requirement selector */}
                                                                                                <select
                                                                                                    value={newRequirementData.ParentRequirementCode}
                                                                                                    onChange={(e) => setNewRequirementData(prev => ({ ...prev, ParentRequirementCode: e.target.value }))}
                                                                                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                                                                                                >
                                                                                                    <option value="">Top-level requirement (no parent)</option>
                                                                                                    {(requirementsData[criteria.CriteriaID] || []).map(req => (
                                                                                                        <option key={req.RequirementID} value={req.RequirementCode}>
                                                                                                            Child of: {req.RequirementCode} - {req.Description?.substring(0, 40)}
                                                                                                        </option>
                                                                                                    ))}
                                                                                                </select>
                                                                                                <input
                                                                                                    type="text"
                                                                                                    value={newRequirementData.RequirementCode}
                                                                                                    onChange={(e) => setNewRequirementData(prev => ({ ...prev, RequirementCode: e.target.value }))}
                                                                                                    placeholder={newRequirementData.ParentRequirementCode ? 'Code (optional - auto-generated)' : 'Requirement Code'}
                                                                                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                                                                                />
                                                                                                <textarea
                                                                                                    value={newRequirementData.Description}
                                                                                                    onChange={(e) => setNewRequirementData(prev => ({ ...prev, Description: e.target.value }))}
                                                                                                    placeholder="Requirement description..."
                                                                                                    rows={2}
                                                                                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                                                                                />
                                                                                            </div>
                                                                                            <div className="flex justify-end gap-2">
                                                                                                <button
                                                                                                    onClick={() => {
                                                                                                        setShowAddRequirementForm(null);
                                                                                                        setNewRequirementData({ RequirementCode: '', Description: '', ParentRequirementCode: '' });
                                                                                                    }}
                                                                                                    className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                                                                                                    disabled={addingRequirement}
                                                                                                >
                                                                                                    Cancel
                                                                                                </button>
                                                                                                <button
                                                                                                    onClick={() => handleAddRequirement(criteria.CriteriaID)}
                                                                                                    disabled={addingRequirement}
                                                                                                    className="px-4 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                                                                                                >
                                                                                                    {addingRequirement ? (
                                                                                                        <>
                                                                                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                                                                                            Adding...
                                                                                                        </>
                                                                                                    ) : (
                                                                                                        <>
                                                                                                            <Plus size={16} />
                                                                                                            Add Requirement
                                                                                                        </>
                                                                                                    )}
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <button
                                                                                            onClick={() => setShowAddRequirementForm(criteria.CriteriaID)}
                                                                                            className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-emerald-300 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:border-emerald-400 transition-all"
                                                                                        >
                                                                                            <Plus size={16} />
                                                                                            <span className="text-sm font-medium">Add Requirement</span>
                                                                                        </button>
                                                                                    )}
                                                                                </>
                                                                            )}

                                                                            {loadingRequirements.has(criteria.CriteriaID) ? (
                                                                                <div className="py-2 px-4 text-sm text-gray-500 flex items-center gap-2">
                                                                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-600 border-t-transparent"></div>
                                                                                    Loading requirements...
                                                                                </div>
                                                                            ) : getFilteredRequirements(criteria.CriteriaID).length === 0 ? (
                                                                                <div className="py-2 px-4 text-sm text-gray-400 italic bg-gray-50 rounded-lg">
                                                                                    No requirements found for this criteria
                                                                                </div>
                                                                            ) : (
                                                                                getFilteredRequirements(criteria.CriteriaID).map((req) => (
                                                                                    <div 
                                                                                        key={req.RequirementID}
                                                                                        className="border-l-4 border-emerald-500 bg-emerald-50 px-4 py-2.5 rounded-r-lg shadow-sm"
                                                                                    >
                                                                                        <div className="flex items-center gap-3">
                                                                                            <div className="flex-shrink-0">
                                                                                                <span className="text-sm">✅</span>
                                                                                            </div>
                                                                                            <div className="flex-1 min-w-0">
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <h6 className="font-medium text-sm text-gray-800 truncate">{req.RequirementCode}</h6>
                                                                                                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">Requirement</span>
                                                                                                    {req.ParentRequirementCode && (
                                                                                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                                                                                            Child of {req.ParentRequirementCode}
                                                                                                        </span>
                                                                                                    )}
                                                                                                </div>
                                                                                                {req.Description && (
                                                                                                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{req.Description}</p>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                ))
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                            {/* NO AREA CRITERIA SECTION */}
                                            {loadingNoAreaCriteria.has(event.EventID) ? (
                                                <div className="py-2 px-4 text-sm text-gray-500 flex items-center gap-2">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-600 border-t-transparent"></div>
                                                    Loading criteria...
                                                </div>
                                            ) : getFilteredNoAreaCriteria(event.EventID).length > 0 && (
                                                <div className="space-y-1">
                                                    {/* NO AREA HEADER */}
                                                    <div 
                                                        onClick={() => toggleArea(event.EventID, 'no-area')}
                                                        className={`
                                                            bg-gradient-to-r from-gray-500 to-gray-600 text-white px-4 py-2.5 rounded-lg shadow cursor-pointer
                                                            hover:from-gray-600 hover:to-gray-700 transition-all
                                                        `}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex-shrink-0">
                                                                {expandedAreas.has(`${event.EventID}-no-area`) ? (
                                                                    <ChevronDown size={16} />
                                                                ) : (
                                                                    <ChevronRight size={16} />
                                                                )}
                                                            </div>
                                                            <div className="flex-shrink-0">
                                                                <span className="text-base">📂</span>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className="font-medium text-sm truncate">No Area Assigned</h4>
                                                                    <span className="text-xs bg-gray-400/30 px-2 py-0.5 rounded">
                                                                        {getFilteredNoAreaCriteria(event.EventID).length} criteria
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-gray-300">Criteria without area assignment</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* EXPANDED NO-AREA CRITERIA */}
                                                    {expandedAreas.has(`${event.EventID}-no-area`) && (
                                                        <div className="ml-6 space-y-1">
                                                            {getFilteredNoAreaCriteria(event.EventID).map((criteria) => (
                                                                <div key={criteria.CriteriaID} className="space-y-1">
                                                                    {/* CRITERIA ROW */}
                                                                    <div 
                                                                        onClick={() => toggleCriteria(criteria.CriteriaID)}
                                                                        className={`
                                                                            bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-4 py-2 rounded-lg shadow cursor-pointer
                                                                            hover:from-indigo-700 hover:to-indigo-800 transition-all
                                                                        `}
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="flex-shrink-0">
                                                                                {expandedCriteria.has(criteria.CriteriaID) ? (
                                                                                    <ChevronDown size={14} />
                                                                                ) : (
                                                                                    <ChevronRight size={14} />
                                                                                )}
                                                                            </div>
                                                                            <div className="flex-shrink-0">
                                                                                <span className="text-sm">📊</span>
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="flex items-center gap-2">
                                                                                    <h5 className="font-medium text-sm truncate">{criteria.CriteriaName}</h5>
                                                                                    <span className="text-xs bg-indigo-500/30 px-2 py-0.5 rounded">Criteria</span>
                                                                                </div>
                                                                                {criteria.CriteriaCode && (
                                                                                    <p className="text-xs text-indigo-200">{criteria.CriteriaCode}</p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* EXPANDED REQUIREMENTS FOR NO-AREA CRITERIA */}
                                                                    {expandedCriteria.has(criteria.CriteriaID) && (
                                                                        <div className="ml-6 space-y-1">
                                                                            {/* Add Requirement button/form */}
                                                                            {isAdmin && (
                                                                                <>
                                                                                    {showAddRequirementForm === criteria.CriteriaID ? (
                                                                                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-2">
                                                                                            <div className="flex items-center gap-2 mb-1">
                                                                                                <span className="text-sm">✅</span>
                                                                                                <span className="text-sm font-medium text-emerald-800">New Requirement</span>
                                                                                            </div>
                                                                                            <div className="grid grid-cols-1 gap-2">
                                                                                                {/* Parent Requirement selector */}
                                                                                                <select
                                                                                                    value={newRequirementData.ParentRequirementCode}
                                                                                                    onChange={(e) => setNewRequirementData(prev => ({ ...prev, ParentRequirementCode: e.target.value }))}
                                                                                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                                                                                                >
                                                                                                    <option value="">Top-level requirement (no parent)</option>
                                                                                                    {(requirementsData[criteria.CriteriaID] || []).map(req => (
                                                                                                        <option key={req.RequirementID} value={req.RequirementCode}>
                                                                                                            Child of: {req.RequirementCode} - {req.Description?.substring(0, 40)}
                                                                                                        </option>
                                                                                                    ))}
                                                                                                </select>
                                                                                                <input
                                                                                                    type="text"
                                                                                                    value={newRequirementData.RequirementCode}
                                                                                                    onChange={(e) => setNewRequirementData(prev => ({ ...prev, RequirementCode: e.target.value }))}
                                                                                                    placeholder={newRequirementData.ParentRequirementCode ? 'Code (optional - auto-generated)' : 'Requirement Code'}
                                                                                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                                                                                />
                                                                                                <textarea
                                                                                                    value={newRequirementData.Description}
                                                                                                    onChange={(e) => setNewRequirementData(prev => ({ ...prev, Description: e.target.value }))}
                                                                                                    placeholder="Requirement description..."
                                                                                                    rows={2}
                                                                                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                                                                                />
                                                                                            </div>
                                                                                            <div className="flex justify-end gap-2">
                                                                                                <button
                                                                                                    onClick={() => {
                                                                                                        setShowAddRequirementForm(null);
                                                                                                        setNewRequirementData({ RequirementCode: '', Description: '', ParentRequirementCode: '' });
                                                                                                    }}
                                                                                                    className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                                                                                                    disabled={addingRequirement}
                                                                                                >
                                                                                                    Cancel
                                                                                                </button>
                                                                                                <button
                                                                                                    onClick={() => handleAddRequirement(criteria.CriteriaID)}
                                                                                                    disabled={addingRequirement}
                                                                                                    className="px-4 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                                                                                                >
                                                                                                    {addingRequirement ? (
                                                                                                        <>
                                                                                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                                                                                            Adding...
                                                                                                        </>
                                                                                                    ) : (
                                                                                                        <>
                                                                                                            <Plus size={16} />
                                                                                                            Add Requirement
                                                                                                        </>
                                                                                                    )}
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <button
                                                                                            onClick={() => setShowAddRequirementForm(criteria.CriteriaID)}
                                                                                            className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-emerald-300 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:border-emerald-400 transition-all"
                                                                                        >
                                                                                            <Plus size={16} />
                                                                                            <span className="text-sm font-medium">Add Requirement</span>
                                                                                        </button>
                                                                                    )}
                                                                                </>
                                                                            )}

                                                                            {loadingRequirements.has(criteria.CriteriaID) ? (
                                                                                <div className="py-2 px-4 text-sm text-gray-500 flex items-center gap-2">
                                                                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-600 border-t-transparent"></div>
                                                                                    Loading requirements...
                                                                                </div>
                                                                            ) : getFilteredRequirements(criteria.CriteriaID).length === 0 ? (
                                                                                <div className="py-2 px-4 text-sm text-gray-400 italic bg-gray-50 rounded-lg">
                                                                                    No requirements found for this criteria
                                                                                </div>
                                                                            ) : (
                                                                                getFilteredRequirements(criteria.CriteriaID).map((req) => (
                                                                                    <div 
                                                                                        key={req.RequirementID}
                                                                                        className="border-l-4 border-emerald-500 bg-emerald-50 px-4 py-2.5 rounded-r-lg shadow-sm"
                                                                                    >
                                                                                        <div className="flex items-center gap-3">
                                                                                            <div className="flex-shrink-0">
                                                                                                <span className="text-sm">✅</span>
                                                                                            </div>
                                                                                            <div className="flex-1 min-w-0">
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <h6 className="font-medium text-sm text-gray-800 truncate">{req.RequirementCode}</h6>
                                                                                                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">Requirement</span>
                                                                                                    {req.ParentRequirementCode && (
                                                                                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                                                                                            Child of {req.ParentRequirementCode}
                                                                                                        </span>
                                                                                                    )}
                                                                                                </div>
                                                                                                {req.Description && (
                                                                                                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{req.Description}</p>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                ))
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Empty state when no areas AND no criteria without areas */}
                                            {getFilteredAreas(event.EventID).length === 0 && 
                                             getFilteredNoAreaCriteria(event.EventID).length === 0 && 
                                             !loadingNoAreaCriteria.has(event.EventID) && (
                                                <div className="py-3 px-4 text-sm text-gray-400 italic bg-gray-50 rounded-lg">
                                                    {searchTerm.trim() ? 'No matching items found' : 'No areas or criteria found for this event'}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Add Modal */}
            {isModalOpen && (
                <AddEventModal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handleSuccess}
                />
            )}
        </div>
    );
};



