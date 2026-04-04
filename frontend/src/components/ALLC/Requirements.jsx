export default function RequirementItem({
    requirement,
    showCheckbox = false,
    isChecked = false,
    onToggleSelect
    ,
    onMenuClick
}) {
    return (
        <div className="bg-blue-100 border-l-4 border-blue-500 p-3 rounded flex items-start gap-3">
            {showCheckbox && (
                <input
                    type="checkbox"
                    checked={isChecked}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onToggleSelect?.(e.target.checked)}
                    className="h-4 w-4 mt-1 accent-blue-600"
                />
            )}
            <div className="flex-1">
                <p className="font-medium text-gray-800">{requirement.RequirementCode}</p>
                <p className="text-sm text-gray-600">{requirement.Description}</p>
            </div>
            <button
                onClick={(e) => { e.stopPropagation(); onMenuClick?.(requirement); }}
                aria-label="Edit"
                className="text-gray-700 hover:text-gray-900 px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.25 2.25 0 1 1 3.182 3.182L7.5 19.213l-4.5 1.125 1.125-4.5L16.862 3.487Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125 16.875 4.5" />
                </svg>
            </button>
        </div>
    );
}
