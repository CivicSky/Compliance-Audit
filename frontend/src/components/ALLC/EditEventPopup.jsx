import { useState, useEffect } from "react";

export default function EditEventPopup({ open, event, onCancel, onConfirm }) {
    const [eventName, setEventName] = useState("");
    const [eventCode, setEventCode] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState("active");

    // When event changes or popup opens, update fields
    useEffect(() => {
        if (event) {
            setEventName(event.EventName || "");
            setEventCode(event.EventCode || "");
            setDescription(event.Description || "");
            setStatus(event.status || "active");
        }
    }, [event, open]);

    if (!open) return null;

    return (
        <div className="fixed inset-y-0 right-0 left-0 lg:left-[var(--sidebar-width)] lg:transition-[left] lg:duration-200 lg:ease-in-out bg-black bg-opacity-40 flex items-center justify-center z-[120]">
            <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">Edit Event</h2>
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Event Name</label>
                    <input
                        type="text"
                        className="w-full border rounded px-3 py-2"
                        value={eventName}
                        onChange={e => setEventName(e.target.value)}
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Event Code</label>
                    <input
                        type="text"
                        className="w-full border rounded px-3 py-2"
                        value={eventCode}
                        onChange={e => setEventCode(e.target.value)}
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                        className="w-full border rounded px-3 py-2"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select
                        className="w-full border rounded px-3 py-2"
                        value={status}
                        onChange={e => setStatus(e.target.value)}
                    >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
                <div className="flex justify-end gap-2">
                    <button
                        className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button
                        className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                        onClick={() => {
                            console.log('EditEventPopup onConfirm:', { EventName: eventName, EventCode: eventCode, Description: description, status });
                            onConfirm({ EventName: eventName, EventCode: eventCode, Description: description, status });
                        }}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}

