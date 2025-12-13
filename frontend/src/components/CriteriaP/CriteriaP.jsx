import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { requirementsAPI } from "../../utils/api";

const CriteriaP = forwardRef(function CriteriaP({ searchTerm = "", eventId = null, deleteMode = false, onSelectionChange, selectedIds = [], onDeleteSelected }, ref) {
  const [criteria, setCriteria] = useState([]);
  const [selected, setSelected] = useState(selectedIds || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCriteria();
    // eslint-disable-next-line
  }, [eventId]);

  useImperativeHandle(ref, () => ({
    refresh: fetchCriteria
  }));

  const fetchCriteria = async () => {
    setLoading(true);
    setError(null);
    try {
      let response;
      if (eventId) {
        response = await requirementsAPI.getCriteriaByEvent(eventId);
      } else {
        response = await requirementsAPI.getAllCriteria();
      }
      if (response.success) {
        setCriteria(response.data);
      } else {
        setError("Failed to fetch criteria");
      }
    } catch (err) {
      setError("Error loading criteria");
    } finally {
      setLoading(false);
    }
  };

  let filtered = criteria;
  // Filter by search term
  if (searchTerm.trim()) {
    const searchLower = searchTerm.toLowerCase();
    filtered = filtered.filter(c =>
      (c.CriteriaCode?.toLowerCase() || "").includes(searchLower) ||
      (c.CriteriaName?.toLowerCase() || "").includes(searchLower) ||
      (c.AreaName?.toLowerCase() || "").includes(searchLower) ||
      (c.EventName?.toLowerCase() || "").includes(searchLower)
    );
  }

  // Group by area
  const areaGroups = filtered.reduce((acc, c) => {
    const areaKey = c.AreaCode || "No Area";
    if (!acc[areaKey]) {
      acc[areaKey] = {
        areaName: c.AreaName || "Unknown Area",
        criteria: []
      };
    }
    acc[areaKey].criteria.push(c);
    return acc;
  }, {});

  // Selection logic
  const handleSelect = (id) => {
    let updated;
    if (selected.includes(id)) {
      updated = selected.filter((sid) => sid !== id);
    } else {
      updated = [...selected, id];
    }
    setSelected(updated);
    if (onSelectionChange) onSelectionChange(updated.length, updated);
  };

  if (loading) {
    return <div className="p-6">Loading criteria...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }
  if (filtered.length === 0) {
    return <div className="p-6 text-gray-600">No criteria found.</div>;
  }

  return (
    <div className="mt-6 w-full space-y-4">
      {Object.entries(areaGroups).map(([areaCode, areaData]) => (
        <div key={areaCode} className="space-y-4">
          {/* AREA HEADER */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-3 rounded-lg shadow-md">
            <h3 className="text-base font-bold">{areaCode}</h3>
            <p className="text-xs text-purple-100 mt-1">{areaData.areaName}</p>
          </div>
          {/* CRITERIA LIST */}
          <div className="ml-4 space-y-2">
            {areaData.criteria.map((c) => (
              <div key={c.CriteriaID} className="bg-white rounded-lg shadow-md border-l-4 border-indigo-200 p-4 flex items-center">
                {deleteMode && (
                  <input
                    type="checkbox"
                    className="mr-3 h-5 w-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    checked={selected.includes(c.CriteriaID)}
                    onChange={() => handleSelect(c.CriteriaID)}
                  />
                )}
                <div className="flex flex-col w-full">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 text-base">{c.CriteriaCode}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{c.CriteriaName}</p>
                  <p className="text-xs text-gray-400 mt-1">Event: {c.EventName}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});
export default CriteriaP;
