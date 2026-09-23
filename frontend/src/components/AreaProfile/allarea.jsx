import React, { useEffect, useState, useImperativeHandle, forwardRef } from "react";
import { areasAPI } from "../../utils/api";

const AreaProfile = forwardRef(function AreaProfile({ eventId, onAreaClick, selectedAreaIds = [], selectionMode = false }, ref) {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAreas = async () => {
    setLoading(true);
    setError(null);
    try {
      let response;
      if (eventId) {
        response = await areasAPI.getByEvent(eventId);
      } else {
        response = await areasAPI.getAll();
      }
      if (response.success) {
        setAreas(response.data);
      } else {
        setAreas([]);
      }
    } catch (err) {
      setError("Error loading areas");
      setAreas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAreas();
    // eslint-disable-next-line
  }, [eventId]);

  useImperativeHandle(ref, () => ({
    refresh: fetchAreas
  }));


  if (loading) return <div className="p-6">Loading areas...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!areas || areas.length === 0) return null;

  return (
    <div className="mt-6 w-full space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1.5 pb-1.5">
        {areas.map(area => {
          const isSelected = selectionMode && selectedAreaIds.includes(area.AreaID);
          return (
            <div
              key={area.AreaID}
              className={`bg-white rounded-xl shadow-2xs p-4 app-card-hover cursor-pointer border border-slate-200 border-l-4 border-l-cyan-500 ${isSelected ? 'area-selected-outer ring-2 ring-indigo-500' : ''}`}
              style={isSelected ? { borderLeftWidth: '8px' } : {}}
              onClick={() => {
                if (onAreaClick) {
                  onAreaClick(area);
                }
              }}
            >
              <div className="flex items-center gap-2">
                {selectionMode && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onAreaClick && onAreaClick(area)}
                    onClick={e => e.stopPropagation()}
                    className="accent-blue-600 w-5 h-5"
                  />
                )}
                <h3 className="font-semibold text-lg text-blue-700">{area.AreaCode} - {area.AreaName}</h3>
              </div>
              <p className="text-gray-600 mt-1">{area.Description}</p>
              <p className="text-xs text-gray-400 mt-2">Event ID: {area.EventID}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default AreaProfile;
