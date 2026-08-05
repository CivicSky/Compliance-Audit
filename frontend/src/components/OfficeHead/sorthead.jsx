import React, { useState, useRef, useEffect } from 'react';

export default function Sortoffice({ value = 'name', onChange }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const onDocClick = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, []);

    return (
        <div className="relative inline-block" ref={ref}>
            <button
                onClick={() => setOpen(v => !v)}
                className="relative h-8 min-w-[146px] appearance-none rounded-md border border-slate-200 bg-white px-4 text-[10px] font-medium leading-4 text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
                title="Filter by assignment"
                aria-label={`Filter: ${value === 'name' ? 'All' : value === 'assigned' ? 'Assigned' : 'Unassigned'}`}
            >
                <span className="block text-center truncate">{value === 'name' ? 'All Personnel' : value === 'assigned' ? 'Assigned' : 'Unassigned'}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-slate-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                </svg>
            </button>

            {open && (
                <div className="absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                    <button
                        onClick={() => { onChange('name'); setOpen(false); }}
                        className={`w-full px-2.5 py-1.5 text-center text-[8px] transition ${value === 'name' ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                        All Personnel
                    </button>
                    <button
                        onClick={() => { onChange('assigned'); setOpen(false); }}
                        className={`w-full px-2.5 py-1.5 text-center text-[8px] transition ${value === 'assigned' ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                        Assigned
                    </button>
                    <button
                        onClick={() => { onChange('unassigned'); setOpen(false); }}
                        className={`w-full px-2.5 py-1.5 text-center text-[8px] transition ${value === 'unassigned' ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                        Unassigned
                    </button>
                </div>
            )}
        </div>
    );
}
