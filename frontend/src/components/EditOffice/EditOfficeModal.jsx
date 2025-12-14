
import React, { useState, useEffect } from "react";
import { officeHeadsAPI } from "../../utils/api";

export default function EditOfficeModal({ visible, onClose, office, onSave, officeTypes }) {
    const [officeName, setOfficeName] = useState("");
    const [officeTypeID, setOfficeTypeID] = useState("");
    const [headID, setHeadID] = useState("");
    const [heads, setHeads] = useState([]);
    const [loadingHeads, setLoadingHeads] = useState(false);

    useEffect(() => {
        if (!office) return;
        setOfficeName(office.office_name || "");
        setOfficeTypeID(office.office_type || office.office_type_id || "");
        setHeadID(office.head_id || "");
    }, [office]);

    // Fetch heads when modal opens
    useEffect(() => {
        if (!visible) return;
        setLoadingHeads(true);
        const fetchHeads = async () => {
            try {
                const headsArr = await officeHeadsAPI.getAllHeads();
               setHeads(headsArr.data || []);
            } catch (err) {
                setHeads([]);
            } finally {
                setLoadingHeads(false);
            }
        };
        fetchHeads();
    }, [visible]);

    // Filter heads: show only unassigned heads or the currently assigned head
    const safeHeads = Array.isArray(heads) ? heads : [];
    const availableHeads = safeHeads.filter((head) => {
        const officeId = head.OfficeID ?? head.office_id ?? head.officeId;
        // Always show the currently assigned head (even if assigned), plus all unassigned
        return !officeId || officeId === 0 || officeId === '' || String(head.HeadID) === String(headID);
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!office) return;

        const updatedOffice = {
            OfficeName: officeName,
            OfficeTypeID: officeTypeID,
            HeadID: headID,
            EventID: office.event_id || office.EventID || null,
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
                                <option key={type.OfficeTypeID || type.id} value={type.OfficeTypeID || type.id}>
                                    {type.TypeName || type.name}
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
                            {availableHeads.map((head) => {
                                const id = head.HeadID || head.id;
                                const name = head.FirstName
                                    ? `${head.FirstName} ${head.MiddleInitial ? head.MiddleInitial + '.' : ''} ${head.LastName} - ${head.Position || ''}`
                                    : head.name || '';
                                return (
                                    <option key={id} value={id}>
                                        {name}
                                    </option>
                                );
                            })}
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
                        >
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
