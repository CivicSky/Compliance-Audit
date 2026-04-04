import { useState, useRef } from "react";
import EventOptionsPopup from "./eventsoptions";

export default function EventCard({ event, onClick, onEdit, onCopy, onDelete, showCheckbox = false, isChecked = false, onToggleSelect, isAdmin = false }) {
    const [showOptions, setShowOptions] = useState(false);
    const dotBtnRef = useRef(null);

    return (
        <div
            key={event.EventID}
            className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-white via-white to-slate-50 p-3 md:p-4 min-h-[240px] transition duration-200 ${showCheckbox ? 'cursor-default' : 'cursor-pointer hover:border-cyan-200 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.12)]'} shadow-[0_6px_14px_rgba(15,23,42,0.08)]`} 
            onClick={onClick}
        >
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-cyan-100/70" />

            {/* animated checkbox (appears after content slides) */}
            <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => { e.stopPropagation(); onToggleSelect?.(event, e.target.checked); }}
                aria-label="Select event for deletion"
                style={{
                    position: 'absolute',
                    top: 12,
                    left: 12,
                    width: 18,
                    height: 18,
                    accentColor: '#dc2626',
                    // fade/scale animation with delay so it appears after slide
                    transition: 'opacity 180ms ease, transform 180ms ease',
                    transitionDelay: showCheckbox ? '180ms' : '0ms',
                    opacity: showCheckbox ? 1 : 0,
                    transform: showCheckbox ? 'scale(1) translateX(0px)' : 'scale(0.8) translateX(-6px)',
                    zIndex: 10
                }}
            />

            {/* content wrapper slides right when checkbox is shown to avoid overlap */}
            <div
                className="h-full flex flex-col"
                style={{
                    transition: 'transform 180ms ease',
                    transform: showCheckbox ? 'translateX(20px)' : 'translateX(0)'
                }}
            >
                <div className="flex items-start justify-between" style={{ paddingLeft: showCheckbox ? 4 : 0 }}>
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-700">Standard Event</p>
                        <h3 className="mt-1 text-xl font-bold leading-tight text-slate-900 line-clamp-2">{event.EventName}</h3>
                    </div>
                    {isAdmin && (
                        <>
                            <button
                                ref={dotBtnRef}
                                className="ml-3 rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:bg-slate-100 focus:outline-none"
                                onClick={e => { e.stopPropagation(); setShowOptions(v => !v); }}
                                aria-label="More options"
                            >
                                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <circle cx="12" cy="5" r="1.5" />
                                    <circle cx="12" cy="12" r="1.5" />
                                    <circle cx="12" cy="19" r="1.5" />
                                </svg>
                            </button>
                            {showOptions && (
                                <EventOptionsPopup
                                    onEdit={() => onEdit?.(event)}
                                    onCopy={() => onCopy?.(event)}
                                    onDelete={() => onDelete?.(event)}
                                    onClose={() => setShowOptions(false)}
                                    anchorRef={dotBtnRef}
                                />
                            )}
                        </>
                    )}
                </div>

                <div className="mt-3">
                    <span className="inline-flex max-w-full items-center rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 truncate">
                        {event.EventCode}
                    </span>
                </div>

                <div className="mt-auto border-t border-slate-200 pt-2.5">
                    <p className="flex items-center justify-between text-xs font-medium text-slate-600">
                        <span>Open structure</span>
                        <span className="text-slate-400">View</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
