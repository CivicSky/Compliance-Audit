import { useState } from 'react';
import AreaSection from './AreaSection';
import CriteriaSection from './CriteriaSection';
import RequirementsSection from './RequirementsSection';
import AddAreaPop from './addareapop';

export default function EventPopup({
    selectedEvent,
    areasData,
    criteriaData,
    requirementsData,
    noAreaCriteriaData,
    criteriaOptions,
    expandedAreas,
    expandedCriteria,
    expandedNoArea,
    loadingAreas,
    loadingCriteria,
    loadingRequirements,
    loadingNoAreaCriteria,
    onClose,
    onToggleArea,
    onToggleCriteria,
    onToggleNoArea,
    onAddArea,
    onAddNoAreaCriteria,
    onAddCriteria,
    onAddRequirement,
    onLoadRequirementsByCriteria,
    onEditArea,
    onBulkDelete
}) {
    const [isActionOpen, setIsActionOpen] = useState(false);
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
    const [deleteMode, setDeleteMode] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAreaIds, setSelectedAreaIds] = useState(new Set());
    const [selectedCriteriaIds, setSelectedCriteriaIds] = useState(new Set());
    const [selectedRequirementIds, setSelectedRequirementIds] = useState(new Set());
    if (!selectedEvent) return null;

    const normalizedSearch = searchTerm.trim().toLowerCase();
    const hasSearch = normalizedSearch.length > 0;

    const matchesSearch = (...values) => {
        if (!hasSearch) return true;
        return values.some(value => String(value || '').toLowerCase().includes(normalizedSearch));
    };

    const getFilteredRequirementsForCriteria = (criteriaId) => {
        const requirements = requirementsData[criteriaId] || [];
        if (!hasSearch) return requirements;
        return requirements.filter(req =>
            matchesSearch(req.RequirementCode, req.Description)
        );
    };

    const getFilteredCriteria = (criteriaList = []) => {
        if (!hasSearch) return criteriaList;
        return criteriaList.filter(crit => {
            const matchingRequirements = getFilteredRequirementsForCriteria(crit.CriteriaID);
            return (
                matchesSearch(crit.CriteriaCode, crit.CriteriaName, crit.Description) ||
                matchingRequirements.length > 0
            );
        });
    };

    const allAreasForEvent = areasData[selectedEvent.EventID] || [];
    const visibleAreas = allAreasForEvent.filter(area => {
        if (!hasSearch) return true;
        const matchingCriteria = getFilteredCriteria(criteriaData[area.AreaID] || []);
        return (
            matchesSearch(area.AreaCode, area.AreaName, area.Description) ||
            matchingCriteria.length > 0
        );
    });

    const noAreaCriteriaAll = noAreaCriteriaData[selectedEvent.EventID] || [];
    const visibleNoAreaCriteria = getFilteredCriteria(noAreaCriteriaAll);
    const hasAnyVisibleResults = visibleAreas.length > 0 || visibleNoAreaCriteria.length > 0;

    const resetSelection = () => {
        setSelectedAreaIds(new Set());
        setSelectedCriteriaIds(new Set());
        setSelectedRequirementIds(new Set());
    };

    const enterDeleteMode = () => {
        setDeleteMode(true);
        setDeleteError('');
        setIsActionMenuOpen(false);
        setIsActionOpen(false);
        resetSelection();
    };

    const exitDeleteMode = () => {
        setDeleteMode(false);
        setDeleteError('');
        resetSelection();
    };

    const toggleRequirementSelect = (requirement, checked) => {
        const reqId = Number(requirement.RequirementID);
        setSelectedRequirementIds(prev => {
            const next = new Set(prev);
            if (checked) next.add(reqId);
            else next.delete(reqId);
            return next;
        });
    };

    const toggleCriteriaSelect = (criteria, checked) => {
        const criteriaId = Number(criteria.CriteriaID);
        const requirementIds = (requirementsData[criteriaId] || []).map(req => Number(req.RequirementID));

        setSelectedCriteriaIds(prev => {
            const next = new Set(prev);
            if (checked) next.add(criteriaId);
            else next.delete(criteriaId);
            return next;
        });

        setSelectedRequirementIds(prev => {
            const next = new Set(prev);
            requirementIds.forEach(reqId => {
                if (checked) next.add(reqId);
                else next.delete(reqId);
            });
            return next;
        });
    };

    const toggleAreaSelect = (area, checked) => {
        const areaId = Number(area.AreaID);
        const criteria = criteriaData[areaId] || [];
        const criteriaIds = criteria.map(crit => Number(crit.CriteriaID));
        const requirementIds = criteria.flatMap(crit =>
            (requirementsData[Number(crit.CriteriaID)] || []).map(req => Number(req.RequirementID))
        );

        setSelectedAreaIds(prev => {
            const next = new Set(prev);
            if (checked) next.add(areaId);
            else next.delete(areaId);
            return next;
        });

        setSelectedCriteriaIds(prev => {
            const next = new Set(prev);
            criteriaIds.forEach(criteriaId => {
                if (checked) next.add(criteriaId);
                else next.delete(criteriaId);
            });
            return next;
        });

        setSelectedRequirementIds(prev => {
            const next = new Set(prev);
            requirementIds.forEach(reqId => {
                if (checked) next.add(reqId);
                else next.delete(reqId);
            });
            return next;
        });
    };

    const deleteCount = selectedAreaIds.size + selectedCriteriaIds.size + selectedRequirementIds.size;

    const handleBulkDelete = async () => {
        if (deleteCount === 0 || deleting) return;
        const confirmed = window.confirm('Delete selected items? This action cannot be undone.');
        if (!confirmed) return;

        try {
            setDeleting(true);
            setDeleteError('');
            await onBulkDelete?.({
                eventId: selectedEvent.EventID,
                areaIds: Array.from(selectedAreaIds),
                criteriaIds: Array.from(selectedCriteriaIds),
                requirementIds: Array.from(selectedRequirementIds)
            });
            exitDeleteMode();
        } catch (err) {
            setDeleteError(err?.message || 'Failed to delete selected items.');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 left-60">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                <div className="p-8 pb-5 border-b border-gray-200 bg-white">
                    <div className="flex justify-between items-start gap-4">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-800">{selectedEvent.EventName}</h2>
                            <p className="text-gray-600 mt-1">{selectedEvent.EventCode}</p>
                        </div>
                        <div className="relative flex items-center gap-2 ml-4">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search..."
                                className="w-64 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                            />
                            <button
                                onClick={() => setIsActionMenuOpen(prev => !prev)}
                                className="text-gray-500 hover:text-gray-700 text-2xl font-bold px-2"
                                title="More actions"
                            >
                                ⋯
                            </button>
                            {isActionMenuOpen && (
                                <div className="absolute right-12 top-10 z-20 bg-white border border-gray-200 rounded-md shadow-lg min-w-[170px] py-1">
                                    <button
                                        onClick={() => {
                                            setIsActionOpen(true);
                                            setIsActionMenuOpen(false);
                                        }}
                                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        Manage Structure
                                    </button>
                                    <button
                                        onClick={enterDeleteMode}
                                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                    >
                                        Delete Items
                                    </button>
                                </div>
                            )}
                            <button
                                onClick={onClose}
                                className="text-gray-500 hover:text-gray-700 text-2xl font-bold flex-shrink-0"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                </div>

                {deleteMode && (
                    <div className="flex items-center justify-between px-8 py-3 bg-red-50 border-b border-red-200">
                        <p className="text-sm text-red-700">
                            Delete mode active. Select areas, criteria, or requirements then click delete.
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={exitDeleteMode}
                                className="px-3 py-1.5 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                disabled={deleteCount === 0 || deleting}
                                className="px-3 py-1.5 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {deleting ? 'Deleting...' : `Delete (${deleteCount})`}
                            </button>
                        </div>
                    </div>
                )}
                {deleteMode && deleteError && (
                    <div className="px-8 py-2 bg-red-100 border-b border-red-200 text-sm text-red-700">
                        {deleteError}
                    </div>
                )}

                {/* Hierarchy inside modal */}
                <div className="overflow-y-auto px-8 pb-8">
                <div className="mt-6">
                    {loadingAreas.has(selectedEvent.EventID) ? (
                        <div className="text-center text-gray-500">Loading areas...</div>
                    ) : allAreasForEvent.length === 0 ? (
                        <div className="text-center text-gray-500">No areas found for this event</div>
                    ) : hasSearch && !hasAnyVisibleResults ? (
                        <div className="text-center text-gray-500">No matching results</div>
                    ) : (
                        <div className="space-y-3">
                            {visibleAreas.map((area) => {
                                const areaCriteria = getFilteredCriteria(criteriaData[area.AreaID] || []);
                                return (
                                <AreaSection
                                    key={area.AreaID}
                                    area={area}
                                    isExpanded={expandedAreas.has(area.AreaID)}
                                    onToggle={() => onToggleArea(area.AreaID)}
                                    loading={loadingCriteria.has(area.AreaID)}
                                    showCheckbox={deleteMode}
                                    isChecked={selectedAreaIds.has(Number(area.AreaID))}
                                    onToggleSelect={(checked) => toggleAreaSelect(area, checked)}
                                >
                                    {loadingCriteria.has(area.AreaID) ? (
                                        <p className="text-xs text-gray-500 ml-4 mt-2">Loading criteria...</p>
                                    ) : areaCriteria.length === 0 ? (
                                        <p className="text-xs text-gray-500 ml-4 mt-2">
                                            {hasSearch ? 'No matching criteria' : 'No criteria'}
                                        </p>
                                    ) : (
                                        <div className="relative mt-3 ml-6 pl-5">
                                            <span className="absolute left-0 top-0 bottom-0 w-1 bg-purple-300 rounded-full" />
                                            <div className="space-y-2">
                                                {areaCriteria.map((crit) => (
                                                    <CriteriaSection
                                                        key={crit.CriteriaID}
                                                        criteria={crit}
                                                        isExpanded={expandedCriteria.has(crit.CriteriaID)}
                                                        onToggle={() => onToggleCriteria(crit.CriteriaID)}
                                                        loading={loadingRequirements.has(crit.CriteriaID)}
                                                        showCheckbox={deleteMode}
                                                        isChecked={selectedCriteriaIds.has(Number(crit.CriteriaID))}
                                                        onToggleSelect={(checked) => toggleCriteriaSelect(crit, checked)}
                                                    >
                                                        <RequirementsSection
                                                            requirements={getFilteredRequirementsForCriteria(crit.CriteriaID)}
                                                            isLoading={loadingRequirements.has(crit.CriteriaID)}
                                                            showCheckbox={deleteMode}
                                                            selectedRequirementIds={selectedRequirementIds}
                                                            onToggleRequirement={toggleRequirementSelect}
                                                        />
                                                    </CriteriaSection>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </AreaSection>
                                );
                            })}

                            <div className="mt-6">
                                <div
                                    className="bg-slate-600 text-white p-4 rounded-lg flex items-center justify-between cursor-pointer hover:bg-slate-700 transition"
                                    onClick={onToggleNoArea}
                                >
                                    <div>
                                        <h3 className="font-semibold flex items-center gap-2">
                                            <span>{expandedNoArea.has(selectedEvent.EventID) ? '▼' : '▶'}</span>
                                            <span>No Area Assigned</span>
                                        </h3>
                                        <p className="text-xs text-slate-200 mt-1">Criteria without area assignment</p>
                                    </div>
                                    <span className="text-xs px-2 py-1 rounded bg-slate-500 text-slate-100">
                                        {visibleNoAreaCriteria.length} criteria
                                    </span>
                                </div>

                                {expandedNoArea.has(selectedEvent.EventID) && loadingNoAreaCriteria.has(selectedEvent.EventID) ? (
                                    <p className="text-xs text-gray-500 ml-4 mt-2">Loading no-area criteria...</p>
                                ) : expandedNoArea.has(selectedEvent.EventID) && visibleNoAreaCriteria.length === 0 ? (
                                    <p className="text-xs text-gray-500 ml-4 mt-2">
                                        {hasSearch ? 'No matching criteria without area' : 'No criteria without area'}
                                    </p>
                                ) : expandedNoArea.has(selectedEvent.EventID) ? (
                                    <div className="relative mt-3 ml-6 pl-5">
                                        <span className="absolute left-0 top-0 bottom-0 w-1 bg-purple-300 rounded-full" />
                                        <div className="space-y-2">
                                            {visibleNoAreaCriteria.map((crit) => (
                                                <CriteriaSection
                                                    key={crit.CriteriaID}
                                                    criteria={crit}
                                                    isExpanded={expandedCriteria.has(crit.CriteriaID)}
                                                    onToggle={() => onToggleCriteria(crit.CriteriaID)}
                                                    loading={loadingRequirements.has(crit.CriteriaID)}
                                                    showCheckbox={deleteMode}
                                                    isChecked={selectedCriteriaIds.has(Number(crit.CriteriaID))}
                                                    onToggleSelect={(checked) => toggleCriteriaSelect(crit, checked)}
                                                >
                                                    <RequirementsSection
                                                        requirements={getFilteredRequirementsForCriteria(crit.CriteriaID)}
                                                        isLoading={loadingRequirements.has(crit.CriteriaID)}
                                                        showCheckbox={deleteMode}
                                                        selectedRequirementIds={selectedRequirementIds}
                                                        onToggleRequirement={toggleRequirementSelect}
                                                    />
                                                </CriteriaSection>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    )}
                </div>
                </div>
            </div>

            <AddAreaPop
                isOpen={isActionOpen}
                onClose={() => setIsActionOpen(false)}
                event={selectedEvent}
                areas={areasData[selectedEvent.EventID] || []}
                criteriaOptions={criteriaOptions}
                onAddArea={onAddArea}
                onAddNoAreaCriteria={onAddNoAreaCriteria}
                onAddCriteria={onAddCriteria}
                onAddRequirement={onAddRequirement}
                onLoadRequirementsByCriteria={onLoadRequirementsByCriteria}
                onEditArea={onEditArea}
            />
        </div>
    );
}
