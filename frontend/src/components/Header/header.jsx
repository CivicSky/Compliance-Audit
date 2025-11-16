import { useState, useEffect, useRef } from "react";
import logo from "../../assets/images/lccb_logo.png"
import search from "../../assets/images/search.svg"

export default function Header({ pageTitle = "Compliance Audit", showSearch = true, onAddClick, onSearchChange, searchValue = '', onSortChange, sortValue = 'name', onDeleteModeToggle, deleteMode = false, selectedCount = 0, onDeleteSelected }) {
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [showDeleteDropdown, setShowDeleteDropdown] = useState(false);
    const sortDropdownRef = useRef(null);
    const deleteDropdownRef = useRef(null);

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

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) {
                setShowSortDropdown(false);
            }
            if (deleteDropdownRef.current && !deleteDropdownRef.current.contains(event.target)) {
                setShowDeleteDropdown(false);
            }
        };

        const handleEscapeKey = (event) => {
            if (event.key === 'Escape') {
                setShowSortDropdown(false);
                setShowDeleteDropdown(false);
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
                            <div className="relative" ref={sortDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                                    className="flex items-center justify-center lg:w-10 lg:h-10 w-8 h-8 bg-white hover:bg-gray-50 rounded-md text-gray-700 shadow-md border border-gray-200"
                                    title="Sort"
                                >
                                    <svg className="lg:w-5 lg:h-5 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                                    </svg>
                                </button>
                                
                                {/* Sort Dropdown */}
                                {showSortDropdown && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                                        <div className="py-1">
                                            {sortOptions.map((option) => (
                                                <button
                                                    key={option.value}
                                                    onClick={() => handleSortSelect(option.value)}
                                                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                                                        sortValue === option.value 
                                                            ? 'bg-blue-50 text-blue-600 font-medium' 
                                                            : 'text-gray-700'
                                                    }`}
                                                >
                                                    {option.label}
                                                    {sortValue === option.value && (
                                                        <svg className="w-4 h-4 inline-block ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={onAddClick}
                                className="flex items-center justify-center lg:w-10 lg:h-10 w-8 h-8 bg-white hover:bg-gray-50 rounded-md text-green-600 shadow-md border border-gray-200"
                                title="Add Office Head"
                            >
                                <svg className="lg:w-5 lg:h-5 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                            </button>
                            
                            <div className="relative" ref={deleteDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteDropdown(!showDeleteDropdown)}
                                    className={`flex items-center justify-center lg:w-10 lg:h-10 w-8 h-8 hover:bg-gray-50 rounded-md shadow-md border border-gray-200 ${
                                        deleteMode ? 'bg-red-50 text-red-600' : 'bg-white text-red-600'
                                    }`}
                                    title="Delete Mode"
                                >
                                    <svg className="lg:w-5 lg:h-5 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                                
                                {/* Delete Dropdown */}
                                {showDeleteDropdown && (
                                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                                        <div className="py-1">
                                            {!deleteMode ? (
                                                <button
                                                    onClick={handleDeleteModeToggle}
                                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors text-gray-700"
                                                >
                                                    <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    Enable Selection Mode
                                                </button>
                                            ) : (
                                                <>
                                                    <div className="px-4 py-2 text-sm text-gray-500 border-b">
                                                        {selectedCount} item(s) selected
                                                    </div>
                                                    <button
                                                        onClick={handleDeleteSelected}
                                                        disabled={selectedCount === 0}
                                                        className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 transition-colors text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                        Delete Selected
                                                    </button>
                                                    <button
                                                        onClick={handleDeleteModeToggle}
                                                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors text-gray-700"
                                                    >
                                                        <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                        Cancel Selection
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

