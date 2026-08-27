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
    const [isSaving, setIsSaving] = useState(false);

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
        setOfficeName(office.office_name || office.OfficeName || "");
        setOfficeTypeID(office.office_type || office.office_type_id || office.OfficeTypeID || "");
        setSelectedDepartmentID(office.department_id || office.DepartmentID || office.departmentID || "");
        setSelectedProgramTypeID(office.program_type_id || office.ProgramTypeID || office.programTypeID || "");

        let headIds = [];
        if (Array.isArray(office.head_ids) && office.head_ids.length > 0) {
            headIds = office.head_ids;
        } else if (Array.isArray(office.HeadIDs) && office.HeadIDs.length > 0) {
            headIds = office.HeadIDs;
        } else if (Array.isArray(office.heads) && office.heads.length > 0) {
            headIds = office.heads.map(h => h.HeadID ?? h.head_id ?? h.id ?? h.UserID);
        } else if (office.head_id) {
            headIds = [office.head_id];
        } else if (office.HeadID) {
            headIds = [office.HeadID];
        }

        setSelectedHeadIDs(headIds.map(Number).filter(n => !isNaN(n)));
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

    const getHeadId = (h) => Number(h?.HeadID ?? h?.head_id ?? h?.UserID ?? h?.user_id ?? h?.id);

    // Toggle head selection
    const toggleHeadSelection = (rawId) => {
        const headId = Number(rawId);
        const selectedNums = selectedHeadIDs.map(Number);

        if (!selectedNums.includes(headId) && selectedNums.length >= MAX_HEADS) {
            showAlert(`You can select up to ${MAX_HEADS} heads.`);
            return;
        }

        setSelectedHeadIDs(prev => {
            const nums = prev.map(Number);
            if (nums.includes(headId)) {
                return nums.filter(id => id !== headId);
            } else {
                return [...nums, headId];
            }
        });
    };

    // Get selected heads display text
    const getSelectedHeadsText = () => {
        const selectedNums = selectedHeadIDs.map(Number);
        if (selectedNums.length === 0) return "Select Head(s)";
        const selectedHeads = heads.filter(h => selectedNums.includes(getHeadId(h)));
        if (selectedHeads.length === 1 && selectedHeads[0]) {
            const h = selectedHeads[0];
            return `${h.FirstName || h.first_name || ''} ${h.LastName || h.last_name || ''}`.trim() || '1 head selected';
        }
        if (selectedHeads.length > 0) {
            return `${selectedHeads.length} heads selected`;
        }
        return `${selectedNums.length} heads selected`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!office || isSaving) return;

        const updatedOffice = {
            master_list_id: office.master_list_id || null,
            OfficeName: officeName,
            OfficeTypeID: officeTypeID,
            HeadIDs: selectedHeadIDs.map(id => parseInt(id, 10)).filter(id => !isNaN(id)),
            EventID: office.event_id || office.EventID || null,
        };

        setIsSaving(true);
        try {
            if (typeof onSave === 'function') {
                const res = await onSave({ id: office.id || office.OfficeID, ...updatedOffice });
                if (res && res.success === false) {
                    return;
                }
            }
            onClose();
        } catch (err) {
            console.error("Failed to save office personnel:", err);
        } finally {
            setIsSaving(false);
        }
    };


    if (!visible) return null;

    const safeHeads = Array.isArray(heads) ? heads : [];

    return (
        <div className="fixed inset-y-0 right-0 left-0 lg:left-[var(--sidebar-width)] lg:transition-[left] lg:duration-200 lg:ease-in-out z-[50] flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
                    <h2 className="text-lg font-bold text-gray-900">{isAdmin ? 'Edit Office' : 'View Office'}</h2>
                    <button 
                        onClick={onClose} 
                        disabled={isSaving}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed" 
                        aria-label="Close"
                    >
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
                            disabled={!isAdmin}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                            placeholder="Enter office name"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-1">Office Type</label>
                        <select
                            value={officeTypeID}
                            onChange={(e) => setOfficeTypeID(e.target.value)}
                            disabled={!isAdmin}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                            required
                        >
                            <option value="">Select Office Type</option>
                            {officeTypes?.map((type) => (
                                <option key={type.OfficeTypeID || type.id} value={type.OfficeTypeID || type.id}>
                                    {type.TypeName || type.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {isAcademicType(officeTypeID) && (
                        <>
                            <div>
                                <label className="block text-sm font-semibold text-gray-800 mb-1">Department</label>
                                <select
                                    value={selectedDepartmentID}
                                    onChange={(e) => setSelectedDepartmentID(e.target.value)}
                                    disabled={!isAdmin}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                                >
                                    <option value="">Select Department (Optional)</option>
                                    {departments.map((dept) => (
                                        <option key={dept.id ?? dept.DepartmentID} value={dept.id ?? dept.DepartmentID}>
                                            {dept.name || dept.DepartmentName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {departmentRequiresProgramTypes(departments.find(d => String(d.id ?? d.DepartmentID) === String(selectedDepartmentID))) && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-1">Program Type</label>
                                    <select
                                        value={selectedProgramTypeID}
                                        onChange={(e) => setSelectedProgramTypeID(e.target.value)}
                                        disabled={!isAdmin}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                                    >
                                        <option value="">Select Program Type (Optional)</option>
                                        {programTypes.map((pt) => (
                                            <option key={pt.id ?? pt.ProgramTypeID} value={pt.id ?? pt.ProgramTypeID}>
                                                {pt.name || pt.ProgramTypeName || pt.TypeName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-1">
                            Office Head(s) <span className="text-xs text-gray-400 font-normal">(Max {MAX_HEADS})</span>
                        </label>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => isAdmin && setShowHeadDropdown(!showHeadDropdown)}
                                disabled={!isAdmin}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-left bg-white text-gray-900 flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                            >
                                <span className={selectedHeadIDs.length === 0 ? "text-gray-400" : "text-gray-900 font-medium"}>
                                    {getSelectedHeadsText()}
                                </span>
                                <svg className={`h-4 w-4 text-gray-400 transition-transform ${showHeadDropdown ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>

                            {/* Dropdown Menu */}
                            <div className={`mt-2 max-h-60 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg p-2 space-y-1 ${showHeadDropdown ? 'block' : 'hidden'}`}>
                                <div className="p-1 mb-1 border-b border-gray-100">
                                    <input
                                        type="text"
                                        placeholder="Search heads..."
                                        value={headSearchTerm}
                                        onChange={(e) => setHeadSearchTerm(e.target.value)}
                                        className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                                {loadingHeads ? (
                                    <div className="p-3 text-center text-xs text-gray-500">Loading heads...</div>
                                ) : filteredHeads.length === 0 ? (
                                    <div className="p-3 text-center text-xs text-gray-500">No heads found</div>
                                ) : (
                                    filteredHeads.map((head) => {
                                        const hId = getHeadId(head);
                                        const isSelected = selectedHeadIDs.map(Number).includes(hId);
                                        const isAssigned = head.isAssigned && !isSelected;
                                        const fullName = getHeadDisplayName(head);
                                        const picUrl = getHeadPicUrl(head);

                                        return (
                                            <label
                                                key={hId}
                                                className={`flex items-center gap-3 p-2 rounded cursor-pointer transition ${
                                                    isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
                                                } ${isAssigned ? 'opacity-60' : ''}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleHeadSelection(hId)}
                                                    disabled={!isSelected && isHeadLimitReached}
                                                    className="rounded text-blue-600 focus:ring-blue-500"
                                                />
                                                {picUrl ? (
                                                    <img
                                                        src={picUrl}
                                                        alt={fullName || 'Head'}
                                                        className="h-10 w-10 rounded-full object-cover border border-gray-200"
                                                    />
                                                ) : (
                                                    <div className="h-10 w-10 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center border border-gray-200">
                                                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.75 7.5a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 19.5a7.5 7.5 0 0 1 15 0" />
                                                        </svg>
                                                    </div>
                                                )}
                                                <span className="flex-1 self-center text-sm leading-snug">
                                                    <span className="font-medium text-gray-800">{fullName || `Head #${head.HeadID}`}</span>
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
                                    disabled={isSaving}
                                    className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {isSaving && (
                                        <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                    )}
                                    <span>{isSaving ? "Saving..." : "Save"}</span>
                                </button>
                            </>
                        )}
                        {!isAdmin && (
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSaving}
                                className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
