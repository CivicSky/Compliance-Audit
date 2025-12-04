import React, { useState, useRef, useEffect, useCallback } from "react";
import Header from "../Header/header";
import { officesAPI, officeHeadsAPI, officetypesAPI } from "../../utils/api";

import OfficesP from "../../components/OfficesP/OfficesP";
import AddOfficeModal from "../../components/AddOffice/AddOfficeModal";
import EditOfficeModal from "../../components/EditOffice/EditOfficeModal";

export default function Organization() {
    const [officeTypes, setOfficeTypes] = useState([]);
    const [heads, setHeads] = useState([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const [selectedOffice, setSelectedOffice] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [deleteMode, setDeleteMode] = useState(false);
    const [selectedCount, setSelectedCount] = useState(0);
    const [selectedIds, setSelectedIds] = useState([]);

    const officesPRef = useRef();


    // Fetch office types on mount
    useEffect(() => {
        async function fetchOfficeTypes() {
            try {
                const officeTypesResponse = await officetypesAPI.getAll();
                setOfficeTypes(officeTypesResponse.data || []);

               
                const officeHeadsResponse = await officeHeadsAPI.getAllHeads();
                setHeads(officeHeadsResponse || []);
            } catch (err) {
                console.error("Failed to fetch office types:", err);
            }
        }

        fetchOfficeTypes();
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
            setIsEditModalOpen(true);
        }
    };

    const handleEditSave = async (updatedOffice) => {
        try {
            const { officesAPI } = await import('../../utils/api');

            const response = await officesAPI.updateOffice(updatedOffice.id, updatedOffice);

            if (response.success) {
                officesPRef.current.refresh();
                alert('Office updated successfully!');
            } else {
                alert(response.message || 'Failed to update office');
            }
        } catch (err) {
            console.error(err);
            alert('Error updating office');
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return;

        if (!window.confirm(`Delete ${selectedIds.length} office(s)?`)) return;

        try {
            const { officesAPI } = await import('../../utils/api');

            for (let id of selectedIds) {
                await officesAPI.deleteOffice(id);
            }

            // Reset selection
            setSelectedCount(0);
            setSelectedIds([]);
            setDeleteMode(false);

            officesPRef.current.refresh();
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
                onDeleteSelected={handleDeleteSelected}
                hideSortButton={true}
            />

            <div className="relative z-10">
                <OfficesP
                    ref={officesPRef}
                    searchTerm={searchTerm}
                    deleteMode={deleteMode}
                    onSelectionChange={handleSelectionChange}
                    onOfficeClick={handleOfficeClick}
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
                />
            )}

            {/* Edit Modal */}
            {isEditModalOpen && (
                <EditOfficeModal
                    visible={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    office={selectedOffice}
                    onSave={handleEditSave}
                    officeTypes={officeTypes}
                    heads={heads}
                />
            )}

        </div>
    );
}
