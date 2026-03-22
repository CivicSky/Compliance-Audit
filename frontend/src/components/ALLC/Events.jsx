export default function EventItem({ event, isExpanded, onToggle, loading }) {
    return (
        <div
            className="bg-blue-600 text-white p-4 rounded-lg cursor-pointer hover:bg-blue-700 transition flex items-center gap-3"
            onClick={onToggle}
        >
            <span className="text-xl">{isExpanded ? '▼' : '▶'}</span>
            <span className="font-semibold flex-1">{event.EventName}</span>
            <span className="text-xs opacity-75">{event.EventCode}</span>
            {loading && <span className="text-xs opacity-75">⏳</span>}
        </div>
    );
}
