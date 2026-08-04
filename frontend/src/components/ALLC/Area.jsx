import RowActionMenu from './RowActionMenu';
import { formatDateTime } from '../../utils/formatDateTime';

export default function AreaItem({
    area,
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
            className="bg-blue-500 text-white p-3 rounded-lg cursor-pointer hover:bg-blue-600 transition flex items-center gap-3"
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
                <span className="font-medium truncate block">
                    {`${area.AreaCode || ''}: ${area.AreaName || ''}`}
                </span>
                <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-blue-100">
                    <span>Created: {formatDateTime(area.CreatedAt)}</span>
                    <span>Updated: {formatDateTime(area.UpdatedAt || area.CreatedAt)}</span>
                </div>
            </div>
            {loading && <span className="text-xs opacity-75">⏳</span>}
            <RowActionMenu
                onEdit={handleEdit ? () => handleEdit(area) : undefined}
                onDelete={onDeleteClick ? () => onDeleteClick(area) : undefined}
                buttonClassName="office-card-actions-button inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 border-white/90 bg-transparent text-white transition hover:border-white hover:bg-white/10"
            />
        </div>
    );
}
