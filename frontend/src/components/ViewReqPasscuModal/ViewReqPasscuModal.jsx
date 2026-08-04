import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { renderAsync } from 'docx-preview';
import { usersAPI, requirementsAPI, officesAPI } from '../../utils/api';
import { API_BASE_URL } from '../../utils/apiBase';

import { useModal } from "../UI/ModalProvider";
import ModalHeader from './ModalHeader';
import OfficeInfoBar from './OfficeInfoBar';
import RequirementsToolbar from './RequirementsToolbar';
import ProofFooterBar from './ProofFooterBar';
import RequirementsTree from './RequirementsTree';
import ProofDocumentViewerModal from './ProofDocumentViewerModal';
import UserFileViewerModal from './UserFileViewerModal';
import AvatarPopupMenu from './AvatarPopupMenu';
import SendNotificationModal from './SendNotificationModal';
import SubmissionViewer from './SubmissionViewer';

export default function ViewReqPASSCUModal({
    isOpen,
    onClose,
    office,
    deepLink = null,
    onDeepLinkHandled,
    onEditOffice,
    onAddRequirements,
    onDeleteOffice,
}) {
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
    const [docxPreviewLoading, setDocxPreviewLoading] = useState(false);
    const [docxPreviewError, setDocxPreviewError] = useState(null);
    const [userDocxPreviewLoading, setUserDocxPreviewLoading] = useState(false);
    const [userDocxPreviewError, setUserDocxPreviewError] = useState(null);
    const docxPreviewRef = useRef(null);
    const userDocxPreviewRef = useRef(null);
    const [userUploadingReqId, setUserUploadingReqId] = useState(null);
    const userReqFileInputRef = useRef();
    const [selectedUserFile, setSelectedUserFile] = useState(null);
    const [showUserFileViewer, setShowUserFileViewer] = useState(false);
    const [avatarPopup, setAvatarPopup] = useState(null); // { user, requirementId, rect }
    const [sendingNotification, setSendingNotification] = useState(false);
    const [showNotifForm, setShowNotifForm] = useState(null); // { user, requirementId }
    const [notifTitle, setNotifTitle] = useState('');
    const [notifMessage, setNotifMessage] = useState('');
    const [showSubmissionViewer, setShowSubmissionViewer] = useState(false);
    const [selectedSubmissionRequirement, setSelectedSubmissionRequirement] = useState(null);
    const [unsubmittingReqId, setUnsubmittingReqId] = useState(null);
    const [unsubmittingProof, setUnsubmittingProof] = useState(false);
    const [removingReqId, setRemovingReqId] = useState(null);
    const [expandedReqs, setExpandedReqs] = useState([]);
    const [submissionViewerUsers, setSubmissionViewerUsers] = useState(null);
    const deepLinkAppliedRef = useRef(false);

    const { showAlert, showConfirm } = useModal();

    const currentRoleId = Number(currentUser?.RoleID || 0);
    const toggleExpandReq = (requirementId) => {
        setExpandedReqs(prev => {
            if (prev.includes(requirementId)) return prev.filter(id => id !== requirementId);
            return [...prev, requirementId];
        });
    };

    const isAdmin = currentRoleId === 1;
    const isOfficeHead = currentRoleId === 3;
    const isStandardUser = currentRoleId === 2;

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
                const res = await fetch(`${API_BASE_URL}/api/officedocuments/${office.id}/proof`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });
                const data = await res.json();
                    if (data.success && data.url) {
                    setProofFileUrl(`${API_BASE_URL}${data.url}`);
                    setProofFileName(data.filename);
                    setPersistedProof({ fileName: data.filename, url: `${API_BASE_URL}${data.url}` });
                    await fetchOfficeRequirements();
                } else {
                    await showAlert(data.message || 'Failed to upload proof document');
                }
            } catch (err) {
                console.error('Upload error:', err);
                await showAlert('Failed to upload proof document');
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
                    const res = await axios.get(`${API_BASE_URL}/api/officedocuments/${office.id}/proof`);
                    if (res.data && res.data.success) {
                        setPersistedProof({
                            fileName: res.data.file_name,
                            url: `${API_BASE_URL}${res.data.url}`
                        });
                        setProofFileName(res.data.file_name);
                        setProofFileUrl(`${API_BASE_URL}${res.data.url}`);
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
            const response = await axios.get(`${API_BASE_URL}/api/offices/${office.id}/requirements`);
            const reqs = response.data.data || [];
            setRequirements(reqs);

            const assignedMap = {};
            await Promise.all(reqs.map(async (req) => {
                try {
                    const assignedRes = await requirementsAPI.getAssignedUsers(req.RequirementID, office.id);
                    assignedMap[req.RequirementID] = assignedRes.users || assignedRes.data || [];
                } catch (err) {
                    console.error(`Error fetching assigned users for req ${req.RequirementID}:`, err);
                    assignedMap[req.RequirementID] = [];
                }
            }));
            setAssignedUsersMap(assignedMap);
            
            const officeResponse = await axios.get(`${API_BASE_URL}/api/offices/${office.id}`);
            if (officeResponse.data) {
                setOfficeData(prev => ({
                    ...prev,
                    overall_status: officeResponse.data.OverallStatus,
                    compliance_percent: officeResponse.data.CompliancePercent,
                    total_requirements: officeResponse.data.TotalRequirements,
                    event_name: officeResponse.data.EventName || officeResponse.data.Event || prev.event_name || null,
                    DepartmentName: officeResponse.data.DepartmentName || officeResponse.data.department_name || prev.DepartmentName || prev.department_name || null,
                    ProgramTypeName: officeResponse.data.ProgramTypeName || officeResponse.data.program_type_name || prev.ProgramTypeName || prev.program_type_name || null
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
            await showAlert('No user information available. Please reload and try again.');
            return;
        }
        const ok = await showConfirm('Are you sure you want to unsubmit (delete) your uploaded file? This cannot be undone.');
        if (!ok) return;
        setUnsubmittingReqId(requirementId);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/requirements/${requirementId}/file/${currentUser.UserID}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
            });
            let data = {};
            try { data = await res.json(); } catch (e) { /* ignore JSON parse errors */ }
            if (res.ok && data.success) {
                await showAlert('File deleted. You can now re-upload.');
            } else if (res.status === 404) {
                // No file found — still refresh UI so upload button becomes available
                console.warn('Unsubmit: file not found on server');
            } else {
                console.warn('Unsubmit: server returned error', res.status, data);
                await showAlert(data.message || 'Failed to delete file.');
            }
        } catch (err) {
            console.error('Unsubmit error:', err);
            await showAlert('Failed to delete file.');
        } finally {
            try { await fetchOfficeRequirements(); } catch (e) { console.error('Refresh after unsubmit failed', e); }
            setUnsubmittingReqId(null);
        }
    };

    const handleStatusChange = async (reqId, newStatusId) => {
        try {
            await axios.put(`${API_BASE_URL}/api/offices/${office.id}/requirements/${reqId}/status`, {
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
            const officeResponse = await axios.get(`${API_BASE_URL}/api/offices/${office.id}`);
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
            await showAlert('Failed to update compliance status');
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
            await axios.put(`${API_BASE_URL}/api/offices/${office.id}/requirements/${req.RequirementID}/status`, {
                statusId: req.ComplianceStatusID || 3,
                comments: commentInput
            });
            await fetchOfficeRequirements();
            setEditingCommentId(null);
        } catch (error) {
            await showAlert('Failed to save comment');
        } finally {
            setSavingComment(false);
        }
    };

    const handleCommentClear = async (req) => {
        if (!isAdmin || !req?.RequirementID) return;
        const ok = await showConfirm('Clear this comment? This cannot be undone.');
        if (!ok) return;

        setSavingComment(true);
        try {
            await axios.put(`${API_BASE_URL}/api/offices/${office.id}/requirements/${req.RequirementID}/status`, {
                statusId: req.ComplianceStatusID || 3,
                comments: ''
            });
            await fetchOfficeRequirements();
            setEditingCommentId(null);
            setCommentInput("");
            setSelectedSubmissionRequirement((prev) => (
                prev && prev.RequirementID === req.RequirementID ? { ...prev, comments: '' } : prev
            ));
        } catch (error) {
            await showAlert('Failed to clear comment');
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
            const res = await fetch(`${API_BASE_URL}/api/requirements/user-upload`, {
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
                await showAlert('File uploaded successfully!');
            } else {
                await showAlert(data.message || 'Failed to upload file');
            }
        } catch (err) {
            console.error('Upload error:', err);
            await showAlert('Failed to upload file');
        } finally {
            setUserUploadingReqId(null);
            if (e?.target) e.target.value = '';
            if (userReqFileInputRef.current) {
                userReqFileInputRef.current.value = '';
            }
        }
    };

    // Remove a requirement from this office (admin action)
    const handleRemoveRequirement = async (requirementId) => {
        const ok = await showConfirm('Remove this requirement from the office? This cannot be undone.');
        if (!ok) return;
        try {
            setRemovingReqId(requirementId);
            const token = localStorage.getItem('token');
            await axios.delete(`${API_BASE_URL}/api/offices/${office.id}/requirements/${requirementId}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            await fetchOfficeRequirements();
        } catch (err) {
            console.error('Failed to remove requirement from office', err);
            await showAlert(err?.response?.data?.message || 'Failed to remove requirement from office');
        } finally {
            setRemovingReqId(null);
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
        const escapeHtml = (value) => String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

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

            // Read workbook with styles enabled so we can preserve formatting
            const workbook = XLSX.read(arrayBuffer, { type: 'array', cellStyles: true });

            // Minimal wrapper styles — avoid overriding cell-level styles generated by sheet_to_html
            let html = `
                <div class="excel-preview-root">
                    <style>
                        .excel-preview-root { font-family: 'Segoe UI', Tahoma, sans-serif; color: #0f172a; padding: 12px; background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%); height:100%; box-sizing: border-box; display:flex; flex-direction:column; }
                        .excel-sheet { border:1px solid #e2e8f0; border-radius:10px; background:#fff; margin-bottom:12px; overflow:hidden; display:flex; flex-direction:column; }
                        .excel-sheet-title { position:sticky; top:0; z-index:2; padding:10px 12px; border-bottom:1px solid #e2e8f0; background:linear-gradient(90deg,#0f3a8a 0%,#1d4ed8 100%); color:#fff; font-size:12px; font-weight:700; text-transform:uppercase; }
                        .excel-sheet-table { overflow:auto; flex:1 1 auto; min-height:0; padding:12px; }
                        .excel-sheet-table table { border-collapse:collapse; width:100%; table-layout:fixed; }
                        .excel-sheet-table th, .excel-sheet-table td { border:1px solid #e6eef8; padding:6px 8px; vertical-align:top; white-space:pre-wrap; word-break:break-word; }
                        .excel-sheet-table thead th { position:sticky; top:0; background:rgba(255,255,255,0.95); z-index:3; }
                    </style>
            `;

            // Helper to compute pixel width for a column definition
            const computeColPx = (col) => {
                if (!col) return null;
                if (typeof col.wpx === 'number') return Math.round(col.wpx);
                if (typeof col.wch === 'number') return Math.round(col.wch * 7 + 5);
                return null;
            };

            workbook.SheetNames.forEach((sheetName, index) => {
                const worksheet = workbook.Sheets[sheetName];
                html += `<section class="excel-sheet" style="margin-top:${index === 0 ? '0' : '14px'};">`;
                html += `<div class="excel-sheet-title">Sheet: ${escapeHtml(sheetName)}</div>`;
                html += '<div class="excel-sheet-table">';

                // Generate HTML from sheet (ask xlsx to include inline cell styles)
                const sheetHtmlRaw = XLSX.utils.sheet_to_html(worksheet, {
                    id: `sheet-${index}`,
                    editable: false,
                    blankrows: false,
                    cellStyles: true
                });

                // Use DOM to inject colgroup widths and row heights from worksheet metadata
                try {
                    const wrapper = document.createElement('div');
                    wrapper.innerHTML = sheetHtmlRaw;
                    const table = wrapper.querySelector('table');
                    if (table) {
                        // Determine range and number of columns/rows
                        const ref = worksheet['!ref'] || table.getAttribute('data-range') || null;
                        const range = ref ? XLSX.utils.decode_range(ref) : null;
                        const ncols = range ? (range.e.c - range.s.c + 1) : (table.querySelectorAll('tr:first-child th, tr:first-child td').length || 0);

                        // Inject colgroup based on worksheet['!cols'] if present
                        const colgroup = document.createElement('colgroup');
                        for (let c = 0; c < ncols; c++) {
                            const colEl = document.createElement('col');
                            const colMeta = (worksheet['!cols'] && worksheet['!cols'][c]) ? worksheet['!cols'][c] : null;
                            const wpx = computeColPx(colMeta);
                            if (wpx) colEl.style.width = `${wpx}px`;
                            colgroup.appendChild(colEl);
                        }
                        table.insertBefore(colgroup, table.firstChild);

                        // Apply row heights if available
                        if (worksheet['!rows'] && table.tBodies && table.tBodies[0]) {
                            const rows = table.tBodies[0].rows;
                            for (let r = 0; r < rows.length && r < worksheet['!rows'].length; r++) {
                                const rowMeta = worksheet['!rows'][r];
                                const hpx = rowMeta && (rowMeta.hpx || rowMeta.hpt ? (rowMeta.hpx || Math.round((rowMeta.hpt || 0) * 1.3333)) : null);
                                if (hpx) rows[r].style.height = `${hpx}px`;
                            }
                        }

                        // Use the modified table HTML
                        html += wrapper.innerHTML;
                    } else {
                        // Fallback: append raw HTML
                        html += sheetHtmlRaw;
                    }
                } catch (e) {
                    console.warn('Failed to post-process sheet HTML for precise sizing, using raw HTML fallback', e);
                    html += sheetHtmlRaw;
                }

                html += '</div>';
                html += '</section>';
            });
            html += '</div>';
            setExcelHtml(html);
        } catch (err) {
            console.error('Excel preview error:', err);
            setExcelPreviewError(err.message || 'Failed to load Excel file');
            setExcelHtml(`<div style="color:#2563eb;padding:1em;text-align:center;">
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
            const res = await axios.get(`${API_BASE_URL}/api/requirements/${requirementId}/user-file/${user.UserID}`);
            if (res.data && res.data.success && res.data.file) {
                setExcelHtml(null);
                setExcelPreviewError(null);
                setExcelHtmlLoading(false);
                setSelectedUserFile(res.data.file);
                setShowUserFileViewer(true);
            } else {
                await showAlert('No file found for this user.');
            }
        } catch (err) {
            await showAlert('Error fetching user file.');
        }
    };

    useEffect(() => {
        if (!isOpen) {
            deepLinkAppliedRef.current = false;
            return;
        }
        if (!deepLink || deepLinkAppliedRef.current || loading || requirements.length === 0) return;

        const reqId = deepLink.requirementId ? Number(deepLink.requirementId) : null;
        if (!reqId) {
            deepLinkAppliedRef.current = true;
            onDeepLinkHandled?.();
            return;
        }

        const req = requirements.find((r) => Number(r.RequirementID) === reqId);
        if (!req) {
            deepLinkAppliedRef.current = true;
            onDeepLinkHandled?.();
            return;
        }

        if (deepLink.openSubmission) {
            const usersForReq = assignedUsersMap[reqId] || [];
            setSelectedSubmissionRequirement(req);
            setSubmissionViewerUsers(usersForReq);
            setShowSubmissionViewer(true);

            if (deepLink.viewUserId) {
                const targetUser = usersForReq.find((u) => Number(u.UserID) === Number(deepLink.viewUserId));
                if (targetUser) {
                    setTimeout(() => {
                        handleViewUserFile(targetUser, reqId);
                    }, 450);
                }
            }
        }

        deepLinkAppliedRef.current = true;
        onDeepLinkHandled?.();
    }, [isOpen, deepLink, loading, requirements, assignedUsersMap, onDeepLinkHandled]);

    const handleDownloadUserFile = async (user, requirementId) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/requirements/${requirementId}/user-file/${user.UserID}`);
            if (!(res.data && res.data.success && res.data.file && res.data.file.url)) {
                await showAlert('No file found for this user.');
                return;
            }

            const fileMeta = res.data.file;
            const fileUrl = fileMeta.url;
            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const fetchRes = await fetch(fileUrl, { headers });
            if (!fetchRes.ok) throw new Error('Failed to download file');
            const blob = await fetchRes.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = fileMeta.fileName || fileMeta.fileName || 'download';
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 2000);
        } catch (err) {
            console.error('Download error:', err);
            await showAlert(err?.message || 'Failed to download file');
        }
    };

    const handleSendNotificationToUser = async (user, requirementId) => {
        if (!currentUser) return;
        setSendingNotification(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_BASE_URL}/api/notifications/create`, {
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
            await showAlert(`Notification sent to ${user.FirstName} ${user.LastName}`);
        } catch (err) {
            console.error('Error sending notification:', err);
            await showAlert('Failed to send notification');
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

    useEffect(() => {
        if (!showDocViewer || !proofFileUrl) return;
        if (!/\.(xlsx|xls)$/i.test(proofFileUrl)) return;
        handleExcelPreview(proofFileUrl);
    }, [showDocViewer, proofFileUrl]);

    useEffect(() => {
        const fileUrl = selectedUserFile?.url;
        if (!showUserFileViewer || !fileUrl) return;
        if (!/\.(xlsx|xls)$/i.test(fileUrl)) return;
        handleExcelPreview(fileUrl);
    }, [showUserFileViewer, selectedUserFile]);

    useEffect(() => {
        const renderProofDocx = async () => {
            if (!showDocViewer || !proofFileUrl || !/\.docx$/i.test(proofFileUrl)) return;
            if (!docxPreviewRef.current) return;

            setDocxPreviewLoading(true);
            setDocxPreviewError(null);

            try {
                const token = localStorage.getItem('token');
                const headers = token ? { Authorization: `Bearer ${token}` } : {};
                const response = await fetch(proofFileUrl, { headers });
                if (!response.ok) {
                    throw new Error(`Failed to load DOCX (HTTP ${response.status})`);
                }
                const arrayBuffer = await response.arrayBuffer();
                const container = docxPreviewRef.current;
                if (!container) return;
                container.innerHTML = '';
                await renderAsync(arrayBuffer, container, undefined, {
                    className: 'docx-preview-container',
                    inWrapper: true,
                });
            } catch (error) {
                console.error('DOCX preview error:', error);
                setDocxPreviewError(error?.message || 'Failed to preview DOCX file');
            } finally {
                setDocxPreviewLoading(false);
            }
        };

        renderProofDocx();
    }, [showDocViewer, proofFileUrl]);

    useEffect(() => {
        const fileUrl = selectedUserFile?.url;

        const renderUserDocx = async () => {
            if (!showUserFileViewer || !fileUrl || !/\.docx$/i.test(fileUrl)) return;
            if (!userDocxPreviewRef.current) return;

            setUserDocxPreviewLoading(true);
            setUserDocxPreviewError(null);

            try {
                const token = localStorage.getItem('token');
                const headers = token ? { Authorization: `Bearer ${token}` } : {};
                const response = await fetch(fileUrl, { headers });
                if (!response.ok) {
                    throw new Error(`Failed to load DOCX (HTTP ${response.status})`);
                }
                const arrayBuffer = await response.arrayBuffer();
                const container = userDocxPreviewRef.current;
                if (!container) return;
                container.innerHTML = '';
                await renderAsync(arrayBuffer, container, undefined, {
                    className: 'docx-preview-container',
                    inWrapper: true,
                });
            } catch (error) {
                console.error('User DOCX preview error:', error);
                setUserDocxPreviewError(error?.message || 'Failed to preview DOCX file');
            } finally {
                setUserDocxPreviewLoading(false);
            }
        };

        renderUserDocx();
    }, [showUserFileViewer, selectedUserFile]);

    if (!isOpen || !office) return null;

    const overlayLeftStyle = { left: 'var(--sidebar-width, 0px)', transition: 'left 200ms ease-in-out' };

    const assignedRequirementCount = requirements.filter((req) => isUserAssignedToRequirement(req.RequirementID)).length;
    const isAssignedInCurrentOffice = assignedRequirementCount > 0;

    return (
        <div
            className="fixed inset-y-0 right-0 left-0 z-[120] flex bg-slate-900/55 backdrop-blur-[2px] lg:left-[var(--sidebar-width)] lg:transition-[left] lg:duration-200 lg:ease-in-out"
            style={{ left: 'var(--sidebar-width, 0px)', transition: 'left 200ms ease-in-out' }}
            onClick={onClose}
        >
            <div className="flex h-full w-full flex-col bg-app-muted shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <ModalHeader
                    officeData={officeData}
                    isAdmin={isAdmin}
                    showMenu={showMenu}
                    setShowMenu={setShowMenu}
                    onEditOffice={onEditOffice}
                    onAddRequirements={onAddRequirements}
                    onDeleteOffice={onDeleteOffice}
                    onClose={onClose}
                    office={office}
                />

                <OfficeInfoBar
                    officeData={officeData}
                    isAssignedInCurrentOffice={isAssignedInCurrentOffice}
                    assignedRequirementCount={assignedRequirementCount}
                />

                <RequirementsToolbar
                    showStatusDropdown={showStatusDropdown}
                    setShowStatusDropdown={setShowStatusDropdown}
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                />

                {/* Requirements List */}
                <RequirementsTree
                    loading={loading}
                    requirements={requirements}
                    searchTerm={searchTerm}
                    statusFilter={statusFilter}
                    isAdmin={isAdmin}
                    isOfficeHead={isOfficeHead}
                    assignedUsersMap={assignedUsersMap}
                    expandedReqs={expandedReqs}
                    toggleExpandReq={toggleExpandReq}
                    isUserAssignedToRequirement={isUserAssignedToRequirement}
                    editingCommentId={editingCommentId}
                    commentInput={commentInput}
                    savingComment={savingComment}
                    handleCommentInputChange={handleCommentInputChange}
                    handleCommentSave={handleCommentSave}
                    handleCommentClear={handleCommentClear}
                    handleCommentCancel={handleCommentCancel}
                    handleCommentClick={handleCommentClick}
                    handleStatusChange={handleStatusChange}
                    currentUser={currentUser}
                    userUploadingReqId={userUploadingReqId}
                    handleUserReqFileUpload={handleUserReqFileUpload}
                    hasUserUploadedForRequirement={hasUserUploadedForRequirement}
                    handleViewUserFile={handleViewUserFile}
                    handleDownloadUserFile={handleDownloadUserFile}
                    handleUnsubmitUserFile={handleUnsubmitUserFile}
                    unsubmittingReqId={unsubmittingReqId}
                    removingReqId={removingReqId}
                    handleRemoveRequirement={handleRemoveRequirement}
                    handleUserAvatarClick={handleUserAvatarClick}
                    onViewSubmission={(req) => {
                        setSelectedSubmissionRequirement(req);
                        setSubmissionViewerUsers(assignedUsersMap?.[req.RequirementID] || []);
                        setShowSubmissionViewer(true);
                    }}
                    onViewMySubmission={(req) => {
                        if (!currentUser) return;
                        const reqId = req?.RequirementID;
                        if (!reqId) return;
                        const userFromMap = (assignedUsersMap?.[reqId] || []).find((u) => u?.UserID === currentUser.UserID);
                        const hasUploaded = hasUserUploadedForRequirement(reqId);
                        const userEntry = userFromMap ? { ...userFromMap, HasUploaded: hasUploaded } : { ...currentUser, HasUploaded: hasUploaded };
                        setSelectedSubmissionRequirement(req);
                        setSubmissionViewerUsers([userEntry]);
                        setShowSubmissionViewer(true);
                    }}
                />

                <ProofFooterBar
                    isAdmin={isAdmin}
                    proofFileUrl={proofFileUrl}
                    fileInputRef={fileInputRef}
                    handleProofFileChange={handleProofFileChange}
                    uploadingProof={uploadingProof}
                    showConfirm={showConfirm}
                    showAlert={showAlert}
                    officeId={office.id}
                    fetchOfficeRequirements={fetchOfficeRequirements}
                    unsubmittingProof={unsubmittingProof}
                    setUnsubmittingProof={setUnsubmittingProof}
                    setPersistedProof={setPersistedProof}
                    setProofFileName={setProofFileName}
                    setProofFileUrl={setProofFileUrl}
                    setExcelHtml={setExcelHtml}
                    setExcelPreviewError={setExcelPreviewError}
                    setExcelHtmlLoading={setExcelHtmlLoading}
                    setDocxPreviewError={setDocxPreviewError}
                    setShowDocViewer={setShowDocViewer}
                    onClose={onClose}
                />
            </div>

            {/* Document Viewer Modal - Compact */}
            <ProofDocumentViewerModal
                show={!!(proofFileUrl && showDocViewer)}
                leftStyle={overlayLeftStyle}
                proofFileUrl={proofFileUrl}
                proofFileName={proofFileName}
                excelHtml={excelHtml}
                excelHtmlLoading={excelHtmlLoading}
                excelPreviewError={excelPreviewError}
                handleExcelPreview={handleExcelPreview}
                docxPreviewRef={docxPreviewRef}
                docxPreviewLoading={docxPreviewLoading}
                docxPreviewError={docxPreviewError}
                onClose={() => {
                    setShowDocViewer(false);
                    setExcelHtml(null);
                    setExcelPreviewError(null);
                    setDocxPreviewError(null);
                }}
            />

            {/* Assign User Modal */}


            {/* User File Preview Modal - Compact */}
            <UserFileViewerModal
                show={!!(showUserFileViewer && selectedUserFile)}
                leftStyle={overlayLeftStyle}
                selectedUserFile={selectedUserFile}
                excelHtml={excelHtml}
                excelHtmlLoading={excelHtmlLoading}
                excelPreviewError={excelPreviewError}
                handleExcelPreview={handleExcelPreview}
                userDocxPreviewRef={userDocxPreviewRef}
                userDocxPreviewLoading={userDocxPreviewLoading}
                userDocxPreviewError={userDocxPreviewError}
                onClose={() => {
                    setShowUserFileViewer(false);
                    setExcelHtml(null);
                    setExcelPreviewError(null);
                    setUserDocxPreviewError(null);
                }}
            />

            {/* Avatar Popup Menu - rendered as fixed overlay via portal */}
            <AvatarPopupMenu
                isAdmin={isAdmin}
                avatarPopup={avatarPopup}
                onClose={() => setAvatarPopup(null)}
                onViewUserFile={handleViewUserFile}
                onDownloadUserFile={handleDownloadUserFile}
                onOpenNotifForm={openNotifForm}
            />

            {/* Send Notification Form Modal */}
            <SendNotificationModal
                show={!!showNotifForm}
                leftStyle={overlayLeftStyle}
                showNotifForm={showNotifForm}
                notifTitle={notifTitle}
                setNotifTitle={setNotifTitle}
                notifMessage={notifMessage}
                setNotifMessage={setNotifMessage}
                sendingNotification={sendingNotification}
                onClose={() => {
                    setShowNotifForm(null);
                    setNotifTitle('');
                    setNotifMessage('');
                }}
                onSend={() => handleSendNotificationToUser(showNotifForm.user, showNotifForm.requirementId)}
            />

            <SubmissionViewer
                show={showSubmissionViewer}
                leftStyle={overlayLeftStyle}
                requirement={selectedSubmissionRequirement}
                users={
                    isOfficeHead && selectedSubmissionRequirement && currentUser
                        ? (() => {
                            const reqId = selectedSubmissionRequirement.RequirementID;
                            const userFromMap = (assignedUsersMap?.[reqId] || []).find((u) => u.UserID === currentUser.UserID);
                            const hasUploaded = hasUserUploadedForRequirement(reqId);
                            const entry = userFromMap
                                ? { ...userFromMap, HasUploaded: hasUploaded }
                                : { ...currentUser, HasUploaded: hasUploaded };
                            return [entry];
                        })()
                        : (submissionViewerUsers || (selectedSubmissionRequirement ? (assignedUsersMap?.[selectedSubmissionRequirement.RequirementID] || []) : []))
                }
                officeId={office?.id}
                currentUser={currentUser}
                showPrivateComments={!!(isAdmin || isOfficeHead)}
                canEditPrivateComments={!!isAdmin}
                allowWorkActions={!!isAdmin}
                viewerRoleId={currentRoleId}
                onFileUpload={handleUserReqFileUpload}
                onFileUnsubmit={handleUnsubmitUserFile}
                uploadingFile={userUploadingReqId === selectedSubmissionRequirement?.RequirementID}
                unsubmittingFile={unsubmittingReqId === selectedSubmissionRequirement?.RequirementID}
                onViewUserFile={handleViewUserFile}
                onCommentSaved={async (newComment) => {
                    setSelectedSubmissionRequirement((prev) => (prev ? { ...prev, comments: newComment } : prev));
                    try {
                        await fetchOfficeRequirements();
                    } catch (e) {
                        // ignore
                    }
                }}
                onClose={() => {
                    setShowSubmissionViewer(false);
                    setSelectedSubmissionRequirement(null);
                    setSubmissionViewerUsers(null);
                }}
            />
        </div>
    );
}
