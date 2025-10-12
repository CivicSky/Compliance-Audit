import React, { useState } from "react";
import Header from "../../components/Header/header.jsx";

export default function Organization() {
    const [requirements] = useState([
        { id: 1, name: "Fire Safety Compliance" },
        { id: 2, name: "Environmental Standards" },
        { id: 3, name: "Data Protection Policy" },
    ]);

    const [organizations, setOrganizations] = useState([
        { id: 1, name: "ABC Corp", compliance: { 1: "comply", 2: "", 3: "not_comply" } },
        { id: 2, name: "XYZ Industries", compliance: { 1: "", 2: "comply", 3: "" } },
    ]);

    const [showAddModal, setShowAddModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [orgToDelete, setOrgToDelete] = useState(null);
    const [newOrgName, setNewOrgName] = useState("");
    const [selectedReqs, setSelectedReqs] = useState([]);

    const handleAddOrganization = () => {
        if (!newOrgName.trim()) return;
        const newOrg = {
            id: Date.now(),
            name: newOrgName,
            compliance: Object.fromEntries(selectedReqs.map((r) => [r, ""])),
        };
        setOrganizations([...organizations, newOrg]);
        setNewOrgName("");
        setSelectedReqs([]);
        setShowAddModal(false);
    };

    const handleDelete = (org) => {
        setOrgToDelete(org);
        setShowDeleteModal(true);
    };

    const confirmDelete = () => {
        setOrganizations(organizations.filter((o) => o.id !== orgToDelete.id));
        setShowDeleteModal(false);
    };

    // ✅ updated logic for checkbox toggling
    const updateCompliance = (orgId, reqId, type) => {
        setOrganizations((prev) =>
            prev.map((org) => {
                if (org.id !== orgId) return org;

                const currentStatus = org.compliance[reqId];
                let newStatus = currentStatus;

                if (type === "comply") {
                    newStatus = currentStatus === "comply" ? "" : "comply";
                } else if (type === "not_comply") {
                    newStatus = currentStatus === "not_comply" ? "" : "not_comply";
                }

                return {
                    ...org,
                    compliance: { ...org.compliance, [reqId]: newStatus },
                };
            })
        );
    };

    return (
        <div className="ml-72 px-6 pb-6 pt-0">
            <Header />

            <div className="flex justify-between items-center mt-8 mb-6">
                <h2 className="text-2xl font-semibold text-slate-800">
                    Organizations
                </h2>
                <div className="flex gap-3">
                    <button
                        className="bg-blue-600 text-white px-4 py-2 rounded-xl shadow hover:bg-blue-700"
                        onClick={() => setShowAddModal(true)}
                    >
                        + Add Organization
                    </button>
                    <button className="bg-green-600 text-white px-4 py-2 rounded-xl shadow hover:bg-green-700">
                        Submit Audit
                    </button>
                </div>
            </div>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {organizations.map((org) => (
                    <div
                        key={org.id}
                        className="bg-white rounded-2xl shadow-md border-2 border-slate-400 overflow-hidden"
                    >
                        <div className="flex justify-between items-center bg-slate-50 px-4 py-3 border-b border-slate-200">
                            <h3 className="font-semibold text-slate-800">{org.name}</h3>
                            <button
                                onClick={() => handleDelete(org)}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm"
                            >
                                Delete
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto max-h-72">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="text-left bg-gray-100">
                                        <th className="py-2 px-2 w-1/2">Requirement</th>
                                        <th className="py-2 px-2 text-center">Comply</th>
                                        <th className="py-2 px-2 text-center">Not Comply</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {requirements.map((r) => (
                                        <tr key={r.id} className="border-b">
                                            <td className="py-2 px-2">{r.name}</td>
                                            <td className="text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={org.compliance[r.id] === "comply"}
                                                    onChange={() => updateCompliance(org.id, r.id, "comply")}
                                                />
                                            </td>
                                            <td className="text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={org.compliance[r.id] === "not_comply"}
                                                    onChange={() =>
                                                        updateCompliance(org.id, r.id, "not_comply")
                                                    }
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>

         
            {showAddModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl p-6 w-96">
                        <h2 className="text-xl font-semibold mb-4">Add Organization</h2>
                        <input
                            type="text"
                            placeholder="Organization Name"
                            value={newOrgName}
                            onChange={(e) => setNewOrgName(e.target.value)}
                            className="w-full mb-3 px-3 py-2 border border-slate-300 rounded-lg"
                        />
                        <p className="text-sm text-gray-500 mb-2">
                            Select requirements for this organization:
                        </p>
                        <div className="max-h-32 overflow-y-auto border rounded-lg p-2 mb-4">
                            {requirements.map((r) => (
                                <label key={r.id} className="block text-sm mb-1">
                                    <input
                                        type="checkbox"
                                        value={r.id}
                                        checked={selectedReqs.includes(r.id)}
                                        onChange={(e) =>
                                            setSelectedReqs((prev) =>
                                                e.target.checked
                                                    ? [...prev, r.id]
                                                    : prev.filter((id) => id !== r.id)
                                            )
                                        }
                                        className="mr-2"
                                    />
                                    {r.name}
                                </label>
                            ))}
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="px-4 py-2 rounded-lg bg-gray-300 hover:bg-gray-400"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddOrganization}
                                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                            >
                                Add
                            </button>
                        </div>
                    </div>
                </div>
            )}

          
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl p-6 w-80">
                        <h2 className="text-lg font-semibold mb-4 text-red-600">
                            Delete Organization
                        </h2>
                        <p className="text-gray-700 mb-6">
                            Are you sure you want to delete{" "}
                            <span className="font-semibold">{orgToDelete?.name}</span>?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="px-4 py-2 rounded-lg bg-gray-300 hover:bg-gray-400"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
