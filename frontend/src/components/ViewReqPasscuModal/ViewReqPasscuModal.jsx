
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

export default function ViewReqPASSCUModal({ isOpen, onClose, office, onEditOffice, onAddRequirements }) {
    const [showMenu, setShowMenu] = useState(false);
    const [requirements, setRequirements] = useState([]);
    const [loading, setLoading] = useState(false);
    const [officeData, setOfficeData] = useState(office);
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [commentInput, setCommentInput] = useState("");
    const [savingComment, setSavingComment] = useState(false);
    // File upload state for proof document
    const [proofFile, setProofFile] = useState(null);
    const [uploadingProof, setUploadingProof] = useState(false);
    const [proofFileName, setProofFileName] = useState("");
    const [proofFileUrl, setProofFileUrl] = useState("");
    // Persisted proof document info
    const [persistedProof, setPersistedProof] = useState(null);
    // State for document viewer modal
    const [showDocViewer, setShowDocViewer] = useState(false);
    const fileInputRef = useRef();
    // State for SheetJS preview
    const [excelHtml, setExcelHtml] = useState(null);
    // Handle file selection
    const handleProofFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setProofFile(e.target.files[0]);
            setProofFileName(e.target.files[0].name);//
            setProofFileUrl("");
        }
    };

    // Handle file upload (new endpoint)
    const handleProofUpload = async () => {
        if (!proofFile) return;
        setUploadingProof(true);
        const formData = new FormData();
        formData.append('file', proofFile);
        try {
            const res = await fetch(`http://localhost:5000/api/officedocuments/${office.id}/proof`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success && data.url) {
                setProofFileUrl(`http://localhost:5000${data.url}`);
                setProofFileName(data.filename);
                setPersistedProof({ fileName: data.filename, url: `http://localhost:5000${data.url}` });
                alert('Proof document uploaded!');
            } else {
                alert(data.message || 'Failed to upload proof document');
            }
            setProofFile(null);
        } catch (err) {
            alert('Failed to upload proof document');
        } finally {
            setUploadingProof(false);
        }
    };


    // Fetch persisted proof document when modal opens
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
            setRequirements(response.data.data || []);
            
            // Also refresh the office data to get updated compliance stats
            const officeResponse = await axios.get(`http://localhost:5000/api/offices/${office.id}`);
            if (officeResponse.data) {
                setOfficeData(prev => ({
                    ...prev,
                    overall_status: officeResponse.data.OverallStatus,
                    compliance_percent: officeResponse.data.CompliancePercent,
                    total_requirements: officeResponse.data.TotalRequirements
                }));
            }
        } catch (error) {
            console.error('Error fetching requirements:', error);
            setRequirements([]);
        } finally {
            setLoading(false);
        }
    };

    // Handle status change for a requirement
    const handleStatusChange = async (reqId, newStatusId) => {
        try {
            await axios.put(`http://localhost:5000/api/offices/${office.id}/requirements/${reqId}/status`, {
                statusId: newStatusId
            });
            // Update local state
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
            // Refresh office data to update compliance percentage
            const officeResponse = await axios.get(`http://localhost:5000/api/offices/${office.id}`);
            if (officeResponse.data) {
                setOfficeData(prev => ({
                    ...prev,
                    overall_status: officeResponse.data.OverallStatus,
                    compliance_percent: officeResponse.data.CompliancePercent,
                    total_requirements: officeResponse.data.TotalRequirements
                }));
            }
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update compliance status');
        }
    };

    // Handle comment box click
    const handleCommentClick = (req) => {
        setEditingCommentId(req.RequirementID);
        setCommentInput(req.comments || "");
    };

    // Handle comment input change (auto-expand textarea)
    const handleCommentInputChange = (e) => {
        setCommentInput(e.target.value);
    };

    // Save comment to backend
    const handleCommentSave = async (req) => {
        setSavingComment(true);
        try {
            await axios.put(`http://localhost:5000/api/offices/${office.id}/requirements/${req.RequirementID}/status`, {
                statusId: req.ComplianceStatusID || 3, // keep current status
                comments: commentInput
            });
            // Re-fetch requirements to ensure latest data from DB
            await fetchOfficeRequirements();
            setEditingCommentId(null);
        } catch (error) {
            alert('Failed to save comment');
        } finally {
            setSavingComment(false);
        }
    };

    // Cancel editing
    const handleCommentCancel = () => {
        setEditingCommentId(null);
        setCommentInput("");
    };


    // Function to fetch and render Excel file as HTML using SheetJS
    const handleExcelPreview = async () => {
        setExcelHtml('<div style="padding:1em;">Loading...</div>');
        try {
            const response = await fetch(proofFileUrl);
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            let html = '';
            workbook.SheetNames.forEach((sheetName) => {
                const worksheet = workbook.Sheets[sheetName];
                html += `<h4 style='margin-top:1em;'>${sheetName}</h4>`;
                html += XLSX.utils.sheet_to_html(worksheet);
            });
            setExcelHtml(html);
        } catch (err) {
            setExcelHtml('<div style="color:red;">Failed to preview Excel file.</div>');
        }
    };

    if (!isOpen || !office) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl ml-64 h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-3 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-lg font-bold">{officeData.office_name}</h2>
                                <p className="text-xs text-blue-100">{officeData.office_type_name}</p>
                            </div>
                        </div>

                        {/* 3-Dots Menu and Close Button */}
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <button
                                    onClick={() => setShowMenu(!showMenu)}
                                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                    </svg>
                                </button>

                                {/* Dropdown Menu */}
                                {showMenu && (
                                    <div className="absolute right-0 top-12 bg-white rounded-lg shadow-xl border border-gray-200 py-2 w-56 z-10">
                                        <button
                                            onClick={() => {
                                                setShowMenu(false);
                                                onEditOffice(office);
                                            }}
                                            className="w-full px-4 py-2 text-left text-gray-700 hover:bg-blue-50 flex items-center gap-3"
                                        >
                                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            <span className="text-sm font-medium">Edit Office Info</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowMenu(false);
                                                onAddRequirements(office);
                                            }}
                                            className="w-full px-4 py-2 text-left text-gray-700 hover:bg-green-50 flex items-center gap-3"
                                        >
                                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                            <span className="text-sm font-medium">Add Requirements</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={onClose}
                                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Office Info */}
                    <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <img
                                src={officeData.head_profile_pic 
                                    ? `http://localhost:5000/uploads/profile-pics/${officeData.head_profile_pic}`
                                    : '/src/assets/images/user.svg'}
                                alt={officeData.head_name}
                                className="w-10 h-10 rounded-full object-cover border-2 border-blue-200"
                            />
                            <div>
                                <p className="text-xs text-gray-500">Office Head</p>
                                <p className="font-semibold text-sm text-gray-800">{officeData.head_name}</p>
                            </div>
                        </div>

                        {/* Overall Status and Compliance Percentage */}
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-xs text-gray-500">Compliance</p>
                                <p className="font-bold text-lg text-gray-800">
                                    {officeData.compliance_percent ? Number(officeData.compliance_percent).toFixed(1) : '0.0'}%
                                </p>
                            </div>
                            <span className={`px-3 py-1.5 text-xs font-bold rounded-lg inline-flex items-center gap-1.5 ${
                                officeData.overall_status === 'Complied' ? 'bg-green-100 text-green-800 border border-green-300' :
                                officeData.overall_status === 'Partially Complied' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                                'bg-red-100 text-red-800 border border-red-300'
                            }`}>
                                <div className={`w-2 h-2 rounded-full ${
                                    officeData.overall_status === 'Complied' ? 'bg-green-600' :
                                    officeData.overall_status === 'Partially Complied' ? 'bg-yellow-600' :
                                    'bg-red-600'
                                }`}></div>
                                {officeData.overall_status || 'Not Complied'}
                            </span>
                        </div>
                    </div>

                    {/* Requirements List */}
                    <div className="flex-1 overflow-y-auto px-6 py-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Requirements</h3>
                        
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            </div>
                        ) : requirements.length === 0 ? (
                            <div className="text-center py-12">
                                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-gray-500 font-medium">No requirements assigned yet</p>
                                <p className="text-sm text-gray-400 mt-1">Click "Add Requirements" to get started</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {(() => {
                                    // Group requirements by Area (always), use 'No Area' if missing
                                    const groupedByArea = requirements.reduce((areaGroups, req) => {
                                        const areaKey = req.AreaCode || 'No Area';
                                        if (!areaGroups[areaKey]) {
                                            areaGroups[areaKey] = {
                                                name: req.AreaName || (req.AreaCode ? 'Uncategorized' : 'No Area'),
                                                code: req.AreaCode || 'No Area',
                                                criteriaGroups: {}
                                            };
                                        }
                                        // Group by criteria within this area
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

                                    return Object.entries(groupedByArea).map(([areaKey, area]) => (
                                        <div key={areaKey} className="mb-8">
                                            {/* Area Header */}
                                            <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-5 py-4 rounded-lg shadow-lg mb-4">
                                                <h2 className="text-xl font-bold">{area.code}</h2>
                                                <p className="text-sm text-purple-100 mt-1">{area.name}</p>
                                            </div>

                                            {/* Criteria groups within this area */}
                                            <div className="ml-4 space-y-4">
                                                {Object.entries(area.criteriaGroups).map(([criteriaKey, criteria]) => (
                                                    <div key={criteriaKey} className="mb-4">
                                                        {/* Criteria Header */}
                                                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-4 py-3 rounded-t-lg shadow-md">
                                                            <h3 className="text-lg font-bold">{criteria.code}</h3>
                                                            <p className="text-sm text-indigo-100">{criteria.name}</p>
                                                        </div>

                                                        {/* Requirements under this criteria */}
                                                        <div className="border-l-4 border-r border-b border-indigo-200 rounded-b-lg bg-white shadow-sm">
                                                            {criteria.requirements.map((req, index) => (
                                                                <div 
                                                                    key={req.RequirementID} 
                                                                    className={`p-3 hover:bg-gray-50 transition-all ${
                                                                        index !== criteria.requirements.length - 1 ? 'border-b border-gray-200' : ''
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-2 min-h-0 py-1">
                                                                        {/* Status Checkboxes - now horizontal */}
                                                                        <div className="flex flex-row gap-3 items-center">
                                                                            {/* Complied */}
                                                                            <label className="flex items-center gap-1 cursor-pointer group">
                                                                                <input
                                                                                    type="radio"
                                                                                    name={`status-${req.RequirementID}`}
                                                                                    checked={req.ComplianceStatusID === 5}
                                                                                    onChange={() => handleStatusChange(req.RequirementID, 5)}
                                                                                    className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500 accent-green-600"
                                                                                />
                                                                                <span className="text-xs font-medium text-green-700 group-hover:text-green-800">Complied</span>
                                                                            </label>
                                                                            {/* Partially Complied */}
                                                                            <label className="flex items-center gap-1 cursor-pointer group">
                                                                                <input
                                                                                    type="radio"
                                                                                    name={`status-${req.RequirementID}`}
                                                                                    checked={req.ComplianceStatusID === 4}
                                                                                    onChange={() => handleStatusChange(req.RequirementID, 4)}
                                                                                    className="w-4 h-4 text-yellow-600 border-gray-300 focus:ring-yellow-500 accent-yellow-600"
                                                                                />
                                                                                <span className="text-xs font-medium text-yellow-700 group-hover:text-yellow-800">Partially</span>
                                                                            </label>
                                                                            {/* Not Complied */}
                                                                            <label className="flex items-center gap-1 cursor-pointer group">
                                                                                <input
                                                                                    type="radio"
                                                                                    name={`status-${req.RequirementID}`}
                                                                                    checked={req.ComplianceStatusID === 3 || !req.ComplianceStatusID}
                                                                                    onChange={() => handleStatusChange(req.RequirementID, 3)}
                                                                                    className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500 accent-red-600"
                                                                                />
                                                                                <span className="text-xs font-medium text-red-700 group-hover:text-red-800">Not Complied</span>
                                                                            </label>
                                                                        </div>

                                                                        {/* Requirement Details - smaller font and less margin */}
                                                                                                                                                <div className="flex-1 border-l-2 border-gray-200 pl-2">
                                                                                                                                                    <h4 className="font-semibold text-sm text-gray-800 leading-tight">{req.RequirementCode}</h4>
                                                                                                                                                    <p className="text-xs text-gray-600 mt-0.5 leading-snug">{req.Description}</p>
                                                                        {editingCommentId === req.RequirementID ? (
                                                                            <div className="mt-1 text-xs text-blue-700 bg-blue-50 rounded px-2 py-1 border border-blue-200 flex items-start gap-2">
                                                                                <strong className="mt-1">Comment:</strong>
                                                                                <textarea
                                                                                    className="ml-1 flex-1 px-2 py-1 rounded border border-blue-300 text-blue-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 resize-vertical min-h-[80px] max-h-60 font-mono"
                                                                                    value={commentInput}
                                                                                    onChange={handleCommentInputChange}
                                                                                    autoFocus
                                                                                    rows={Math.max(4, commentInput.split('\n').length)}
                                                                                    onKeyDown={e => {
                                                                                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCommentSave(req); }
                                                                                        if (e.key === 'Escape') handleCommentCancel();
                                                                                    }}
                                                                                    placeholder="Enter comment..."
                                                                                    style={{ width: '100%', resize: 'vertical', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                                                                                    wrap="soft"
                                                                                />
                                                                                <div className="flex flex-col gap-1 mt-1">
                                                                                    <button className="text-xs text-green-700 font-bold px-2 py-0.5 hover:underline disabled:opacity-50" onClick={() => handleCommentSave(req)} disabled={savingComment}>{savingComment ? 'Saving...' : 'Save'}</button>
                                                                                    <button className="text-xs text-gray-500 px-2 py-0.5 hover:underline" onClick={handleCommentCancel}>Cancel</button>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <div
                                                                                className="mt-1 text-xs text-blue-700 bg-blue-50 rounded px-2 py-1 border border-blue-200 cursor-pointer hover:bg-blue-100"
                                                                                onClick={() => handleCommentClick(req)}
                                                                                title={req.comments ? req.comments : 'No comment available'}
                                                                                style={{
                                                                                    height: '40px',
                                                                                    maxWidth: '350px',
                                                                                    overflow: 'hidden',
                                                                                    textOverflow: 'ellipsis',
                                                                                    whiteSpace: 'nowrap',
                                                                                    display: 'flex',
                                                                                    minWidth: 0,
                                                                                }}
                                                                            >
                                                                                <strong>Comment:</strong>&nbsp;
                                                                                {req.comments ? (
                                                                                    <span style={{
                                                                                        overflow: 'hidden',
                                                                                        textOverflow: 'ellipsis',
                                                                                        whiteSpace: 'nowrap',
                                                                                        flex: 1,
                                                                                        flexShrink: 1,
                                                                                        display: 'inline-block',
                                                                                    }}>{req.comments}</span>
                                                                                ) : (
                                                                                    <span className="text-gray-400 italic">No comment available</span>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                                                                                                </div>

                                                                        {/* Status Badge - smaller */}
                                                                        <div className="flex-shrink-0">
                                                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${
                                                                                req.ComplianceStatusID === 5 ? 'bg-green-100 text-green-800 border border-green-300' :
                                                                                req.ComplianceStatusID === 4 ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                                                                                'bg-red-100 text-red-800 border border-red-300'
                                                                            }`}>
                                                                                {req.ComplianceStatusID === 5 ? 'Complied' :
                                                                                 req.ComplianceStatusID === 4 ? 'Partially Complied' :
                                                                                 'Not Complied'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
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

                    {/* Footer */}
                    <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex justify-end items-center gap-4 flex-shrink-0">
                        {/* Proof Document Upload (footer, left of Close) */}
                        <div className="flex flex-row items-center gap-2">
                            <label className="text-xs text-gray-500">Proof Document</label>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                onChange={handleProofFileChange}
                                accept=".pdf,.doc,.docx,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            />
                            <button
                                className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200"
                                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                                disabled={uploadingProof}
                            >
                                {proofFileName ? 'Change File' : 'Choose File'}
                            </button>
                            {proofFileName && (
                                <span className="text-xs text-gray-700 max-w-[120px] truncate" title={proofFileName}>{proofFileName}</span>
                            )}
                            <button
                                className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200 disabled:opacity-50"
                                onClick={handleProofUpload}
                                disabled={!proofFile || uploadingProof}
                            >
                                {uploadingProof ? 'Uploading...' : 'Upload'}
                            </button>
                            {proofFileUrl && (
                                <>
                                    <a
                                        href={proofFileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-2 text-xs text-blue-600 underline"
                                        download
                                    >
                                        Download
                                    </a>
                                    <button
                                        className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium hover:bg-yellow-200 border border-yellow-300"
                                        type="button"
                                        onClick={() => setShowDocViewer(true)}
                                    >
                                        Preview
                                    </button>
                                </>
                            )}

                    {/* Document Viewer Modal */}
                    {proofFileUrl && showDocViewer && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60" onClick={() => setShowDocViewer(false)}>
                            <div className="bg-white rounded-lg shadow-2xl p-4 max-w-3xl w-full max-h-[90vh] flex flex-col relative" onClick={e => e.stopPropagation()}>
                                <button className="absolute top-2 right-2 text-gray-600 hover:text-red-600 text-xl font-bold" onClick={() => setShowDocViewer(false)}>&times;</button>
                                <div className="flex-1 overflow-auto flex items-center justify-center">
                                    {proofFileUrl.match(/\.(pdf)$/i) ? (
                                        <iframe src={proofFileUrl} title="Document Preview" className="w-full h-[70vh] border rounded" />
                                    ) : proofFileUrl.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) ? (
                                        <img src={proofFileUrl} alt="Document Preview" className="max-h-[70vh] max-w-full object-contain border rounded" />
                                    ) : proofFileUrl.match(/\.(xlsx|xls)$/i) ? (
                                        excelHtml ? (
                                            <div className="w-full h-[70vh] overflow-auto border rounded bg-white" dangerouslySetInnerHTML={{ __html: excelHtml }} />
                                        ) : (
                                            <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleExcelPreview}>Load Excel Preview</button>
                                        )
                                    ) : proofFileUrl.match(/\.(docx|pptx)$/i) ? (
                                        <iframe src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(proofFileUrl)}`} title="Office Preview" className="w-full h-[70vh] border rounded" />
                                    ) : (
                                        <div className="text-center text-gray-500">Preview not supported for this file type.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                        </div>
                        <button
                            onClick={onClose}
                            className="px-5 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors text-sm"
                        >
                            Close
                        </button>
                    </div>
                </div>
        </div>
    );
}
