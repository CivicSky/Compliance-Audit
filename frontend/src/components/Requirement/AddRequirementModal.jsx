import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useModal } from "../UI/ModalProvider";
import StructureLivePreview from '../ALLC/AddAreaPop/StructureLivePreview';
import CustomSelect from '../UI/CustomSelect';

export default function AddRequirementModal({ isOpen, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        EventID: '',
        RequirementCode: '',
        Description: '',
        CriteriaID: '',
        ParentRequirementCode: '',
        ChildCriteriaID: ''
    });

    const [eventsList, setEventsList] = useState([]);
    const [criteriaList, setCriteriaList] = useState([]);
    const [requirementsList, setRequirementsList] = useState([]);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { showAlert } = useModal();

    // Fetch events when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchEvents();
        }
    }, [isOpen]);

    // Fetch criteria when event is selected
    useEffect(() => {
        if (formData.EventID) {
            fetchCriteriaByEvent(formData.EventID);
        } else {
            setCriteriaList([]);
        }
    }, [formData.EventID]);

    // Fetch requirements for selected criteria
    useEffect(() => {
        if (formData.CriteriaID) {
            fetchRequirementsByCriteria(formData.CriteriaID);
        } else {
            setRequirementsList([]);
        }
        // clear selected child when criteria changes
        setFormData(prev => ({ ...prev, ChildCriteriaID: '' }));
    }, [formData.CriteriaID]);

    // When child selection changes, load requirements for that child (to populate parent options)
    useEffect(() => {
        if (formData.ChildCriteriaID) {
            fetchRequirementsByCriteria(formData.ChildCriteriaID);
        } else if (formData.CriteriaID) {
            fetchRequirementsByCriteria(formData.CriteriaID);
        } else {
            setRequirementsList([]);
        }
        // also auto-generate requirement code based on parent criteria code
        generateRequirementCode();
    }, [formData.ChildCriteriaID]);

    // Also regenerate when criteria list or criteria selection changes
    useEffect(() => {
        generateRequirementCode();
    }, [criteriaList, formData.CriteriaID]);

    // Regenerate when parent selection, child selection, or available requirements change
    useEffect(() => {
        generateRequirementCode();
    }, [formData.ParentRequirementCode, formData.ChildCriteriaID, requirementsList]);

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

    const fetchCriteriaByEvent = async (eventId) => {
        setIsLoading(true);
        try {
            const { criteriaAPI } = await import('../../utils/api');
            console.log('Fetching criteria for event:', eventId);
            const response = await criteriaAPI.getByEvent(eventId);
            console.log('Criteria response:', response);
            
            if (response.success) {
                console.log('Criteria data:', response.data);
                setCriteriaList(response.data);
            } else {
                console.error('Failed to fetch criteria:', response.message);
            }
        } catch (error) {
            console.error('Error fetching criteria:', error);
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

    // compute child criteria for selected criteria
    const childCriteriaOptions = (criteriaList || []).filter(c => String(c.ParentCriteriaID || '') === String(formData.CriteriaID));

    // top-level criteria (exclude children) for the main Criteria dropdown
    const topLevelCriteria = (criteriaList || []).filter(c => c.ParentCriteriaID === null || c.ParentCriteriaID === undefined || String(c.ParentCriteriaID) === '');

    const getBaseCriteriaCode = (criteriaId) => {
        if (!criteriaId) return '';
        const list = criteriaList || [];
        const crit = list.find(c => String(c.CriteriaID) === String(criteriaId) || Number(c.CriteriaID) === Number(criteriaId));
        if (!crit) return '';
        const code = crit.CriteriaCode ?? crit.criteria_code ?? '';
        if (code) return code;
        const parentId = crit.ParentCriteriaID ?? crit.parent_criteria_id ?? null;
        if (parentId) {
            const parent = list.find(c => String(c.CriteriaID) === String(parentId) || Number(c.CriteriaID) === Number(parentId));
            return parent?.CriteriaCode ?? parent?.criteria_code ?? '';
        }
        return '';
    };

    const generateRequirementCode = () => {
        // Base code should always come from the parent criteria (children are grouping only)
        const baseCriteriaId = formData.CriteriaID;
        const baseCode = getBaseCriteriaCode(baseCriteriaId);
        if (!baseCode) {
            setFormData(prev => ({ ...prev, RequirementCode: '' }));
            return;
        }

        // Determine list of existing requirements to compute next index
        const targetCriteriaId = formData.ChildCriteriaID || formData.CriteriaID;
        const list = (requirementsList || []).filter(r => String(r.CriteriaID) === String(targetCriteriaId));
        const escapedBase = baseCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const nums = list.map(o => {
            const rc = String(o.RequirementCode || '');
            const m = rc.match(new RegExp(`^${escapedBase}\\.(\\d+)$`));
            return m ? Number(m[1]) : null;
        }).filter(n => n !== null);
        const next = nums.length ? Math.max(...nums) + 1 : 1;
        setFormData(prev => ({ ...prev, RequirementCode: `${baseCode}.${next}` }));
    };

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.EventID) {
            newErrors.EventID = 'Event is required';
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
            const targetCriteriaId = formData.ChildCriteriaID ? formData.ChildCriteriaID : formData.CriteriaID;
            const response = await requirementsAPI.addRequirement({
                RequirementCode: formData.RequirementCode,
                Description: formData.Description,
                CriteriaID: targetCriteriaId,
                ParentRequirementCode: formData.ParentRequirementCode || null
            });

            if (response.success) {
                console.log('Requirement added successfully:', response.data);
                
                // Reset form and close modal
                setFormData({
                    RequirementCode: '',
                    Description: '',
                    CriteriaID: '',
                    ParentRequirementCode: ''
                });
                
                // Call onSuccess callback if provided
                if (onSuccess) {
                    onSuccess(response.data);
                }
                
                onClose();
                await showAlert('Evidence added successfully!');
            } else {
                await showAlert(response.message || 'Failed to add evidence');
            }
            
        } catch (error) {
            console.error('Error submitting form:', error);
            await showAlert('An error occurred while adding the evidence. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            // Reset form when closing
            setFormData({
                EventID: '',
                RequirementCode: '',
                Description: '',
                CriteriaID: '',
                ParentRequirementCode: ''
            });
            setErrors({});
            setCriteriaList([]);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 left-0 lg:left-[var(--sidebar-width)] lg:transition-[left] lg:duration-200 lg:ease-in-out bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[50] p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white z-10 shrink-0">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">Add New Evidence</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Attach an evidence specification to a selected criteria</p>
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
                        <label htmlFor="EventID" className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Accreditation *
                        </label>
                        <CustomSelect
                            id="EventID"
                            size="md"
                            value={formData.EventID}
                            onChange={(val) => handleInputChange({ target: { name: 'EventID', value: val } })}
                            options={eventsList.map((event) => ({
                                 value: String(event.EventID),
                                 label: `${event.EventCode} - ${event.EventName}`
                            }))}
                            placeholder="Select an accreditation"
                            disabled={isSubmitting}
                            buttonClassName={errors.EventID ? '!border-red-400' : ''}
                        />
                        {errors.EventID && (
                            <p className="text-red-500 text-[11px] mt-1">{errors.EventID}</p>
                        )}
                        <p className="text-[11px] text-slate-400 mt-1">Select the accreditation to filter criteria</p>
                    </div>

                    {/* Criteria Dropdown */}
                    <div>
                        <label htmlFor="CriteriaID" className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Criteria *
                        </label>
                        <CustomSelect
                            id="CriteriaID"
                            size="md"
                            value={formData.CriteriaID}
                            onChange={(val) => handleInputChange({ target: { name: 'CriteriaID', value: val } })}
                            options={topLevelCriteria.map((criteria) => ({
                                value: String(criteria.CriteriaID),
                                label: `${criteria.CriteriaCode} - ${criteria.CriteriaName}`
                            }))}
                            placeholder={!formData.EventID ? 'Select an accreditation first' : 'Select a criteria'}
                            disabled={isSubmitting || isLoading || !formData.EventID}
                            buttonClassName={errors.CriteriaID ? '!border-red-400' : ''}
                        />
                        {errors.CriteriaID && (
                            <p className="text-red-500 text-[11px] mt-1">{errors.CriteriaID}</p>
                        )}
                        {isLoading && (
                            <p className="text-slate-400 text-[11px] mt-1">Loading criteria...</p>
                        )}
                        {!isLoading && formData.EventID && topLevelCriteria.length === 0 && (
                            <p className="text-amber-600 text-[11px] mt-1">No top-level criteria found for this accreditation.</p>
                        )}
                        {!isLoading && topLevelCriteria.length > 0 && (
                            <p className="text-emerald-600 text-[11px] mt-1">Loaded {topLevelCriteria.length} top-level criteria for this accreditation</p>
                        )}
                    </div>

                    {/* Parent Requirement Code */}
                    <div>
                        <label htmlFor="ParentRequirementCode" className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Parent Evidence Code (Optional)
                        </label>
                        <CustomSelect
                            id="ParentRequirementCode"
                            size="md"
                            value={formData.ParentRequirementCode}
                            onChange={(val) => handleInputChange({ target: { name: 'ParentRequirementCode', value: val } })}
                            options={[
                                { value: '', label: !formData.CriteriaID ? 'Select a criteria first' : 'None (Top-level evidence)' },
                                ...requirementsList.map((req) => ({
                                    value: req.RequirementCode,
                                    label: `${req.RequirementCode} - ${req.Description?.substring(0, 50) || ''}${req.Description?.length > 50 ? '...' : ''}`
                                }))
                            ]}
                            placeholder={!formData.CriteriaID ? 'Select a criteria first' : 'None (Top-level evidence)'}
                            disabled={isSubmitting || !formData.CriteriaID}
                        />
                        {!formData.CriteriaID ? (
                            <p className="text-slate-400 text-[11px] mt-1">
                                Select a criteria to see available parent evidence
                            </p>
                        ) : requirementsList.length === 0 ? (
                            <p className="text-amber-600 text-[11px] mt-1">
                                No existing evidence in this criteria. This will be top-level evidence.
                            </p>
                        ) : (
                            <p className="text-emerald-600 text-[11px] mt-1">
                                Loaded {requirementsList.length} evidence item{requirementsList.length !== 1 ? 's' : ''} for this criteria
                            </p>
                        )}
                    </div>

                    {/* Child Criteria Dropdown (optional) */}
                    {childCriteriaOptions.length > 0 && (
                        <div>
                            <label htmlFor="ChildCriteriaID" className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Place under Child Criteria (Optional)
                            </label>
                            <CustomSelect
                                id="ChildCriteriaID"
                                size="md"
                                value={formData.ChildCriteriaID}
                                onChange={(val) => handleInputChange({ target: { name: 'ChildCriteriaID', value: val } })}
                                options={[
                                    { value: '', label: 'No child selected (use selected criteria)' },
                                    ...childCriteriaOptions.map(cc => ({
                                        value: String(cc.CriteriaID),
                                        label: cc.CriteriaCode ? `${cc.CriteriaCode} - ${cc.CriteriaName}` : cc.CriteriaName
                                    }))
                                ]}
                                placeholder="No child selected (use selected criteria)"
                                disabled={isSubmitting || !formData.CriteriaID}
                            />
                            <p className="text-[11px] text-slate-400 mt-1">Choose a child criteria to save this evidence under that child.</p>
                        </div>
                    )}

                    {/* Requirement Code */}
                    <div>
                        <label htmlFor="RequirementCode" className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Evidence Code *
                        </label>
                        <input
                            type="text"
                            id="RequirementCode"
                            name="RequirementCode"
                            value={formData.RequirementCode}
                            onChange={handleInputChange}
                            className={`w-full px-3 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors ${
                                errors.RequirementCode ? 'border-red-400' : 'border-slate-200'
                            }`}
                            placeholder="e.g., A.1, B.2.1"
                            disabled={isSubmitting}
                        />
                        {errors.RequirementCode && (
                            <p className="text-red-500 text-[11px] mt-1">{errors.RequirementCode}</p>
                        )}
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="Description" className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Description *
                        </label>
                        <textarea
                            id="Description"
                            name="Description"
                            value={formData.Description}
                            onChange={handleInputChange}
                            rows="4"
                            className={`w-full px-3 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-colors ${
                                errors.Description ? 'border-red-400' : 'border-slate-200'
                            }`}
                            placeholder="Enter a detailed description of this evidence"
                            disabled={isSubmitting}
                        />
                        {errors.Description && (
                            <p className="text-red-500 text-[11px] mt-1">{errors.Description}</p>
                        )}
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
                            disabled={isSubmitting || !formData.EventID || !formData.CriteriaID}
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {isSubmitting && (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            )}
                            {isSubmitting ? 'Adding...' : 'Add Evidence'}
                        </button>
                    </div>
                        </form>
                    </div>

                    {/* Right Side - Preview */}
                    <div className="w-1/2 p-6 bg-slate-50 flex flex-col justify-start">
                        {(() => {
                            const selectedCrit = criteriaList.find(c => String(c.CriteriaID) === String(formData.ChildCriteriaID || formData.CriteriaID));
                            const selectedArea = selectedCrit ? {
                                AreaID: selectedCrit.AreaID,
                                AreaName: selectedCrit.AreaName || selectedCrit.area_name,
                                AreaCode: selectedCrit.AreaCode || selectedCrit.area_code
                            } : null;

                            return (
                                <StructureLivePreview
                                    mode="add-requirement"
                                    areaData={selectedArea}
                                    criteriaData={selectedCrit || null}
                                    requirementData={{
                                        RequirementCode: formData.RequirementCode,
                                        Description: formData.Description
                                    }}
                                    event={eventsList.find(e => String(e.EventID) === String(formData.EventID)) || null}
                                />
                            );
                        })()}
                    </div>
                </div>
            </div>
        </div>
    );
}
