import { useState, useEffect, useRef } from "react";
import logo from "../../assets/images/lccb_logo.png"
import search from "../../assets/images/search.svg"

export default function Header({ pageTitle = "Compliance Audit", showSearch = true, onAddClick, onSearchChange, searchValue = '', onSortChange, sortValue = 'name', onFilterChange, filterOptions = { events: [], types: [] }, onDeleteModeToggle, deleteMode = false, selectedCount = 0, onDeleteSelected, hideSortButton = false, showRequirementsFilter = false }) {
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [showDeleteDropdown, setShowDeleteDropdown] = useState(false);
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const sortDropdownRef = useRef(null);
    const deleteDropdownRef = useRef(null);
    const filterDropdownRef = useRef(null);

    const sortOptions = [
        { value: 'name', label: 'By Name' },
        { value: 'assigned', label: 'Assigned' },
        { value: 'unassigned', label: 'Unassigned' }
    ];

    const handleSortSelect = (sortType) => {
        if (onSortChange) {
            onSortChange(sortType);
        }
        setShowSortDropdown(false);
    };

    const handleDeleteModeToggle = () => {
        if (onDeleteModeToggle) {
            onDeleteModeToggle(!deleteMode);
        }
        setShowDeleteDropdown(false);
    };

    const handleDeleteSelected = () => {
        if (onDeleteSelected) {
            onDeleteSelected();
        }
        setShowDeleteDropdown(false);
    };

    const handleFilterToggle = (filterType, value) => {
        if (!onFilterChange) return;

        const newFilters = { ...filterOptions };
        
        if (filterType === 'event') {
            if (newFilters.events.includes(value)) {
                newFilters.events = newFilters.events.filter(e => e !== value);
            } else {
                newFilters.events.push(value);
            }
        } else if (filterType === 'type') {
            if (newFilters.types.includes(value)) {
                newFilters.types = newFilters.types.filter(t => t !== value);
            } else {
                newFilters.types.push(value);
            }
        }
        
        onFilterChange(newFilters);
    };

    const clearAllFilters = () => {
        if (onFilterChange) {
            onFilterChange({ events: [], types: [] });
        }
    };

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) {
                setShowSortDropdown(false);
            }
            if (deleteDropdownRef.current && !deleteDropdownRef.current.contains(event.target)) {
                setShowDeleteDropdown(false);
            }
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
                setShowFilterDropdown(false);
            }
        };

        const handleEscapeKey = (event) => {
            if (event.key === 'Escape') {
                setShowSortDropdown(false);
                setShowDeleteDropdown(false);
                setShowFilterDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscapeKey);
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, []);
    return (
        <div className="header-container fixed top-0 lg:left-64 left-0 right-0 lg:top-0 top-16 z-40 bg-white shadow-lg lg:px-6 lg:py-4 px-4 py-2">
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center lg:gap-4 gap-2">
                    <img
                        src={logo}
                        alt="Logo"
                        className="lg:h-16 lg:w-16 h-8 w-8 object-contain"
                    />
                    <h1 className="lg:text-3xl text-lg font-bold text-gray-800">
                        {pageTitle}
                    </h1>
                </div>

                {showSearch && (
                    <div className="flex items-center lg:gap-4 gap-2">
                        <div className="relative lg:w-80 w-48">
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchValue}
                                onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                                className="w-full lg:px-4 lg:py-2 px-2 py-1 lg:pr-10 pr-8 rounded-md bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 border-0 shadow-inner lg:text-base text-sm"
                            />
                            <img
                                src={search}
                                alt="Search"
                                className="absolute lg:right-3 right-2 top-1/2 -translate-y-1/2 lg:h-5 lg:w-5 h-4 w-4 text-gray-500 pointer-events-none"
                            />
                        </div>
                        
                        {/* Toolbar buttons */}
                        <div className="flex items-center gap-2">
                            {/* Add Button */}
                            {onAddClick && (
                                <button
                                    type="button"
                                    onClick={onAddClick}
                                    className="flex items-center justify-center lg:w-10 lg:h-10 w-8 h-8 rounded-md shadow-md border border-gray-200 bg-green-500 text-white hover:bg-green-600"
                                    title="Add Requirement"
                                >
                                    <svg className="lg:w-5 lg:h-5 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </button>
                            )}

                            {/* Delete Button */}
                            {onDeleteModeToggle && (
                                <button
                                    type="button"
                                    onClick={handleDeleteModeToggle}
                                    className={`flex items-center justify-center lg:w-10 lg:h-10 w-8 h-8 rounded-md shadow-md border border-gray-200 ${deleteMode ? 'bg-red-500 text-white' : 'bg-white text-gray-700 hover:bg-red-50'}`}
                                    title={deleteMode ? "Cancel Delete" : "Delete Requirements"}
                                >
                                    <svg className="lg:w-5 lg:h-5 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                                                        {/* Confirm Delete Button (only show in delete mode and if items are selected) */}
                                                        {deleteMode && selectedCount > 0 && onDeleteSelected && (
                                                            <button
                                                                type="button"
                                                                onClick={handleDeleteSelected}
                                                                className="flex items-center justify-center lg:w-10 lg:h-10 w-8 h-8 rounded-md shadow-md border border-gray-200 bg-red-600 text-white hover:bg-red-700"
                                                                title="Confirm Delete"
                                                            >
                                                                <svg className="lg:w-5 lg:h-5 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                                                </svg>
                                                                <span className="ml-1 text-xs font-bold">{selectedCount}</span>
                                                            </button>
                                                        )}
                            {/* Filter Button for Requirements */}
                            {showRequirementsFilter && (
                                <div className="relative" ref={filterDropdownRef}>
                                    <button
                                        type="button"
                                        onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                                        className={`flex items-center justify-center lg:w-10 lg:h-10 w-8 h-8 rounded-md shadow-md border border-gray-200 ${
                                            filterOptions.events.length > 0 || filterOptions.types.length > 0
                                                ? 'bg-blue-500 text-white hover:bg-blue-600'
                                                : 'bg-white text-gray-700 hover:bg-gray-50'
                                        }`}
                                        title="Filter"
                                    >
                                        <svg className="lg:w-5 lg:h-5 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                        </svg>
                                        {(filterOptions.events.length > 0 || filterOptions.types.length > 0) && (
                                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                                {filterOptions.events.length + filterOptions.types.length}
                                            </span>
                                        )}
                                    </button>
                                    {/* Filter Dropdown */}
                                    {showFilterDropdown && (
                                        <div className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
                                            <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                                                <h3 className="font-semibold text-gray-800">Filter Requirements</h3>
                                                {(filterOptions.events.length > 0 || filterOptions.types.length > 0) && (
                                                    <button
                                                        onClick={clearAllFilters}
                                                        className="text-xs text-blue-600 hover:text-blue-700"
                                                    >
                                                        Clear All
                                                    </button>
                                                )}
                                            </div>
                                            {/* By Events */}
                                            <div className="p-3 border-b border-gray-200">
                                                <h4 className="text-sm font-medium text-gray-700 mb-2">By Event</h4>
                                                <div className="space-y-2">
                                                    {['PAASCU', 'PACUCOA', 'ISO'].map((event) => (
                                                        <label key={event} className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded">
                                                            <input
                                                                type="checkbox"
                                                                checked={filterOptions.events.includes(event)}
                                                                onChange={() => handleFilterToggle('event', event)}
                                                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                            />
                                                            <span className="ml-2 text-sm text-gray-700">{event}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                            {/* By Type */}
                                            <div className="p-3">
                                                <h4 className="text-sm font-medium text-gray-700 mb-2">By Type</h4>
                                                <div className="space-y-2">
                                                    {[
                                                        { value: 'main', label: 'Main Requirements' },
                                                        { value: 'sub', label: 'Sub Requirements' },
                                                        { value: 'nested', label: 'Nested (3+ levels)' }
                                                    ].map((type) => (
                                                        <label key={type.value} className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded">
                                                            <input
                                                                type="checkbox"
                                                                checked={filterOptions.types.includes(type.value)}
                                                                onChange={() => handleFilterToggle('type', type.value)}
                                                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                            />
                                                            <span className="ml-2 text-sm text-gray-700">{type.label}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
