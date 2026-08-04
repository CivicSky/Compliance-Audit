import RowActionMenu from './RowActionMenu';
import { formatDateTime } from '../../utils/formatDateTime';

export default function RequirementItem({
    requirement,
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
                <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-slate-500">
                    <span>Created: {formatDateTime(requirement.CreatedAt)}</span>
                    <span>Updated: {formatDateTime(requirement.UpdatedAt || requirement.CreatedAt)}</span>
                </div>
            </div>
            <RowActionMenu
                onEdit={handleEdit ? () => handleEdit(requirement) : undefined}
                onDelete={onDeleteClick ? () => onDeleteClick(requirement) : undefined}
                buttonClassName="office-card-actions-button inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 border-gray-300 bg-white text-gray-500 transition hover:border-gray-400 hover:bg-gray-100"
            />
        </div>
    );
}
