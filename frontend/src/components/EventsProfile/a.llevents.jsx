import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import Header from "../Header/header.jsx";
import { eventsAPI } from "../../utils/api";

const EventsP = forwardRef(({ searchTerm = '', deleteMode = false, onSelectionChange, onEventClick }, ref) => {
    const [events, setEvents] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedEvents, setSelectedEvents] = useState(new Set());
    const [downloadableFolders, setDownloadableFolders] = useState([]);

    // Fetch events data from database
    useEffect(() => {
        fetchEvents();
        // Fetch downloadable folders on mount
        eventsAPI.getDownloadableFolders().then(res => {
            if (res.success) setDownloadableFolders(res.folders);
        });
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
            
            const response = await eventsAPI.deleteEvents(eventIds);
            
            if (response.success) {
                setEvents(prev => prev.filter(event => !eventIds.includes(event.EventID)));
                setSelectedEvents(new Set());
                return { success: true };
            } else {
                return { success: false, message: response.message || 'Failed to delete events' };
            }
        } catch (error) {
            console.error('Error deleting events:', error);
            
            if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
                return { success: false, message: 'Network error. Please check if the backend server is running on port 5000.' };
            }
            
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

    const refreshData = () => {
        fetchEvents();
    };

    useImperativeHandle(ref, () => ({
        refresh: refreshData,
        deleteSelected: deleteSelectedEvents
    }));

    // Get status badge style
    const getStatusStyle = (event) => {
        if (event.CreatedAt) {
            return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        }
        return 'bg-gray-50 text-gray-600 border-gray-200';
    };

    if (loading) {
        return (
            <div className="w-full py-8">
                <div className="flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
                    <span className="mt-3 text-sm text-gray-500">Loading events...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full py-8">
                <div className="flex flex-col items-center justify-center">
                    <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center mb-3">
                        <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="text-rose-600 text-sm mb-3">{error}</p>
                    <button 
                        onClick={fetchEvents}
                        className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (filteredEvents.length === 0 && !loading) {
        return (
            <div className="w-full py-12">
                <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {searchTerm ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            )}
                        </svg>
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 mb-1">
                        {searchTerm ? 'No Results Found' : 'No Events Found'}
                    </h3>
                    <p className="text-xs text-gray-500">
                        {searchTerm 
                            ? `No events match "${searchTerm}"`
                            : 'No compliance events available yet.'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full space-y-2">
            {/* Search Results Counter */}
            {searchTerm && (
                <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 rounded-lg">
                    Showing {filteredEvents.length} of {events.length} events
                </div>
            )}
            
            <div className="space-y-2">
                {filteredEvents.map((event) => (
                    <div 
                        key={event.EventID}
                        onClick={() => !deleteMode && onEventClick && onEventClick(event)}
                        className={`
                            relative bg-white rounded-lg border transition-all duration-200
                            ${deleteMode 
                                ? 'border-gray-200 hover:border-gray-300' 
                                : 'border-gray-100 hover:border-indigo-200 hover:shadow-sm cursor-pointer'
                            }
                            ${selectedEvents.has(event.EventID) 
                                ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/30' 
                                : ''
                            }
                        `}
                    >
                        <div className="px-3 py-2.5">
                            <div className="flex items-center gap-3">
                                {/* Checkbox for delete mode */}
                                {deleteMode && (
                                    <div className="flex-shrink-0">
                                        <input
                                            type="checkbox"
                                            checked={selectedEvents.has(event.EventID)}
                                            onChange={(e) => handleCheckboxChange(event.EventID, e.target.checked)}
                                            className="w-3.5 h-3.5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                )}
                                
                                {/* Icon */}
                                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                
                                {/* Event Info - Compact */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-medium text-gray-900 truncate">
                                            {event.EventName}
                                        </h3>
                                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusStyle(event)}`}>
                                            {event.status === 'active' ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    
                                    {event.EventCode && (
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {event.EventCode}
                                        </p>
                                    )}
                                    
                                    {event.Description && (
                                        <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                                            {event.Description}
                                        </p>
                                    )}
                                </div>

                                {/* Download Button - Only if folder exists */}
                                {downloadableFolders.includes(event.EventName.replace(/[<>:"/\\|?*]/g, '_').trim()) && (
                                    <button
                                        className="flex-shrink-0 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md text-xs font-medium hover:bg-emerald-100 transition-colors flex items-center gap-1 border border-emerald-200"
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            try {
                                                const sanitizedName = event.EventName.replace(/[<>:"/\\|?*]/g, '_').trim();
                                                const url = await eventsAPI.downloadEventZip(event.EventName);
                                                
                                                const link = document.createElement('a');
                                                link.href = url;
                                                link.download = `${sanitizedName}.zip`;
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                                
                                                setTimeout(() => {
                                                    window.URL.revokeObjectURL(url);
                                                }, 100);
                                            } catch (err) {
                                                console.error('Download error:', err);
                                                alert('Download failed: ' + (err.message || 'Unknown error'));
                                            }
                                        }}
                                        title="Download event folder"
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        <span className="hidden sm:inline">Download</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

export default EventsPss;