import React from 'react';

const getExtension = (fileNameOrUrl) => {
    const s = String(fileNameOrUrl || '');
    const clean = s.split('?')[0].split('#')[0];
    const dot = clean.lastIndexOf('.');
    return dot >= 0 ? clean.slice(dot + 1).toLowerCase() : '';
};

const getFileTypeLabel = (ext) => {
    if (['doc', 'docx'].includes(ext)) return 'Microsoft Word';
    if (['xls', 'xlsx'].includes(ext)) return 'Microsoft Excel';
    if (ext === 'pdf') return 'PDF';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'Image';
    return ext ? ext.toUpperCase() : 'File';
};

const isImageExt = (ext) => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'].includes(ext);

export default function YourWorkFileUpload({
    requirementId,
    hasUploaded,
    file,
    thumb,
    isLoadingFile = false,
    isLoadingThumb = false,
    uploading = false,
    unsubmitting = false,
    onUpload,
    onUnsubmit,
    onViewFile,
    showHeader = true,
    compact = false,
}) {
    const inputId = `your-work-file-${requirementId}`;
    const ext = getExtension(file?.fileName || file?.url);
    const fileName = String(file?.fileName || '').trim() || 'Uploaded file';
    const workStatus = hasUploaded ? 'Submitted' : 'Assigned';

    const handleCardClick = () => {
        if (hasUploaded && onViewFile) onViewFile();
    };

    return (
        <div className={compact ? '' : 'mt-3'} onClick={(e) => e.stopPropagation()}>
            {showHeader && (
                <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-800">Evidence</div>
                    <div className={`text-xs font-medium ${hasUploaded ? 'text-emerald-600' : 'text-gray-500'}`}>
                        {workStatus}
                    </div>
                </div>
            )}

            {!hasUploaded ? (
                <>
                    <input
                        id={inputId}
                        type="file"
                        accept=".pdf,.doc,.docx,.xlsx,.xls,.jpg,.jpeg,.png"
                        onChange={(e) => onUpload?.(e, requirementId)}
                        className="hidden"
                        disabled={uploading}
                    />
                    <label
                        htmlFor={inputId}
                        className={`w-full max-w-[520px] cursor-pointer items-center justify-center rounded-full border border-gray-300 bg-white font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 ${compact ? 'inline-flex px-3 py-1.5 text-[11px]' : 'flex px-5 py-2.5 text-sm'}`}
                    >
                        {uploading ? 'Uploading...' : '+ Select file'}
                    </label>
                </>
            ) : (
                <div className={`flex items-stretch gap-2 ${compact ? 'flex-col' : ''}`}>
                    <div
                        role={onViewFile ? 'button' : undefined}
                        tabIndex={onViewFile ? 0 : undefined}
                        onClick={handleCardClick}
                        onKeyDown={(e) => {
                            if (!onViewFile) return;
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onViewFile();
                            }
                        }}
                        className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 ${onViewFile ? 'cursor-pointer hover:border-gray-300 hover:bg-gray-100/80' : ''}`}
                    >
                        <div className="min-w-0 flex-1">
                            <div className={`font-medium text-gray-900 truncate ${compact ? 'text-[11px]' : 'text-sm'}`}>
                                {isLoadingFile ? 'Loading...' : fileName}
                            </div>
                            <div className={`text-gray-500 ${compact ? 'text-[10px]' : 'text-xs'}`}>
                                {getFileTypeLabel(ext)}
                            </div>
                        </div>
                        <div className={`shrink-0 overflow-hidden rounded-md border border-gray-200 bg-white ${compact ? 'h-10 w-14' : 'h-14 w-[72px]'}`}>
                            {isLoadingFile || isLoadingThumb ? (
                                <div className="flex h-full w-full items-center justify-center text-[9px] text-gray-400">...</div>
                            ) : file?.url && isImageExt(ext) ? (
                                <img src={file.url} alt="" className="h-full w-full object-cover" />
                            ) : thumb ? (
                                <img src={thumb} alt="" className="h-full w-full object-cover bg-white" />
                            ) : (
                                <div className="flex h-full w-full flex-col items-center justify-center px-1 text-center">
                                    <div className="text-[10px] font-semibold text-gray-600">{(ext || 'file').toUpperCase()}</div>
                                </div>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onUnsubmit?.(requirementId);
                        }}
                        disabled={unsubmitting}
                        className={`flex shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 ${compact ? 'h-8 w-8 self-center' : 'h-10 w-10 self-center'}`}
                        aria-label="Remove file"
                        title="Remove file"
                    >
                        {unsubmitting ? (
                            <span className="text-xs">...</span>
                        ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
