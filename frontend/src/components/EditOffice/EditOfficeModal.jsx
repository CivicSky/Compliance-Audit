import React, { useState, useEffect } from "react";

export default function EditOfficeModal({ visible, onClose, office, onSave, officeTypes, heads }) {
    const [officeName, setOfficeName] = useState("");
    const [officeTypeID, setOfficeTypeID] = useState("");
    const [headID, setHeadID] = useState("");
    const [status, setStatus] = useState("Active");
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!office) return;

        setOfficeName(office.office_name || "");
        setOfficeTypeID(office.office_type || "");
        setHeadID(office.head_id || "");
        setStatus(office.status || "Active");
        setProgress(office.progress || 0);
    }, [office]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!office) return;

        const updatedOffice = {
            office_name: officeName,
            office_type: officeTypeID,
            head_id: headID,
            status,
            progress,
        };

        onSave({ id: office.id, ...updatedOffice });
        onClose();
    };

    if (!visible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                <h2 className="text-lg font-bold mb-4">Edit Office</h2>
                <form onSubmit={handleSubmit} className="space-y-3">
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
                                <option key={type.id} value={type.id}>
                                    {type.name}
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
                                <option key={head.id} value={head.id}>
                                    {head.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold">Status</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full border rounded px-2 py-1"
                        >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="Complied">Complied</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold">Progress (%)</label>
                        <input
                            type="number"
                            value={progress}
                            onChange={(e) => setProgress(e.target.value)}
                            className="w-full border rounded px-2 py-1"
                            min={0}
                            max={100}
                        />
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
                        >
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
