import React, { useState, useRef, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import EventsP from "../components/EventsProfile/EventsProfle";
import AddEventModal from "../components/Events/AddEventModal";
import UnifiedSetupWizard from "../components/UnifiedSetupWizard/UnifiedSetupWizard";
import { Wand2 } from "lucide-react";
import { usersAPI } from "../utils/api";
import { useModal } from "../components/UI/ModalProvider";
import { useToast } from "../components/UI/Toast";
import Header from "../components/Header/header";

export default function Events() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showWizard, setShowWizard] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteMode, setDeleteMode] = useState(false);
    const [selectedCount, setSelectedCount] = useState(0);
    const [selectedIds, setSelectedIds] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const eventsPRef = useRef();
    const { showAlert, showConfirm } = useModal();
    const { toast } = useToast() || {};

    // Default to admin (show features) until we confirm otherwise
    const isAdmin = !!(currentUser && (currentUser.RoleName === 'admin' || currentUser.RoleID === 1));

    const isAuditor = currentUser?.RoleID === 4 || 
                      String(currentUser?.RoleName || '').toLowerCase().includes('auditor') || 
                      currentUser?.isExternalAuditor;

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

    // Redirect Auditors away from Downloads page
    if (currentUser && isAuditor) {
        return <Navigate to="/home" replace />;
    }

    // Reset all states when component unmounts or navigation happens
    useEffect(() => {
        // Clear any blocking states when component mounts
        setDeleteMode(false);
        setSelectedCount(0);
        setSelectedIds([]);
        
        return () => {
            // Cleanup function
            setDeleteMode(false);
            setSelectedCount(0);
            setSelectedIds([]);
            setIsModalOpen(false);
        };
    }, []);

    const handleSuccess = (newEvent) => {
        console.log('New event added:', newEvent);
        
        // Refresh the EventsP component to show the new data
        if (eventsPRef.current && eventsPRef.current.refresh) {
            eventsPRef.current.refresh();
        }
    };

    const handleEditSave = async (updatedEvent) => {
        try {
            const { eventsAPI } = await import('../utils/api');
            
            // Call API to update event
            const response = await eventsAPI.updateEvent(updatedEvent.EventID, {
                EventCode: updatedEvent.EventCode,
                EventName: updatedEvent.EventName,
                Description: updatedEvent.Description,
                status: updatedEvent.status
            });

            if (response.success) {
                console.log('Event updated successfully');
                // Refresh the list
                if (eventsPRef.current && eventsPRef.current.refresh) {
                    eventsPRef.current.refresh();
                }
                // Close modal and reset selected event after successful save
                await showAlert('Event updated successfully!');
                return true; // Return success status
            } else {
                await showAlert(response.message || 'Failed to update event');
                return false; // Return failure status
            }
        } catch (error) {
            console.error('Error updating event:', error);
            await showAlert('An error occurred while updating the event');
            return false; // Return failure status
        }
    };

    const handleSearchChange = (term) => {
        setSearchTerm(term);
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
        if (selectedIds.length === 0 || !eventsPRef.current) return;
        
        // Confirm deletion
        const confirmed = await showConfirm(`Are you sure you want to delete ${selectedIds.length} event(s)? This action cannot be undone.`);
        if (!confirmed) return;
        
        try {
            const result = await eventsPRef.current.deleteSelected(selectedIds);
            if (result.success) {
                // Reset selection state
                setSelectedCount(0);
                setSelectedIds([]);
                setDeleteMode(false);
                // Show success message
                toast?.({
                    title: 'Events Deleted',
                    description: `Successfully deleted ${selectedIds.length} event(s)`,
                    variant: 'success',
                    duration: 3000,
                });
            } else {
                // Show error message
                toast?.({
                    title: 'Delete Failed',
                    description: result.message || 'Failed to delete events',
                    variant: 'error',
                    duration: 3000,
                });
            }
        } catch (error) {
            console.error('Error deleting events:', error);
            toast?.({
                title: 'Delete Error',
                description: 'An error occurred while deleting events',
                variant: 'error',
                duration: 3000,
            });
        }
    };

    return (
        <div className="px-4 sm:px-6 pb-6 pt-2 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <Header 
                    pageTitle="Events" 
                    onAddClick={() => setIsModalOpen(true)}
                    onSearchChange={handleSearchChange}
                    searchValue={searchTerm}
                    onDeleteModeToggle={handleDeleteModeToggle}
                    deleteMode={deleteMode}
                    selectedCount={selectedCount}
                    onDeleteSelected={handleDeleteSelected}
                    hideSortButton={true}
                    userRole={currentUser?.RoleID}
                />
                {isAdmin && (
                    <button 
                        onClick={() => setShowWizard(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition text-sm shrink-0 self-start sm:self-auto"
                        title="Quick setup with wizard"
                    >
                        <Wand2 size={18} /> Wizard
                    </button>
                )}
            </div>

            <UnifiedSetupWizard 
                isOpen={showWizard} 
                onClose={() => setShowWizard(false)}
                onSuccess={handleSuccess}
            />

            <div className="relative z-10">
                <EventsP 
                    ref={eventsPRef} 
                    searchTerm={searchTerm}
                    deleteMode={deleteMode}
                    onSelectionChange={handleSelectionChange}
                />
            </div>

            {/* Add Modal */}
            {isModalOpen && (
                <AddEventModal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handleSuccess}
                />
            )}
        </div>
    );
};
