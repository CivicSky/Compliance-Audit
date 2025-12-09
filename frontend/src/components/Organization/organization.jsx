import React, { useState, useRef, useEffect, useCallback } from "react";
import Header from "../Header/header";
import { officesAPI, officeHeadsAPI, officetypesAPI } from "../../utils/api";
import OfficesP from "../../components/OfficesP/OfficesP";
import AddOfficeModal from "../../components/AddOffice/AddOfficeModal";
import EditOfficeModal from "../../components/EditOffice/EditOfficeModal";
import ViewReqModal from "../../components/ViewReqModal/ViewReqModal";
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
    const [selectedEventType, setSelectedEventType] = useState('PACUCOA');

    const officesPRef = useRef();

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

            {/* Event Type Buttons */}
            <div className="flex gap-3 mt-6 mb-4">
                {['PACUCOA', 'ISO', 'PASSCU'].map((type) => (
                    <button
                        key={type}
                        onClick={() => setSelectedEventType(type)}
                        className={`flex-1 px-6 py-3 rounded-lg font-semibold text-sm transition-colors duration-300 border-2 focus:outline-none ${selectedEventType === type
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 hover:bg-blue-50 border-blue-200'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <span>{type}</span>
                        </div>
                    </button>
                ))}
            </div>

            <div className="relative z-10">
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
                    heads={heads}
                    selectedEventType={selectedEventType}
                />
            )}

            {/* View Requirements Modal - Use PASSCU Modal for PASSCU, regular for others */}
            {isViewReqModalOpen && selectedEventType === 'PASSCU' && (
                <ViewReqPASSCUModal
                    isOpen={isViewReqModalOpen}
                    onClose={handleCloseViewReqModal}
                    office={selectedOffice}
                    onEditOffice={handleEditOffice}
                    onAddRequirements={handleAddRequirements}
                />
            )}

            {isViewReqModalOpen && selectedEventType !== 'PASSCU' && (
                <ViewReqModal
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
