import CriteriaItem from './Criteria';

export default function CriteriaSection({
    criteria,
    isExpanded,
    onToggle,
    loading,
    showCheckbox,
    isChecked,
    onToggleSelect,
    onMenuClick,
    children
}) {
    return (
        <div className="relative my-3">
            <span className="absolute -left-5 top-6 w-4 h-1 bg-purple-300 rounded-r-full" />
            <CriteriaItem
                criteria={criteria}
                isExpanded={isExpanded}
                onToggle={onToggle}
                loading={loading}
                showCheckbox={showCheckbox}
                isChecked={isChecked}
                onToggleSelect={onToggleSelect}
                onMenuClick={onMenuClick}
            />
            {isExpanded && children}
        </div>
    );
}
