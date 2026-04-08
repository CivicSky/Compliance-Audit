import React, { useState, useRef, useEffect, useCallback } from "react";
import Header from "../Header/header";
import Sortoffice from "./sortoffice";
import EventsAddDelete from "../ALLC/eventsadddelete";
import EventTabs from "./EventTabs";
import OfficeAddDelete from "./officeadddelete";
import AddEventModal from "../AddEvent/AddEventModal";
import { officesAPI, officeHeadsAPI, officetypesAPI, eventsAPI, usersAPI } from "../../utils/api";
import OfficesP from "../../components/OfficesP/OfficesP";
import AddOfficeModal from "../../components/AddOffice/AddOfficeModal";
import EditOfficeModal from "../../components/EditOffice/EditOfficeModal";
import ViewReqPasscuModal from "../../components/ViewReqPasscuModal/ViewReqPasscuModal";
import ViewReqPASSCUModal from "../../components/ViewReqPASSCUModal/ViewReqPASSCUModal";
import AddReqOffModal from "../../components/AddReqOffModal/AddReqOffModal";

export default function Organization() {
    const [officeTypes, setOfficeTypes] = useState([]);
    const [heads, setHeads] = useState([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isViewReqModalOpen, setIsViewReqModalOpen] = useState(false);
    const [isAddReqModalOpen, setIsAddReqModalOpen] = useState(false);

    const [selectedOffice, setSelectedOffice] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [deleteMode, setDeleteMode] = useState(false);
    const [selectedCount, setSelectedCount] = useState(0);
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectedEventType, setSelectedEventType] = useState(''); // will hold EventID
    const [events, setEvents] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

    const officesPRef = useRef();
    const [sortStatus, setSortStatus] = useState('all');
    const [showActions, setShowActions] = useState(false);
    const actionsButtonRef = useRef(null);
    const actionsMenuRef = useRef(null);
    const [isAddEventOpen, setIsAddEventOpen] = useState(false);

    // Fetch office types and events safely
    useEffect(() => {
        async function fetchOfficeTypes() {
            try {
                const res = await officetypesAPI.getAll();
                setOfficeTypes(Array.isArray(res) ? res : []);
            } catch (err) {
                console.error("Failed to fetch office types:", err);
                setOfficeTypes([]); // fallback to empty array
            }
        }
        async function fetchEvents() {
            try {
                const res = await eventsAPI.getAllEvents();
                if (res.success && Array.isArray(res.data)) {
                    setEvents(res.data);
                    // Default to "All Offices" (empty string) instead of first event
                    // if (res.data.length > 0) setSelectedEventType(res.data[0].EventID);
                } else {
                    setEvents([]);
                }
            } catch (err) {
                setEvents([]);
            }
        }
        fetchOfficeTypes();
        fetchEvents();
    }, []);

    // Fetch current user on mount
    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const response = await usersAPI.getLoggedInUser();
                if (response.success) setCurrentUser(response.user);
            } catch (error) {
                console.error('Error fetching current user:', error);
            }
        };
        fetchCurrentUser();
    }, []);

    // Fetch office heads safely
        useEffect(() => {
            async function fetchHeads() {
                try {
                    const res = await officeHeadsAPI.getAllHeads();
                    setHeads(Array.isArray(res) ? res : []);
                } catch (err) {
                    console.error('Failed to fetch heads', err);
                    setHeads([]);
                }
            }
            fetchHeads();
        }, []);

    // Reset states on mount
    useEffect(() => {
        setDeleteMode(false);
        setSelectedCount(0);
        setSelectedIds([]);
    }, []);

    const handleSuccess = () => {
        if (officesPRef.current?.refresh) {
            officesPRef.current.refresh();
        }
    };

    const handleOfficeClick = (office) => {
        if (!deleteMode) {
            setSelectedOffice(office);
            setIsViewReqModalOpen(true);
        }
    };

    const handleCloseViewReqModal = () => {
        setIsViewReqModalOpen(false);
        // Refresh offices list to update compliance status
        if (officesPRef.current?.refresh) {
            officesPRef.current.refresh();
        }
    };

    const handleEditOffice = (office) => {
        setIsViewReqModalOpen(false);
        setSelectedOffice(office);
        setIsEditModalOpen(true);
    };

    const handleAddRequirements = (office) => {
        setIsViewReqModalOpen(false);
        setSelectedOffice(office);
        setIsAddReqModalOpen(true);
    };

    const handleRequirementsSaved = () => {
        setIsAddReqModalOpen(false);
        setIsViewReqModalOpen(true);
        // Refresh requirements in view modal
        if (officesPRef.current?.refresh) {
            officesPRef.current.refresh();
        }
    };

    const handleEditSave = async (updatedOffice) => {
        try {
            const { officesAPI } = await import('../../utils/api');
            const response = await officesAPI.updateOffice(updatedOffice.id, updatedOffice);

            if (response?.success) {
                officesPRef.current.refresh();
                alert('Office updated successfully!');
            } else {
                alert(response?.message || 'Failed to update office');
            }
        } catch (err) {
            console.error(err);
            alert('Error updating office');
        }
    };

    // Delete selected offices
    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return;
        if (!window.confirm(`Delete ${selectedIds.length} office(s)?`)) return;

        try {
            for (let id of selectedIds) {
                await officesAPI.deleteOffice(id);
            }

            setSelectedCount(0);
            setSelectedIds([]);
            setDeleteMode(false);

            // Refresh the list after deletion
            if (officesPRef.current?.refresh) {
                await officesPRef.current.refresh();
            }

            alert('Deleted successfully!');
        } catch (err) {
            console.error(err);
            alert('Delete failed');
        }
    };

    const handleSelectionChange = useCallback((count, ids) => {
        setSelectedCount(count);
        setSelectedIds(ids);
    }, []);

    const isPaascu = selectedEventType && (selectedEventType === 'PAASCU' || selectedEventType === 'PASSCU');

    // Ensure selection is cleared in OfficesP when deleteMode is turned off
    useEffect(() => {
        if (!deleteMode && officesPRef.current && officesPRef.current.clearSelection) {
            officesPRef.current.clearSelection();
        }
    }, [deleteMode]);

    return (
        <div className="h-screen w-full flex flex-col overflow-hidden">
            <Header />

            <div className="flex-1 min-h-0 flex flex-col overflow-hidden px-4 pb-6 pt-6 bg-gray-100">
            <div className="mb-4 flex flex-col gap-2 relative">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 mb-1">Office Management</h1>
                        <p className="text-xs text-gray-600 ">{deleteMode ? '\u00A0' : 'Manage your Offices Status.'}</p>
                    </div>

                    <div className="flex items-center gap-1 pt-0.5">
                        {deleteMode && (
                            <button
                                onClick={async () => {
                                    if (selectedCount === 0) return;
                                    const confirmed = window.confirm(`Delete ${selectedCount} selected item(s)? This cannot be undone.`);
                                    if (!confirmed) return;
                                    try {
                                        await handleDeleteSelected();
                                    } catch (err) {
                                        console.error(err);
                                    }
                                }}
                                className={`ml-2 inline-flex h-8 items-center rounded-lg border px-3 text-[11px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-red-400 bg-red-600 text-white hover:bg-red-700 ${selectedCount === 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
                                disabled={selectedCount === 0}
                            >
                                Delete Selected ({selectedCount})
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => {
                                if (deleteMode) {
                                    setDeleteMode(false);
                                    setSelectedCount(0);
                                    setSelectedIds([]);
                                    return;
                                }
                                setDeleteMode(true);
                                setSelectedCount(0);
                                setSelectedIds([]);
                            }}
                            className={`inline-flex h-8 items-center rounded-lg border px-3 text-[11px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-red-400 ${
                                deleteMode
                                    ? 'border-red-300 bg-red-100 text-red-700 hover:bg-red-200'
                                    : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                            }`}
                        >
                            {deleteMode ? 'Cancel Delete' : 'Delete'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-[11px] font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <span className="text-sm leading-none">+</span>
                            Add
                        </button>
                    </div>
                </div>

                <div className="flex w-full items-center justify-between gap-1">
                    <div className="relative w-full max-w-sm">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                        >
                            <circle cx="11" cy="11" r="7" />
                            <path d="m20 20-3.5-3.5" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search offices..."
                            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-[9px] text-slate-700 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-1">
                        <div className="relative inline-block">
                            <Sortoffice value={sortStatus} onChange={setSortStatus} />
                        </div>

                        <div className="flex h-9 items-center justify-end gap-1">
                            <div className="flex h-7 items-center gap-0.5 rounded-md border border-slate-200 bg-slate-100 p-0.5">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
                                        viewMode === 'grid'
                                            ? 'bg-white text-indigo-600'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                    title="Grid View"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
                                        viewMode === 'list'
                                            ? 'bg-white text-indigo-600'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                    title="List View"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Office button removed per request */}


            {/* Event Tabs (replaces dropdown) */}
            <div className="mb-4 -mt-1">
                <EventTabs selectedEventId={selectedEventType} onChange={setSelectedEventType} />
            </div>

            <div className="relative z-10">
                {/* Debug logs to verify data passed to OfficesP */}
                {console.log('Selected Event Type:', selectedEventType)}
                {console.log('Office Types:', officeTypes)}
                {console.log('Heads:', heads)}
                {console.log('Sort Status:', sortStatus)}

                <OfficesP
                    ref={officesPRef}
                    searchTerm={searchTerm}
                    deleteMode={deleteMode}
                    onSelectionChange={handleSelectionChange}
                    onOfficeClick={handleOfficeClick}
                    eventType={selectedEventType}
                    events={events}
                    viewMode={viewMode}
                    sortStatus={sortStatus}
                    officeTypes={officeTypes}   
                    heads={heads}
                />
            </div>
            </div>

            {/* Add Modal */}
            {isModalOpen && (
                <AddOfficeModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handleSuccess}
                    officeTypes={officeTypes}
                    events={events}
                />
            )}

            {/* Add Event Modal (from Standards actions) */}
            {isAddEventOpen && (
                <AddEventModal
                    isOpen={isAddEventOpen}
                    onClose={() => setIsAddEventOpen(false)}
                    onSuccess={(newEvent) => {
                        setIsAddEventOpen(false);
                        if (newEvent) setEvents(prev => [newEvent, ...(Array.isArray(prev) ? prev : [])]);
                    }}
                />
            )}

            {/* View Requirements Modal - Use PASSCU Modal for PAASCU, regular for others */}
            {isViewReqModalOpen && isPaascu && (
                <ViewReqPASSCUModal
                    isOpen={isViewReqModalOpen}
                    onClose={handleCloseViewReqModal}
                    office={selectedOffice}
                    onEditOffice={handleEditOffice}
                    onAddRequirements={handleAddRequirements}
                />
            )}

            {isViewReqModalOpen && !isPaascu && (
                <ViewReqPasscuModal
                    isOpen={isViewReqModalOpen}
                    onClose={handleCloseViewReqModal}
                    office={selectedOffice}
                    onEditOffice={handleEditOffice}
                    onAddRequirements={handleAddRequirements}
                />
            )}

            {/* Edit Modal */}
            {isEditModalOpen && (
                (() => {
                    console.log('DEBUG: heads passed to EditOfficeModal:', heads);
                    return (
                        <EditOfficeModal
                            visible={isEditModalOpen}
                            onClose={() => {
                                setIsEditModalOpen(false);
                                setIsViewReqModalOpen(true);
                            }}
                            office={selectedOffice}
                            onSave={handleEditSave}
                            officeTypes={officeTypes}
                            heads={heads}
                            userRole={currentUser?.RoleID}
                        />
                    );
                })()
            )}

            {/* Add Requirements Modal */}
            {isAddReqModalOpen && (
                <AddReqOffModal
                    isOpen={isAddReqModalOpen}
                    onClose={() => {
                        setIsAddReqModalOpen(false);
                        setIsViewReqModalOpen(true);
                    }}
                    office={selectedOffice}
                    onSave={handleRequirementsSaved}
                />
            )}
        </div>
    );
}
