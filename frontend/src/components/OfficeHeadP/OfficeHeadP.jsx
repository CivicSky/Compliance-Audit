import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { createPortal } from 'react-dom';
import user from "../../assets/images/user.svg";
import { officeHeadsAPI, officesAPI, usersAPI } from "../../utils/api";
import { useModal } from "../UI/ModalProvider";
import EditOfficeHeadModal from '../OfficeHead/EditOfficeHeadModal.jsx';
import Pagination from "../Pagination/Pagination";
import OfficeHeaddetails from "../OfficeHead/OfficeHeaddetails.jsx";
import { API_BASE_URL } from '../../utils/apiBase';
import { OfficeCardSkeleton } from "../UI/Skeleton";
import { useLiveRefresh } from "../../utils/liveSync";

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

    // Live syncing on mutations / window focus
    useLiveRefresh(() => {
        fetchOfficeHeads();
        fetchOffices();
    });

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
            console.log('API Base URL:', `${API_BASE_URL}/api/officeheads/delete`);

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
    const [actionMenuAnchorRect, setActionMenuAnchorRect] = useState(null);
    const { showConfirm, showAlert } = useModal();

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

        const confirmed = await showConfirm(`Delete office personnel "${person.FirstName || ''} ${person.LastName || ''}"? This cannot be undone.`);
        if (!confirmed) return;

        const result = await deleteSelectedHeads([person.HeadID]);
        if (result?.success) {
            await showAlert('Office personnel deleted successfully.');
        } else {
            await showAlert(result?.message || 'Failed to delete office personnel.');
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
            setActionMenuAnchorRect(null);
        };

        document.addEventListener('mousedown', closeOnOutsideClick);
        return () => document.removeEventListener('mousedown', closeOnOutsideClick);
    }, [actionMenuHeadId]);

    useEffect(() => {
        if (!actionMenuHeadId) return;

        const closeOnScrollOrResize = () => {
            setActionMenuHeadId(null);
            setActionMenuAnchorRect(null);
        };

        window.addEventListener('resize', closeOnScrollOrResize);
        window.addEventListener('scroll', closeOnScrollOrResize, true);
        return () => {
            window.removeEventListener('resize', closeOnScrollOrResize);
            window.removeEventListener('scroll', closeOnScrollOrResize, true);
        };
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
                await showAlert(response?.message || 'Failed to update office personnel.');
                return false;
            }

            await fetchOfficeHeads();
            await fetchOffices();
            await showAlert('Office personnel updated successfully.');
            return true;
        } catch (error) {
            console.error('Error updating office personnel:', error);
            await showAlert(error?.response?.data?.message || error?.message || 'Failed to update office personnel.');
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

    const itemsPerPage = 30; // limit to 30 per page
    const totalPages = Math.max(1, Math.ceil(filteredOfficeHeads.length / itemsPerPage));
    const startIdx = (currentPage - 1) * itemsPerPage;
    const paginatedOfficeHeads = filteredOfficeHeads.slice(startIdx, startIdx + itemsPerPage);
    // Use pagination for both list and grid views so the UI is consistent
    const visibleOfficeHeads = paginatedOfficeHeads;

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
                <OfficeCardSkeleton count={6} />
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

            <div className={viewMode === 'list' ? 'flex flex-col gap-2' : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-fr'}>
                {visibleOfficeHeads.map((person) => {
                    const fullName = `${person.FirstName || ''}${person.MiddleInitial ? ' ' + person.MiddleInitial + '.' : ''} ${person.LastName || ''}`.trim() || 'Personnel';
                    const initials = `${(person.FirstName || '').trim().charAt(0)}${(person.LastName || '').trim().charAt(0)}`.toUpperCase() || 'OP';
                    const profilePicUrl = person.TempPreview
                        ? person.TempPreview
                        : person.ProfilePic
                            ? `${API_BASE_URL}/uploads/profile-pics/${person.ProfilePic}`
                            : null;
                    const assignedOffices = offices.filter((office) => officeHasHead(office, person.HeadID));
                    const isAssigned = assignedOffices.length > 0;
                    const statusClass = isAssigned
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                        : 'bg-slate-100 text-slate-600 border-slate-200';
                    const isExpanded = expandedCards.has(person.HeadID);
                    const isSelected = selectedHeads.has(person.HeadID);
                    const { email } = parseContactInfo(person);

                    const avatarPalettes = [
                        { bg: 'bg-gradient-to-br from-indigo-500 to-blue-600', ring: 'ring-indigo-100' },
                        { bg: 'bg-gradient-to-br from-violet-500 to-purple-600', ring: 'ring-purple-100' },
                        { bg: 'bg-gradient-to-br from-sky-500 to-cyan-600', ring: 'ring-sky-100' },
                        { bg: 'bg-gradient-to-br from-emerald-500 to-teal-600', ring: 'ring-emerald-100' },
                        { bg: 'bg-gradient-to-br from-amber-500 to-orange-600', ring: 'ring-amber-100' },
                        { bg: 'bg-gradient-to-br from-rose-500 to-pink-600', ring: 'ring-rose-100' },
                    ];
                    let hash = 0;
                    for (let i = 0; i < fullName.length; i++) hash = fullName.charCodeAt(i) + ((hash << 5) - hash);
                    const avatarStyle = avatarPalettes[Math.abs(hash) % avatarPalettes.length];

                    if (viewMode === 'list') {
                        return (
                            <div
                                key={person.HeadID}
                                onClick={() => {
                                    if (deleteMode) toggleHeadSelection(person.HeadID);
                                    else openDetails(person, assignedOffices);
                                }}
                                className={`relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs transition-all duration-150 ${selectedHeads.has(person.HeadID) ? 'ring-2 ring-indigo-500 border-indigo-500' : ''
                                    } ${deleteMode ? 'cursor-pointer hover:border-gray-300' : 'hover:border-indigo-200 hover:shadow-md'}`}
                            >
                                <div className="grid grid-cols-8 items-center gap-2 px-4 py-3">
                                    {/* Name column (col-span-4) */}
                                    <div className="col-span-4 flex items-center gap-3 min-w-0">
                                        {deleteMode && (
                                            <div className="flex-shrink-0">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedHeads.has(person.HeadID)}
                                                    onChange={(e) => handleCheckboxChange(person.HeadID, e.target.checked)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                            </div>
                                        )}

                                        <div className="h-10 w-10 flex-shrink-0 rounded-full overflow-hidden relative">
                                            {profilePicUrl ? (
                                                <img
                                                    src={profilePicUrl}
                                                    alt={fullName}
                                                    className="h-full w-full rounded-full object-cover ring-2 ring-slate-100"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'flex';
                                                    }}
                                                />
                                            ) : null}
                                            <div className={`h-full w-full rounded-full flex items-center justify-center font-bold text-white text-xs ${avatarStyle.bg} ${profilePicUrl ? 'hidden' : 'flex'}`}>
                                                {initials}
                                            </div>
                                        </div>

                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="truncate text-[13px] font-semibold text-gray-900">{fullName}</h3>
                                            </div>
                                            <div className="mt-0.5 text-[11px] text-gray-600 truncate">{email}</div>
                                        </div>
                                    </div>

                                    {/* Role column (col-span-2) */}
                                    <div className="col-span-2 flex items-center justify-center">
                                        <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold bg-indigo-50 text-indigo-700 border-indigo-200">
                                            {person.Position || person.RoleName || person.role || 'Personnel'}
                                        </span>
                                    </div>

                                    {/* Status column (col-span-1) */}
                                    <div className="col-span-1 flex items-center justify-center">
                                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusClass}`}>
                                            {isAssigned ? 'Assigned' : 'Unassigned'}
                                        </span>
                                    </div>

                                    {/* Actions column (col-span-1) */}
                                    <div className="col-span-1 flex items-center justify-end">
                                        <div className="flex items-center gap-2">
                                            {isAdmin && (
                                                <div className="relative">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            const isOpen = actionMenuHeadId === person.HeadID;
                                                            if (isOpen) {
                                                                setActionMenuHeadId(null);
                                                                setActionMenuAnchorRect(null);
                                                            } else {
                                                                setActionMenuHeadId(person.HeadID);
                                                                setActionMenuAnchorRect(rect);
                                                            }
                                                        }}
                                                        className="office-head-actions-button inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
                                                        aria-label="Open office personnel actions"
                                                        title="Actions"
                                                    >
                                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6h.01M12 12h.01M12 18h.01" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div
                            key={person.HeadID}
                            className={`group relative flex flex-col justify-between rounded-2xl border bg-white shadow-xs hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 overflow-hidden ${isSelected
                                    ? 'border-indigo-500 ring-2 ring-indigo-400/50 bg-indigo-50/15'
                                    : 'border-slate-200/90 hover:border-indigo-300/80'
                                }`}
                        >
                            <div className="p-3.5 flex flex-col flex-1 justify-between gap-2.5">
                                {/* Card Top: Status Badge & Option Menu */}
                                <div className="flex items-center justify-between gap-2">
                                    {deleteMode ? (
                                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={(e) => handleCheckboxChange(person.HeadID, e.target.checked)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                            />
                                            <span className="text-[10px] font-semibold text-slate-600">Select</span>
                                        </label>
                                    ) : (
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide border ${statusClass}`}>
                                            <span className={`h-1.5 w-1.5 rounded-full ${isAssigned ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                                                }`} />
                                            {isAssigned ? 'Assigned' : 'Unassigned'}
                                        </span>
                                    )}

                                    {!deleteMode && isAdmin && (
                                        <div className="relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    const isOpen = actionMenuHeadId === person.HeadID;
                                                    if (isOpen) {
                                                        setActionMenuHeadId(null);
                                                        setActionMenuAnchorRect(null);
                                                    } else {
                                                        setActionMenuHeadId(person.HeadID);
                                                        setActionMenuAnchorRect(rect);
                                                    }
                                                }}
                                                className="office-head-actions-button flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                                                aria-label="Open office personnel actions"
                                                title="Actions"
                                            >
                                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6h.01M12 12h.01M12 18h.01" />
                                                </svg>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Profile Section */}
                                <div
                                    onClick={() => {
                                        if (deleteMode) toggleHeadSelection(person.HeadID);
                                        else openDetails(person, assignedOffices);
                                    }}
                                    className="cursor-pointer group/content"
                                    title="Click to view details and assigned offices"
                                >
                                    <div className="flex items-center gap-2.5">
                                        {/* Smart Avatar */}
                                        <div className="relative shrink-0">
                                            {profilePicUrl ? (
                                                <img
                                                    src={profilePicUrl}
                                                    alt={fullName}
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'flex';
                                                    }}
                                                    className="h-10 w-10 rounded-full object-cover ring-2 ring-slate-100 shadow-xs"
                                                />
                                            ) : null}
                                            <div
                                                className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-white text-xs shadow-xs ring-2 ${avatarStyle.ring} ${avatarStyle.bg} ${profilePicUrl ? 'hidden' : 'flex'}`}
                                            >
                                                {initials}
                                            </div>
                                        </div>

                                        {/* Name & Role */}
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-[13px] font-bold text-slate-900 truncate group-hover/content:text-indigo-600 transition-colors leading-tight">
                                                {fullName}
                                            </h3>
                                            <div className="mt-0.5">
                                                <span className="inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-emerald-800 border border-emerald-200/60 uppercase">
                                                    {person.Position || 'Office Personnel'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Email Strip */}
                                    <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-slate-50/80 px-2 py-1 border border-slate-100 text-[10px] text-slate-600 group-hover/content:bg-slate-100/70 transition-colors">
                                        <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        <span className="truncate font-medium">{email || 'No email registered'}</span>
                                    </div>
                                </div>

                                {/* Assigned Office(s) Footer */}
                                <div className="mt-1 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                                            Assigned Office(s)
                                        </div>
                                        {assignedOffices.length > 0 ? (
                                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-800 truncate" title={assignedOffices.map(o => o.OfficeName || o.office_name).join(', ')}>
                                                <svg className="w-3.5 h-3.5 text-teal-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                </svg>
                                                <span className="truncate">
                                                    {assignedOffices[0].OfficeName || assignedOffices[0].office_name || `Office #${assignedOffices[0].id || assignedOffices[0].OfficeID}`}
                                                    {assignedOffices.length > 1 && ` (+${assignedOffices.length - 1})`}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-[11px] text-slate-400 italic">Not assigned to any office</span>
                                        )}
                                    </div>

                                    {!deleteMode && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openDetails(person, assignedOffices);
                                            }}
                                            className="shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold transition flex items-center gap-1 bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200/60"
                                        >
                                            Details
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {viewMode === 'list' && (
                <div className="pt-1">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={(p) => setCurrentPage(p)}
                        fixed={false}
                        showWhenSinglePage={true}
                    />
                </div>
            )}
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

            {/* Portal actions menu to avoid clipping inside list/card containers */}
            {isAdmin && actionMenuHeadId && actionMenuAnchorRect && typeof document !== 'undefined' && (() => {
                const menuPerson = officeHeads.find((h) => String(h.HeadID) === String(actionMenuHeadId))
                    || filteredOfficeHeads.find((h) => String(h.HeadID) === String(actionMenuHeadId));

                if (!menuPerson) return null;

                const menuWidth = 220;
                const viewportRight = window.scrollX + window.innerWidth - 12;
                const left = Math.min((actionMenuAnchorRect.right || 0) + window.scrollX - menuWidth, viewportRight - menuWidth);
                const top = (actionMenuAnchorRect.bottom || 0) + window.scrollY + 8;

                return createPortal(
                    <div
                        className="office-head-actions-menu"
                        style={{ position: 'absolute', left, top, width: menuWidth, zIndex: 9999 }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-100">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActionMenuHeadId(null);
                                    setActionMenuAnchorRect(null);
                                    openEdit(menuPerson);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition whitespace-nowrap"
                            >
                                <svg className="h-4 w-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span>Edit Personnel</span>
                            </button>
                            <button
                                type="button"
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    setActionMenuHeadId(null);
                                    setActionMenuAnchorRect(null);
                                    await handleDeleteHead(menuPerson);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 transition whitespace-nowrap"
                            >
                                <svg className="h-4 w-4 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
                                </svg>
                                <span>Delete Personnel</span>
                            </button>
                        </div>
                    </div>,
                    document.body
                );
            })()}

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
