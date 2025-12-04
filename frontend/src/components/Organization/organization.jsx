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
    const [selectedEventType, setSelectedEventType] = useState('PACUCOA');

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

            {/* Event Type Selection Buttons */}
            <div className="flex gap-3 mt-6 mb-4">
                <button
                    onClick={() => setSelectedEventType('PACUCOA')}
                    className={`flex-1 px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md ${
                        selectedEventType === 'PACUCOA'
                            ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400'
                            : 'bg-white text-gray-700 hover:bg-blue-50 border-2 border-blue-200'
                    }`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        PACUCOA
                    </div>
                </button>

                <button
                    onClick={() => setSelectedEventType('ISO')}
                    className={`flex-1 px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md ${
                        selectedEventType === 'ISO'
                            ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400'
                            : 'bg-white text-gray-700 hover:bg-blue-50 border-2 border-blue-200'
                    }`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        ISO
                    </div>
                </button>

                <button
                    onClick={() => setSelectedEventType('PASSCU')}
                    className={`flex-1 px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md ${
                        selectedEventType === 'PASSCU'
                            ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400'
                            : 'bg-white text-gray-700 hover:bg-blue-50 border-2 border-blue-200'
                    }`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        PASSCU
                    </div>
                </button>
            </div>

            <div className="relative z-10">
                <OfficesP
                    ref={officesPRef}
                    searchTerm={searchTerm}
                    deleteMode={deleteMode}
                    onSelectionChange={handleSelectionChange}
                    onOfficeClick={handleOfficeClick}
                    eventType={selectedEventType}
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
