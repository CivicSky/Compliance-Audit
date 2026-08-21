import React, { useState, useEffect, useMemo } from "react";
import { officesAPI, officeHeadsAPI, masterlistAPI } from "../../utils/api";
import { useModal } from "../UI/ModalProvider";
import { API_BASE_URL } from '../../utils/apiBase';

const MAX_HEADS = 4;

export default function AddOfficeModal({ isOpen, onClose, onSuccess, officeTypes, events }) {
    const [selectedMasterListIds, setSelectedMasterListIds] = useState([]);
    const [masterListItems, setMasterListItems] = useState([]);
    const [masterListLoading, setMasterListLoading] = useState(false);
    const [selectedHeadIDs, setSelectedHeadIDs] = useState([]);
    const [eventID, setEventID] = useState("");
    const [heads, setHeads] = useState([]);
    const [loading, setLoading] = useState(false);
    const [headSearchTerm, setHeadSearchTerm] = useState("");
    const [categorySearchTerm, setCategorySearchTerm] = useState("");
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [activeCategoryTab, setActiveCategoryTab] = useState("All");

    const { showAlert } = useModal();

    const getHeadDisplayName = (head) => {
        return `${head?.FirstName || ""} ${head?.MiddleInitial ? `${head.MiddleInitial}.` : ""} ${head?.LastName || ""}`
            .replace(/\s+/g, " ")
            .trim();
    };

    const getHeadPicUrl = (head) => {
        return head?.ProfilePic ? `${API_BASE_URL}/uploads/profile-pics/${head.ProfilePic}` : null;
    };

    const activeEvents = useMemo(() => {
        const list = Array.isArray(events) ? events : [];
        return list.filter((event) => {
            const rawStatus = String(event?.status ?? event?.Status ?? "").toLowerCase().trim();
            return rawStatus === "active";
        });
    }, [events]);

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

    const filteredMasterListItems = useMemo(() => {
        let items = masterListItems;

        if (activeCategoryTab === "Programs") {
            items = items.filter(item => item.entityTypeId === 1 || item.type === 'Academic Program');
        } else if (activeCategoryTab === "Offices") {
            items = items.filter(item => item.entityTypeId !== 1 && item.type !== 'Academic Program');
        }

        const query = categorySearchTerm.trim().toLowerCase();
        if (!query) return items;

        return items.filter((item) => {
            const name = String(item.name || "").toLowerCase();
            const type = String(item.type || "").toLowerCase();
            const dept = String(item.department || "").toLowerCase();
            return name.includes(query) || type.includes(query) || dept.includes(query);
        });
    }, [masterListItems, categorySearchTerm, activeCategoryTab]);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedMasterListIds([]);
            setSelectedHeadIDs([]);
            setHeadSearchTerm("");
            setCategorySearchTerm("");
            setIsDraggingOver(false);
            setActiveCategoryTab("All");
            setMasterListItems([]);

            // Auto-select the first active event if available
            const defaultEvent = activeEvents.length > 0 ? String(activeEvents[0].EventID) : "";
            setEventID(defaultEvent);

            const fetchHeads = async () => {
                try {
                    const headsArr = await officeHeadsAPI.getAllHeads();
                    const headsData = Array.isArray(headsArr) ? headsArr : (headsArr?.data || []);
                    setHeads(headsData);
                } catch (err) {
                    console.error("Failed to fetch office heads:", err);
                    setHeads([]);
                }
            };
            fetchHeads();
        }
    }, [isOpen, activeEvents]);

    // Fetch available master list items when eventID changes
    useEffect(() => {
        if (!isOpen || !eventID) {
            setMasterListItems([]);
            setSelectedMasterListIds([]);
            return;
        }

        const fetchAvailableMasterList = async () => {
            setMasterListLoading(true);
            try {
                const res = await masterlistAPI.getAvailableForEvent(eventID);
                const items = Array.isArray(res) ? res : (res.data || []);
                setMasterListItems(items);
            } catch (err) {
                console.error("Failed to fetch available master list items:", err);
                setMasterListItems([]);
            } finally {
                setMasterListLoading(false);
            }
        };

        fetchAvailableMasterList();
    }, [isOpen, eventID]);

    // Selected master list items helper
    const selectedMasterItems = useMemo(() => {
        return masterListItems.filter(item => selectedMasterListIds.includes(String(item.id)));
    }, [masterListItems, selectedMasterListIds]);

    const getOfficeTypeIdForCategory = (item) => {
        if (!item || !Array.isArray(officeTypes) || officeTypes.length === 0) return null;
        
        const isAcademic = item.entityTypeId === 1 || item.type === 'Academic Program';
        
        const matchedType = officeTypes.find(t => {
            const name = String(t.TypeName || t.name || '').toLowerCase();
            if (isAcademic) {
                return name.includes('academic') && !name.includes('non');
            } else {
                return name.includes('non');
            }
        });
        
        return matchedType ? (matchedType.OfficeTypeID || matchedType.id) : (isAcademic ? 2 : 1);
    };

    const toggleHeadSelection = (headId) => {
        setSelectedHeadIDs(prev => {
            if (prev.includes(headId)) {
                return prev.filter(id => id !== headId);
            } else {
                if (prev.length >= MAX_HEADS) return prev;
                return [...prev, headId];
            }
        });
    };

    const isHeadLimitReached = selectedHeadIDs.length >= MAX_HEADS;

    const toggleMasterListSelection = (id) => {
        setSelectedMasterListIds(prev => {
            const strId = String(id);
            if (prev.includes(strId)) {
                return prev.filter(item => item !== strId);
            } else {
                return [...prev, strId];
            }
        });
    };

    const removeMasterListSelection = (id) => {
        setSelectedMasterListIds(prev => prev.filter(item => item !== String(id)));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!eventID || selectedMasterListIds.length === 0 || selectedHeadIDs.length === 0) {
            await showAlert("Please fill out all required fields (select Event, drag/select at least one Category, and assign at least one Head).");
            return;
        }

        if (selectedHeadIDs.length > MAX_HEADS) {
            await showAlert(`You can select a maximum of ${MAX_HEADS} heads.`);
            return;
        }

        setLoading(true);

        try {
            // Loop through all selected category IDs and call createOffice for each
            const creationPromises = selectedMasterItems.map(async (item) => {
                const typeId = getOfficeTypeIdForCategory(item);
                const payload = {
                    master_list_id: parseInt(item.id),
                    OfficeName: item.name || "",
                    OfficeTypeID: parseInt(typeId),
                    HeadIDs: selectedHeadIDs.map(id => parseInt(id)),
                    EventID: parseInt(eventID)
                };
                return officesAPI.createOffice(payload);
            });

            const results = await Promise.all(creationPromises);
            
            const allSuccess = results.every(res => res?.success === true || res?.data?.success === true || res?.office || res?.OfficeID || res?.id);

            if (allSuccess) {
                await showAlert(`Successfully added ${selectedMasterListIds.length} categories to the audit event!`);
                try { onSuccess(); } catch { }
                try { onClose(); } catch { }
            } else {
                await showAlert('Some categories failed to add. Please check the dashboard or logs.');
                try { onSuccess(); } catch { }
                try { onClose(); } catch { }
            }
        } catch (err) {
            console.error("Error adding categories:", err);
            const errorMsg = err.response?.data?.details || err.response?.data?.error || err.message || "Failed to add categories.";
            await showAlert(`Database error: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 left-0 lg:left-[var(--sidebar-width)] lg:transition-[left] lg:duration-200 lg:ease-in-out z-[50] flex items-center justify-center bg-black/50">
            <div className="mx-4 w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-xl flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 shrink-0">
                    <h2 className="text-xl font-bold text-gray-800">Add Category to Audit</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="text-gray-400 transition hover:text-gray-600 disabled:opacity-50"
                    >
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 flex flex-col justify-between min-h-0">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-0 flex-1 mb-6">
                        
                        {/* Left Column - Draggable/Selectable Categories List */}
                        <div className="md:col-span-5 flex flex-col border-b md:border-b-0 md:border-r border-slate-200 pb-6 md:pb-0 md:pr-6 min-h-0">
                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                                1. Drag Category Name <span className="text-xs font-normal text-gray-500">(Master List)</span>
                            </label>
                            
                            <div className="mb-3 flex flex-col gap-2 shrink-0">
                                <input
                                    type="text"
                                    placeholder="Search master list..."
                                    value={categorySearchTerm}
                                    onChange={(e) => setCategorySearchTerm(e.target.value)}
                                    className="h-9 w-full rounded-md border border-slate-200 px-3 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 hover:bg-slate-100/50 focus:bg-white transition-all"
                                    disabled={!eventID || masterListLoading}
                                />
                                
                                {/* Category Type Filter Tabs */}
                                <div className="flex border-b border-slate-200">
                                    {["All", "Programs", "Offices"].map((tab) => {
                                        const isSelected = activeCategoryTab === tab;
                                        return (
                                            <button
                                                key={tab}
                                                type="button"
                                                onClick={() => setActiveCategoryTab(tab)}
                                                className={`pb-1.5 px-3 text-[11px] font-semibold transition-all border-b-2 -mb-[1px] ${
                                                    isSelected 
                                                        ? 'border-blue-600 text-blue-600' 
                                                        : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-350'
                                                }`}
                                                disabled={!eventID || masterListLoading}
                                            >
                                                {tab}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[200px] max-h-[380px]">
                                {!eventID ? (
                                    <div className="flex h-full min-h-[150px] items-center justify-center text-center text-xs text-slate-400 p-4 border border-dashed border-slate-200 rounded-lg">
                                        Select an event on the right to load master list
                                    </div>
                                ) : masterListLoading ? (
                                    <div className="flex h-full min-h-[150px] items-center justify-center text-center text-xs text-slate-400">
                                        Loading master list items...
                                    </div>
                                ) : filteredMasterListItems.length === 0 ? (
                                    <div className="flex h-full min-h-[150px] items-center justify-center text-center text-xs text-slate-400 p-4 border border-dashed border-slate-200 rounded-lg">
                                        {categorySearchTerm ? "No matching categories" : "No available categories for this event"}
                                    </div>
                                ) : (
                                    filteredMasterListItems.map((item) => {
                                        const isSelected = selectedMasterListIds.includes(String(item.id));
                                        return (
                                            <div
                                                key={item.id}
                                                draggable
                                                onDragStart={(e) => {
                                                    e.dataTransfer.setData("text/plain", item.id);
                                                    e.dataTransfer.effectAllowed = "move";
                                                }}
                                                onClick={() => toggleMasterListSelection(item.id)}
                                                className={`flex flex-col gap-1 p-2.5 rounded-lg border text-xs cursor-grab select-none transition-all duration-200 ${
                                                    isSelected 
                                                        ? 'bg-blue-50 border-blue-300 shadow-sm ring-1 ring-blue-300' 
                                                        : 'bg-white border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                                                }`}
                                            >
                                                <div className="font-semibold text-slate-800 flex items-center justify-between">
                                                    <span className="truncate pr-1">{item.name}</span>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        {isSelected && (
                                                            <span className="h-4 w-4 bg-blue-500 text-white rounded-full flex items-center justify-center shrink-0">
                                                                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            </span>
                                                        )}
                                                        <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                                        </svg>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                                        item.entityTypeId === 1 || item.type === 'Academic Program'
                                                            ? 'bg-blue-50 text-blue-700'
                                                            : 'bg-emerald-50 text-emerald-700'
                                                    }`}>
                                                        {item.type}
                                                    </span>
                                                    {item.department && (
                                                        <span className="text-[10px] text-slate-500 truncate">
                                                            {item.department}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Right Column - Configurations (Event Tabs, Drop Zone, Heads) */}
                        <div className="md:col-span-7 flex flex-col justify-between space-y-4 min-h-0">
                            
                            {/* Event Select Tabs */}
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-700">2. Event / Accreditation *</label>
                                <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-1">
                                    {activeEvents.map((event) => {
                                        const isSelected = String(event.EventID) === String(eventID);
                                        return (
                                            <button
                                                key={event.EventID}
                                                type="button"
                                                onClick={() => setEventID(String(event.EventID))}
                                                className={`pb-2 px-3 text-xs font-semibold transition-all border-b-2 -mb-[5px] ${
                                                    isSelected 
                                                        ? 'border-blue-600 text-blue-600' 
                                                        : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                                                }`}
                                            >
                                                {event.EventCode || event.EventName}
                                            </button>
                                        );
                                    })}
                                    {activeEvents.length === 0 && (
                                        <span className="text-xs text-red-500 py-1 font-medium">No active accreditation events found</span>
                                    )}
                                </div>
                            </div>

                            {/* Drag & Drop Target Zone */}
                            <div>
                                <div className="mb-2 flex items-center justify-between">
                                    <label className="text-sm font-semibold text-gray-700">
                                        3. Target Categories * <span className="text-xs font-normal text-slate-500">({selectedMasterItems.length} selected)</span>
                                    </label>
                                    {selectedMasterListIds.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setSelectedMasterListIds([])}
                                            className="text-[10px] font-bold text-red-500 hover:text-red-700 transition"
                                        >
                                            Clear All
                                        </button>
                                    )}
                                </div>
                                <div
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setIsDraggingOver(true);
                                    }}
                                    onDragLeave={() => setIsDraggingOver(false)}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        setIsDraggingOver(false);
                                        const id = e.dataTransfer.getData("text/plain");
                                        if (id) {
                                            setSelectedMasterListIds(prev => {
                                                const strId = String(id);
                                                if (prev.includes(strId)) return prev;
                                                return [...prev, strId];
                                            });
                                        }
                                    }}
                                    className={`flex flex-col p-4 rounded-xl border-2 border-dashed transition-all duration-300 min-h-[96px] justify-center ${
                                        isDraggingOver 
                                            ? 'border-blue-500 bg-blue-50/50 shadow-inner scale-[0.99]' 
                                            : selectedMasterItems.length > 0
                                            ? 'border-emerald-300 bg-emerald-50/10'
                                            : 'border-slate-300 bg-slate-50 hover:bg-slate-100/50'
                                    }`}
                                >
                                    {selectedMasterItems.length > 0 ? (
                                        <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto w-full p-0.5">
                                            {selectedMasterItems.map((item) => (
                                                <div 
                                                    key={item.id} 
                                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-250 bg-white shadow-sm text-xs max-w-[240px] shrink-0"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-bold text-slate-800 truncate">{item.name}</p>
                                                        <p className="text-[9px] text-slate-500 truncate mt-0.5">{item.type}</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeMasterListSelection(item.id)}
                                                        className="h-5 w-5 rounded-full bg-slate-100 hover:bg-red-100 hover:text-red-600 transition flex items-center justify-center text-slate-500 shrink-0"
                                                        title="Remove"
                                                    >
                                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center w-full">
                                            <svg className="mx-auto h-8 w-8 text-slate-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                            </svg>
                                            <p className="text-xs font-semibold text-slate-600">Drag Category here to assign</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">or click any item from the left panel</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Heads Selection */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    4. Assign Heads <span className="text-gray-500 font-normal text-xs">(select up to {MAX_HEADS})</span>
                                </label>
                                <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <input
                                            type="text"
                                            value={headSearchTerm}
                                            onChange={(e) => setHeadSearchTerm(e.target.value)}
                                            placeholder="Search heads..."
                                            className="h-8 w-full rounded-md border border-slate-200 px-3 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setSelectedHeadIDs([])}
                                            className="rounded-md border border-slate-200 px-2.5 py-1 text-[10px] font-semibold text-slate-700 transition hover:bg-slate-50 shrink-0"
                                        >
                                            Clear
                                        </button>
                                    </div>

                                    <div className="h-32 overflow-y-auto space-y-1 pr-1">
                                        {heads.length === 0 ? (
                                            <div className="px-1 py-2 text-xs text-slate-500">No heads available</div>
                                        ) : filteredHeads.length === 0 ? (
                                            <div className="px-1 py-2 text-xs text-slate-500">No matching heads</div>
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
                                                        className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 border transition text-xs ${
                                                            isSelected 
                                                                ? 'bg-blue-50/50 border-blue-200 cursor-pointer font-medium' 
                                                                : isDisabled 
                                                                ? 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed' 
                                                                : 'border-slate-100 hover:bg-slate-50 cursor-pointer'
                                                        }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            disabled={isDisabled}
                                                            onChange={() => toggleHeadSelection(head.HeadID)}
                                                            className="self-center accent-blue-600 h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                        {picUrl ? (
                                                            <img
                                                                src={picUrl}
                                                                alt={fullName || `Head ${head.HeadID}`}
                                                                className="h-7 w-7 rounded-full object-cover border border-slate-200"
                                                            />
                                                        ) : (
                                                            <div className="h-7 w-7 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center border border-slate-200 shrink-0">
                                                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15.75 7.5a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 19.5a7.5 7.5 0 0 1 15 0" />
                                                                </svg>
                                                            </div>
                                                        )}
                                                        <span className="flex-1 min-w-0 self-center text-xs truncate">
                                                            <span className="font-semibold text-slate-800">{fullName || `Head #${head.HeadID}`}</span>
                                                            {head.Position && <span className="text-slate-500"> - {head.Position}</span>}
                                                            {isAssigned && <span className="text-orange-500 text-[10px] ml-1 font-medium">(Already Assigned)</span>}
                                                        </span>
                                                    </label>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-400"
                            disabled={loading}
                        >
                            {loading ? (
                                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                                    <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                "Add"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

