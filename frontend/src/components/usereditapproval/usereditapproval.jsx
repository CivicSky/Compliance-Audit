import React, { useState } from "react";
import { usersAPI } from "../../utils/api";

export default function UserEditApproval({ selectedUser, onClose, onSuccess }) {
    const [newApprovalStatus, setNewApprovalStatus] = useState(selectedUser?.approval_status || 'pending');
    const [newRoleID, setNewRoleID] = useState(selectedUser?.RoleID || 2);
    const [updating, setUpdating] = useState(false);

    const handleApprovalStatusUpdate = async () => {
        if (!selectedUser) return;
        
        try {
            setUpdating(true);
            
            // Update approval status
            const approvalResponse = await usersAPI.updateApprovalStatus(selectedUser.UserID, newApprovalStatus);
            
            // Update role if it changed
            let roleUpdated = false;
            if (newRoleID !== selectedUser.RoleID) {
                const roleResponse = await usersAPI.updateUserRole(selectedUser.UserID, newRoleID);
                roleUpdated = roleResponse.success;
            }
            
            if (approvalResponse.success) {
                const statusChanged = newApprovalStatus !== selectedUser.approval_status;
                const roleChanged = newRoleID !== selectedUser.RoleID;
                
                let message = 'User updated successfully';
                if (statusChanged && roleChanged) {
                    message = `User approval status updated to ${newApprovalStatus} and role changed to ${newRoleID === 1 ? 'Admin' : 'User'}`;
                } else if (statusChanged) {
                    message = `User approval status updated to ${newApprovalStatus}`;
                } else if (roleChanged) {
                    message = `User role changed to ${newRoleID === 1 ? 'Admin' : 'User'}`;
                }
                
                alert(message);
                onClose();
                if (onSuccess) {
                    onSuccess();
                }
            } else {
                alert(approvalResponse.message || 'Failed to update user');
            }
        } catch (error) {
            console.error('Error updating user:', error);
            alert('Error updating user');
        } finally {
            setUpdating(false);
        }
    };

    if (!selectedUser) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                <h2 className="text-2xl font-bold mb-4">Update Approval Status</h2>
                
                <div className="mb-6">
                    <p className="text-gray-600 mb-2">
                        <strong>User:</strong> {selectedUser.FirstName} {selectedUser.LastName}
                    </p>
                    <p className="text-gray-600 mb-4">
                        <strong>Email:</strong> {selectedUser.Email}
                    </p>

                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        User Role
                    </label>
                    <select 
                        value={newRoleID}
                        onChange={(e) => setNewRoleID(parseInt(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                    >
                        <option value={2}>User</option>
                        <option value={1}>Admin</option>
                    </select>

                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        Approval Status
                    </label>
                    <select 
                        value={newApprovalStatus}
                        onChange={(e) => setNewApprovalStatus(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="denied">Denied</option>
                    </select>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 font-medium"
                        disabled={updating}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleApprovalStatusUpdate}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:bg-blue-400"
                        disabled={updating || (newApprovalStatus === selectedUser.approval_status && newRoleID === selectedUser.RoleID)}
                    >
                        {updating ? 'Updating...' : 'Update'}
                    </button>
                </div>
            </div>
        </div>
    );
}
