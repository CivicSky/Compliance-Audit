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
                console.log('API Response:', res);

                // API now returns the array directly (or { data: [...] } for backward compatibility)
                const officesData = Array.isArray(res) ? res : (res && res.data) || [];
                console.log('Offices data:', officesData);
                setOffices(officesData);
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
            clearSelection: () => setSelectedIds([]),
        }));
        // Clear selection when deleteMode is turned off
        useEffect(() => {
            if (!deleteMode) setSelectedIds([]);
        }, [deleteMode]);

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

        // Search filter - include offices even without heads
        const filteredBySearch = offices.filter((o) => {
            const officeName = (o.office_name || '').toLowerCase();
            const headName = (o.head_name || 'unassigned').toLowerCase();
            const officeType = (o.office_type_name || '').toLowerCase();
            const search = searchTerm.toLowerCase();
            
            return officeName.includes(search) || 
                   headName.includes(search) || 
                   officeType.includes(search);
        });

        // Show all offices if no eventType selected, otherwise filter by eventType (EventID)
        // Include offices with NULL event_id when "All Offices" is selected
        const filtered = eventType
            ? filteredBySearch.filter((o) => String(o.event_id) === String(eventType))
            : filteredBySearch;

        // Debug logs
        console.log('Current eventType (EventID):', eventType);
        console.log('All offices:', offices.map(o => ({ name: o.office_name, event_id: o.event_id })));
        console.log('Filtered offices:', filtered.map(o => ({ name: o.office_name, event_id: o.event_id })));

        // Show message if no offices found
        if (filtered.length === 0) {
            return (
                <div className="mt-6 w-full">
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-8 text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No offices found</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {searchTerm ? 'Try adjusting your search term.' : 'No offices are assigned to this event. Try selecting "All Offices" or a different event.'}
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {filtered.map((office) => {
                    // Get all heads for this office
                    const officeHeads = office.heads || [];
                    const hasMultipleHeads = officeHeads.length > 1;
                    
                    // For profile pics, show first head or default
                    const primaryHead = officeHeads[0];
                    const profilePicUrl = primaryHead?.ProfilePic 
                        ? `http://localhost:5000/uploads/profile-pics/${primaryHead.ProfilePic}`
                        : (office.head_profile_pic 
                            ? `http://localhost:5000/uploads/profile-pics/${office.head_profile_pic}`
                            : userIcon);

                    console.log('Office:', office.office_name, 'Heads:', officeHeads.length, 'ProfilePic:', office.head_profile_pic);

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

                            {/* Office Heads Section */}
                            <div className="mt-3">
                                <p className="text-xs font-medium text-gray-500 mb-2">
                                    {officeHeads.length > 0 ? `Head${hasMultipleHeads ? 's' : ''}:` : 'Head:'}
                                </p>
                                
                                {officeHeads.length === 0 ? (
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={userIcon}
                                            alt="Unassigned"
                                            className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                                        />
                                        <span className="text-sm text-gray-400 italic">Unassigned</span>
                                    </div>
                                ) : hasMultipleHeads ? (
                                    <div className="space-y-2">
                                        {/* Stacked avatar display for multiple heads */}
                                        <div className="flex items-center">
                                            <div className="flex -space-x-2">
                                                {officeHeads.slice(0, 3).map((head, index) => {
                                                    const headPicUrl = head.ProfilePic 
                                                        ? `http://localhost:5000/uploads/profile-pics/${head.ProfilePic}`
                                                        : userIcon;
                                                    return (
                                                        <img
                                                            key={head.HeadID}
                                                            src={headPicUrl}
                                                            alt={head.full_name || 'Head'}
                                                            className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
                                                            style={{ zIndex: 10 - index }}
                                                            onError={(e) => { e.target.src = userIcon; }}
                                                            title={head.full_name}
                                                        />
                                                    );
                                                })}
                                                {officeHeads.length > 3 && (
                                                    <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                                                        +{officeHeads.length - 3}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="ml-3 text-sm text-gray-600">
                                                {officeHeads.length} office heads
                                            </span>
                                        </div>
                                        {/* List of names */}
                                        <div className="text-xs text-gray-500 pl-1">
                                            {officeHeads.map(h => h.full_name).join(', ')}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={profilePicUrl}
                                            alt={primaryHead?.full_name || 'Head'}
                                            className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                                            onError={(e) => { e.target.src = userIcon; }}
                                        />
                                        <div className="flex-1">
                                            <p className="text-sm text-gray-700 font-medium">
                                                {primaryHead?.full_name || office.head_name || 'Unassigned'}
                                            </p>
                                            {primaryHead?.Position && (
                                                <p className="text-xs text-gray-500">{primaryHead.Position}</p>
                                            )}
                                        </div>
                                    </div>
                                )}
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
