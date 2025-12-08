import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import Header from "../Header/header.jsx";
import { requirementsAPI } from "../../utils/api";

const RequirementsP = forwardRef(({ searchTerm = '', filterOptions = { events: [], types: [] }, deleteMode = false, onSelectionChange, onRequirementClick, eventType = 'PACUCOA' }, ref) => {
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

        // Filter by selected event type FIRST
        if (eventType) {
            console.log('=== EVENT FILTERING DEBUG ===');
            console.log('Selected eventType:', eventType);
            console.log('Unique EventNames in database:', [...new Set(requirements.map(r => r.EventName))]);
            
            // Map the button types to actual EventNames in database
            // Try both exact match and partial match for flexibility
            filtered = requirements.filter(req => {
                if (!req.EventName) return false;
                
                const eventNameUpper = req.EventName.toUpperCase();
                const eventTypeUpper = eventType.toUpperCase();
                
                // Check for PASSCU - be very flexible
                if (eventType === 'PASSCU') {
                    const matches = eventNameUpper.includes('PASSCU') || 
                                   eventNameUpper.includes('PAASCU') || 
                                   eventNameUpper.includes('PASCU');
                    console.log(`Checking ${req.RequirementCode}: EventName="${req.EventName}", matches PASSCU: ${matches}`);
                    return matches;
                }
                // Check for ISO
                if (eventType === 'ISO') {
                    return eventNameUpper.includes('ISO');
                }
                // Check for PACUCOA
                if (eventType === 'PACUCOA') {
                    return eventNameUpper.includes('PACUCOA');
                }
                
                return false;
            });
            
            console.log(`Filtered ${eventType} requirements:`, filtered.length);
            if (filtered.length > 0) {
                console.log('Sample requirement:', filtered[0]);
            }
        }
        
        // Apply search filter
        if (searchTerm.trim()) {
            filtered = filtered.filter(req => {
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
    }, [requirements, searchTerm, filterOptions, eventType]);

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
            
            {/* PASSCU - Hierarchical Area -> Criteria -> Requirements */}
            {eventType === 'PASSCU' ? (
                <div className="space-y-6">
                    {(() => {
                        // Group requirements by Area
                        const areaGroups = filteredRequirements.reduce((acc, req) => {
                            const areaCode = req.AreaCode || 'No Area';
                            if (!acc[areaCode]) {
                                acc[areaCode] = {
                                    areaName: req.AreaName || 'Unknown Area',
                                    requirements: []
                                };
                            }
                            acc[areaCode].requirements.push(req);
                            return acc;
                        }, {});

                        return Object.entries(areaGroups).map(([areaCode, areaData]) => (
                            <div key={areaCode} className="space-y-4">
                                {/* Area Header */}
                                <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-3 rounded-lg shadow-md">
                                    <h3 className="text-base font-bold">{areaCode}</h3>
                                    <p className="text-xs text-purple-100 mt-1">{areaData.areaName}</p>
                                </div>

                                {/* Group by Criteria within this Area */}
                                {(() => {
                                    const criteriaGroups = areaData.requirements.reduce((acc, req) => {
                                        const criteriaCode = req.CriteriaCode || 'No Criteria';
                                        if (!acc[criteriaCode]) {
                                            acc[criteriaCode] = {
                                                criteriaName: req.CriteriaName || 'Unknown Criteria',
                                                requirements: []
                                            };
                                        }
                                        acc[criteriaCode].requirements.push(req);
                                        return acc;
                                    }, {});

                                    return Object.entries(criteriaGroups).map(([criteriaCode, criteriaData]) => (
                                        <div key={criteriaCode} className="ml-4 space-y-2">
                                            {/* Criteria Header */}
                                            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-4 py-3 rounded-lg shadow-md">
                                                <h3 className="text-sm font-bold">{criteriaCode}</h3>
                                                <p className="text-xs text-indigo-100 mt-1">{criteriaData.criteriaName}</p>
                                            </div>

                                            {/* Requirements under this Criteria */}
                                            <div className="ml-4 space-y-2">
                                                {criteriaData.requirements.map((requirement) => (
                                                    <div 
                                                        key={requirement.RequirementID}
                                                        onClick={() => !deleteMode && onRequirementClick && onRequirementClick(requirement)}
                                                        className={`bg-white rounded-lg shadow-md border-l-4 border-indigo-200 transition-all duration-200 ${
                                                            deleteMode ? 'hover:shadow-lg' : 'hover:shadow-lg hover:border-indigo-400 cursor-pointer'
                                                        } ${selectedRequirements.has(requirement.RequirementID) ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
                                                        <div className="flex items-center justify-between p-4">
                                                            {/* Left Section: Checkbox + Info */}
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
                                                                
                                                                {/* Requirement Info */}
                                                                <div className="flex flex-col flex-1 min-w-0">
                                                                    <h3 className="font-semibold text-gray-900 text-base">
                                                                        {requirement.RequirementCode}
                                                                    </h3>
                                                                    <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                                                                        {requirement.Description}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        ));
                    })()}
                </div>
            ) : (
                // PACUCOA & ISO - Group by Criteria only
                <div className="space-y-6">
                    {(() => {
                        const criteriaGroups = filteredRequirements.reduce((acc, req) => {
                            const criteriaCode = req.CriteriaCode || 'No Criteria';
                            if (!acc[criteriaCode]) {
                                acc[criteriaCode] = {
                                    criteriaName: req.CriteriaName || 'Unknown Criteria',
                                    requirements: []
                                };
                            }
                            acc[criteriaCode].requirements.push(req);
                            return acc;
                        }, {});

                        return Object.entries(criteriaGroups).map(([criteriaCode, criteriaData]) => (
                            <div key={criteriaCode} className="space-y-2">
                                {/* Criteria Header */}
                                <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-4 py-3 rounded-lg shadow-md">
                                    <h3 className="text-sm font-bold">{criteriaCode}</h3>
                                    <p className="text-xs text-indigo-100 mt-1">{criteriaData.criteriaName}</p>
                                </div>

                                {/* Requirements under this Criteria */}
                                <div className="space-y-2">
                                    {criteriaData.requirements.map((requirement) => (
                                        <div 
                                            key={requirement.RequirementID}
                                            onClick={() => !deleteMode && onRequirementClick && onRequirementClick(requirement)}
                                            className={`bg-white rounded-lg shadow-md border-l-4 border-indigo-200 transition-all duration-200 ${
                                                deleteMode ? 'hover:shadow-lg' : 'hover:shadow-lg hover:border-indigo-400 cursor-pointer'
                                            } ${selectedRequirements.has(requirement.RequirementID) ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
                                            <div className="flex items-center justify-between p-4">
                                                {/* Left Section: Checkbox + Info */}
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
                                                    
                                                    {/* Requirement Info */}
                                                    <div className="flex flex-col flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="font-semibold text-gray-900 text-base">
                                                                {requirement.RequirementCode}
                                                            </h3>
                                                            {requirement.ParentRequirementCode && (
                                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                                                    Child of {requirement.ParentRequirementCode}
                                                                </span>
                                                            )}
                                                            {/* Show nesting level */}
                                                            {requirement.RequirementCode && requirement.RequirementCode.split('.').length > 2 && (
                                                                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                                                                    Level {requirement.RequirementCode.split('.').length - 1}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                                                            {requirement.Description}
                                                        </p>
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
                                    ))}
                                </div>
                            </div>
                        ));
                    })()}
                </div>
            )}
        </div>
    );
});

export default RequirementsP;