import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import StatusBadge from './StatusBadge';
import StatusSlider from './StatusSlider';
import SmartUserAvatar from './SmartUserAvatar';
import { API_BASE_URL } from '../../utils/apiBase';
import { useModal } from '../UI/ModalProvider';

export default function RequirementsTree({
    loading,
    requirements,
    searchTerm,
    statusFilter,
    isAdmin,
    isOfficeHead,
    assignedUsersMap,
    expandedReqs,
    toggleExpandReq,
    isUserAssignedToRequirement,
    isUserAssignedToCurrentOffice = false,
    canUserUploadEvidence = null,
    editingCommentId,
    commentInput,
    savingComment,
    handleCommentInputChange,
    handleCommentSave,
    handleCommentClear,
    handleCommentCancel,
    handleCommentClick,
    handleStatusChange,
    currentUser,
    userUploadingReqId,
    handleUserReqFileUpload,
    hasUserUploadedForRequirement,
    handleViewUserFile,
    handleDownloadUserFile,
    handleUnsubmitUserFile,
    unsubmittingReqId,
    removingReqId,
    handleRemoveRequirement,
    handleUserAvatarClick,
    onViewSubmission,
    onViewMySubmission,
}) {
    const { showAlert } = useModal();
    const commentLabel = isAdmin ? 'Comment' : 'Private comment';

    const [auditorAssignedAreaIds, setAuditorAssignedAreaIds] = useState(new Set());
    // Start with all areas collapsed by default
    const [expandedAreas, setExpandedAreas] = useState(new Set());
    const [collapsedCriteria, setCollapsedCriteria] = useState(new Set());

    const toggleArea = (areaKey) => {
        setExpandedAreas((prev) => {
            const next = new Set(prev);
            if (next.has(areaKey)) next.delete(areaKey);
            else next.add(areaKey);
            return next;
        });
    };

    const toggleCriteria = (critId) => {
        setCollapsedCriteria((prev) => {
            const next = new Set(prev);
            if (next.has(critId)) next.delete(critId);
            else next.add(critId);
            return next;
        });
    };

    const isAuditor = currentUser?.RoleID === 4 ||
        String(currentUser?.RoleName || '').toLowerCase().includes('auditor') ||
        currentUser?.isExternalAuditor;

    useEffect(() => {
        if (!currentUser || !isAuditor) return;
        const targetUserId = currentUser.UserID ?? currentUser.id ?? currentUser.user_id;
        if (!targetUserId) return;
        let mounted = true;
        const fetchAssignments = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_BASE_URL}/api/areas/assignments/${targetUserId}`, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });
                const data = await res.json();
                if (mounted && res.ok && data.success) {
                    const ids = new Set((data.assignments || []).map(a => Number(a.area_id ?? a.AreaID)));
                    setAuditorAssignedAreaIds(ids);
                }
            } catch (e) { }
        };
        fetchAssignments();
        return () => { mounted = false; };
    }, [currentUser, isAuditor]);

    const effectiveRequirements = isAuditor
        ? (requirements || []).filter(req => auditorAssignedAreaIds.has(Number(req.AreaID ?? req.area_id ?? req.areaId)))
        : (requirements || []);

    const totalCount = (requirements || []).length;
    const isAuditorFiltered = isAuditor && totalCount > 0;

    return (
        <div className="flex-1 overflow-y-auto bg-app px-4 py-4 sm:px-5">
            {loading ? (
                <div className="space-y-6 animate-pulse py-2">
                    {[1, 2].map((i) => (
                        <div key={i} className="space-y-4">
                            {/* Skeleton Area Header */}
                            <div className="h-10 w-full rounded-xl bg-slate-200/80" />

                            {/* Skeleton Criteria Header */}
                            <div className="ml-4 h-9 w-[95%] rounded-xl bg-slate-200/50" />

                            {/* Skeleton Requirement Cards */}
                            <div className="ml-8 space-y-3">
                                {[1, 2].map((j) => (
                                    <div key={j} className="border border-slate-200/50 rounded-xl p-4 flex gap-4 bg-white/70">
                                        {/* Status bullet placeholder */}
                                        <div className="w-24 space-y-2.5 shrink-0">
                                            <div className="h-3 w-16 rounded bg-slate-200/80" />
                                            <div className="h-3 w-20 rounded bg-slate-200/50" />
                                            <div className="h-3 w-14 rounded bg-slate-200/50" />
                                        </div>

                                        {/* Details placeholder */}
                                        <div className="flex-1 space-y-2">
                                            <div className="h-3.5 w-12 rounded bg-slate-200/80" />
                                            <div className="h-3 w-full rounded bg-slate-200/50" />
                                            <div className="h-3 w-4/5 rounded bg-slate-200/50" />

                                            {/* Comment input box placeholder */}
                                            <div className="h-8 w-full rounded-lg bg-slate-100/50 mt-3" />
                                        </div>

                                        {/* Action buttons placeholder */}
                                        <div className="w-16 flex flex-col items-end gap-2 shrink-0">
                                            <div className="h-3 w-10 rounded bg-slate-200/80" />
                                            <div className="h-7 w-12 rounded bg-slate-200/50 mt-1" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : effectiveRequirements.length === 0 ? (
                <div className="py-16 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
                        <svg className="h-7 w-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <p className="text-sm font-medium text-slate-700">
                        {isAuditorFiltered ? 'No standards in your assigned area(s)' : 'No standards added yet'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                        {isAuditorFiltered 
                            ? 'Standards exist in this office, but none match your assigned area(s).' 
                            : 'Standards will appear here once added to this office.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-5">
                    {(() => {
                        // Build areas with criteria nodes (includes ParentCriteriaID provided by backend)
                        const groupedByArea = effectiveRequirements.reduce((areaGroups, req) => {
                            const areaKey = req.AreaCode || `Area_${req.AreaID || 'NoArea'}`;
                            if (!areaGroups[areaKey]) {
                                areaGroups[areaKey] = {
                                    name: req.AreaName || 'No Area',
                                    code: req.AreaCode || areaKey,
                                    criteriaMap: {},
                                };
                            }

                            const critId = req.CriteriaID ?? `crit_${req.CriteriaCode || req.RequirementID}`;
                            const map = areaGroups[areaKey].criteriaMap;

                            if (!map[critId]) {
                                map[critId] = {
                                    id: critId,
                                    code: req.CriteriaCode || '',
                                    name: req.CriteriaName || '',
                                    parentId: req.ParentCriteriaID || null,
                                    requirements: [],
                                    children: [],
                                };
                            }

                            // If parent exists in row but is not yet present in map, synthesize a parent node
                            if (req.ParentCriteriaID && !map[req.ParentCriteriaID]) {
                                map[req.ParentCriteriaID] = {
                                    id: req.ParentCriteriaID,
                                    code: req.ParentCriteriaCode || '',
                                    name: req.ParentCriteriaName || '',
                                    parentId: null,
                                    requirements: [],
                                    children: [],
                                };
                            }

                            map[critId].requirements.push(req);
                            return areaGroups;
                        }, {});

                        // Link children to parents within each area
                        Object.values(groupedByArea).forEach((area) => {
                            const map = area.criteriaMap;
                            Object.values(map).forEach((node) => {
                                if (node.parentId && map[node.parentId]) {
                                    map[node.parentId].children.push(node);
                                }
                            });
                        });

                        const matchesReq = (req) => {
                            const searchLower = searchTerm.toLowerCase();
                            const matchesSearch = !searchTerm || (
                                (req.RequirementCode || '').toLowerCase().includes(searchLower) ||
                                (req.Description || '').toLowerCase().includes(searchLower) ||
                                (req.AreaCode || '').toLowerCase().includes(searchLower) ||
                                (req.AreaName || '').toLowerCase().includes(searchLower) ||
                                (req.CriteriaCode || '').toLowerCase().includes(searchLower) ||
                                (req.CriteriaName || '').toLowerCase().includes(searchLower) ||
                                ((req.comments || '').toLowerCase().includes(searchLower))
                            );

                            if (!matchesSearch) return false;

                            if (statusFilter === 'all') return true;
                            const statusId = Number(req.ComplianceStatusID);
                            if (statusFilter === 'complied') return statusId === 5;
                            if (statusFilter === 'partially') return statusId === 4;
                            return (statusId === 3 || !statusId);
                        };

                        // helper: check if node or any descendant has matching requirements
                        const nodeHasMatches = (node) => {
                            if ((node.requirements || []).some((r) => matchesReq(r))) return true;
                            return (node.children || []).some((child) => nodeHasMatches(child));
                        };

                        const renderNode = (node, depth = 0) => {
                            if (!nodeHasMatches(node)) return null;
                            const isCritExpanded = !collapsedCriteria.has(node.id);
                            const matchingReqs = (node.requirements || []).filter((r) => matchesReq(r));

                            return (
                                <div key={`criteria-${node.id}`} className="overflow-hidden rounded-xl border border-slate-300/50 bg-slate-100/90 shadow-sm transition-all">
                                    <button
                                        type="button"
                                        onClick={() => toggleCriteria(node.id)}
                                        className={`w-full text-left border-b px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:brightness-105 transition-all ${
                                            depth === 0 ? 'border-indigo-900/30 bg-gradient-to-r from-indigo-800 to-indigo-700' : 'border-indigo-800/40 bg-gradient-to-r from-indigo-700/95 to-indigo-600/95'
                                        }`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-xs font-semibold tracking-wide text-white">{node.code}</h4>
                                                <span className="rounded-full bg-white/15 px-1.5 py-0.2 text-[9px] font-bold text-white/90">
                                                    {matchingReqs.length}
                                                </span>
                                            </div>
                                            <p className="mt-0.5 text-xs leading-snug text-indigo-100/95 truncate">{node.name}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0 text-white/80">
                                            <span className="text-[10px] font-medium text-indigo-200 hidden sm:inline">
                                                {isCritExpanded ? 'Collapse' : 'Expand'}
                                            </span>
                                            <svg
                                                className={`h-3.5 w-3.5 text-white transition-transform duration-200 ${isCritExpanded ? 'rotate-180' : 'rotate-0'}`}
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                strokeWidth={2.5}
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </button>

                                    {isCritExpanded && (
                                        <div className="divide-y divide-slate-300/40 animate-in fade-in duration-150">
                                            {matchingReqs.map((req) => {
                                            const isAssignedToMe = isUserAssignedToRequirement(req.RequirementID);
                                            const isOfficePersonnel = currentUser?.RoleID === 2;
                                            const hasUploadedFile = hasUserUploadedForRequirement(req.RequirementID);
                                            const canUploadThisReq = canUserUploadEvidence ? canUserUploadEvidence(req) : false;
                                            const canOpenSubmission = !!((isAdmin && onViewSubmission) || (isOfficeHead && (onViewMySubmission || onViewSubmission)) || (isAuditor && onViewSubmission) || (isAssignedToMe && onViewMySubmission));
                                            return (
                                                <div
                                                    key={req.RequirementID}
                                                    className={`p-4 transition-colors ${isAssignedToMe ? 'bg-cyan-100/50 ring-1 ring-inset ring-cyan-300/50' : 'hover:bg-slate-200/40'} ${canOpenSubmission ? 'cursor-pointer hover:shadow-sm' : ''}`}
                                                    onClick={() => {
                                                        if (!canOpenSubmission) return;
                                                        if (isAdmin || isAuditor) {
                                                            onViewSubmission?.(req);
                                                        } else if (isOfficeHead) {
                                                            if (canUploadThisReq || isAssignedToMe || isUserAssignedToCurrentOffice) {
                                                                onViewMySubmission?.(req);
                                                            } else {
                                                                onViewSubmission?.(req);
                                                            }
                                                        } else if (isAssignedToMe) {
                                                            onViewMySubmission?.(req);
                                                        } else {
                                                            onViewSubmission?.(req);
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (!canOpenSubmission) return;
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault();
                                                            if (isAdmin || isAuditor) {
                                                                onViewSubmission?.(req);
                                                            } else if (isOfficeHead) {
                                                                if (canUploadThisReq || isAssignedToMe || isUserAssignedToCurrentOffice) {
                                                                    onViewMySubmission?.(req);
                                                                } else {
                                                                    onViewSubmission?.(req);
                                                                }
                                                            } else if (isAssignedToMe) {
                                                                onViewMySubmission?.(req);
                                                            } else {
                                                                onViewSubmission?.(req);
                                                            }
                                                        }
                                                    }}
                                                    role={canOpenSubmission ? 'button' : undefined}
                                                    tabIndex={canOpenSubmission ? 0 : undefined}
                                                >
                                                    {/* Reuse existing requirement rendering block by inlining the minimal structure */}
                                                    <div className="flex items-stretch gap-3">
                                                        <div className="min-w-[90px] flex flex-col">
                                                            {isAdmin ? (
                                                                (() => {
                                                                    const reqUsers = assignedUsersMap[req.RequirementID] || [];
                                                                    const hasUploadedEvidence = reqUsers.some(u => u?.HasUploaded === 1 || u?.HasUploaded === true) ||
                                                                        Boolean(req.DocumentProof || req.ProofDocument || req.hasProof || req.has_proof || req.file_url);
                                                                    const currentStatusId = Number(req.ComplianceStatusID) || 3;

                                                                    return (
                                                                        <StatusSlider
                                                                            currentStatusId={currentStatusId}
                                                                            disabled={!hasUploadedEvidence}
                                                                            className="h-full"
                                                                            onChange={(newStatusId) => handleStatusChange(req.RequirementID, newStatusId)}
                                                                            onDisabledClick={() => {
                                                                                showAlert('Cannot change compliance status: No proof document has been uploaded for this standard yet.');
                                                                            }}
                                                                        />
                                                                    );
                                                                })()
                                                            ) : (
                                                                <StatusBadge statusId={req.ComplianceStatusID} />
                                                            )}
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <h5 className="text-sm font-semibold text-slate-900">{req.RequirementCode}</h5>
                                                                {isAssignedToMe && (
                                                                    <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200/80 bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold text-cyan-800 shadow-sm">
                                                                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                                                                        Active
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {(() => {
                                                                const isExpanded = expandedReqs.includes(req.RequirementID);
                                                                const shouldShowToggle = (req.Description || '').length > 140;
                                                                return (
                                                                    <>
                                                                        <p className={`mt-1 text-xs leading-relaxed text-slate-600 ${isExpanded ? '' : 'line-clamp-2'}`}>{req.Description}</p>
                                                                        {shouldShowToggle && (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    toggleExpandReq(req.RequirementID);
                                                                                }}
                                                                                className="mt-1.5 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                                                                                aria-expanded={isExpanded}
                                                                            >
                                                                                {isExpanded ? 'Show less' : 'Show more'}
                                                                            </button>
                                                                        )}
                                                                    </>
                                                                );
                                                            })()}

                                                            {/* Comments display / edit */}
                                                            {editingCommentId === req.RequirementID ? (
                                                                <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                                                                    {req.comments ? (
                                                                        <div className="mb-2 rounded-lg border border-slate-300/50 bg-slate-50 p-3 shadow-sm">
                                                                            <div className="flex items-center justify-between gap-2">
                                                                                <div className="text-[12px] font-semibold text-gray-800">{commentLabel}</div>
                                                                                {isAdmin ? (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            handleCommentClear?.(req);
                                                                                        }}
                                                                                        disabled={savingComment}
                                                                                        className="rounded-md px-2 py-1 text-[11px] font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-40"
                                                                                    >
                                                                                        Clear
                                                                                    </button>
                                                                                ) : null}
                                                                            </div>
                                                                            <div className="mt-1 text-[13px] text-gray-800 break-words">{req.comments}</div>
                                                                        </div>
                                                                    ) : null}

                                                                    <div className="rounded-full border border-slate-300/50 bg-slate-50 px-3 py-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                                        <input
                                                                            type="text"
                                                                            value={commentInput}
                                                                            onChange={handleCommentInputChange}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') {
                                                                                    e.preventDefault();
                                                                                    handleCommentSave(req);
                                                                                }
                                                                                if (e.key === 'Escape') {
                                                                                    e.preventDefault();
                                                                                    handleCommentCancel();
                                                                                }
                                                                            }}
                                                                            className="flex-1 bg-transparent outline-none text-[12px] text-gray-800 placeholder:text-gray-400"
                                                                            placeholder="Add private comment..."
                                                                            disabled={!isAdmin || savingComment}
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleCommentSave(req);
                                                                            }}
                                                                            disabled={!isAdmin || savingComment || !String(commentInput || '').trim()}
                                                                            className="h-7 w-7 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                                                                            aria-label="Send comment"
                                                                            title="Send"
                                                                        >
                                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                                                                <path d="M3 12L21 3l-6 18-2.7-7.3L3 12Z" fill="currentColor" />
                                                                            </svg>
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleCommentCancel();
                                                                            }}
                                                                            className="h-7 w-7 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100"
                                                                            aria-label="Cancel"
                                                                            title="Cancel"
                                                                        >
                                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                                                                <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                                            </svg>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="mt-2">
                                                                    {req.comments ? (
                                                                        <div
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (isAdmin) handleCommentClick(req);
                                                                            }}
                                                                            role={isAdmin ? 'button' : undefined}
                                                                            tabIndex={isAdmin ? 0 : undefined}
                                                                            className={`rounded-lg border border-slate-300/50 bg-slate-50 p-3 shadow-sm ${isAdmin ? 'cursor-pointer' : ''}`}
                                                                        >
                                                                            <div>
                                                                                <div className="flex items-center justify-between gap-2">
                                                                                    <div className="text-[12px] font-semibold text-gray-800">{commentLabel}</div>
                                                                                    {isAdmin ? (
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                handleCommentClear?.(req);
                                                                                            }}
                                                                                            disabled={savingComment}
                                                                                            className="rounded-md px-2 py-1 text-[11px] font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-40"
                                                                                        >
                                                                                            Clear
                                                                                        </button>
                                                                                    ) : null}
                                                                                </div>
                                                                                <div className="mt-1 text-[13px] text-gray-800 break-words">{req.comments}</div>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (isAdmin) handleCommentClick(req);
                                                                            }}
                                                                            role={isAdmin ? 'button' : undefined}
                                                                            tabIndex={isAdmin ? 0 : undefined}
                                                                            className={`rounded-full border border-slate-300/50 bg-slate-50 px-3 py-2 flex items-center gap-2 ${isAdmin ? 'cursor-pointer' : ''}`}
                                                                        >
                                                                            <span className="flex-1 text-[12px] text-gray-400">{isAdmin ? 'Add private comment...' : 'No comments'}</span>
                                                                            <span className="h-7 w-7 rounded-full flex items-center justify-center text-gray-400">
                                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                                                                    <path d="M3 12L21 3l-6 18-2.7-7.3L3 12Z" fill="currentColor" />
                                                                                </svg>
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex flex-col items-end gap-1.5">
                                                            {assignedUsersMap[req.RequirementID]?.length > 0 && (
                                                                <div className="flex flex-col items-end gap-1">
                                                                    <div className="flex items-center space-x-1">
                                                                        {assignedUsersMap[req.RequirementID].slice(0, 4).map((user) => {
                                                                            const displayName = `${user.FirstName || ''}${user.LastName ? ' ' + user.LastName : ''}`.trim() || user.Username || '';
                                                                            const hasUploaded = user.HasUploaded === 1 || user.HasUploaded === true;
                                                                            return (
                                                                                <div key={user.UserID} className="relative">
                                                                                    <SmartUserAvatar
                                                                                        user={user}
                                                                                        size="h-7 w-7"
                                                                                        textSize="text-[10px]"
                                                                                        title={`${displayName}${displayName ? ' • ' : ''}${hasUploaded ? 'Uploaded' : 'Not uploaded'}`}
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            handleUserAvatarClick(e, user, req.RequirementID);
                                                                                        }}
                                                                                        ring={`border-2 ring-1 ring-slate-200/50 ${hasUploaded ? 'border-emerald-500' : 'border-white'}`}
                                                                                        className="cursor-pointer"
                                                                                    />
                                                                                    {hasUploaded && (
                                                                                        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-emerald-500 leading-none text-white">
                                                                                            <Check className="w-2.5 h-2.5" />
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}

                                                                        {assignedUsersMap[req.RequirementID].length > 4 && (
                                                                            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-[10px] font-semibold text-slate-600">
                                                                                +{assignedUsersMap[req.RequirementID].length - 4}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Requirement rows: no upload UI here (Evidence panel only). */}

                                                            {isAdmin && (
                                                                <>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleRemoveRequirement(req.RequirementID);
                                                                        }}
                                                                        disabled={removingReqId === req.RequirementID}
                                                                        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-medium text-rose-600 shadow-sm transition hover:bg-rose-100"
                                                                    >
                                                                        Remove
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Render children nodes */}
                                        {(node.children || []).map((child) => (
                                            <div key={`child-${child.id}`} className="pl-4">
                                                {renderNode(child, depth + 1)}
                                            </div>
                                        ))}
                                    </div>
                                    )}
                                </div>
                            );
                        };

                        const areasToRender = Object.entries(groupedByArea).filter(([, area]) => {
                            // If filters/search are active, ensure at least one matching node exists
                            if (!searchTerm && statusFilter === 'all') return true;
                            return Object.values(area.criteriaMap).some((node) => nodeHasMatches(node));
                        });

                        if (areasToRender.length === 0) {
                            return (
                                <div className="py-12 text-center">
                                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 shadow-sm ring-1 ring-slate-300/60">
                                        <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <p className="text-sm font-medium text-slate-700">No standards found</p>
                                    <p className="mt-1 text-xs text-slate-500">Try adjusting your search or filter.</p>
                                </div>
                            );
                        }

                        const allAreaKeys = areasToRender.map(([k]) => k);
                        const isAllExpanded = allAreaKeys.length > 0 && allAreaKeys.every((k) => expandedAreas.has(k));

                        return (
                            <div className="space-y-4">
                                {/* Global Expand / Collapse All Areas Action */}
                                {areasToRender.length > 1 && (
                                    <div className="flex items-center justify-between px-1 pb-1">
                                        <span className="text-xs font-semibold text-slate-500">
                                            Showing {areasToRender.length} Areas
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (isAllExpanded) {
                                                    setExpandedAreas(new Set());
                                                } else {
                                                    setExpandedAreas(new Set(allAreaKeys));
                                                }
                                            }}
                                            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50/80 hover:bg-indigo-100/80 border border-indigo-200/80 rounded-lg transition-colors cursor-pointer"
                                        >
                                            <svg
                                                className={`h-3.5 w-3.5 transition-transform duration-200 ${isAllExpanded ? 'rotate-180' : 'rotate-0'}`}
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                strokeWidth={2}
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                            </svg>
                                            <span>{isAllExpanded ? 'Collapse All Areas' : 'Expand All Areas'}</span>
                                        </button>
                                    </div>
                                )}

                                {areasToRender.map(([areaKey, area]) => {
                                    // Find root criteria nodes (no parent or parent not in same map)
                                    const allNodes = Object.values(area.criteriaMap || {});
                                    const roots = allNodes.filter((n) => !n.parentId || !area.criteriaMap[n.parentId]);
                                    const isExpanded = expandedAreas.has(areaKey) || (Boolean(searchTerm) || statusFilter !== 'all');
                                    const reqCount = Object.values(area.criteriaMap || {}).reduce(
                                        (acc, c) => acc + (c.requirements || []).length,
                                        0
                                    );

                                    return (
                                        <div key={areaKey} className="space-y-3">
                                            {/* Drop Expand Area Banner Button */}
                                            <button
                                                type="button"
                                                onClick={() => toggleArea(areaKey)}
                                                className="w-full text-left rounded-xl bg-gradient-to-r from-blue-600 via-blue-700 to-sky-700 px-4 py-3 shadow-md shadow-blue-500/15 hover:brightness-105 active:scale-[0.998] transition-all flex items-center justify-between gap-3 cursor-pointer group"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-sm font-semibold tracking-wide text-white">{area.code}</h3>
                                                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white/90">
                                                            {reqCount} {reqCount === 1 ? 'item' : 'items'}
                                                        </span>
                                                    </div>
                                                    <p className="mt-0.5 text-xs leading-snug text-violet-100 truncate">{area.name}</p>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-[11px] font-semibold text-violet-200 opacity-90 group-hover:opacity-100 transition-opacity">
                                                        {isExpanded ? 'Collapse' : 'Expand'}
                                                    </span>
                                                    <div className="h-7 w-7 rounded-lg bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition-colors">
                                                        <svg
                                                            className={`h-4 w-4 text-white transition-transform duration-200 ease-in-out ${
                                                                isExpanded ? 'rotate-180' : 'rotate-0'
                                                            }`}
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                            strokeWidth={2.5}
                                                        >
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </button>

                                            {isExpanded && (
                                                <div className="space-y-3 pl-1 sm:pl-2 animate-in fade-in slide-in-from-top-1 duration-150">
                                                    {roots.map((root) => (
                                                        <div key={`root-${root.id}`}>{renderNode(root)}</div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
}
