import React, { useState, useEffect, useCallback } from 'react';
import { criteriaAPI } from '../../utils/api';
import { useModal } from "../UI/ModalProvider";
import CustomSelect from '../UI/CustomSelect';

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
    <div className="fixed inset-y-0 right-0 left-0 lg:left-[var(--sidebar-width)] lg:transition-[left] lg:duration-200 lg:ease-in-out bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[50]">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl mx-4 max-h-[95vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-800">{isAdmin ? 'Edit Criteria' : 'View Criteria'}</h2>
            <p className="mt-0.5 text-xs text-slate-500">Configure accreditation criteria parameters and requirements.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:scale-95 cursor-pointer disabled:opacity-50"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <CustomSelect
              id="ParentCriteriaID"
              size="md"
              value={parentCriteriaId}
              onChange={(val) => handleInputChange({ target: { name: 'ParentCriteriaID', value: val } })}
              options={[
                { value: '', label: 'None (Top-level criteria)' },
                ...criteriaList
                  .filter(c => String(c.CriteriaID) !== String(event.CriteriaID))
                  .map(c => ({
                    value: String(c.CriteriaID),
                    label: `${c.CriteriaCode} - ${c.CriteriaName}`
                  }))
              ]}
              placeholder="None (Top-level criteria)"
              disabled={isSubmitting || !isAdmin || isChild}
            />
          </div>

        <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-white">
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting && (
                  <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                    <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </>
          )}
          {!isAdmin && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 active:scale-95 cursor-pointer"
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
