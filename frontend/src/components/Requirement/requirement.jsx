import { useState, useRef, useEffect, useCallback } from "react";
import Header from "../../components/Header/header";
import AddRequirementModal from "../AddRequirement/AddRequirementModal";
import AddPasscuRequirement from "../AddPasscuRequirement/AddPasscuRequirement";
import EditRequirementsModal from "../EditRequirements/EditRequirementsModal";
import RequirementsP from "../RequirementsProfile/RequirementsProfile";

export default function RequirementBars() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedRequirement, setSelectedRequirement] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteMode, setDeleteMode] = useState(false);
    const [selectedCount, setSelectedCount] = useState(0);
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectedEventType, setSelectedEventType] = useState('PACUCOA');
    const [filterOptions, setFilterOptions] = useState({
        events: [],
        types: []
    });
    const requirementsPRef = useRef();

    // Reset all states when component unmounts or navigation happens
    useEffect(() => {
        setDeleteMode(false);
        setSelectedCount(0);
        setSelectedIds([]);
        
        return () => {
            setDeleteMode(false);
            setSelectedCount(0);
            setSelectedIds([]);
            setIsModalOpen(false);
        };
    }, []);

    const handleAddSuccess = (newRequirement) => {
        console.log('New requirement added:', newRequirement);
        
        // Refresh the RequirementsP component to show the new data
        if (requirementsPRef.current && requirementsPRef.current.refresh) {
            requirementsPRef.current.refresh();
        }
    };

    const handleRequirementClick = (requirement) => {
        setSelectedRequirement(requirement);
        setIsEditModalOpen(true);
    };

    const handleEditSave = async (updatedRequirement) => {
        try {
            const { requirementsAPI } = await import('../../utils/api');
            const response = await requirementsAPI.updateRequirement(
                updatedRequirement.RequirementID,
                updatedRequirement
            );

            if (response.success) {
                console.log('Requirement updated successfully');
                
                // Refresh the list
                if (requirementsPRef.current && requirementsPRef.current.refresh) {
                    requirementsPRef.current.refresh();
                }
                
                alert('Requirement updated successfully!');
            } else {
                alert(response.message || 'Failed to update requirement');
            }
        } catch (error) {
            console.error('Error updating requirement:', error);
            alert('An error occurred while updating the requirement');
        }
    };

    const handleSearchChange = (term) => {
        setSearchTerm(term);
    };

    const handleFilterChange = (filters) => {
        setFilterOptions(filters);
    };

    const handleDeleteModeToggle = (mode) => {
        setDeleteMode(mode);
        if (!mode) {
            setSelectedCount(0);
            setSelectedIds([]);
        }
    };

    // Memoize handleSelectionChange to prevent infinite loops
    const handleSelectionChange = useCallback((count, ids) => {
        setSelectedCount(count);
        setSelectedIds(ids);
    }, []);

    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0 || !requirementsPRef.current) return;
        
        // Confirm deletion
        const confirmed = window.confirm(
            `Are you sure you want to delete ${selectedIds.length} requirement(s)? This action cannot be undone.`
        );
        
        if (!confirmed) return;
        
        try {
            const result = await requirementsPRef.current.deleteSelected(selectedIds);
            if (result.success) {
                // Reset selection state
                setSelectedCount(0);
                setSelectedIds([]);
                setDeleteMode(false);
                // Show success message
                console.log('Successfully deleted selected requirements');
                alert(`Successfully deleted ${selectedIds.length} requirement(s)`);
            } else {
                // Show error message
                console.error('Failed to delete requirements:', result.message);
                alert(result.message || 'Failed to delete requirements');
            }
        } catch (error) {
            console.error('Error deleting requirements:', error);
            alert('An error occurred while deleting requirements');
        }
    };

    return (
        <div className="px-6 pb-6 pt-6 w-full">
            {/* Header */}
            <Header 
                pageTitle="Requirements" 
                onAddClick={() => setIsModalOpen(true)}
                onSearchChange={handleSearchChange}
                searchValue={searchTerm}
                onFilterChange={handleFilterChange}
                filterOptions={filterOptions}
                onDeleteModeToggle={handleDeleteModeToggle}
                deleteMode={deleteMode}
                selectedCount={selectedCount}
                onDeleteSelected={handleDeleteSelected}
                showRequirementsFilter={true}
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

            {/* Add Requirement Modal - Use PASSCU modal for PASSCU, regular for others */}
            {selectedEventType === 'PASSCU' ? (
                <AddPasscuRequirement
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handleAddSuccess}
                />
            ) : (
                <AddRequirementModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handleAddSuccess}
                />
            )}

            {/* Edit Requirement Modal */}
            <EditRequirementsModal
                visible={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedRequirement(null);
                }}
                requirement={selectedRequirement}
                onSave={handleEditSave}
            />

            {/* Requirements List */}
            <RequirementsP
                ref={requirementsPRef}
                searchTerm={searchTerm}
                filterOptions={filterOptions}
                deleteMode={deleteMode}
                onSelectionChange={handleSelectionChange}
                onRequirementClick={handleRequirementClick}
                eventType={selectedEventType}
            />
        </div>
    );
}
