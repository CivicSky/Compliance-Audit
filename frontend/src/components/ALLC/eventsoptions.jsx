import { useRef, useEffect } from "react";

export default function EventOptionsPopup({ onEdit, onCopy, onClose, anchorRef }) {
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
        <div ref={popupRef} className="absolute right-2 top-10 z-50 bg-white border border-gray-200 rounded shadow-md w-32">
            <button
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                onClick={() => { onEdit(); onClose(); }}
            >
                Edit
            </button>
            <button
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                onClick={() => { onCopy(); onClose(); }}
            >
                Copy
            </button>
        </div>
    );
}
