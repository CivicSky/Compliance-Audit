import React from 'react';
import { officesAPI } from '../../utils/api';

export default function ModalHeader({
    officeData,
    isAdmin,
    showMenu,
    setShowMenu,
    onEditOffice,
    onAddRequirements,
    onDeleteOffice,
    onClose,
    office,
}) {
    const isAcademicProgram = (() => {
        const typeId = Number(officeData?.entity_type_id || officeData?.OfficeTypeID || officeData?.type_id);
        if (typeId === 1) return true;
        if (typeId === 2) return false;

        const typeName = String(officeData?.office_type_name || officeData?.TypeName || officeData?.category_name || officeData?.CategoryName || '').toLowerCase();
        if (typeName.includes('non academic') || typeName.includes('non-academic') || typeName.includes('office') || typeName.includes('administrative')) {
            return false;
        }
        return typeName.includes('academic') || typeName.includes('program');
    })();

    return (
        <div className="relative border-b border-slate-200/80 bg-white px-5 py-4 shadow-sm">
            {/* Accent bar */}
            <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

            <div className="flex items-center justify-between gap-4">
                {/* Left: icon + name */}
                <div className="flex min-w-0 items-center gap-3.5">
                    {/* Icon */}
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-sm ${
                        isAcademicProgram
                            ? 'border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600'
                            : 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600'
                    }`}>
                        {isAcademicProgram ? (
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A57.778 57.778 0 0012 13.5" />
                            </svg>
                        ) : (
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 16.5h1.5m3 0H15M9 21v-3a1 1 0 011-1h4a1 1 0 011 1v3" />
                            </svg>
                        )}
                    </div>

                    {/* Name + meta */}
                    <div className="min-w-0">
                        <h2 className="truncate text-lg font-bold tracking-tight text-slate-900">{officeData.office_name}</h2>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                            {officeData.office_type_name && (
                                <span className="text-xs font-medium text-slate-500">{officeData.office_type_name}</span>
                            )}
                            {officeData.event_name && (
                                <>
                                    <span className="text-slate-300">·</span>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 border border-indigo-100">
                                        Event: {officeData.event_code || officeData.EventCode || officeData.event?.code || ''}
                                    </span>
                                </>
                            )}
                            {(officeData.DepartmentName || officeData.department_name) && (
                                <>
                                    <span className="text-slate-300">·</span>
                                    <span className="text-[11px] text-slate-400">{officeData.DepartmentName || officeData.department_name}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: actions + close */}
                <div className="flex shrink-0 items-center gap-2">
                    {isAdmin && (
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowMenu(!showMenu)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                                aria-label="Office actions"
                            >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6h.01M12 12h.01M12 18h.01" />
                                </svg>
                            </button>

                            {showMenu && (
                                <div className="absolute right-0 top-10 z-30 w-[220px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl shadow-slate-200/60">
                                    <button
                                        type="button"
                                        onClick={() => { setShowMenu(false); onEditOffice(office); }}
                                        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-xs text-slate-700 transition hover:bg-indigo-50 whitespace-nowrap"
                                    >
                                        <svg className="h-4 w-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        Edit Office Info
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setShowMenu(false); onAddRequirements(office); }}
                                        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-xs text-slate-700 transition hover:bg-emerald-50 whitespace-nowrap"
                                    >
                                        <svg className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        Add Requirements
                                    </button>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            try {
                                                setShowMenu(false);
                                                const officeId = office?.id || office?.OfficeID;
                                                if (!officeId) return;
                                                const officeName = office?.office_name || office?.OfficeName || `office-${officeId}`;
                                                const { url, fileName } = await officesAPI.exportOfficeExcel(officeId, officeName);
                                                const link = document.createElement('a');
                                                link.href = url;
                                                link.download = fileName;
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                                setTimeout(() => window.URL.revokeObjectURL(url), 200);
                                            } catch (err) {
                                                console.error('Export failed', err);
                                                alert(err?.message || 'Failed to export office');
                                            }
                                        }}
                                        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-xs text-slate-700 transition hover:bg-slate-50 whitespace-nowrap"
                                    >
                                        <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        Export Excel
                                    </button>
                                    <div className="my-1 border-t border-slate-100" />
                                    <button
                                        type="button"
                                        onClick={async () => { setShowMenu(false); await onDeleteOffice?.(office); }}
                                        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-xs text-rose-600 transition hover:bg-rose-50 whitespace-nowrap"
                                    >
                                        <svg className="h-4 w-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
                                        </svg>
                                        Delete Office
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                        aria-label="Close"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
