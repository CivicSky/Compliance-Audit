import React, { useState, useRef, useEffect, useCallback } from "react";
import Header from "../Header/header"
// Use the EventsProfile implementation (exports EventsP) so the page shows the detailed events
import EventsP from "../EventsProfile/EventsProfle";
import AddEventModal from "../AddEvent/AddEventModal";
import EditEventModal from "../EditEvents/EditeventsModal";

export default function Events() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteMode, setDeleteMode] = useState(false);
    const [selectedCount, setSelectedCount] = useState(0);
    const [selectedIds, setSelectedIds] = useState([]);
    const eventsPRef = useRef();

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

    const handleEventClick = (event) => {
        if (!deleteMode) {
            setSelectedEvent(event);
            setIsEditModalOpen(true);
        }
    };

    const handleEditSave = async (updatedEvent) => {
        try {
            const { eventsAPI } = await import('../../utils/api');
            
            // Call API to update event
            const response = await eventsAPI.updateEvent(updatedEvent.EventID, {
                EventCode: updatedEvent.EventCode,
                EventName: updatedEvent.EventName,
                Description: updatedEvent.Description
            });

            if (response.success) {
                console.log('Event updated successfully');
                // Refresh the list
                if (eventsPRef.current && eventsPRef.current.refresh) {
                    eventsPRef.current.refresh();
                }
                alert('Event updated successfully!');
            } else {
                alert(response.message || 'Failed to update event');
            }
        } catch (error) {
            console.error('Error updating event:', error);
            alert('An error occurred while updating the event');
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
        const confirmed = window.confirm(
            `Are you sure you want to delete ${selectedIds.length} event(s)? This action cannot be undone.`
        );
        
        if (!confirmed) return;
        
        try {
            const result = await eventsPRef.current.deleteSelected(selectedIds);
            if (result.success) {
                // Reset selection state
                setSelectedCount(0);
                setSelectedIds([]);
                setDeleteMode(false);
                // Show success message
                console.log('Successfully deleted selected events');
                alert(`Successfully deleted ${selectedIds.length} event(s)`);
            } else {
                // Show error message
                console.error('Failed to delete events:', result.message);
                alert(result.message || 'Failed to delete events');
            }
        } catch (error) {
            console.error('Error deleting events:', error);
            alert('An error occurred while deleting events');
        }
    };

    return (
        <div className="px-6 pb-6 pt-6 w-full">
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
            />

            <div className="relative z-10">
                <EventsP 
                    ref={eventsPRef} 
                    searchTerm={searchTerm}
                    deleteMode={deleteMode}
                    onSelectionChange={handleSelectionChange}
                    onEventClick={handleEventClick}
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

            {/* Edit Modal */}
            {isEditModalOpen && (
                <EditEventModal 
                    visible={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setSelectedEvent(null);
                    }}
                    event={selectedEvent}
                    onSave={handleEditSave}
                />
            )}
        </div>
    );
};



