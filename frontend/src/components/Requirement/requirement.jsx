import { useState, useRef, useEffect, useCallback } from "react";
import Header from "../../components/Header/header";
import AddRequirementModal from "../AddRequirement/AddRequirementModal";
import AddPasscuRequirement from "../AddPasscuRequirement/AddPasscuRequirement";
import EditRequirementsModal from "../EditRequirements/EditRequirementsModal";
import RequirementsP from "../RequirementsProfile/RequirementsProfile";
import UnifiedSetupWizard from "../UnifiedSetupWizard/UnifiedSetupWizard";
import { eventsAPI } from "../../utils/api";
import { Wand2 } from "lucide-react";

export default function RequirementBars() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [showWizard, setShowWizard] = useState(false);
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
        setSelectedCount(0);
        setSelectedIds([]);
        // Also clear selection in RequirementsP child
        if (requirementsPRef.current && requirementsPRef.current.clearSelection) {
            requirementsPRef.current.clearSelection();
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
            <div className="flex items-center justify-between mb-4">
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
                    // Refresh the requirements view after successful setup
                    if (requirementsPRef.current?.refetch) {
                        requirementsPRef.current.refetch();
                    }
                }}
            />

            {/* Event Type Dropdown */}
            <div className="mb-4">
                <div className="relative w-full">
                    <select
                        value={selectedEventId}
                        onChange={(e) => setSelectedEventId(e.target.value)}
                        className="w-full appearance-none px-5 py-3 border-2 border-purple-400 rounded-xl bg-white text-gray-800 font-semibold shadow focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200 hover:border-purple-600 hover:shadow-lg"
                    >
                        {events.map((event) => (
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

            {/* Requirements List */}
            <RequirementsP
                ref={requirementsPRef}
                searchTerm={searchTerm}
                filterOptions={filterOptions}
                deleteMode={deleteMode}
                onSelectionChange={handleSelectionChange}
                onRequirementClick={handleRequirementClick}
                eventId={selectedEventId}
            />
        </div>
    );
}
