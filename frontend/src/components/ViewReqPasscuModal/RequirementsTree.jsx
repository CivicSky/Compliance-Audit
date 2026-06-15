import React from 'react';
import StatusBadge from './StatusBadge';
import { API_BASE_URL } from '../../utils/apiBase';

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
    const commentLabel = isAdmin ? 'Comment' : 'Private comment';

    return (
        <div className="flex-1 overflow-y-auto bg-app px-4 py-4 sm:px-5">
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                </div>
            ) : requirements.length === 0 ? (
                <div className="py-16 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
                        <svg className="h-7 w-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <p className="text-sm font-medium text-slate-700">No requirements assigned yet</p>
                    <p className="mt-1 text-xs text-slate-500">Requirements will appear here once added to this office.</p>
                </div>
            ) : (
                <div className="space-y-5">
                    {(() => {
                        // Build areas with criteria nodes (includes ParentCriteriaID provided by backend)
                        const groupedByArea = requirements.reduce((areaGroups, req) => {
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
                            if (statusFilter === 'complied') return req.ComplianceStatusID === 5;
                            if (statusFilter === 'partially') return req.ComplianceStatusID === 4;
                            return (req.ComplianceStatusID === 3 || !req.ComplianceStatusID);
                        };

                        // helper: check if node or any descendant has matching requirements
                        const nodeHasMatches = (node) => {
                            if ((node.requirements || []).some((r) => matchesReq(r))) return true;
                            return (node.children || []).some((child) => nodeHasMatches(child));
                        };

                        const renderNode = (node, depth = 0) => {
                            if (!nodeHasMatches(node)) return null;

                            return (
                                <div key={`criteria-${node.id}`} className="overflow-hidden rounded-xl border border-slate-300/50 bg-slate-100/90 shadow-sm">
                                    <div className={`border-b px-4 py-2.5 ${depth === 0 ? 'border-indigo-900/30 bg-gradient-to-r from-indigo-800 to-indigo-700' : 'border-indigo-800/40 bg-gradient-to-r from-indigo-700/95 to-indigo-600/95'}`}>
                                        <h4 className="text-xs font-semibold tracking-wide text-white">{node.code}</h4>
                                        <p className="mt-0.5 text-xs leading-snug text-indigo-100/95">{node.name}</p>
                                    </div>

                                    <div className="divide-y divide-slate-300/40">
                                        {(node.requirements || []).filter((r) => matchesReq(r)).map((req) => {
                                            const isAssignedToMe = isUserAssignedToRequirement(req.RequirementID);
                                            const isOfficePersonnel = currentUser?.RoleID === 2;
                                            const hasUploadedFile = hasUserUploadedForRequirement(req.RequirementID);
                                            const canOpenSubmission = !!((isAdmin && onViewSubmission) || (isOfficeHead && onViewMySubmission));
                                            return (
                                                <div
                                                    key={req.RequirementID}
                                                    className={`p-4 transition-colors ${isAssignedToMe ? 'bg-cyan-100/50 ring-1 ring-inset ring-cyan-300/50' : 'hover:bg-slate-200/40'} ${canOpenSubmission ? 'cursor-pointer hover:shadow-sm' : ''}`}
                                                    onClick={() => {
                                                        if (!canOpenSubmission) return;
                                                        if (isAdmin) onViewSubmission?.(req);
                                                        else if (isOfficeHead) onViewMySubmission?.(req);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (!canOpenSubmission) return;
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault();
                                                            if (isAdmin) onViewSubmission?.(req);
                                                            else if (isOfficeHead) onViewMySubmission?.(req);
                                                        }
                                                }}
                                                    role={canOpenSubmission ? 'button' : undefined}
                                                    tabIndex={canOpenSubmission ? 0 : undefined}
                                                >
                                                    {/* Reuse existing requirement rendering block by inlining the minimal structure */}
                                                    <div className="flex items-start gap-3">
                                                        <div className="min-w-[90px]">
                                                            {isAdmin ? (
                                                                <div className="space-y-2 rounded-xl border border-slate-300/40 bg-slate-200/50 p-2">
                                                                    {[
                                                                        { id: 5, label: 'Complied', color: 'emerald' },
                                                                        { id: 4, label: 'Partially Complied', color: 'amber' },
                                                                        { id: 3, label: 'Not Complied', color: 'rose' },
                                                                    ].map((option) => (
                                                                        <label
                                                                            key={option.id}
                                                                            className="flex w-40 cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg px-1 py-0.5 text-xs transition hover:bg-white/80"
                                                                            title={option.label}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        >
                                                                            <input
                                                                                type="radio"
                                                                                name={`status-${req.RequirementID}`}
                                                                                checked={req.ComplianceStatusID === option.id}
                                                                                onChange={(e) => {
                                                                                e.stopPropagation();
                                                                                handleStatusChange(req.RequirementID, option.id);
                                                                            }}
                                                                                className={`w-3 h-3 text-${option.color}-600 border-${option.color}-300 focus:ring-${option.color}-500 focus:ring-2`}
                                                                            />
                                                                            <span
                                                                                className={`font-medium ${option.color === 'emerald'
                                                                                    ? 'text-emerald-700'
                                                                                    : option.color === 'amber'
                                                                                        ? 'text-amber-700'
                                                                                        : 'text-rose-700'
                                                                                    }`}
                                                                            >
                                                                                {option.label}
                                                                            </span>
                                                                        </label>
                                                                    ))}
                                                                </div>
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
                                                                    {(() => {
                                                                        const usersForReq = assignedUsersMap[req.RequirementID] || [];
                                                                        const uploadedCount = usersForReq.reduce(
                                                                            (acc, u) => acc + ((u?.HasUploaded === 1 || u?.HasUploaded === true) ? 1 : 0),
                                                                            0
                                                                        );
                                                                        return (
                                                                            <div className="rounded-md bg-slate-200/70 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                                                                Uploaded {uploadedCount}/{usersForReq.length}
                                                                            </div>
                                                                        );
                                                                    })()}

                                                                    <div className="flex items-center space-x-1">
                                                                        {assignedUsersMap[req.RequirementID].slice(0, 4).map((user) => {
                                                                            const avatarSrc = user.ProfilePic
                                                                                ? `${API_BASE_URL}/uploads/profile-pics/${user.ProfilePic}`
                                                                                : '/src/assets/images/user.svg';
                                                                            const displayName = `${user.FirstName || ''}${user.LastName ? ' ' + user.LastName : ''}`.trim() || user.Username || '';
                                                                            const hasUploaded = user.HasUploaded === 1 || user.HasUploaded === true;
                                                                            return (
                                                                                <div key={user.UserID} className="relative">
                                                                                    <img
                                                                                        src={avatarSrc}
                                                                                        alt={displayName}
                                                                                        title={`${displayName}${displayName ? ' • ' : ''}${hasUploaded ? 'Uploaded' : 'Not uploaded'}`}
                                                                                        onError={(e) => {
                                                                                            e.target.src = '/src/assets/images/user.svg';
                                                                                        }}
                                                                                        onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleUserAvatarClick(e, user, req.RequirementID);
                                                                                    }}
                                                                                        className={`h-7 w-7 cursor-pointer rounded-full border-2 object-cover shadow-sm ring-1 ring-slate-200/50 ${hasUploaded ? 'border-emerald-500' : 'border-white'}`}
                                                                                    />
                                                                                    {hasUploaded && (
                                                                                        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-[10px] font-bold leading-none text-white">
                                                                                            ✓
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
                                    <p className="text-sm font-medium text-slate-700">No requirements found</p>
                                    <p className="mt-1 text-xs text-slate-500">Try adjusting your search or filter.</p>
                                </div>
                            );
                        }

                        return areasToRender.map(([areaKey, area]) => {
                            // Find root criteria nodes (no parent or parent not in same map)
                            const allNodes = Object.values(area.criteriaMap || {});
                            const roots = allNodes.filter((n) => !n.parentId || !area.criteriaMap[n.parentId]);

                            return (
                                <div key={areaKey} className="space-y-3">
                                    <div className="rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-violet-700 px-4 py-3 shadow-md shadow-purple-500/15">
                                        <h3 className="text-sm font-semibold tracking-wide text-white">{area.code}</h3>
                                        <p className="mt-0.5 text-xs leading-snug text-violet-100">{area.name}</p>
                                    </div>

                                    <div className="space-y-3 pl-1 sm:pl-2">
                                        {roots.map((root) => (
                                            <div key={`root-${root.id}`}>{renderNode(root)}</div>
                                        ))}
                                    </div>
                                </div>
                            );
                        });
                    })()}
                </div>
            )}
        </div>
    );
}
