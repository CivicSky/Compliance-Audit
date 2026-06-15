import React from 'react';

const FILTER_OPTIONS = [
    { value: 'all', label: 'All statuses', dot: 'bg-slate-400' },
    { value: 'complied', label: 'Complied', dot: 'bg-emerald-500' },
    { value: 'partially', label: 'Partial', dot: 'bg-amber-500' },
    { value: 'not-complied', label: 'Not Complied', dot: 'bg-rose-500' },
];

export default function RequirementsToolbar({
    showStatusDropdown,
    setShowStatusDropdown,
    statusFilter,
    setStatusFilter,
    searchTerm,
    setSearchTerm,
}) {
    const activeLabel = FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label || 'All statuses';

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200/90 bg-app-surface px-5 py-3">
            <div>
                <h3 className="text-sm font-semibold text-slate-800">Requirements</h3>
                <p className="text-[11px] text-slate-500">Browse areas, criteria, and compliance items</p>
            </div>
            <div className="flex items-center gap-2">
                <div className="relative status-dropdown">
                    <button
                        type="button"
                        onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                        className="flex items-center gap-2 rounded-xl border border-slate-300/70 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-200/50"
                    >
                        <span>{activeLabel}</span>
                        <svg className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {showStatusDropdown && (
                        <div className="absolute right-0 top-full z-20 mt-1.5 w-44 overflow-hidden rounded-xl border border-slate-300/70 bg-slate-100 py-1 shadow-xl shadow-slate-400/30">
                            {FILTER_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        setStatusFilter(option.value);
                                        setShowStatusDropdown(false);
                                    }}
                                    className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs transition hover:bg-slate-50 ${
                                        statusFilter === option.value ? 'bg-indigo-50/80 font-medium text-indigo-800' : 'text-slate-700'
                                    }`}
                                >
                                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${option.dot}`} />
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="relative">
                    <input
                        type="search"
                        placeholder="Search requirements..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-52 rounded-xl border border-slate-300/70 bg-slate-200/40 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-500 transition focus:border-indigo-400 focus:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <svg className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>
        </div>
    );
}
