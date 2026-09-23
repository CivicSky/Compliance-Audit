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
        <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-3.5 flex items-start gap-3 shadow-2xs">
            {showCheckbox && (
                <input
                    type="checkbox"
                    checked={isChecked}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onToggleSelect?.(e.target.checked)}
                    className="h-4 w-4 mt-1 accent-blue-600 cursor-pointer"
                />
            )}
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs text-slate-900">{requirement.RequirementCode}</p>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{requirement.Description}</p>
                <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] text-slate-400">
                    <span>Created: {formatDateTime(requirement.CreatedAt)}</span>
                    <span>Updated: {formatDateTime(requirement.UpdatedAt || requirement.CreatedAt)}</span>
                </div>
            </div>
            <RowActionMenu
                onEdit={handleEdit ? () => handleEdit(requirement) : undefined}
                onDelete={onDeleteClick ? () => onDeleteClick(requirement) : undefined}
                buttonClassName="office-card-actions-button inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 shadow-2xs"
            />
        </div>
    );
}
