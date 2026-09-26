import { API_BASE_URL } from '../../utils/apiBase';

import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useModal } from "../UI/ModalProvider";
import CustomSelect from "../UI/CustomSelect";
import StructureLivePreview from '../ALLC/AddAreaPop/StructureLivePreview';

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
    const { showAlert } = useModal();

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
            const response = await fetch(`${API_BASE_URL}/api/areas/event/${eventId}`);
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
            const { criteriaAPI } = await import('../../utils/api');
            const response = await criteriaAPI.getByEvent(eventId);
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
        // if AreaID is cleared, also clear ParentCriteriaID to prevent selecting a parent without an area
        if (name === 'AreaID' && value === '') {
            setFormData(prev => ({
                ...prev,
                AreaID: value,
                ParentCriteriaID: ''
            }));
        } else if (name === 'CriteriaCode') {
            // remove any leading dots and normalize to uppercase
            const sanitized = (value || '').replace(/^\.+/, '').toUpperCase();
            setFormData(prev => ({ ...prev, CriteriaCode: sanitized }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
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
        // If creating a child (ParentCriteriaID set), CriteriaCode is not required and will be null
        if (!formData.ParentCriteriaID && !formData.CriteriaCode.trim()) newErrors.CriteriaCode = 'Sub area code is required';
        if (!formData.CriteriaName.trim()) newErrors.CriteriaName = 'Sub area name is required';
        if (!formData.Description.trim()) newErrors.Description = 'Description is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        setIsSubmitting(true);
        try {
            const payload = {
                ...formData,
                CriteriaCode: formData.ParentCriteriaID ? null : (formData.CriteriaCode ? String(formData.CriteriaCode).replace(/^\.+/, '') : formData.CriteriaCode)
            };
            const response = await fetch(`${API_BASE_URL}/api/criteria/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (data.success) {
                setFormData({ EventID: '', AreaID: '', CriteriaCode: '', CriteriaName: '', Description: '', ParentCriteriaID: '' });
                if (onSuccess) onSuccess(data.data);
                onClose();
                await showAlert('Sub area added successfully!');
            } else {
                await showAlert(data.message || 'Failed to add sub area');
            }
        } catch (error) {
            await showAlert('An error occurred while adding the sub area. Please try again.');
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
        <div className="fixed inset-y-0 right-0 left-0 lg:left-[var(--sidebar-width)] lg:transition-[left] lg:duration-200 lg:ease-in-out bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[50] p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white z-10 shrink-0">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">Add New Sub Area</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Define a new evaluation sub area for your assessment</p>
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
                <div className="flex flex-1 overflow-y-auto min-h-0">
                    {/* Left Side - Form */}
                    <div className="w-1/2 p-6 border-r border-slate-200 overflow-y-auto">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Event Selection */}
                            <div>
                                <label htmlFor="EventID" className="block text-xs font-semibold text-slate-700 mb-1.5">Event *</label>
                                <CustomSelect
                                    size="md"
                                    value={formData.EventID}
                                    onChange={(val) => handleInputChange({ target: { name: 'EventID', value: val } })}
                                    disabled={isSubmitting}
                                    placeholder="Select an event"
                                    options={[
                                        { value: "", label: "Select an event" },
                                        ...eventsList.map((event) => ({
                                            value: String(event.EventID),
                                            label: `${event.EventCode} - ${event.EventName}`,
                                        })),
                                    ]}
                                />
                                {errors.EventID && <p className="text-red-500 text-[11px] mt-1">{errors.EventID}</p>}
                            </div>
                            {/* Area Dropdown */}
                            <div>
                                <label htmlFor="AreaID" className="block text-xs font-semibold text-slate-700 mb-1.5">Area *</label>
                                <CustomSelect
                                    size="md"
                                    value={formData.AreaID}
                                    onChange={(val) => handleInputChange({ target: { name: 'AreaID', value: val } })}
                                    disabled={isSubmitting || isLoading || !formData.EventID}
                                    placeholder={!formData.EventID ? 'Select an event first' : 'Select an area'}
                                    options={[
                                        { value: "", label: !formData.EventID ? 'Select an event first' : 'Select an area' },
                                        ...areasList.map((area) => ({
                                            value: String(area.AreaID),
                                            label: `${area.AreaCode} - ${area.AreaName}`,
                                        })),
                                    ]}
                                />
                                {errors.AreaID && <p className="text-red-500 text-[11px] mt-1">{errors.AreaID}</p>}
                            </div>
                            {/* Parent Criteria Dropdown */}
                            <div>
                                <label htmlFor="ParentCriteriaID" className="block text-xs font-semibold text-slate-700 mb-1.5">Parent Sub Area (Optional)</label>
                                <CustomSelect
                                    size="md"
                                    value={formData.ParentCriteriaID}
                                    onChange={(val) => handleInputChange({ target: { name: 'ParentCriteriaID', value: val } })}
                                    disabled={isSubmitting || !formData.EventID || criteriaList.length === 0 || !formData.AreaID}
                                    placeholder={!formData.AreaID ? 'Select an area first to choose a parent sub area' : 'None (Top-level sub area)'}
                                    options={[
                                        { value: "", label: "None (Top-level sub area)" },
                                        ...criteriaList
                                            .filter(criteria =>
                                                criteria.CriteriaCode !== formData.CriteriaCode &&
                                                (!formData.AreaID || String(criteria.AreaID) === String(formData.AreaID))
                                            )
                                            .map(criteria => ({
                                                value: String(criteria.CriteriaID),
                                                label: `${criteria.CriteriaCode} - ${criteria.CriteriaName}`,
                                            })),
                                    ]}
                                />
                                {formData.EventID && (
                                    <p className="text-emerald-600 text-[11px] mt-1">
                                        {criteriaList.length} existing sub areas in this accreditation
                                    </p>
                                )}
                            </div>
                            {/* Criteria Code */}
                            <div>
                                <label htmlFor="CriteriaCode" className="block text-xs font-semibold text-slate-700 mb-1.5">Sub Area Code *</label>
                                <input
                                    type="text"
                                    id="CriteriaCode"
                                    name="CriteriaCode"
                                    value={formData.CriteriaCode}
                                    onChange={handleInputChange}
                                    className={`w-full px-3 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors ${errors.CriteriaCode ? 'border-red-400' : 'border-slate-200'}`}
                                    placeholder={formData.ParentCriteriaID ? 'No code required for child sub area' : 'e.g., A.1, B.2.1'}
                                    disabled={isSubmitting || !!formData.ParentCriteriaID}
                                />
                                {errors.CriteriaCode && <p className="text-red-500 text-[11px] mt-1">{errors.CriteriaCode}</p>}
                            </div>
                            {/* Criteria Name */}
                            <div>
                                <label htmlFor="CriteriaName" className="block text-xs font-semibold text-slate-700 mb-1.5">Sub Area Name *</label>
                                <input
                                    type="text"
                                    id="CriteriaName"
                                    name="CriteriaName"
                                    value={formData.CriteriaName}
                                    onChange={handleInputChange}
                                    className={`w-full px-3 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors ${errors.CriteriaName ? 'border-red-400' : 'border-slate-200'}`}
                                    placeholder="Enter sub area name"
                                    disabled={isSubmitting}
                                />
                                {errors.CriteriaName && <p className="text-red-500 text-[11px] mt-1">{errors.CriteriaName}</p>}
                            </div>
                            {/* Description */}
                            <div>
                                <label htmlFor="Description" className="block text-xs font-semibold text-slate-700 mb-1.5">Description *</label>
                                <textarea
                                    id="Description"
                                    name="Description"
                                    value={formData.Description}
                                    onChange={handleInputChange}
                                    rows="3"
                                    className={`w-full px-3 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-colors ${errors.Description ? 'border-red-400' : 'border-slate-200'}`}
                                    placeholder="Enter a detailed description of this sub area"
                                    disabled={isSubmitting}
                                />
                                {errors.Description && <p className="text-red-500 text-[11px] mt-1">{errors.Description}</p>}
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
                                    disabled={isSubmitting || !formData.EventID}
                                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {isSubmitting && (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    )}
                                    {isSubmitting ? 'Adding...' : 'Add Sub Area'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Right Side - Preview */}
                    <div className="w-1/2 p-6 bg-slate-50 flex flex-col justify-start">
                        <StructureLivePreview
                            mode="add-criteria"
                            areaData={areasList.find(a => String(a.AreaID) === String(formData.AreaID)) || null}
                            criteriaData={{
                                CriteriaCode: formData.CriteriaCode,
                                CriteriaName: formData.CriteriaName,
                                Description: formData.Description
                            }}
                            event={eventsList.find(e => String(e.EventID) === String(formData.EventID)) || null}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
