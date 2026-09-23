import RowActionMenu from './RowActionMenu';
import { formatDateTime } from '../../utils/formatDateTime';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';

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
            className="bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-xl shadow-sm cursor-pointer transition-all flex items-center gap-3"
            onClick={onToggle}
        >
            {showCheckbox && (
                <input
                    type="checkbox"
                    checked={isChecked}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onToggleSelect?.(e.target.checked)}
                    className="h-4 w-4 accent-white cursor-pointer"
                />
            )}
            {isExpanded ? (
                <ChevronDown className="h-5 w-5 shrink-0 text-white transition-transform" />
            ) : (
                <ChevronRight className="h-5 w-5 shrink-0 text-white transition-transform" />
            )}
            <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm truncate block">
                    {(() => {
                        const code = String(criteria.CriteriaCode || '').trim().replace(/\.$/, '');
                        const name = criteria.CriteriaName || '';
                        return code ? `${code}. ${name}` : name;
                    })()}
                </span>
                <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-blue-100">
                    <span>Created: {formatDateTime(criteria.CreatedAt)}</span>
                    <span>Updated: {formatDateTime(criteria.UpdatedAt || criteria.CreatedAt)}</span>
                </div>
            </div>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-white opacity-75" />}
            <RowActionMenu
                onEdit={handleEdit ? () => handleEdit(criteria) : undefined}
                onDelete={onDeleteClick ? () => onDeleteClick(criteria) : undefined}
                buttonClassName="office-card-actions-button inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/60 bg-white/10 text-white transition hover:border-white hover:bg-white/20 shadow-2xs"
            />
        </div>
    );
}

