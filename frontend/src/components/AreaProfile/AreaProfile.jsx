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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {areas.map(area => {
          const isSelected = selectionMode && selectedAreaIds.includes(area.AreaID);
          return (
            <div
              key={area.AreaID}
              className={`bg-white rounded-lg shadow-md p-4 hover:border-purple-700 hover:shadow-xl cursor-pointer border-l-4 border-purple-400 border-solid ${isSelected ? 'area-selected-outer' : ''}`}
              style={isSelected ? { borderLeftWidth: '8px', boxShadow: '0 0 0 4px #dc2626' } : {}}
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
                    className="accent-red-600 w-5 h-5"
                  />
                )}
                <h3 className="font-semibold text-lg text-purple-700">{area.AreaCode} - {area.AreaName}</h3>
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
