import React, { useState, useEffect, useMemo } from 'react';
import { Search, GraduationCap, Building2, User, UserCheck, X, ChevronDown, ChevronUp, Send, Upload, Download, Eye, Trash2, CheckCircle2, AlertCircle, FileText, Loader2 } from 'lucide-react';
import StatusSlider from './StatusSlider';
import { officesAPI, requirementsAPI } from '../../utils/api';
import { useModal } from '../UI/ModalProvider';

export default function OfficeInspectionModal({
  office,
  onClose,
  onUpdateOffice,
  currentUser,
  isAdmin = false
}) {
  const { showAlert } = useModal();
  const officeId = office?.OfficeID || office?.id;

  const [loading, setLoading] = useState(true);
  const [hierarchy, setHierarchy] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedReqs, setExpandedReqs] = useState(new Set());
  const [commentsMap, setCommentsMap] = useState({});
  const [updatingReqId, setUpdatingReqId] = useState(null);
  const [proofDocument, setProofDocument] = useState(null);
  const [uploadingProof, setUploadingProof] = useState(false);

  // Fetch requirement compliance hierarchy for this office
  const fetchRequirements = async () => {
    if (!officeId) return;
    try {
      setLoading(true);
      const res = await officesAPI.getOfficeRequirements(officeId);
      const data = res?.data || res || [];

      setHierarchy(Array.isArray(data) ? data : []);

      // Build comments map
      const initialComments = {};
      (Array.isArray(data) ? data : []).forEach(area => {
        (area.criteria || area.Criteria || []).forEach(crit => {
          (crit.requirements || crit.Requirements || []).forEach(req => {
            const reqId = req.RequirementID || req.id;
            initialComments[reqId] = req.comments || req.Comments || '';
          });
        });
      });
      setCommentsMap(initialComments);

      // Fetch proof document if any
      try {
        const proofRes = await officesAPI.getOfficeProofDocuments(officeId);
        if (proofRes?.data && proofRes.data.length > 0) {
          setProofDocument(proofRes.data[0]);
        }
      } catch (proofErr) {
        // Proof document API call best effort
      }
    } catch (err) {
      console.error('Failed to load office requirements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, [officeId]);

  // Compute overall compliance score
  const complianceStats = useMemo(() => {
    let total = 0;
    let complied = 0;
    let partial = 0;

    hierarchy.forEach(area => {
      (area.criteria || area.Criteria || []).forEach(crit => {
        (crit.requirements || crit.Requirements || []).forEach(req => {
          total += 1;
          const status = Number(req.Status || req.status || 3);
          if (status === 5) complied += 1;
          else if (status === 4) partial += 0.5;
        });
      });
    });

    const scorePct = total > 0 ? Math.round(((complied + partial) / total) * 100 * 10) / 10 : 0;
    return {
      total,
      scorePct,
      label: scorePct >= 100 ? 'Complied' : scorePct > 0 ? 'Partial' : 'Not Complied'
    };
  }, [hierarchy]);

  // Update compliance status for a requirement
  const handleStatusChange = async (reqId, nextStatusId) => {
    try {
      setUpdatingReqId(reqId);
      const currentComment = commentsMap[reqId] || '';

      const res = await officesAPI.updateRequirementStatus(officeId, reqId, {
        statusId: nextStatusId,
        comments: currentComment
      });

      if (res?.success) {
        if (showAlert) {
          showAlert({
            title: 'Compliance Status Updated',
            message: 'Requirement status updated successfully.',
            type: 'success'
          });
        }
        await fetchRequirements();
        if (onUpdateOffice) onUpdateOffice();
      } else {
        if (showAlert) {
          showAlert({
            title: 'Update Failed',
            message: res?.message || 'Failed to update compliance status.',
            type: 'error'
          });
        }
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      if (showAlert) {
        showAlert({
          title: 'Update Error',
          message: err.response?.data?.message || err.message || 'Error updating status',
          type: 'error'
        });
      }
    } finally {
      setUpdatingReqId(null);
    }
  };

  // Submit private comment
  const handleSendComment = async (reqId) => {
    const commentText = commentsMap[reqId] || '';
    if (!commentText.trim()) return;

    try {
      setUpdatingReqId(reqId);
      // Fetch current status
      let currentStatus = 3;
      hierarchy.forEach(area => {
        (area.criteria || []).forEach(crit => {
          (crit.requirements || []).forEach(req => {
            if (Number(req.RequirementID || req.id) === Number(reqId)) {
              currentStatus = Number(req.Status || req.status || 3);
            }
          });
        });
      });

      await officesAPI.updateRequirementStatus(officeId, reqId, {
        statusId: currentStatus,
        comments: commentText
      });

      if (showAlert) {
        showAlert({
          title: 'Comment Saved',
          message: 'Private comment updated successfully.',
          type: 'success'
        });
      }
      await fetchRequirements();
    } catch (err) {
      console.error('Failed to save comment:', err);
    } finally {
      setUpdatingReqId(null);
    }
  };

  const toggleExpand = (reqId) => {
    setExpandedReqs(prev => {
      const next = new Set(prev);
      if (next.has(reqId)) next.delete(reqId);
      else next.add(reqId);
      return next;
    });
  };

  // Proof Document Upload Handler
  const handleProofUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingProof(true);
      const formData = new FormData();
      formData.append('document', file);
      formData.append('office_id', officeId);

      const res = await officesAPI.uploadProofDocument(formData);
      if (res?.success) {
        if (showAlert) {
          showAlert({
            title: 'Proof Document Uploaded',
            message: 'Proof document attached successfully.',
            type: 'success'
          });
        }
        await fetchRequirements();
      }
    } catch (err) {
      console.error('Failed to upload proof document:', err);
    } finally {
      setUploadingProof(false);
    }
  };

  const isAcademic = office?.entity_type_id === 1 || 
    String(office?.category_name || office?.TypeName || office?.office_type || '').toLowerCase().includes('academic') ||
    String(office?.category_name || office?.TypeName || office?.office_type || '').toLowerCase().includes('program');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
      <div className="w-full max-w-6xl max-h-[92vh] flex flex-col bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header Bar (Photo 4 Top Bar) */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-4">
            <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 border shadow-2xs ${
              isAcademic ? 'bg-cyan-50 text-cyan-600 border-cyan-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
            }`}>
              {isAcademic ? <GraduationCap className="h-6 w-6" /> : <Building2 className="h-6 w-6" />}
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  {office?.OfficeName || office?.office_name || 'BSIT'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                  {isAcademic ? 'Academic' : 'Office'}
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                  Event: {office?.event_name || office?.EventName || 'PAASCU-COPY'}
                </span>
              </div>
            </div>
          </div>

          {/* Personnel & External Auditor Badges */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 text-xs border-r border-slate-200 pr-6">
              {/* Personnel */}
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <span className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400">PERSONNEL</span>
                  <span className="font-bold text-slate-800">
                    {office?.head_name || office?.HeadName || 'Lenuel'}
                  </span>
                </div>
              </div>

              {/* External Auditor */}
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div>
                  <span className="block text-[9px] font-extrabold uppercase tracking-wider text-blue-600">EXTERNAL AUDITOR</span>
                  <span className="font-bold text-slate-900">
                    {office?.auditor_name || 'VJ JAVELLANA'}
                  </span>
                </div>
              </div>
            </div>

            {/* Score Pill */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400">COMPLIANCE</span>
                <span className="text-lg font-black text-rose-600 font-mono">
                  {complianceStats.scorePct}%
                </span>
              </div>

              <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                complianceStats.scorePct >= 100 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : complianceStats.scorePct > 0 
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                {complianceStats.label}
              </span>

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 flex items-center justify-center transition-colors ml-2"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Requirements Toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">Requirements</h2>
            <p className="text-xs text-slate-500">Browse areas, criteria, and compliance items.</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
            >
              <option value="all">All statuses</option>
              <option value="complied">Complied</option>
              <option value="partial">Partially Complied</option>
              <option value="not">Not Complied</option>
            </select>

            {/* Search Box */}
            <div className="relative w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search requirements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Requirement Tree Content */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50/50">
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2 text-xs font-semibold">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <span>Loading requirement compliance hierarchy...</span>
            </div>
          ) : hierarchy.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
              No requirement structure assigned to this office yet.
            </div>
          ) : (
            hierarchy.map((area) => {
              const areaId = area.AreaID || area.id;
              const criteriaList = area.criteria || area.Criteria || [];

              return (
                <div key={areaId} className="space-y-4">
                  {/* Area Header Banner */}
                  <div className="bg-blue-600 text-white rounded-xl p-4 shadow-xs">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-blue-200">
                      {area.AreaCode || area.code ? `AREA ${area.AreaCode || area.code}` : 'AREA'}
                    </h3>
                    <h2 className="text-base font-black text-white mt-0.5">
                      {area.AreaName || area.name || 'Philosophy and Objectives'}
                    </h2>
                  </div>

                  {/* Criteria & Requirements Cards */}
                  {criteriaList.map((crit) => {
                    const critId = crit.CriteriaID || crit.id;
                    const reqs = crit.requirements || crit.Requirements || [];

                    return (
                      <div key={critId} className="space-y-3 pl-1">
                        {/* Criteria Header */}
                        <div className="bg-slate-800 text-white rounded-xl p-3.5 shadow-2xs">
                          <h4 className="text-xs font-bold text-slate-200">
                            {crit.CriteriaCode || crit.code ? `${crit.CriteriaCode || crit.code}` : ''}
                          </h4>
                          <p className="text-xs font-semibold text-white mt-0.5">
                            {crit.CriteriaName || crit.name || ''}
                          </p>
                        </div>

                        {/* Requirements Items */}
                        <div className="space-y-3">
                          {reqs.map((req) => {
                            const reqId = req.RequirementID || req.id;
                            const statusId = Number(req.Status || req.status || 3);
                            const isExpanded = expandedReqs.has(reqId);
                            const isUpdating = updatingReqId === reqId;

                            // Filter check
                            if (statusFilter === 'complied' && statusId !== 5) return null;
                            if (statusFilter === 'partial' && statusId !== 4) return null;
                            if (statusFilter === 'not' && statusId !== 3) return null;

                            const q = searchTerm.trim().toLowerCase();
                            if (q) {
                              const desc = String(req.Description || req.description || '').toLowerCase();
                              const code = String(req.RequirementCode || req.code || '').toLowerCase();
                              if (!desc.includes(q) && !code.includes(q)) return null;
                            }

                            return (
                              <div
                                key={reqId}
                                className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-slate-300 transition-all flex flex-col md:flex-row gap-5 items-start justify-between"
                              >
                                {/* Left: Status Slider (Photo 4) */}
                                <div className="shrink-0 pt-0.5">
                                  <StatusSlider
                                    statusId={statusId}
                                    onChange={(nextVal) => handleStatusChange(reqId, nextVal)}
                                    updating={isUpdating}
                                  />
                                </div>

                                {/* Center: Description & Comments */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-extrabold text-slate-900">
                                      {req.RequirementCode || req.code || `Requirement #${reqId}`}
                                    </span>
                                  </div>

                                  <p className={`text-xs text-slate-600 mt-1 leading-relaxed ${!isExpanded ? 'line-clamp-2' : ''}`}>
                                    {req.Description || req.description || ''}
                                  </p>

                                  <button
                                    type="button"
                                    onClick={() => toggleExpand(reqId)}
                                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 mt-1 inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <span>{isExpanded ? 'Show less' : 'Show more'}</span>
                                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                  </button>

                                  {/* Private Comment Box */}
                                  <div className="mt-3 flex items-center gap-2">
                                    <input
                                      type="text"
                                      placeholder="Add private comment..."
                                      value={commentsMap[reqId] || ''}
                                      onChange={(e) => setCommentsMap({ ...commentsMap, [reqId]: e.target.value })}
                                      onKeyDown={(e) => { if (e.key === 'Enter') handleSendComment(reqId); }}
                                      className="flex-1 pl-3.5 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 outline-none"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleSendComment(reqId)}
                                      className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg border border-blue-200 transition-colors"
                                      title="Save private comment"
                                    >
                                      <Send className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Right: Evidence Badge & Personnel */}
                                <div className="shrink-0 flex flex-col items-end gap-2 text-right">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Uploaded {req.uploadedCount || '2/2'}
                                  </span>

                                  <div className="flex items-center -space-x-1.5">
                                    <div className="h-7 w-7 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-emerald-700 text-xs font-bold">
                                      <UserCheck className="h-3.5 w-3.5" />
                                    </div>
                                    <div className="h-7 w-7 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-blue-700 text-xs font-bold">
                                      <User className="h-3.5 w-3.5" />
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-600 hover:bg-rose-100 text-[10px] font-bold border border-rose-200 transition-colors"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Proof Document Toolbar (Photo 4 Footer) */}
        <div className="bg-white border-t border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-900">PROOF DOCUMENT</span>
            <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
              proofDocument ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              {proofDocument ? 'Uploaded' : 'No Document Attached'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <label className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer">
              <Upload className="h-3.5 w-3.5" />
              <span>Upload</span>
              <input type="file" onChange={handleProofUpload} className="hidden" />
            </label>

            {proofDocument && (
              <>
                <a
                  href={proofDocument.file_path}
                  download
                  className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 transition-colors flex items-center gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download</span>
                </a>

                <a
                  href={proofDocument.file_path}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 transition-colors flex items-center gap-1.5"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Preview</span>
                </a>
              </>
            )}

            <button
              type="button"
              className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold border border-rose-200 transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Remove</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
