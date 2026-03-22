export default function AreaItem({
    area,
    isExpanded,
    onToggle,
    loading,
    showCheckbox = false,
    isChecked = false,
    onToggleSelect
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
        </div>
    );
}
