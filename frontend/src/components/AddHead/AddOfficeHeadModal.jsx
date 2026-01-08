import React, { useState, useEffect } from 'react';
import { officeHeadsAPI, usersAPI } from '../../utils/api';

export default function AddOfficeHeadModal({ isOpen, onClose, onSuccess }) {
    const [availableUsers, setAvailableUsers] = useState([]);
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [position, setPosition] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Fetch available users when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchAvailableUsers();
            setSelectedUserIds([]);
            setPosition('');
            setSearchTerm('');
            setError('');
        }
    }, [isOpen]);

    const fetchAvailableUsers = async () => {
        setIsLoading(true);
        try {
            // Get all users - response format: { success: true, users: [...] }
            const usersResponse = await usersAPI.getAllUsers();
            const allUsers = usersResponse.users || usersResponse.data || usersResponse || [];
            
            // Get existing office heads to exclude them
            const headsResponse = await officeHeadsAPI.getAllHeads();
            const existingHeadUserIds = (headsResponse || []).map(h => h.UserID);
            
            // Filter: only users with RoleID = 2 (regular users) who are not already heads
            // and are approved
            const filteredUsers = allUsers.filter(user => 
                user.RoleID === 2 && 
                !existingHeadUserIds.includes(user.UserID) &&
                user.approval_status === 'approved'
            );
            
            setAvailableUsers(filteredUsers);
        } catch (err) {
            console.error('Error fetching users:', err);
            setError('Failed to load users. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Toggle user selection
    const toggleUserSelection = (userId) => {
        setSelectedUserIds(prev => {
            if (prev.includes(userId)) {
                return prev.filter(id => id !== userId);
            } else {
                return [...prev, userId];
            }
        });
    };

    // Filter users by search term
    const filteredUsers = availableUsers.filter(user => {
        const fullName = `${user.FirstName} ${user.MiddleInitial ? user.MiddleInitial + '.' : ''} ${user.LastName}`.toLowerCase();
        const email = (user.Email || '').toLowerCase();
        const search = searchTerm.toLowerCase();
        return fullName.includes(search) || email.includes(search);
    });

    // Select all filtered users
    const selectAll = () => {
        const filteredUserIds = filteredUsers.map(u => u.UserID);
        setSelectedUserIds(filteredUserIds);
    };

    // Clear all selections
    const clearAll = () => {
        setSelectedUserIds([]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (selectedUserIds.length === 0) {
            setError('Please select at least one user');
            return;
        }
        
        if (!position.trim()) {
            setError('Please enter a position');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const response = await officeHeadsAPI.addMultipleHeads(selectedUserIds, position);
            
            if (response.success) {
                // Show success message
                const addedCount = response.data?.length || selectedUserIds.length;
                alert(`Successfully added ${addedCount} office head(s)!`);
                
                // Show any errors that occurred
                if (response.errors && response.errors.length > 0) {
                    const errorMessages = response.errors.map(e => e.error).join('\n');
                    alert(`Some users could not be added:\n${errorMessages}`);
                }
                
                if (onSuccess) {
                    onSuccess(response.data);
                }
                onClose();
            } else {
                setError(response.message || 'Failed to add office heads');
            }
        } catch (err) {
            console.error('Error adding office heads:', err);
            setError(err.response?.data?.message || err.message || 'An error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
                    <div>
                        <h2 className="text-xl font-semibold">Add Office Heads</h2>
                        <p className="text-sm text-blue-100">Select users to make them office heads</p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors disabled:opacity-50"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    {/* Position Input */}
                    <div className="p-4 border-b bg-gray-50">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Position/Title for selected users *
                        </label>
                        <input
                            type="text"
                            value={position}
                            onChange={(e) => setPosition(e.target.value)}
                            placeholder="e.g., Department Head, Program Chair, Director"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Search and Selection Controls */}
                    <div className="p-4 border-b flex items-center gap-3">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search users..."
                                className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <button
                            type="button"
                            onClick={selectAll}
                            className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        >
                            Select All
                        </button>
                        <button
                            type="button"
                            onClick={clearAll}
                            className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                        >
                            Clear
                        </button>
                    </div>

                    {/* User List */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                <span className="ml-3 text-gray-600">Loading users...</span>
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <p className="mt-2">No available users found</p>
                                <p className="text-sm">All approved users are either already office heads or are admins</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredUsers.map(user => {
                                    const isSelected = selectedUserIds.includes(user.UserID);
                                    const fullName = `${user.FirstName} ${user.MiddleInitial ? user.MiddleInitial + '.' : ''} ${user.LastName}`;
                                    
                                    return (
                                        <label
                                            key={user.UserID}
                                            className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                                                isSelected 
                                                    ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' 
                                                    : 'bg-white border-gray-200 hover:bg-gray-50'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleUserSelection(user.UserID)}
                                                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                            <div className="ml-3 flex items-center flex-1">
                                                {/* Profile Picture */}
                                                <div className="flex-shrink-0">
                                                    {user.ProfilePic ? (
                                                        <img
                                                            src={`http://localhost:5000/uploads/profile-pics/${user.ProfilePic}`}
                                                            alt={fullName}
                                                            className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                                                            onError={(e) => {
                                                                e.target.style.display = 'none';
                                                                e.target.nextElementSibling.style.display = 'flex';
                                                            }}
                                                        />
                                                    ) : null}
                                                    <div 
                                                        className={`w-10 h-10 rounded-full bg-blue-100 items-center justify-center text-blue-600 font-semibold ${user.ProfilePic ? 'hidden' : 'flex'}`}
                                                    >
                                                        {user.FirstName[0]}{user.LastName[0]}
                                                    </div>
                                                </div>
                                                <div className="ml-3 flex-1">
                                                    <p className="text-sm font-medium text-gray-900">{fullName}</p>
                                                    <p className="text-xs text-gray-500">{user.Email}</p>
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="px-4 py-2 bg-red-50 border-t border-red-200">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                        <div className="text-sm text-gray-600">
                            {selectedUserIds.length > 0 ? (
                                <span className="font-medium text-blue-600">
                                    {selectedUserIds.length} user{selectedUserIds.length !== 1 ? 's' : ''} selected
                                </span>
                            ) : (
                                <span>No users selected</span>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || selectedUserIds.length === 0}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isSubmitting && (
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                                        <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                )}
                                {isSubmitting ? 'Adding...' : `Add ${selectedUserIds.length > 0 ? selectedUserIds.length : ''} Office Head${selectedUserIds.length !== 1 ? 's' : ''}`}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}