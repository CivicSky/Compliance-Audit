import React, { useState, useEffect, useMemo } from "react";
import { officesAPI, officeHeadsAPI, masterlistAPI } from "../../utils/api";
import { useModal } from "../UI/ModalProvider";
import { API_BASE_URL } from '../../utils/apiBase';

const MAX_HEADS = 4;

export default function AddOfficeModal({ isOpen, onClose, onSuccess, officeTypes, events }) {
    const [selectedMasterListId, setSelectedMasterListId] = useState("");
    const [masterListItems, setMasterListItems] = useState([]);
    const [masterListLoading, setMasterListLoading] = useState(false);
    const [officeTypeID, setOfficeTypeID] = useState("");
    const [selectedHeadIDs, setSelectedHeadIDs] = useState([]);
    const [eventID, setEventID] = useState("");
    const [heads, setHeads] = useState([]);
    const [loading, setLoading] = useState(false);
    const [headSearchTerm, setHeadSearchTerm] = useState("");

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

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedMasterListId("");
            setOfficeTypeID("");
            setSelectedHeadIDs([]);
            setEventID("");
            setHeadSearchTerm("");
            setMasterListItems([]);

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
    }, [isOpen]);

    // Fetch available master list items when eventID changes
    useEffect(() => {
        if (!isOpen || !eventID) {
            setMasterListItems([]);
            setSelectedMasterListId("");
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

    // Selected master list item helper
    const selectedMasterItem = useMemo(() => {
        return masterListItems.find(item => String(item.id) === String(selectedMasterListId)) || null;
    }, [masterListItems, selectedMasterListId]);

    // Auto-set officeTypeID based on selected master list item
    useEffect(() => {
        if (!selectedMasterItem || !Array.isArray(officeTypes) || officeTypes.length === 0) return;

        const isAcademic = selectedMasterItem.entityTypeId === 1 || selectedMasterItem.type === 'Academic Program';

        const matchedType = officeTypes.find(t => {
            const name = String(t.TypeName || t.name || '').toLowerCase();
            if (isAcademic) {
                return name.includes('academic') && !name.includes('non');
            } else {
                return name.includes('non');
            }
        });

        if (matchedType) {
            setOfficeTypeID(String(matchedType.OfficeTypeID || matchedType.id));
        }
    }, [selectedMasterItem, officeTypes]);

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

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!eventID || !selectedMasterListId || selectedHeadIDs.length === 0) {
            await showAlert("Please fill out all required fields (select Event, Category Name, and at least one Head).");
            return;
        }

        if (selectedHeadIDs.length > MAX_HEADS) {
            await showAlert(`You can select a maximum of ${MAX_HEADS} heads.`);
            return;
        }

        setLoading(true);

        try {
            const newOffice = {
                master_list_id: parseInt(selectedMasterListId),
                OfficeName: selectedMasterItem?.name || "",
                OfficeTypeID: parseInt(officeTypeID),
                HeadIDs: selectedHeadIDs.map(id => parseInt(id)),
                EventID: parseInt(eventID)
            };

            const res = await officesAPI.createOffice(newOffice);
            const success = res?.success === true || res?.data?.success === true || res?.office || res?.OfficeID || res?.id;

            if (success) {
                await showAlert('Category / Office added to audit successfully!');
                try { onSuccess(); } catch { }
                try { onClose(); } catch { }
            } else {
                const errorMsg = res?.details || res?.error || res?.message || 'Failed to add category';
                await showAlert(`Error adding category: ${errorMsg}`);
            }
        } catch (err) {
            console.error("Error adding category:", err);
            const errorMsg = err.response?.data?.details || err.response?.data?.error || err.message || "Failed to add category.";
            await showAlert(`Database error: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 left-0 lg:left-[var(--sidebar-width)] lg:transition-[left] lg:duration-200 lg:ease-in-out z-[50] flex items-center justify-center bg-black/50">
            <div className="mx-4 w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                    <h2 className="text-xl font-semibold text-gray-800">Add Category to Audit</h2>
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

                <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
                    {/* Event Select */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">Event *</label>
                        <div className="relative">
                            <select
                                value={eventID}
                                onChange={(e) => setEventID(e.target.value)}
                                className="h-10 w-full appearance-none rounded-md border border-gray-300 bg-white px-4 pr-10 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={activeEvents.length === 0}
                                required
                            >
                                <option value="">{activeEvents.length === 0 ? "No active events available" : "Select Event"}</option>
                                {activeEvents.map((event) => (
                                    <option key={event.EventID} value={event.EventID}>
                                        {event.EventCode || event.EventName}
                                    </option>
                                ))}
                            </select>
                            <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>

                    {/* Category Name Select from Master List */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">Category Name * <span className="text-xs font-normal text-gray-500">(From Master List)</span></label>
                        <div className="relative">
                            <select
                                value={selectedMasterListId}
                                onChange={(e) => setSelectedMasterListId(e.target.value)}
                                className="h-10 w-full appearance-none rounded-md border border-gray-300 bg-white px-4 pr-10 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                disabled={!eventID || masterListLoading}
                                required
                            >
                                <option value="">
                                    {!eventID 
                                        ? "Please select an event first" 
                                        : masterListLoading 
                                        ? "Loading master list items..." 
                                        : masterListItems.length === 0 
                                        ? "No available items for this event" 
                                        : "Select Category from Master List"}
                                </option>
                                {masterListItems.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.name} ({item.type}{item.department ? ` • ${item.department}` : ''})
                                    </option>
                                ))}
                            </select>
                            <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                            </svg>
                        </div>
                        {selectedMasterItem && (
                            <div className="mt-2 flex items-center gap-2 text-xs">
                                <span className={`rounded-full px-2.5 py-0.5 font-medium border ${
                                    selectedMasterItem.entityTypeId === 1 || selectedMasterItem.type === 'Academic Program'
                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}>
                                    {selectedMasterItem.type}
                                </span>
                                {selectedMasterItem.department && (
                                    <span className="text-gray-500">Dept: {selectedMasterItem.department}</span>
                                )}
                            </div>
                        )}
                    </div>




                    <div>
                        <label className="block text-sm font-medium text-gray-700">Head(s) <span className="text-gray-500 font-normal text-xs">(select up to {MAX_HEADS})</span></label>
                        <div className="mt-1 rounded-lg border border-slate-200 bg-white p-3">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <input
                                    type="text"
                                    value={headSearchTerm}
                                    onChange={(e) => setHeadSearchTerm(e.target.value)}
                                    placeholder="Search heads..."
                                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

