import React, { useState, useEffect } from "react";
import { officesAPI, officeHeadsAPI } from "../../utils/api";

export default function AddOfficeModal({ isOpen, onClose, onSuccess, officeTypes, events }) {
    const [officeName, setOfficeName] = useState("");
    const [officeTypeID, setOfficeTypeID] = useState("");
    const [selectedHeadIDs, setSelectedHeadIDs] = useState([]); // Array for multiple heads
    const [eventID, setEventID] = useState("");
    const [heads, setHeads] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showHeadDropdown, setShowHeadDropdown] = useState(false);



    // Reset form & fetch heads when modal opens
    useEffect(() => {
        if (isOpen) {
            setOfficeName("");
            setOfficeTypeID("");
            setSelectedHeadIDs([]);
            setEventID("");
            setShowHeadDropdown(false);

            // Fetch available office heads
            const fetchHeads = async () => {
                try {
                    const headsArr = await officeHeadsAPI.getAllHeads();
                    console.log('Fetched heads:', headsArr);
                    // API returns array directly now
                    const headsData = Array.isArray(headsArr) ? headsArr : (headsArr?.data || []);
                    // Show all heads - don't filter by assignment status
                    // Users can choose any head, assigned or not
                    setHeads(headsData);
                } catch (err) {
                    console.error("Failed to fetch office heads:", err);
                    setHeads([]);
                }
            };
            fetchHeads();
        }
    }, [isOpen]);

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
        if (selectedHeads.length === 1) {
            const h = selectedHeads[0];
            return `${h.FirstName} ${h.LastName}`;
        }
        return `${selectedHeads.length} heads selected`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!officeName || !officeTypeID || selectedHeadIDs.length === 0 || !eventID) {
            alert("Please fill out all required fields (at least one head must be selected).");
            return;
        }

        setLoading(true);

        try {
            const newOffice = {
                OfficeName: officeName,
                OfficeTypeID: parseInt(officeTypeID),
                HeadIDs: selectedHeadIDs.map(id => parseInt(id)), // Send array of head IDs
                EventID: parseInt(eventID)
            };

            console.log('Submitting office:', newOffice);
            const res = await officesAPI.createOffice(newOffice);
            console.log('Response:', res);
            
            if (res?.success) {
                alert('Office added successfully!');
                onSuccess();
                onClose();
            } else {
                const errorMsg = res?.details || res?.error || res?.message || 'Failed to add office';
                console.error('Backend error:', errorMsg);
                alert(`Error: ${errorMsg}`);
            }
        } catch (err) {
            console.error("Error adding office:", err);
            const errorMsg = err.response?.data?.details || err.response?.data?.error || err.message || "Failed to add office. Please try again.";
            alert(`Database error: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                <h2 className="text-lg font-bold mb-4">
                    Add New Office
                </h2>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="block text-sm font-semibold">Event</label>
                        <select
                            value={eventID}
                            onChange={(e) => setEventID(e.target.value)}
                            className="w-full border rounded px-2 py-1"
                            required
                        >
                            <option value="">Select Event</option>
                            {events && events.map((event) => (
                                <option key={event.EventID} value={event.EventID}>
                                    {event.EventName}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold">Office Name</label>
                        <input
                            type="text"
                            value={officeName}
                            onChange={(e) => setOfficeName(e.target.value)}
                            className="w-full border rounded px-2 py-1"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold">Office Type</label>
                        <select
                            value={officeTypeID}
                            onChange={(e) => setOfficeTypeID(e.target.value)}
                            className="w-full border rounded px-2 py-1"
                            required
                        >
                            <option value="">Select Type</option>
                            {officeTypes.map((type) => (
                                <option key={type.OfficeTypeID} value={type.OfficeTypeID}>
                                    {type.TypeName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="relative">
                        <label className="block text-sm font-semibold">Head(s) <span className="text-gray-500 font-normal text-xs">(select one or more)</span></label>
                        <button
                            type="button"
                            onClick={() => setShowHeadDropdown(!showHeadDropdown)}
                            className="w-full border rounded px-2 py-1 text-left bg-white flex justify-between items-center"
                        >
                            <span className={selectedHeadIDs.length === 0 ? "text-gray-400" : ""}>
                                {getSelectedHeadsText()}
                            </span>
                            <svg className={`w-4 h-4 transition-transform ${showHeadDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        
                        {showHeadDropdown && (
                            <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                                {heads.length === 0 ? (
                                    <div className="px-3 py-2 text-gray-500 text-sm">No heads available</div>
                                ) : (
                                    heads.map((head) => {
                                        const isSelected = selectedHeadIDs.includes(head.HeadID);
                                        const isAssigned = head.OfficeID && head.OfficeID !== 0;
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
                                                    {head.LastName} - {head.Position}
                                                    {isAssigned && <span className="text-orange-500 text-xs ml-1">(Already Assigned)</span>}
                                                </span>
                                            </label>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 mt-3">
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
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="spinner-border spinner-border-sm text-white" role="status" aria-hidden="true"></span>
                            ) : (
                                "Add"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
