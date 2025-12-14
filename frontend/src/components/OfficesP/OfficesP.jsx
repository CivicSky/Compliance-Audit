import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { officesAPI } from "../../utils/api";
import userIcon from "../../assets/images/user.svg";

const OfficesP = forwardRef(
    ({ searchTerm, deleteMode, onSelectionChange, onOfficeClick, eventType, officeTypes, heads }, ref) => {
        const [offices, setOffices] = useState([]);
        const [selectedIds, setSelectedIds] = useState([]);

        // Fetch offices from backend
        const fetchOffices = async () => {
            try {
                const res = await officesAPI.getAll();
                console.log('Fetched offices:', res);

                // Use the data directly - it's already formatted correctly
                setOffices(res.data || res);
                setSelectedIds([]);
            } catch (err) {
                console.error("Failed to load offices:", err);
                console.error("Error details:", err.response?.data || err.message);
                setOffices([]);
            }
        };

        // Expose refresh + delete via ref
        useImperativeHandle(ref, () => ({
            refresh: fetchOffices,
            deleteSelected: async (ids) => {
                try {
                    for (let id of ids) await officesAPI.deleteOffice(id);
                    fetchOffices();
                    return { success: true };
                } catch (err) {
                    console.error(err);
                    return { success: false, message: err.message };
                }
            },
        }));

        // Load on mount
        useEffect(() => {
            fetchOffices();
        }, []);

        // Notify parent when selected changes
        useEffect(() => {
            onSelectionChange(selectedIds.length, selectedIds);
        }, [selectedIds]);

        const handleCheckboxChange = (id, checked) => {
            if (checked) setSelectedIds([...selectedIds, id]);
            else setSelectedIds(selectedIds.filter((i) => i !== id));
        };

        // Search filter
        const filteredBySearch = offices.filter((o) =>
            o.office_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );



        // Show all offices if no eventType selected, otherwise filter by eventType (EventID)
        const filtered = eventType
            ? filteredBySearch.filter((o) => String(o.event_id) === String(eventType))
            : filteredBySearch;

        // Debug logs
        console.log('Current eventType (EventID):', eventType);
        console.log('All offices:', offices.map(o => ({ name: o.office_name, event_id: o.event_id })));
        console.log('Filtered offices:', filtered.map(o => ({ name: o.office_name, event_id: o.event_id })));

        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {filtered.map((office) => {
                    // Construct profile pic URL
                    const profilePicUrl = office.head_profile_pic 
                        ? `http://localhost:5000/uploads/profile-pics/${office.head_profile_pic}`
                        : userIcon;

                    console.log('Office:', office.office_name, 'ProfilePic:', office.head_profile_pic, 'URL:', profilePicUrl);

                    return (
                        <div
                            key={office.id}
                            className={`bg-white rounded-md p-4 w-full shadow-md hover:shadow-lg transition-all border cursor-pointer ${selectedIds.includes(office.id) ? "bg-blue-50 ring-2 ring-blue-400" : ""
                                }`}
                            onClick={() => !deleteMode && onOfficeClick(office)}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="text-base font-semibold text-gray-800">{office.office_name}</h3>

                                <span className="px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                                    {office.office_type_name}
                                </span>
                            </div>

                            {/* Overall Status Badge */}
                            <div className="mb-3 flex items-center justify-between">
                                <div className="text-xs text-gray-500">
                                    {office.total_requirements || 0} requirement{(office.total_requirements || 0) !== 1 ? 's' : ''}
                                </div>
                                <span className={`px-3 py-1.5 text-xs font-bold rounded-lg inline-flex items-center gap-1.5 ${
                                    office.overall_status === 'Complied' ? 'bg-green-100 text-green-800 border border-green-300' :
                                    office.overall_status === 'Partially Complied' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                                    'bg-red-100 text-red-800 border border-red-300'
                                }`}>
                                    <div className={`w-2 h-2 rounded-full ${
                                        office.overall_status === 'Complied' ? 'bg-green-600' :
                                        office.overall_status === 'Partially Complied' ? 'bg-yellow-600' :
                                        'bg-red-600'
                                    }`}></div>
                                    {office.overall_status}
                                </span>
                            </div>

                            <div className="flex items-center gap-3 mt-3">
                                <img
                                    src={profilePicUrl}
                                    alt={office.head_name}
                                    className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                                    onError={(e) => {
                                        e.target.src = userIcon;
                                    }}
                                />
                                <div className="flex-1">
                                    <p className="text-sm text-gray-600">
                                        <span className="font-medium">Head:</span> {office.head_name}
                                    </p>
                                </div>
                            </div>

                            {deleteMode && (
                                <div className="mt-3 flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(office.id)}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            handleCheckboxChange(office.id, e.target.checked);
                                        }}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-600">Select for deletion</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }
);

export default OfficesP;
