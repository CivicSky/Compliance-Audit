import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { officesAPI } from "../../utils/api";
import userIcon from "../../assets/images/user.svg";

const OfficesP = forwardRef(
    ({ searchTerm, deleteMode, onSelectionChange, onOfficeClick, eventType, officeTypes, heads, viewMode = 'grid' }, ref) => {
        const [offices, setOffices] = useState([]);
        const [selectedIds, setSelectedIds] = useState([]);
        const [loading, setLoading] = useState(true);

        // Fetch offices from backend
        const fetchOffices = async () => {
            try {
                setLoading(true);
                const res = await officesAPI.getAll();
                const officesData = Array.isArray(res) ? res : (res && res.data) || [];
                setOffices(officesData);
                setSelectedIds([]);
            } catch (err) {
                console.error("Failed to load offices:", err);
                setOffices([]);
            } finally {
                setLoading(false);
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
        }, [selectedIds, onSelectionChange]);

        const handleCheckboxChange = (id, checked) => {
            if (checked) setSelectedIds([...selectedIds, id]);
            else setSelectedIds(selectedIds.filter((i) => i !== id));
        };

        // Get status badge style
        const getStatusStyle = (status) => {
            switch(status) {
                case 'Complied':
                    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
                case 'Partially Complied':
                    return 'bg-amber-50 text-amber-700 border-amber-200';
                default:
                    return 'bg-rose-50 text-rose-700 border-rose-200';
            }
        };

        const getStatusDot = (status) => {
            switch(status) {
                case 'Complied': return 'bg-emerald-500';
                case 'Partially Complied': return 'bg-amber-500';
                default: return 'bg-rose-500';
            }
        };

        // Search filter
        const filteredBySearch = offices.filter((o) => {
            const officeName = (o.office_name || '').toLowerCase();
            const headName = (o.head_name || 'unassigned').toLowerCase();
            const officeType = (o.office_type_name || '').toLowerCase();
            const search = searchTerm.toLowerCase();
            
            return officeName.includes(search) || 
                   headName.includes(search) || 
                   officeType.includes(search);
        });

        // Filter by event type
        const filtered = eventType
            ? filteredBySearch.filter((o) => String(o.event_id) === String(eventType))
            : filteredBySearch;

        if (loading) {
            return (
                <div className="w-full py-12">
                    <div className="flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
                        <span className="mt-3 text-sm text-gray-500">Loading offices...</span>
                    </div>
                </div>
            );
        }

        if (filtered.length === 0) {
            return (
                <div className="w-full py-12">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center">
                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <h3 className="text-sm font-medium text-gray-900 mb-1">No offices found</h3>
                        <p className="text-xs text-gray-500">
                            {searchTerm ? 'Try adjusting your search term.' : 'No offices are assigned to this event.'}
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {/* Grid View */}
                {viewMode === 'grid' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filtered.map((office) => {
                            const officeHeads = office.heads || [];
                            const hasMultipleHeads = officeHeads.length > 1;
                            
                            const primaryHead = officeHeads[0];
                            const profilePicUrl = primaryHead?.ProfilePic 
                                ? `http://localhost:5000/uploads/profile-pics/${primaryHead.ProfilePic}`
                                : (office.head_profile_pic 
                                    ? `http://localhost:5000/uploads/profile-pics/${office.head_profile_pic}`
                                    : userIcon);

                            const isSelected = selectedIds.includes(office.id);

                            return (
                                <div
                                    key={office.id}
                                    onClick={() => !deleteMode && onOfficeClick(office)}
                                    className={`
                                        relative bg-white rounded-xl border transition-all duration-200
                                        ${deleteMode 
                                            ? 'border-gray-200 hover:border-gray-300' 
                                            : 'border-gray-100 hover:border-indigo-200 hover:shadow-sm cursor-pointer'
                                        }
                                        ${isSelected ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/30' : ''}
                                    `}
                                >
                                    <div className="p-4">
                                        {/* Header */}
                                        <div className="flex items-start justify-between mb-3">
                                            <h3 className="text-sm font-semibold text-gray-900 truncate max-w-[140px]">
                                                {office.office_name}
                                            </h3>
                                            <span className="px-2 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                                                {office.office_type_name}
                                            </span>
                                        </div>

                                        {/* Status Bar */}
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-xs text-gray-500">
                                                {office.total_requirements || 0} req
                                            </span>
                                            <span className={`
                                                inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border
                                                ${getStatusStyle(office.overall_status)}
                                            `}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(office.overall_status)}`}></span>
                                                {office.overall_status === 'Partially Complied' ? 'Partial' : office.overall_status}
                                            </span>
                                        </div>

                                        {/* Personnel Section */}
                                        <div className="border-t border-gray-100 pt-3">
                                            <p className="text-xs text-gray-500 mb-2">Personnel</p>
                                            
                                            {officeHeads.length === 0 ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                                                        <img src={userIcon} alt="Unassigned" className="w-6 h-6 opacity-50" />
                                                    </div>
                                                    <span className="text-xs text-gray-400">Unassigned</span>
                                                </div>
                                            ) : hasMultipleHeads ? (
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex -space-x-2">
                                                            {officeHeads.slice(0, 3).map((head, index) => {
                                                                const headPicUrl = head.ProfilePic 
                                                                    ? `http://localhost:5000/uploads/profile-pics/${head.ProfilePic}`
                                                                    : userIcon;
                                                                return (
                                                                    <img
                                                                        key={head.HeadID}
                                                                        src={headPicUrl}
                                                                        alt={head.full_name}
                                                                        className="w-7 h-7 rounded-full object-cover border-2 border-white shadow-sm"
                                                                        style={{ zIndex: 10 - index }}
                                                                        onError={(e) => { e.target.src = userIcon; }}
                                                                        title={head.full_name}
                                                                    />
                                                                );
                                                            })}
                                                            {officeHeads.length > 3 && (
                                                                <div className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                                                                    +{officeHeads.length - 3}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className="text-xs text-gray-500">
                                                            {officeHeads.length}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 truncate" title={officeHeads.map(h => h.full_name).join(', ')}>
                                                        {officeHeads.map(h => h.full_name.split(' ')[0]).join(', ')}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <img
                                                        src={profilePicUrl}
                                                        alt={primaryHead?.full_name}
                                                        className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
                                                        onError={(e) => { e.target.src = userIcon; }}
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-medium text-gray-700 truncate">
                                                            {primaryHead?.full_name || office.head_name}
                                                        </p>
                                                        {primaryHead?.Position && (
                                                            <p className="text-xs text-gray-400 truncate">{primaryHead.Position}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Delete Checkbox */}
                                        {deleteMode && (
                                            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        handleCheckboxChange(office.id, e.target.checked);
                                                    }}
                                                    className="w-3.5 h-3.5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                                />
                                                <span className="text-xs text-gray-500">Select for deletion</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* List View */}
                {viewMode === 'list' && (
                    <div className="space-y-2">
                        {filtered.map((office) => {
                            const officeHeads = office.heads || [];
                            const primaryHead = officeHeads[0];
                            const profilePicUrl = primaryHead?.ProfilePic 
                                ? `http://localhost:5000/uploads/profile-pics/${primaryHead.ProfilePic}`
                                : (office.head_profile_pic 
                                    ? `http://localhost:5000/uploads/profile-pics/${office.head_profile_pic}`
                                    : userIcon);

                            const isSelected = selectedIds.includes(office.id);

                            return (
                                <div
                                    key={office.id}
                                    onClick={() => !deleteMode && onOfficeClick(office)}
                                    className={`
                                        bg-white rounded-lg border transition-all duration-200
                                        ${deleteMode 
                                            ? 'border-gray-200 hover:border-gray-300' 
                                            : 'border-gray-100 hover:border-indigo-200 hover:shadow-sm cursor-pointer'
                                        }
                                        ${isSelected ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/30' : ''}
                                    `}
                                >
                                    <div className="px-4 py-3">
                                        <div className="flex items-center gap-4">
                                            {/* Office Icon */}
                                            <div className="flex-shrink-0 w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                                                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                </svg>
                                            </div>

                                            {/* Office Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-sm font-medium text-gray-900">
                                                        {office.office_name}
                                                    </h3>
                                                    <span className="px-2 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-full">
                                                        {office.office_type_name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-xs text-gray-500">
                                                        {office.total_requirements || 0} requirements
                                                    </span>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusStyle(office.overall_status)}`}>
                                                        <span className={`w-1 h-1 rounded-full ${getStatusDot(office.overall_status)}`}></span>
                                                        {office.overall_status}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Personnel */}
                                            <div className="flex items-center gap-2">
                                                {officeHeads.length > 0 ? (
                                                    <>
                                                        <div className="flex -space-x-2">
                                                            {officeHeads.slice(0, 3).map((head) => (
                                                                <img
                                                                    key={head.HeadID}
                                                                    src={head.ProfilePic ? `http://localhost:5000/uploads/profile-pics/${head.ProfilePic}` : userIcon}
                                                                    alt={head.full_name}
                                                                    className="w-6 h-6 rounded-full object-cover border-2 border-white"
                                                                    onError={(e) => { e.target.src = userIcon; }}
                                                                />
                                                            ))}
                                                        </div>
                                                        <span className="text-xs text-gray-500">
                                                            {officeHeads.length}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-gray-400">No personnel</span>
                                                )}
                                            </div>

                                            {/* Delete Checkbox */}
                                            {deleteMode && (
                                                <div className="flex-shrink-0">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            e.stopPropagation();
                                                            handleCheckboxChange(office.id, e.target.checked);
                                                        }}
                                                        className="w-3.5 h-3.5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }
);

export default OfficesP;