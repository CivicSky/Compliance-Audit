import React, { useMemo, useState } from 'react';

function Checkbox({ checked, onChange, className = '' }) {
	return (
		<input
			type="checkbox"
			className={`h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 ${className}`}
			checked={checked}
			onChange={onChange}
		/>
	);
}

const getAreaId = (area) => Number(area.id || String(area.key || '').replace('area-', ''));
const getCriteriaId = (criteria) => Number(criteria.id || criteria.CriteriaID || String(criteria.key || '').replace('criteria-', ''));

export default function BulkAssignPanel({
	onAssign,
	loadingAssignmentData,
	allOfficesSelected,
	allOfficeIds,
	setSelectedOfficeIds,
	officeSearchTerm,
	setOfficeSearchTerm,
	eventOffices,
	filteredEventOffices,
	selectedOfficeIds,
	toggleOffice,
	requirementSearchTerm,
	setRequirementSearchTerm,
	requirementTree,
	filteredRequirementTree,
	selectedRequirementIdSet,
	toggleRequirement,
	toggleRequirementBatch,
	loadCriteriaForArea,
	loadRequirementsForCriteria,
	loadingCriteriaIds = new Set(),
	loadingRequirementIds = new Set(),
	allRequirementsSelected,
	allRequirementIds,
	selectedRequirementIds,
	actionButtonClass,
	saving,
	error,
	success,
}) {
	const [expandedAreas, setExpandedAreas] = useState(() => new Set());
	const [expandedCriteria, setExpandedCriteria] = useState(() => new Set());
	const [expandedReqIds, setExpandedReqIds] = useState(() => new Set());

	const officeCount = selectedOfficeIds.length;
	const reqCount = selectedRequirementIds.length;

	const toggleSet = (setter, id) => {
		setter((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const buildCriteriaTree = (criteriaList = []) => {
		const nodeMap = new Map();
		const roots = [];

		for (const criteria of criteriaList) {
			const id = Number(criteria.CriteriaID);
			nodeMap.set(id, {
				...criteria,
				id,
				key: criteria.key || `criteria-${id}`,
				label: criteria.label || (criteria.CriteriaCode ? `${criteria.CriteriaCode} - ${criteria.CriteriaName}` : criteria.CriteriaName),
				requirements: criteria.requirements || [],
				requirementsLoaded: Boolean(criteria.requirementsLoaded),
				children: [],
			});
		}

		for (const node of nodeMap.values()) {
			const parentId = node.ParentCriteriaID ?? node.parent_criteria_id ?? null;
			if (parentId && nodeMap.has(Number(parentId))) {
				nodeMap.get(Number(parentId)).children.push(node);
			} else {
				roots.push(node);
			}
		}

		return roots;
	};

	const gatherLoadedRequirementIds = (node) => {
		const own = (node.requirements || []).map((req) => Number(req.RequirementID)).filter(Boolean);
		const childIds = (node.children || []).flatMap((child) => gatherLoadedRequirementIds(child));
		return [...own, ...childIds];
	};

	const loadRequirementsForNode = async (node) => {
		const criteriaId = getCriteriaId(node);
		const loaded = await loadRequirementsForCriteria?.(criteriaId);
		return (loaded || []).map((req) => Number(req.RequirementID)).filter(Boolean);
	};

	const renderCriteriaNode = (node, depth = 0) => {
		const criteriaId = getCriteriaId(node);
		const critKey = node.key || `criteria-${criteriaId}`;
		const critExpanded = expandedCriteria.has(critKey);
		const loading = loadingRequirementIds.has(criteriaId);
		const loadedReqIds = Array.from(new Set(gatherLoadedRequirementIds(node)));
		const criteriaChecked = loadedReqIds.length > 0 && loadedReqIds.every((id) => selectedRequirementIdSet.has(id));
		const requirementsLoaded = Boolean(node.requirementsLoaded);

		const handleExpand = async () => {
			toggleSet(setExpandedCriteria, critKey);
			if (!critExpanded && !requirementsLoaded) {
				await loadRequirementsForNode(node);
			}
		};

		const handleCheck = async (checked) => {
			const ids = requirementsLoaded ? loadedReqIds : await loadRequirementsForNode(node);
			toggleRequirementBatch(ids, checked);
		};

		return (
			<div key={critKey} className={depth > 0 ? 'ml-3 border-l-2 border-blue-200 pl-3' : ''}>
				<div className="flex items-start gap-2 rounded-lg bg-blue-500 px-2.5 py-2 text-white shadow-sm">
					<Checkbox
						className="border-white/50 bg-white text-blue-600"
						checked={criteriaChecked}
						onChange={(event) => handleCheck(event.target.checked)}
					/>
					<button type="button" className="min-w-0 flex-1 text-left" onClick={handleExpand}>
						<span className="text-[10px] font-semibold uppercase tracking-wide text-blue-100">Criteria</span>
						<p className="text-xs font-medium leading-snug text-white">{node.label}</p>
					</button>
					<span className="shrink-0 rounded-md bg-white/15 px-1.5 py-0.5 text-[10px] font-medium text-white">
						{requirementsLoaded ? loadedReqIds.length : '...'}
					</span>
					<button
						type="button"
						className="shrink-0 rounded p-1 text-blue-100 hover:bg-white/15 hover:text-white"
						onClick={handleExpand}
						aria-label={critExpanded ? 'Collapse' : 'Expand'}
					>
						<svg className={`h-4 w-4 transition ${critExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
						</svg>
					</button>
				</div>

				{critExpanded && (
					<div className="mt-1 space-y-1 pb-2 pl-6">
						{loading && <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">Loading requirements...</p>}
						{!loading && requirementsLoaded && (node.requirements || []).length === 0 && (
							<p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">No requirements</p>
						)}
						{(node.requirements || []).map((req) => {
							const reqId = Number(req.RequirementID);
							const reqChecked = selectedRequirementIdSet.has(reqId);
							const reqLabel = req.RequirementCode ? `${req.RequirementCode} - ${req.Description}` : req.Description;
							const reqExpanded = expandedReqIds.has(reqId);

							return (
								<label
									key={reqId}
									className={`flex cursor-pointer items-start gap-2 rounded-lg border-l-4 px-2.5 py-2 text-xs transition ${
										reqChecked
											? 'border-blue-600 bg-blue-100 text-blue-900'
											: 'border-blue-400 bg-blue-50/80 text-slate-700 hover:bg-blue-50'
									}`}
								>
									<Checkbox checked={reqChecked} onChange={(event) => toggleRequirement(reqId, event.target.checked)} />
									<span className={`min-w-0 flex-1 ${reqExpanded ? '' : 'line-clamp-2'}`}>{reqLabel}</span>
									<button
										type="button"
										className="shrink-0 text-[10px] font-medium text-blue-700 hover:underline"
										onClick={(event) => {
											event.preventDefault();
											toggleSet(setExpandedReqIds, reqId);
										}}
									>
										{reqExpanded ? 'Less' : 'More'}
									</button>
								</label>
							);
						})}
						{(node.children || []).map((child) => renderCriteriaNode(child, depth + 1))}
					</div>
				)}
			</div>
		);
	};

	const treesWithRoots = useMemo(() => {
		return filteredRequirementTree.map((area) => ({
			...area,
			roots: buildCriteriaTree(area.criteria),
		}));
	}, [filteredRequirementTree]);

	const loadAreaRequirementIds = async (area) => {
		const areaId = getAreaId(area);
		const criteriaList = area.criteriaLoaded ? area.criteria || [] : await loadCriteriaForArea?.(areaId);
		const reqLists = await Promise.all((criteriaList || []).map((criteria) => loadRequirementsForCriteria?.(criteria.CriteriaID)));
		return reqLists.flat().map((req) => Number(req.RequirementID)).filter(Boolean);
	};

	const handleAreaExpand = async (area) => {
		const isExpanded = expandedAreas.has(area.key);
		toggleSet(setExpandedAreas, area.key);
		if (!isExpanded && !area.criteriaLoaded) {
			await loadCriteriaForArea?.(getAreaId(area));
		}
	};

	const handleAreaCheck = async (area, checked, loadedIds) => {
		const allRequirementsLoaded = (area.roots || []).every((root) => {
			const stack = [root];
			while (stack.length > 0) {
				const node = stack.pop();
				if (!node.requirementsLoaded) return false;
				stack.push(...(node.children || []));
			}
			return true;
		});
		const ids = area.criteriaLoaded && allRequirementsLoaded ? loadedIds : await loadAreaRequirementIds(area);
		toggleRequirementBatch(ids, checked);
	};

	return (
		<form onSubmit={onAssign} className="flex h-full min-h-0 flex-col">
			{loadingAssignmentData ? (
				<div className="flex flex-1 flex-col items-center justify-center gap-3 py-16">
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
					<p className="text-sm text-slate-500">Loading offices and areas...</p>
				</div>
			) : (
				<>
					<div className="grid min-h-0 w-full flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(240px,28%)_minmax(0,1fr)]">
						<section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-stone-200/90 bg-app-surface">
							<div className="border-b border-slate-300/50 px-3 py-3">
								<div className="flex items-center justify-between gap-2">
									<h3 className="text-sm font-semibold text-slate-800">1. Select offices</h3>
									<label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-slate-600">
										<Checkbox
											checked={allOfficesSelected}
											onChange={(event) => {
												if (event.target.checked) setSelectedOfficeIds(allOfficeIds);
												else setSelectedOfficeIds([]);
											}}
										/>
										All
									</label>
								</div>
								<input
									type="search"
									className="mt-2 w-full rounded-lg border border-slate-300/60 bg-white px-2.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
									placeholder="Search offices..."
									value={officeSearchTerm}
									onChange={(event) => setOfficeSearchTerm(event.target.value)}
								/>
							</div>
							<div className="flex-1 space-y-1.5 overflow-y-auto p-2 [scrollbar-width:thin]">
								{eventOffices.length === 0 ? (
									<p className="px-2 py-4 text-center text-xs text-slate-500">No offices for this event.</p>
								) : filteredEventOffices.length === 0 ? (
									<p className="px-2 py-4 text-center text-xs text-slate-500">No matches.</p>
								) : (
									filteredEventOffices.map((office) => {
										const officeId = Number(office.id || office.OfficeID);
										const checked = selectedOfficeIds.includes(officeId);
										const label = office.office_name || office.OfficeName || `Office ${officeId}`;
										return (
											<label
												key={officeId}
												className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition ${
													checked
														? 'border-blue-300/80 bg-blue-50/90 text-indigo-900 shadow-sm'
														: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
												}`}
											>
												<Checkbox checked={checked} onChange={(event) => toggleOffice(officeId, event.target.checked)} />
												<span className="truncate font-medium">{label}</span>
											</label>
										);
									})
								)}
							</div>
						</section>

						<section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-stone-200/90 bg-app-surface">
							<div className="border-b border-slate-300/50 px-3 py-3">
								<div className="flex items-center justify-between gap-2">
									<h3 className="text-sm font-semibold text-slate-800">2. Select requirements</h3>
									<label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-slate-600">
										<Checkbox checked={allRequirementsSelected} onChange={(event) => toggleRequirementBatch(allRequirementIds, event.target.checked)} />
										All
									</label>
								</div>
								<p className="mt-0.5 text-[11px] text-slate-500">Area &gt; Criteria &gt; Requirement</p>
								<input
									type="search"
									className="mt-2 w-full rounded-lg border border-slate-300/60 bg-white px-2.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
									placeholder="Search loaded hierarchy..."
									value={requirementSearchTerm}
									onChange={(event) => setRequirementSearchTerm(event.target.value)}
								/>
							</div>
							<div className="flex-1 space-y-3 overflow-y-auto p-3 [scrollbar-width:thin]">
								{requirementTree.length === 0 ? (
									<p className="py-8 text-center text-xs text-slate-500">No areas for this event.</p>
								) : treesWithRoots.length === 0 ? (
									<p className="py-8 text-center text-xs text-slate-500">No matches in loaded hierarchy.</p>
								) : (
									treesWithRoots.map((area) => {
										const areaRequirementIds = area.roots.flatMap((root) => gatherLoadedRequirementIds(root));
										const areaChecked = areaRequirementIds.length > 0 && areaRequirementIds.every((id) => selectedRequirementIdSet.has(id));
										const areaExpanded = expandedAreas.has(area.key);
										const areaLoading = loadingCriteriaIds.has(getAreaId(area));

										return (
											<div key={area.key} className="overflow-hidden rounded-xl border border-slate-300/50 bg-white shadow-sm">
												<div className="flex items-center gap-2 bg-blue-500 px-3 py-2.5 text-white">
													<Checkbox
														className="border-white/50 bg-white text-blue-600"
														checked={areaChecked}
														onChange={(event) => handleAreaCheck(area, event.target.checked, areaRequirementIds)}
													/>
													<button type="button" className="min-w-0 flex-1 text-left" onClick={() => handleAreaExpand(area)}>
														<span className="text-[10px] font-semibold uppercase tracking-wide text-blue-100">Area</span>
														<p className="truncate text-sm font-semibold">{area.label}</p>
													</button>
													<span className="rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-medium">
														{area.criteriaLoaded ? areaRequirementIds.length : '...'}
													</span>
													<button type="button" className="rounded p-1 text-blue-100 hover:bg-white/15 hover:text-white" onClick={() => handleAreaExpand(area)}>
														<svg className={`h-4 w-4 transition ${areaExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
														</svg>
													</button>
												</div>

												{areaExpanded && (
													<div className="space-y-2 p-3">
														{areaLoading ? (
															<p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">Loading criteria...</p>
														) : area.roots.length === 0 ? (
															<p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">No criteria</p>
														) : (
															area.roots.map((root) => renderCriteriaNode(root))
														)}
													</div>
												)}
											</div>
										);
									})
								)}
							</div>
						</section>
					</div>

					<footer className="mt-4 flex shrink-0 flex-col gap-3 border-t border-stone-200/90 bg-app-surface pt-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex flex-wrap items-center gap-3 text-sm">
							<span className="rounded-lg bg-white px-3 py-1.5 font-medium text-slate-700 ring-1 ring-slate-200/80">
								<span className="text-slate-500">Offices:</span> {officeCount}
							</span>
							<span className="rounded-lg bg-white px-3 py-1.5 font-medium text-slate-700 ring-1 ring-slate-200/80">
								<span className="text-slate-500">Requirements:</span> {reqCount}
							</span>
							{(error || success) && (
								<p className={`text-xs font-medium ${error ? 'text-rose-700' : 'text-emerald-700'}`}>{error || success}</p>
							)}
						</div>
						<button
							type="submit"
							disabled={saving || loadingAssignmentData || officeCount === 0 || reqCount === 0}
							className={`${actionButtonClass} min-w-[160px]`}
						>
							{saving ? 'Assigning...' : 'Assign to offices'}
						</button>
					</footer>
				</>
			)}
		</form>
	);
}

