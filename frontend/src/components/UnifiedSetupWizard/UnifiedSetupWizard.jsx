import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, X, Check, Plus, Wand2 } from 'lucide-react';
import { API_BASE_URL } from '../../utils/apiBase';
import { useToast } from '../UI/Toast';

export default function UnifiedSetupWizard({ isOpen, onClose, onSuccess }) {
    const { toast } = useToast();
    const [currentStep, setCurrentStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [eventMode, setEventMode] = useState(null);
    const [availableEvents, setAvailableEvents] = useState([]);
    const [areaMode, setAreaMode] = useState(null);
    const [availableAreas, setAvailableAreas] = useState([]);
    const [criteriaMode, setCriteriaMode] = useState(null);
    const [availableCriteria, setAvailableCriteria] = useState([]);
    const [requirementMode, setRequirementMode] = useState(null);
    const [availableRequirements, setAvailableRequirements] = useState([]);
    
    const [eventData, setEventData] = useState({
        EventCode: '',
        EventName: '',
        Description: ''
    });
    
    const [areaData, setAreaData] = useState({
        AreaCode: '',
        AreaName: '',
        Description: ''
    });
    
    const [criteriaData, setCriteriaData] = useState({
        AreaID: '',
        CriteriaCode: '',
        CriteriaName: '',
        Description: '',
        ParentCriteriaID: ''
    });
    
    const [requirementData, setRequirementData] = useState({
        RequirementCode: '',
        Description: '',
        ParentRequirementCode: ''
    });
    
    const [criteriaList, setCriteriaList] = useState([]);
    const [parentCriteria, setParentCriteria] = useState([]);
    const [areasList, setAreasList] = useState([]);
    
    const [errors, setErrors] = useState({});
    
    const [createdIds, setCreatedIds] = useState({
        eventId: null,
        areaId: null,
        criteriaId: null,
        requirementId: null
    });

    useEffect(() => {
        if (isOpen) {
            resetForm();
            fetchEvents();
        }
    }, [isOpen]);

    const resetForm = () => {
        setCurrentStep(0);
        setEventMode(null);
        setAreaMode(null);
        setCriteriaMode(null);
        setRequirementMode(null);
        setEventData({ EventCode: '', EventName: '', Description: '' });
        setAreaData({ AreaCode: '', AreaName: '', Description: '' });
        setCriteriaData({ AreaID: '', CriteriaCode: '', CriteriaName: '', Description: '', ParentCriteriaID: '' });
        setRequirementData({ RequirementCode: '', Description: '', ParentRequirementCode: '' });
        setErrors({});
        setSuccessMessage('');
        setCreatedIds({ eventId: null, areaId: null, criteriaId: null, requirementId: null });
        setCriteriaList([]);
        setParentCriteria([]);
        setAvailableCriteria([]);
        setAreasList([]);
        setAvailableAreas([]);
        setAvailableRequirements([]);
    };

    const fetchEvents = async () => {
        try {
            const { eventsAPI } = await import('../../utils/api');
            const response = await eventsAPI.getAllEvents();
            if (response.success && Array.isArray(response.data)) {
                setAvailableEvents(response.data);
            }
        } catch (error) {
            console.error('Error fetching events:', error);
        }
    };

    const fetchAvailableAreas = async (eventId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/areas/event/${eventId}`);
            const data = await response.json();
            if (data.success) setAvailableAreas(data.data || []);
        } catch (error) {
            console.error('Error fetching areas:', error);
        }
    };

    const fetchAreasByEvent = async (eventId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/areas/event/${eventId}`);
            const data = await response.json();
            if (data.success) setAreasList(data.data || []);
        } catch (error) {
            console.error('Error fetching areas:', error);
        }
    };

    const fetchCriteriaForEvent = async (eventId) => {
        try {
            const { criteriaAPI } = await import('../../utils/api');
            const response = await criteriaAPI.getByEvent(eventId);
            if (response.success) setParentCriteria(response.data || []);
        } catch (error) {
            console.error('Error fetching criteria:', error);
        }
    };

    const fetchAvailableCriteria = async (eventId) => {
        try {
            const { criteriaAPI } = await import('../../utils/api');
            const response = await criteriaAPI.getByEvent(eventId);
            if (response.success) setAvailableCriteria(response.data || []);
        } catch (error) {
            console.error('Error fetching criteria:', error);
        }
    };

    const fetchAvailableRequirements = async (eventId) => {
        try {
            const { requirementsAPI } = await import('../../utils/api');
            const response = await requirementsAPI.getRequirementsByEvent(eventId);
            if (response.success) setAvailableRequirements(response.data || []);
        } catch (error) {
            console.error('Error fetching requirements:', error);
        }
    };

    useEffect(() => {
        if (currentStep === 2 && createdIds.eventId) {
            setAreaMode(null);
            fetchAvailableAreas(createdIds.eventId);
        }
    }, [currentStep, createdIds.eventId]);

    useEffect(() => {
        if (currentStep === 3 && createdIds.eventId) {
            setCriteriaMode(null);
            fetchAvailableCriteria(createdIds.eventId);
            fetchAreasByEvent(createdIds.eventId);
            fetchCriteriaForEvent(createdIds.eventId);
        }
    }, [currentStep]);

    useEffect(() => {
        if (currentStep === 4 && createdIds.eventId) {
            setRequirementMode(null);
            fetchAvailableRequirements(createdIds.eventId);
        }
    }, [currentStep, createdIds.eventId]);

    const handleEventChange = (e) => {
        const { name, value } = e.target;
        setEventData(prev => ({ ...prev, [name]: value }));
        if (errors.eventData?.[name]) {
            setErrors(prev => ({
                ...prev,
                eventData: { ...prev.eventData, [name]: '' }
            }));
        }
    };

    const handleAreaChange = (e) => {
        const { name, value } = e.target;
        setAreaData(prev => ({ ...prev, [name]: value }));
        if (errors.areaData?.[name]) {
            setErrors(prev => ({
                ...prev,
                areaData: { ...prev.areaData, [name]: '' }
            }));
        }
    };

    const handleCriteriaChange = (e) => {
        const { name, value } = e.target;
        setCriteriaData(prev => ({ ...prev, [name]: value }));
        if (errors.criteriaData?.[name]) {
            setErrors(prev => ({
                ...prev,
                criteriaData: { ...prev.criteriaData, [name]: '' }
            }));
        }
    };

    const handleRequirementChange = (e) => {
        const { name, value } = e.target;
        setRequirementData(prev => ({ ...prev, [name]: value }));
        if (errors.requirementData?.[name]) {
            setErrors(prev => ({
                ...prev,
                requirementData: { ...prev.requirementData, [name]: '' }
            }));
        }
    };

    const validateEvent = () => {
        const newErrors = {};
        if (!eventData.EventCode.trim()) newErrors.EventCode = 'Required';
        if (!eventData.EventName.trim()) newErrors.EventName = 'Required';
        setErrors({ eventData: newErrors });
        return Object.keys(newErrors).length === 0;
    };

    const validateArea = () => {
        const newErrors = {};
        if (!areaData.AreaCode.trim()) newErrors.AreaCode = 'Required';
        if (!areaData.AreaName.trim()) newErrors.AreaName = 'Required';
        setErrors({ areaData: newErrors });
        return Object.keys(newErrors).length === 0;
    };

    const validateCriteria = () => {
        const newErrors = {};
        if (!criteriaData.CriteriaCode.trim()) newErrors.CriteriaCode = 'Required';
        if (!criteriaData.CriteriaName.trim()) newErrors.CriteriaName = 'Required';
        setErrors({ criteriaData: newErrors });
        return Object.keys(newErrors).length === 0;
    };

    const validateRequirement = () => {
        const newErrors = {};
        if (!requirementData.RequirementCode.trim()) newErrors.RequirementCode = 'Required';
        setErrors({ requirementData: newErrors });
        return Object.keys(newErrors).length === 0;
    };

    const handleAddEvent = async () => {
        if (!validateEvent()) return;
        
        setIsSubmitting(true);
        try {
            const { eventsAPI } = await import('../../utils/api');
            const response = await eventsAPI.addEvent({
                EventCode: eventData.EventCode,
                EventName: eventData.EventName,
                Description: eventData.Description || null
            });

            if (response.success) {
                setCreatedIds(prev => ({ ...prev, eventId: response.data.id || response.data.EventID }));
                toast({ title: 'Success', description: 'Event created successfully', variant: 'success' });
                setSuccessMessage(`✓ Event created`);
                setTimeout(() => {
                    setSuccessMessage('');
                    setCurrentStep(2);
                }, 1000);
            } else {
                toast({ title: 'Error', description: response.message || 'Failed to add event', variant: 'error' });
            }
        } catch (error) {
            console.error('Error:', error);
            toast({ title: 'Error', description: 'An error occurred', variant: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddArea = async () => {
        if (!validateArea()) return;

        setIsSubmitting(true);
        try {
            const { areasAPI } = await import('../../utils/api');
            const response = await areasAPI.addArea({
                EventChildID: createdIds.eventId,
                AreaCode: areaData.AreaCode,
                AreaName: areaData.AreaName,
                Description: areaData.Description || null
            });

            if (response.success) {
                const areaId = response.data.id || response.data.AreaID;
                setCreatedIds(prev => ({ ...prev, areaId }));
                setCriteriaData(prev => ({ ...prev, AreaID: areaId }));
                toast({ title: 'Success', description: 'Area created successfully', variant: 'success' });
                setSuccessMessage(`✓ Area created`);
                setTimeout(() => {
                    setSuccessMessage('');
                    setCurrentStep(3);
                }, 1000);
            } else {
                toast({ title: 'Error', description: response.message || 'Failed to add area', variant: 'error' });
            }
        } catch (error) {
            console.error('Error:', error);
            toast({ title: 'Error', description: 'An error occurred', variant: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddCriteria = async () => {
        if (!validateCriteria()) return;

        setIsSubmitting(true);
        try {
            const { criteriaAPI } = await import('../../utils/api');
            const response = await criteriaAPI.addCriteria({
                EventID: createdIds.eventId,
                AreaID: criteriaData.AreaID || null,
                CriteriaCode: criteriaData.CriteriaCode,
                CriteriaName: criteriaData.CriteriaName,
                Description: criteriaData.Description || null,
                ParentCriteriaID: criteriaData.ParentCriteriaID || null
            });

            if (response.success) {
                setCreatedIds(prev => ({ ...prev, criteriaId: response.data.id || response.data.CriteriaID }));
                toast({ title: 'Success', description: 'Criteria created successfully', variant: 'success' });
                setSuccessMessage(`✓ Criteria created`);
                setTimeout(() => {
                    setSuccessMessage('');
                    setCurrentStep(4);
                }, 1000);
            } else {
                toast({ title: 'Error', description: response.message || 'Failed to add criteria', variant: 'error' });
            }
        } catch (error) {
            console.error('Error:', error);
            toast({ title: 'Error', description: 'An error occurred', variant: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddRequirement = async () => {
        if (!validateRequirement()) return;

        if (!createdIds.criteriaId && !criteriaData.CriteriaID) {
            toast({ title: 'Warning', description: 'Please select a criteria first', variant: 'warning' });
            return;
        }

        if (!requirementData.Description?.trim()) {
            toast({ title: 'Warning', description: 'Please provide a description', variant: 'warning' });
            return;
        }

        setIsSubmitting(true);
        try {
            const { requirementsAPI } = await import('../../utils/api');
            const response = await requirementsAPI.addRequirement({
                EventID: createdIds.eventId,
                RequirementCode: requirementData.RequirementCode,
                Description: requirementData.Description,
                CriteriaID: createdIds.criteriaId || criteriaData.CriteriaID,
                ParentRequirementCode: requirementData.ParentRequirementCode || null
            });

            if (response.success) {
                setCreatedIds(prev => ({ ...prev, requirementId: response.data.id || response.data.RequirementID }));
                toast({ title: 'Success', description: 'Requirement created successfully', variant: 'success' });
                setSuccessMessage(`✓ Requirement created`);
                setTimeout(() => {
                    setSuccessMessage('');
                    setCurrentStep(5);
                }, 1000);
            } else {
                toast({ title: 'Error', description: response.message || 'Failed to add requirement', variant: 'error' });
            }
        } catch (error) {
            console.error('Error:', error);
            toast({ title: 'Error', description: 'An error occurred', variant: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleNext = () => {
        if (currentStep === 0) {
            if (eventMode === 'create') {
                handleAddEvent();
            } else if (eventMode === 'select') {
                if (!createdIds.eventId) {
                    toast({ title: 'Warning', description: 'Please select an event', variant: 'warning' });
                    return;
                }
                setCurrentStep(2);
            }
        } else if (currentStep === 2) {
            if (areaMode === 'create') {
                handleAddArea();
            } else if (areaMode === 'select') {
                if (!createdIds.areaId) {
                    toast({ title: 'Warning', description: 'Please select an area', variant: 'warning' });
                    return;
                }
                setCurrentStep(3);
            } else if (areaMode === 'skip') {
                setCurrentStep(3);
            }
        } else if (currentStep === 3) {
            if (criteriaMode === 'create') {
                handleAddCriteria();
            } else if (criteriaMode === 'select') {
                if (!criteriaData.CriteriaCode) {
                    toast({ title: 'Warning', description: 'Please select a criteria', variant: 'warning' });
                    return;
                }
                setCreatedIds(prev => ({ ...prev, criteriaId: criteriaData.CriteriaID }));
                setCurrentStep(4);
            }
        } else if (currentStep === 4) {
            if (requirementMode === 'create' || requirementMode === 'select') {
                handleAddRequirement();
            }
        }
    };

    const handlePrevious = () => {
        if (currentStep === 2) {
            setCurrentStep(0);
            setEventMode(null);
        } else if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
        setSuccessMessage('');
    };

    const handleFinish = () => {
        if (onSuccess) {
            onSuccess(createdIds);
        }
        onClose();
    };

    if (!isOpen) return null;

    // Step configurations
    const steps = [
        { number: 1, label: 'Event', icon: '📋' },
        { number: 2, label: 'Area', icon: '📍' },
        { number: 3, label: 'Criteria', icon: '📊' },
        { number: 4, label: 'Requirement', icon: '✅' },
        { number: 5, label: 'Complete', icon: '🎉' }
    ];

    return (
        <div className="fixed inset-y-0 right-0 left-0 lg:left-[var(--sidebar-width)] lg:transition-[left] lg:duration-200 lg:ease-in-out bg-black/50 flex items-center justify-center z-[50] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-blue-100 flex items-center justify-between" style={{ background: 'linear-gradient(90deg, #eff6ff 0%, #f8fafc 100%)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Wand2 size={18} className="text-blue-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900">Setup Wizard</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb' }}
                        disabled={isSubmitting}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Progress Steps */}
                <div className="px-6 py-4 border-b border-blue-100" style={{ background: 'linear-gradient(90deg, #f0f5ff 0%, #f8fafc 100%)' }}>
                    <div className="flex items-center justify-between">
                        {(() => {
                            // Map currentStep to visual step (0,1 → 1, else same)
                            const visualStep = currentStep <= 1 ? 1 : currentStep;
                            
                            return steps.map((step, idx) => (
                                <React.Fragment key={step.number}>
                                    <div className="flex flex-col items-center gap-1.5">
                                        <div className={`
                                            w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all
                                            ${step.number < visualStep 
                                                ? 'bg-blue-100 text-blue-600 border-2 border-blue-200' 
                                                : step.number === visualStep
                                                ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                                                : 'bg-gray-100 text-gray-400'
                                            }
                                        `}>
                                            {step.number < visualStep ? <Check size={16} /> : step.icon}
                                        </div>
                                        <span className={`
                                            text-xs font-medium
                                            ${step.number === visualStep ? 'text-blue-600' : 'text-gray-500'}
                                        `}>
                                            {step.label}
                                        </span>
                                    </div>
                                    {idx < steps.length - 1 && (
                                        <div className={`
                                            flex-1 h-0.5 mx-2 rounded-full
                                            ${step.number < visualStep ? 'bg-blue-200' : 'bg-gray-200'}
                                        `} />
                                    )}
                                </React.Fragment>
                            ));
                        })()}
                    </div>
                </div>

                {/* Content with Preview Sidebar */}
                <div className="flex-1 overflow-hidden flex">
                    {/* Main Content */}
                    <div className={`flex-1 overflow-y-auto p-6 ${currentStep > 0 && currentStep < 5 ? 'pr-3' : ''}`}>
                    {/* Success Toast */}
                    {successMessage && (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm flex items-center gap-2">
                            <Check size={16} className="text-blue-600" />
                            {successMessage}
                        </div>
                    )}

                    {/* Step 0: Event Selection */}
                    {currentStep === 0 && (
                        <div className="space-y-5">
                            <div>
                                <h3 className="text-base font-semibold text-gray-900">Choose Event</h3>
                                <p className="text-sm text-gray-500 mt-1">Select how you'd like to proceed</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setEventMode('create')}
                                    className={`
                                        p-4 border rounded-xl text-left transition-all
                                        ${eventMode === 'create'
                                            ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
                                            : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50/30'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${eventMode === 'create' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                            <Plus size={18} className={eventMode === 'create' ? 'text-blue-600' : 'text-gray-500'} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-900">Create New</h4>
                                            <p className="text-xs text-gray-500 mt-0.5">Start fresh with a new event</p>
                                        </div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setEventMode('select')}
                                    className={`
                                        p-4 border rounded-xl text-left transition-all
                                        ${eventMode === 'select'
                                            ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
                                            : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50/30'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${eventMode === 'select' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                            <Wand2 size={18} className={eventMode === 'select' ? 'text-blue-600' : 'text-gray-500'} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-900">Select Existing</h4>
                                            <p className="text-xs text-gray-500 mt-0.5">Use an existing event</p>
                                        </div>
                                    </div>
                                </button>
                            </div>

                            {eventMode === 'select' && (
                                <div className="space-y-3">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Select Event
                                    </label>
                                    {availableEvents.length > 0 ? (
                                        <select
                                            value={eventData.EventId || ''}
                                            onChange={(e) => {
                                                const selected = availableEvents.find(ev => ev.EventID === parseInt(e.target.value));
                                                if (selected) {
                                                    setEventData({
                                                        ...eventData,
                                                        EventId: selected.EventID,
                                                        EventName: selected.EventName,
                                                        EventCode: selected.EventCode,
                                                        Description: selected.Description || ''
                                                    });
                                                    setCreatedIds(prev => ({ ...prev, eventId: selected.EventID }));
                                                }
                                            }}
                                            className="w-full px-3 py-2 text-sm border border-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                        >
                                            <option value="">-- Select an event --</option>
                                            {availableEvents.map((event) => (
                                                <option key={event.EventID} value={event.EventID}>
                                                    {event.EventCode} - {event.EventName}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                                            No events available. Create a new one.
                                        </p>
                                    )}
                                </div>
                            )}

                            {eventMode === 'create' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                                Event Code <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="EventCode"
                                                value={eventData.EventCode}
                                                onChange={handleEventChange}
                                                placeholder="AUD-2024-001"
                                                className={`
                                                    w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2
                                                    ${errors.eventData?.EventCode
                                                        ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
                                                        : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-500'
                                                    }
                                                `}
                                            />
                                            {errors.eventData?.EventCode && (
                                                <p className="text-xs text-rose-500 mt-1">{errors.eventData.EventCode}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                                Event Name <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="EventName"
                                                value={eventData.EventName}
                                                onChange={handleEventChange}
                                                placeholder="Annual Compliance Audit"
                                                className={`
                                                    w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2
                                                    ${errors.eventData?.EventName
                                                        ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
                                                        : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-500'
                                                    }
                                                `}
                                            />
                                            {errors.eventData?.EventName && (
                                                <p className="text-xs text-rose-500 mt-1">{errors.eventData.EventName}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                            Description <span className="text-gray-400">(optional)</span>
                                        </label>
                                        <textarea
                                            name="Description"
                                            value={eventData.Description}
                                            onChange={handleEventChange}
                                            placeholder="Add event details..."
                                            rows={2}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2: Area Selection */}
                    {currentStep === 2 && (
                        <div className="space-y-5">
                            <div>
                                <h3 className="text-base font-semibold text-gray-900">Choose Area</h3>
                                <p className="text-sm text-gray-500 mt-1">Add an area or skip this step</p>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { mode: 'create', icon: Plus, label: 'Create New', desc: 'Add new area' },
                                    { mode: 'select', icon: Wand2, label: 'Select', desc: 'Use existing' },
                                    { mode: 'skip', icon: X, label: 'Skip', desc: 'No area' }
                                ].map(({ mode, icon: Icon, label, desc }) => (
                                    <button
                                        key={mode}
                                        onClick={() => {
                                            setAreaMode(mode);
                                            if (mode === 'skip') {
                                                setAreaData({ AreaCode: '', AreaName: '', Description: '' });
                                                setCreatedIds(prev => ({ ...prev, areaId: null }));
                                                setCriteriaData(prev => ({ ...prev, AreaID: '' }));
                                            }
                                        }}
                                        className={`
                                            p-3 border rounded-xl text-left transition-all
                                            ${areaMode === mode
                                                ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
                                                : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50/30'
                                            }
                                        `}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${areaMode === mode ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                                <Icon size={16} className={areaMode === mode ? 'text-blue-600' : 'text-gray-500'} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-medium text-gray-900">{label}</h4>
                                                <p className="text-xs text-gray-500">{desc}</p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {areaMode === 'select' && (
                                <div className="space-y-3">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Select Area
                                    </label>
                                    {availableAreas.length > 0 ? (
                                        <select
                                            value={areaData.AreaCode || ''}
                                            onChange={(e) => {
                                                const selected = availableAreas.find(ar => ar.AreaCode === e.target.value);
                                                if (selected) {
                                                    setAreaData({
                                                        ...areaData,
                                                        AreaCode: selected.AreaCode,
                                                        AreaName: selected.AreaName,
                                                        Description: selected.Description || ''
                                                    });
                                                    setCreatedIds(prev => ({ ...prev, areaId: selected.AreaID }));
                                                    setCriteriaData(prev => ({ ...prev, AreaID: selected.AreaID }));
                                                }
                                            }}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        >
                                            <option value="">-- Select an area --</option>
                                            {availableAreas.map((area) => (
                                                <option key={area.AreaID} value={area.AreaCode}>
                                                    {area.AreaName} ({area.AreaCode})
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                                            No areas available. Create a new one.
                                        </p>
                                    )}
                                </div>
                            )}

                            {areaMode === 'create' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                                Area Code <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="AreaCode"
                                                value={areaData.AreaCode}
                                                onChange={handleAreaChange}
                                                placeholder="AREA-001"
                                                className={`
                                                    w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2
                                                    ${errors.areaData?.AreaCode
                                                        ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
                                                        : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-500'
                                                    }
                                                `}
                                            />
                                            {errors.areaData?.AreaCode && (
                                                <p className="text-xs text-rose-500 mt-1">{errors.areaData.AreaCode}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                                Area Name <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="AreaName"
                                                value={areaData.AreaName}
                                                onChange={handleAreaChange}
                                                placeholder="Financial Controls"
                                                className={`
                                                    w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2
                                                    ${errors.areaData?.AreaName
                                                        ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
                                                        : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-500'
                                                    }
                                                `}
                                            />
                                            {errors.areaData?.AreaName && (
                                                <p className="text-xs text-rose-500 mt-1">{errors.areaData.AreaName}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                            Description <span className="text-gray-400">(optional)</span>
                                        </label>
                                        <textarea
                                            name="Description"
                                            value={areaData.Description}
                                            onChange={handleAreaChange}
                                            placeholder="Add area details..."
                                            rows={2}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: Criteria Selection */}
                    {currentStep === 3 && (
                        <div className="space-y-5">
                            <div>
                                <h3 className="text-base font-semibold text-gray-900">Choose Criteria</h3>
                                <p className="text-sm text-gray-500 mt-1">Add evaluation criteria</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { mode: 'create', icon: Plus, label: 'Create New', desc: 'Add new criteria' },
                                    { mode: 'select', icon: Wand2, label: 'Select', desc: 'Use existing' }
                                ].map(({ mode, icon: Icon, label, desc }) => (
                                    <button
                                        key={mode}
                                        onClick={() => setCriteriaMode(mode)}
                                        className={`
                                            p-3 border rounded-xl text-left transition-all
                                            ${criteriaMode === mode
                                                ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
                                                : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50/30'
                                            }
                                        `}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${criteriaMode === mode ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                                <Icon size={16} className={criteriaMode === mode ? 'text-blue-600' : 'text-gray-500'} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-medium text-gray-900">{label}</h4>
                                                <p className="text-xs text-gray-500">{desc}</p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {criteriaData.AreaID && (
                                <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                                    <p className="text-xs text-gray-600">
                                        <span className="font-medium">Selected Area:</span> {areasList.find(a => a.AreaID == criteriaData.AreaID)?.AreaName || 'Area'}
                                    </p>
                                </div>
                            )}

                            {criteriaMode === 'select' && (
                                <div className="space-y-3">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Select Criteria
                                    </label>
                                    {criteriaData.AreaID ? (
                                        availableCriteria.filter(c => String(c.AreaID) === String(criteriaData.AreaID)).length > 0 ? (
                                            <select
                                                value={criteriaData.CriteriaCode || ''}
                                                onChange={(e) => {
                                                    const selected = availableCriteria.find(c => c.CriteriaCode === e.target.value);
                                                    if (selected) {
                                                        setCriteriaData({
                                                            ...criteriaData,
                                                            CriteriaID: selected.CriteriaID,
                                                            CriteriaCode: selected.CriteriaCode,
                                                            CriteriaName: selected.CriteriaName,
                                                            Description: selected.Description || '',
                                                            ParentCriteriaID: selected.ParentCriteriaID || ''
                                                        });
                                                    }
                                                }}
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                            >
                                                <option value="">-- Select a criteria --</option>
                                                {availableCriteria
                                                    .filter(c => String(c.AreaID) === String(criteriaData.AreaID))
                                                    .map((crit) => (
                                                        <option key={crit.CriteriaID} value={crit.CriteriaCode}>
                                                            {crit.CriteriaCode} - {crit.CriteriaName}
                                                        </option>
                                                    ))}
                                            </select>
                                        ) : (
                                            <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                                                No criteria available for this area.
                                            </p>
                                        )
                                    ) : (
                                        <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                                            Select an area first
                                        </p>
                                    )}
                                </div>
                            )}

                            {criteriaMode === 'create' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                                Criteria Code <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="CriteriaCode"
                                                value={criteriaData.CriteriaCode}
                                                onChange={handleCriteriaChange}
                                                placeholder="CRIT-001"
                                                className={`
                                                    w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2
                                                    ${errors.criteriaData?.CriteriaCode
                                                        ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
                                                        : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-500'
                                                    }
                                                `}
                                            />
                                            {errors.criteriaData?.CriteriaCode && (
                                                <p className="text-xs text-rose-500 mt-1">{errors.criteriaData.CriteriaCode}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                                Criteria Name <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="CriteriaName"
                                                value={criteriaData.CriteriaName}
                                                onChange={handleCriteriaChange}
                                                placeholder="Payment Controls"
                                                className={`
                                                    w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2
                                                    ${errors.criteriaData?.CriteriaName
                                                        ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
                                                        : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-500'
                                                    }
                                                `}
                                            />
                                            {errors.criteriaData?.CriteriaName && (
                                                <p className="text-xs text-rose-500 mt-1">{errors.criteriaData.CriteriaName}</p>
                                            )}
                                        </div>
                                    </div>

                                    {criteriaData.AreaID && parentCriteria.length > 0 && (
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                                Parent Criteria <span className="text-gray-400">(optional)</span>
                                            </label>
                                            <select
                                                name="ParentCriteriaID"
                                                value={criteriaData.ParentCriteriaID}
                                                onChange={handleCriteriaChange}
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                            >
                                                <option value="">None (Top-level)</option>
                                                {parentCriteria
                                                    .filter(c => String(c.AreaID) === String(criteriaData.AreaID))
                                                    .map(c => (
                                                        <option key={c.CriteriaID} value={c.CriteriaID}>
                                                            {c.CriteriaCode} - {c.CriteriaName}
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                            Description <span className="text-gray-400">(optional)</span>
                                        </label>
                                        <textarea
                                            name="Description"
                                            value={criteriaData.Description}
                                            onChange={handleCriteriaChange}
                                            placeholder="Add criteria details..."
                                            rows={2}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 4: Requirement */}
                    {currentStep === 4 && (
                        <div className="space-y-5">
                            <div>
                                <h3 className="text-base font-semibold text-gray-900">Choose Requirement</h3>
                                <p className="text-sm text-gray-500 mt-1">Add a new requirement</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { mode: 'create', icon: Plus, label: 'Standalone', desc: 'New requirement' },
                                    { mode: 'select', icon: Wand2, label: 'Child', desc: 'Link to parent' }
                                ].map(({ mode, icon: Icon, label, desc }) => (
                                    <button
                                        key={mode}
                                        onClick={() => setRequirementMode(mode)}
                                        className={`
                                            p-3 border rounded-xl text-left transition-all
                                            ${requirementMode === mode
                                                ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
                                                : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50/30'
                                            }
                                        `}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${requirementMode === mode ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                                <Icon size={16} className={requirementMode === mode ? 'text-blue-600' : 'text-gray-500'} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-medium text-gray-900">{label}</h4>
                                                <p className="text-xs text-gray-500">{desc}</p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Form only shows after selecting mode */}
                            {requirementMode && (
                                <div className="space-y-4">
                                    {requirementMode === 'select' && (
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                                Parent Requirement
                                            </label>
                                            {(() => {
                                                const criteriaRequirements = availableRequirements.filter(
                                                    req => req.CriteriaID === criteriaData.CriteriaID
                                                );
                                                
                                                return criteriaRequirements.length > 0 ? (
                                                    <select
                                                        value={requirementData.ParentRequirementCode || ''}
                                                        onChange={(e) => setRequirementData(prev => ({ ...prev, ParentRequirementCode: e.target.value }))}
                                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                    >
                                                        <option value="">-- Select a parent --</option>
                                                        {criteriaRequirements.map((req) => (
                                                            <option key={req.RequirementID} value={req.RequirementCode}>
                                                                {req.RequirementCode}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                                                        No requirements available
                                                    </p>
                                                );
                                            })()}
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                            Requirement Code <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="RequirementCode"
                                            value={requirementData.RequirementCode}
                                            onChange={handleRequirementChange}
                                            placeholder="REQ-001"
                                            className={`
                                                w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2
                                                ${errors.requirementData?.RequirementCode
                                                    ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
                                                    : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-500'
                                                }
                                            `}
                                        />
                                        {errors.requirementData?.RequirementCode && (
                                            <p className="text-xs text-rose-500 mt-1">{errors.requirementData.RequirementCode}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                            Description <span className="text-rose-500">*</span>
                                        </label>
                                        <textarea
                                            name="Description"
                                            value={requirementData.Description}
                                            onChange={handleRequirementChange}
                                            placeholder="Describe the requirement..."
                                            rows={2}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 5: Completion */}
                    {currentStep === 5 && (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-2xl flex items-center justify-center">
                                <Check size={32} className="text-emerald-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Setup Complete!</h3>
                            <p className="text-sm text-gray-500 mb-4">
                                You've successfully created:
                            </p>
                            <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 text-sm border border-gray-100">
                                <p className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    <strong>Event:</strong> {eventData.EventName}
                                </p>
                                {areaData.AreaName && (
                                    <p className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                        <strong>Area:</strong> {areaData.AreaName}
                                    </p>
                                )}
                                {criteriaData.CriteriaName && (
                                    <p className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                        <strong>Criteria:</strong> {criteriaData.CriteriaName}
                                    </p>
                                )}
                                <p className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                    <strong>Requirement:</strong> {requirementData.RequirementCode}
                                </p>
                            </div>
                        </div>
                    )}
                    </div>

                    {/* Preview Sidebar - Visible on steps 1-4 */}
                    {currentStep > 0 && currentStep < 5 && (
                        <div className="w-72 border-l border-blue-100 flex flex-col overflow-hidden" style={{ background: 'linear-gradient(180deg, #f0f5ff 0%, #f8fafc 100%)' }}>
                            {/* Preview Header */}
                            <div className="p-4 border-b border-blue-100 bg-white">
                                <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    Structure Preview
                                </h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    {(eventData.EventName ? 1 : 0) + (areaData.AreaName ? 1 : 0) + (criteriaData.CriteriaName ? 1 : 0) + (requirementData.RequirementCode ? 1 : 0)}/4 items configured
                                </p>
                            </div>

                            {/* Hierarchical Preview Content */}
                            <div className="flex-1 overflow-y-auto p-4">
                                {!eventData.EventName ? (
                                    <div className="text-center py-8">
                                        <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <p className="text-sm text-gray-500">Select an event to start</p>
                                        <p className="text-xs text-gray-400 mt-1">Preview will appear here</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {/* Event Header */}
                                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-2.5 rounded-lg shadow-md">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm">📋</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] font-medium text-blue-100 uppercase">Event</p>
                                                    <p className="text-sm font-semibold truncate">{eventData.EventName}</p>
                                                </div>
                                                <Check size={14} className="text-blue-200 flex-shrink-0" />
                                            </div>
                                            {eventData.EventCode && (
                                                <p className="text-[10px] text-blue-200 mt-1 pl-6">{eventData.EventCode}</p>
                                            )}
                                        </div>

                                        {/* Area - Nested under Event */}
                                        <div className="ml-3 space-y-3">
                                            {areaData.AreaName ? (
                                                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-2.5 rounded-lg shadow-md">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm">📍</span>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[10px] font-medium text-blue-100 uppercase">Area</p>
                                                            <p className="text-sm font-semibold truncate">{areaData.AreaName}</p>
                                                        </div>
                                                        <Check size={14} className="text-blue-200 flex-shrink-0" />
                                                    </div>
                                                    {areaData.AreaCode && (
                                                        <p className="text-[10px] text-blue-200 mt-1 pl-6">{areaData.AreaCode}</p>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 bg-white">
                                                    <div className="flex items-center gap-2 text-gray-400">
                                                        <span className="text-sm">📍</span>
                                                        <div className="flex-1">
                                                            <p className="text-[10px] font-medium uppercase">Area</p>
                                                            <p className="text-xs">Not selected</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Criteria - Nested under Area */}
                                            <div className="ml-3 space-y-3">
                                                {criteriaData.CriteriaName ? (
                                                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-2.5 rounded-lg shadow-md">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm">📊</span>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[10px] font-medium text-blue-100 uppercase">Criteria</p>
                                                                <p className="text-sm font-semibold truncate">{criteriaData.CriteriaName}</p>
                                                            </div>
                                                            <Check size={14} className="text-blue-200 flex-shrink-0" />
                                                        </div>
                                                        {criteriaData.CriteriaCode && (
                                                            <p className="text-[10px] text-blue-200 mt-1 pl-6">{criteriaData.CriteriaCode}</p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 bg-white">
                                                        <div className="flex items-center gap-2 text-gray-400">
                                                            <span className="text-sm">📊</span>
                                                            <div className="flex-1">
                                                                <p className="text-[10px] font-medium uppercase">Criteria</p>
                                                                <p className="text-xs">Not selected</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Requirement - Nested under Criteria */}
                                                <div className="ml-3">
                                                    {requirementData.RequirementCode ? (
                                                        <div className="border-l-4 border-emerald-500 bg-emerald-50 px-3 py-2.5 rounded-r-lg shadow-sm">
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                                                                    <Check size={12} className="text-emerald-600" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-[10px] font-medium text-emerald-600 uppercase">Requirement</p>
                                                                    <p className="text-sm font-semibold text-gray-800 truncate">{requirementData.RequirementCode}</p>
                                                                </div>
                                                            </div>
                                                            {requirementData.Description && (
                                                                <p className="text-xs text-gray-600 mt-1.5 pl-7 line-clamp-2">{requirementData.Description}</p>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 bg-white">
                                                            <div className="flex items-center gap-2 text-gray-400">
                                                                <span className="text-sm">✅</span>
                                                                <div className="flex-1">
                                                                    <p className="text-[10px] font-medium uppercase">Requirement</p>
                                                                    <p className="text-xs">Not created</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Progress Footer */}
                            <div className="p-4 border-t border-blue-100 bg-white">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs text-slate-500">Progress</p>
                                    <p className="text-xs font-medium text-blue-600">
                                        {(eventData.EventName ? 1 : 0) + (areaData.AreaName ? 1 : 0) + (criteriaData.CriteriaName ? 1 : 0) + (requirementData.RequirementCode ? 1 : 0)}/4
                                    </p>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ 
                                            width: `${((eventData.EventName ? 1 : 0) + (areaData.AreaName ? 1 : 0) + (criteriaData.CriteriaName ? 1 : 0) + (requirementData.RequirementCode ? 1 : 0)) * 25}%` 
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-blue-100 flex items-center justify-between" style={{ background: '#f8fafc' }}>
                    <button
                        onClick={handlePrevious}
                        disabled={currentStep === 0 || isSubmitting}
                        className="px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-blue-100 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                        <ChevronLeft size={16} />
                        Back
                    </button>

                    {currentStep < 5 ? (
                        <button
                            onClick={handleNext}
                            disabled={isSubmitting || !eventMode}
                            className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                            style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', boxShadow: '0 2px 8px rgba(37,99,235,0.30)' }}
                        >
                            {isSubmitting ? 'Processing...' : 'Continue'}
                            <ChevronRight size={16} />
                        </button>
                    ) : (
                        <button
                            onClick={handleFinish}
                            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 flex items-center gap-1.5"
                        >
                            <Check size={16} />
                            Finish
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

