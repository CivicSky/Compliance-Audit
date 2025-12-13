import React, { useState, useEffect } from 'react';

export default function AddRequirementModal({ isOpen, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        EventID: '8', // Auto-set to PASSCU (EventID = 8)
        RequirementCode: '',
        Description: '',
        AreaID: '',
        CriteriaID: '',
        ParentRequirementCode: ''
    });

    const [eventsList, setEventsList] = useState([]);
    const [areasList, setAreasList] = useState([]);
    const [allCriteria, setAllCriteria] = useState([]); // All criteria for the event
    const [criteriaList, setCriteriaList] = useState([]); // Filtered criteria for selected area
    const [requirementsList, setRequirementsList] = useState([]);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch events when modal opens and auto-load PASSCU areas and criteria
    useEffect(() => {
        if (isOpen) {
            fetchEvents();
            // Automatically load PASSCU areas and criteria (EventID = 8)
            fetchAreasByEvent('8');
            fetchAllCriteriaForEvent('8');
        }
    }, [isOpen]);

    // Fetch areas and criteria when event is selected
    useEffect(() => {
        if (formData.EventID) {
            fetchAreasByEvent(formData.EventID);
            fetchAllCriteriaForEvent(formData.EventID);
        } else {
            setAreasList([]);
            setAllCriteria([]);
            setCriteriaList([]);
        }
    }, [formData.EventID]);

    // Filter criteria when area is selected
    useEffect(() => {
        if (formData.AreaID && allCriteria.length > 0) {
            const filtered = allCriteria.filter(c => c.AreaID == formData.AreaID);
            console.log('Filtered criteria for AreaID', formData.AreaID, ':', filtered);
            setCriteriaList(filtered);
        } else {
            setCriteriaList([]);
        }
    }, [formData.AreaID, allCriteria]);

    // Fetch requirements for selected criteria
    useEffect(() => {
        if (formData.CriteriaID) {
            fetchRequirementsByCriteria(formData.CriteriaID);
        } else {
            setRequirementsList([]);
        }
    }, [formData.CriteriaID]);

    const fetchEvents = async () => {
        try {
            const { eventsAPI } = await import('../../utils/api');
            const response = await eventsAPI.getAllEvents();
            
            if (response.success) {
                setEventsList(response.data);
            }
        } catch (error) {
            console.error('Error fetching events:', error);
        }
    };

    const fetchAreasByEvent = async (eventId) => {
        setIsLoading(true);
        try {
            const response = await fetch(`http://localhost:5000/api/areas/event/${eventId}`);
            const data = await response.json();
            console.log('Areas response:', data);
            
            if (data.success) {
                setAreasList(data.data || []);
            } else {
                console.error('Failed to fetch areas:', data.message);
                setAreasList([]);
            }
        } catch (error) {
            console.error('Error fetching areas:', error);
            setAreasList([]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAllCriteriaForEvent = async (eventId) => {
        setIsLoading(true);
        try {
            console.log('Fetching all criteria for EventID:', eventId);
            const { requirementsAPI } = await import('../../utils/api');
            const response = await requirementsAPI.getAllRequirements();
            
            if (response.success) {
                // Extract unique criteria from requirements
                const criteriaMap = new Map();
                response.data.forEach(req => {
                    if (req.EventID == eventId && req.CriteriaID) {
                        if (!criteriaMap.has(req.CriteriaID)) {
                            criteriaMap.set(req.CriteriaID, {
                                CriteriaID: req.CriteriaID,
                                CriteriaCode: req.CriteriaCode,
                                CriteriaName: req.CriteriaName,
                                AreaID: req.AreaID,
                                EventID: req.EventID
                            });
                        }
                    }
                });
                
                const criteriaArray = Array.from(criteriaMap.values());
                console.log('All criteria for event:', criteriaArray);
                setAllCriteria(criteriaArray);
            } else {
                console.error('Failed to fetch criteria:', response.message);
                setAllCriteria([]);
            }
        } catch (error) {
            console.error('Error fetching criteria:', error);
            setAllCriteria([]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchRequirementsByCriteria = async (criteriaId) => {
        try {
            const { requirementsAPI } = await import('../../utils/api');
            console.log('Fetching requirements for criteria:', criteriaId);
            const response = await requirementsAPI.getAllRequirements();
            console.log('Requirements response:', response);
            
            if (response.success) {
                // Filter requirements by selected criteria
                const filtered = response.data.filter(req => req.CriteriaID == criteriaId);
                console.log('Filtered requirements for criteria:', filtered);
                setRequirementsList(filtered);
            } else {
                console.error('Failed to fetch requirements:', response.message);
            }
        } catch (error) {
            console.error('Error fetching requirements:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.EventID) {
            newErrors.EventID = 'Event is required';
        }
        if (!formData.AreaID) {
            newErrors.AreaID = 'Area is required';
        }
        if (!formData.RequirementCode.trim()) {
            newErrors.RequirementCode = 'Requirement code is required';
        }
        if (!formData.Description.trim()) {
            newErrors.Description = 'Description is required';
        }
        if (!formData.CriteriaID) {
            newErrors.CriteriaID = 'Criteria is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        
        try {
            // Import requirementsAPI
            const { requirementsAPI } = await import('../../utils/api');
            
            // Add requirement to database
            const response = await requirementsAPI.addRequirement({
                RequirementCode: formData.RequirementCode,
                Description: formData.Description,
                CriteriaID: formData.CriteriaID,
                ParentRequirementCode: formData.ParentRequirementCode || null
            });

            if (response.success) {
                console.log('Requirement added successfully:', response.data);
                
                // Reset form and close modal
                setFormData({
                    EventID: '8', // Keep PASSCU selected
                    RequirementCode: '',
                    Description: '',
                    AreaID: '',
                    CriteriaID: '',
                    ParentRequirementCode: ''
                });
                
                // Call onSuccess callback if provided
                if (onSuccess) {
                    onSuccess(response.data);
                }
                
                onClose();
                alert('Requirement added successfully!');
            } else {
                alert(response.message || 'Failed to add requirement');
            }
            
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('An error occurred while adding the requirement. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            // Reset form when closing
            setFormData({
                EventID: '8', // Keep PASSCU selected
                RequirementCode: '',
                Description: '',
                AreaID: '',
                CriteriaID: '',
                ParentRequirementCode: ''
            });
            setErrors({});
            setAreasList([]);
            setCriteriaList([]);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 my-8 min-h-[70vh] max-h-[85vh] overflow-y-auto ml-64">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-semibold text-gray-800">Add New PASSCU Requirement</h2>
                    <button
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex">
                    {/* Left Side - Form */}
                    <div className="w-1/2 p-6 border-r">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Event Selection - Hidden/Disabled for PASSCU */}
                            <div>
                                <label htmlFor="EventID" className="block text-sm font-medium text-gray-700 mb-1">
                                    Event *
                                </label>
                                <select
                                    id="EventID"
                                    name="EventID"
                                    value={formData.EventID}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    disabled={isSubmitting}
                                >
                                    <option value="">Select an event</option>
                                    {eventsList.map((event) => (
                                        <option key={event.EventID} value={event.EventID}>
                                            {event.EventCode} - {event.EventName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Area Dropdown */}
                            <div>
                                <label htmlFor="AreaID" className="block text-sm font-medium text-gray-700 mb-1">
                                    Area *
                                </label>
                                <select
                                    id="AreaID"
                                    name="AreaID"
                                    value={formData.AreaID}
                                    onChange={handleInputChange}
                                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                                        errors.AreaID ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    disabled={isSubmitting || isLoading || !formData.EventID}
                                >
                                    <option value="">Select an area</option>
                                    {areasList.map((area) => (
                                        <option key={area.AreaID} value={area.AreaID}>
                                            {area.AreaCode} - {area.AreaName}
                                        </option>
                                    ))}
                                </select>
                                {errors.AreaID && (
                                    <p className="text-red-500 text-xs mt-1">{errors.AreaID}</p>
                                )}
                                {!isLoading && areasList.length > 0 && (
                                    <p className="text-green-600 text-xs mt-1">✓ {areasList.length} areas loaded</p>
                                )}
                            </div>

                            {/* Criteria Dropdown */}
                            <div>
                                <label htmlFor="CriteriaID" className="block text-sm font-medium text-gray-700 mb-1">
                                    Criteria *
                                </label>
                                <select
                                    id="CriteriaID"
                                    name="CriteriaID"
                                    value={formData.CriteriaID}
                                    onChange={handleInputChange}
                                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                                        errors.CriteriaID ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    disabled={isSubmitting || isLoading || !formData.AreaID}
                                >
                                    <option value="">
                                        {!formData.AreaID ? 'Select an area first' : 'Select a criteria'}
                                    </option>
                                    {criteriaList.map((criteria) => (
                                        <option key={criteria.CriteriaID} value={criteria.CriteriaID}>
                                            {criteria.CriteriaCode} - {criteria.CriteriaName}
                                        </option>
                                    ))}
                                </select>
                                {errors.CriteriaID && (
                                    <p className="text-red-500 text-xs mt-1">{errors.CriteriaID}</p>
                                )}
                                {isLoading && (
                                    <p className="text-gray-500 text-xs mt-1">Loading criteria...</p>
                                )}
                                {!isLoading && criteriaList.length > 0 && (
                                    <p className="text-green-600 text-xs mt-1">✓ {criteriaList.length} criteria loaded</p>
                                )}
                            </div>

                            {/* Parent Requirement Code */}
                            <div>
                                <label htmlFor="ParentRequirementCode" className="block text-sm font-medium text-gray-700 mb-1">
                                    Parent Requirement (Optional)
                                </label>
                                <select
                                    id="ParentRequirementCode"
                                    name="ParentRequirementCode"
                                    value={formData.ParentRequirementCode}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    disabled={isSubmitting || !formData.CriteriaID}
                                >
                                    <option value="">
                                        {!formData.CriteriaID ? 'Select a criteria first' : 'None (Top-level requirement)'}
                                    </option>
                                    {requirementsList.map((req) => (
                                        <option key={req.RequirementID} value={req.RequirementCode}>
                                            {req.RequirementCode} - {req.Description?.substring(0, 50)}
                                            {req.Description?.length > 50 ? '...' : ''}
                                        </option>
                                    ))}
                                </select>
                                {requirementsList.length > 0 && (
                                    <p className="text-green-600 text-xs mt-1">
                                        ✓ {requirementsList.length} existing requirement{requirementsList.length !== 1 ? 's' : ''}
                                    </p>
                                )}
                            </div>

                            {/* Requirement Code */}
                            <div>
                                <label htmlFor="RequirementCode" className="block text-sm font-medium text-gray-700 mb-1">
                                    Requirement Code *
                                </label>
                                <input
                                    type="text"
                                    id="RequirementCode"
                                    name="RequirementCode"
                                    value={formData.RequirementCode}
                                    onChange={handleInputChange}
                                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                                        errors.RequirementCode ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    placeholder="e.g., VMG.1.1.1"
                                    disabled={isSubmitting}
                                />
                                {errors.RequirementCode && (
                                    <p className="text-red-500 text-xs mt-1">{errors.RequirementCode}</p>
                                )}
                            </div>

                            {/* Description */}
                            <div>
                                <label htmlFor="Description" className="block text-sm font-medium text-gray-700 mb-1">
                                    Description *
                                </label>
                                <textarea
                                    id="Description"
                                    name="Description"
                                    value={formData.Description}
                                    onChange={handleInputChange}
                                    rows="3"
                                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none ${
                                        errors.Description ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    placeholder="Enter requirement description"
                                    disabled={isSubmitting}
                                />
                                {errors.Description && (
                                    <p className="text-red-500 text-xs mt-1">{errors.Description}</p>
                                )}
                            </div>

                            {/* Form Actions */}
                            <div className="flex justify-end space-x-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    disabled={isSubmitting}
                                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !formData.EventID || !formData.AreaID || !formData.CriteriaID}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isSubmitting && (
                                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                                            <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    )}
                                    {isSubmitting ? 'Adding...' : 'Add Requirement'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Right Side - Preview */}
                    <div className="w-1/2 p-6 bg-gray-50">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Preview Structure</h3>
                        
                        {/* Preview of selected hierarchy */}
                        {formData.AreaID || formData.CriteriaID || formData.RequirementCode ? (
                            <div className="space-y-4">
                                {/* Area Preview */}
                                {formData.AreaID && (
                                    <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-3 rounded-lg shadow-md">
                                        <h3 className="text-base font-bold">
                                            {areasList.find(a => a.AreaID == formData.AreaID)?.AreaCode || 'Area'}
                                        </h3>
                                        <p className="text-xs text-purple-100 mt-1">
                                            {areasList.find(a => a.AreaID == formData.AreaID)?.AreaName || 'Select an area'}
                                        </p>
                                    </div>
                                )}

                                {/* Criteria Preview */}
                                {formData.CriteriaID && (
                                    <div className="ml-4">
                                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-4 py-3 rounded-lg shadow-md">
                                            <h3 className="text-sm font-bold">
                                                {criteriaList.find(c => c.CriteriaID == formData.CriteriaID)?.CriteriaCode || 'Criteria'}
                                            </h3>
                                            <p className="text-xs text-indigo-100 mt-1">
                                                {criteriaList.find(c => c.CriteriaID == formData.CriteriaID)?.CriteriaName || 'Select a criteria'}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Requirement Preview */}
                                {formData.RequirementCode && (
                                    <div className="ml-8">
                                        <div className="border-l-4 border-indigo-200 bg-white p-4 rounded-r-lg shadow-sm">
                                            <div className="flex items-start gap-3">
                                                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center mt-1">
                                                    <svg className="w-3 h-3 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-sm text-gray-800">
                                                        {(() => {
                                                            const criteriaCode = criteriaList.find(c => c.CriteriaID == formData.CriteriaID)?.CriteriaCode || '';
                                                            const parentCode = formData.ParentRequirementCode || '';
                                                            const reqCode = formData.RequirementCode || '';
                                                            
                                                            if (reqCode) {
                                                                if (parentCode) {
                                                                    // Parent already includes criteria code
                                                                    return `${parentCode}.${reqCode}`;
                                                                } else if (criteriaCode) {
                                                                    return `${criteriaCode}.${reqCode}`;
                                                                }
                                                                return reqCode;
                                                            }
                                                            return 'Enter requirement code...';
                                                        })()}
                                                    </h4>
                                                    <p className="text-xs text-gray-600 mt-1">
                                                        {formData.Description || 'Enter a description...'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-gray-500 text-sm">Fill out the form to see preview</p>
                                <p className="text-gray-400 text-xs mt-1">Area → Criteria → Requirement</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}