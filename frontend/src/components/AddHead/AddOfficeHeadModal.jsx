import React, { useState } from 'react';
import { officeHeadsAPI } from '../../utils/api';

export default function AddOfficeHeadModal({ isOpen, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        firstName: '',
        middleInitial: '',
        lastName: '',
        position: '',
        contactInfo: '',
        profilePic: null
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

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setFormData(prev => ({
            ...prev,
            profilePic: file
        }));
    };

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.firstName.trim()) {
            newErrors.firstName = 'First name is required';
        }
        if (!formData.lastName.trim()) {
            newErrors.lastName = 'Last name is required';
        }
        if (!formData.position.trim()) {
            newErrors.position = 'Position is required';
        }
        if (!formData.contactInfo.trim()) {
            newErrors.contactInfo = 'Contact info is required';
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
            // Create FormData for file upload
            const submitData = new FormData();
            submitData.append('firstName', formData.firstName);
            submitData.append('middleInitial', formData.middleInitial);
            submitData.append('lastName', formData.lastName);
            submitData.append('position', formData.position);
            submitData.append('contactInfo', formData.contactInfo);
            
            if (formData.profilePic) {
                submitData.append('profilePic', formData.profilePic);
            }

            // Call API to submit data
            const response = await officeHeadsAPI.addHead(submitData);
            
            console.log('Office head added successfully:', response);
            
            // Reset form and close modal
            setFormData({
                firstName: '',
                middleInitial: '',
                lastName: '',
                position: '',
                contactInfo: '',
                profilePic: null
            });
            
            // Call onSuccess callback if provided
            if (onSuccess) {
                onSuccess(response.data);
            }
            
            onClose();
            
        } catch (error) {
            console.error('Error submitting form:', error);
            console.error('Error response:', error.response);
            console.error('Error message:', error.message);
            
            // Handle API errors
            if (error.response?.data?.message) {
                alert(`Error: ${error.response.data.message}`);
            } else if (error.message) {
                alert(`Network Error: ${error.message}`);
            } else {
                alert('An error occurred while adding the office head. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 min-h-[70vh] max-h-[95vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-semibold text-gray-800">Add Office Head</h2>
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
                    {/* Grid Layout - 2x3 */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        {/* First Name */}
                        <div>
                            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                                First Name *
                            </label>
                            <input
                                type="text"
                                id="firstName"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleInputChange}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    errors.firstName ? 'border-red-500' : 'border-gray-300'
                                }`}
                                placeholder="Enter first name"
                                disabled={isSubmitting}
                            />
                            {errors.firstName && (
                                <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
                            )}
                        </div>

                        {/* Middle Initial */}
                        <div>
                            <label htmlFor="middleInitial" className="block text-sm font-medium text-gray-700 mb-1">
                                Middle Initial
                            </label>
                            <input
                                type="text"
                                id="middleInitial"
                                name="middleInitial"
                                value={formData.middleInitial}
                                onChange={handleInputChange}
                                maxLength="1"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter Middle Initial"
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* Last Name */}
                        <div>
                            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                                Last Name *
                            </label>
                            <input
                                type="text"
                                id="lastName"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleInputChange}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    errors.lastName ? 'border-red-500' : 'border-gray-300'
                                }`}
                                placeholder="Enter last name"
                                disabled={isSubmitting}
                            />
                            {errors.lastName && (
                                <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
                            )}
                        </div>

                        {/* Position */}
                        <div>
                            <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
                                Position *
                            </label>
                            <input
                                type="text"
                                id="position"
                                name="position"
                                value={formData.position}
                                onChange={handleInputChange}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    errors.position ? 'border-red-500' : 'border-gray-300'
                                }`}
                                placeholder="Enter position/title"
                                disabled={isSubmitting}
                            />
                            {errors.position && (
                                <p className="text-red-500 text-sm mt-1">{errors.position}</p>
                            )}
                        </div>

                        {/* Contact Info */}
                        <div>
                            <label htmlFor="contactInfo" className="block text-sm font-medium text-gray-700 mb-1">
                                Contact Info *
                            </label>
                            <input
                                type="text"
                                id="contactInfo"
                                name="contactInfo"
                                value={formData.contactInfo}
                                onChange={handleInputChange}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    errors.contactInfo ? 'border-red-500' : 'border-gray-300'
                                }`}
                                placeholder="Phone number or email"
                                disabled={isSubmitting}
                            />
                            {errors.contactInfo && (
                                <p className="text-red-500 text-sm mt-1">{errors.contactInfo}</p>
                            )}
                        </div>

                        {/* Profile Picture */}
                        <div>
                            <label htmlFor="profilePic" className="block text-sm font-medium text-gray-700 mb-1">
                                Profile Picture
                            </label>
                            <div className="flex items-start gap-3">
                                {/* Image Preview Circle */}
                                <div className="flex-shrink-0 -mt-0.5">
                                    {formData.profilePic ? (
                                        <img
                                            src={URL.createObjectURL(formData.profilePic)}
                                            alt="Preview"
                                            className="w-12 h-12 rounded-full object-cover border-2 border-gray-300"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-gray-100 border-2 border-gray-300 flex items-center justify-center">
                                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                
                                {/* File Input */}
                                <div className="flex-1">
                                    <input
                                        type="file"
                                        id="profilePic"
                                        name="profilePic"
                                        onChange={handleFileChange}
                                        accept="image/*"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                        disabled={isSubmitting}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Upload an image file (JPG, PNG, etc.)</p>
                                </div>
                            </div>
                        </div>
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
                            {isSubmitting ? 'Adding...' : 'Add Office Head'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}