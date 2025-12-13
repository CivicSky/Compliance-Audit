import React, { useState, useEffect, useCallback } from 'react';
import { areasAPI, requirementsAPI } from '../../utils/api';
import axios from 'axios';

const EditCriteriaModal = ({ visible, onClose, event = {}, onSave }) => {
  const [criteriaCode, setCriteriaCode] = useState('');
  const [criteriaName, setCriteriaName] = useState('');
  const [description, setDescription] = useState('');
  const [areaId, setAreaId] = useState('');
  const [parentCriteriaId, setParentCriteriaId] = useState('');
  const [eventId, setEventId] = useState('');
  const [areasList, setAreasList] = useState([]);
  const [criteriaList, setCriteriaList] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (event && visible) {
      setCriteriaCode(event.CriteriaCode || '');
      setCriteriaName(event.CriteriaName || '');
      setDescription(event.Description || '');
      setAreaId(event.AreaID ? String(event.AreaID) : '');
      setParentCriteriaId(event.ParentCriteriaID ? String(event.ParentCriteriaID) : '');
      setEventId(event.EventID || '');
    }
  }, [event, visible]);

  useEffect(() => {
    async function fetchAreas() {
      try {
        const res = await areasAPI.getAll();
        if (event && event.EventID) {
          setAreasList((res.data || []).filter(a => String(a.EventID) === String(event.EventID)));
        } else {
          setAreasList(res.data || []);
        }
      } catch {
        setAreasList([]);
      }
    }
    fetchAreas();
  }, [event]);

  useEffect(() => {
    async function fetchCriteria() {
      try {
        const res = await requirementsAPI.getAllCriteria();
        if (event && event.EventID && areaId) {
          setCriteriaList((res.data || []).filter(c => String(c.EventID) === String(event.EventID) && String(c.AreaID) === String(areaId)));
        } else if (event && event.EventID) {
          setCriteriaList((res.data || []).filter(c => String(c.EventID) === String(event.EventID)));
        } else {
          setCriteriaList(res.data || []);
        }
      } catch {
        setCriteriaList([]);
      }
    }
    fetchCriteria();
  }, [event, areaId]);

  if (!visible) return null;

  const validateForm = () => {
    const newErrors = {};
    if (!criteriaCode.trim()) newErrors.CriteriaCode = 'Criteria code is required';
    if (!criteriaName.trim()) newErrors.CriteriaName = 'Criteria name is required';
    if (!description.trim()) newErrors.Description = 'Description is required';
    // Area is now optional, so no error for areaId
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'CriteriaCode') setCriteriaCode(value);
    else if (name === 'CriteriaName') setCriteriaName(value);
    else if (name === 'Description') setDescription(value);
    else if (name === 'AreaID') setAreaId(value);
    else if (name === 'ParentCriteriaID') setParentCriteriaId(value);
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    const updated = {
      CriteriaID: event.CriteriaID,
      CriteriaCode: criteriaCode,
      CriteriaName: criteriaName,
      Description: description,
      AreaID: areaId === '' ? null : areaId,
      ParentCriteriaID: parentCriteriaId === '' ? null : parentCriteriaId,
      EventID: eventId
    };
    try {
      await axios.put(`/api/criteria/${event.CriteriaID}`, updated);
      alert('Successfully updated criteria.');
      if (onSave) onSave(updated);
      onClose();
    } catch (err) {
      console.log('Update criteria error:', err);
      let msg = 'Failed to update criteria.';
      if (err.response && err.response.data && err.response.data.message) {
        msg += '\n' + err.response.data.message;
      }
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 min-h-[70vh] max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-8" style={{ minHeight: '72px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 className="text-2xl font-bold text-gray-900">Edit Criteria</h2>
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
          {/* Area Dropdown */}
          <div className="mb-6">
            <label htmlFor="AreaID" className="block text-sm font-medium text-gray-700 mb-2">
              Area (Optional)
            </label>
            <select
              id="AreaID"
              name="AreaID"
              value={areaId}
              onChange={handleInputChange}
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.AreaID ? 'border-red-500' : 'border-gray-300'}`}
              disabled={isSubmitting}
            >
              <option value="">No Area (Top-level)</option>
              {[...areasList.reduce((map, area) => {
                if (!map.has(area.AreaID)) map.set(area.AreaID, area);
                return map;
              }, new Map()).values()].map((area) => (
                  <option key={area.AreaID} value={area.AreaID}>
                    {area.AreaCode} - {area.AreaName}
                  </option>
              ))}
            </select>
            {/* Area is now optional, so no error message */}
          </div>





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
              disabled={isSubmitting}
              required
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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
            >
              <option value="">None (Top-level criteria)</option>
              {criteriaList
                .filter(c => {
                  if (String(c.CriteriaID) === String(event.CriteriaID)) return false;
                  if (!areaId) return !c.AreaID;
                  return String(c.AreaID) === String(areaId);
                })
                .map(c => (
                  <option key={c.CriteriaID} value={c.CriteriaID}>
                    {c.CriteriaCode} - {c.CriteriaName}
                  </option>
                ))}
            </select>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label htmlFor="Description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="Description"
              name="Description"
              value={description}
              onChange={handleInputChange}
              rows="3"
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${errors.Description ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Enter a detailed description of this criteria"
              disabled={isSubmitting}
            />
            {errors.Description && <p className="text-red-500 text-sm mt-1">{errors.Description}</p>}
          </div>

      {/* Form Actions - Sticky Bottom */}
        {/* Form Actions - Sticky Bottom */}
        <div className="flex justify-end space-x-3 pt-4 border-t bg-white sticky bottom-0">
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
        </div>
      </form>
    </div>
  </div>
  );
};

export default EditCriteriaModal;
