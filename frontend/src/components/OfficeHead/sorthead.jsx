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
                className="flex h-7 items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-[8px] text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                title="Filter by assignment"
                aria-label={`Filter: ${value === 'name' ? 'All' : value === 'assigned' ? 'Assigned' : 'Unassigned'}`}
                style={{ width: '140px' }}
            >
                <span className="flex items-center justify-center gap-1 whitespace-nowrap overflow-hidden">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 flex-shrink-0 text-slate-600" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M3 5a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-.293.707L12 13.414V17a1 1 0 01-1.447.894L7 15H4a1 1 0 01-1-1V5z" />
                    </svg>
                    <span className="font-normal">{value === 'name' ? 'All Personnel' : value === 'assigned' ? 'Assigned' : 'Unassigned'}</span>
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" className="ml-1 h-2.5 w-2.5 flex-shrink-0 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                </svg>
            </button>

            {open && (
                <div className="absolute right-0 z-50 mt-2 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
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
