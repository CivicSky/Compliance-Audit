import { useState, useRef } from "react";
import EventOptionsPopup from "./eventsoptions";

export default function EventCard({ event, onClick, onEdit, onCopy }) {
    const [showOptions, setShowOptions] = useState(false);
    const dotBtnRef = useRef(null);

    return (
        <div
            key={event.EventID}
            className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition cursor-pointer border-l-4 border-blue-500 h-44 md:h-48 flex flex-col justify-between relative"
            onClick={onClick}
        >
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1 line-clamp-2">{event.EventName}</h3>
                    <p className="text-xs text-gray-600">{event.EventCode}</p>
                </div>
                <button
                    ref={dotBtnRef}
                    className="ml-2 p-1 rounded-full hover:bg-gray-100 focus:outline-none"
                    onClick={e => { e.stopPropagation(); setShowOptions(v => !v); }}
                    aria-label="More options"
                >
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <circle cx="5" cy="12" r="1.5" />
                        <circle cx="12" cy="12" r="1.5" />
                        <circle cx="19" cy="12" r="1.5" />
                    </svg>
                </button>
                {showOptions && (
                    <EventOptionsPopup
                        onEdit={() => onEdit?.(event)}
                        onCopy={() => onCopy?.(event)}
                        onClose={() => setShowOptions(false)}
                        anchorRef={dotBtnRef}
                    />
                )}
            </div>
            <p className="text-xs text-gray-500">Click to view hierarchy</p>
        </div>
    );
}
