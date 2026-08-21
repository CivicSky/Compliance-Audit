import RowActionMenu from './RowActionMenu';
import { formatDateTime } from '../../utils/formatDateTime';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';

export default function AreaItem({
    area,
    isExpanded,
    onToggle,
    loading,
    showCheckbox = false,
    isChecked = false,
    onToggleSelect,
    onMenuClick,
    onDeleteClick,
    onEditClick,
    isAssigned,
    isAuditor
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
            {isExpanded ? (
                <ChevronDown className="h-5 w-5 shrink-0 text-white transition-transform" />
            ) : (
                <ChevronRight className="h-5 w-5 shrink-0 text-white transition-transform" />
            )}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate block">
                        {`${area.AreaCode || ''}: ${area.AreaName || ''}`}
                    </span>
                    {isAssigned && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-600/90 px-2 py-0.5 text-[9px] font-bold text-white border border-emerald-500/30 shadow-2xs whitespace-nowrap">
                            ✓ Assigned to you
                        </span>
                    )}
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-blue-100">
                    <span>Created: {formatDateTime(area.CreatedAt)}</span>
                    <span>Updated: {formatDateTime(area.UpdatedAt || area.CreatedAt)}</span>
                </div>
            </div>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-white opacity-75" />}
            <RowActionMenu
                onEdit={handleEdit ? () => handleEdit(area) : undefined}
                onDelete={onDeleteClick ? () => onDeleteClick(area) : undefined}
                buttonClassName="office-card-actions-button inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 border-white/90 bg-transparent text-white transition hover:border-white hover:bg-white/10"
            />
        </div>
    );
}
