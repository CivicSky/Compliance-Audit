import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import CustomSelect from "../UI/CustomSelect";

export default function EditEventPopup({ open, event, onCancel, onConfirm }) {
    const [eventName, setEventName] = useState("");
    const [eventCode, setEventCode] = useState("");
    const [status, setStatus] = useState("active");
    const [accreditationLevel, setAccreditationLevel] = useState("N/A");

    // When event changes or popup opens, update fields
    useEffect(() => {
        if (event) {
            setEventName(event.EventName || "");
            setEventCode(event.EventCode || "");
            setStatus(event.status || "active");
            setAccreditationLevel(event.accreditation_level || "N/A");
        }
    }, [event, open]);

    if (!open) return null;

    const modalContent = (
        <div className="fixed inset-y-0 right-0 left-0 lg:left-[var(--sidebar-width)] lg:transition-[left] lg:duration-200 lg:ease-in-out bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[50]">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg mx-4 max-h-[95vh] overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-slate-200">
                    <h2 className="text-lg font-bold text-gray-800">Edit Accreditation</h2>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-1">Accreditation Name</label>
                        <input
                            type="text"
                            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                            value={eventName}
                            onChange={e => setEventName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-1">Accreditation Code</label>
                        <input
                            type="text"
                            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                            value={eventCode}
                            onChange={e => setEventCode(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-1">Accreditation Level</label>
                        <CustomSelect
                            value={accreditationLevel}
                            onChange={(val) => setAccreditationLevel(val)}
                            options={[
                                { value: "Level I", label: "Level I" },
                                { value: "Level II", label: "Level II" },
                                { value: "Level III", label: "Level III" },
                                { value: "Level IV", label: "Level IV" },
                                { value: "N/A", label: "N/A" }
                            ]}
                            size="md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-1">Status</label>
                        <CustomSelect
                            value={status}
                            onChange={(val) => setStatus(val)}
                            options={[
                                { value: "active", label: "Active" },
                                { value: "inactive", label: "Inactive" }
                            ]}
                            size="md"
                        />
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
                            console.log('EditEventPopup onConfirm:', { EventName: eventName, EventCode: eventCode, Description: null, status, accreditation_level: accreditationLevel });
                            onConfirm({ EventName: eventName, EventCode: eventCode, Description: null, status, accreditation_level: accreditationLevel });
                        }}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}

