import { useRef, useEffect } from "react";

export default function EventOptionsPopup({ onEdit, onCopy, onDelete, onClose, anchorRef }) {
    // Close popup if clicked outside
    const popupRef = useRef(null);
    useEffect(() => {
        function handleClickOutside(event) {
            if (popupRef.current && !popupRef.current.contains(event.target) && !anchorRef?.current?.contains(event.target)) {
                onClose();
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose, anchorRef]);

    return (
        <div ref={popupRef} className="absolute right-0 top-10 z-50 w-[220px] overflow-hidden rounded-lg border border-gray-100 bg-white py-1 shadow-lg">
            <button
                className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-xs text-slate-700 transition hover:bg-blue-50 whitespace-nowrap"
                onClick={() => { onEdit(); onClose(); }}
            >
                <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Edit</span>
            </button>
            <button
                className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-xs text-slate-700 transition hover:bg-emerald-50 whitespace-nowrap"
                onClick={() => { onCopy(); onClose(); }}
            >
                <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h12v12H4z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 8h12v12H8z" />
                </svg>
                <span>Copy</span>
            </button>
            <button
                className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-xs text-red-600 transition hover:bg-red-50 whitespace-nowrap"
                onClick={() => { onDelete?.(); onClose(); }}
            >
                <svg className="h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
                </svg>
                <span>Delete</span>
            </button>
        </div>
    );
}

