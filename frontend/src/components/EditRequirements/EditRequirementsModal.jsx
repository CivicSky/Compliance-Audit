import React, { useEffect, useState } from 'react';

const EditRequirementsModal = ({ visible, onClose, requirement = {}, onSave }) => {
  const [formData, setFormData] = useState({
    EventID: '',
    RequirementCode: '',
    Description: '',
    CriteriaID: '',
    ParentRequirementCode: ''
  });
  
  const [eventsList, setEventsList] = useState([]);
  const [criteriaList, setCriteriaList] = useState([]);
  const [requirementsList, setRequirementsList] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Populate form when requirement data is loaded
  useEffect(() => {
    if (requirement && visible) {
      setFormData({
        EventID: requirement.EventID || '',
        RequirementCode: requirement.RequirementCode || '',
        Description: requirement.Description || '',
        CriteriaID: requirement.CriteriaID || '',
        ParentRequirementCode: requirement.ParentRequirementCode || ''
      });
      
      // Fetch initial data
      fetchEvents();
      
      // If there's an EventID, fetch criteria for that event
      if (requirement.EventID) {
        fetchCriteriaByEvent(requirement.EventID);
      }
      
      // If there's a CriteriaID, fetch requirements for that criteria
      if (requirement.CriteriaID) {
        fetchRequirementsByCriteria(requirement.CriteriaID);
      }
    }
  }, [requirement, visible]);

  // Fetch criteria when event is selected
  useEffect(() => {
    if (formData.EventID && visible) {
      fetchCriteriaByEvent(formData.EventID);
    } else {
      setCriteriaList([]);
    }
  }, [formData.EventID, visible]);

  // Fetch requirements for selected criteria
  useEffect(() => {
    if (formData.CriteriaID && visible) {
      fetchRequirementsByCriteria(formData.CriteriaID);
    } else {
      setRequirementsList([]);
    }
  }, [formData.CriteriaID, visible]);

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
      const { requirementsAPI } = await import('../../utils/api');
      const response = await requirementsAPI.getCriteriaByEvent(eventId);
      
      if (response.success) {
        setCriteriaList(response.data);
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
      const response = await requirementsAPI.getAllRequirements();
      
      if (response.success) {
        // Filter by selected criteria and exclude current requirement
        const filtered = response.data.filter(req => 
          req.CriteriaID == criteriaId && 
          req.RequirementID !== requirement.RequirementID
        );
        setRequirementsList(filtered);
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

    const updated = {
      RequirementID: requirement.RequirementID,
      RequirementCode: formData.RequirementCode,
      Description: formData.Description,
      CriteriaID: formData.CriteriaID,
      ParentRequirementCode: formData.ParentRequirementCode || null
    };

    try {
      await onSave(updated);
      onClose();
    } catch (error) {
      console.error('Error saving requirement:', error);
    } finally {
      setIsSubmitting(false);
    }
  };


  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 min-h-[70vh] max-h-[95vh] flex flex-col">
        {/* Header - Sticky */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10 rounded-t-lg">
          <h2 className="text-xl font-semibold text-gray-800">Edit Requirement</h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Event Dropdown */}
            <div className="mb-4">
              <label htmlFor="EventID" className="block text-sm font-medium text-gray-700 mb-1">
                Event *
              </label>
              <select
                id="EventID"
                name="EventID"
                value={formData.EventID}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.EventID ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isSubmitting}
              >
                <option value="">Select an event</option>
                {eventsList.map((event) => (
                  <option key={event.EventID} value={event.EventID}>
                    {event.EventCode} - {event.EventName}
                  </option>
                ))}
              </select>
              {errors.EventID && (
                <p className="text-red-500 text-sm mt-1">{errors.EventID}</p>
              )}
            </div>

            {/* Criteria Dropdown */}
            <div className="mb-4">
              <label htmlFor="CriteriaID" className="block text-sm font-medium text-gray-700 mb-1">
                Criteria *
              </label>
              <select
                id="CriteriaID"
                name="CriteriaID"
                value={formData.CriteriaID}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.CriteriaID ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isSubmitting || isLoading || !formData.EventID}
              >
                <option value="">
                  {!formData.EventID ? 'Select an event first' : 'Select a criteria'}
                </option>
                {criteriaList.map((criteria) => (
                  <option key={criteria.CriteriaID} value={criteria.CriteriaID}>
                    {criteria.CriteriaCode} - {criteria.CriteriaName}
                  </option>
                ))}
              </select>
              {errors.CriteriaID && (
                <p className="text-red-500 text-sm mt-1">{errors.CriteriaID}</p>
              )}
              {isLoading && (
                <p className="text-gray-500 text-sm mt-1">Loading criteria...</p>
              )}
            </div>

            {/* Parent Requirement Dropdown */}
            <div className="mb-4">
              <label htmlFor="ParentRequirementCode" className="block text-sm font-medium text-gray-700 mb-1">
                Parent Requirement (Optional)
              </label>
              <select
                id="ParentRequirementCode"
                name="ParentRequirementCode"
                value={formData.ParentRequirementCode}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              {!formData.CriteriaID ? (
                <p className="text-gray-500 text-xs mt-1">
                  Select a criteria to see available parent requirements
                </p>
              ) : requirementsList.length === 0 ? (
                <p className="text-yellow-600 text-xs mt-1">
                  No other requirements in this criteria
                </p>
              ) : (
                <p className="text-green-600 text-xs mt-1">
                  Loaded {requirementsList.length} requirement{requirementsList.length !== 1 ? 's' : ''} for this criteria
                </p>
              )}
            </div>

            {/* Requirement Code */}
            <div className="mb-4">
              <label htmlFor="RequirementCode" className="block text-sm font-medium text-gray-700 mb-1">
                Requirement Code *
              </label>
              <input
                type="text"
                id="RequirementCode"
                name="RequirementCode"
                value={formData.RequirementCode}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.RequirementCode ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., A.1 or just enter a number"
                disabled={isSubmitting}
              />
              {errors.RequirementCode && (
                <p className="text-red-500 text-sm mt-1">{errors.RequirementCode}</p>
              )}
              {formData.ParentRequirementCode && (
                <p className="text-blue-600 text-xs mt-1">
                  If you enter just a number, it will be appended to the parent code
                </p>
              )}
            </div>

            {/* Description */}
            <div className="mb-4">
              <label htmlFor="Description" className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                id="Description"
                name="Description"
                value={formData.Description}
                onChange={handleInputChange}
                rows="4"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                  errors.Description ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter a detailed description of this requirement"
                disabled={isSubmitting}
              />
              {errors.Description && (
                <p className="text-red-500 text-sm mt-1">{errors.Description}</p>
              )}
            </div>
          </div>

          {/* Form Actions - Sticky Bottom */}
          <div className="flex justify-end space-x-3 p-6 pt-4 border-t bg-white sticky bottom-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.EventID || !formData.CriteriaID}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                  <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditRequirementsModal;
