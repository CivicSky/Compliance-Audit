import AreaItem from './Area';

export default function AreaSection({
    area,
    isExpanded,
    onToggle,
    loading,
    showCheckbox,
    isChecked,
    onToggleSelect,
    onMenuClick,
    onDeleteClick,
    children
}) {
    return (
        <div className="mb-3">
            <AreaItem
                area={area}
                isExpanded={isExpanded}
                onToggle={onToggle}
                loading={loading}
                showCheckbox={showCheckbox}
                isChecked={isChecked}
                onToggleSelect={onToggleSelect}
                onMenuClick={onMenuClick}
                onDeleteClick={onDeleteClick}
            />
            {isExpanded && children}
        </div>
    );
}
