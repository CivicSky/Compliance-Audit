import React, { useState, useRef, useEffect, useCallback } from "react";
import Header from "../Header/header"
import OfficeP from "../OfficeP/OfficeP";
import AddOfficeHeadModal from "../AddHead/AddOfficeHeadModal";

export default function Home() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortType, setSortType] = useState('name');
    const [deleteMode, setDeleteMode] = useState(false);
    const [selectedCount, setSelectedCount] = useState(0);
    const [selectedIds, setSelectedIds] = useState([]);
    const officePRef = useRef();

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

    const handleSuccess = (newOfficeHead) => {
        console.log('New office head added:', newOfficeHead);
        
        // Refresh the OfficeP component to show the new data
        if (officePRef.current && officePRef.current.refresh) {
            officePRef.current.refresh();
        }
        
        // Optional: Show success message
        // You could add a toast notification here
    };

    const handleSearchChange = (term) => {
        setSearchTerm(term);
    };

    const handleSortChange = (type) => {
        setSortType(type);
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
        if (selectedIds.length === 0 || !officePRef.current) return;
        
        // Confirm deletion
        const confirmed = window.confirm(
            `Are you sure you want to delete ${selectedIds.length} office head(s)? This action cannot be undone.`
        );
        
        if (!confirmed) return;
        
        try {
            const result = await officePRef.current.deleteSelected(selectedIds);
            if (result.success) {
                // Reset selection state
                setSelectedCount(0);
                setSelectedIds([]);
                setDeleteMode(false);
                // Show success message
                console.log('Successfully deleted selected office heads');
                alert(`Successfully deleted ${selectedIds.length} office head(s)`);
            } else {
                // Show error message
                console.error('Failed to delete office heads:', result.message);
                alert(result.message || 'Failed to delete office heads');
            }
        } catch (error) {
            console.error('Error deleting office heads:', error);
            alert('An error occurred while deleting office heads');
        }
    };

    return (
        <div className="px-6 pb-6 pt-6 w-full">
            <Header 
                pageTitle="Office Heads" 
                onAddClick={() => setIsModalOpen(true)}
                onSearchChange={handleSearchChange}
                searchValue={searchTerm}
                onSortChange={handleSortChange}
                sortValue={sortType}
                onDeleteModeToggle={handleDeleteModeToggle}
                deleteMode={deleteMode}
                selectedCount={selectedCount}
                onDeleteSelected={handleDeleteSelected}
            />

            <div className="relative z-10">
                <OfficeP 
                    ref={officePRef} 
                    searchTerm={searchTerm} 
                    sortType={sortType}
                    deleteMode={deleteMode}
                    onSelectionChange={handleSelectionChange}
                />
            </div>

            {/* Modal */}
            {isModalOpen && (
                <AddOfficeHeadModal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handleSuccess}
                />
            )}
        </div>
    );
};



