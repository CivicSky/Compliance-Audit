import RowActionMenu from './RowActionMenu';

export default function CriteriaItem({
    criteria,
    isExpanded,
    onToggle,
    loading,
    showCheckbox = false,
    isChecked = false,
    onToggleSelect
    ,
    onMenuClick,
    onDeleteClick,
    onEditClick
}) {
    const handleEdit = onEditClick || onMenuClick;
    return (
        <div
            className="bg-indigo-500 text-white p-3 rounded-lg cursor-pointer hover:bg-indigo-600 transition flex items-center gap-3"
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
            <div className="flex-1 min-w-0">
                <span className="font-semibold text-lg truncate block">
                    {(() => {
                        const code = String(criteria.CriteriaCode || '').trim().replace(/\.$/, '');
                        const name = criteria.CriteriaName || '';
                        return code ? `${code}. ${name}` : name;
                    })()}
                </span>
            </div>
            {loading && <span className="text-xs opacity-75">⏳</span>}
            <RowActionMenu
                onEdit={handleEdit ? () => handleEdit(criteria) : undefined}
                onDelete={onDeleteClick ? () => onDeleteClick(criteria) : undefined}
            />
        </div>
    );
}
