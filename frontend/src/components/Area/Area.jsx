import { useState, useRef, useEffect, useCallback } from "react";
import Header from "../../components/Header/header";
import AddRequirementModal from "../AddRequirement/AddRequirementModal";
import AddPasscuRequirement from "../AddPasscuRequirement/AddPasscuRequirement";
import EditRequirementsModal from "../EditRequirements/EditRequirementsModal";
import AreaProfileList from "../AreaProfile/AreaProfileList";
import RequirementsP from "../RequirementsProfile/RequirementsProfile";
import { eventsAPI } from "../../utils/api";

export default function RequirementBars() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedRequirement, setSelectedRequirement] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteMode, setDeleteMode] = useState(false);
    const [selectedCount, setSelectedCount] = useState(0);
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectedEventId, setSelectedEventId] = useState('');
    const [filterOptions, setFilterOptions] = useState({
        events: [],
        types: []
    });
    const [events, setEvents] = useState([]);
    const requirementsPRef = useRef();

    // Fetch all events on component mount
    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const allEvents = await eventsAPI.getAllEvents();
                if (allEvents && allEvents.success && Array.isArray(allEvents.data)) {
                    setEvents(allEvents.data);
                    if (allEvents.data.length > 0) {
                        setSelectedEventId(allEvents.data[0].EventID);
                    }
                } else {
                    setEvents([]);
                }
            } catch (error) {
                console.error("Error fetching events:", error);
                setEvents([]);
            }
        };
        fetchEvents();
    }, []);

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
            {/* Event Type Dropdown at the very top */}
            <div className="mb-4">
                <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                    {events.map((event) => (
                        <option key={event.EventID} value={event.EventID}>
                            {event.EventName || event.eventType}
                        </option>
                    ))}
                </select>
            </div>

            {/* Header */}
            <Header 
                pageTitle="Areas" 
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

            {/* Area List */}
            <AreaProfileList />

            {/* Add Requirement Modal - Always use PASSCU modal */}
            <AddPasscuRequirement
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleAddSuccess}
            />

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
        </div>
    );
}
