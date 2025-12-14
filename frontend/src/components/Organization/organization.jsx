import React, { useState, useRef, useEffect, useCallback } from "react";
import Header from "../Header/header";
import { officesAPI, officeHeadsAPI, officetypesAPI, eventsAPI } from "../../utils/api";
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

    const officesPRef = useRef();

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
                    if (res.data.length > 0) setSelectedEventType(res.data[0].EventID);
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

    return (
        <div className="px-6 pb-6 pt-6 w-full">
            <Header
                pageTitle="Offices"
                onAddClick={() => setIsModalOpen(true)}
                onSearchChange={setSearchTerm}
                searchValue={searchTerm}
                onDeleteModeToggle={setDeleteMode}
                deleteMode={deleteMode}
                selectedCount={selectedCount}
                onDeleteSelected={handleDeleteSelected}  // Pass handleDeleteSelected to Header
                hideSortButton={true}
            />


            {/* Event Type Dropdown */}
            <div className="mb-4 mt-6">
                <div className="relative w-full max-w-xs">
                    <select
                        value={selectedEventType}
                        onChange={e => setSelectedEventType(e.target.value)}
                        className="w-full appearance-none px-5 py-3 border-2 border-blue-400 rounded-xl bg-white text-gray-800 font-semibold shadow focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 hover:border-blue-600 hover:shadow-lg"
                    >
                        {events.map(event => (
                            <option key={event.EventID} value={event.EventID} className="text-base">
                                {event.EventName || event.eventType}
                            </option>
                        ))}
                    </select>
                    <span className="pointer-events-none absolute right-4 top-1/2 transform -translate-y-1/2 text-blue-500">
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </span>
                </div>
            </div>

            <div className="relative z-10">
                {/* Debug logs to verify data passed to OfficesP */}
                {console.log('Selected Event Type:', selectedEventType)}
                {console.log('Office Types:', officeTypes)}
                {console.log('Heads:', heads)}

                <OfficesP
                    ref={officesPRef}
                    searchTerm={searchTerm}
                    deleteMode={deleteMode}
                    onSelectionChange={handleSelectionChange}
                    onOfficeClick={handleOfficeClick}
                    eventType={selectedEventType}

                    officeTypes={officeTypes}   
                    heads={heads}
                />
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
