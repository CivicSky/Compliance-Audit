
import React, { useState, useEffect } from 'react';

export default function AddCriteriaModal({ isOpen, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        EventID: '',
        AreaID: '',
        CriteriaCode: '',
        CriteriaName: '',
        Description: '',
        ParentCriteriaID: ''
    });
    const [eventsList, setEventsList] = useState([]);
    const [areasList, setAreasList] = useState([]);
    const [criteriaList, setCriteriaList] = useState([]);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchEvents();
        }
    }, [isOpen]);

    useEffect(() => {
        if (formData.EventID) {
            fetchAreasByEvent(formData.EventID);
            fetchCriteriaByEvent(formData.EventID);
        } else {
            setAreasList([]);
            setCriteriaList([]);
        }
    }, [formData.EventID]);

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
            if (data.success) {
                setAreasList(data.data || []);
            } else {
                setAreasList([]);
            }
        } catch (error) {
            setAreasList([]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCriteriaByEvent = async (eventId) => {
        try {
            const { requirementsAPI } = await import('../../utils/api');
            const response = await requirementsAPI.getCriteriaByEvent(eventId);
            if (response.success) {
                setCriteriaList(response.data || []);
            } else {
                setCriteriaList([]);
            }
        } catch (error) {
            setCriteriaList([]);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.EventID) newErrors.EventID = 'Event is required';
        // Area is optional for top-level criteria (no parent)
        // If ParentCriteriaID is not set, AreaID is optional
        // If ParentCriteriaID is set, AreaID is also optional (criteria can be nested without area)
        // So, AreaID is always optional
        if (!formData.CriteriaCode.trim()) newErrors.CriteriaCode = 'Criteria code is required';
        if (!formData.CriteriaName.trim()) newErrors.CriteriaName = 'Criteria name is required';
        if (!formData.Description.trim()) newErrors.Description = 'Description is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        setIsSubmitting(true);
        try {
            const response = await fetch('http://localhost:5000/api/criteria/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await response.json();
            if (data.success) {
                setFormData({ EventID: '', AreaID: '', CriteriaCode: '', CriteriaName: '', Description: '', ParentCriteriaID: '' });
                if (onSuccess) onSuccess(data.data);
                onClose();
                alert('Criteria added successfully!');
            } else {
                alert(data.message || 'Failed to add criteria');
            }
        } catch (error) {
            alert('An error occurred while adding the criteria. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setFormData({ EventID: '', AreaID: '', CriteriaCode: '', CriteriaName: '', Description: '', ParentCriteriaID: '' });
            setErrors({});
            setAreasList([]);
            setCriteriaList([]);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 my-8 min-h-[60vh] max-h-[85vh] overflow-y-auto ml-64">
                <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-semibold text-gray-800">Add New Criteria</h2>
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
                            {/* Event Selection */}
                            <div>
                                <label htmlFor="EventID" className="block text-sm font-medium text-gray-700 mb-1">Event *</label>
                                <select
                                    id="EventID"
                                    name="EventID"
                                    value={formData.EventID}
                                    onChange={handleInputChange}
                                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.EventID ? 'border-red-500' : 'border-gray-300'}`}
                                    disabled={isSubmitting}
                                >
                                    <option value="">Select an event</option>
                                    {eventsList.map((event) => (
                                        <option key={event.EventID} value={event.EventID}>
                                            {event.EventCode} - {event.EventName}
                                        </option>
                                    ))}
                                </select>
                                {errors.EventID && <p className="text-red-500 text-xs mt-1">{errors.EventID}</p>}
                            </div>
                            {/* Area Dropdown */}
                            <div>
                                <label htmlFor="AreaID" className="block text-sm font-medium text-gray-700 mb-1">Area *</label>
                                <select
                                    id="AreaID"
                                    name="AreaID"
                                    value={formData.AreaID}
                                    onChange={handleInputChange}
                                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.AreaID ? 'border-red-500' : 'border-gray-300'}`}
                                    disabled={isSubmitting || isLoading || !formData.EventID}
                                >
                                    <option value="">{!formData.EventID ? 'Select an event first' : 'Select an area'}</option>
                                    {/* Show all areas in dropdown */}
                                    {areasList.map((area) => (
                                        <option key={area.AreaID} value={area.AreaID}>
                                            {area.AreaCode} - {area.AreaName}
                                        </option>
                                    ))}
                                </select>
                                {errors.AreaID && <p className="text-red-500 text-xs mt-1">{errors.AreaID}</p>}
                            </div>
                            {/* Parent Criteria Dropdown */}
                            <div>
                                <label htmlFor="ParentCriteriaID" className="block text-sm font-medium text-gray-700 mb-1">Parent Criteria (Optional)</label>
                                <select
                                    id="ParentCriteriaID"
                                    name="ParentCriteriaID"
                                    value={formData.ParentCriteriaID}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isSubmitting || !formData.EventID || criteriaList.length === 0}
                                >
                                    <option value="">None (Top-level criteria)</option>
                                    {/* Only show criteria from the selected area, except the one being created */}
                                    {criteriaList
                                        .filter(criteria =>
                                            criteria.CriteriaCode !== formData.CriteriaCode &&
                                            (!formData.AreaID || String(criteria.AreaID) === String(formData.AreaID))
                                        )
                                        .map(criteria => (
                                            <option key={criteria.CriteriaID} value={criteria.CriteriaID}>
                                                {criteria.CriteriaCode} - {criteria.CriteriaName}
                                            </option>
                                        ))}
                                </select>
                                {formData.EventID && (
                                    <p className="text-green-600 text-xs mt-1">
                                        ✓ {criteriaList.length} existing criteria in this event
                                    </p>
                                )}
                            </div>
                            {/* Criteria Code */}
                            <div>
                                <label htmlFor="CriteriaCode" className="block text-sm font-medium text-gray-700 mb-1">Criteria Code *</label>
                                <input
                                    type="text"
                                    id="CriteriaCode"
                                    name="CriteriaCode"
                                    value={formData.CriteriaCode}
                                    onChange={handleInputChange}
                                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.CriteriaCode ? 'border-red-500' : 'border-gray-300'}`}
                                    placeholder="e.g., A.1, B.2.1"
                                    disabled={isSubmitting}
                                />
                                {errors.CriteriaCode && <p className="text-red-500 text-xs mt-1">{errors.CriteriaCode}</p>}
                            </div>
                            {/* Criteria Name */}
                            <div>
                                <label htmlFor="CriteriaName" className="block text-sm font-medium text-gray-700 mb-1">Criteria Name *</label>
                                <input
                                    type="text"
                                    id="CriteriaName"
                                    name="CriteriaName"
                                    value={formData.CriteriaName}
                                    onChange={handleInputChange}
                                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.CriteriaName ? 'border-red-500' : 'border-gray-300'}`}
                                    placeholder="Enter criteria name"
                                    disabled={isSubmitting}
                                />
                                {errors.CriteriaName && <p className="text-red-500 text-xs mt-1">{errors.CriteriaName}</p>}
                            </div>
                            {/* Description */}
                            <div>
                                <label htmlFor="Description" className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                                <textarea
                                    id="Description"
                                    name="Description"
                                    value={formData.Description}
                                    onChange={handleInputChange}
                                    rows="3"
                                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${errors.Description ? 'border-red-500' : 'border-gray-300'}`}
                                    placeholder="Enter a detailed description of this criteria"
                                    disabled={isSubmitting}
                                />
                                {errors.Description && <p className="text-red-500 text-xs mt-1">{errors.Description}</p>}
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
                                    disabled={isSubmitting || !formData.EventID}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isSubmitting && (
                                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                                            <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    )}
                                    {isSubmitting ? 'Adding...' : 'Add Criteria'}
                                </button>
                            </div>
                        </form>
                    </div>
                    {/* Right Side - Preview */}
                    <div className="w-1/2 p-6 bg-gray-50">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Preview Structure</h3>
                        {(formData.AreaID || formData.CriteriaCode || formData.CriteriaName) ? (
                            <div className="space-y-4">
                                {/* Area Preview (matches CriteriaP style) */}
                                {formData.AreaID && (
                                    <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-3 rounded-lg shadow-md">
                                        <h3 className="text-base font-bold">
                                            {areasList.find(a => a.AreaID == formData.AreaID)?.AreaCode || 'No Area'}
                                        </h3>
                                        <p className="text-xs text-purple-100 mt-1">
                                            {areasList.find(a => a.AreaID == formData.AreaID)?.AreaName || 'Unknown Area'}
                                        </p>
                                    </div>
                                )}
                                {/* Parent Criteria Preview (matches CriteriaP style) */}
                                {formData.ParentCriteriaID && (
                                    <div className="ml-4">
                                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-4 py-3 rounded-lg shadow-md flex items-center">
                                            <div className="flex flex-col w-full">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold text-white text-base">
                                                        {criteriaList.find(c => c.CriteriaID == formData.ParentCriteriaID)?.CriteriaCode || 'Parent Criteria'}
                                                    </h3>
                                                </div>
                                                <p className="text-sm text-indigo-100 mt-1">
                                                    {criteriaList.find(c => c.CriteriaID == formData.ParentCriteriaID)?.CriteriaName || 'Select a parent criteria'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {/* Criteria Preview (matches CriteriaP style) */}
                                {(formData.CriteriaCode || formData.CriteriaName) && (
                                    <div className="ml-4 space-y-2">
                                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-4 py-3 rounded-lg shadow-md flex items-center">
                                            <div className="flex flex-col w-full">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold text-white text-base">
                                                        {(() => {
                                                            const parentCode = criteriaList.find(c => c.CriteriaID == formData.ParentCriteriaID)?.CriteriaCode || '';
                                                            const code = formData.CriteriaCode || '';
                                                            if (parentCode && code) {
                                                                return `${parentCode}.${code}`;
                                                            }
                                                            return code || 'Enter criteria code...';
                                                        })()}
                                                    </h3>
                                                </div>
                                                <p className="text-sm text-indigo-100 mt-1">
                                                    {formData.CriteriaName || 'Enter criteria name...'}
                                                </p>
                                                <p className="text-xs text-indigo-200 mt-1">
                                                    {formData.Description || 'Enter a description...'}
                                                </p>
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
                                <p className="text-gray-400 text-xs mt-1">Area → Parent Criteria → Criteria</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}