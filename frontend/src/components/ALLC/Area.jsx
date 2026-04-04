export default function AreaItem({
    area,
    isExpanded,
    onToggle,
    loading,
    showCheckbox = false,
    isChecked = false,
    onToggleSelect
    ,
    onMenuClick
}) {
    return (
        <div
            className="bg-purple-500 text-white p-3 rounded-lg cursor-pointer hover:bg-purple-600 transition flex items-center gap-3"
            onClick={onToggle}
        >
            {showCheckbox && (
                <input
                    type="checkbox"
                    checked={isChecked}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onToggleSelect?.(e.target.checked)}
                    className="h-4 w-4 accent-white"
                />
            )}
            <span className="text-lg">{isExpanded ? '▼' : '▶'}</span>
            <span className="font-medium flex-1 truncate">
                {`${area.AreaCode || ''}: ${area.AreaName || ''}`}
            </span>
            {loading && <span className="text-xs opacity-75">⏳</span>}
            <button
                onClick={(e) => { e.stopPropagation(); onMenuClick?.(area); }}
                aria-label="Edit"
                className="text-white hover:text-gray-200 px-3 py-1 rounded bg-white/10 hover:bg-white/20"
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.25 2.25 0 1 1 3.182 3.182L7.5 19.213l-4.5 1.125 1.125-4.5L16.862 3.487Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125 16.875 4.5" />
                </svg>
            </button>
        </div>
    );
}
