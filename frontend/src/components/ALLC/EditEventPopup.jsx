import { useState } from "react";

export default function EditEventPopup({ open, event, onCancel, onConfirm }) {
    const [eventName, setEventName] = useState(event?.EventName || "");
    const [eventCode, setEventCode] = useState(event?.EventCode || "");
    const [description, setDescription] = useState(event?.Description || "");

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
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
                <div className="mb-6">
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                        className="w-full border rounded px-3 py-2"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                    />
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
                        onClick={() => onConfirm({ eventName, eventCode, description })}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
