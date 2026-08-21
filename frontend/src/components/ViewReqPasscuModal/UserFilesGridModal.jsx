import React, { useState, useEffect, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import { API_BASE_URL } from '../../utils/apiBase';
import { useToast } from '../UI/Toast';
import RenameInline from './RenameInline';

const getExtension = (fileNameOrUrl) => {
    const s = String(fileNameOrUrl || '');
    const clean = s.split('?')[0].split('#')[0];
    const dot = clean.lastIndexOf('.');
    return dot >= 0 ? clean.slice(dot + 1).toLowerCase() : '';
};

const getFileTypeLabel = (ext) => {
    if (['doc', 'docx'].includes(ext)) return 'Microsoft Word';
    if (['xls', 'xlsx'].includes(ext)) return 'Microsoft Excel';
    if (ext === 'pdf') return 'PDF Document';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'Image File';
    if (['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(ext)) return 'Video File';
    return ext ? ext.toUpperCase() : 'File';
};

const isImageExt = (ext) => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'].includes(ext);
const isVideoExt = (ext) => ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(ext);

// Memoized Card Item with Drag and Drop Support
const FileCardItem = memo(({ 
    item, 
    idx, 
    onViewFile, 
    onSaveComment, 
    isAdmin, 
    isExpanded, 
    onToggleExpand,
    isDragging,
    isDragOver,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    canReorder,
    isOwnFiles,
    onUnsubmit,
    onRename,
    isViewerAuditor
}) => {
    const [editingTitle, setEditingTitle] = React.useState(false);
    const fileUrl = item.url || item.file_path || '';
    const ext = getExtension(item.fileName || fileUrl);
    const displayTitle = item.displayName || item.fileName || `Evidence ${idx + 1}`;
    const commentText = String(item.comment || '');
    const isLongComment = commentText.length > 130 || commentText.split('\n').length > 2;

    return (
        <div
            draggable={canReorder}
            onDragStart={(e) => onDragStart(e, idx)}
            onDragOver={(e) => onDragOver(e, idx)}
            onDrop={(e) => onDrop(e, idx)}
            onDragEnd={onDragEnd}
            onClick={() => onViewFile?.(item)}
            className={`group cursor-pointer rounded-xl border bg-white p-4 shadow-2xs flex flex-col justify-between gap-3 transition-all [content-visibility:auto] [contain-intrinsic-size:220px] ${
                isDragging ? 'opacity-40 scale-[0.98] border-dashed border-blue-400 bg-blue-50/20' :
                isDragOver ? 'border-blue-500 ring-2 ring-blue-400/50 shadow-md scale-[1.01]' :
                'border-slate-200/90 hover:border-blue-400 hover:bg-blue-50/20 hover:shadow-md'
            }`}
        >
            {/* Card Header & Preview */}
            <div className="flex items-center gap-2.5">
                {canReorder && (
                    <div 
                        className="cursor-grab active:cursor-grabbing text-slate-300 group-hover:text-slate-500 flex items-center justify-center pt-3 shrink-0 transition-colors"
                        title="Drag to reorder file"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9h.01M8 15h.01M16 9h.01M16 15h.01" />
                        </svg>
                    </div>
                )}

                <div className="h-11 w-11 shrink-0 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shadow-2xs group-hover:border-blue-300">
                    {isImageExt(ext) && fileUrl ? (
                        <img 
                            src={fileUrl} 
                            alt="" 
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover" 
                        />
                    ) : isVideoExt(ext) ? (
                        <div className="h-full w-full bg-slate-900 flex items-center justify-center text-white">
                            <svg className="w-5 h-5 text-indigo-400 fill-current" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                        </div>
                    ) : (
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                            {(ext || '').slice(0, 4) || 'FILE'}
                        </span>
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                        <div className="font-bold text-slate-900 text-xs truncate group-hover:text-blue-600 transition-colors" title={displayTitle}>
                            {!editingTitle ? displayTitle : (
                                <div onClick={(e) => e.stopPropagation()}>
                                    <RenameInline
                                        item={item}
                                        forceEditing={true}
                                        onRename={(newTitle) => { onRename?.(item, newTitle); setEditingTitle(false); }}
                                        onCancel={() => setEditingTitle(false)}
                                    />
                                </div>
                            )}
                        </div>
                        {isOwnFiles && (
                            <div className="flex items-center gap-2">
                                {!editingTitle && (
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setEditingTitle(true); }}
                                        className="p-1 rounded-md hover:bg-rose-50 text-rose-600 border border-transparent"
                                        title="Rename"
                                    >
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 20h9" />
                                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                                        </svg>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onUnsubmit?.(item.id || item.fileName);
                                    }}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 shrink-0"
                                    title="Remove file"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{getFileTypeLabel(ext)}</span>
                        <span>•</span>
                        <span className="truncate max-w-[140px] text-slate-400">{item.fileName || 'file'}</span>
                    </div>
                </div>
            </div>

            {/* Per-File Comment Section */}
            <div 
                className="pt-2.5 border-t border-slate-100 flex flex-col gap-1.5"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>Comment:</span>
                    {isLongComment && !(isAdmin || isViewerAuditor) && (
                        <button
                            type="button"
                            onClick={onToggleExpand}
                            className="text-[11px] font-medium text-blue-600 hover:underline"
                        >
                            {isExpanded ? 'Show less' : 'Show more'}
                        </button>
                    )}
                </div>

                {(isAdmin || isViewerAuditor) ? (
                    <textarea
                        rows={2}
                        defaultValue={commentText}
                        onBlur={(e) => onSaveComment(item, e.target.value)}
                        placeholder="Add feedback comment for this file..."
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/80 p-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder:text-slate-400 resize-y min-h-[50px]"
                    />
                ) : (
                    <div className="w-full rounded-lg border border-slate-100 bg-slate-50/90 p-2 text-xs text-slate-700 font-medium break-words whitespace-pre-wrap leading-relaxed">
                        {commentText ? (
                            <span className={!isExpanded && isLongComment ? 'line-clamp-2' : ''}>
                                {commentText}
                            </span>
                        ) : (
                            <span className="italic text-slate-400 font-normal">No comment from auditor</span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});

export default function UserFilesGridModal({
    show = false,
    user = null,
    requirement = null,
    files = [],
    onClose,
    onViewFile,
    onUpdateComment,
    onReorderFiles,
    isAdmin = true,
    currentUser = null,
    onUpload = null,
    onUnsubmit = null,
    onRename = null,
    viewerRoleId = 0,
    uploading = false
}) {
    const isOwnFiles = !!(currentUser && user && Number(currentUser.UserID) === Number(user.UserID));
    const isViewerAuditor = Number(viewerRoleId || currentUser?.RoleID || 0) === 4;
    const { toast } = useToast();
    const [expandedComments, setExpandedComments] = useState({});
    const [visibleCount, setVisibleCount] = useState(9);
    const [localFiles, setLocalFiles] = useState(files);
    const [draggedIdx, setDraggedIdx] = useState(null);
    const [dragOverIdx, setDragOverIdx] = useState(null);
    const sentinelRef = useRef(null);

    useEffect(() => {
        setLocalFiles(files || []);
    }, [files]);

    useEffect(() => {
        if (show) {
            setVisibleCount(9);
        }
    }, [show, user?.UserID]);

    // Native IntersectionObserver for zero JS scroll overhead
    useEffect(() => {
        if (!show || visibleCount >= localFiles.length) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setVisibleCount((prev) => Math.min(prev + 9, localFiles.length));
                }
            },
            { threshold: 0.1, rootMargin: '200px' }
        );

        const currentSentinel = sentinelRef.current;
        if (currentSentinel) {
            observer.observe(currentSentinel);
        }

        return () => {
            if (currentSentinel) {
                observer.unobserve(currentSentinel);
            }
        };
    }, [show, visibleCount, localFiles.length]);

    if (!show || !user) return null;

    const displayName = `${user?.FirstName || ''}${user?.LastName ? ' ' + user.LastName : ''}`.trim() || user?.Username || 'Personnel';
    const avatarSrc = user?.ProfilePic
        ? `${API_BASE_URL}/uploads/profile-pics/${user.ProfilePic}`
        : '/src/assets/images/user.svg';

    const reqCode = requirement?.RequirementCode || 'Requirement';
    const reqDesc = requirement?.Description || '';

    const handleSaveComment = (item, newCommentVal) => {
        const val = newCommentVal.trim();
        if (val !== (item.comment || '')) {
            onUpdateComment?.(requirement?.RequirementID, item.id, val);
            toast?.({
                title: 'Comment Saved',
                description: 'Updated file feedback comment',
                variant: 'success',
                duration: 2000
            });
        }
    };

    const handleRename = async (item, newTitle) => {
        if (!newTitle || !item) return;
        try {
            await onRename?.(requirement?.RequirementID, item.id, newTitle);
            setLocalFiles(prev => prev.map(f => f.id === item.id ? { ...f, displayName: newTitle } : f));
            toast?.({ title: 'Title Updated', description: 'File title updated', variant: 'success', duration: 2000 });
        } catch (err) {
            console.error('Rename failed', err);
            toast?.({ title: 'Rename Failed', description: 'Could not update title', variant: 'error', duration: 3000 });
        }
    };

    const toggleExpandComment = (itemId) => {
        setExpandedComments(prev => ({ ...prev, [itemId]: !prev[itemId] }));
    };

    const handleDragStart = (e, index) => {
        setDraggedIdx(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        if (draggedIdx === null || draggedIdx === index) return;
        setDragOverIdx(index);
    };

    const handleDrop = async (e, targetIdx) => {
        e.preventDefault();
        if (draggedIdx === null || draggedIdx === targetIdx) {
            setDraggedIdx(null);
            setDragOverIdx(null);
            return;
        }

        const updated = [...localFiles];
        const [movedItem] = updated.splice(draggedIdx, 1);
        updated.splice(targetIdx, 0, movedItem);

        setLocalFiles(updated);
        setDraggedIdx(null);
        setDragOverIdx(null);

        const targetUserId = user.UserID || user.id;
        const targetReqId = requirement?.RequirementID;
        const orderedIds = updated.map(f => f.id).filter(Boolean);

        if (targetReqId && targetUserId && orderedIds.length > 0) {
            try {
                await fetch(`${API_BASE_URL}/api/requirements/${targetReqId}/user-file/${targetUserId}/reorder`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderedIds })
                });
                toast?.({
                    title: 'Order Updated',
                    description: 'File order saved successfully',
                    variant: 'success',
                    duration: 2000
                });
                onReorderFiles?.(targetReqId, updated);
            } catch (err) {
                console.error('Failed to persist file reorder:', err);
            }
        }
    };

    const handleDragEnd = () => {
        setDraggedIdx(null);
        setDragOverIdx(null);
    };

    const visibleFiles = localFiles.slice(0, visibleCount);
    const hasMore = visibleCount < localFiles.length;

    const modalContent = (
        <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 transition-opacity animate-in fade-in duration-150"
            onClick={onClose}
        >
            <div 
                className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header matching App Design System */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                            <img 
                                src={avatarSrc} 
                                alt={displayName} 
                                loading="lazy"
                                decoding="async"
                                onError={(e) => { e.target.src = '/src/assets/images/user.svg'; }}
                                className="h-11 w-11 rounded-full object-cover border-2 border-emerald-500 shadow-2xs" 
                            />
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-[18px] w-[18px] min-w-[18px] min-h-[18px] shrink-0 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-white shadow-2xs">
                                <svg className="w-2.5 h-2.5 stroke-white" fill="none" viewBox="0 0 24 24" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </span>
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2.5">
                                <h2 className="text-base font-bold text-slate-900 truncate">{displayName}</h2>
                                <span className="rounded-full bg-emerald-100/90 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                                    Submitted ({localFiles.length} files)
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 truncate mt-0.5">
                                <span className="font-semibold text-slate-700">{reqCode}</span>
                                {reqDesc ? ` — ${reqDesc}` : ''}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                        {isOwnFiles && (
                            <>
                                <label
                                    htmlFor="grid-file-upload-input"
                                    className={`inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                    <span>{uploading ? 'Uploading...' : 'Upload File(s)'}</span>
                                </label>
                                <input
                                    type="file"
                                    id="grid-file-upload-input"
                                    className="hidden"
                                    multiple
                                    disabled={uploading}
                                    onChange={(e) => onUpload?.(e, requirement?.RequirementID)}
                                />
                            </>
                        )}

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 shrink-0"
                        aria-label="Close"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    </div>
                </div>

                {/* Body: 3-Column 3x3 Grid with Drag & Drop Reordering */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/70 [contain:content]">
                    {localFiles.length > 0 ? (
                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {visibleFiles.map((item, idx) => {
                                    const fileIdKey = item.id || item.fileName || idx;
                                    return (
                                        <div key={fileIdKey}>
                                            <FileCardItem
                                                item={item}
                                                idx={idx}
                                                onViewFile={onViewFile}
                                                onSaveComment={handleSaveComment}
                                                isAdmin={isAdmin}
                                                isExpanded={!!expandedComments[fileIdKey]}
                                                onToggleExpand={() => toggleExpandComment(fileIdKey)}
                                                isDragging={draggedIdx === idx}
                                                isDragOver={dragOverIdx === idx}
                                                onDragStart={handleDragStart}
                                                onDragOver={handleDragOver}
                                                onDrop={handleDrop}
                                                onDragEnd={handleDragEnd}
                                                canReorder={localFiles.length > 1 && (isOwnFiles || isAdmin)}
                                                isOwnFiles={isOwnFiles}
                                                onUnsubmit={onUnsubmit}
                                                onRename={handleRename}
                                                isViewerAuditor={isViewerAuditor}
                                            />
                                            {/** RenameInline is now rendered inline in the card header for owners. */}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Native Observer Sentinel & Manual Button */}
                            {hasMore && (
                                <div 
                                    ref={sentinelRef}
                                    className="flex flex-col items-center justify-center pt-3 pb-2"
                                >
                                    <button
                                        type="button"
                                        onClick={() => setVisibleCount((prev) => Math.min(prev + 9, localFiles.length))}
                                        className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-5 py-2 text-xs font-bold text-blue-600 shadow-2xs hover:bg-blue-50 hover:border-blue-300 transition-all cursor-pointer"
                                    >
                                        <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                        </svg>
                                        <span>Load More Files ({localFiles.length - visibleCount} remaining)</span>
                                    </button>
                                    <span className="text-[11px] font-medium text-slate-400 mt-1">
                                        Showing {visibleCount} of {localFiles.length} uploaded files
                                    </span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed border-slate-300/80 bg-white py-12 text-center text-sm font-medium text-slate-500">
                            No evidence files submitted by this user.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
