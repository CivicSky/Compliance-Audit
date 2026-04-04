import React, { useState, useEffect, useMemo } from "react";
import { officesAPI, officeHeadsAPI } from "../../utils/api";

const MAX_HEADS = 4;

export default function AddOfficeModal({ isOpen, onClose, onSuccess, officeTypes, events }) {
    const [officeName, setOfficeName] = useState("");
    const [officeTypeID, setOfficeTypeID] = useState("");
    const [selectedHeadIDs, setSelectedHeadIDs] = useState([]); // Array for multiple heads
    const [eventID, setEventID] = useState("");
    const [heads, setHeads] = useState([]);
    const [loading, setLoading] = useState(false);
    const [headSearchTerm, setHeadSearchTerm] = useState("");

    const getHeadDisplayName = (head) => {
        return `${head?.FirstName || ""} ${head?.MiddleInitial ? `${head.MiddleInitial}.` : ""} ${head?.LastName || ""}`
            .replace(/\s+/g, " ")
            .trim();
    };

    const getHeadPicUrl = (head) => {
        return head?.ProfilePic ? `http://localhost:5000/uploads/profile-pics/${head.ProfilePic}` : null;
    };

    const activeEvents = useMemo(() => {
        const list = Array.isArray(events) ? events : [];
        return list.filter((event) => {
            const rawStatus = String(event?.status ?? event?.Status ?? "").toLowerCase().trim();
            return rawStatus === "active";
        });
    }, [events]);

    const filteredHeads = useMemo(() => {
        const query = headSearchTerm.trim().toLowerCase();
        if (!query) return heads;

        return heads.filter((head) => {
            const fullName = `${head.FirstName || ""} ${head.MiddleInitial ? `${head.MiddleInitial}.` : ""} ${head.LastName || ""}`
                .replace(/\s+/g, " ")
                .trim()
                .toLowerCase();
            const position = String(head.Position || "").toLowerCase();
            return fullName.includes(query) || position.includes(query);
        });
    }, [heads, headSearchTerm]);



    // Reset form & fetch heads when modal opens
    useEffect(() => {
        if (isOpen) {
            setOfficeName("");
            setOfficeTypeID("");
            setSelectedHeadIDs([]);
            setEventID("");
            setHeadSearchTerm("");

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
                if (prev.length >= MAX_HEADS) {
                    return prev;
                }
                return [...prev, headId];
            }
        });
    };

    const isHeadLimitReached = selectedHeadIDs.length >= MAX_HEADS;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!officeName || !officeTypeID || selectedHeadIDs.length === 0 || !eventID) {
            alert("Please fill out all required fields (at least one head must be selected).");
            return;
        }

        if (selectedHeadIDs.length > MAX_HEADS) {
            alert(`You can select a maximum of ${MAX_HEADS} heads.`);
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
                console.log('Create office response:', res);

                // Accept several possible backend response shapes
                const success = res?.success === true || res?.data?.success === true || res?.office || res?.OfficeID || res?.id;
                if (success) {
                    alert('Office added successfully!');
                    try { onSuccess(); } catch { }
                    try { onClose(); } catch { }
                } else {
                    const errorMsg = res?.details || res?.error || res?.message || (typeof res === 'string' ? res : 'Failed to add office');
                    console.error('Backend error adding office:', res);
                    alert(`Error adding office: ${errorMsg}`);
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
        <div className="fixed inset-y-0 right-0 left-0 lg:left-[var(--sidebar-width)] lg:transition-[left] lg:duration-200 lg:ease-in-out z-[120] flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-xl h-[86vh] max-h-[90vh] overflow-hidden flex flex-col">
                <h2 className="text-lg font-bold mb-4">
                    Add New Office
                </h2>
                <form onSubmit={handleSubmit} className="mt-1 flex-1 min-h-0 flex flex-col">
                    <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
                        <div>
                            <label className="block text-sm font-semibold">Event</label>
                            <select
                                value={eventID}
                                onChange={(e) => setEventID(e.target.value)}
                                className="w-full border rounded px-2 py-1"
                                disabled={activeEvents.length === 0}
                                required
                            >
                                <option value="">{activeEvents.length === 0 ? "No active events available" : "Select Event"}</option>
                                {activeEvents.map((event) => (
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

                        <div>
                            <label className="block text-sm font-semibold">Head(s) <span className="text-gray-500 font-normal text-xs">(select up to {MAX_HEADS})</span></label>
                            <div className="mt-1 rounded-md border bg-white p-2">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                    <input
                                        type="text"
                                        value={headSearchTerm}
                                        onChange={(e) => setHeadSearchTerm(e.target.value)}
                                        placeholder="Search heads..."
                                        className="w-full border rounded px-2 py-1 text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setSelectedHeadIDs([])}
                                        className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
                                    >
                                        Clear
                                    </button>
                                </div>

                                <div className="mb-2 text-xs text-gray-600">
                                    {selectedHeadIDs.length} selected (max {MAX_HEADS})
                                </div>

                                <div className="h-80 overflow-y-auto space-y-1 pr-1">
                                    {heads.length === 0 ? (
                                        <div className="px-1 py-2 text-gray-500 text-sm">No heads available</div>
                                    ) : filteredHeads.length === 0 ? (
                                        <div className="px-1 py-2 text-gray-500 text-sm">No matching heads</div>
                                    ) : (
                                        filteredHeads.map((head) => {
                                            const isSelected = selectedHeadIDs.includes(head.HeadID);
                                            const isAssigned = head.OfficeID && head.OfficeID !== 0;
                                            const isDisabled = !isSelected && isHeadLimitReached;
                                            const fullName = getHeadDisplayName(head);
                                            const picUrl = getHeadPicUrl(head);

                                            return (
                                                <label
                                                    key={head.HeadID}
                                                    className={`flex items-center gap-2 rounded px-2 py-1.5 border ${isSelected ? 'bg-blue-50 border-blue-200 cursor-pointer' : isDisabled ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed' : 'border-gray-100 hover:bg-gray-50 cursor-pointer'}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        disabled={isDisabled}
                                                        onChange={() => toggleHeadSelection(head.HeadID)}
                                                        className="self-center"
                                                    />
                                                    {picUrl ? (
                                                        <img
                                                            src={picUrl}
                                                            alt={fullName || `Head ${head.HeadID}`}
                                                            className="h-10 w-10 rounded-full object-cover border border-gray-200"
                                                        />
                                                    ) : (
                                                        <div className="h-10 w-10 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center border border-gray-200">
                                                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15.75 7.5a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 19.5a7.5 7.5 0 0 1 15 0" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                    <span className="flex-1 self-center text-sm leading-snug">
                                                        <span className="font-medium text-gray-800">{fullName || `Head #${head.HeadID}`}</span>
                                                        {head.Position && <span className="text-gray-600"> - {head.Position}</span>}
                                                        {isAssigned && <span className="text-orange-500 text-xs ml-1">(Already Assigned)</span>}
                                                    </span>
                                                </label>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-3 shrink-0">
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

