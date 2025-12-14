import React, { useState, useEffect } from "react";
import { officesAPI, officeHeadsAPI } from "../../utils/api";

export default function AddOfficeModal({ isOpen, onClose, onSuccess, officeTypes, events }) {
    const [officeName, setOfficeName] = useState("");
    const [officeTypeID, setOfficeTypeID] = useState("");
    const [headID, setHeadID] = useState("");
    const [eventID, setEventID] = useState("");
    const [heads, setHeads] = useState([]);
    const [loading, setLoading] = useState(false);



    // Reset form & fetch heads when modal opens
    useEffect(() => {
        if (isOpen) {
            setOfficeName("");
            setOfficeTypeID("");
            setHeadID("");
            setEventID("");

            // Fetch available office heads
            const fetchHeads = async () => {
                try {
                    const headsArr = await officeHeadsAPI.getAllHeads();
                    console.log('Fetched heads:', headsArr);
                    // Accept heads with OfficeID null, 0, undefined, or empty string
                    const availableHeads = headsArr.filter((head) => {
                        const officeId = head.OfficeID ?? head.office_id ?? head.officeId;
                        return !officeId || officeId === 0 || officeId === '';
                    });
                    setHeads(availableHeads);
                } catch (err) {
                    console.error("Failed to fetch office heads:", err);
                    setHeads([]);
                }
            };
            fetchHeads();
        }
    }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!officeName || !officeTypeID || !headID || !eventID) {
            alert("Please fill out all required fields.");
            return;
        }

        setLoading(true);

        try {
            const newOffice = {
                OfficeName: officeName,
                OfficeTypeID: parseInt(officeTypeID),
                HeadID: parseInt(headID),
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

                    <div>
                        <label className="block text-sm font-semibold">Head</label>
                        <select
                            value={headID}
                            onChange={(e) => setHeadID(e.target.value)}
                            className="w-full border rounded px-2 py-1"
                            required
                        >
                            <option value="">Select Head</option>
                            {heads.map((head) => (
                                <option key={head.HeadID} value={head.HeadID}>
                                    {head.FirstName} {head.MiddleInitial ? head.MiddleInitial + "." : ""}{" "}
                                    {head.LastName} - {head.Position}
                                </option>
                            ))}
                        </select>
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
