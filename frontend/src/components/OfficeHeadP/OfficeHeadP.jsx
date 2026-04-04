import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import user from "../../assets/images/user.svg";
import { officeHeadsAPI, officesAPI, usersAPI } from "../../utils/api";
import EditOfficeHeadModal from '../EditHead/EditOfficeHeadModal.jsx';
import Pagination from "../Pagination/Pagination";
import OfficeHeaddetails from "../OfficeHead/OfficeHeaddetails.jsx";

const OfficeHeadP = forwardRef(({ searchTerm = '', sortType = 'name', deleteMode = false, onSelectionChange, viewMode = 'grid' }, ref) => {
    const [officeHeads, setOfficeHeads] = useState([]);
    const [offices, setOffices] = useState([]);
    const [filteredOfficeHeads, setFilteredOfficeHeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedHeads, setSelectedHeads] = useState(new Set());
    const [expandedCards, setExpandedCards] = useState(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [detailsHead, setDetailsHead] = useState(null);
    const [detailsOffices, setDetailsOffices] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);

    const isAdmin = currentUser?.RoleName === 'admin' || currentUser?.RoleID === 1;

    // Fetch office heads and offices data from database
    useEffect(() => {
        fetchOfficeHeads();
        fetchOffices();
        const fetchCurrentUser = async () => {
            try {
                const res = await usersAPI.getLoggedInUser().catch(() => null);
                if (res && res.success) setCurrentUser(res.user);
            } catch (err) {
                console.error('Failed to load current user:', err);
            }
        };
        fetchCurrentUser();
    }, []);

    const fetchOffices = async () => {
        try {
            const res = await officesAPI.getAll();
            // Support both {data: [...]} and [...] response
            if (Array.isArray(res)) {
                setOffices(res);
            } else if (res && Array.isArray(res.data)) {
                setOffices(res.data);
            } else {
                setOffices([]);
            }
        } catch (err) {
            setOffices([]);
        }
    };

    // Filter and sort office heads based on search term and sort type
    useEffect(() => {
        let filtered = officeHeads;
        
        // Apply search filter first
        if (searchTerm.trim()) {
            filtered = officeHeads.filter(person => {
                const fullName = `${person.FirstName}${person.MiddleInitial ? ' ' + person.MiddleInitial + '.' : ''} ${person.LastName}`.toLowerCase();
                const position = person.Position?.toLowerCase() || '';
                const contact = person.ContactInfo?.toLowerCase() || '';
                const searchLower = searchTerm.toLowerCase();
                
                return fullName.includes(searchLower) || 
                       position.includes(searchLower) || 
                       contact.includes(searchLower);
            });
        }

        // Apply filtering based on sort type
        switch (sortType) {
            case 'assigned':
                // Show only assigned office heads (those with OfficeID)
                filtered = filtered.filter(person => person.OfficeID);
                break;
                
            case 'unassigned':
                // Show only unassigned office heads (those without OfficeID)
                filtered = filtered.filter(person => !person.OfficeID);
                break;
                
            case 'name':
            default:
                // Show all, no additional filtering
                break;
        }

        // Sort by name in ascending order for all cases
        const sortedFiltered = [...filtered].sort((a, b) => {
            const nameA = `${a.FirstName} ${a.LastName}`.toLowerCase();
            const nameB = `${b.FirstName} ${b.LastName}`.toLowerCase();
            return nameA.localeCompare(nameB);
        });

        setFilteredOfficeHeads(sortedFiltered);
    }, [officeHeads, searchTerm, sortType]);

    // Handle selection changes and notify parent component
    useEffect(() => {
        if (onSelectionChange) {
            onSelectionChange(selectedHeads.size, Array.from(selectedHeads));
        }
    }, [selectedHeads, onSelectionChange]);

    // Clear selections when delete mode is turned off
    useEffect(() => {
        if (!deleteMode) {
            setSelectedHeads(new Set());
        }
    }, [deleteMode]);

    const handleCheckboxChange = (headId, isChecked) => {
        setSelectedHeads(prev => {
            const newSet = new Set(prev);
            if (isChecked) {
                newSet.add(headId);
            } else {
                newSet.delete(headId);
            }
            return newSet;
        });
    };

    const toggleHeadSelection = (headId) => {
        setSelectedHeads(prev => {
            const next = new Set(prev);
            if (next.has(headId)) {
                next.delete(headId);
            } else {
                next.add(headId);
            }
            return next;
        });
    };

    const toggleExpand = (headId) => {
        setExpandedCards(prev => {
            const newSet = new Set(prev);
            if (newSet.has(headId)) {
                newSet.delete(headId);
            } else {
                newSet.add(headId);
            }
            return newSet;
        });
    };

    const openDetails = (person, assignedOffices) => {
        setDetailsHead(person);
        setDetailsOffices(assignedOffices || []);
        setIsDetailsOpen(true);
    };

    const closeDetails = () => {
        setIsDetailsOpen(false);
        setDetailsHead(null);
        setDetailsOffices([]);
    };

    const deleteSelectedHeads = async (headIds) => {
        try {
            console.log('Attempting to delete heads:', headIds);
            console.log('API Base URL:', 'http://localhost:5000/api/officeheads/delete');
            
            // Make API call to delete heads
            const response = await officeHeadsAPI.deleteHeads(headIds);
            console.log('Delete response:', response);
            
            if (response.success) {
                // Remove deleted heads from local state
                setOfficeHeads(prev => prev.filter(head => !headIds.includes(head.HeadID)));
                setSelectedHeads(new Set());
                return { success: true };
            } else {
                console.error('Delete failed:', response.message);
                return { success: false, message: response.message || 'Failed to delete office heads' };
            }
        } catch (error) {
            console.error('Error deleting office heads:', error);
            console.error('Error details:', error.response?.data || error.message);
            
            // Check if it's a network error
            if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
                return { success: false, message: 'Network error. Please check if the backend server is running on port 5000.' };
            }
            
            // Check for specific error responses
            if (error.response) {
                return { success: false, message: `Server error: ${error.response.data?.message || error.response.statusText}` };
            }
            
            return { success: false, message: 'Error deleting office heads. Please try again.' };
        }
    };

    const fetchOfficeHeads = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await officeHeadsAPI.getAllHeads();
            console.log('DEBUG: officeHeadsAPI.getAllHeads() response:', response);
            if (Array.isArray(response)) {
                setOfficeHeads(response);
            } else if (response && Array.isArray(response.data)) {
                setOfficeHeads(response.data);
            } else {
                console.error('Unexpected response format:', response);
                setError('Failed to fetch office heads - unexpected data format');
            }
        } catch (error) {
            console.error('Error fetching office heads:', error);
            console.error('Error message:', error.message);
            console.error('Error response:', error.response?.data);
            setError('Error loading office heads. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Function to refresh data (can be called from parent component)
    const refreshData = () => {
        fetchOfficeHeads();
    };

    // Expose refresh function to parent
    useImperativeHandle(ref, () => ({
        refresh: refreshData,
        deleteSelected: deleteSelectedHeads
    }));

    // Edit modal state
    const [selectedHead, setSelectedHead] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [actionMenuHeadId, setActionMenuHeadId] = useState(null);

    const openEdit = (person) => {
        setSelectedHead(person);
        setIsEditModalOpen(true);
    };

    const closeEdit = () => {
        setIsEditModalOpen(false);
        setSelectedHead(null);
    };

    const handleDeleteHead = async (person) => {
        if (!person?.HeadID) return;

        const confirmed = window.confirm(`Delete office personnel "${person.FirstName || ''} ${person.LastName || ''}"? This cannot be undone.`);
        if (!confirmed) return;

        const result = await deleteSelectedHeads([person.HeadID]);
        if (result?.success) {
            alert('Office personnel deleted successfully.');
        } else {
            alert(result?.message || 'Failed to delete office personnel.');
        }
    };

    useEffect(() => {
        if (!actionMenuHeadId) return;

        const closeOnOutsideClick = (event) => {
            const target = event.target;
            if (
                target.closest('.office-head-actions-menu') ||
                target.closest('.office-head-actions-button')
            ) {
                return;
            }

            setActionMenuHeadId(null);
        };

        document.addEventListener('mousedown', closeOnOutsideClick);
        return () => document.removeEventListener('mousedown', closeOnOutsideClick);
    }, [actionMenuHeadId]);

    const handleSave = async (updated) => {
        try {
            const formData = new FormData();
            formData.append('FirstName', updated.FirstName || '');
            formData.append('MiddleInitial', updated.MiddleInitial || '');
            formData.append('LastName', updated.LastName || '');
            formData.append('Position', updated.Position || '');
            formData.append('ContactInfo', updated.ContactInfo || '');

            if (updated.ProfilePic && typeof updated.ProfilePic === 'object') {
                formData.append('profilePic', updated.ProfilePic);
            }

            const response = await officeHeadsAPI.updateHead(updated.HeadID, formData);
            if (!response?.success) {
                alert(response?.message || 'Failed to update office personnel.');
                return false;
            }

            await fetchOfficeHeads();
            await fetchOffices();
            alert('Office personnel updated successfully.');
            return true;
        } catch (error) {
            console.error('Error updating office personnel:', error);
            alert(error?.response?.data?.message || error?.message || 'Failed to update office personnel.');
            return false;
        }
    };

    const parseContactInfo = (person = {}) => {
        const primaryEmail = person.Email || person.email || person.EmailAddress || person.emailAddress || person.email_address;
        const contactInfo = person.ContactInfo || person.contactInfo || '';
        const normalizedContact = String(contactInfo || '');
        const emailMatch = normalizedContact.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
        const phoneMatch = normalizedContact.match(/(\+?\d[\d\s()-]{6,}\d)/);

        return {
            email: primaryEmail || (emailMatch ? emailMatch[0] : 'No email provided'),
            phone: phoneMatch ? phoneMatch[0] : 'No phone provided'
        };
    };

    const formatJoinDate = (person) => {
        const rawDate = person?.CreatedAt || person?.created_at || person?.createdAt || person?.JoinDate;
        if (!rawDate) {
            return 'N/A';
        }

        const dateObj = new Date(rawDate);
        if (Number.isNaN(dateObj.getTime())) {
            return 'N/A';
        }

        return dateObj.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const officeHasHead = (office, headId) => {
        const normalizedHeadId = Number(headId);

        if (!Number.isNaN(normalizedHeadId)) {
            if (Number(office?.head_id) === normalizedHeadId || Number(office?.HeadID) === normalizedHeadId) {
                return true;
            }

            if (Array.isArray(office?.head_ids) && office.head_ids.some((id) => Number(id) === normalizedHeadId)) {
                return true;
            }

            if (Array.isArray(office?.HeadIDs) && office.HeadIDs.some((id) => Number(id) === normalizedHeadId)) {
                return true;
            }

            if (Array.isArray(office?.heads) && office.heads.some((head) => Number(head?.HeadID || head?.head_id) === normalizedHeadId)) {
                return true;
            }
        }

        return false;
    };

    const itemsPerPage = 8; // 4 columns x 2 rows on desktop
    const totalPages = Math.max(1, Math.ceil(filteredOfficeHeads.length / itemsPerPage));
    const startIdx = (currentPage - 1) * itemsPerPage;
    const paginatedOfficeHeads = filteredOfficeHeads.slice(startIdx, startIdx + itemsPerPage);
    const visibleOfficeHeads = viewMode === 'list' ? filteredOfficeHeads : paginatedOfficeHeads;

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(1);
        }
    }, [currentPage, totalPages]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, sortType]);

    useEffect(() => {
        setCurrentPage(1);
    }, [viewMode]);

    if (loading) {
        return (
            <div className="mt-6 w-full">
                <div className="bg-white rounded-md p-4 shadow-lg border-2 border-gray-200">
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-gray-600">Loading office personnel...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mt-6 w-full">
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="flex items-center">
                        <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-red-700">{error}</span>
                        <button 
                            onClick={fetchOfficeHeads}
                            className="ml-4 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (filteredOfficeHeads.length === 0 && !loading) {
        if (searchTerm.trim()) {
            return (
                <div className="mt-6 w-full">
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-8 text-center">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
                        <p className="text-gray-600">No office personnel match your search for "{searchTerm}".</p>
                        <p className="text-gray-500 text-sm mt-2">Try adjusting your search terms or browse all office personnel.</p>
                    </div>
                </div>
            );
        } else if (officeHeads.length === 0) {
            return (
                <div className="mt-6 w-full">
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-8 text-center">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM9 9a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Office Personnel Found</h3>
                        <p className="text-gray-600">Start by adding your first office personnel using the "Add Office Personnel" button.</p>
                    </div>
                </div>
            );
        }
    }

    return (
        <div className={viewMode === 'list' ? 'mt-1 w-full flex flex-col pb-24' : 'mt-1 w-full h-full flex flex-col'}>
            {/* Search Results Counter */}
            {searchTerm.trim() && (
                <div className="text-xs text-gray-600 mb-1">
                    Showing {filteredOfficeHeads.length} of {officeHeads.length} office personnel
                    {filteredOfficeHeads.length !== officeHeads.length && ` matching "${searchTerm}"`}
                </div>
            )}

            <div className={viewMode === 'list' ? 'flex flex-col gap-2' : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 auto-rows-fr'}>
                {visibleOfficeHeads.map((person) => {
                    const fullName = `${person.FirstName}${person.MiddleInitial ? ' ' + person.MiddleInitial + '.' : ''} ${person.LastName}`;
                    const profilePicUrl = person.TempPreview
                        ? person.TempPreview
                        : person.ProfilePic
                            ? `http://localhost:5000/uploads/profile-pics/${person.ProfilePic}`
                            : user;
                    const assignedOffices = offices.filter((office) => officeHasHead(office, person.HeadID));
                    const isAssigned = assignedOffices.length > 0;
                    const statusClass = isAssigned
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : 'bg-gray-100 text-gray-600 border-gray-200';
                    const isExpanded = expandedCards.has(person.HeadID);
                    // Removed employeeCode display per user request
                    const { email, phone } = parseContactInfo(person);
                    const joinDate = formatJoinDate(person);
                    const assignedOfficeNames = assignedOffices
                        .map((office) => office.OfficeName || office.office_name || `Office #${office.id || office.OfficeID}`)
                        .join(', ');
                    const assignedOfficeSummary = assignedOffices.length > 0
                        ? `${assignedOffices[0].OfficeName || assignedOffices[0].office_name || `Office #${assignedOffices[0].id || assignedOffices[0].OfficeID}`}${assignedOffices.length > 1 ? ` (+${assignedOffices.length - 1})` : ''}`
                        : 'Not assigned';

                    if (viewMode === 'list') {
                        return (
                            <div
                                key={person.HeadID}
                                className={`relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 ${
                                    selectedHeads.has(person.HeadID) ? 'ring-2 ring-blue-500' : ''
                                } ${deleteMode ? 'cursor-pointer hover:border-gray-300' : 'hover:border-indigo-200 hover:shadow-md'}`}
                                onClick={() => {
                                    if (deleteMode) toggleHeadSelection(person.HeadID);
                                }}
                            >
                                <div className="flex items-center gap-3 px-3 py-2">
                                    {deleteMode && (
                                        <div className="flex-shrink-0">
                                            <input
                                                type="checkbox"
                                                checked={selectedHeads.has(person.HeadID)}
                                                onChange={(e) => handleCheckboxChange(person.HeadID, e.target.checked)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                        </div>
                                    )}

                                    <div className="h-9 w-9 flex-shrink-0 rounded-full bg-[#d6f0ec] p-0.5">
                                        <img
                                            src={profilePicUrl}
                                            alt={fullName}
                                            className="h-full w-full rounded-full border border-white object-cover"
                                            onError={(e) => {
                                                e.target.src = user;
                                            }}
                                        />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="truncate text-[13px] font-semibold text-gray-900">{fullName}</h3>
                                            <span
                                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClass}`}
                                                style={{
                                                    transition: 'transform 180ms ease',
                                                    transform: deleteMode ? 'translateX(20px)' : 'translateX(0)'
                                                }}
                                            >
                                                {isAssigned ? 'Assigned' : 'Unassigned'}
                                            </span>
                                        </div>

                                        {!isExpanded ? (
                                            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-gray-600">
                                                {/* Removed employeeCode per user request */}
                                                <span className="text-gray-300">|</span>
                                                <span className="truncate">{email}</span>
                                            </div>
                                        ) : (
                                            <p className="mt-0.5 truncate text-[11px] text-gray-600">
                                                <span className="font-semibold text-gray-700">Assigned offices:</span>{' '}
                                                {assignedOfficeNames || 'Not assigned to any office'}
                                            </p>
                                        )}
                                        <p className="mt-0.5 truncate text-[10px] text-slate-500" title={assignedOfficeNames || 'Not assigned to any office'}>
                                            Office: {assignedOfficeSummary}
                                        </p>
                                    </div>

                                        <div className="ml-auto flex items-center gap-2">
                                        <div className="flex flex-col items-end leading-tight">
                                            <p className="whitespace-nowrap text-[10px] text-gray-500">Join {joinDate}</p>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openDetails(person, assignedOffices);
                                                }}
                                                className="mt-1 text-[11px] font-semibold text-gray-700 transition hover:text-blue-600"
                                            >
                                                View details
                                            </button>
                                        </div>
                                        {isAdmin && (
                                            <div className="relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActionMenuHeadId((prev) => (prev === person.HeadID ? null : person.HeadID));
                                                }}
                                                className="office-head-actions-button inline-flex h-6 w-6 items-center justify-center rounded-full text-gray-950 transition hover:bg-gray-100 hover:text-black"
                                                aria-label="Open office personnel actions"
                                                title="Actions"
                                            >
                                                <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6h.01M12 12h.01M12 18h.01" />
                                                </svg>
                                            </button>

                                            {actionMenuHeadId === person.HeadID && (
                                                <div className="office-head-actions-menu absolute right-0 top-7 z-30 w-32 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActionMenuHeadId(null);
                                                            openEdit(person);
                                                        }}
                                                        className="w-full px-3 py-2 text-left text-xs text-slate-700 transition hover:bg-slate-50"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            setActionMenuHeadId(null);
                                                            await handleDeleteHead(person);
                                                        }}
                                                        className="w-full px-3 py-2 text-left text-xs text-red-600 transition hover:bg-red-50"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div
                            key={person.HeadID}
                            className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-white via-white to-slate-50 shadow-[0_6px_14px_rgba(15,23,42,0.08)] transition-all duration-200 ${
                                selectedHeads.has(person.HeadID) ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/30' : ''
                            } ${deleteMode ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_10px_18px_rgba(15,23,42,0.12)]' : 'hover:border-cyan-200 hover:shadow-[0_14px_28px_rgba(15,23,42,0.12)]'} min-h-[240px]`}
                            onClick={() => {
                                if (deleteMode) toggleHeadSelection(person.HeadID);
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={selectedHeads.has(person.HeadID)}
                                onChange={(e) => handleCheckboxChange(person.HeadID, e.target.checked)}
                                onClick={(e) => e.stopPropagation()}
                                aria-label="Select office personnel for deletion"
                                style={{
                                    position: 'absolute',
                                    top: 12,
                                    left: 12,
                                    width: 18,
                                    height: 18,
                                    accentColor: '#dc2626',
                                    transition: 'opacity 180ms ease, transform 180ms ease',
                                    transitionDelay: deleteMode ? '180ms' : '0ms',
                                    opacity: deleteMode ? 1 : 0,
                                    transform: deleteMode ? 'scale(1) translateX(0px)' : 'scale(0.8) translateX(-6px)',
                                    pointerEvents: deleteMode ? 'auto' : 'none',
                                    zIndex: 10
                                }}
                            />

                            <div
                                className="p-3 h-full flex flex-col"
                            >
                                {!isExpanded ? (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <span
                                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusClass}`}
                                                style={{
                                                    transition: 'transform 180ms ease',
                                                    transform: deleteMode ? 'translateX(20px)' : 'translateX(0)'
                                                }}
                                            >
                                                {isAssigned ? 'Assigned' : 'Unassigned'}
                                            </span>
                                            {isAdmin && (
                                                <div className="relative">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActionMenuHeadId((prev) => (prev === person.HeadID ? null : person.HeadID));
                                                    }}
                                                    className="office-head-actions-button inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 hover:text-black"
                                                    aria-label="Open office personnel actions"
                                                    title="Actions"
                                                >
                                                    <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6h.01M12 12h.01M12 18h.01" />
                                                    </svg>
                                                </button>

                                                {actionMenuHeadId === person.HeadID && (
                                                    <div className="office-head-actions-menu absolute right-0 top-8 z-30 w-32 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActionMenuHeadId(null);
                                                                openEdit(person);
                                                            }}
                                                            className="w-full px-3 py-2 text-left text-xs text-slate-700 transition hover:bg-slate-50"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                setActionMenuHeadId(null);
                                                                await handleDeleteHead(person);
                                                            }}
                                                            className="w-full px-3 py-2 text-left text-xs text-red-600 transition hover:bg-red-50"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-1 flex justify-center">
                                            <div className="h-[42px] w-[42px] rounded-full bg-cyan-100 p-1">
                                                <img
                                                    src={profilePicUrl}
                                                    alt={fullName}
                                                    className="h-full w-full rounded-full border border-white object-cover"
                                                    onError={(e) => {
                                                        e.target.src = user;
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-0.5 text-center">
                                            <h3 className="text-[14px] font-semibold text-slate-900 truncate">{fullName}</h3>
                                            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 truncate">{person.Position || 'Office Personnel'}</p>
                                        </div>

                                        <div className="mt-1 space-y-1 rounded-xl border border-slate-200 bg-white/80 p-2 text-[12px] text-slate-700">
                                            {/* Removed employeeCode per user request */}
                                            <div className="flex items-center gap-1.5">
                                                <svg className="h-3 w-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12H8m8 0a4 4 0 100-8 4 4 0 000 8zM8 12a4 4 0 100-8 4 4 0 000 8zm0 0v8m8-8v8" />
                                                </svg>
                                                <span className="truncate">{email}</span>
                                            </div>
                                            <p className="truncate text-[11px] text-slate-500" title={assignedOfficeNames || 'Not assigned to any office'}>
                                                Office: {assignedOfficeSummary}
                                            </p>
                                        </div>

                                        <div className="mt-1 flex items-center justify-between border-t border-slate-200 pt-1">
                                            <p className="text-[11px] text-slate-500 truncate">Join at {joinDate}</p>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openDetails(person, assignedOffices);
                                                }}
                                                className="text-[12px] font-semibold text-slate-700 transition hover:text-blue-600"
                                            >
                                                View details
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="min-w-0">
                                            <h3 className="text-[14px] font-semibold text-slate-900 truncate">{fullName}</h3>
                                            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 truncate">{person.Position || 'Office Personnel'}</p>
                                        </div>

                                        <div className="mt-2 flex-1 border-t border-slate-200 pt-2">
                                            <p className="text-[12px] font-semibold text-slate-500">Assigned office(s)</p>
                                            {assignedOffices.length > 0 ? (
                                                <ul className="mt-1 max-h-[110px] list-disc overflow-y-auto pl-4 text-[12px] text-slate-700">
                                                    {assignedOffices.map((office) => (
                                                        <li key={office.id || office.OfficeID}>
                                                            {office.OfficeName || office.office_name || `Office #${office.id || office.OfficeID}`}
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="mt-1 text-[12px] text-slate-600">Not assigned to any office</p>
                                            )}
                                        </div>

                                        <div className="mt-1 flex items-center justify-between border-t border-slate-200 pt-1">
                                            <p className="text-[11px] text-slate-500 truncate">Assigned offices</p>
                                            <button
                                                onClick={() => toggleExpand(person.HeadID)}
                                                className="text-[12px] font-semibold text-slate-700 transition hover:text-blue-600"
                                            >
                                                Back
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {viewMode !== 'list' && (
                <div className="pt-1">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={(p) => setCurrentPage(p)}
                        fixed={true}
                        showWhenSinglePage={true}
                    />
                </div>
            )}

            <OfficeHeaddetails
                visible={isDetailsOpen}
                onClose={closeDetails}
                head={detailsHead}
                offices={detailsOffices}
            />

                {/* Edit modal */}
                <EditOfficeHeadModal
                    visible={isEditModalOpen}
                    onClose={closeEdit}
                    head={selectedHead}
                    onSave={handleSave}
                />
        </div>
    );
});

export default OfficeHeadP;