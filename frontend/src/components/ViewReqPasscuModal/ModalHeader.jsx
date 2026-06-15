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
    return (
        <div className="relative border-b border-stone-200/90 bg-app-surface px-5 py-4">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-400" />
            <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-500/20">
                        <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                    <div className="min-w-0">
                        <h2 className="truncate text-lg font-semibold tracking-tight text-slate-900">{officeData.office_name}</h2>
                        <p className="mt-0.5 text-sm text-slate-500">{officeData.office_type_name}</p>
                        {officeData.event_name && (
                            <p className="mt-1 text-xs text-slate-400">
                                Event: {officeData.event_code || officeData.EventCode || officeData.event?.code || officeData.Event?.code || ''}
                            </p>
                        )}
                        {(officeData.DepartmentName || officeData.department_name || officeData.ProgramTypeName || officeData.program_type_name) && (
                            <p className="mt-0.5 text-xs text-slate-400">
                                {officeData.DepartmentName || officeData.department_name || ''}
                                {(officeData.DepartmentName || officeData.department_name) && (officeData.ProgramTypeName || officeData.program_type_name) ? ' · ' : ''}
                                {officeData.ProgramTypeName || officeData.program_type_name || ''}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    {isAdmin && (
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowMenu(!showMenu)}
                                className="office-card-actions-button flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
                                aria-label="Office actions"
                            >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6h.01M12 12h.01M12 18h.01" />
                                </svg>
                            </button>

                            {showMenu && (
                                <div className="office-card-actions-menu absolute right-0 top-11 z-20 w-[220px] overflow-hidden rounded-lg border border-gray-100 bg-white py-1 shadow-lg">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowMenu(false);
                                            onEditOffice(office);
                                        }}
                                        className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-xs text-slate-700 transition hover:bg-indigo-50 whitespace-nowrap"
                                    >
                                        <svg className="h-4 w-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        Edit Office Info
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowMenu(false);
                                            onAddRequirements(office);
                                        }}
                                        className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-xs text-slate-700 transition hover:bg-emerald-50 whitespace-nowrap"
                                    >
                                        <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                        className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-xs text-slate-700 transition hover:bg-gray-50 whitespace-nowrap"
                                    >
                                        <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16V6m0 0l-4 4m4-4 4 4" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21H3" />
                                        </svg>
                                        Export Excel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            setShowMenu(false);
                                            await onDeleteOffice?.(office);
                                        }}
                                        className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-xs text-red-600 transition hover:bg-red-50 whitespace-nowrap"
                                    >
                                        <svg className="h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
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
