import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { requirementsAPI } from "../../utils/api";

const CriteriaP = forwardRef(function CriteriaP({ searchTerm = "", eventId = null, deleteMode = false, onSelectionChange, selectedIds = [], onDeleteSelected, onCriteriaClick }, ref) {
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


  // Group by area, then by criteria (no requirements), and sort by Area SortOrder and CriteriaCode
  const areaGroups = {};
  filtered.forEach((c) => {
    const areaKey = c.AreaID || 'no-area';
    if (!areaGroups[areaKey]) {
      areaGroups[areaKey] = {
        areaName: c.AreaName || 'Unknown Area',
        areaCode: c.AreaCode || 'No Area',
        sortOrder: c.SortOrder || 9999,
        criteria: []
      };
    }
    areaGroups[areaKey].criteria.push(c);
  });

  // Convert to array and sort areas by sortOrder, then by areaName
  const sortedAreas = Object.values(areaGroups)
    .filter(area => area.criteria.length > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.areaName.localeCompare(b.areaName));

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
      {sortedAreas.map((area) => (
        <div key={area.areaCode} className="space-y-4">
          {/* AREA HEADER */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-3 rounded-lg shadow-md">
            <h3 className="text-base font-bold">{area.areaCode}</h3>
            <p className="text-xs text-purple-100 mt-1">{area.areaName}</p>
          </div>
          {/* CRITERIA GROUPS */}
          {area.criteria
            .sort((a, b) => (a.CriteriaCode || '').localeCompare(b.CriteriaCode || ''))
            .map((c) => {
              // Level calculation: number of dots in CriteriaCode (e.g., CUR.4.1.2 = Level 3)
              const level = c.CriteriaCode ? c.CriteriaCode.split('.').length - 1 : 0;
              return (
                <div key={c.CriteriaID} className="ml-4 space-y-2">
                  {/* CRITERIA HEADER */}
                  <div
                    className={`bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-4 py-3 rounded-lg shadow-md flex items-center cursor-pointer ${deleteMode && selected.includes(c.CriteriaID) ? 'ring-2 ring-red-500 ring-inset' : ''}`}
                    onClick={() => !deleteMode && onCriteriaClick && onCriteriaClick(c)}
                  >
                    {deleteMode && (
                      <input
                        type="checkbox"
                        className="mr-3 h-5 w-5 text-purple-300 border-gray-300 rounded focus:ring-purple-500"
                        checked={selected.includes(c.CriteriaID)}
                        onChange={() => handleSelect(c.CriteriaID)}
                      />
                    )}
                    <div className="flex flex-col w-full">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white text-base">{c.CriteriaCode}</h3>
                        {/* Always show child/level if has parent (by code or ID, prefer code) */}
                        {(c.ParentCriteriaCode || c.ParentCriteriaID) && (() => {
                          let parentCode = c.ParentCriteriaCode;
                          if (!parentCode && c.ParentCriteriaID) {
                            // Try to find the parent code from the loaded criteria list
                            const parent = criteria.find(pc => String(pc.CriteriaID) === String(c.ParentCriteriaID));
                            parentCode = parent?.CriteriaCode || c.ParentCriteriaID;
                          }
                          return (
                            <>
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded ml-2">
                                Child of {parentCode}
                              </span>
                              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded ml-2">
                                Level 2
                              </span>
                            </>
                          );
                        })()}
                      </div>
                      <p className="text-sm text-indigo-100 mt-1">{c.CriteriaName}</p>
                      <p className="text-xs text-indigo-200 mt-1">Event: {c.EventName}</p>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      ))}
    </div>
  );
});
export default CriteriaP;
