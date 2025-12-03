import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import Header from "../Header/header.jsx";
import { requirementsAPI } from "../../utils/api";

const RequirementsP = forwardRef(({ searchTerm = '', filterOptions = { events: [], types: [] }, deleteMode = false, onSelectionChange, onRequirementClick }, ref) => {
    const [requirements, setRequirements] = useState([]);
    const [filteredRequirements, setFilteredRequirements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedRequirements, setSelectedRequirements] = useState(new Set());

    // Fetch requirements data from database
    useEffect(() => {
        fetchRequirements();
    }, []);

    // Filter and sort requirements based on search term and filters
    useEffect(() => {
        let filtered = requirements;
        
        // Apply search filter
        if (searchTerm.trim()) {
            filtered = requirements.filter(req => {
                const requirementCode = req.RequirementCode?.toLowerCase() || '';
                const description = req.Description?.toLowerCase() || '';
                const criteriaName = req.CriteriaName?.toLowerCase() || '';
                const eventName = req.EventName?.toLowerCase() || '';
                const searchLower = searchTerm.toLowerCase();
                
                return requirementCode.includes(searchLower) || 
                       description.includes(searchLower) || 
                       criteriaName.includes(searchLower) ||
                       eventName.includes(searchLower);
            });
        }

        // Apply event filters
        if (filterOptions.events.length > 0) {
            filtered = filtered.filter(req => 
                filterOptions.events.includes(req.EventName)
            );
        }

        // Apply type filters
        if (filterOptions.types.length > 0) {
            filtered = filtered.filter(req => {
                const hasParent = req.ParentRequirementCode;
                const nestingLevel = req.RequirementCode ? req.RequirementCode.split('.').length - 1 : 0;
                
                return filterOptions.types.some(type => {
                    if (type === 'main') return !hasParent;
                    if (type === 'sub') return hasParent && nestingLevel <= 2;
                    if (type === 'nested') return nestingLevel > 2;
                    return false;
                });
            });
        }

        // Sort by requirement code or name
        const sortedFiltered = [...filtered].sort((a, b) => {
            // Always sort in ascending order by requirement code
            return (a.RequirementCode || '').localeCompare(b.RequirementCode || '');
        });

        setFilteredRequirements(sortedFiltered);
    }, [requirements, searchTerm, filterOptions]);

    // Handle selection changes and notify parent component
    useEffect(() => {
        if (onSelectionChange) {
            onSelectionChange(selectedRequirements.size, Array.from(selectedRequirements));
        }
    }, [selectedRequirements, onSelectionChange]);

    // Clear selections when delete mode is turned off
    useEffect(() => {
        if (!deleteMode) {
            setSelectedRequirements(new Set());
        }
    }, [deleteMode]);

    const handleCheckboxChange = (requirementId, isChecked) => {
        setSelectedRequirements(prev => {
            const newSet = new Set(prev);
            if (isChecked) {
                newSet.add(requirementId);
            } else {
                newSet.delete(requirementId);
            }
            return newSet;
        });
    };

    const deleteSelectedRequirements = async (requirementIds) => {
        try {
            console.log('Attempting to delete requirements:', requirementIds);
            
            // Make API call to delete requirements
            const response = await requirementsAPI.deleteRequirements(requirementIds);
            console.log('Delete response:', response);
            
            if (response.success) {
                // Remove deleted requirements from local state
                setRequirements(prev => prev.filter(req => !requirementIds.includes(req.RequirementID)));
                setSelectedRequirements(new Set());
                return { success: true };
            } else {
                console.error('Delete failed:', response.message);
                return { success: false, message: response.message || 'Failed to delete requirements' };
            }
        } catch (error) {
            console.error('Error deleting requirements:', error);
            
            // Check if it's a network error
            if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
                return { success: false, message: 'Network error. Please check if the backend server is running on port 5000.' };
            }
            
            // Check for specific error responses
            if (error.response) {
                return { success: false, message: `Server error: ${error.response.data?.message || error.response.statusText}` };
            }
            
            return { success: false, message: `Error deleting requirements: ${error.message}` };
        }
    };

    const fetchRequirements = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await requirementsAPI.getAllRequirements();
            
            if (response.success) {
                setRequirements(response.data);
            } else {
                setError('Failed to fetch requirements');
            }
        } catch (error) {
            console.error('Error fetching requirements:', error);
            setError('Error loading requirements. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Function to refresh data (can be called from parent component)
    const refreshData = () => {
        fetchRequirements();
    };

    // Expose refresh function to parent
    useImperativeHandle(ref, () => ({
        refresh: refreshData,
        deleteSelected: deleteSelectedRequirements
    }));

    if (loading) {
        return (
            <div className="mt-6 w-full">
                <div className="bg-white rounded-md p-4 shadow-lg border-2 border-gray-200">
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-gray-600">Loading requirements...</span>
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
                            onClick={fetchRequirements}
                            className="ml-4 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (filteredRequirements.length === 0 && !loading) {
        if (searchTerm.trim()) {
            return (
                <div className="mt-6 w-full">
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-8 text-center">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
                        <p className="text-gray-600">No requirements match your search for "{searchTerm}".</p>
                        <p className="text-gray-500 text-sm mt-2">Try adjusting your search terms or browse all requirements.</p>
                    </div>
                </div>
            );
        } else if (requirements.length === 0) {
            return (
                <div className="mt-6 w-full">
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-8 text-center">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Requirements Found</h3>
                        <p className="text-gray-600">No requirements available yet.</p>
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
                    Showing {filteredRequirements.length} of {requirements.length} requirements
                    {filteredRequirements.length !== requirements.length && ` matching "${searchTerm}"`}
                </div>
            )}
            
            {filteredRequirements.map((requirement) => {
                return (
                    <div 
                        key={requirement.RequirementID}
                        onClick={() => !deleteMode && onRequirementClick && onRequirementClick(requirement)}
                        className={`bg-white rounded-lg shadow-md border border-gray-200 transition-all duration-200 ${
                            deleteMode ? 'hover:shadow-lg' : 'hover:shadow-lg cursor-pointer'
                        } ${selectedRequirements.has(requirement.RequirementID) ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
                        <div className="flex items-center justify-between p-4">
                            {/* Left Section: Checkbox + Icon + Info */}
                            <div className="flex items-center gap-4 flex-1">
                                {/* Checkbox for delete mode */}
                                {deleteMode && (
                                    <input
                                        type="checkbox"
                                        checked={selectedRequirements.has(requirement.RequirementID)}
                                        onChange={(e) => handleCheckboxChange(requirement.RequirementID, e.target.checked)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                )}
                                
                                {/* Icon */}
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                
                                {/* Requirement Info */}
                                <div className="flex flex-col flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-gray-900 text-base">
                                            {requirement.RequirementCode}
                                        </h3>
                                        {requirement.ParentRequirementCode && (
                                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                                Child of {requirement.ParentRequirementCode}
                                            </span>
                                        )}
                                        {/* Show nesting level */}
                                        {requirement.RequirementCode && (
                                            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                                                Level {requirement.RequirementCode.split('.').length - 1}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600 line-clamp-2">
                                        {requirement.Description}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1.5">
                                        {requirement.EventName && (
                                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                {requirement.EventName}
                                            </span>
                                        )}
                                        {requirement.CriteriaName && (
                                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                </svg>
                                                {requirement.CriteriaCode}: {requirement.CriteriaName}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Right Section: Status Badge */}
                            <div className="flex-shrink-0">
                                <span className={`px-3 py-1 rounded text-sm font-medium ${
                                    !requirement.ParentRequirementCode 
                                        ? 'bg-green-100 text-green-700' 
                                        : requirement.RequirementCode && requirement.RequirementCode.split('.').length > 3
                                        ? 'bg-orange-100 text-orange-700'
                                        : 'bg-purple-100 text-purple-700'
                                }`}>
                                    {!requirement.ParentRequirementCode 
                                        ? 'Main' 
                                        : requirement.RequirementCode && requirement.RequirementCode.split('.').length > 3
                                        ? 'Nested'
                                        : 'Sub-requirement'}
                                </span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
});

export default RequirementsP;