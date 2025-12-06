import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { officesAPI } from "../../utils/api";

const OfficesP = forwardRef(
    ({ searchTerm, deleteMode, onSelectionChange, onOfficeClick, eventType, officeTypes, heads }, ref) => {
        const [offices, setOffices] = useState([]);
        const [selectedIds, setSelectedIds] = useState([]);

        const getOfficeTypeName = (id) => {
            const type = officeTypes.find((t) => t.OfficeTypeID === id);
            return type ? type.TypeName : "Unknown Type";
        };

        const getHeadName = (id) => {
            const head = heads.find((h) => h.HeadID === id);
            if (!head) return "Unknown Head";

            // Build full name safely
            return `${head.FirstName} ${head.MiddleInitial || ""} ${head.LastName}`.trim();
        };

        // Fetch offices from backend
        const fetchOffices = async () => {
            try {
                const res = await officesAPI.getAll();

                // Map backend → frontend format
                const mapped = res.map((o) => ({
                    id: o.OfficeID,
                    office_name: o.OfficeName,
                    office_type_id: o.OfficeTypeID,
                    head_id: o.HeadID,
                    status: o.Status,
                    progress: o.Progress,
                }));

                setOffices(mapped);
                setSelectedIds([]);
            } catch (err) {
                console.error("Failed to load offices:", err);
                setOffices([]);
            }
        };

        // Expose refresh + delete via ref
        useImperativeHandle(ref, () => ({
            refresh: fetchOffices,
            deleteSelected: async (ids) => {
                try {
                    for (let id of ids) await officesAPI.deleteOffice(id);
                    fetchOffices();
                    return { success: true };
                } catch (err) {
                    console.error(err);
                    return { success: false, message: err.message };
                }
            },
        }));

        // Load on mount
        useEffect(() => {
            fetchOffices();
        }, []);

        // Notify parent when selected changes
        useEffect(() => {
            onSelectionChange(selectedIds.length, selectedIds);
        }, [selectedIds]);

        const handleCheckboxChange = (id, checked) => {
            if (checked) setSelectedIds([...selectedIds, id]);
            else setSelectedIds(selectedIds.filter((i) => i !== id));
        };

        // Search filter
        const filteredBySearch = offices.filter((o) =>
            o.office_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        // Event Type Filter (uses OfficeTypeID)
        // You can map your type IDs below:
        // Example:
        const TYPE_MAP = {
            PACUCOA: 1,
            ISO: 2,
            PASSCU: 3,
        };

        const filtered = filteredBySearch.filter(
            (o) => o.office_type_id === TYPE_MAP[eventType]
        );

        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {filtered.map((office) => (
                    <div
                        key={office.id}
                        className={`bg-white rounded-md p-4 w-full shadow-md hover:shadow-lg transition-all border cursor-pointer ${selectedIds.includes(office.id) ? "bg-blue-50" : ""
                            }`}
                        onClick={() => !deleteMode && onOfficeClick(office)}
                    >
                        <div className="flex justify-between items-start">
                            <h3 className="text-base font-semibold">{office.office_name}</h3>

                            <span
                                className={`px-2 py-1 text-xs font-semibold text-white rounded-full ${office.status === "Active"
                                    ? "bg-green-500"
                                    : office.status === "Inactive"
                                        ? "bg-red-500"
                                        : "bg-gray-500"
                                    }`}
                            >
                                {office.status}
                            </span>
                        </div>

                        <p className="text-xs text-gray-500 mt-2">
                            Type: {getOfficeTypeName(office.office_type_id)}
                        </p>

                        <p className="text-xs text-gray-500">
                            Head: {getHeadName(office.head_id)}
                        </p>

                        <p className="text-xs text-gray-500">
                            Progress: {office.progress}%
                        </p>

                        {deleteMode && (
                            <div className="mt-2">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.includes(office.id)}
                                    onChange={(e) =>
                                        handleCheckboxChange(office.id, e.target.checked)
                                    }
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    }
);

export default OfficesP;
