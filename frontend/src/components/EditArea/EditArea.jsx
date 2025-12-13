
import React, { useState, useEffect } from 'react';

const EditAreaModal = ({ visible, onClose, area = {}, onSave }) => {
  const [areaCode, setAreaCode] = useState('');
  const [areaName, setAreaName] = useState('');
  const [description, setDescription] = useState('');
  // Removed sortOrder and isActive
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (area) {
      setAreaCode(area.AreaCode || '');
      setAreaName(area.AreaName || '');
      setDescription(area.Description || '');
      // Removed sortOrder and isActive
    }
  }, [area]);

  if (!visible) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const updated = {
      AreaID: area.AreaID,
      AreaCode: areaCode,
      AreaName: areaName,
      Description: description,
      // Removed SortOrder and IsActive
    };
    onSave(updated);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 min-h-[40vh] max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Edit Area</h2>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Area Code */}
            <div>
              <label htmlFor="areaCode" className="block text-sm font-medium text-gray-700 mb-1">
                Area Code *
              </label>
              <input
                type="text"
                id="areaCode"
                name="areaCode"
                value={areaCode}
                onChange={e => setAreaCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., AREA1"
                disabled={isSubmitting}
                required
              />
            </div>
            {/* Area Name */}
            <div>
              <label htmlFor="areaName" className="block text-sm font-medium text-gray-700 mb-1">
                Area Name *
              </label>
              <input
                type="text"
                id="areaName"
                name="areaName"
                value={areaName}
                onChange={e => setAreaName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Vision, Mission, Goals & Objectives"
                disabled={isSubmitting}
                required
              />
            </div>
          </div>
          {/* Description */}
          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Enter area description (optional)"
              disabled={isSubmitting}
            />
          </div>
          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
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

export default EditAreaModal;
