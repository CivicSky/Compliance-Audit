import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import Header from "../Header/header.jsx";
import user from "../../assets/images/user.svg";
import { usersAPI } from "../../utils/api";

const UsersP = forwardRef(({ searchTerm = '', deleteMode = false, onSelectionChange, onUserClick }, ref) => {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedUsers, setSelectedUsers] = useState(new Set());

    // Fetch users data from database
    useEffect(() => {
        fetchUsers();
    }, []);

    // Filter and sort users based on search term
    useEffect(() => {
        let filtered = users;
        
        // Apply search filter
        if (searchTerm.trim()) {
            filtered = users.filter(person => {
                const fullName = `${person.FirstName}${person.MiddleInitial ? ' ' + person.MiddleInitial + '.' : ''} ${person.LastName}`.toLowerCase();
                const email = person.Email?.toLowerCase() || '';
                const role = person.RoleName?.toLowerCase() || '';
                const searchLower = searchTerm.toLowerCase();
                
                return fullName.includes(searchLower) || 
                       email.includes(searchLower) || 
                       role.includes(searchLower);
            });
        }

        // Sort by name in ascending order
        const sortedFiltered = [...filtered].sort((a, b) => {
            const nameA = `${a.FirstName} ${a.LastName}`.toLowerCase();
            const nameB = `${b.FirstName} ${b.LastName}`.toLowerCase();
            return nameA.localeCompare(nameB);
        });

        setFilteredUsers(sortedFiltered);
    }, [users, searchTerm]);

    // Handle selection changes and notify parent component
    useEffect(() => {
        if (onSelectionChange) {
            onSelectionChange(selectedUsers.size, Array.from(selectedUsers));
        }
    }, [selectedUsers, onSelectionChange]);

    // Clear selections when delete mode is turned off
    useEffect(() => {
        if (!deleteMode) {
            setSelectedUsers(new Set());
        }
    }, [deleteMode]);

    const handleCheckboxChange = (userId, isChecked) => {
        setSelectedUsers(prev => {
            const newSet = new Set(prev);
            if (isChecked) {
                newSet.add(userId);
            } else {
                newSet.delete(userId);
            }
            return newSet;
        });
    };

    const deleteSelectedUsers = async (userIds) => {
        try {
            console.log('Attempting to delete users:', userIds);
            console.log('User IDs type:', typeof userIds, 'Is array:', Array.isArray(userIds));
            
            // Make API call to delete users (if delete endpoint exists)
            // const response = await usersAPI.deleteUsers(userIds);
            // For now, return not implemented
            return { success: false, message: 'User deletion not implemented yet' };
            
        } catch (error) {
            console.error('Error deleting users:', error);
            
            // Check if it's a network error
            if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
                return { success: false, message: 'Network error. Please check if the backend server is running on port 5000.' };
            }
            
            // Check for specific error responses
            if (error.response) {
                return { success: false, message: `Server error: ${error.response.data?.message || error.response.statusText}` };
            }
            
            return { success: false, message: `Error deleting users: ${error.message}` };
        }
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await usersAPI.getAllUsers();
            
            if (response.success) {
                setUsers(response.users);
            } else {
                setError('Failed to fetch users');
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            setError('Error loading users. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Function to refresh data (can be called from parent component)
    const refreshData = () => {
        fetchUsers();
    };

    // Expose refresh function to parent
    useImperativeHandle(ref, () => ({
        refresh: refreshData,
        deleteSelected: deleteSelectedUsers
    }));

    if (loading) {
        return (
            <div className="mt-6 w-full">
                <div className="bg-white rounded-md p-4 shadow-lg border-2 border-gray-200">
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-gray-600">Loading users...</span>
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
                            onClick={fetchUsers}
                            className="ml-4 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (filteredUsers.length === 0 && !loading) {
        if (searchTerm.trim()) {
            return (
                <div className="mt-6 w-full">
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-8 text-center">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
                        <p className="text-gray-600">No users match your search for "{searchTerm}".</p>
                        <p className="text-gray-500 text-sm mt-2">Try adjusting your search terms or browse all users.</p>
                    </div>
                </div>
            );
        } else if (users.length === 0) {
            return (
                <div className="mt-6 w-full">
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-8 text-center">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM9 9a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Users Found</h3>
                        <p className="text-gray-600">No users available in the system yet.</p>
                    </div>
                </div>
            );
        }
    }

    return (
        <div className="mt-6 w-full space-y-4">
            {/* Search Results Counter */}
            {searchTerm.trim() && (
                <div className="text-sm text-gray-600 mb-4">
                    Showing {filteredUsers.length} of {users.length} users
                    {filteredUsers.length !== users.length && ` matching "${searchTerm}"`}
                </div>
            )}
            
            {filteredUsers.map((person) => {
                // Construct full name
                const fullName = `${person.FirstName}${person.MiddleInitial ? ' ' + person.MiddleInitial + '.' : ''} ${person.LastName}`;

                // Profile photo logic: use preview if available, else use uploaded filename, else default
                let profilePicUrl = user;
                if (person.TempPreview) {
                    profilePicUrl = person.TempPreview;
                } else if (person.ProfilePic) {
                    profilePicUrl = `http://localhost:5000/uploads/profile-pics/${person.ProfilePic}`;
                }

                return (
                    <div 
                        key={person.UserID} 
                        onClick={() => !deleteMode && onUserClick && onUserClick(person)}
                        className={`bg-white rounded-md p-4 shadow-lg border-2 border-gray-200 stroke-2 transition-all duration-300 ${
                            deleteMode ? 'hover:shadow-md' : 'hover:shadow-none hover:bg-gray-100 cursor-pointer'
                        } ${selectedUsers.has(person.UserID) ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                    >
                        <div className="flex items-center justify-between min-h-[4rem]">
                            {/* Checkbox for delete mode */}
                            {deleteMode && (
                                <div className="flex items-center mr-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedUsers.has(person.UserID)}
                                        onChange={(e) => handleCheckboxChange(person.UserID, e.target.checked)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                            )}
                            
                            {/* Left section - Profile pic, name and email */}
                            <div className="flex items-center gap-4 flex-1">
                                <img
                                    src={profilePicUrl}
                                    alt={fullName}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                                    onError={e => { e.target.onerror = null; e.target.src = user; }}
                                />
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg" style={{color: '#121212'}}>
                                        {fullName}
                                    </h3>
                                    <p className="text-gray-600 text-sm">{person.Email}</p>
                                    <p className="text-gray-500 text-xs">{person.RoleName || 'No Role Assigned'}</p>
                                </div>
                            </div>

                            {/* Fixed vertical separator line */}
                            <div className="h-16 w-px bg-gray-300 mx-6 flex-shrink-0"></div>

                            {/* Right section - Role Badge */}
                            <div className="text-right flex-shrink-0">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    person.RoleID === 1 ? 'bg-purple-100 text-purple-800' : 
                                    person.RoleID === 2 ? 'bg-blue-100 text-blue-800' : 
                                    person.RoleID === 3 ? 'bg-green-100 text-green-800' : 
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                    {person.RoleName || 'Unassigned'}
                                </span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
});

export default UsersP;