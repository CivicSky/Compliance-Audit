import React, { useState, useEffect, useCallback } from 'react';
import { criteriaAPI } from '../../utils/api';
import { useModal } from "../UI/ModalProvider";

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
  const { showAlert } = useModal();

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
        await showAlert(msg);
      } finally {
        setIsSubmitting(false);
      }
  };

  return (
    <div className="fixed inset-y-0 right-0 left-0 lg:left-[var(--sidebar-width)] lg:transition-[left] lg:duration-200 lg:ease-in-out bg-black bg-opacity-50 flex items-center justify-center z-[50]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[95vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
          <h2 className="text-lg font-bold text-gray-900">{isAdmin ? 'Edit Criteria' : 'View Criteria'}</h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            aria-label="Close"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5">
          {/* Criteria Code */}
          <div className="mb-6">
            <label htmlFor="CriteriaCode" className="block text-sm font-semibold text-gray-800 mb-2">
              Criteria Code *
            </label>
            <input
              type="text"
              id="CriteriaCode"
              name="CriteriaCode"
              value={criteriaCode}
              onChange={handleInputChange}
              className={`w-full rounded-md bg-white px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 ${errors.CriteriaCode ? 'border-red-500' : 'border border-slate-200'}`}
              placeholder="e.g., CUR.4.1"
              disabled={isSubmitting || !isAdmin || isChild}
              required={!isChild}
            />
            {errors.CriteriaCode && <p className="text-red-500 text-sm mt-1">{errors.CriteriaCode}</p>}
          </div>

          {/* Criteria Name */}
          <div className="mb-6">
            <label htmlFor="CriteriaName" className="block text-sm font-semibold text-gray-800 mb-2">
              Criteria Name *
            </label>
            <input
              type="text"
              id="CriteriaName"
              name="CriteriaName"
              value={criteriaName}
              onChange={handleInputChange}
              className={`w-full rounded-md bg-white px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 ${errors.CriteriaName ? 'border-red-500' : 'border border-slate-200'}`}
              placeholder="Enter criteria name"
              disabled={isSubmitting || !isAdmin}
              required
            />
            {errors.CriteriaName && <p className="text-red-500 text-sm mt-1">{errors.CriteriaName}</p>}
          </div>

          {/* Parent Criteria Dropdown */}
          <div className="mb-6">
            <label htmlFor="ParentCriteriaID" className="block text-sm font-semibold text-gray-800 mb-2">
              Parent Criteria (Optional)
            </label>
            <div className="relative">
              <select
                id="ParentCriteriaID"
                name="ParentCriteriaID"
                value={parentCriteriaId}
                onChange={handleInputChange}
                className="h-10 w-full appearance-none rounded-md border border-slate-200 bg-white px-4 pr-9 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
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
              <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-slate-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

      <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-white">
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
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
