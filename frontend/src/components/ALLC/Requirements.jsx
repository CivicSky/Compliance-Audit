export default function RequirementItem({
    requirement,
    showCheckbox = false,
    isChecked = false,
    onToggleSelect
}) {
    return (
        <div className="bg-blue-100 border-l-4 border-blue-500 p-3 rounded flex items-start gap-3">
            {showCheckbox && (
                <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => onToggleSelect?.(e.target.checked)}
                    className="h-4 w-4 mt-1 accent-blue-600"
                />
            )}
            <div className="flex-1">
                <p className="font-medium text-gray-800">{requirement.RequirementCode}</p>
                <p className="text-sm text-gray-600">{requirement.Description}</p>
            </div>
        </div>
    );
}
