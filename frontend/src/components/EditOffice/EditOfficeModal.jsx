
import React, { useState, useEffect } from "react";
import { officeHeadsAPI } from "../../utils/api";

export default function EditOfficeModal({ visible, onClose, office, onSave, officeTypes, userRole = 'user' }) {
    const [officeName, setOfficeName] = useState("");
    const [officeTypeID, setOfficeTypeID] = useState("");
    const [selectedHeadIDs, setSelectedHeadIDs] = useState([]); // Array for multiple heads
    const [heads, setHeads] = useState([]);
    const [loadingHeads, setLoadingHeads] = useState(false);
    const [showHeadDropdown, setShowHeadDropdown] = useState(false);
    const isAdmin = userRole === 'admin' || userRole === 1;

    useEffect(() => {
        if (!office) return;
        setOfficeName(office.office_name || "");
        setOfficeTypeID(office.office_type || office.office_type_id || "");
        // Support both single head_id (legacy) and head_ids array (new)
        const headIds = office.head_ids || (office.head_id ? [office.head_id] : []);
        setSelectedHeadIDs(headIds);
    }, [office]);

    // Fetch heads when modal opens
    useEffect(() => {
        if (!visible) return;
        setLoadingHeads(true);
        setShowHeadDropdown(false);
        const fetchHeads = async () => {
            try {
                const headsArr = await officeHeadsAPI.getAllHeads();
                // API returns array directly now
                const headsData = Array.isArray(headsArr) ? headsArr : (headsArr?.data || []);
                setHeads(headsData);
            } catch (err) {
                setHeads([]);
            } finally {
                setLoadingHeads(false);
            }
        };
        fetchHeads();
    }, [visible]);

    // Toggle head selection
    const toggleHeadSelection = (headId) => {
        setSelectedHeadIDs(prev => {
            if (prev.includes(headId)) {
                return prev.filter(id => id !== headId);
            } else {
                return [...prev, headId];
            }
        });
    };

    // Get selected heads display text
    const getSelectedHeadsText = () => {
        if (selectedHeadIDs.length === 0) return "Select Head(s)";
        const selectedHeads = heads.filter(h => selectedHeadIDs.includes(h.HeadID));
        if (selectedHeads.length === 1 && selectedHeads[0]) {
            const h = selectedHeads[0];
            return `${h.FirstName} ${h.LastName}`;
        }
        if (selectedHeads.length > 0) {
            return `${selectedHeads.length} heads selected`;
        }
        return `${selectedHeadIDs.length} heads selected`;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!office) return;

        const updatedOffice = {
            OfficeName: officeName,
            OfficeTypeID: officeTypeID,
            HeadIDs: selectedHeadIDs.map(id => parseInt(id)), // Send array of head IDs
            EventID: office.event_id || office.EventID || null,
        };

        onSave({ id: office.id, ...updatedOffice });
        onClose();
    };

    if (!visible) return null;

    const safeHeads = Array.isArray(heads) ? heads : [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                <h2 className="text-lg font-bold mb-4">{isAdmin ? 'Edit Office' : 'View Office'}</h2>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="block text-sm font-semibold">Office Name</label>
                        <input
                            type="text"
                            value={officeName}
                            onChange={(e) => setOfficeName(e.target.value)}
                            className="w-full border rounded px-2 py-1"
                            disabled={!isAdmin}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold">Office Type</label>
                        <select
                            value={officeTypeID}
                            onChange={(e) => setOfficeTypeID(e.target.value)}
                            className="w-full border rounded px-2 py-1"
                            disabled={!isAdmin}
                            required
                        >
                            <option value="">Select Type</option>
                            {officeTypes.map((type) => (
                                <option key={type.OfficeTypeID || type.id} value={type.OfficeTypeID || type.id}>
                                    {type.TypeName || type.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="relative">
                        <label className="block text-sm font-semibold">Head(s) <span className="text-gray-500 font-normal text-xs">(select one or more)</span></label>
                        {isAdmin ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setShowHeadDropdown(!showHeadDropdown)}
                                    className="w-full border rounded px-2 py-1 text-left bg-white flex justify-between items-center"
                                >
                                    <span className={selectedHeadIDs.length === 0 ? "text-gray-400" : ""}>
                                        {loadingHeads ? "Loading..." : getSelectedHeadsText()}
                                    </span>
                                    <svg className={`w-4 h-4 transition-transform ${showHeadDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                
                                {showHeadDropdown && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                                        {safeHeads.length === 0 ? (
                                            <div className="px-3 py-2 text-gray-500 text-sm">No heads available</div>
                                        ) : (
                                            safeHeads.map((head) => {
                                                const isSelected = selectedHeadIDs.includes(head.HeadID);
                                                // Check if head is assigned to a DIFFERENT office
                                                const isAssignedElsewhere = head.OfficeID && head.OfficeID !== 0 && head.OfficeID !== office?.id;
                                                return (
                                                    <label
                                                        key={head.HeadID}
                                                        className={`flex items-center px-3 py-2 cursor-pointer hover:bg-blue-50 ${isSelected ? 'bg-blue-100' : ''}`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleHeadSelection(head.HeadID)}
                                                            className="mr-2"
                                                        />
                                                        <span className="flex-1">
                                                            {head.FirstName} {head.MiddleInitial ? head.MiddleInitial + "." : ""}{" "}
                                                            {head.LastName} - {head.Position || ''}
                                                            {isAssignedElsewhere && <span className="text-orange-500 text-xs ml-1">(Assigned Elsewhere)</span>}
                                                        </span>
                                                    </label>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="w-full border rounded px-2 py-1 bg-gray-100">
                                {getSelectedHeadsText()}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 mt-3">
                        {isAdmin && (
                            <>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 border rounded hover:bg-gray-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    Save
                                </button>
                            </>
                        )}
                        {!isAdmin && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border rounded hover:bg-gray-100"
                            >
                                Close
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
