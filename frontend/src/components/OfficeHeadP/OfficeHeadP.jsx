import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import Header from "../Header/header.jsx";
import user from "../../assets/images/user.svg";
import { officeHeadsAPI } from "../../utils/api";
import EditOfficeHeadModal from '../EditHead/EditOfficeHeadModal.jsx';

const OfficeHeadP = forwardRef(({ searchTerm = '', sortType = 'name', deleteMode = false, onSelectionChange }, ref) => {
    const [officeHeads, setOfficeHeads] = useState([]);
    const [filteredOfficeHeads, setFilteredOfficeHeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedHeads, setSelectedHeads] = useState(new Set());
    const [expandedCards, setExpandedCards] = useState(new Set());

    // Fetch office heads data from database
    useEffect(() => {
        fetchOfficeHeads();
    }, []);

    // Filter and sort office heads based on search term and sort type
    useEffect(() => {
        let filtered = officeHeads;
        
        // Apply search filter first
        if (searchTerm.trim()) {
            filtered = officeHeads.filter(person => {
                const fullName = `${person.FirstName}${person.MiddleInitial ? ' ' + person.MiddleInitial + '.' : ''} ${person.LastName}`.toLowerCase();
                const position = person.Position?.toLowerCase() || '';
                const contact = person.ContactInfo?.toLowerCase() || '';
                const searchLower = searchTerm.toLowerCase();
                
                return fullName.includes(searchLower) || 
                       position.includes(searchLower) || 
                       contact.includes(searchLower);
            });
        }

        // Apply filtering based on sort type
        switch (sortType) {
            case 'assigned':
                // Show only assigned office heads (those with OfficeID)
                filtered = filtered.filter(person => person.OfficeID);
                break;
                
            case 'unassigned':
                // Show only unassigned office heads (those without OfficeID)
                filtered = filtered.filter(person => !person.OfficeID);
                break;
                
            case 'name':
            default:
                // Show all, no additional filtering
                break;
        }

        // Sort by name in ascending order for all cases
        const sortedFiltered = [...filtered].sort((a, b) => {
            const nameA = `${a.FirstName} ${a.LastName}`.toLowerCase();
            const nameB = `${b.FirstName} ${b.LastName}`.toLowerCase();
            return nameA.localeCompare(nameB);
        });

        setFilteredOfficeHeads(sortedFiltered);
    }, [officeHeads, searchTerm, sortType]);

    // Handle selection changes and notify parent component
    useEffect(() => {
        if (onSelectionChange) {
            onSelectionChange(selectedHeads.size, Array.from(selectedHeads));
        }
    }, [selectedHeads, onSelectionChange]);

    // Clear selections when delete mode is turned off
    useEffect(() => {
        if (!deleteMode) {
            setSelectedHeads(new Set());
        }
    }, [deleteMode]);

    const handleCheckboxChange = (headId, isChecked) => {
        setSelectedHeads(prev => {
            const newSet = new Set(prev);
            if (isChecked) {
                newSet.add(headId);
            } else {
                newSet.delete(headId);
            }
            return newSet;
        });
    };

    const toggleExpand = (headId) => {
        setExpandedCards(prev => {
            const newSet = new Set(prev);
            if (newSet.has(headId)) {
                newSet.delete(headId);
            } else {
                newSet.add(headId);
            }
            return newSet;
        });
    };

    const deleteSelectedHeads = async (headIds) => {
        try {
            console.log('Attempting to delete heads:', headIds);
            console.log('API Base URL:', 'http://localhost:5000/api/officeheads/delete');
            
            // First test the connection
            try {
                await officeHeadsAPI.testConnection();
                console.log('Backend connection test successful');
            } catch (connError) {
                console.error('Backend connection failed:', connError);
                return { 
                    success: false, 
                    message: 'Cannot connect to backend server. Please make sure the backend is running on port 5000.' 
                };
            }
            
            // Make API call to delete heads
            const response = await officeHeadsAPI.deleteHeads(headIds);
            console.log('Delete response:', response);
            
            if (response.success) {
                // Remove deleted heads from local state
                setOfficeHeads(prev => prev.filter(head => !headIds.includes(head.HeadID)));
                setSelectedHeads(new Set());
                return { success: true };
            } else {
                console.error('Delete failed:', response.message);
                return { success: false, message: response.message || 'Failed to delete office heads' };
            }
        } catch (error) {
            console.error('Error deleting office heads:', error);
            console.error('Error details:', error.response?.data || error.message);
            
            // Check if it's a network error
            if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
                return { success: false, message: 'Network error. Please check if the backend server is running on port 5000.' };
            }
            
            // Check for specific error responses
            if (error.response) {
                return { success: false, message: `Server error: ${error.response.data?.message || error.response.statusText}` };
            }
            
            return { success: false, message: 'Error deleting office heads. Please try again.' };
        }
    };

    const fetchOfficeHeads = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await officeHeadsAPI.getAllHeads();
            
            if (response.success) {
                setOfficeHeads(response.data);
            } else {
                setError('Failed to fetch office heads');
            }
        } catch (error) {
            console.error('Error fetching office heads:', error);
            setError('Error loading office heads. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Function to refresh data (can be called from parent component)
    const refreshData = () => {
        fetchOfficeHeads();
    };

    // Expose refresh function to parent
    useImperativeHandle(ref, () => ({
        refresh: refreshData,
        deleteSelected: deleteSelectedHeads
    }));

    // Edit modal state
    const [selectedHead, setSelectedHead] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const openEdit = (person) => {
        setSelectedHead(person);
        setIsEditModalOpen(true);
    };

    const closeEdit = () => {
        setIsEditModalOpen(false);
        setSelectedHead(null);
    };

    const handleSave = (updated) => {
        // Update local state immediately. If backend update endpoint exists, call it there.
        setOfficeHeads(prev => prev.map(h => {
            if (h.HeadID !== updated.HeadID) return h;
            const copy = { ...h, ...updated };
            // If a File object was supplied for ProfilePic, create a temporary preview URL
            if (updated.ProfilePic && typeof updated.ProfilePic === 'object') {
                try {
                    copy.TempPreview = URL.createObjectURL(updated.ProfilePic);
                } catch (e) {
                    // ignore
                }
                // keep existing ProfilePic filename until server responds with new filename
                copy.ProfilePic = h.ProfilePic;
            } else {
                // string filename
                copy.ProfilePic = updated.ProfilePic;
                delete copy.TempPreview;
            }
            return copy;
        }));
    };

    if (loading) {
        return (
            <div className="mt-6 w-full">
                <div className="bg-white rounded-md p-4 shadow-lg border-2 border-gray-200">
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-gray-600">Loading office heads...</span>
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
                            onClick={fetchOfficeHeads}
                            className="ml-4 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (filteredOfficeHeads.length === 0 && !loading) {
        if (searchTerm.trim()) {
            return (
                <div className="mt-6 w-full">
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-8 text-center">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
                        <p className="text-gray-600">No office heads match your search for "{searchTerm}".</p>
                        <p className="text-gray-500 text-sm mt-2">Try adjusting your search terms or browse all office heads.</p>
                    </div>
                </div>
            );
        } else if (officeHeads.length === 0) {
            return (
                <div className="mt-6 w-full">
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-8 text-center">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM9 9a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Office Heads Found</h3>
                        <p className="text-gray-600">Start by adding your first office head using the "Add Office Head" button.</p>
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
                    Showing {filteredOfficeHeads.length} of {officeHeads.length} office heads
                    {filteredOfficeHeads.length !== officeHeads.length && ` matching "${searchTerm}"`}
                </div>
            )}
            
            {filteredOfficeHeads.map((person) => {
                // Construct full name
                const fullName = `${person.FirstName}${person.MiddleInitial ? ' ' + person.MiddleInitial + '.' : ''} ${person.LastName}`;
                
                // Use uploaded profile picture or default
                const profilePicUrl = person.TempPreview
                    ? person.TempPreview
                    : person.ProfilePic 
                        ? `http://localhost:5000/uploads/profile-pics/${person.ProfilePic}`
                        : user;

                return (
                    <div key={person.HeadID} className={`bg-white rounded-md shadow-lg border-2 border-gray-200 stroke-2 transition-all duration-300 ${
                        deleteMode ? 'hover:shadow-md' : 'hover:shadow-none hover:bg-gray-100'
                    } ${selectedHeads.has(person.HeadID) ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
                        <div className="flex items-center justify-between min-h-[4rem] p-4">
                            {/* Checkbox for delete mode */}
                            {deleteMode && (
                                <div className="flex items-center mr-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedHeads.has(person.HeadID)}
                                        onChange={(e) => handleCheckboxChange(person.HeadID, e.target.checked)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                            )}
                            
                            {/* Left section - Profile pic, name and position */}
                            <div 
                                className="flex items-center gap-4 flex-1 cursor-pointer"
                                onClick={() => toggleExpand(person.HeadID)}
                            >
                                <img
                                    src={profilePicUrl}
                                    alt={fullName}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                                    onError={(e) => {
                                        console.error(`Failed to load profile pic: ${profilePicUrl}`);
                                        e.target.src = user;
                                    }}
                                />
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg" style={{color: '#121212'}}>
                                        {fullName}
                                    </h3>
                                    <p className="text-gray-600 text-sm">{person.Position}</p>
                                    {!expandedCards.has(person.HeadID) && (
                                        <p className="text-gray-500 text-xs">{person.ContactInfo}</p>
                                    )}
                                </div>
                            </div>

                            {/* Fixed vertical separator line */}
                            <div className="h-16 w-px bg-gray-300 mx-6 flex-shrink-0"></div>

                            {/* Right section - Office */}
                            <div className="text-right flex-shrink-0">
                                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                    {person.OfficeID ? `Office ${person.OfficeID}` : 'Unassigned'}
                                </span>
                            </div>

                            {/* Expand/Collapse Button - Far Right */}
                            <button
                                onClick={() => toggleExpand(person.HeadID)}
                                className="flex-shrink-0 ml-4 p-1 hover:bg-gray-200 rounded transition-colors"
                                aria-label={expandedCards.has(person.HeadID) ? "Collapse details" : "Expand details"}
                            >
                                <svg 
                                    className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${expandedCards.has(person.HeadID) ? 'rotate-180' : ''}`}
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        </div>

                        {/* Expanded Details Section */}
                        {expandedCards.has(person.HeadID) && (
                            <div className="px-4 pb-4 pt-2 border-t border-gray-200 bg-gray-50 animate-fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                    {/* Contact Information */}
                                    <div className="space-y-2">
                                        <h4 className="font-semibold text-sm text-gray-700 mb-2">Contact Information</h4>
                                        <div className="flex items-start gap-2">
                                            <svg className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                            <div>
                                                <p className="text-xs text-gray-500">Email/Phone</p>
                                                <p className="text-sm text-gray-800">{person.ContactInfo || 'Not provided'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Office Assignment */}
                                    <div className="space-y-2">
                                        <h4 className="font-semibold text-sm text-gray-700 mb-2">Office Assignment</h4>
                                        <div className="flex items-start gap-2">
                                            <svg className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                            <div>
                                                <p className="text-xs text-gray-500">Current Office</p>
                                                <p className="text-sm text-gray-800 font-medium">
                                                    {person.OfficeID ? `Office #${person.OfficeID}` : 'Not assigned to any office'}
                                                </p>
                                                {person.OfficeName && (
                                                    <p className="text-xs text-gray-600 mt-1">{person.OfficeName}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Position Details */}
                                    <div className="space-y-2">
                                        <h4 className="font-semibold text-sm text-gray-700 mb-2">Position</h4>
                                        <div className="flex items-start gap-2">
                                            <svg className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                            <div>
                                                <p className="text-xs text-gray-500">Job Title</p>
                                                <p className="text-sm text-gray-800">{person.Position}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Additional Info */}
                                    <div className="space-y-2">
                                        <h4 className="font-semibold text-sm text-gray-700 mb-2">Profile ID</h4>
                                        <div className="flex items-start gap-2">
                                            <svg className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                            </svg>
                                            <div>
                                                <p className="text-xs text-gray-500">Head ID</p>
                                                <p className="text-sm text-gray-800 font-mono">#{person.HeadID}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Button */}
                                <div className="mt-4 pt-3 border-t border-gray-200">
                                    <button
                                        onClick={() => openEdit(person)}
                                        className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        Edit Office Head
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

                {/* Edit modal */}
                <EditOfficeHeadModal
                    visible={isEditModalOpen}
                    onClose={closeEdit}
                    head={selectedHead}
                    onSave={handleSave}
                />
        </div>
    );
});

export default OfficeHeadP;