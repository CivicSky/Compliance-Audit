import { useState, useRef, useEffect, useCallback } from "react";
import Header from "../../components/Header/header";
import AddRequirementModal from "../AddRequirement/AddRequirementModal";
import AddAreaModal from "../AddAreaModal/AddAreaModal";
import EditRequirementsModal from "../EditRequirements/EditRequirementsModal";
import AreaProfile from "../AreaProfile/AreaProfile";
import { areasAPI } from "../../utils/api";
import EditAreaModal from "../EditArea/EditArea";
import RequirementsP from "../RequirementsProfile/RequirementsProfile";
import { eventsAPI } from "../../utils/api";
import UnifiedSetupWizard from "../UnifiedSetupWizard/UnifiedSetupWizard";
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
    const areaProfileRef = useRef();
    const [isEditAreaModalOpen, setIsEditAreaModalOpen] = useState(false);
    const [selectedArea, setSelectedArea] = useState(null);
    // Area selection state
    const [areaSelectionMode, setAreaSelectionMode] = useState(false);
    const [selectedAreaIds, setSelectedAreaIds] = useState([]);

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

    const handleAddAreaSuccess = (newArea) => {
        // Refresh the AreaProfile component to show the new area
        if (areaProfileRef.current && areaProfileRef.current.refresh) {
            areaProfileRef.current.refresh();
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


    // Handler for area card click (selection or edit)
    useEffect(() => {
        if (areaProfileRef.current) {
            areaProfileRef.current.onAreaClick = (area) => {
                if (areaSelectionMode) {
                    setSelectedAreaIds((prev) =>
                        prev.includes(area.AreaID)
                            ? prev.filter((id) => id !== area.AreaID)
                            : [...prev, area.AreaID]
                    );
                } else {
                    setSelectedArea(area);
                    setIsEditAreaModalOpen(true);
                }
            };
        }
    }, [areaSelectionMode, areaProfileRef]);

    // Toggle area selection mode
    const handleAreaDeleteModeToggle = () => {
        setAreaSelectionMode((prev) => !prev);
        setSelectedAreaIds([]);
    };

    // Delete selected areas
    const handleDeleteSelectedAreas = async () => {
        if (selectedAreaIds.length === 0) return;
        const confirmed = window.confirm(`Are you sure you want to delete ${selectedAreaIds.length} area(s)? This action cannot be undone.`);
        if (!confirmed) return;
        try {
            // Call backend to delete areas (implement this route in backend!)
            const response = await areasAPI.deleteAreas(selectedAreaIds);
            if (response.success) {
                setSelectedAreaIds([]);
                setAreaSelectionMode(false);
                if (areaProfileRef.current && areaProfileRef.current.refresh) areaProfileRef.current.refresh();
                alert(`Successfully deleted ${selectedAreaIds.length} area(s)`);
            } else {
                alert(response.message || 'Failed to delete areas');
            }
        } catch (error) {
            alert('An error occurred while deleting areas');
        }
    };

    const handleEditAreaSave = async (updatedArea) => {
        try {
            const { areasAPI } = await import('../../utils/api');
            const response = await areasAPI.updateArea(updatedArea.AreaID, updatedArea);
            if (response.success) {
                if (areaProfileRef.current && areaProfileRef.current.refresh) areaProfileRef.current.refresh();
                alert('Area updated successfully!');
            } else {
                alert(response.message || 'Failed to update area');
            }
        } catch (error) {
            alert('An error occurred while updating the area');
        }
    };

    return (
        <div className="px-6 pb-6 pt-6 w-full">
            {/* Event Type Dropdown at the very top */}
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

            {/* Header */}

            <div className="flex items-center justify-between mb-4">
                <Header 
                    pageTitle="Areas" 
                    onAddClick={() => setIsModalOpen(true)}
                    onSearchChange={handleSearchChange}
                    searchValue={searchTerm}
                    onFilterChange={handleFilterChange}
                    filterOptions={filterOptions}
                    onDeleteModeToggle={handleAreaDeleteModeToggle}
                    deleteMode={areaSelectionMode}
                    selectedCount={selectedAreaIds.length}
                    onDeleteSelected={handleDeleteSelectedAreas}
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
                    // Refresh the area profile after successful setup
                    if (areaProfileRef.current?.refetch) {
                        areaProfileRef.current.refetch();
                    }
                }}
            />

            {/* Area List */}


            <AreaProfile
                eventId={selectedEventId}
                ref={areaProfileRef}
                onAreaClick={(area) => {
                    if (areaSelectionMode) {
                        setSelectedAreaIds((prev) =>
                            prev.includes(area.AreaID)
                                ? prev.filter((id) => id !== area.AreaID)
                                : [...prev, area.AreaID]
                        );
                    } else {
                        setSelectedArea(area);
                        setIsEditAreaModalOpen(true);
                    }
                }}
                selectedAreaIds={areaSelectionMode ? selectedAreaIds : []}
                selectionMode={areaSelectionMode}
            />
            {/* Edit Area Modal */}
            {isEditAreaModalOpen && selectedArea && (
                <EditAreaModal
                    visible={isEditAreaModalOpen}
                    onClose={() => setIsEditAreaModalOpen(false)}
                    area={selectedArea}
                    onSave={handleEditAreaSave}
                />
            )}

            {/* Add Area Modal */}
            <AddAreaModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleAddAreaSuccess}
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
