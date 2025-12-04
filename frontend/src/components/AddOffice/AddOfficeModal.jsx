import React, { useState, useEffect } from "react";
import { officesAPI } from "../../utils/api";

export default function AddOfficeModal({ isOpen, onClose, onSuccess, officeTypes, heads }) {
    const [officeName, setOfficeName] = useState("");
    const [officeTypeID, setOfficeTypeID] = useState("");
    const [headID, setHeadID] = useState("");
    const [status, setStatus] = useState("Active");
    const [progress, setProgress] = useState(0);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setOfficeName("");
            setOfficeTypeID("");
            setHeadID("");
            setStatus("Active");
            setProgress(0);
        }
    }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const newOffice = {
                office_name: officeName,
                office_type: officeTypeID,
                head_id: headID,
                status,
                progress
            };
            const res = await officesAPI.createOffice(newOffice);
            if (res.data) {
                onSuccess(res.data);
                onClose();
            }
        } catch (err) {
            console.error(err);
            alert("Failed to add office");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                <h2 className="text-lg font-bold mb-4">Add New Office</h2>
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
                            Add
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
