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
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
                    <h2 className="text-lg font-bold text-gray-900">Edit Event</h2>
                    <button onClick={onCancel} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="px-6 py-5 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-1">Event Name</label>
                        <input
                            type="text"
                            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            value={eventName}
                            onChange={e => setEventName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-1">Event Code</label>
                        <input
                            type="text"
                            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            value={eventCode}
                            onChange={e => setEventCode(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-1">Description</label>
                        <textarea
                            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            rows={4}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-1">Status</label>
                        <div className="relative">
                            <select
                                className="h-10 w-full appearance-none rounded-md border border-slate-200 bg-white px-3 pr-9 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                value={status}
                                onChange={e => setStatus(e.target.value)}
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                            <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-slate-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-white">
                    <button
                        className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button
                        className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
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

