import React, { useState } from "react";
import { usersAPI } from "../../utils/api";

export default function UserEditApproval({ selectedUser, onClose, onSuccess }) {
    const [newApprovalStatus, setNewApprovalStatus] = useState(selectedUser?.approval_status || 'pending');
    const [updating, setUpdating] = useState(false);

    const handleApprovalStatusUpdate = async () => {
        if (!selectedUser) return;
        
        try {
            setUpdating(true);
            const response = await usersAPI.updateApprovalStatus(selectedUser.UserID, newApprovalStatus);
            
            if (response.success) {
                alert(`User approval status updated to ${newApprovalStatus}`);
                onClose();
                if (onSuccess) {
                    onSuccess();
                }
            } else {
                alert(response.message || 'Failed to update approval status');
            }
        } catch (error) {
            console.error('Error updating approval status:', error);
            alert('Error updating approval status');
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
                        disabled={updating || newApprovalStatus === selectedUser.approval_status}
                    >
                        {updating ? 'Updating...' : 'Update'}
                    </button>
                </div>
            </div>
        </div>
    );
}
