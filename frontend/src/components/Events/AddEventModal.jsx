import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useModal } from "../UI/ModalProvider";
import CustomSelect from "../UI/CustomSelect";

export default function AddEventModal({ isOpen, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        EventCode: '',
        EventName: '',
        accreditation_level: 'N/A'
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showAlert } = useModal();

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
            newErrors.EventCode = 'Accreditation code is required';
        }
        if (!formData.EventName.trim()) {
            newErrors.EventName = 'Accreditation name is required';
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
            
            // Add accreditation to database
            const response = await eventsAPI.addEvent({
                EventCode: formData.EventCode,
                EventName: formData.EventName,
                Description: null,
                accreditation_level: formData.accreditation_level || 'N/A'
            });

            if (response.success) {
                console.log('Accreditation added successfully:', response.data);
                
                // Reset form and close modal
                setFormData({
                    EventCode: '',
                    EventName: '',
                    accreditation_level: 'N/A'
                });
                
                // Call onSuccess callback if provided
                if (onSuccess) {
                    onSuccess(response.data);
                }
                
                onClose();
                await showAlert('Accreditation added successfully!');
            } else {
                await showAlert(response.message || 'Failed to add accreditation');
            }
            
        } catch (error) {
            console.error('Error submitting form:', error);
            await showAlert('An error occurred while adding the accreditation. Please try again.');
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
                accreditation_level: 'N/A'
            });
            setErrors({});
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 left-0 lg:left-[var(--sidebar-width)] lg:transition-[left] lg:duration-200 lg:ease-in-out bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[50] p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">Add New Accreditation</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Register a new accreditation cycle</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Accreditation Code */}
                    <div>
                        <label htmlFor="EventCode" className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Accreditation Code *
                        </label>
                        <input
                            type="text"
                            id="EventCode"
                            name="EventCode"
                            value={formData.EventCode}
                            onChange={handleInputChange}
                            className={`w-full px-3 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors ${
                                errors.EventCode ? 'border-red-400' : 'border-slate-200'
                            }`}
                            placeholder="e.g., PAASCU, PACUCOA, CHED RQAT"
                            disabled={isSubmitting}
                        />
                        {errors.EventCode && (
                            <p className="text-red-500 text-[11px] mt-1">{errors.EventCode}</p>
                        )}
                    </div>

                    {/* Accreditation Name */}
                    <div>
                        <label htmlFor="EventName" className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Accreditation Name *
                        </label>
                        <input
                            type="text"
                            id="EventName"
                            name="EventName"
                            value={formData.EventName}
                            onChange={handleInputChange}
                            className={`w-full px-3 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors ${
                                errors.EventName ? 'border-red-400' : 'border-slate-200'
                            }`}
                            placeholder="e.g., Philippine Accrediting Association of Schools, Colleges and Universities"
                            disabled={isSubmitting}
                        />
                        {errors.EventName && (
                            <p className="text-red-500 text-[11px] mt-1">{errors.EventName}</p>
                        )}
                    </div>

                    {/* Accreditation Level */}
                    <div>
                        <label htmlFor="accreditation_level" className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Accreditation Level
                        </label>
                        <CustomSelect
                            size="md"
                            value={formData.accreditation_level || 'N/A'}
                            onChange={(val) => setFormData(prev => ({ ...prev, accreditation_level: val }))}
                            disabled={isSubmitting}
                            options={[
                                { value: 'Level I', label: 'Level I' },
                                { value: 'Level II', label: 'Level II' },
                                { value: 'Level III', label: 'Level III' },
                                { value: 'Level IV', label: 'Level IV' },
                                { value: 'N/A', label: 'N/A' },
                            ]}
                        />
                    </div>

                    {/* Form Actions */}
                    <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {isSubmitting && (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            )}
                            {isSubmitting ? 'Adding...' : 'Add Accreditation'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
