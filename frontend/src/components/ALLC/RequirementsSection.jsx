import RequirementItem from './Requirements';

export default function RequirementsSection({
    requirements,
    isLoading = false,
    showCheckbox = false,
    selectedRequirementIds = new Set(),
    onToggleRequirement
}) {
    if (isLoading) {
        return <p className="text-gray-500 text-sm ml-4 my-2">Loading requirements...</p>;
    }

    if (!requirements || requirements.length === 0) {
        return <p className="text-gray-500 text-sm ml-4 my-2">No requirements</p>;
    }

    return (
        <div className="relative ml-6 pl-6 my-3">
            <span className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400 rounded-full" />
            <div className="space-y-2">
                {requirements.map((req) => (
                    <div key={req.RequirementID} className="relative">
                        <span className="absolute -left-6 top-6 w-5 h-1 bg-blue-400 rounded-r-full" />
                        <RequirementItem
                            requirement={req}
                            showCheckbox={showCheckbox}
                            isChecked={selectedRequirementIds.has(Number(req.RequirementID))}
                            onToggleSelect={(checked) => onToggleRequirement?.(req, checked)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
