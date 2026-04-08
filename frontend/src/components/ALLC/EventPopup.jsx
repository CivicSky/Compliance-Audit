import { useState } from 'react';
import AreaSection from './AreaSection';
import CriteriaSection from './CriteriaSection';
import RequirementsSection from './RequirementsSection';
import AddAreaPop from './addareapop';
import EditAreaModal from '../EditArea/EditArea';
import EditCriteriaModal from '../EditCriteria/EditCriteriaModal';
import EditRequirementsModal from '../EditRequirements/EditRequirementsModal';
import { usersAPI, officesAPI } from '../../utils/api';
import { useEffect } from 'react';

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
    onEditCriteria,
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
    const [isEditAreaOpen, setIsEditAreaOpen] = useState(false);
    const [editAreaData, setEditAreaData] = useState(null);
    const [isEditCriteriaOpen, setIsEditCriteriaOpen] = useState(false);
    const [editCriteriaData, setEditCriteriaData] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [isEditRequirementOpen, setIsEditRequirementOpen] = useState(false);
    const [editRequirementData, setEditRequirementData] = useState(null);
    const [offices, setOffices] = useState([]);
    const [loadingOffices, setLoadingOffices] = useState(false);
    const [officeSearch, setOfficeSearch] = useState('');
    const [selectedOfficeIdsLocal, setSelectedOfficeIdsLocal] = useState(new Set());

    useEffect(() => {
        let mounted = true;
        const fetchCurrentUser = async () => {
            try {
                const res = await usersAPI.getLoggedInUser();
                if (mounted && res) setCurrentUser(res.user || res);
            } catch (err) {
                // ignore
            }
        };
        fetchCurrentUser();
        return () => { mounted = false; };
    }, []);
    // load offices for the selected event
    useEffect(() => {
        let mounted = true;
        const load = async () => {
            if (!selectedEvent) return;
            try {
                setLoadingOffices(true);
                const all = await officesAPI.getAll();
                if (!mounted) return;
                const forEvent = (all || []).filter(o => Number(o.event_id) === Number(selectedEvent.EventID) || Number(o.EventID) === Number(selectedEvent.EventID));
                setOffices(forEvent);
            } catch (err) {
                console.error('Failed to load offices', err);
                if (mounted) setOffices([]);
            } finally {
                if (mounted) setLoadingOffices(false);
            }
        };
        load();
        return () => { mounted = false; };
    }, [selectedEvent]);
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

    const allAreasForEvent = (areasData[selectedEvent.EventID] || []).slice().sort((a, b) => {
        const aCode = String(a.AreaCode || a.AreaName || '').trim();
        const bCode = String(b.AreaCode || b.AreaName || '').trim();
        return aCode.localeCompare(bCode, undefined, { numeric: true, sensitivity: 'base' });
    });
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

    const toggleOfficeSelect = (office, checked) => {
        const id = Number(office.id || office.OfficeID || office.office_id || office.OfficeID);
        setSelectedOfficeIdsLocal(prev => {
            const next = new Set(prev);
            if (checked) next.add(id);
            else next.delete(id);
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
        <div className="fixed inset-y-0 right-0 left-0 lg:left-[var(--sidebar-width)] lg:transition-[left] lg:duration-200 lg:ease-in-out bg-black bg-opacity-50 flex items-center justify-center z-[120]">
            <div className="bg-white rounded-lg w-full max-w-4xl h-[86vh] max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                <div className="px-6 py-5 border-b border-slate-200 bg-white">
                    <div className="flex justify-between items-start gap-4">
                        <div>
                            <h2 className="text-4xl font-bold tracking-tight text-slate-900">{selectedEvent.EventCode || selectedEvent.EventName}</h2>
                            <p className="text-slate-600 mt-1">{selectedEvent.EventName || selectedEvent.EventCode}</p>
                        </div>
                        <div className="relative flex items-center gap-2 ml-4">
                            <button
                                onClick={() => setIsActionMenuOpen(prev => !prev)}
                                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                                title="More actions"
                                aria-label="More actions"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none" />
                                    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
                                    <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none" />
                                </svg>
                            </button>
                            {isActionMenuOpen && (
                                <div className="absolute right-12 top-11 z-20 bg-white border border-slate-200 rounded-xl shadow-lg min-w-[190px] py-1">
                                    <button
                                        onClick={() => {
                                            setIsActionOpen(true);
                                            setIsActionMenuOpen(false);
                                        }}
                                        className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
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
                                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                                aria-label="Close"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
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

                {/* Hierarchy + Offices sidebar inside modal */}
                <div className="flex-1 min-h-0 overflow-hidden px-6 pb-6">
                    <div className="flex gap-6 h-full min-h-[300px]">
                        <div className="w-1/3 border-r border-slate-200 pr-4 overflow-y-auto">
                            <div className="py-2">
                                <div className="sticky top-0 z-10 bg-white pt-2 pb-2">
                                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Offices</h4>
                                    <input
                                        type="text"
                                        value={officeSearch}
                                        onChange={(e) => setOfficeSearch(e.target.value)}
                                        placeholder="Search offices..."
                                        className="h-9 w-full rounded-md border border-slate-200 px-2 text-sm text-slate-700 shadow-sm focus:outline-none"
                                    />
                                </div>

                                <div className="mt-3 space-y-2 pt-2">
                                    {loadingOffices ? (
                                        <div className="text-sm text-gray-500">Loading offices...</div>
                                    ) : offices.length === 0 ? (
                                        <div className="text-sm text-gray-500">No offices for this event</div>
                                    ) : (
                                        (offices || []).filter(o => String(o.office_name || o.OfficeName || o.office_name || '').toLowerCase().includes(officeSearch.trim().toLowerCase())).map((office) => (
                                            <div
                                                key={office.id || office.OfficeID || office.office_id}
                                                className="flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm transition border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                                            >
                                                <span className="truncate">{office.office_name || office.OfficeName || office.office_name}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto pl-4">
                            <div className="sticky top-0 z-10 bg-white pt-3 pb-2">
                                <h4 className="text-sm font-semibold text-slate-700 mb-2">Areas</h4>
                                <input
                                    type="text"
                                    className="h-9 w-full rounded-md border border-slate-200 px-2 text-sm text-slate-700 shadow-sm focus:outline-none"
                                    placeholder="Search areas, criteria, or requirements..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="mt-2 pt-2">
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
                                                    onMenuClick={(item) => { setEditAreaData(item); setIsEditAreaOpen(true); }}
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
                                                                {(() => {
                                                                    // Build a tree of criteria by ParentCriteriaID
                                                                    const list = areaCriteria || [];
                                                                    const map = new Map();
                                                                    const roots = [];
                                                                    for (const c of list) {
                                                                        const id = String(c.CriteriaID);
                                                                        map.set(id, { ...c, children: [] });
                                                                    }
                                                                    for (const c of list) {
                                                                        const parentId = c.ParentCriteriaID ?? c.ParentCriteriaID;
                                                                        const id = String(c.CriteriaID);
                                                                        if (parentId === null || parentId === undefined || String(parentId) === '' ) {
                                                                            roots.push(map.get(id));
                                                                        } else {
                                                                            const p = map.get(String(parentId));
                                                                            if (p) p.children.push(map.get(id));
                                                                            else roots.push(map.get(id));
                                                                        }
                                                                    }

                                                                    const renderNode = (node, depth = 0) => (
                                                                        <CriteriaSection
                                                                            key={node.CriteriaID}
                                                                            criteria={node}
                                                                            isExpanded={expandedCriteria.has(node.CriteriaID)}
                                                                            onToggle={() => onToggleCriteria(node.CriteriaID)}
                                                                            loading={loadingRequirements.has(node.CriteriaID)}
                                                                            showCheckbox={deleteMode}
                                                                            isChecked={selectedCriteriaIds.has(Number(node.CriteriaID))}
                                                                            onToggleSelect={(checked) => toggleCriteriaSelect(node, checked)}
                                                                            onMenuClick={(c) => { setEditCriteriaData(c); setIsEditCriteriaOpen(true); }}
                                                                        >
                                                                            <div className="ml-6 space-y-2">
                                                                                {node.children && node.children.map(child => renderNode(child, depth + 1))}
                                                                                <RequirementsSection
                                                                                    requirements={getFilteredRequirementsForCriteria(node.CriteriaID)}
                                                                                    isLoading={loadingRequirements.has(node.CriteriaID)}
                                                                                    showCheckbox={deleteMode}
                                                                                    selectedRequirementIds={selectedRequirementIds}
                                                                                    onToggleRequirement={toggleRequirementSelect}
                                                                                    onMenuClick={(req) => { setEditRequirementData(req); setIsEditRequirementOpen(true); }}
                                                                                />
                                                                            </div>
                                                                        </CriteriaSection>
                                                                    );

                                                                    return roots.map(r => renderNode(r));
                                                                })()}
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
                                                        {(() => {
                                                            const list = visibleNoAreaCriteria || [];
                                                            const map = new Map();
                                                            const roots = [];
                                                            for (const c of list) {
                                                                const id = String(c.CriteriaID);
                                                                map.set(id, { ...c, children: [] });
                                                            }
                                                            for (const c of list) {
                                                                const parentId = c.ParentCriteriaID ?? c.ParentCriteriaID;
                                                                const id = String(c.CriteriaID);
                                                                if (parentId === null || parentId === undefined || String(parentId) === '' ) {
                                                                    roots.push(map.get(id));
                                                                } else {
                                                                    const p = map.get(String(parentId));
                                                                    if (p) p.children.push(map.get(id));
                                                                    else roots.push(map.get(id));
                                                                }
                                                            }

                                                            const renderNode = (node) => (
                                                                <CriteriaSection
                                                                    key={node.CriteriaID}
                                                                    criteria={node}
                                                                    isExpanded={expandedCriteria.has(node.CriteriaID)}
                                                                    onToggle={() => onToggleCriteria(node.CriteriaID)}
                                                                    loading={loadingRequirements.has(node.CriteriaID)}
                                                                    showCheckbox={deleteMode}
                                                                    isChecked={selectedCriteriaIds.has(Number(node.CriteriaID))}
                                                                    onToggleSelect={(checked) => toggleCriteriaSelect(node, checked)}
                                                                >
                                                                    <div className="ml-6 space-y-2">
                                                                        {node.children && node.children.map(child => renderNode(child))}
                                                                        <RequirementsSection
                                                                            requirements={getFilteredRequirementsForCriteria(node.CriteriaID)}
                                                                            isLoading={loadingRequirements.has(node.CriteriaID)}
                                                                            showCheckbox={deleteMode}
                                                                            selectedRequirementIds={selectedRequirementIds}
                                                                            onToggleRequirement={toggleRequirementSelect}
                                                                            onMenuClick={(req) => { setEditRequirementData(req); setIsEditRequirementOpen(true); }}
                                                                        />
                                                                    </div>
                                                                </CriteriaSection>
                                                            );

                                                            return roots.map(r => renderNode(r));
                                                        })()}
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
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

            {isEditAreaOpen && (
                <EditAreaModal
                    visible={isEditAreaOpen}
                    onClose={() => setIsEditAreaOpen(false)}
                    area={editAreaData}
                    userRole={currentUser?.RoleID}
                    onSave={async (updated) => {
                        try {
                            if (onEditArea) await onEditArea(updated.AreaID, updated);
                        } catch (err) {
                            console.error('Edit area save error', err);
                        } finally {
                            setIsEditAreaOpen(false);
                        }
                    }}
                />
            )}

            {isEditCriteriaOpen && editCriteriaData && (
                <EditCriteriaModal
                    visible={isEditCriteriaOpen}
                    onClose={() => setIsEditCriteriaOpen(false)}
                    event={editCriteriaData}
                    userRole={currentUser?.RoleID}
                    onSave={async (updated) => {
                        try {
                            if (typeof onEditCriteria === 'function') {
                                await onEditCriteria(updated.CriteriaID || editCriteriaData.CriteriaID, updated);
                            }
                        } catch (err) {
                            console.error('Failed to save edited criteria', err);
                        } finally {
                            setIsEditCriteriaOpen(false);
                        }
                    }}
                />
            )}
            {isEditRequirementOpen && editRequirementData && (
                <EditRequirementsModal
                    visible={isEditRequirementOpen}
                    onClose={() => setIsEditRequirementOpen(false)}
                    requirement={editRequirementData}
                    userRole={currentUser?.RoleID}
                    onSave={async (updated) => {
                        try {
                            const { requirementsAPI } = await import('../../utils/api');
                            const response = await requirementsAPI.updateRequirement(updated.RequirementID, updated);
                            if (response && response.success) {
                                // Refresh requirements for the affected criteria (use provided prop if available)
                                const criteriaId = updated.CriteriaID || editRequirementData.CriteriaID;
                                if (typeof onLoadRequirementsByCriteria === 'function' && criteriaId) {
                                    await onLoadRequirementsByCriteria(Number(criteriaId));
                                }
                            } else {
                                alert(response?.message || 'Failed to save requirement');
                            }
                        } catch (err) {
                            console.error('Failed saving requirement', err);
                            alert(err?.message || 'An error occurred while saving requirement');
                        } finally {
                            setIsEditRequirementOpen(false);
                        }
                    }}
                />
            )}
        </div>
    );
}

