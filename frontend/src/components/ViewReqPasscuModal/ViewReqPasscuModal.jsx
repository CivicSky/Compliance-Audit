import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { usersAPI, requirementsAPI } from '../../utils/api';

// Helper: find assignmentId for current user and requirement
function getUserAssignmentId(assignedUsersMap, requirementId, userId) {
    if (!assignedUsersMap[requirementId]) return null;
    const assignment = assignedUsersMap[requirementId].find(u => u.UserID === userId);
    return assignment ? assignment.AssignmentID : null;
}
import AssignUserModal from '../AssignUserModal/AssignUserModal';

export default function ViewReqPASSCUModal({ isOpen, onClose, office, onEditOffice, onAddRequirements, onDeleteOffice }) {
    const [showMenu, setShowMenu] = useState(false);
    const [requirements, setRequirements] = useState([]);
    const [loading, setLoading] = useState(false);
    const [officeData, setOfficeData] = useState(office);
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [commentInput, setCommentInput] = useState("");
    const [savingComment, setSavingComment] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedRequirement, setSelectedRequirement] = useState(null);
    const [assignedUsersMap, setAssignedUsersMap] = useState({});
    const [proofFile, setProofFile] = useState(null);
    const [uploadingProof, setUploadingProof] = useState(false);
    const [proofFileName, setProofFileName] = useState("");
    const [proofFileUrl, setProofFileUrl] = useState("");
    const [persistedProof, setPersistedProof] = useState(null);
    const [showDocViewer, setShowDocViewer] = useState(false);
    const fileInputRef = useRef();
    const [excelHtml, setExcelHtml] = useState(null);
    const [excelHtmlLoading, setExcelHtmlLoading] = useState(false);
    const [excelPreviewError, setExcelPreviewError] = useState(null);
    const [userUploadingReqId, setUserUploadingReqId] = useState(null);
    const userReqFileInputRef = useRef();
    const [selectedUserFile, setSelectedUserFile] = useState(null);
    const [showUserFileViewer, setShowUserFileViewer] = useState(false);
    const [avatarPopup, setAvatarPopup] = useState(null); // { user, requirementId, rect }
    const [sendingNotification, setSendingNotification] = useState(false);
    const [showNotifForm, setShowNotifForm] = useState(null); // { user, requirementId }
    const [notifTitle, setNotifTitle] = useState('');
    const [notifMessage, setNotifMessage] = useState('');
    const [unsubmittingReqId, setUnsubmittingReqId] = useState(null);
    const [unsubmittingProof, setUnsubmittingProof] = useState(false);

    const isAdmin = currentUser && currentUser.RoleID === 1;

    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const response = await usersAPI.getLoggedInUser();
                if (response.success) {
                    setCurrentUser(response.user);
                }
            } catch (error) {
                console.error('Error fetching current user:', error);
            }
        };
        if (isOpen) {
            fetchCurrentUser();
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showStatusDropdown && !event.target.closest('.status-dropdown')) {
                setShowStatusDropdown(false);
            }
            if (avatarPopup && !event.target.closest('.avatar-popup-menu')) {
                setAvatarPopup(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showStatusDropdown, avatarPopup]);

    const handleProofFileChange = async (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setProofFile(file);
            setUploadingProof(true);
            
            const formData = new FormData();
            formData.append('file', file);
            
            const token = localStorage.getItem('token');
            
            try {
                const res = await fetch(`http://localhost:5000/api/officedocuments/${office.id}/proof`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });
                const data = await res.json();
                if (data.success && data.url) {
                    setProofFileUrl(`http://localhost:5000${data.url}`);
                    setProofFileName(data.filename);
                    setPersistedProof({ fileName: data.filename, url: `http://localhost:5000${data.url}` });
                    await fetchOfficeRequirements();
                } else {
                    alert(data.message || 'Failed to upload proof document');
                }
            } catch (err) {
                console.error('Upload error:', err);
                alert('Failed to upload proof document');
            } finally {
                setUploadingProof(false);
                setProofFile(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        }
    };

    useEffect(() => {
        const fetchProof = async () => {
            if (isOpen && office) {
                try {
                    const res = await axios.get(`http://localhost:5000/api/officedocuments/${office.id}/proof`);
                    if (res.data && res.data.success) {
                        setPersistedProof({
                            fileName: res.data.file_name,
                            url: `http://localhost:5000${res.data.url}`
                        });
                        setProofFileName(res.data.file_name);
                        setProofFileUrl(`http://localhost:5000${res.data.url}`);
                    } else {
                        setPersistedProof(null);
                        setProofFileName("");
                        setProofFileUrl("");
                    }
                } catch (err) {
                    setPersistedProof(null);
                    setProofFileName("");
                    setProofFileUrl("");
                }
            }
        };
        if (isOpen && office) {
            setOfficeData(office);
            fetchOfficeRequirements();
            fetchProof();
        }
    }, [isOpen, office]);

    const fetchOfficeRequirements = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`http://localhost:5000/api/offices/${office.id}/requirements`);
            const reqs = response.data.data || [];
            setRequirements(reqs);
            
            const assignedMap = {};
            await Promise.all(reqs.map(async (req) => {
                try {
                    const assignedRes = await requirementsAPI.getAssignedUsers(req.RequirementID, office.id);
                    assignedMap[req.RequirementID] = assignedRes.data || [];
                } catch (err) {
                    console.error(`Error fetching assigned users for req ${req.RequirementID}:`, err);
                    assignedMap[req.RequirementID] = [];
                }
            }));
            setAssignedUsersMap(assignedMap);
            
            const officeResponse = await axios.get(`http://localhost:5000/api/offices/${office.id}`);
            if (officeResponse.data) {
                setOfficeData(prev => ({
                    ...prev,
                    overall_status: officeResponse.data.OverallStatus,
                    compliance_percent: officeResponse.data.CompliancePercent,
                    total_requirements: officeResponse.data.TotalRequirements,
                    event_name: officeResponse.data.EventName || officeResponse.data.Event || prev.event_name || null
                }));
            }
        } catch (error) {
            console.error('Error fetching requirements:', error);
            setRequirements([]);
        } finally {
            setLoading(false);
        }
    };

    // Unsubmit (delete) user-uploaded file for a requirement
    const handleUnsubmitUserFile = async (requirementId) => {
        if (!currentUser || !currentUser.UserID) {
            alert('No user information available. Please reload and try again.');
            return;
        }
        if (!window.confirm('Are you sure you want to unsubmit (delete) your uploaded file? This cannot be undone.')) return;
        setUnsubmittingReqId(requirementId);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:5000/api/requirements/${requirementId}/file/${currentUser.UserID}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
            });
            let data = {};
            try { data = await res.json(); } catch (e) { /* ignore JSON parse errors */ }
            if (res.ok && data.success) {
                alert('File deleted. You can now re-upload.');
            } else if (res.status === 404) {
                // No file found — still refresh UI so upload button becomes available
                console.warn('Unsubmit: file not found on server');
            } else {
                console.warn('Unsubmit: server returned error', res.status, data);
                alert(data.message || 'Failed to delete file.');
            }
        } catch (err) {
            console.error('Unsubmit error:', err);
            alert('Failed to delete file.');
        } finally {
            try { await fetchOfficeRequirements(); } catch (e) { console.error('Refresh after unsubmit failed', e); }
            setUnsubmittingReqId(null);
        }
    };

    const handleStatusChange = async (reqId, newStatusId) => {
        try {
            await axios.put(`http://localhost:5000/api/offices/${office.id}/requirements/${reqId}/status`, {
                statusId: newStatusId
            });
            setRequirements(prev => prev.map(req => 
                req.RequirementID === reqId 
                    ? { 
                        ...req, 
                        ComplianceStatusID: newStatusId,
                        ComplianceStatus: newStatusId === 5 ? 'Complied' : 
                                         newStatusId === 4 ? 'Partially Complied' : 'Not Complied'
                      }
                    : req
            ));
            const officeResponse = await axios.get(`http://localhost:5000/api/offices/${office.id}`);
            if (officeResponse.data) {
                setOfficeData(prev => ({
                    ...prev,
                    overall_status: officeResponse.data.OverallStatus,
                    compliance_percent: officeResponse.data.CompliancePercent,
                    total_requirements: officeResponse.data.TotalRequirements,
                    event_name: officeResponse.data.EventName || officeResponse.data.Event || prev.event_name || null
                }));
            }
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update compliance status');
        }
    };

    const handleCommentClick = (req) => {
        setEditingCommentId(req.RequirementID);
        setCommentInput(req.comments || "");
    };

    const handleCommentInputChange = (e) => {
        setCommentInput(e.target.value);
    };

    const handleCommentSave = async (req) => {
        setSavingComment(true);
        try {
            await axios.put(`http://localhost:5000/api/offices/${office.id}/requirements/${req.RequirementID}/status`, {
                statusId: req.ComplianceStatusID || 3,
                comments: commentInput
            });
            await fetchOfficeRequirements();
            setEditingCommentId(null);
        } catch (error) {
            alert('Failed to save comment');
        } finally {
            setSavingComment(false);
        }
    };

    const handleCommentCancel = () => {
        setEditingCommentId(null);
        setCommentInput("");
    };

    const handleUserReqFileUpload = async (e, requirementId) => {
        const file = e.target.files?.[0];
        if (!file || !currentUser) return;
        
        setUserUploadingReqId(requirementId);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', currentUser.UserID);
        formData.append('requirementId', requirementId);
        
        const token = localStorage.getItem('token');
        
        try {
            const res = await fetch(`http://localhost:5000/api/requirements/user-upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            const data = await res.json();
            
            if (data.success) {
                await requirementsAPI.markUserAsUploaded(requirementId, currentUser.UserID);
                const assignedRes = await requirementsAPI.getAssignedUsers(requirementId);
                if (assignedRes.success) {
                    setAssignedUsersMap(prev => ({
                        ...prev,
                        [requirementId]: assignedRes.users
                    }));
                }
                await fetchOfficeRequirements();
                alert('File uploaded successfully!');
            } else {
                alert(data.message || 'Failed to upload file');
            }
        } catch (err) {
            console.error('Upload error:', err);
            alert('Failed to upload file');
        } finally {
            setUserUploadingReqId(null);
            if (userReqFileInputRef.current) {
                userReqFileInputRef.current.value = '';
            }
        }
    };

    const isUserAssignedToRequirement = (requirementId) => {
        if (!currentUser || !assignedUsersMap[requirementId]) return false;
        return assignedUsersMap[requirementId].some(u => u.UserID === currentUser.UserID);
    };

    const hasUserUploadedForRequirement = (requirementId) => {
        if (!currentUser || !assignedUsersMap[requirementId]) return false;
        const userAssignment = assignedUsersMap[requirementId].find(u => u.UserID === currentUser.UserID);
        return userAssignment && (userAssignment.HasUploaded === 1 || userAssignment.HasUploaded === true);
    };

    const handleExcelPreview = async (fileUrl = null) => {
        const urlToUse = fileUrl || proofFileUrl || (selectedUserFile?.url);
        if (!urlToUse) {
            setExcelPreviewError('No file URL provided');
            return;
        }

        setExcelHtmlLoading(true);
        setExcelPreviewError(null);
        setExcelHtml('<div style="padding:1em;text-align:center;">Loading Excel preview...</div>');
        
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            
            const response = await fetch(urlToUse, { headers });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            
            let html = '<div style="padding:1em;">';
            workbook.SheetNames.forEach((sheetName, index) => {
                const worksheet = workbook.Sheets[sheetName];
                html += `<h4 style='margin-top:${index === 0 ? '0' : '1.5'}em;margin-bottom:0.5em;padding-bottom:0.5em;border-bottom:2px solid #e5e7eb;color:#1f2937;font-size:1.1em;'>Sheet: ${sheetName}</h4>`;
                html += '<div style="overflow-x:auto;">';
                html += XLSX.utils.sheet_to_html(worksheet, { 
                    id: `sheet-${index}`,
                    editable: false
                });
                html += '</div>';
            });
            html += '</div>';
            setExcelHtml(html);
        } catch (err) {
            console.error('Excel preview error:', err);
            setExcelPreviewError(err.message || 'Failed to load Excel file');
            setExcelHtml(`<div style="color:#dc2626;padding:1em;text-align:center;">
                <p style="font-weight:bold;margin-bottom:0.5em;">Error loading preview</p>
                <p style="font-size:0.9em;color:#6b7280;">${err.message || 'Unable to load file'}</p>
            </div>`);
        } finally {
            setExcelHtmlLoading(false);
        }
    };

    const handleUserAvatarClick = (e, user, requirementId) => {
        if (!isAdmin) return;
        // Toggle popup: if already open for same user, close it
        if (avatarPopup && avatarPopup.user.UserID === user.UserID && avatarPopup.requirementId === requirementId) {
            setAvatarPopup(null);
        } else {
            const rect = e.currentTarget.getBoundingClientRect();
            setAvatarPopup({ user, requirementId, rect });
        }
    };

    const handleViewUserFile = async (user, requirementId) => {
        setAvatarPopup(null);
        try {
            const res = await axios.get(`http://localhost:5000/api/requirements/${requirementId}/user-file/${user.UserID}`);
            if (res.data && res.data.success && res.data.file) {
                setExcelHtml(null);
                setExcelPreviewError(null);
                setExcelHtmlLoading(false);
                setSelectedUserFile(res.data.file);
                setShowUserFileViewer(true);
            } else {
                alert('No file found for this user.');
            }
        } catch (err) {
            alert('Error fetching user file.');
        }
    };

    const handleSendNotificationToUser = async (user, requirementId) => {
        if (!currentUser) return;
        setSendingNotification(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/api/notifications/create', {
                userIds: [user.UserID],
                adminId: currentUser.UserID,
                title: notifTitle,
                message: notifMessage,
                type: 'info',
                relatedTable: 'requirements',
                relatedId: requirementId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowNotifForm(null);
            setNotifTitle('');
            setNotifMessage('');
            alert(`Notification sent to ${user.FirstName} ${user.LastName}`);
        } catch (err) {
            console.error('Error sending notification:', err);
            alert('Failed to send notification');
        } finally {
            setSendingNotification(false);
        }
    };

    const openNotifForm = (user, requirementId) => {
        const req = requirements.find(r => r.RequirementID === requirementId);
        setAvatarPopup(null);
        setNotifTitle('Requirement Reminder');
        setNotifMessage(`Please upload your compliance document for requirement: ${req?.RequirementCode || ''} - ${req?.Description?.substring(0, 80) || 'N/A'}`);
        setShowNotifForm({ user, requirementId });
    };

    if (!isOpen || !office) return null;

    // Status badge component
    const StatusBadge = ({ statusId }) => {
        const statusMap = {
            5: { label: 'Complied', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
            4: { label: 'Partial', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
            3: { label: 'Not Complied', bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' }
        };
        const status = statusMap[statusId] || statusMap[3];
        
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text} border border-${status.dot.replace('bg-', '')}/20`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
                {status.label}
            </span>
        );
    };

    const assignedRequirementCount = requirements.filter((req) => isUserAssignedToRequirement(req.RequirementID)).length;
    const isAssignedInCurrentOffice = assignedRequirementCount > 0;

    return (
        <div
            className="fixed inset-y-0 right-0 z-[120] bg-black/50 flex items-center justify-center p-4"
            style={{ left: 'var(--sidebar-width, 0px)', transition: 'left 200ms ease-in-out' }}
            onClick={onClose}
        >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                
                {/* Header - Compact */}
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-gray-900">{officeData.office_name}</h2>
                            <p className="text-xs text-gray-500">{officeData.office_type_name}</p>
                            {officeData.event_name && (
                                <p className="text-xs text-gray-500">Event: {officeData.event_name}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        {isAdmin && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowMenu(!showMenu)}
                                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                    </svg>
                                </button>

                                {showMenu && (
                                    <div className="absolute right-0 top-10 bg-white rounded-lg shadow-lg border border-gray-100 py-1 w-48 z-10">
                                        <button
                                            onClick={() => {
                                                setShowMenu(false);
                                                onEditOffice(office);
                                            }}
                                            className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-indigo-50 flex items-center gap-2"
                                        >
                                            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            <span>Edit Office Info</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowMenu(false);
                                                onAddRequirements(office);
                                            }}
                                            className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-emerald-50 flex items-center gap-2"
                                        >
                                            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                            <span>Add Requirements</span>
                                        </button>
                                        <button
                                            onClick={async () => {
                                                setShowMenu(false);
                                                await onDeleteOffice?.(office);
                                            }}
                                            className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                                        >
                                            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
                                            </svg>
                                            <span>Delete Office</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Office Info - Compact */}
                <div className="px-5 py-3 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {(() => {
                            const officeHeads = officeData.heads || [];
                            
                            if (officeHeads.length === 0) {
                                return (
                                    <>
                                        <div className="w-9 h-9 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                                            <img src="/src/assets/images/user.svg" alt="Unassigned" className="w-5 h-5 opacity-50" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Personnel</p>
                                            <p className="text-sm font-medium text-gray-800">Unassigned</p>
                                        </div>
                                    </>
                                );
                            } else if (officeHeads.length > 1) {
                                return (
                                    <>
                                        <div className="flex flex-wrap gap-1">
                                            {officeHeads.map((head) => {
                                                const headPicUrl = head.ProfilePic 
                                                    ? `http://localhost:5000/uploads/profile-pics/${head.ProfilePic}`
                                                    : '/src/assets/images/user.svg';
                                                return (
                                                    <img
                                                        key={head.HeadID}
                                                        src={headPicUrl}
                                                        alt={head.full_name}
                                                        className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm"
                                                        onError={(e) => { e.target.src = '/src/assets/images/user.svg'; }}
                                                    />
                                                );
                                            })}
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">{officeHeads.length} Personnel</p>
                                        </div>
                                    </>
                                );
                            } else {
                                const primaryHead = officeHeads[0];
                                const headPicUrl = primaryHead?.ProfilePic 
                                    ? `http://localhost:5000/uploads/profile-pics/${primaryHead.ProfilePic}`
                                    : '/src/assets/images/user.svg';
                                return (
                                    <>
                                        <img
                                            src={headPicUrl}
                                            alt={primaryHead?.full_name}
                                            className="w-9 h-9 rounded-full object-cover border-2 border-gray-200"
                                            onError={(e) => { e.target.src = '/src/assets/images/user.svg'; }}
                                        />
                                        <div>
                                            <p className="text-xs text-gray-500">1 Personnel</p>
                                        </div>
                                    </>
                                );
                            }
                        })()}

                        {isAssignedInCurrentOffice && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2 py-1 text-[11px] font-semibold text-cyan-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                                You are assigned here ({assignedRequirementCount})
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-xs text-gray-500">Compliance</p>
                            <p className="text-lg font-semibold text-gray-900">
                                {officeData.compliance_percent ? Number(officeData.compliance_percent).toFixed(1) : '0'}%
                            </p>
                        </div>
                        <StatusBadge statusId={
                            officeData.overall_status === 'Complied' ? 5 :
                            officeData.overall_status === 'Partially Complied' ? 4 : 3
                        } />
                    </div>
                </div>

                {/* Search & Filter - Compact */}
                <div className="px-5 py-2.5 bg-white border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-700">Requirements</h3>
                    <div className="flex items-center gap-2">
                        {/* Status Filter */}
                        <div className="relative status-dropdown">
                            <button
                                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                                className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white hover:bg-gray-50 flex items-center gap-1.5"
                            >
                                <span className="text-gray-600">
                                    {statusFilter === 'all' ? 'All' :
                                     statusFilter === 'complied' ? 'Complied' :
                                     statusFilter === 'partially' ? 'Partial' : 'Not Complied'}
                                </span>
                                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {showStatusDropdown && (
                                <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-100 py-1 w-36 z-20">
                                    {[
                                        { value: 'all', label: 'All', color: 'gray' },
                                        { value: 'complied', label: 'Complied', color: 'emerald' },
                                        { value: 'partially', label: 'Partial', color: 'amber' },
                                        { value: 'not-complied', label: 'Not Complied', color: 'rose' }
                                    ].map(option => (
                                        <button
                                            key={option.value}
                                            onClick={() => {
                                                setStatusFilter(option.value);
                                                setShowStatusDropdown(false);
                                            }}
                                            className={`w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 flex items-center gap-2 ${
                                                statusFilter === option.value ? 'bg-gray-50' : ''
                                            }`}
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full bg-${option.color}-500`}></span>
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-gray-100 w-48 px-4 py-2 pl-8 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <svg className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Requirements List */}
                <div className="flex-1 overflow-y-auto px-5 py-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent"></div>
                        </div>
                    ) : requirements.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <p className="text-sm text-gray-500">No requirements assigned yet</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {(() => {
                                const groupedByArea = requirements.reduce((areaGroups, req) => {
                                    const areaKey = req.AreaCode || 'No Area';
                                    if (!areaGroups[areaKey]) {
                                        areaGroups[areaKey] = {
                                            name: req.AreaName || (req.AreaCode ? 'Uncategorized' : 'No Area'),
                                            code: req.AreaCode || 'No Area',
                                            criteriaGroups: {}
                                        };
                                    }
                                    const criteriaKey = req.CriteriaCode || 'No Criteria';
                                    if (!areaGroups[areaKey].criteriaGroups[criteriaKey]) {
                                        areaGroups[areaKey].criteriaGroups[criteriaKey] = {
                                            name: req.CriteriaName || 'Uncategorized',
                                            code: req.CriteriaCode,
                                            requirements: []
                                        };
                                    }
                                    areaGroups[areaKey].criteriaGroups[criteriaKey].requirements.push(req);
                                    return areaGroups;
                                }, {});

                                const filteredGroupedByArea = Object.entries(groupedByArea).reduce((acc, [areaKey, area]) => {
                                    const filteredCriteriaGroups = Object.entries(area.criteriaGroups).reduce((criteriaAcc, [criteriaKey, criteria]) => {
                                        const filteredReqs = criteria.requirements.filter(req => {
                                            const searchLower = searchTerm.toLowerCase();
                                            const matchesSearch = !searchTerm || (
                                                req.RequirementCode.toLowerCase().includes(searchLower) ||
                                                req.Description.toLowerCase().includes(searchLower) ||
                                                req.AreaCode.toLowerCase().includes(searchLower) ||
                                                req.AreaName.toLowerCase().includes(searchLower) ||
                                                req.CriteriaCode.toLowerCase().includes(searchLower) ||
                                                req.CriteriaName.toLowerCase().includes(searchLower) ||
                                                (req.comments && req.comments.toLowerCase().includes(searchLower))
                                            );

                                            let matchesStatus = true;
                                            if (statusFilter !== 'all') {
                                                if (statusFilter === 'complied') {
                                                    matchesStatus = req.ComplianceStatusID === 5;
                                                } else if (statusFilter === 'partially') {
                                                    matchesStatus = req.ComplianceStatusID === 4;
                                                } else if (statusFilter === 'not-complied') {
                                                    matchesStatus = req.ComplianceStatusID === 3 || !req.ComplianceStatusID;
                                                }
                                            }

                                            return matchesSearch && matchesStatus;
                                        });
                                        
                                        if (filteredReqs.length > 0) {
                                            criteriaAcc[criteriaKey] = { ...criteria, requirements: filteredReqs };
                                        }
                                        return criteriaAcc;
                                    }, {});

                                    if (Object.keys(filteredCriteriaGroups).length > 0) {
                                        acc[areaKey] = { ...area, criteriaGroups: filteredCriteriaGroups };
                                    }
                                    return acc;
                                }, {});

                                if ((searchTerm || statusFilter !== 'all') && Object.keys(filteredGroupedByArea).length === 0) {
                                    return (
                                        <div className="text-center py-8">
                                            <div className="w-10 h-10 mx-auto mb-2 bg-gray-100 rounded-full flex items-center justify-center">
                                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                            </div>
                                            <p className="text-sm text-gray-500">No requirements found</p>
                                        </div>
                                    );
                                }

                                return Object.entries(filteredGroupedByArea).map(([areaKey, area]) => (
                                    <div key={areaKey} className="space-y-3">
                                        {/* Area Header - Compact */}
                                        <div className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-lg">
                                            <h3 className="text-sm font-semibold text-white">{area.code}</h3>
                                            <p className="text-xs text-indigo-100 mt-0.5">{area.name}</p>
                                        </div>

                                        {/* Criteria Groups */}
                                        <div className="space-y-3 pl-3">
                                            {Object.entries(area.criteriaGroups).map(([criteriaKey, criteria]) => (
                                                <div key={criteriaKey} className="border border-gray-200 rounded-lg overflow-hidden">
                                                    {/* Criteria Header - Compact */}
                                                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                                                        <h4 className="text-xs font-medium text-gray-900">{criteria.code}</h4>
                                                        <p className="text-xs text-gray-500 mt-0.5">{criteria.name}</p>
                                                    </div>

                                                    {/* Requirements */}
                                                    <div className="divide-y divide-gray-100">
                                                        {criteria.requirements.map((req, index) => {
                                                            const isAssignedToMe = isUserAssignedToRequirement(req.RequirementID);

                                                            return (
                                                            <div
                                                                key={req.RequirementID}
                                                                className={`p-3 transition-colors ${isAssignedToMe ? 'bg-cyan-50/60 ring-1 ring-cyan-200' : 'hover:bg-gray-50/50'}`}
                                                            >
                                                                <div className="flex items-start gap-3">
                                                                    {/* Status */}
                                                                    <div className="min-w-[90px]">
                                                                        {isAdmin ? (
                                                                            <div className="space-y-1.5">
                                                                                {[
                                                                                    { id: 5, label: 'Complied', color: 'emerald', title: 'Fully Complied' },
                                                                                    { id: 4, label: 'Partially Complied', color: 'amber', title: 'Partially Complied' },
                                                                                    { id: 3, label: 'Not Complied', color: 'rose', title: 'Not Complied' }
                                                                                ].map(option => (
                                                                                    <label key={option.id} className="flex items-center gap-1.5 text-xs cursor-pointer" title={option.title}>
                                                                                        <input
                                                                                            type="radio"
                                                                                            name={`status-${req.RequirementID}`}
                                                                                            checked={req.ComplianceStatusID === option.id}
                                                                                            onChange={() => handleStatusChange(req.RequirementID, option.id)}
                                                                                            className={`w-3 h-3 text-${option.color}-600 border-${option.color}-300 focus:ring-${option.color}-500 focus:ring-2`}
                                                                                        />
                                                                                        <span className={`font-medium ${
                                                                                            option.color === 'emerald' ? 'text-emerald-700' :
                                                                                            option.color === 'amber' ? 'text-amber-700' : 'text-rose-700'
                                                                                        }`}>{option.label}</span>
                                                                                    </label>
                                                                                ))}
                                                                            </div>
                                                                        ) : (
                                                                            <StatusBadge statusId={req.ComplianceStatusID} />
                                                                        )}
                                                                    </div>

                                                                    {/* Requirement Details */}
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2">
                                                                            <h5 className="text-xs font-medium text-gray-900">{req.RequirementCode}</h5>
                                                                            {isAssignedToMe && (
                                                                                <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold text-cyan-700">
                                                                                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                                                                                    Active
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{req.Description}</p>
                                                                        
                                                                        {/* Comment */}
                                                                        {editingCommentId === req.RequirementID ? (
                                                                            <div className="mt-2">
                                                                                <textarea
                                                                                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                                                                    value={commentInput}
                                                                                    onChange={handleCommentInputChange}
                                                                                    autoFocus
                                                                                    rows={2}
                                                                                    placeholder="Add comment..."
                                                                                    onKeyDown={e => {
                                                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                                                            e.preventDefault();
                                                                                            handleCommentSave(req);
                                                                                        }
                                                                                        if (e.key === 'Escape') handleCommentCancel();
                                                                                    }}
                                                                                />
                                                                                <div className="flex gap-1.5 mt-1.5">
                                                                                    <button
                                                                                        className="px-2 py-1 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                                                                        onClick={() => handleCommentSave(req)}
                                                                                        disabled={savingComment}
                                                                                    >
                                                                                        {savingComment ? '...' : 'Save'}
                                                                                    </button>
                                                                                    <button
                                                                                        className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                                                                                        onClick={handleCommentCancel}
                                                                                    >
                                                                                        Cancel
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <div
                                                                                className={`mt-2 px-2 py-1.5 text-xs rounded-lg cursor-pointer flex items-start gap-1 ${
                                                                                    req.comments 
                                                                                        ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' 
                                                                                        : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                                                                }`}
                                                                                onClick={() => isAdmin && handleCommentClick(req)}
                                                                            >
                                                                                <span className="line-clamp-1">{req.comments || 'Add comment...'}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Actions */}
                                                                    <div className="flex flex-col items-end gap-1.5">
                                                                        {/* Assigned Users */}
                                                                        {assignedUsersMap[req.RequirementID]?.length > 0 && (
                                                                            <div className="flex space-x-1">
                                                                                {assignedUsersMap[req.RequirementID].slice(0, 4).map((user) => {
                                                                                    const hasUploaded = user.HasUploaded === 1 || user.HasUploaded === true;
                                                                                    const initials = `${user.FirstName?.[0] || ''}${user.LastName?.[0] || ''}`.toUpperCase();
                                                                                    
                                                                                    return (
                                                                                        <div
                                                                                            key={user.UserID}
                                                                                            className="relative group avatar-popup-menu"
                                                                                            onClick={(e) => handleUserAvatarClick(e, user, req.RequirementID)}
                                                                                            style={{ cursor: isAdmin ? 'pointer' : 'default' }}
                                                                                        >
                                                                                            <div className={`w-6 h-6 rounded-full border-2 ${hasUploaded ? 'border-emerald-500' : 'border-gray-300'} bg-white flex items-center justify-center overflow-hidden shadow-sm hover:scale-110 transition-transform`}>
                                                                                                {user.ProfilePic ? (
                                                                                                    <img
                                                                                                        src={`http://localhost:5000/uploads/profile-pics/${user.ProfilePic}`}
                                                                                                        alt={`${user.FirstName} ${user.LastName}`}
                                                                                                        className="w-full h-full object-cover"
                                                                                                    />
                                                                                                ) : (
                                                                                                    <span className="text-[10px] font-medium text-gray-600">{initials}</span>
                                                                                                )}
                                                                                            </div>
                                                                                            
                                                                                            {/* Tooltip (only show when popup is not open) */}
                                                                                            {!(avatarPopup && avatarPopup.user.UserID === user.UserID && avatarPopup.requirementId === req.RequirementID) && (
                                                                                                <div className="absolute bottom-full right-0 mb-1 px-2 py-1 bg-gray-900 text-white text-[10px] rounded shadow-lg whitespace-nowrap invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 z-50">
                                                                                                    <p>{user.FirstName} {user.LastName}</p>
                                                                                                    <p className={hasUploaded ? 'text-emerald-400' : 'text-rose-400'}>
                                                                                                        {hasUploaded ? '✓ Uploaded' : '✗ Not uploaded'}
                                                                                                    </p>
                                                                                                </div>
                                                                                            )}

                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        )}

                                                                        {/* Upload Button for non-admin */}
                                                                        {!isAdmin && isUserAssignedToRequirement(req.RequirementID) && (
                                                                            <div className="flex flex-col gap-1 items-end">
                                                                                <input
                                                                                    type="file"
                                                                                    ref={userReqFileInputRef}
                                                                                    style={{ display: 'none' }}
                                                                                    onChange={(e) => handleUserReqFileUpload(e, req.RequirementID)}
                                                                                    accept=".pdf,.doc,.docx,.xlsx,.xls,.jpg,.jpeg,.png"
                                                                                />
                                                                                {hasUserUploadedForRequirement(req.RequirementID) ? (
                                                                                    <>
                                                                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-50 rounded border border-emerald-200">
                                                                                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                                            </svg>
                                                                                            Done
                                                                                        </span>
                                                                                        <button
                                                                                            onClick={() => handleUnsubmitUserFile(req.RequirementID)}
                                                                                            disabled={unsubmittingReqId === req.RequirementID}
                                                                                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-rose-600 bg-rose-50 rounded border border-rose-200 hover:bg-rose-100 disabled:opacity-50 mt-1"
                                                                                        >
                                                                                            {unsubmittingReqId === req.RequirementID ? (
                                                                                                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
                                                                                            ) : (
                                                                                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                                                </svg>
                                                                                            )}
                                                                                            Unsubmit
                                                                                        </button>
                                                                                    </>
                                                                                ) : (
                                                                                    <button
                                                                                        onClick={() => userReqFileInputRef.current?.click()}
                                                                                        disabled={userUploadingReqId === req.RequirementID}
                                                                                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 bg-indigo-50 rounded border border-indigo-200 hover:bg-indigo-100 disabled:opacity-50"
                                                                                    >
                                                                                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                                                        </svg>
                                                                                        Upload
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        )}

                                                                        {/* Assign Button for admin */}
                                                                        {isAdmin && (
                                                                            <button
                                                                                onClick={() => {
                                                                                    setSelectedRequirement(req);
                                                                                    setShowAssignModal(true);
                                                                                }}
                                                                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 bg-indigo-50 rounded border border-indigo-200 hover:bg-indigo-100"
                                                                            >
                                                                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                                                                </svg>
                                                                                Assign
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )})}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    )}
                </div>

                {/* Footer - Compact */}
                <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    {isAdmin && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Proof:</span>
                            {!proofFileUrl && (
                                <>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        style={{ display: 'none' }}
                                        onChange={handleProofFileChange}
                                        accept=".pdf,.doc,.docx,.xlsx,.xls,.jpg,.jpeg,.png"
                                        disabled={uploadingProof}
                                    />
                                    <button
                                        className="px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 border border-indigo-200 disabled:opacity-50"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploadingProof}
                                    >
                                        {uploadingProof ? '...' : 'Upload'}
                                    </button>
                                </>
                            )}
                            {proofFileUrl && (
                                <>
                                    <a
                                        href={proofFileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-2 py-1 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 border border-emerald-200"
                                        download
                                    >
                                        Download
                                    </a>
                                    <button
                                        className="px-2 py-1 text-xs font-medium text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 border border-rose-200"
                                        onClick={async () => {
                                            if (!window.confirm('Delete proof document? This cannot be undone.')) return;
                                            setUnsubmittingProof(true);
                                            try {
                                                const token = localStorage.getItem('token');
                                                const res = await fetch(`http://localhost:5000/api/officedocuments/${office.id}/proof`, {
                                                    method: 'DELETE',
                                                    headers: { 'Authorization': `Bearer ${token}` }
                                                });
                                                let data = {};
                                                const text = await res.text();
                                                try {
                                                    data = text ? JSON.parse(text) : {};
                                                } catch (e) {
                                                    data = { __raw: text };
                                                }
                                                if (res.ok && data.success) {
                                                    // Refresh proof state
                                                    setPersistedProof(null);
                                                    setProofFileName("");
                                                    setProofFileUrl("");
                                                    try { await fetchOfficeRequirements(); } catch (e) { /* ignore */ }
                                                    try { await (async () => {
                                                        const res2 = await axios.get(`http://localhost:5000/api/officedocuments/${office.id}/proof`);
                                                        if (res2.data && res2.data.success) {
                                                            setPersistedProof({ fileName: res2.data.file_name, url: `http://localhost:5000${res2.data.url}` });
                                                            setProofFileName(res2.data.file_name);
                                                            setProofFileUrl(`http://localhost:5000${res2.data.url}`);
                                                        } else {
                                                            setPersistedProof(null); setProofFileName(""); setProofFileUrl("");
                                                        }
                                                    })(); } catch (e) { /* ignore */ }
                                                    alert('Proof deleted');
                                                } else {
                                                    alert(data.message || 'Failed to delete proof');
                                                }
                                            } catch (err) {
                                                console.error('Delete proof error', err);
                                                alert('Failed to delete proof');
                                            } finally {
                                                setUnsubmittingProof(false);
                                            }
                                        }}
                                        disabled={unsubmittingProof}
                                    >
                                        {unsubmittingProof ? '...' : 'Unsubmit'}
                                    </button>
                                    <button
                                        className="px-2 py-1 text-xs font-medium text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 border border-amber-200"
                                        onClick={() => {
                                            setExcelHtml(null);
                                            setExcelPreviewError(null);
                                            setExcelHtmlLoading(false);
                                            setShowDocViewer(true);
                                        }}
                                    >
                                        Preview
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* Document Viewer Modal - Compact */}
            {proofFileUrl && showDocViewer && (
                <div
                    className="fixed inset-y-0 right-0 z-[130] flex items-center justify-center bg-black/60"
                    style={{ left: 'var(--sidebar-width, 0px)', transition: 'left 200ms ease-in-out' }}
                    onClick={() => {
                    setShowDocViewer(false);
                    setExcelHtml(null);
                    setExcelPreviewError(null);
                }}>
                    <div className="bg-white rounded-xl shadow-2xl p-4 max-w-4xl w-full max-h-[90vh] flex flex-col relative" onClick={e => e.stopPropagation()}>
                        <button 
                            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600" 
                            onClick={() => {
                                setShowDocViewer(false);
                                setExcelHtml(null);
                                setExcelPreviewError(null);
                            }}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        
                        <div className="flex-1 overflow-auto">
                            {proofFileUrl.match(/\.(pdf)$/i) ? (
                                <iframe src={proofFileUrl} title="Document Preview" className="w-full h-[70vh] border-0 rounded-lg" />
                            ) : proofFileUrl.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) ? (
                                <img src={proofFileUrl} alt="Document Preview" className="max-h-[70vh] max-w-full object-contain mx-auto" />
                            ) : proofFileUrl.match(/\.(xlsx|xls)$/i) ? (
                                <div className="w-full h-[70vh] flex flex-col">
                                    {excelHtml ? (
                                        <div className="w-full h-full overflow-auto border border-gray-200 rounded-lg p-3" dangerouslySetInnerHTML={{ __html: excelHtml }} />
                                    ) : excelHtmlLoading ? (
                                        <div className="flex items-center justify-center h-full">
                                            <div className="text-center">
                                                <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent mx-auto mb-3"></div>
                                                <p className="text-xs text-gray-500">Loading preview...</p>
                                            </div>
                                        </div>
                                    ) : excelPreviewError ? (
                                        <div className="flex items-center justify-center h-full">
                                            <div className="text-center">
                                                <div className="w-10 h-10 mx-auto mb-2 bg-rose-100 rounded-full flex items-center justify-center">
                                                    <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <p className="text-xs text-gray-500 mb-2">Failed to load preview</p>
                                                <button 
                                                    className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                                                    onClick={() => handleExcelPreview(proofFileUrl)}
                                                >
                                                    Try Again
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-full">
                                            <div className="text-center">
                                                <div className="w-10 h-10 mx-auto mb-2 bg-indigo-100 rounded-full flex items-center justify-center">
                                                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                                <p className="text-xs text-gray-500 mb-2">Click to preview Excel file</p>
                                                <button 
                                                    className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                                                    onClick={() => handleExcelPreview(proofFileUrl)}
                                                >
                                                    Load Preview
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : proofFileUrl.match(/\.(docx|pptx)$/i) ? (
                                <iframe 
                                    src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(proofFileUrl)}`} 
                                    title="Office Preview" 
                                    className="w-full h-[70vh] border-0 rounded-lg" 
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-xs text-gray-500">
                                    Preview not supported
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Assign User Modal */}
            <AssignUserModal
                isOpen={showAssignModal}
                onClose={() => {
                    setShowAssignModal(false);
                    setSelectedRequirement(null);
                }}
                requirement={selectedRequirement}
                officeId={office?.id}
                currentUserId={currentUser?.UserID}
                isAdmin={isAdmin}
                onSuccess={fetchOfficeRequirements}
            />

            {/* User File Preview Modal - Compact */}
            {showUserFileViewer && selectedUserFile && (
                <div
                    className="fixed inset-y-0 right-0 z-[131] flex items-center justify-center bg-black/60"
                    style={{ left: 'var(--sidebar-width, 0px)', transition: 'left 200ms ease-in-out' }}
                    onClick={() => {
                    setShowUserFileViewer(false);
                    setExcelHtml(null);
                    setExcelPreviewError(null);
                }}>
                    <div className="bg-white rounded-xl shadow-2xl p-4 max-w-4xl w-full max-h-[90vh] flex flex-col relative" onClick={e => e.stopPropagation()}>
                        <button 
                            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600" 
                            onClick={() => {
                                setShowUserFileViewer(false);
                                setExcelHtml(null);
                                setExcelPreviewError(null);
                            }}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        
                        <div className="flex-1 overflow-auto">
                            {selectedUserFile.url.match(/\.(pdf)$/i) ? (
                                <iframe src={selectedUserFile.url} title="Document Preview" className="w-full h-[70vh] border-0 rounded-lg" />
                            ) : selectedUserFile.url.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) ? (
                                <img src={selectedUserFile.url} alt="Document Preview" className="max-h-[70vh] max-w-full object-contain mx-auto" />
                            ) : selectedUserFile.url.match(/\.(xlsx|xls)$/i) ? (
                                <div className="w-full h-[70vh] flex flex-col">
                                    {excelHtml ? (
                                        <div className="w-full h-full overflow-auto border border-gray-200 rounded-lg p-3" dangerouslySetInnerHTML={{ __html: excelHtml }} />
                                    ) : excelHtmlLoading ? (
                                        <div className="flex items-center justify-center h-full">
                                            <div className="text-center">
                                                <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent mx-auto mb-3"></div>
                                                <p className="text-xs text-gray-500">Loading preview...</p>
                                            </div>
                                        </div>
                                    ) : excelPreviewError ? (
                                        <div className="flex items-center justify-center h-full">
                                            <div className="text-center">
                                                <div className="w-10 h-10 mx-auto mb-2 bg-rose-100 rounded-full flex items-center justify-center">
                                                    <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <p className="text-xs text-gray-500 mb-2">Failed to load preview</p>
                                                <button 
                                                    className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                                                    onClick={() => handleExcelPreview(selectedUserFile.url)}
                                                >
                                                    Try Again
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-full">
                                            <div className="text-center">
                                                <div className="w-10 h-10 mx-auto mb-2 bg-indigo-100 rounded-full flex items-center justify-center">
                                                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                                <p className="text-xs text-gray-500 mb-2">Click to preview Excel file</p>
                                                <button 
                                                    className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                                                    onClick={() => handleExcelPreview(selectedUserFile.url)}
                                                >
                                                    Load Preview
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : selectedUserFile.url.match(/\.(docx|pptx)$/i) ? (
                                <iframe 
                                    src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(selectedUserFile.url)}`} 
                                    title="Office Preview" 
                                    className="w-full h-[70vh] border-0 rounded-lg" 
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-xs text-gray-500">
                                    Preview not supported
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Avatar Popup Menu - rendered as fixed overlay via portal */}
            {isAdmin && avatarPopup && avatarPopup.rect && createPortal(
                <div 
                    className="fixed inset-0 z-[9999]" 
                    onClick={() => setAvatarPopup(null)}
                >
                    <div 
                        className="avatar-popup-menu bg-white rounded-lg shadow-xl border border-gray-200 py-1 w-48"
                        style={{
                            position: 'fixed',
                            top: avatarPopup.rect.bottom + 6,
                            left: Math.min(avatarPopup.rect.right - 192, window.innerWidth - 200),
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-3 py-1.5 border-b border-gray-100">
                            <p className="text-[11px] font-semibold text-gray-800 truncate">{avatarPopup.user.FirstName} {avatarPopup.user.LastName}</p>
                            <p className={`text-[10px] ${(avatarPopup.user.HasUploaded === 1 || avatarPopup.user.HasUploaded === true) ? 'text-emerald-600' : 'text-rose-500'}`}>
                                {(avatarPopup.user.HasUploaded === 1 || avatarPopup.user.HasUploaded === true) ? '\u2713 Uploaded' : '\u2717 Not uploaded'}
                            </p>
                        </div>
                        {(avatarPopup.user.HasUploaded === 1 || avatarPopup.user.HasUploaded === true) && (
                            <button
                                onClick={() => handleViewUserFile(avatarPopup.user, avatarPopup.requirementId)}
                                className="w-full px-3 py-1.5 text-left text-[11px] text-gray-700 hover:bg-indigo-50 flex items-center gap-2"
                            >
                                <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View File
                            </button>
                        )}
                        <button
                            onClick={() => openNotifForm(avatarPopup.user, avatarPopup.requirementId)}
                            className="w-full px-3 py-1.5 text-left text-[11px] text-gray-700 hover:bg-amber-50 flex items-center gap-2"
                        >
                            <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            Send Notification
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {/* Send Notification Form Modal */}
            {showNotifForm && createPortal(
                <div
                    className="fixed inset-y-0 right-0 z-[140] bg-black/40 flex items-center justify-center p-4"
                    style={{ left: 'var(--sidebar-width, 0px)', transition: 'left 200ms ease-in-out' }}
                    onClick={() => { setShowNotifForm(null); setNotifTitle(''); setNotifMessage(''); }}
                >
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900">Send Notification</h3>
                                    <p className="text-xs text-gray-500">To: {showNotifForm.user.FirstName} {showNotifForm.user.LastName}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setShowNotifForm(null); setNotifTitle(''); setNotifMessage(''); }}
                                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Form */}
                        <div className="px-5 py-4 space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    value={notifTitle}
                                    onChange={(e) => setNotifTitle(e.target.value)}
                                    placeholder="Notification title..."
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Message</label>
                                <textarea
                                    value={notifMessage}
                                    onChange={(e) => setNotifMessage(e.target.value)}
                                    placeholder="Write your message..."
                                    rows={4}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
                            <button
                                onClick={() => { setShowNotifForm(null); setNotifTitle(''); setNotifMessage(''); }}
                                className="px-3.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                disabled={sendingNotification}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleSendNotificationToUser(showNotifForm.user, showNotifForm.requirementId)}
                                disabled={sendingNotification || !notifTitle.trim() || !notifMessage.trim()}
                                className="px-4 py-1.5 text-xs font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                            >
                                {sendingNotification ? (
                                    <>
                                        <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                        Send
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
