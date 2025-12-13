import React, { useEffect, useState } from "react";
import { areasAPI } from "../../utils/api";

export default function AreaProfile() {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAreas = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await areasAPI.getAll();
        if (response.success) {
          setAreas(response.data);
        } else {
          setError("Failed to fetch areas");
        }
      } catch (err) {
        setError("Error loading areas");
      } finally {
        setLoading(false);
      }
    };
    fetchAreas();
  }, []);

  if (loading) return <div className="p-6">Loading areas...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="mt-6 w-full space-y-4">
      {/* Removed 'All Areas' label */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {areas.map(area => (
          <div key={area.AreaID} className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-400">
            <h3 className="font-semibold text-lg text-purple-700">{area.AreaCode} - {area.AreaName}</h3>
            <p className="text-gray-600 mt-1">{area.Description}</p>
            <p className="text-xs text-gray-400 mt-2">Event ID: {area.EventID}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
