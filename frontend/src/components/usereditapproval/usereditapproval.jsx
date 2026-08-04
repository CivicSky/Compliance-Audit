import React, { useState } from "react";
import { usersAPI } from "../../utils/api";
import { useModal } from "../UI/ModalProvider";

export default function UserEditApproval({ selectedUser, onClose, onSuccess }) {
    const { showAlert } = useModal();
    const [newApprovalStatus, setNewApprovalStatus] = useState(selectedUser?.approval_status || 'pending');
    const [newRoleID, setNewRoleID] = useState(selectedUser?.RoleID || 2);
    const [updating, setUpdating] = useState(false);

    const handleApprovalStatusUpdate = async () => {
        if (!selectedUser) return;
        
        try {
            setUpdating(true);
            
            // Update approval status
            const approvalResponse = await usersAPI.updateApprovalStatus(selectedUser.UserID, newApprovalStatus);
            
            // If backend deleted the user (denied), it may return deletedRows; handle that first
            if (approvalResponse.deletedRows && approvalResponse.deletedRows > 0) {
                await showAlert(approvalResponse.message || 'User denied and deleted');
                onClose();
                if (onSuccess) onSuccess();
                return;
            }

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

                await showAlert(message);
                onClose();
                if (onSuccess) {
                    onSuccess();
                }
            } else {
                await showAlert(approvalResponse.message || 'Failed to update user');
            }
        } catch (error) {
            console.error('Error updating user:', error);
            await showAlert('Error updating user');
        } finally {
            setUpdating(false);
        }
    };

    if (!selectedUser) return null;

    return (
        <div className="fixed inset-y-0 right-0 left-0 lg:left-[var(--sidebar-width)] lg:transition-[left] lg:duration-200 lg:ease-in-out z-[120] flex items-center justify-center bg-black/50">
            <div className="mx-4 w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                    <h2 className="text-xl font-semibold text-gray-800">Update Approval Status</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 transition hover:text-gray-600 disabled:opacity-50"
                        disabled={updating}
                        aria-label="Close"
                    >
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-5 px-6 py-6">
                    <div className="space-y-2 text-sm text-gray-600">
                        <p><span className="font-semibold text-gray-800">User:</span> {selectedUser.FirstName} {selectedUser.LastName}</p>
                        <p><span className="font-semibold text-gray-800">Email:</span> {selectedUser.Email}</p>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">User Role</label>
                        <div className="relative">
                            <select
                                value={newRoleID}
                                onChange={(e) => setNewRoleID(parseInt(e.target.value))}
                                className="h-10 w-full appearance-none rounded-md border border-gray-300 bg-white px-4 pr-10 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value={2}>User</option>
                                <option value={1}>Admin</option>
                            </select>
                            <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-slate-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">Approval Status</label>
                        <div className="relative">
                            <select
                                value={newApprovalStatus}
                                onChange={(e) => setNewApprovalStatus(e.target.value)}
                                className="h-10 w-full appearance-none rounded-md border border-gray-300 bg-white px-4 pr-10 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="denied">Denied</option>
                            </select>
                            <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-slate-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 border-t border-slate-200 px-6 py-4">
                    <button
                        onClick={onClose}
                        className="flex-1 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                        disabled={updating}
                        type="button"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleApprovalStatusUpdate}
                        className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-400"
                        disabled={updating || (newApprovalStatus === selectedUser.approval_status && newRoleID === selectedUser.RoleID)}
                        type="button"
                    >
                        {updating ? 'Updating...' : 'Update'}
                    </button>
                </div>
            </div>
        </div>
    );
}

