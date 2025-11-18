import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import Header from "../Header/header.jsx";
import { eventsAPI } from "../../utils/api";

const EventsP = forwardRef(({ searchTerm = '', deleteMode = false, onSelectionChange, onEventClick }, ref) => {
    const [events, setEvents] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedEvents, setSelectedEvents] = useState(new Set());

    // Fetch events data from database
    useEffect(() => {
        fetchEvents();
    }, []);

    // Filter and sort events based on search term
    useEffect(() => {
        let filtered = events;
        
        // Apply search filter
        if (searchTerm.trim()) {
            filtered = events.filter(event => {
                const eventName = event.EventName?.toLowerCase() || '';
                const description = event.Description?.toLowerCase() || '';
                const eventCode = event.EventCode?.toLowerCase() || '';
                const searchLower = searchTerm.toLowerCase();
                
                return eventName.includes(searchLower) || 
                       description.includes(searchLower) || 
                       eventCode.includes(searchLower);
            });
        }

        // Sort by event name in ascending order
        const sortedFiltered = [...filtered].sort((a, b) => {
            return (a.EventName || '').localeCompare(b.EventName || '');
        });

        setFilteredEvents(sortedFiltered);
    }, [events, searchTerm]);

    // Handle selection changes and notify parent component
    useEffect(() => {
        if (onSelectionChange) {
            onSelectionChange(selectedEvents.size, Array.from(selectedEvents));
        }
    }, [selectedEvents, onSelectionChange]);

    // Clear selections when delete mode is turned off
    useEffect(() => {
        if (!deleteMode) {
            setSelectedEvents(new Set());
        }
    }, [deleteMode]);

    const handleCheckboxChange = (eventId, isChecked) => {
        setSelectedEvents(prev => {
            const newSet = new Set(prev);
            if (isChecked) {
                newSet.add(eventId);
            } else {
                newSet.delete(eventId);
            }
            return newSet;
        });
    };

    const deleteSelectedEvents = async (eventIds) => {
        try {
            console.log('Attempting to delete events:', eventIds);
            console.log('Event IDs type:', typeof eventIds, 'Is array:', Array.isArray(eventIds));
            
            // Make API call to delete events
            const response = await eventsAPI.deleteEvents(eventIds);
            console.log('Delete response:', response);
            
            if (response.success) {
                // Remove deleted events from local state
                setEvents(prev => prev.filter(event => !eventIds.includes(event.EventID)));
                setSelectedEvents(new Set());
                return { success: true };
            } else {
                console.error('Delete failed:', response.message);
                return { success: false, message: response.message || 'Failed to delete events' };
            }
        } catch (error) {
            console.error('Error deleting events:', error);
            console.error('Error details:', error.response?.data || error.message);
            console.error('Full error object:', JSON.stringify(error, null, 2));
            
            // Check if it's a network error
            if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
                return { success: false, message: 'Network error. Please check if the backend server is running on port 5000.' };
            }
            
            // Check for specific error responses
            if (error.response) {
                return { success: false, message: `Server error: ${error.response.data?.message || error.response.statusText}` };
            }
            
            return { success: false, message: `Error deleting events: ${error.message}` };
        }
    };

    const fetchEvents = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await eventsAPI.getAllEvents();
            
            if (response.success) {
                setEvents(response.data);
            } else {
                setError('Failed to fetch events');
            }
        } catch (error) {
            console.error('Error fetching events:', error);
            setError('Error loading events. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Function to refresh data (can be called from parent component)
    const refreshData = () => {
        fetchEvents();
    };

    // Expose refresh function to parent
    useImperativeHandle(ref, () => ({
        refresh: refreshData,
        deleteSelected: deleteSelectedEvents
    }));

    if (loading) {
        return (
            <div className="mt-6 w-full">
                <div className="bg-white rounded-md p-4 shadow-lg border-2 border-gray-200">
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-gray-600">Loading events...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mt-6 w-full">
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="flex items-center">
                        <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-red-700">{error}</span>
                        <button 
                            onClick={fetchEvents}
                            className="ml-4 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (filteredEvents.length === 0 && !loading) {
        if (searchTerm.trim()) {
            return (
                <div className="mt-6 w-full">
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-8 text-center">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
                        <p className="text-gray-600">No events match your search for "{searchTerm}".</p>
                        <p className="text-gray-500 text-sm mt-2">Try adjusting your search terms or browse all events.</p>
                    </div>
                </div>
            );
        } else if (events.length === 0) {
            return (
                <div className="mt-6 w-full">
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-8 text-center">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Events Found</h3>
                        <p className="text-gray-600">No compliance events or requirements available yet.</p>
                    </div>
                </div>
            );
        }
    }

    return (
        <div className="mt-6 w-full space-y-4">
            {/* Search Results Counter */}
            {searchTerm.trim() && (
                <div className="text-sm text-gray-600 mb-4">
                    Showing {filteredEvents.length} of {events.length} events
                    {filteredEvents.length !== events.length && ` matching "${searchTerm}"`}
                </div>
            )}
            
            {filteredEvents.map((event) => {
                return (
                    <div 
                        key={event.EventID} 
                        onClick={() => !deleteMode && onEventClick && onEventClick(event)}
                        className={`bg-white rounded-lg shadow-md border border-gray-200 transition-all duration-200 ${
                        deleteMode ? 'hover:shadow-lg' : 'hover:shadow-lg cursor-pointer'
                    } ${selectedEvents.has(event.EventID) ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
                        <div className="flex items-center justify-between p-4">
                            {/* Left Section: Checkbox + Avatar + Info */}
                            <div className="flex items-center gap-4">
                                {/* Checkbox for delete mode */}
                                {deleteMode && (
                                    <input
                                        type="checkbox"
                                        checked={selectedEvents.has(event.EventID)}
                                        onChange={(e) => handleCheckboxChange(event.EventID, e.target.checked)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                )}
                                
                                {/* Avatar */}
                                <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                
                                {/* Event Info */}
                                <div className="flex flex-col">
                                    <h3 className="font-semibold text-gray-900 text-base">
                                        {event.EventName}
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        {event.EventCode}
                                    </p>
                                    {event.Description && (
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {event.Description.length > 60 ? event.Description.substring(0, 60) + '...' : event.Description}
                                        </p>
                                    )}
                                </div>
                            </div>
                            
                            {/* Right Section: Status Badge */}
                            <div className="flex-shrink-0">
                                <span className={`px-3 py-1 rounded text-sm font-medium ${
                                    event.CreatedAt 
                                        ? 'bg-blue-100 text-blue-700' 
                                        : 'bg-gray-100 text-gray-700'
                                }`}>
                                    {event.CreatedAt ? 'Active' : 'Unassigned'}
                                </span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
});

export default EventsP;