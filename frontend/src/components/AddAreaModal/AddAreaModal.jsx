import React, { useState, useEffect } from 'react';

// AddAreaModal: Modal for adding a new Area (choose event, area code, area name, description optional)
export default function AddAreaModal({ isOpen, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        EventChildID: '',
        AreaCode: '',
        AreaName: '',
        Description: ''
    });
    const [events, setEvents] = useState([]);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loadingEvents, setLoadingEvents] = useState(false);

    // Fetch events for dropdown
    useEffect(() => {
        if (!isOpen) return;
        setLoadingEvents(true);
        import('../../utils/api').then(({ eventsAPI }) => {
            eventsAPI.getAllEvents().then(res => {
                if (res.success && Array.isArray(res.data)) {
                    setEvents(res.data);
                } else {
                    setEvents([]);
                }
                setLoadingEvents(false);
            }).catch(() => {
                setEvents([]);
                setLoadingEvents(false);
            });
        });
    }, [isOpen]);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setFormData({ EventChildID: '', AreaCode: '', AreaName: '', Description: '' });
            setErrors({});
        }
    }, [isOpen]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.EventChildID) newErrors.EventChildID = 'Event is required';
        if (!formData.AreaCode.trim()) newErrors.AreaCode = 'Area code is required';
        if (!formData.AreaName.trim()) newErrors.AreaName = 'Area name is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        setIsSubmitting(true);
        try {
            const { areasAPI } = await import('../../utils/api');
            const response = await areasAPI.addArea({
                EventChildID: formData.EventChildID,
                AreaCode: formData.AreaCode,
                AreaName: formData.AreaName,
                Description: formData.Description || null
            });
            if (response.success) {
                if (onSuccess) onSuccess(response.data);
                setFormData({ EventChildID: '', AreaCode: '', AreaName: '', Description: '' });
                onClose();
                alert('Area added successfully!');
            } else {
                alert(response.message || 'Failed to add area');
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('An error occurred while adding the area. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setFormData({ EventChildID: '', AreaCode: '', AreaName: '', Description: '' });
            setErrors({});
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-semibold text-gray-800">Add New Area</h2>
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

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6">
                    {/* Event Dropdown */}
                    <div className="mb-6">
                        <label htmlFor="EventChildID" className="block text-sm font-medium text-gray-700 mb-2">
                            Event *
                        </label>
                        <select
                            id="EventChildID"
                            name="EventChildID"
                            value={formData.EventChildID}
                            onChange={handleInputChange}
                            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.EventChildID ? 'border-red-500' : 'border-gray-300'}`}
                            disabled={isSubmitting || loadingEvents}
                        >
                            <option value="">Select event</option>
                            {events.map(event => (
                                <option key={event.EventID} value={event.EventID}>{event.EventName}</option>
                            ))}
                        </select>
                        {errors.EventChildID && (
                            <p className="text-red-500 text-sm mt-1">{errors.EventChildID}</p>
                        )}
                    </div>

                    {/* Area Code */}
                    <div className="mb-6">
                        <label htmlFor="AreaCode" className="block text-sm font-medium text-gray-700 mb-2">
                            Area Code *
                        </label>
                        <input
                            type="text"
                            id="AreaCode"
                            name="AreaCode"
                            value={formData.AreaCode}
                            onChange={handleInputChange}
                            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.AreaCode ? 'border-red-500' : 'border-gray-300'}`}
                            placeholder="e.g., AREA1, AREA2"
                            disabled={isSubmitting}
                        />
                        {errors.AreaCode && (
                            <p className="text-red-500 text-sm mt-1">{errors.AreaCode}</p>
                        )}
                    </div>

                    {/* Area Name */}
                    <div className="mb-6">
                        <label htmlFor="AreaName" className="block text-sm font-medium text-gray-700 mb-2">
                            Area Name *
                        </label>
                        <input
                            type="text"
                            id="AreaName"
                            name="AreaName"
                            value={formData.AreaName}
                            onChange={handleInputChange}
                            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.AreaName ? 'border-red-500' : 'border-gray-300'}`}
                            placeholder="e.g., Faculty, Research"
                            disabled={isSubmitting}
                        />
                        {errors.AreaName && (
                            <p className="text-red-500 text-sm mt-1">{errors.AreaName}</p>
                        )}
                    </div>

                    {/* Description */}
                    <div className="mb-6">
                        <label htmlFor="Description" className="block text-sm font-medium text-gray-700 mb-2">
                            Description
                        </label>
                        <textarea
                            id="Description"
                            name="Description"
                            value={formData.Description}
                            onChange={handleInputChange}
                            rows="3"
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            placeholder="Enter a description for this area (optional)"
                            disabled={isSubmitting}
                        />
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
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSubmitting && (
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                                    <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            )}
                            {isSubmitting ? 'Adding...' : 'Add Area'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}