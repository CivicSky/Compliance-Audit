import React, { useState } from 'react';

export default function AddEventModal({ isOpen, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        EventCode: '',
        EventName: '',
        Description: ''
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

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
        
        if (!formData.EventCode.trim()) {
            newErrors.EventCode = 'Event code is required';
        }
        if (!formData.EventName.trim()) {
            newErrors.EventName = 'Event name is required';
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
            // Import eventsAPI
            const { eventsAPI } = await import('../../utils/api');
            
            // Add event to database
            const response = await eventsAPI.addEvent({
                EventCode: formData.EventCode,
                EventName: formData.EventName,
                Description: formData.Description || null
            });

            if (response.success) {
                console.log('Event added successfully:', response.data);
                
                // Reset form and close modal
                setFormData({
                    EventCode: '',
                    EventName: '',
                    Description: ''
                });
                
                // Call onSuccess callback if provided
                if (onSuccess) {
                    onSuccess(response.data);
                }
                
                onClose();
                alert('Event added successfully!');
            } else {
                alert(response.message || 'Failed to add event');
            }
            
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('An error occurred while adding the event. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            // Reset form when closing
            setFormData({
                EventCode: '',
                EventName: '',
                Description: ''
            });
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
                    <h2 className="text-xl font-semibold text-gray-800">Add New Event</h2>
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
                    {/* Event Code */}
                    <div className="mb-6">
                        <label htmlFor="EventCode" className="block text-sm font-medium text-gray-700 mb-2">
                            Event Code *
                        </label>
                        <input
                            type="text"
                            id="EventCode"
                            name="EventCode"
                            value={formData.EventCode}
                            onChange={handleInputChange}
                            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                errors.EventCode ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="e.g., PPSG, PPJSD, SDE"
                            disabled={isSubmitting}
                        />
                        {errors.EventCode && (
                            <p className="text-red-500 text-sm mt-1">{errors.EventCode}</p>
                        )}
                    </div>

                    {/* Event Name */}
                    <div className="mb-6">
                        <label htmlFor="EventName" className="block text-sm font-medium text-gray-700 mb-2">
                            Event Name *
                        </label>
                        <input
                            type="text"
                            id="EventName"
                            name="EventName"
                            value={formData.EventName}
                            onChange={handleInputChange}
                            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                errors.EventName ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="e.g., PPSG Event, Financial Reporting"
                            disabled={isSubmitting}
                        />
                        {errors.EventName && (
                            <p className="text-red-500 text-sm mt-1">{errors.EventName}</p>
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
                            rows="4"
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            placeholder="Enter a detailed description of this event (optional)"
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
                            {isSubmitting ? 'Adding...' : 'Add Event'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}