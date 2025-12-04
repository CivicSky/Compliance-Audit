import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { officesAPI } from "../../utils/api";

const OfficesP = forwardRef(({ searchTerm, deleteMode, onSelectionChange, onOfficeClick }, ref) => {
    const [offices, setOffices] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);

    const fetchOffices = async () => {
        try {
            const res = await officesAPI.getAll();
            setOffices(res.data);
        } catch (err) {
            console.error("Failed to load offices:", err);
        }
    };

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
        }
    }));

    useEffect(() => {
        fetchOffices();
    }, []);

    useEffect(() => {
        onSelectionChange(selectedIds.length, selectedIds);
    }, [selectedIds]);

    const handleCheckboxChange = (id, checked) => {
        if (checked) setSelectedIds([...selectedIds, id]);
        else setSelectedIds(selectedIds.filter((i) => i !== id));
    };

    const filtered = offices.filter((o) =>
        o.office_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {filtered.map((office) => (
                <div
                    key={office.id}
                    className={`bg-white rounded-md p-4 w-full shadow-md hover:shadow-lg transform transition-all duration-300 border border-gray-200 cursor-pointer ${selectedIds.includes(office.id) ? "bg-blue-50" : ""
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
                                        : "bg-orange-500"
                                }`}
                        >
                            {office.status}
                        </span>
                    </div>

                    <p className="text-xs text-gray-500 mt-2">Type: {office.office_type}</p>
                    <p className="text-xs text-gray-500">Head ID: {office.head_id}</p>
                    <p className="text-xs text-gray-500">Progress: {office.progress}%</p>

                    {deleteMode && (
                        <div className="mt-2">
                            <input
                                type="checkbox"
                                checked={selectedIds.includes(office.id)}
                                onChange={(e) => handleCheckboxChange(office.id, e.target.checked)}
                            />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
});

export default OfficesP;
