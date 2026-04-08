import React, { useState, useEffect, useCallback } from 'react';
import { criteriaAPI } from '../../utils/api';

const EditCriteriaModal = ({ visible, onClose, event = {}, onSave, userRole = 'user' }) => {
  const [criteriaCode, setCriteriaCode] = useState('');
  const [criteriaName, setCriteriaName] = useState('');
  // Description removed from form; will send null when saving
  const [parentCriteriaId, setParentCriteriaId] = useState('');
  const [isChild, setIsChild] = useState(false);
  const [eventId, setEventId] = useState('');
  const [criteriaList, setCriteriaList] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const isAdmin = userRole === 'admin' || userRole === 1;

  useEffect(() => {
    if (event && visible) {
      setCriteriaCode((event.CriteriaCode || '').toUpperCase());
      setCriteriaName(event.CriteriaName || '');
      // description intentionally ignored (send null)
      setParentCriteriaId(event.ParentCriteriaID ? String(event.ParentCriteriaID) : '');
      setIsChild(Boolean(event.ParentCriteriaID));
      setEventId(event.EventID || '');
    }
  }, [event, visible]);

  useEffect(() => {
    async function fetchCriteria() {
      try {
        const res = await criteriaAPI.getAll();
        if (event && event.EventID) {
          setCriteriaList((res.data || []).filter(c => String(c.EventID) === String(event.EventID)));
        } else {
          setCriteriaList(res.data || []);
        }
      } catch {
        setCriteriaList([]);
      }
    }
    fetchCriteria();
  }, [event]);

  if (!visible) return null;

  const validateForm = () => {
    const newErrors = {};
    if (!criteriaCode.trim() && !isChild) newErrors.CriteriaCode = 'Criteria code is required';
    if (!criteriaName.trim()) newErrors.CriteriaName = 'Criteria name is required';
    // ensure uniqueness of CriteriaCode within the same event (case-insensitive)
    const code = String(criteriaCode || '').trim().toLowerCase();
    if (code) {
      const duplicate = (criteriaList || []).find(c => String(c.CriteriaCode || '').trim().toLowerCase() === code && Number(c.CriteriaID) !== Number(event.CriteriaID));
      if (duplicate) newErrors.CriteriaCode = 'A criteria with this code already exists for this event.';
    }
    // Description is optional/removed
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'CriteriaCode') setCriteriaCode((value || '').toUpperCase());
    else if (name === 'CriteriaName') setCriteriaName(value);
    else if (name === 'ParentCriteriaID') setParentCriteriaId(value);
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    const updated = {
      CriteriaID: event.CriteriaID,
      CriteriaCode: isChild ? null : criteriaCode,
      CriteriaName: criteriaName,
      Description: null,
      AreaID: event.AreaID === undefined ? null : event.AreaID,
      ParentCriteriaID: parentCriteriaId === '' ? null : parentCriteriaId,
      EventID: eventId
    };
      try {
        if (onSave) await onSave(updated);
        onClose();
      } catch (err) {
        console.log('Update criteria error (parent):', err);
        let msg = 'Failed to update criteria.';
        if (err?.message) msg += '\n' + err.message;
        alert(msg);
      } finally {
        setIsSubmitting(false);
      }
  };

  return (
    <div className="fixed inset-y-0 right-0 left-0 lg:left-[var(--sidebar-width)] lg:transition-[left] lg:duration-200 lg:ease-in-out bg-black bg-opacity-50 flex items-center justify-center z-[120]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 min-h-[70vh] max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-8" style={{ minHeight: '72px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 className="text-2xl font-bold text-gray-900">{isAdmin ? 'Edit Criteria' : 'View Criteria'}</h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            aria-label="Close"
            style={{ marginTop: '4px' }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 pt-6 pb-8">
          





          {/* Criteria Code */}
          <div className="mb-6">
            <label htmlFor="CriteriaCode" className="block text-sm font-medium text-gray-700 mb-2">
              Criteria Code *
            </label>
            <input
              type="text"
              id="CriteriaCode"
              name="CriteriaCode"
              value={criteriaCode}
              onChange={handleInputChange}
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.CriteriaCode ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="e.g., CUR.4.1"
              disabled={isSubmitting || !isAdmin || isChild}
              required={!isChild}
            />
            {errors.CriteriaCode && <p className="text-red-500 text-sm mt-1">{errors.CriteriaCode}</p>}
          </div>

          {/* Criteria Name */}
          <div className="mb-6">
            <label htmlFor="CriteriaName" className="block text-sm font-medium text-gray-700 mb-2">
              Criteria Name *
            </label>
            <input
              type="text"
              id="CriteriaName"
              name="CriteriaName"
              value={criteriaName}
              onChange={handleInputChange}
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.CriteriaName ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Enter criteria name"
              disabled={isSubmitting || !isAdmin}
              required
            />
            {errors.CriteriaName && <p className="text-red-500 text-sm mt-1">{errors.CriteriaName}</p>}
          </div>

          {/* Parent Criteria Dropdown */}
          <div className="mb-6">
            <label htmlFor="ParentCriteriaID" className="block text-sm font-medium text-gray-700 mb-2">
              Parent Criteria (Optional)
            </label>
            <select
              id="ParentCriteriaID"
              name="ParentCriteriaID"
              value={parentCriteriaId}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting || !isAdmin || isChild}
            >
              <option value="">None (Top-level criteria)</option>
              {criteriaList
                .filter(c => String(c.CriteriaID) !== String(event.CriteriaID))
                .map(c => (
                  <option key={c.CriteriaID} value={c.CriteriaID}>
                    {c.CriteriaCode} - {c.CriteriaName}
                  </option>
                ))}
            </select>
          </div>

          {/* Description removed - backend accepts null */}

      {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          {isAdmin && (
            <>
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
                disabled={isSubmitting}
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
            </>
          )}
          {!isAdmin && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </form>
    </div>
  </div>
  );
};

export default EditCriteriaModal;

