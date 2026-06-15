import { API_BASE_URL } from '../../utils/apiBase';

import React, { useState, useEffect, useMemo } from "react";
import { officeHeadsAPI } from "../../utils/api";
import { useModal } from "../UI/ModalProvider";

export default function EditOfficeModal({ visible, onClose, office, onSave, officeTypes, userRole = 'user' }) {
    const [officeName, setOfficeName] = useState("");
    const [officeTypeID, setOfficeTypeID] = useState("");
    const [selectedHeadIDs, setSelectedHeadIDs] = useState([]); // Array for multiple heads
    const [heads, setHeads] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [programTypes, setProgramTypes] = useState([]);
    const [selectedDepartmentID, setSelectedDepartmentID] = useState("");
    const [selectedProgramTypeID, setSelectedProgramTypeID] = useState("");
    const [loadingHeads, setLoadingHeads] = useState(false);
    const [showHeadDropdown, setShowHeadDropdown] = useState(false);
    const isAdmin = userRole === 'admin' || userRole === 1;
    const MAX_HEADS = 4;

    const getHeadDisplayName = (head) => {
        return `${head?.FirstName || ""} ${head?.MiddleInitial ? `${head.MiddleInitial}.` : ""} ${head?.LastName || ""}`
            .replace(/\s+/g, " ")
            .trim();
    };

    const getHeadPicUrl = (head) => {
        return head?.ProfilePic ? `${API_BASE_URL}/uploads/profile-pics/${head.ProfilePic}` : null;
    };

    const [headSearchTerm, setHeadSearchTerm] = useState("");

    const filteredHeads = useMemo(() => {
        const query = headSearchTerm.trim().toLowerCase();
        if (!query) return heads;
        return heads.filter((head) => {
            const fullName = `${head.FirstName || ""} ${head.MiddleInitial ? `${head.MiddleInitial}.` : ""} ${head.LastName || ""}`
                .replace(/\s+/g, " ")
                .trim()
                .toLowerCase();
            const position = String(head.Position || "").toLowerCase();
            return fullName.includes(query) || position.includes(query);
        });
    }, [heads, headSearchTerm]);

    const isHeadLimitReached = selectedHeadIDs.length >= MAX_HEADS;
    const { showAlert } = useModal();

    const getOfficeTypeById = (id) => {
        return officeTypes?.find((t) => String(t.OfficeTypeID || t.id) === String(id));
    };

    const isAcademicType = (officeTypeId) => {
        const t = getOfficeTypeById(officeTypeId);
        const name = String(t?.TypeName || t?.name || '').toLowerCase();
        if (!name) return false;
        if (/\bnon\b|non-?academic|not\s+academic/.test(name)) return false;
        return /\bacademic\b/.test(name);
    };

    const departmentRequiresProgramTypes = (dept) => {
        if (!dept) return true;
        const name = String(dept?.name || dept?.Name || dept).toLowerCase();
        return name !== 'ibed';
    };

    useEffect(() => {
        if (!office) return;
        setOfficeName(office.office_name || "");
        setOfficeTypeID(office.office_type || office.office_type_id || "");
        setSelectedDepartmentID(office.department_id || office.DepartmentID || office.departmentID || "");
        setSelectedProgramTypeID(office.program_type_id || office.ProgramTypeID || office.programTypeID || "");
        // Support both single head_id (legacy) and head_ids array (new)
        const headIds = office.head_ids || (office.head_id ? [office.head_id] : []);
        setSelectedHeadIDs(headIds);
    }, [office]);

    useEffect(() => {
        if (!visible) return;

        const fetchLookups = async () => {
            try {
                let deps = [];
                try {
                    const res = await fetch('/api/departments');
                    if (res.ok) {
                        const json = await res.json();
                        deps = Array.isArray(json) ? json : (json.data || json.departments || []);
                    }
                } catch (err) {
                    // ignore lookup failures
                }

                let ptypes = [];
                try {
                    const res2 = await fetch('/api/program_types');
                    if (res2.ok) {
                        const json2 = await res2.json();
                        ptypes = Array.isArray(json2) ? json2 : (json2.data || json2.program_types || []);
                    }
                } catch (err) {
                    // ignore lookup failures
                }

                setDepartments(Array.isArray(deps) ? deps : []);
                setProgramTypes(Array.isArray(ptypes) ? ptypes : []);
            } catch (err) {
                setDepartments([]);
                setProgramTypes([]);
            }
        };

        fetchLookups();
    }, [visible]);

    // Fetch heads when modal opens
    useEffect(() => {
        if (!visible) return;
        setLoadingHeads(true);
        setShowHeadDropdown(false);
        const fetchHeads = async () => {
            try {
                const headsArr = await officeHeadsAPI.getAllHeads();
                // API returns array directly now
                const headsData = Array.isArray(headsArr) ? headsArr : (headsArr?.data || []);
                setHeads(headsData);
            } catch (err) {
                setHeads([]);
            } finally {
                setLoadingHeads(false);
            }
        };
        fetchHeads();
    }, [visible]);

    useEffect(() => {
        if (!isAcademicType(officeTypeID)) {
            setSelectedDepartmentID("");
            setSelectedProgramTypeID("");
            return;
        }

        if (!selectedDepartmentID) {
            setSelectedProgramTypeID("");
            return;
        }

        const dept = departments.find((d) => String(d.id ?? d.DepartmentID ?? d.ID ?? d.Id) === String(selectedDepartmentID));
        const deptName = String(dept?.name || dept?.DepartmentName || dept?.Name || '').toLowerCase();

        const findProgramTypeId = (match) => {
            if (!Array.isArray(programTypes) || programTypes.length === 0) return null;
            const found = programTypes.find((p) => {
                const pname = String(p.name || p.ProgramTypeName || p.Name || p.TypeName || '').toLowerCase();
                return pname.includes(match);
            });
            return found ? (found.id ?? found.ProgramTypeID ?? found.ID ?? found.Id ?? '') : null;
        };

        if (deptName.includes('graduate')) {
            const id = findProgramTypeId('graduate');
            if (id) setSelectedProgramTypeID(String(id));
            return;
        }

        if (deptName.includes('continuing') || deptName.includes('tcp') || deptName.includes('eteeap')) {
            const id = findProgramTypeId('continu');
            if (id) setSelectedProgramTypeID(String(id));
            return;
        }

        setSelectedProgramTypeID("");
    }, [officeTypeID, selectedDepartmentID, departments, programTypes]);

    // Toggle head selection
    const toggleHeadSelection = (headId) => {
        // Prevent adding more than MAX_HEADS
        if (!selectedHeadIDs.includes(headId) && selectedHeadIDs.length >= MAX_HEADS) {
            showAlert(`You can select up to ${MAX_HEADS} heads.`);
            return;
        }

        setSelectedHeadIDs(prev => {
            if (prev.includes(headId)) {
                return prev.filter(id => id !== headId);
            } else {
                return [...prev, headId];
            }
        });
    };

    // Get selected heads display text
    const getSelectedHeadsText = () => {
        if (selectedHeadIDs.length === 0) return "Select Head(s)";
        const selectedHeads = heads.filter(h => selectedHeadIDs.includes(h.HeadID));
        if (selectedHeads.length === 1 && selectedHeads[0]) {
            const h = selectedHeads[0];
            return `${h.FirstName} ${h.LastName}`;
        }
        if (selectedHeads.length > 0) {
            return `${selectedHeads.length} heads selected`;
        }
        return `${selectedHeadIDs.length} heads selected`;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!office) return;

        if (isAdmin && isAcademicType(officeTypeID)) {
            if (!selectedDepartmentID) {
                showAlert('Please select a department for Academic office types.');
                return;
            }

            const selectedDepartment = departments.find((d) => String(d.id ?? d.DepartmentID ?? d.ID ?? d.Id) === String(selectedDepartmentID));
            if (departmentRequiresProgramTypes(selectedDepartment) && !selectedProgramTypeID) {
                showAlert('Please select a program type for the selected department.');
                return;
            }
        }

        const updatedOffice = {
            OfficeName: officeName,
            OfficeTypeID: officeTypeID,
            HeadIDs: selectedHeadIDs.map(id => parseInt(id)), // Send array of head IDs
            EventID: office.event_id || office.EventID || null,
            DepartmentID: selectedDepartmentID ? parseInt(selectedDepartmentID) : null,
            ProgramTypeID: selectedProgramTypeID ? parseInt(selectedProgramTypeID) : null,
        };

        onSave({ id: office.id, ...updatedOffice });
        onClose();
    };

    if (!visible) return null;

    const safeHeads = Array.isArray(heads) ? heads : [];

    return (
        <div className="fixed inset-y-0 right-0 left-0 lg:left-[var(--sidebar-width)] lg:transition-[left] lg:duration-200 lg:ease-in-out z-[120] flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
                    <h2 className="text-lg font-bold text-gray-900">{isAdmin ? 'Edit Office' : 'View Office'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-1">Office Name</label>
                        <input
                            type="text"
                            value={officeName}
                            onChange={(e) => setOfficeName(e.target.value)}
                            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            disabled={!isAdmin}
                            required
                        />
                    </div>

                    {isAdmin && (
                        <p className="text-xs text-gray-500 mt-1">You can select up to {MAX_HEADS} heads.</p>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-1">Office Type</label>
                        <div className="relative">
                            <select
                                value={officeTypeID}
                                onChange={(e) => setOfficeTypeID(e.target.value)}
                                className="h-10 w-full appearance-none rounded-md border border-slate-200 bg-white px-3 pr-9 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                disabled={!isAdmin}
                                required
                            >
                                <option value="">Select Type</option>
                                {officeTypes.map((type) => (
                                    <option key={type.OfficeTypeID || type.id} value={type.OfficeTypeID || type.id}>
                                        {type.TypeName || type.name}
                                    </option>
                                ))}
                            </select>
                            <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-slate-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>

                    {isAdmin && isAcademicType(officeTypeID) && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-1">Department</label>
                            <div className="relative">
                                <select
                                    value={selectedDepartmentID}
                                    onChange={(e) => {
                                        setSelectedDepartmentID(e.target.value);
                                        setSelectedProgramTypeID("");
                                    }}
                                    className="h-10 w-full appearance-none rounded-md border border-slate-200 bg-white px-3 pr-9 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    required
                                >
                                    <option value="">Select Department</option>
                                    {departments.map((d) => {
                                        const id = d.id ?? d.DepartmentID ?? d.ID ?? d.Id;
                                        const name = d.name ?? d.DepartmentName ?? d.Name ?? d.Department;
                                        return (
                                            <option key={id} value={id}>
                                                {name}
                                            </option>
                                        );
                                    })}
                                </select>
                                <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-slate-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                    )}

                    {isAdmin && isAcademicType(officeTypeID) && selectedDepartmentID && departmentRequiresProgramTypes(departments.find((d) => String(d.id ?? d.DepartmentID ?? d.ID ?? d.Id) === String(selectedDepartmentID))) && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-1">Program Type</label>
                            <div className="relative">
                                <select
                                    value={selectedProgramTypeID}
                                    onChange={(e) => setSelectedProgramTypeID(e.target.value)}
                                    className="h-10 w-full appearance-none rounded-md border border-slate-200 bg-white px-3 pr-9 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    required
                                >
                                    <option value="">Select Program Type</option>
                                    {programTypes.map((p) => {
                                        const id = p.id ?? p.ProgramTypeID ?? p.ID ?? p.Id;
                                        const name = p.name ?? p.ProgramTypeName ?? p.Name ?? p.TypeName;
                                        return (
                                            <option key={id} value={id}>
                                                {name}
                                            </option>
                                        );
                                    })}
                                </select>
                                <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-slate-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-gray-800">Head(s) <span className="text-gray-500 font-normal text-xs">(select up to {MAX_HEADS})</span></label>
                        <div className="mt-1 rounded-lg border border-slate-200 bg-white p-3">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <input
                                    type="text"
                                    value={headSearchTerm}
                                    onChange={(e) => setHeadSearchTerm(e.target.value)}
                                    placeholder="Search heads..."
                                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => setSelectedHeadIDs([])}
                                    className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                                >
                                    Clear
                                </button>
                            </div>

                            <div className="mb-2 text-xs text-gray-600">
                                {selectedHeadIDs.length} selected (max {MAX_HEADS})
                            </div>

                            <div className="h-56 overflow-y-auto space-y-1 pr-1">
                                {heads.length === 0 ? (
                                    <div className="px-1 py-2 text-sm text-gray-500">No heads available</div>
                                ) : filteredHeads.length === 0 ? (
                                    <div className="px-1 py-2 text-sm text-gray-500">No matching heads</div>
                                ) : (
                                    filteredHeads.map((head) => {
                                        const isSelected = selectedHeadIDs.includes(head.HeadID);
                                        const isAssigned = head.OfficeID && head.OfficeID !== 0;
                                        const isDisabled = !isSelected && isHeadLimitReached;
                                        const fullName = getHeadDisplayName(head);
                                        const picUrl = getHeadPicUrl(head);

                                        return (
                                            <label
                                                key={head.HeadID}
                                                className={`flex items-center gap-2 rounded-md px-3 py-2 border ${isSelected ? 'bg-cyan-50 border-cyan-200 cursor-pointer' : isDisabled ? 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed' : 'border-slate-100 hover:bg-slate-50 cursor-pointer'}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    disabled={isDisabled}
                                                    onChange={() => toggleHeadSelection(head.HeadID)}
                                                    className="self-center"
                                                />
                                                {picUrl ? (
                                                    <img
                                                        src={picUrl}
                                                        alt={fullName || `Head ${head.HeadID}`}
                                                        className="h-10 w-10 rounded-full object-cover border border-gray-200"
                                                    />
                                                ) : (
                                                    <div className="h-10 w-10 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center border border-gray-200">
                                                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15.75 7.5a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 19.5a7.5 7.5 0 0 1 15 0" />
                                                        </svg>
                                                    </div>
                                                )}
                                                <span className="flex-1 self-center text-sm leading-snug">
                                                    <span className="font-medium text-gray-800">{fullName || `Head #${head.HeadID}`}</span>
                                                    {head.Position && <span className="text-gray-600"> - {head.Position}</span>}
                                                    {isAssigned && <span className="text-orange-500 text-xs ml-1">(Already Assigned)</span>}
                                                </span>
                                            </label>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
                        {isAdmin && (
                            <>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                                >
                                    Save
                                </button>
                            </>
                        )}
                        {!isAdmin && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                                Close
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}

