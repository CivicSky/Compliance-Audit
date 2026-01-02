import React, { useState, useRef, useEffect, useCallback } from "react";
import Header from "../Header/header";
import { officesAPI, officeHeadsAPI, officetypesAPI, eventsAPI, criteriaAPI } from "../../utils/api";
import CriteriaP from "../../components/CriteriaP/CriteriaP";
import AddCriteriaModal from "../../components/AddCriteriaModal/AddCriteriaModal";
import EditOfficeModal from "../../components/EditOffice/EditOfficeModal";
import ViewReqPasscuModal from "../../components/ViewReqPasscuModal/ViewReqPasscuModal";
import ViewReqPASSCUModal from "../../components/ViewReqPASSCUModal/ViewReqPASSCUModal";
import AddReqOffModal from "../../components/AddReqOffModal/AddReqOffModal";
import EditCriteriaModal from "../../components/EditCriteria/EditCriteriaModal";
import UnifiedSetupWizard from "../UnifiedSetupWizard/UnifiedSetupWizard";
import { Wand2 } from "lucide-react";

export default function Organization() {
    const [officeTypes, setOfficeTypes] = useState([]);
    const [heads, setHeads] = useState([]);
    const [events, setEvents] = useState([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isEditCriteriaModalOpen, setIsEditCriteriaModalOpen] = useState(false);
    const [showWizard, setShowWizard] = useState(false);
    const [editCriteria, setEditCriteria] = useState(null);
    const [isViewReqModalOpen, setIsViewReqModalOpen] = useState(false);
    const [isAddReqModalOpen, setIsAddReqModalOpen] = useState(false);

    const [selectedOffice, setSelectedOffice] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [deleteMode, setDeleteMode] = useState(false);
    const [selectedCount, setSelectedCount] = useState(0);
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectedEventType, setSelectedEventType] = useState('PACUCOA');
    const [selectedEventId, setSelectedEventId] = useState(null);

    const criteriaPRef = useRef();

    // Fetch office types safely
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
        fetchOfficeTypes();
    }, []);

    // Fetch office heads safely
    useEffect(() => {
        async function fetchHeads() {
            try {
                const res = await officeHeadsAPI.getAllHeads();
                setHeads(Array.isArray(res) ? res : []);
            } catch (err) {
                console.error("Failed to fetch heads:", err);
                setHeads([]); // fallback to empty array
            }
        }
        fetchHeads();
    }, []);

    // Fetch all events for dropdown
    useEffect(() => {
        async function fetchEvents() {
            try {
                const res = await eventsAPI.getAllEvents();
                if (res && res.success && Array.isArray(res.data)) {
                    setEvents(res.data);
                    // Optionally set default event type to first event
                    if (res.data.length > 0) {
                        setSelectedEventType(res.data[0].EventName || res.data[0].eventType);
                        setSelectedEventId(res.data[0].EventID);
                    }
                } else {
                    setEvents([]);
                }
            } catch (err) {
                setEvents([]);
            }
        }
        fetchEvents();
    }, []);

    // Reset states on mount
    useEffect(() => {
        setDeleteMode(false);
        setSelectedCount(0);
        setSelectedIds([]);
    }, []);

    // Refresh CriteriaP after adding new criteria
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


    const handleSelectionChange = useCallback((count, ids) => {
        setSelectedCount(count);
        setSelectedIds(ids);
    }, []);

    const isPaascu = selectedEventType === 'PAASCU' || selectedEventType === 'PASSCU';

    // Delete selected criteria
    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return;
        if (!window.confirm(`Delete ${selectedIds.length} criteria?`)) return;
        try {
            await criteriaAPI.deleteCriteria(selectedIds);
            setSelectedCount(0);
            setSelectedIds([]);
            setDeleteMode(false);
            if (criteriaPRef.current?.refresh) criteriaPRef.current.refresh();
            alert('Deleted successfully!');
        } catch (err) {
            console.error('Failed to delete criteria', err);
            alert('Delete failed');
        }
    };
    // Handle criteria click for editing
    const handleCriteriaClick = (criteria) => {
        setEditCriteria(criteria);
        setIsEditCriteriaModalOpen(true);
    };

    return (
        <div className="px-6 pb-6 pt-6 w-full">
            <div className="flex items-center justify-between mb-4">
                <Header
                    pageTitle="Criteria Management"
                    onAddClick={() => setIsModalOpen(true)}
                    onSearchChange={setSearchTerm}
                    searchValue={searchTerm}
                    onDeleteModeToggle={setDeleteMode}
                    deleteMode={deleteMode}
                    selectedCount={selectedCount}
                    onDeleteSelected={handleDeleteSelected}
                    hideSortButton={true}
                />
                <button 
                    onClick={() => setShowWizard(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition text-sm"
                    title="Quick setup with wizard"
                >
                    <Wand2 size={18} /> Wizard
                </button>
            </div>

            <UnifiedSetupWizard 
                isOpen={showWizard} 
                onClose={() => setShowWizard(false)}
                onSuccess={() => {
                    // Refresh the criteria view after successful setup
                    if (criteriaPRef.current?.refetch) {
                        criteriaPRef.current.refetch();
                    }
                }}
            />

            {/* Event Type Dropdown */}
            <div className="mb-4">
                <div className="relative w-full">
                    <select
                        value={selectedEventId || ''}
                        onChange={e => {
                            const selected = events.find(ev => String(ev.EventID) === e.target.value);
                            setSelectedEventId(e.target.value);
                            setSelectedEventType(selected?.EventName || '');
                        }}
                        className="w-full appearance-none px-5 py-3 border-2 border-purple-400 rounded-xl bg-white text-gray-800 font-semibold shadow focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200 hover:border-purple-600 hover:shadow-lg"
                    >
                        {events.map(event => (
                            <option key={event.EventID} value={event.EventID} className="text-base">
                                {event.EventName || event.eventType}
                            </option>
                        ))}
                    </select>
                    <span className="pointer-events-none absolute right-4 top-1/2 transform -translate-y-1/2 text-purple-500">
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </span>
                </div>
            </div>

            <div className="relative z-10">
                <CriteriaP
                    ref={criteriaPRef}
                    searchTerm={searchTerm}
                    eventId={selectedEventId}
                    deleteMode={deleteMode}
                    selectedIds={selectedIds}
                    onSelectionChange={(count, ids) => {
                        setSelectedCount(count);
                        setSelectedIds(ids);
                    }}
                    onCriteriaClick={handleCriteriaClick}
                />
            </div>

            {/* Add Criteria Modal */}
            {isModalOpen && (
                <AddCriteriaModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => {
                        setIsModalOpen(false);
                        if (criteriaPRef.current?.refresh) criteriaPRef.current.refresh();
                    }}
                />
            )}

            {/* Edit Criteria Modal */}
            {isEditCriteriaModalOpen && editCriteria && (
                <EditCriteriaModal
                    visible={isEditCriteriaModalOpen}
                    onClose={() => setIsEditCriteriaModalOpen(false)}
                    event={editCriteria}
                    onSave={(updated) => {
                        // TODO: Implement save logic for criteria
                        setIsEditCriteriaModalOpen(false);
                        if (criteriaPRef.current?.refresh) criteriaPRef.current.refresh();
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
