import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, X, Check, Plus, Wand2 } from 'lucide-react';

export default function UnifiedSetupWizard({ isOpen, onClose, onSuccess }) {
    const [currentStep, setCurrentStep] = useState(0); // 0 = event selection, 1-5 = wizard steps
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [eventMode, setEventMode] = useState(null); // 'create' or 'select'
    const [availableEvents, setAvailableEvents] = useState([]);
    const [areaMode, setAreaMode] = useState(null); // 'create' or 'select'
    const [availableAreas, setAvailableAreas] = useState([]);
    const [criteriaMode, setCriteriaMode] = useState(null); // 'create' or 'select'
    const [availableCriteria, setAvailableCriteria] = useState([]);
    const [requirementMode, setRequirementMode] = useState(null); // 'create', 'select', or null
    const [availableRequirements, setAvailableRequirements] = useState([]);
    
    // Event data
    const [eventData, setEventData] = useState({
        EventCode: '',
        EventName: '',
        Description: ''
    });
    
    // Area data
    const [areaData, setAreaData] = useState({
        AreaCode: '',
        AreaName: '',
        Description: ''
    });
    
    // Criteria data
    const [criteriaData, setCriteriaData] = useState({
        AreaID: '',
        CriteriaCode: '',
        CriteriaName: '',
        Description: '',
        ParentCriteriaID: ''
    });
    
    // Requirement data
    const [requirementData, setRequirementData] = useState({
        RequirementCode: '',
        Description: '',
        ParentRequirementCode: ''
    });
    
    // Supporting data
    const [criteriaList, setCriteriaList] = useState([]);
    const [parentCriteria, setParentCriteria] = useState([]);
    const [areasList, setAreasList] = useState([]);
    const [parentRequirements, setParentRequirements] = useState([]);
    
    // Errors
    const [errors, setErrors] = useState({});
    
    // Created IDs for reference
    const [createdIds, setCreatedIds] = useState({
        eventId: null,
        areaId: null,
        criteriaId: null,
        requirementId: null
    });

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
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
            setParentRequirements([]);
            setAvailableEvents([]);
            fetchEvents();
        }
    }, [isOpen]);

    // Fetch events when modal opens
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

    // Fetch areas for the selected event (for display in Step 2 selection)
    const fetchAvailableAreas = async (eventId) => {
        try {
            const response = await fetch(`http://localhost:5000/api/areas/event/${eventId}`);
            const data = await response.json();
            if (data.success) {
                setAvailableAreas(data.data || []);
            } else {
                setAvailableAreas([]);
            }
        } catch (error) {
            console.error('Error fetching areas:', error);
            setAvailableAreas([]);
        }
    };

    // Fetch areas for the selected event (for criteria step)
    const fetchAreasByEvent = async (eventId) => {
        try {
            const response = await fetch(`http://localhost:5000/api/areas/event/${eventId}`);
            const data = await response.json();
            if (data.success) {
                setAreasList(data.data || []);
            } else {
                setAreasList([]);
            }
        } catch (error) {
            console.error('Error fetching areas:', error);
            setAreasList([]);
        }
    };

    // Fetch criteria for the selected event
    const fetchCriteriaForEvent = async (eventId) => {
        try {
            const { requirementsAPI } = await import('../../utils/api');
            const response = await requirementsAPI.getCriteriaByEvent(eventId);
            if (response.success) {
                setParentCriteria(response.data || []);
            } else {
                setParentCriteria([]);
            }
        } catch (error) {
            console.error('Error fetching criteria:', error);
            setParentCriteria([]);
        }
    };

    // Fetch available criteria for the selected event (for Step 3 selection)
    const fetchAvailableCriteria = async (eventId) => {
        try {
            const { requirementsAPI } = await import('../../utils/api');
            const response = await requirementsAPI.getCriteriaByEvent(eventId);
            if (response.success) {
                setAvailableCriteria(response.data || []);
            } else {
                setAvailableCriteria([]);
            }
        } catch (error) {
            console.error('Error fetching criteria:', error);
            setAvailableCriteria([]);
        }
    };

    // Fetch requirements for the selected event (for Step 4 selection)
    const fetchAvailableRequirements = async (eventId) => {
        try {
            const { requirementsAPI } = await import('../../utils/api');
            const response = await requirementsAPI.getRequirementsByEvent(eventId);
            if (response.success) {
                setAvailableRequirements(response.data || []);
            } else {
                setAvailableRequirements([]);
            }
        } catch (error) {
            console.error('Error fetching requirements:', error);
            setAvailableRequirements([]);
        }
    };

    // Fetch available areas when step 2 opens and reset areaMode
    useEffect(() => {
        if (currentStep === 2 && createdIds.eventId) {
            setAreaMode(null);
            fetchAvailableAreas(createdIds.eventId);
        }
    }, [currentStep, createdIds.eventId]);

    // Fetch available criteria when step 3 opens and reset criteriaMode
    useEffect(() => {
        if (currentStep === 3 && createdIds.eventId) {
            setCriteriaMode(null);
            fetchAvailableCriteria(createdIds.eventId);
            fetchAreasByEvent(createdIds.eventId);
            fetchCriteriaForEvent(createdIds.eventId);
        }
    }, [currentStep]);

    // Fetch available requirements when step 4 opens and reset requirementMode
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
        if (!eventData.EventCode.trim()) newErrors.EventCode = 'Event code is required';
        if (!eventData.EventName.trim()) newErrors.EventName = 'Event name is required';
        setErrors({ eventData: newErrors });
        return Object.keys(newErrors).length === 0;
    };

    const validateArea = () => {
        const newErrors = {};
        if (!areaData.AreaCode.trim()) newErrors.AreaCode = 'Area code is required';
        if (!areaData.AreaName.trim()) newErrors.AreaName = 'Area name is required';
        setErrors({ areaData: newErrors });
        return Object.keys(newErrors).length === 0;
    };

    const validateCriteria = () => {
        const newErrors = {};
        if (!criteriaData.CriteriaCode.trim()) newErrors.CriteriaCode = 'Criteria code is required';
        if (!criteriaData.CriteriaName.trim()) newErrors.CriteriaName = 'Criteria name is required';
        setErrors({ criteriaData: newErrors });
        return Object.keys(newErrors).length === 0;
    };

    const validateRequirement = () => {
        const newErrors = {};
        if (!requirementData.RequirementCode.trim()) newErrors.RequirementCode = 'Requirement code is required';
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
                setSuccessMessage(`✓ Event "${eventData.EventName}" created successfully!`);
                setTimeout(() => {
                    setSuccessMessage('');
                    setCurrentStep(2);
                }, 1500);
            } else {
                alert(response.message || 'Failed to add event');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while adding the event');
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
                setCreatedIds(prev => ({ ...prev, areaId: areaId }));
                // Auto-select this area in criteria step
                setCriteriaData(prev => ({ ...prev, AreaID: areaId }));
                setSuccessMessage(`✓ Area "${areaData.AreaName}" created successfully!`);
                setTimeout(() => {
                    setSuccessMessage('');
                    setCurrentStep(3);
                }, 1500);
            } else {
                alert(response.message || 'Failed to add area');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while adding the area');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddCriteria = async () => {
        if (!validateCriteria()) return;

        setIsSubmitting(true);
        try {
            const { requirementsAPI } = await import('../../utils/api');
            const response = await requirementsAPI.addCriteria({
                EventID: createdIds.eventId,
                AreaID: criteriaData.AreaID || null,
                CriteriaCode: criteriaData.CriteriaCode,
                CriteriaName: criteriaData.CriteriaName,
                Description: criteriaData.Description || null,
                ParentCriteriaID: criteriaData.ParentCriteriaID || null
            });

            if (response.success) {
                setCreatedIds(prev => ({ ...prev, criteriaId: response.data.id || response.data.CriteriaID }));
                setSuccessMessage(`✓ Criteria "${criteriaData.CriteriaName}" created successfully!`);
                setTimeout(() => {
                    setSuccessMessage('');
                    setCurrentStep(4);
                }, 1500);
            } else {
                alert(response.message || 'Failed to add criteria');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while adding the criteria');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddRequirement = async () => {
        if (!validateRequirement()) return;

        setIsSubmitting(true);
        try {
            const { requirementsAPI } = await import('../../utils/api');
            const response = await requirementsAPI.addRequirement({
                EventID: createdIds.eventId,
                RequirementCode: requirementData.RequirementCode,
                Description: requirementData.Description || null,
                CriteriaID: createdIds.criteriaId || null,
                ParentRequirementCode: requirementData.ParentRequirementCode || null
            });

            if (response.success) {
                setCreatedIds(prev => ({ ...prev, requirementId: response.data.id || response.data.RequirementID }));
                setSuccessMessage(`✓ Requirement "${requirementData.RequirementCode}" created successfully!`);
                setTimeout(() => {
                    setSuccessMessage('');
                    setCurrentStep(5);
                }, 1500);
            } else {
                alert(response.message || 'Failed to add requirement');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while adding the requirement');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleNext = () => {
        if (currentStep === 0) {
            // Event selection step
            if (eventMode === 'create') {
                handleAddEvent();
            } else if (eventMode === 'select') {
                if (!createdIds.eventId) {
                    alert('Please select an event');
                    return;
                }
                setCurrentStep(2);
            }
        } else if (currentStep === 2) {
            // Area selection step
            if (areaMode === 'create') {
                handleAddArea();
            } else if (areaMode === 'select') {
                if (!createdIds.areaId) {
                    alert('Please select an area');
                    return;
                }
                setCurrentStep(3);
            }
        } else if (currentStep === 3) {
            // Criteria mode selection step
            if (criteriaMode === 'create') {
                handleAddCriteria();
            } else if (criteriaMode === 'select') {
                if (!criteriaData.CriteriaCode) {
                    alert('Please select a criteria');
                    return;
                }
                setCreatedIds(prev => ({ ...prev, criteriaId: criteriaData.CriteriaID }));
                setCurrentStep(4);
            }
        } else if (currentStep === 4) {
            // Requirement mode selection step
            if (requirementMode === 'create') {
                handleAddRequirement();
            } else if (requirementMode === 'select') {
                if (!requirementData.ParentRequirementCode) {
                    alert('Please select a parent requirement');
                    return;
                }
                if (!requirementData.RequirementCode.trim()) {
                    alert('Please enter a requirement code');
                    return;
                }
                handleAddRequirement();
            }
        }
    };

    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
            setSuccessMessage('');
        }
    };

    const handleFinish = () => {
        if (onSuccess) {
            onSuccess({
                eventId: createdIds.eventId,
                areaId: createdIds.areaId,
                criteriaId: createdIds.criteriaId,
                requirementId: createdIds.requirementId
            });
        }
        onClose();
    };

    const handleSkipStep = () => {
        if (currentStep === 0) {
            return; // Can't skip event selection
        } else if (currentStep < 5) {
            setCurrentStep(currentStep + 1);
            setSuccessMessage('');
        } else {
            handleFinish();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between rounded-t-xl">
                    <h2 className="text-2xl font-bold">Complete Setup Wizard</h2>
                    <button
                        onClick={onClose}
                        className="hover:bg-blue-800 rounded-full p-1 transition"
                        disabled={isSubmitting}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="bg-gray-100 px-6 py-4 flex items-center gap-4">
                    {[0, 1, 2, 3, 4, 5].map((step) => (
                        <React.Fragment key={step}>
                            {step === 0 ? null : (
                                <div
                                    className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition ${
                                        step < currentStep
                                            ? 'bg-green-500 text-white'
                                            : step === currentStep
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-300 text-gray-600'
                                    }`}
                                >
                                    {step < currentStep ? <Check size={20} /> : step}
                                </div>
                            )}
                            {step < 5 && step > 0 && (
                                <div
                                    className={`flex-1 h-1 ${
                                        step < currentStep ? 'bg-green-500' : 'bg-gray-300'
                                    }`}
                                />
                            )}
                        </React.Fragment>
                    ))}
                </div>

                {/* Step Labels */}
                <div className="bg-gray-50 px-6 py-3 grid grid-cols-5 gap-2 text-xs text-center font-semibold text-gray-700">
                    <div>Event</div>
                    <div>Area</div>
                    <div>Criteria</div>
                    <div>Requirement</div>
                    <div>Complete</div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Success Message */}
                    {successMessage && (
                        <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded animate-in">
                            {successMessage}
                        </div>
                    )}

                    {/* Step 0: Event Selection */}
                    {currentStep === 0 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2">Step 0: Choose Event</h3>
                                <p className="text-gray-600">Would you like to create a new event or select an existing one?</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Create New Event Option */}
                                <div
                                    onClick={() => setEventMode('create')}
                                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                        eventMode === 'create'
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-300 bg-gray-50 hover:border-blue-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Plus size={24} className={eventMode === 'create' ? 'text-blue-500' : 'text-gray-400'} />
                                        <div>
                                            <h4 className="font-semibold text-gray-800">Create New Event</h4>
                                            <p className="text-sm text-gray-600">Start fresh with a new event</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Select Existing Event Option */}
                                <div
                                    onClick={() => setEventMode('select')}
                                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                        eventMode === 'select'
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-300 bg-gray-50 hover:border-blue-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Wand2 size={24} className={eventMode === 'select' ? 'text-blue-500' : 'text-gray-400'} />
                                        <div>
                                            <h4 className="font-semibold text-gray-800">Select Existing Event</h4>
                                            <p className="text-sm text-gray-600">Add to an existing event</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Event Selection Form */}
                            {eventMode === 'select' && (
                                <div className="space-y-4">
                                    <label className="block text-sm font-semibold text-gray-700">
                                        Select Event *
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
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">-- Select an event --</option>
                                            {availableEvents.map((event) => (
                                                <option key={event.EventID} value={event.EventID}>
                                                    {event.EventName} ({event.EventCode})
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <p className="text-gray-600 text-sm">No events available. Please create a new event first.</p>
                                    )}
                                </div>
                            )}

                            {/* Create New Event Form */}
                            {eventMode === 'create' && (
                                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-600">Enter details for your new event:</p>
                                    
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Event Code *
                                        </label>
                                        <input
                                            type="text"
                                            name="EventCode"
                                            value={eventData.EventCode}
                                            onChange={handleEventChange}
                                            placeholder="e.g., AUD-2024-001"
                                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                                                errors.eventData?.EventCode
                                                    ? 'border-red-500 focus:ring-red-500'
                                                    : 'border-gray-300 focus:ring-blue-500'
                                            }`}
                                        />
                                        {errors.eventData?.EventCode && (
                                            <p className="text-red-500 text-sm mt-1">{errors.eventData.EventCode}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Event Name *
                                        </label>
                                        <input
                                            type="text"
                                            name="EventName"
                                            value={eventData.EventName}
                                            onChange={handleEventChange}
                                            placeholder="e.g., Annual Compliance Audit"
                                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                                                errors.eventData?.EventName
                                                    ? 'border-red-500 focus:ring-red-500'
                                                    : 'border-gray-300 focus:ring-blue-500'
                                            }`}
                                        />
                                        {errors.eventData?.EventName && (
                                            <p className="text-red-500 text-sm mt-1">{errors.eventData.EventName}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Description (Optional)
                                        </label>
                                        <textarea
                                            name="Description"
                                            value={eventData.Description}
                                            onChange={handleEventChange}
                                            placeholder="Add event details..."
                                            rows={3}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 1: Event Creation (only if creating new) */}
                    {currentStep === 1 && eventMode === 'create' && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-gray-800">Step 1: Create Event</h3>
                            <p className="text-gray-600">Start by creating a new event for your audit process.</p>
                            
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Event Code *
                                </label>
                                <input
                                    type="text"
                                    name="EventCode"
                                    value={eventData.EventCode}
                                    onChange={handleEventChange}
                                    placeholder="e.g., AUD-2024-001"
                                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                                        errors.eventData?.EventCode
                                            ? 'border-red-500 focus:ring-red-500'
                                            : 'border-gray-300 focus:ring-blue-500'
                                    }`}
                                />
                                {errors.eventData?.EventCode && (
                                    <p className="text-red-500 text-sm mt-1">{errors.eventData.EventCode}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Event Name *
                                </label>
                                <input
                                    type="text"
                                    name="EventName"
                                    value={eventData.EventName}
                                    onChange={handleEventChange}
                                    placeholder="e.g., Annual Compliance Audit"
                                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                                        errors.eventData?.EventName
                                            ? 'border-red-500 focus:ring-red-500'
                                            : 'border-gray-300 focus:ring-blue-500'
                                    }`}
                                />
                                {errors.eventData?.EventName && (
                                    <p className="text-red-500 text-sm mt-1">{errors.eventData.EventName}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Description (Optional)
                                </label>
                                <textarea
                                    name="Description"
                                    value={eventData.Description}
                                    onChange={handleEventChange}
                                    placeholder="Add event details..."
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Area */}
                    {currentStep === 2 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2">Step 2: Choose Area</h3>
                                <p className="text-gray-600">Would you like to create a new area or select an existing one?</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Create New Area Option */}
                                <div
                                    onClick={() => setAreaMode('create')}
                                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                        areaMode === 'create'
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-300 bg-gray-50 hover:border-blue-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Plus size={24} className={areaMode === 'create' ? 'text-blue-500' : 'text-gray-400'} />
                                        <div>
                                            <h4 className="font-semibold text-gray-800">Create New Area</h4>
                                            <p className="text-sm text-gray-600">Start fresh with a new area</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Select Existing Area Option */}
                                <div
                                    onClick={() => setAreaMode('select')}
                                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                        areaMode === 'select'
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-300 bg-gray-50 hover:border-blue-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Wand2 size={24} className={areaMode === 'select' ? 'text-blue-500' : 'text-gray-400'} />
                                        <div>
                                            <h4 className="font-semibold text-gray-800">Select Existing Area</h4>
                                            <p className="text-sm text-gray-600">Add to an existing area</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Area Selection Form */}
                            {areaMode === 'select' && (
                                <div className="space-y-4">
                                    <label className="block text-sm font-semibold text-gray-700">
                                        Select Area *
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
                                                    // Auto-select this area in criteria step
                                                    setCriteriaData(prev => ({ ...prev, AreaID: selected.AreaID }));
                                                }
                                            }}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">-- Select an area --</option>
                                            {availableAreas.map((area) => (
                                                <option key={area.AreaID} value={area.AreaCode}>
                                                    {area.AreaName} ({area.AreaCode})
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <p className="text-gray-600 text-sm">No areas available. Please create a new area first.</p>
                                    )}
                                </div>
                            )}

                            {/* Create New Area Form */}
                            {areaMode === 'create' && (
                                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-600">Enter details for your new area:</p>
                                    
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Area Code *
                                        </label>
                                        <input
                                            type="text"
                                            name="AreaCode"
                                            value={areaData.AreaCode}
                                            onChange={handleAreaChange}
                                            placeholder="e.g., AREA-001"
                                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                                                errors.areaData?.AreaCode
                                                    ? 'border-red-500 focus:ring-red-500'
                                                    : 'border-gray-300 focus:ring-blue-500'
                                            }`}
                                        />
                                        {errors.areaData?.AreaCode && (
                                            <p className="text-red-500 text-sm mt-1">{errors.areaData.AreaCode}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Area Name *
                                        </label>
                                        <input
                                            type="text"
                                            name="AreaName"
                                            value={areaData.AreaName}
                                            onChange={handleAreaChange}
                                            placeholder="e.g., Financial Controls"
                                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                                                errors.areaData?.AreaName
                                                    ? 'border-red-500 focus:ring-red-500'
                                                    : 'border-gray-300 focus:ring-blue-500'
                                            }`}
                                        />
                                        {errors.areaData?.AreaName && (
                                            <p className="text-red-500 text-sm mt-1">{errors.areaData.AreaName}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Description (Optional)
                                        </label>
                                        <textarea
                                            name="Description"
                                            value={areaData.Description}
                                            onChange={handleAreaChange}
                                            placeholder="Add area details..."
                                            rows={3}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: Criteria */}
                    {currentStep === 3 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2">Step 3: Choose Criteria</h3>
                                <p className="text-gray-600">Would you like to create a new criteria or select an existing one?</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Create New Criteria Option */}
                                <div
                                    onClick={() => setCriteriaMode('create')}
                                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                        criteriaMode === 'create'
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-300 bg-gray-50 hover:border-blue-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Plus size={24} className={criteriaMode === 'create' ? 'text-blue-500' : 'text-gray-400'} />
                                        <div>
                                            <h4 className="font-semibold text-gray-800">Create New</h4>
                                            <p className="text-sm text-gray-600">Add a new criteria</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Select Existing Criteria Option */}
                                <div
                                    onClick={() => setCriteriaMode('select')}
                                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                        criteriaMode === 'select'
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-300 bg-gray-50 hover:border-blue-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Wand2 size={24} className={criteriaMode === 'select' ? 'text-blue-500' : 'text-gray-400'} />
                                        <div>
                                            <h4 className="font-semibold text-gray-800">Select Existing</h4>
                                            <p className="text-sm text-gray-600">Choose from available</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Area Display (Auto-selected from Step 2) */}
                            {criteriaData.AreaID && (
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm text-gray-600">
                                        <span className="font-semibold">Selected Area:</span> {areasList.find(a => a.AreaID == criteriaData.AreaID)?.AreaName || 'Area'} ({areasList.find(a => a.AreaID == criteriaData.AreaID)?.AreaCode || ''})
                                    </p>
                                </div>
                            )}
                            
                            {/* Optional Area Selection for Change */}
                            {!criteriaData.AreaID && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Area (Optional)
                                    </label>
                                    <select
                                        name="AreaID"
                                        value={criteriaData.AreaID}
                                        onChange={handleCriteriaChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">-- Select an area (optional) --</option>
                                        {areasList.map(area => (
                                            <option key={area.AreaID} value={area.AreaID}>
                                                {area.AreaCode} - {area.AreaName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Select Existing Criteria */}
                            {criteriaMode === 'select' && (
                                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-600">Select an existing criteria:</p>
                                    
                                    {availableCriteria.filter(c => !criteriaData.AreaID || String(c.AreaID) === String(criteriaData.AreaID)).length > 0 ? (
                                        <select
                                            value={criteriaData.CriteriaCode || ''}
                                            onChange={(e) => {
                                                const selected = availableCriteria.find(c => c.CriteriaCode === e.target.value);
                                                if (selected) {
                                                    setCriteriaData({
                                                        AreaID: criteriaData.AreaID,
                                                        CriteriaID: selected.CriteriaID,
                                                        CriteriaCode: selected.CriteriaCode,
                                                        CriteriaName: selected.CriteriaName,
                                                        Description: selected.Description || '',
                                                        ParentCriteriaID: selected.ParentCriteriaID || ''
                                                    });
                                                }
                                            }}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">-- Select a criteria --</option>
                                            {availableCriteria
                                                .filter(c => !criteriaData.AreaID || String(c.AreaID) === String(criteriaData.AreaID))
                                                .map((crit) => (
                                                    <option key={crit.CriteriaID} value={crit.CriteriaCode}>
                                                        {crit.CriteriaCode} - {crit.CriteriaName}
                                                    </option>
                                                ))}
                                            </select>
                                    ) : (
                                        <p className="text-gray-600 text-sm">No criteria available for selected area.</p>
                                    )}
                                </div>
                            )}

                            {/* Create New Criteria Form */}
                            {criteriaMode === 'create' && (
                                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-600">Enter details for your new criteria:</p>
                                    
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Criteria Code *
                                        </label>
                                        <input
                                            type="text"
                                            name="CriteriaCode"
                                            value={criteriaData.CriteriaCode}
                                            onChange={handleCriteriaChange}
                                            placeholder="e.g., CRIT-001"
                                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                                                errors.criteriaData?.CriteriaCode
                                                    ? 'border-red-500 focus:ring-red-500'
                                                    : 'border-gray-300 focus:ring-blue-500'
                                            }`}
                                        />
                                        {errors.criteriaData?.CriteriaCode && (
                                            <p className="text-red-500 text-sm mt-1">{errors.criteriaData.CriteriaCode}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Criteria Name *
                                        </label>
                                        <input
                                            type="text"
                                            name="CriteriaName"
                                            value={criteriaData.CriteriaName}
                                            onChange={handleCriteriaChange}
                                            placeholder="e.g., Payment Controls"
                                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                                                errors.criteriaData?.CriteriaName
                                                    ? 'border-red-500 focus:ring-red-500'
                                                    : 'border-gray-300 focus:ring-blue-500'
                                            }`}
                                        />
                                        {errors.criteriaData?.CriteriaName && (
                                            <p className="text-red-500 text-sm mt-1">{errors.criteriaData.CriteriaName}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Parent Criteria (Optional)
                                        </label>
                                        <select
                                            name="ParentCriteriaID"
                                            value={criteriaData.ParentCriteriaID}
                                            onChange={handleCriteriaChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">None (Top-level criteria)</option>
                                            {parentCriteria
                                                .filter(c => 
                                                    c.CriteriaCode !== criteriaData.CriteriaCode &&
                                                    (!criteriaData.AreaID || String(c.AreaID) === String(criteriaData.AreaID))
                                                )
                                                .map(c => (
                                                    <option key={c.CriteriaID} value={c.CriteriaID}>
                                                        {c.CriteriaCode} - {c.CriteriaName}
                                                    </option>
                                                ))}
                                            </select>
                                            {parentCriteria.length > 0 && (
                                                <p className="text-green-600 text-xs mt-1">
                                                    ✓ {parentCriteria.length} existing criteria available
                                                </p>
                                            )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Description (Optional)
                                        </label>
                                        <textarea
                                            name="Description"
                                            value={criteriaData.Description}
                                            onChange={handleCriteriaChange}
                                            placeholder="Add criteria details..."
                                            rows={3}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 4: Requirement */}
                    {currentStep === 4 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2">Step 4: Choose Requirement</h3>
                                <p className="text-gray-600">Would you like to create a new standalone requirement or link it to an existing parent requirement?</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Create New Requirement Option */}
                                <div
                                    onClick={() => setRequirementMode('create')}
                                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                        requirementMode === 'create'
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-300 bg-gray-50 hover:border-blue-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Plus size={24} className={requirementMode === 'create' ? 'text-blue-500' : 'text-gray-400'} />
                                        <div>
                                            <h4 className="font-semibold text-gray-800">Create New</h4>
                                            <p className="text-sm text-gray-600">Standalone requirement</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Select Existing Requirement as Parent */}
                                <div
                                    onClick={() => setRequirementMode('select')}
                                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                        requirementMode === 'select'
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-300 bg-gray-50 hover:border-blue-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Wand2 size={24} className={requirementMode === 'select' ? 'text-blue-500' : 'text-gray-400'} />
                                        <div>
                                            <h4 className="font-semibold text-gray-800">Link to Parent</h4>
                                            <p className="text-sm text-gray-600">Child requirement</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Select Parent Requirement & Enter Details */}
                            {requirementMode === 'select' && (
                                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-600">Select a parent requirement and enter details for the child:</p>
                                    
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Parent Requirement *
                                        </label>
                                        {(() => {
                                            // Filter requirements to only show those from the same criteria
                                            const criteriaRequirements = availableRequirements.filter(
                                                req => req.CriteriaID === criteriaData.CriteriaID
                                            );
                                            
                                            return criteriaRequirements.length > 0 ? (
                                                <select
                                                    value={requirementData.ParentRequirementCode || ''}
                                                    onChange={(e) => {
                                                        setRequirementData({
                                                            ...requirementData,
                                                            ParentRequirementCode: e.target.value
                                                        });
                                                    }}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="">-- Select a requirement --</option>
                                                    {criteriaRequirements.map((req) => (
                                                        <option key={req.RequirementID} value={req.RequirementCode}>
                                                            {req.RequirementCode}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <p className="text-gray-600 text-sm">No requirements available in this criteria.</p>
                                            );
                                        })()}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Requirement Code *
                                        </label>
                                        <input
                                            type="text"
                                            name="RequirementCode"
                                            value={requirementData.RequirementCode}
                                            onChange={handleRequirementChange}
                                            placeholder="e.g., REQ-001"
                                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                                                errors.requirementData?.RequirementCode
                                                    ? 'border-red-500 focus:ring-red-500'
                                                    : 'border-gray-300 focus:ring-blue-500'
                                            }`}
                                        />
                                        {errors.requirementData?.RequirementCode && (
                                            <p className="text-red-500 text-sm mt-1">{errors.requirementData.RequirementCode}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Description (Optional)
                                        </label>
                                        <textarea
                                            name="Description"
                                            value={requirementData.Description}
                                            onChange={handleRequirementChange}
                                            placeholder="Add requirement details..."
                                            rows={3}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Create New Requirement Form */}
                            {requirementMode === 'create' && (
                                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-600">Enter details for your new requirement:</p>
                                    
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Requirement Code *
                                        </label>
                                        <input
                                            type="text"
                                            name="RequirementCode"
                                            value={requirementData.RequirementCode}
                                            onChange={handleRequirementChange}
                                            placeholder="e.g., REQ-001"
                                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                                                errors.requirementData?.RequirementCode
                                                    ? 'border-red-500 focus:ring-red-500'
                                                    : 'border-gray-300 focus:ring-blue-500'
                                            }`}
                                        />
                                        {errors.requirementData?.RequirementCode && (
                                            <p className="text-red-500 text-sm mt-1">{errors.requirementData.RequirementCode}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Description (Optional)
                                        </label>
                                        <textarea
                                            name="Description"
                                            value={requirementData.Description}
                                            onChange={handleRequirementChange}
                                            placeholder="Add requirement details..."
                                            rows={3}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 5: Completion */}
                    {currentStep === 5 && (
                        <div className="space-y-4 text-center py-8">
                            <div className="flex justify-center mb-4">
                                <div className="bg-green-100 rounded-full p-4">
                                    <Check size={48} className="text-green-600" />
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800">Setup Complete!</h3>
                            <p className="text-gray-600 max-w-md mx-auto">
                                You have successfully created:
                            </p>
                            <div className="bg-blue-50 rounded-lg p-4 text-left space-y-2 text-sm">
                                <p>✓ <strong>Event:</strong> {eventData.EventName}</p>
                                <p>✓ <strong>Area:</strong> {areaData.AreaName}</p>
                                <p>✓ <strong>Criteria:</strong> {criteriaData.CriteriaName}</p>
                                <p>✓ <strong>Requirement:</strong> {requirementData.RequirementCode}</p>
                            </div>
                            <p className="text-gray-600 mt-6">You can now add more items or close this wizard.</p>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex items-center justify-between gap-3 border-t">
                    <button
                        onClick={handlePrevious}
                        disabled={currentStep === 0 || isSubmitting}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 disabled:cursor-not-allowed text-gray-800 font-semibold rounded-lg transition"
                    >
                        <ChevronLeft size={20} /> Previous
                    </button>

                    <div className="flex gap-3">
                        {currentStep > 1 && currentStep < 5 && (
                            <button
                                onClick={handleSkipStep}
                                className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white font-semibold rounded-lg transition"
                                disabled={isSubmitting}
                            >
                                Skip
                            </button>
                        )}
                        
                        {currentStep < 5 ? (
                            <button
                                onClick={handleNext}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition"
                            >
                                {isSubmitting ? 'Adding...' : 'Next'}
                                <ChevronRight size={20} />
                            </button>
                        ) : (
                            <button
                                onClick={handleFinish}
                                className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
                            >
                                <Check size={20} /> Finish
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
