import React, { useState, useRef, useEffect, useCallback } from "react";
import Header from "../Header/header"
import OfficeHeadP from "../OfficeHeadP/OfficeHeadP";
import AddOfficeHeadModal from "../AddHead/AddOfficeHeadModal";
import Sortoffice from "./sorthead";
import { usersAPI } from "../../utils/api";

export default function Home() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortType, setSortType] = useState('name');
    const [deleteMode, setDeleteMode] = useState(false);
    const [selectedCount, setSelectedCount] = useState(0);
    const [selectedIds, setSelectedIds] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const officePRef = useRef();
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

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

    // Keep page chrome fixed; list scrolling happens inside the content panel.
    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
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
            `Are you sure you want to delete ${selectedIds.length} office personnel? This action cannot be undone.`
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
                alert(`Successfully deleted ${selectedIds.length} office personnel`);
            } else {
                // Show error message
                console.error('Failed to delete office heads:', result.message);
                alert(result.message || 'Failed to delete office personnel');
            }
        } catch (error) {
            console.error('Error deleting office heads:', error);
            alert('An error occurred while deleting office personnel');
        }
    };

    return (
        <div className="h-screen w-full flex flex-col overflow-hidden">
            <Header />
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden px-4 pb-6 pt-6">
            <div className="mb-4 flex flex-col gap-2 relative">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 mb-1">Office Personnel & Compliance</h1>
                        <p className="text-xs text-gray-600 ">Manage personnel assignments.</p>
                    </div>

                    <div className="flex items-center gap-1 pt-0.5">
                        {deleteMode && (
                            <button
                                onClick={async () => {
                                    if (selectedCount === 0) return;
                                    const confirmed = window.confirm(`Delete ${selectedCount} selected item(s)? This cannot be undone.`);
                                    if (!confirmed) return;
                                    try {
                                        await handleDeleteSelected();
                                    } catch (err) {
                                        console.error(err);
                                    }
                                }}
                                className={`ml-2 inline-flex h-8 items-center rounded-lg border px-3 text-[11px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-red-400 bg-red-600 text-white hover:bg-red-700 ${selectedCount === 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
                                disabled={selectedCount === 0}
                            >
                                Delete Selected ({selectedCount})
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => {
                                if (deleteMode) {
                                    setDeleteMode(false);
                                    setSelectedCount(0);
                                    setSelectedIds([]);
                                    return;
                                }
                                setDeleteMode(true);
                                setSelectedCount(0);
                                setSelectedIds([]);
                            }}
                            className={`inline-flex h-8 items-center rounded-lg border px-3 text-[11px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-red-400 ${
                                deleteMode
                                    ? 'border-red-300 bg-red-100 text-red-700 hover:bg-red-200'
                                    : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                            }`}
                        >
                            {deleteMode ? 'Cancel Delete' : 'Delete'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-[11px] font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <span className="text-sm leading-none">+</span>
                            Add
                        </button>
                    </div>
                </div>

                <div className="flex w-full items-center justify-between gap-1">
                    <div className="relative w-full max-w-sm">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                            >
                                <circle cx="11" cy="11" r="7" />
                                <path d="m20 20-3.5-3.5" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search personnel, office, or email..."
                                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-[9px] text-slate-700 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                    </div>

                    <div className="flex items-center gap-1">
                        <div className="relative inline-block">
                            <Sortoffice value={sortType} onChange={setSortType} />
                        </div>

                        <div className="flex h-9 items-center justify-end gap-1">
                            <div className="flex h-7 items-center gap-0.5 rounded-md border border-slate-200 bg-slate-100 p-0.5">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
                                        viewMode === 'grid'
                                            ? 'bg-white text-indigo-600'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                    title="Grid View"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
                                        viewMode === 'list'
                                            ? 'bg-white text-indigo-600'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                    title="List View"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
            </div>

            <div className={`relative z-10 flex-1 min-h-0 ${viewMode === 'list' ? 'overflow-y-auto pr-1' : 'overflow-hidden'}`}>
                <OfficeHeadP 
                    ref={officePRef} 
                    searchTerm={searchTerm} 
                    sortType={sortType}
                    deleteMode={deleteMode}
                    viewMode={viewMode}
                    onSelectionChange={handleSelectionChange}
                />
            </div>
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



