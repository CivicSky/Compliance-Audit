import { useEffect, useMemo, useState } from 'react';
import { officesAPI, requirementsAPI } from '../../utils/api';

export default function AddAreaPop({
	isOpen,
	onClose,
	event,
	areas,
	criteriaOptions,
	onAddArea,
	onAddCriteria,
	onAddRequirement,
	onLoadRequirementsByCriteria,
	onEditArea
}) {
	const [mainMode, setMainMode] = useState('add');
	const [mode, setMode] = useState('add-area'); // for backward compatibility, will be used for add sub-tabs
	const [saving, setSaving] = useState(false);
	const [loadingParents, setLoadingParents] = useState(false);
	const [loadingAssignmentData, setLoadingAssignmentData] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');

	const [areaForm, setAreaForm] = useState({ AreaCode: '', AreaName: '', Description: '' });
	const [criteriaForm, setCriteriaForm] = useState({ CriteriaCode: '', CriteriaName: '', Description: '', AreaID: '' });
	const [requirementForm, setRequirementForm] = useState({ RequirementCode: '', Description: '', CriteriaID: '', ParentRequirementCode: '', AreaFilter: '' });
	const [parentRequirementOptions, setParentRequirementOptions] = useState([]);
	const [eventOffices, setEventOffices] = useState([]);
	const [eventRequirements, setEventRequirements] = useState([]);
	const [selectedOfficeIds, setSelectedOfficeIds] = useState([]);
	const [selectedRequirementIds, setSelectedRequirementIds] = useState([]);
	const [officeSearchTerm, setOfficeSearchTerm] = useState('');
	const [requirementSearchTerm, setRequirementSearchTerm] = useState('');
    

	const filteredCriteriaOptions = useMemo(() => {
		const list = criteriaOptions || [];
		if (!requirementForm.AreaFilter) return [];

		return list.filter(crit => Number(crit.AreaID) === Number(requirementForm.AreaFilter));
	}, [criteriaOptions, requirementForm.AreaFilter]);

	const requirementTree = useMemo(() => {
		const areaMap = new Map();
		const criteriaMetaById = new Map(
			(criteriaOptions || []).map((crit) => [
				Number(crit.CriteriaID),
				{
					AreaID: crit.AreaID ?? crit.area_id ?? null,
					AreaName: crit.AreaName ?? crit.area_name ?? '',
					AreaCode: crit.AreaCode ?? crit.area_code ?? '',
					CriteriaName: crit.CriteriaName ?? crit.criteria_name ?? '',
					CriteriaCode: crit.CriteriaCode ?? crit.criteria_code ?? '',
				},
			])
		);
		const areaMetaById = new Map(
			(areas || []).map((area) => [
				Number(area.AreaID),
				{
					AreaName: area.AreaName ?? area.area_name ?? '',
					AreaCode: area.AreaCode ?? area.area_code ?? '',
				},
			])
		);

		for (const req of eventRequirements) {
			const criteriaId = Number(req.CriteriaID);
			const criteriaMeta = criteriaMetaById.get(criteriaId) || {};
			const resolvedAreaId = req.AreaID ?? req.area_id ?? criteriaMeta.AreaID;
			const hasArea = resolvedAreaId !== null && resolvedAreaId !== undefined && `${resolvedAreaId}` !== '';
			const areaId = hasArea ? Number(resolvedAreaId) : null;
			const areaFallback = areaId != null ? areaMetaById.get(areaId) : null;

			const areaKey = areaId != null ? `area-${areaId}` : 'area-none';
			const areaName = req.AreaName || req.area_name || criteriaMeta.AreaName || areaFallback?.AreaName || 'No Area';
			const areaCode = req.AreaCode || req.area_code || criteriaMeta.AreaCode || areaFallback?.AreaCode || '';
			const criteriaKey = req.CriteriaID != null ? `criteria-${req.CriteriaID}` : `criteria-none-${req.RequirementID}`;
			const criteriaName = req.CriteriaName || req.criteria_name || criteriaMeta.CriteriaName || 'No Criteria';
			const criteriaCode = req.CriteriaCode || req.criteria_code || criteriaMeta.CriteriaCode || '';

			if (!areaMap.has(areaKey)) {
				areaMap.set(areaKey, {
					key: areaKey,
					label: areaCode ? `${areaCode} - ${areaName}` : areaName,
					criteriaMap: new Map(),
				});
			}

			const areaEntry = areaMap.get(areaKey);
			if (!areaEntry.criteriaMap.has(criteriaKey)) {
				areaEntry.criteriaMap.set(criteriaKey, {
					key: criteriaKey,
					label: criteriaCode ? `${criteriaCode} - ${criteriaName}` : criteriaName,
					requirements: [],
				});
			}

			areaEntry.criteriaMap.get(criteriaKey).requirements.push(req);
		}

		return Array.from(areaMap.values()).map((area) => ({
			...area,
			criteria: Array.from(area.criteriaMap.values()),
		}));
	}, [eventRequirements, criteriaOptions, areas]);

	const selectedRequirementIdSet = useMemo(() => {
		return new Set(selectedRequirementIds.map((id) => Number(id)));
	}, [selectedRequirementIds]);

	const filteredEventOffices = useMemo(() => {
		const query = officeSearchTerm.trim().toLowerCase();
		if (!query) return eventOffices;

		return eventOffices.filter((office) => {
			const label = String(office.office_name || office.OfficeName || '').toLowerCase();
			const typeName = String(office.office_type_name || office.TypeName || '').toLowerCase();
			const headName = String(office.head_name || '').toLowerCase();
			return label.includes(query) || typeName.includes(query) || headName.includes(query);
		});
	}, [eventOffices, officeSearchTerm]);

	const filteredRequirementTree = useMemo(() => {
		const query = requirementSearchTerm.trim().toLowerCase();
		if (!query) return requirementTree;

		return requirementTree.reduce((areaAcc, area) => {
			const areaMatches = String(area.label || '').toLowerCase().includes(query);

			if (areaMatches) {
				areaAcc.push(area);
				return areaAcc;
			}

			const nextCriteria = area.criteria.reduce((criteriaAcc, criteria) => {
				const criteriaMatches = String(criteria.label || '').toLowerCase().includes(query);
				const nextRequirements = criteria.requirements.filter((req) => {
					const requirementText = `${req.RequirementCode || ''} ${req.Description || ''}`.toLowerCase();
					return criteriaMatches || requirementText.includes(query);
				});

				if (criteriaMatches || nextRequirements.length > 0) {
					criteriaAcc.push({
						...criteria,
						requirements: criteriaMatches ? criteria.requirements : nextRequirements,
					});
				}

				return criteriaAcc;
			}, []);

			if (nextCriteria.length > 0) {
				areaAcc.push({
					...area,
					criteria: nextCriteria,
				});
			}

			return areaAcc;
		}, []);
	}, [requirementTree, requirementSearchTerm]);

	const allOfficeIds = useMemo(() => {
		return filteredEventOffices.map((office) => Number(office.id || office.OfficeID)).filter(Boolean);
	}, [filteredEventOffices]);

	const allRequirementIds = useMemo(() => {
		return filteredRequirementTree
			.flatMap((area) => area.criteria)
			.flatMap((criteria) => criteria.requirements)
			.map((req) => Number(req.RequirementID))
			.filter(Boolean);
	}, [filteredRequirementTree]);

	const allOfficesSelected = allOfficeIds.length > 0 && allOfficeIds.every((id) => selectedOfficeIds.includes(id));
	const allRequirementsSelected = allRequirementIds.length > 0 && allRequirementIds.every((id) => selectedRequirementIdSet.has(id));

	useEffect(() => {
		if (!isOpen || !event?.EventID || mainMode !== 'assign') return;

		const loadAssignmentData = async () => {
			setLoadingAssignmentData(true);
			setError('');
			setSuccess('');
			try {
				const [officesPayload, requirementsPayload] = await Promise.all([
					officesAPI.getAll(),
					requirementsAPI.getRequirementsByEvent(event.EventID),
				]);

				const officesList = Array.isArray(officesPayload)
					? officesPayload
					: Array.isArray(officesPayload?.data)
						? officesPayload.data
						: [];

				const requirementsList = Array.isArray(requirementsPayload)
					? requirementsPayload
					: Array.isArray(requirementsPayload?.data)
						? requirementsPayload.data
						: [];

				const filteredOffices = officesList.filter((office) => {
					const officeEventId = office.event_id ?? office.EventID ?? office.eventId;
					return Number(officeEventId) === Number(event.EventID);
				});

				setEventOffices(filteredOffices);
				setEventRequirements(requirementsList);
				setSelectedOfficeIds([]);
				setSelectedRequirementIds([]);
				setOfficeSearchTerm('');
				setRequirementSearchTerm('');
			} catch (err) {
				setError(err?.message || 'Failed to load offices and requirements for assignment.');
			} finally {
				setLoadingAssignmentData(false);
			}
		};

		loadAssignmentData();
	}, [isOpen, event?.EventID, mainMode]);

	if (!isOpen || !event) return null;

	const fieldClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400';
	const mainTabClass = (active) => `px-2.5 py-1.5 rounded-md text-sm font-semibold transition ${active ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`;
	const tabClass = (active) => `px-3 py-2 rounded-lg text-sm font-semibold transition ${active ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`;
	const actionButtonClass = 'px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-semibold disabled:opacity-60 hover:bg-cyan-700 transition';
	const modalShellClass =
		mainMode === 'assign'
			? 'w-full max-w-7xl h-[86vh] max-h-[90vh] overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-white via-white to-slate-50 shadow-[0_30px_70px_rgba(15,23,42,0.28)] p-6 md:p-7 flex flex-col'
			: 'w-full max-w-4xl h-[86vh] max-h-[90vh] overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-white via-white to-slate-50 shadow-[0_30px_70px_rgba(15,23,42,0.28)] p-6 md:p-7 flex flex-col';

	const resetAndClose = () => {
		setMainMode('add');
		setMode('add-area');
		setError('');
		setSuccess('');
		setSaving(false);
		setEventOffices([]);
		setEventRequirements([]);
		setSelectedOfficeIds([]);
		setSelectedRequirementIds([]);
		setOfficeSearchTerm('');
		setRequirementSearchTerm('');
		onClose();
	};

	const setMessage = (msg) => {
		setSuccess(msg);
		setError('');
	};

	const handleAddArea = async (e) => {
		e.preventDefault();
		setError('');
		setSuccess('');
		if (!areaForm.AreaCode.trim() || !areaForm.AreaName.trim()) {
			setError('Area code and area name are required.');
			return;
		}
		try {
			setSaving(true);
			await onAddArea(event.EventID, areaForm);
			setAreaForm({ AreaCode: '', AreaName: '', Description: '' });
			setMessage('Area added successfully.');
		} catch (err) {
			setError(err?.message || 'Failed to add area.');
		} finally {
			setSaving(false);
		}
	};

	const handleAddCriteria = async (e) => {
		e.preventDefault();
		setError('');
		setSuccess('');
		if (!criteriaForm.CriteriaCode.trim() || !criteriaForm.CriteriaName.trim() || !criteriaForm.Description.trim()) {
			setError('Criteria code, name, and description are required.');
			return;
		}
		try {
			setSaving(true);
			await onAddCriteria(event.EventID, {
				...criteriaForm,
				AreaID: criteriaForm.AreaID ? Number(criteriaForm.AreaID) : null
			});
			setCriteriaForm({ CriteriaCode: '', CriteriaName: '', Description: '', AreaID: '' });
			setMessage('Criteria added successfully.');
		} catch (err) {
			setError(err?.message || 'Failed to add criteria.');
		} finally {
			setSaving(false);
		}
	};

	const handleAddRequirement = async (e) => {
		e.preventDefault();
		setError('');
		setSuccess('');
		if (!requirementForm.Description.trim() || !requirementForm.CriteriaID) {
			setError('Requirement description and criteria are required.');
			return;
		}

		try {
			setSaving(true);
			await onAddRequirement({
				RequirementCode: requirementForm.RequirementCode || null,
				Description: requirementForm.Description,
				CriteriaID: Number(requirementForm.CriteriaID),
				ParentRequirementCode: requirementForm.ParentRequirementCode || null
			});
			setRequirementForm({ RequirementCode: '', Description: '', CriteriaID: '', ParentRequirementCode: '', AreaFilter: '' });
			setParentRequirementOptions([]);
			setMessage('Requirement added successfully.');
		} catch (err) {
			setError(err?.message || 'Failed to add requirement.');
		} finally {
			setSaving(false);
		}
	};

	const handleRequirementCriteriaChange = async (criteriaId) => {
		setRequirementForm(prev => ({
			...prev,
			CriteriaID: criteriaId,
			ParentRequirementCode: ''
		}));

		if (!criteriaId) {
			setParentRequirementOptions([]);
			return;
		}

		try {
			setLoadingParents(true);
			const options = await onLoadRequirementsByCriteria(Number(criteriaId));
			const list = Array.isArray(options) ? options : [];
			setParentRequirementOptions(list);

			// auto-generate next requirement code based on criteria code and existing requirements
			const crit = (criteriaOptions || []).find(c => Number(c.CriteriaID) === Number(criteriaId));
			const baseCode = crit?.CriteriaCode || '';
			let nextCode = '';
			if (baseCode) {
				const escapedBase = baseCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
				const nums = list.map(o => {
					const rc = String(o.RequirementCode || '');
					const m = rc.match(new RegExp(`^${escapedBase}\\.(\\d+)$`));
					return m ? Number(m[1]) : null;
				}).filter(n => n !== null);
				const next = nums.length ? Math.max(...nums) + 1 : 1;
				nextCode = `${baseCode}.${next}`;
			}

			setRequirementForm(prev => ({ ...prev, RequirementCode: nextCode }));
		} catch {
			setParentRequirementOptions([]);
			setRequirementForm(prev => ({ ...prev, RequirementCode: '' }));
		} finally {
			setLoadingParents(false);
		}
	};

	const handleParentRequirementChange = (parentCode) => {
		setRequirementForm(prev => ({ ...prev, ParentRequirementCode: parentCode }));

		if (!parentCode) {
			// if no parent selected, regenerate top-level code based on criteria
			const crit = (criteriaOptions || []).find(c => Number(c.CriteriaID) === Number(requirementForm.CriteriaID));
			const baseCode = crit?.CriteriaCode || '';
			if (!baseCode) {
				setRequirementForm(prev => ({ ...prev, RequirementCode: '' }));
				return;
			}
			const escapedBase = baseCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const nums = parentRequirementOptions.map(o => {
				const rc = String(o.RequirementCode || '');
				const m = rc.match(new RegExp(`^${escapedBase}\\.(\\d+)$`));
				return m ? Number(m[1]) : null;
			}).filter(n => n !== null);
			const next = nums.length ? Math.max(...nums) + 1 : 1;
			setRequirementForm(prev => ({ ...prev, RequirementCode: `${baseCode}.${next}` }));
			return;
		}

		// generate child code under selected parent (e.g., parentCode.1, parentCode.2)
		const escapedParent = parentCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const nums = parentRequirementOptions.map(o => {
			const rc = String(o.RequirementCode || '');
			const m = rc.match(new RegExp(`^${escapedParent}\\.(\\d+)$`));
			return m ? Number(m[1]) : null;
		}).filter(n => n !== null);
		const next = nums.length ? Math.max(...nums) + 1 : 1;
		setRequirementForm(prev => ({ ...prev, RequirementCode: `${parentCode}.${next}` }));
	};

	const toggleOffice = (officeId, checked) => {
		setSelectedOfficeIds((prev) => {
			const next = new Set(prev);
			if (checked) next.add(Number(officeId));
			else next.delete(Number(officeId));
			return Array.from(next);
		});
	};

	const toggleRequirement = (requirementId, checked) => {
		setSelectedRequirementIds((prev) => {
			const next = new Set(prev.map((id) => Number(id)));
			if (checked) next.add(Number(requirementId));
			else next.delete(Number(requirementId));
			return Array.from(next);
		});
	};

	const toggleRequirementBatch = (ids, checked) => {
		setSelectedRequirementIds((prev) => {
			const next = new Set(prev.map((id) => Number(id)));
			for (const id of ids) {
				if (checked) next.add(Number(id));
				else next.delete(Number(id));
			}
			return Array.from(next);
		});
	};

	const handleAssignRequirementsToOffices = async (e) => {
		e.preventDefault();
		setError('');
		setSuccess('');

		const normalizedRequirementIds = [...new Set(
			selectedRequirementIds
				.map((id) => Number(id))
				.filter((id) => Number.isInteger(id) && id > 0)
		)];

		if (selectedOfficeIds.length === 0) {
			setError('Select at least one office.');
			return;
		}

		if (normalizedRequirementIds.length === 0) {
			setError('Select at least one requirement, criteria, or area.');
			return;
		}

		try {
			setSaving(true);
			const results = await Promise.all(
				selectedOfficeIds.map(async (officeId) => {
					let fallbackAdded = 0;
					let fallbackDuplicates = 0;

					try {
						const existingResponse = await officesAPI.getOfficeRequirements(officeId);
						const existingList = Array.isArray(existingResponse?.data) ? existingResponse.data : [];
						const existingSet = new Set(
							existingList
								.map((row) => Number(row.RequirementID))
								.filter((id) => Number.isInteger(id) && id > 0)
						);

						fallbackDuplicates = normalizedRequirementIds.filter((id) => existingSet.has(id)).length;
						fallbackAdded = normalizedRequirementIds.length - fallbackDuplicates;
					} catch {
						fallbackDuplicates = 0;
						fallbackAdded = normalizedRequirementIds.length;
					}

					const result = await officesAPI.addOfficeRequirements(officeId, normalizedRequirementIds);
					const addedRaw = result?.addedCount ?? result?.data?.addedCount;
					const duplicateRaw = result?.duplicateCount ?? result?.data?.duplicateCount;

					const hasBackendCounts = addedRaw !== undefined && duplicateRaw !== undefined;
					if (hasBackendCounts) {
						return {
							added: Number(addedRaw) || 0,
							duplicates: Number(duplicateRaw) || 0,
						};
					}

					return {
						added: fallbackAdded,
						duplicates: fallbackDuplicates,
					};
				})
			);

			let totalAdded = 0;
			let totalDuplicates = 0;

			for (const result of results) {
				totalAdded += Number(result?.added || 0);
				totalDuplicates += Number(result?.duplicates || 0);
			}

			setMessage(
				`${totalDuplicates} duplicate(s) already assigned, ${totalAdded} new requirement(s) added across ${selectedOfficeIds.length} office(s).`
			);
		} catch (err) {
			setError(err?.message || 'Failed to assign requirements to selected offices.');
		} finally {
			setSaving(false);
		}
	};

    

	return (
		<div className="fixed inset-y-0 right-0 left-0 lg:left-[var(--sidebar-width)] lg:transition-[left] lg:duration-200 lg:ease-in-out z-[120] bg-slate-950/45 backdrop-blur-[2px] flex items-center justify-center p-4">
				<div className={`${modalShellClass} relative`}>
				<div className="flex items-start justify-between mb-4">
					<div>
						<h3 className="text-3xl font-bold tracking-tight text-slate-900">Manage Event Structure</h3>
						<p className="mt-1 inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-3.5 py-1.5 text-sm font-semibold text-cyan-700">{event.EventName}</p>
					</div>
					<button
						onClick={resetAndClose}
						className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
						aria-label="Close"
					>
						<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				{/* Main mode selector */}
				<div className="mb-4 inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
					<button
						onClick={() => {
							setMainMode('add');
							setMode('add-area');
							setError('');
							setSuccess('');
						}}
						className={mainTabClass(mainMode === 'add')}
					>
						Add
					</button>
					<button
						onClick={() => {
							setMainMode('assign');
							setError('');
							setSuccess('');
						}}
						className={mainTabClass(mainMode === 'assign')}
					>
						Assign To Offices
					</button>
				</div>

				{mainMode !== 'assign' && (error || success) && (
					<div className="pointer-events-none absolute left-1/2 top-[4.7rem] z-20 w-[min(92%,760px)] -translate-x-1/2">
						{error ? (
							<p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 shadow-sm">
								{error}
							</p>
						) : (
							<p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 shadow-sm">
								{success}
							</p>
						)}
					</div>
				)}

				{/* Sub-tabs for add/edit */}
				{mainMode === 'add' && (
					<div className="grid grid-cols-3 gap-2 mb-4 rounded-xl border border-slate-200 bg-slate-100 p-1">
						<button onClick={() => setMode('add-area')} className={tabClass(mode === 'add-area')}>Add Area</button>
						<button onClick={() => setMode('add-criteria')} className={tabClass(mode === 'add-criteria')}>Add Criteria</button>
						<button onClick={() => setMode('add-requirement')} className={tabClass(mode === 'add-requirement')}>Add Requirement</button>
					</div>
				)}
			

				{/* Modal content */}
				<div className="flex-1 min-h-0 overflow-y-auto pr-1">

				   {/* Only show the correct form for the selected tab/sub-tab */}
				   {mainMode === 'add' && mode === 'add-area' && (
					   <form onSubmit={handleAddArea} className="space-y-3 rounded-xl border border-slate-200 bg-white/80 p-4">
						   <input
							   className={fieldClass}
							   placeholder="Area Code"
							   value={areaForm.AreaCode}
							   onChange={(e) => setAreaForm(prev => ({ ...prev, AreaCode: e.target.value }))}
						   />
						   <input
							   className={fieldClass}
							   placeholder="Area Name"
							   value={areaForm.AreaName}
							   onChange={(e) => setAreaForm(prev => ({ ...prev, AreaName: e.target.value }))}
						   />
						   <textarea
							   className={fieldClass}
							   placeholder="Description (optional)"
							   value={areaForm.Description}
							   onChange={(e) => setAreaForm(prev => ({ ...prev, Description: e.target.value }))}
						   />
						   <div className="flex gap-2 justify-end">
							   <button type="submit" disabled={saving} className={actionButtonClass}>
								   {saving ? 'Saving...' : 'Save Area'}
							   </button>
						   </div>
					   </form>
				   )}

				   {mainMode === 'add' && mode === 'add-criteria' && (
					   <form onSubmit={handleAddCriteria} className="space-y-3 rounded-xl border border-slate-200 bg-white/80 p-4">
						   <select
							   className={fieldClass}
							   value={criteriaForm.AreaID}
							   onChange={(e) => setCriteriaForm(prev => ({ ...prev, AreaID: e.target.value }))}
						   >
							   <option value="">No Area (optional)</option>
							   {(areas || []).map((area) => (
									   <option key={area.AreaID} value={area.AreaID}>{area.AreaCode ? `${area.AreaCode} - ${area.AreaName}` : area.AreaName}</option>
								   ))}
						   </select>
						   <input
							   className={fieldClass}
							   placeholder="Criteria Code"
							   value={criteriaForm.CriteriaCode}
							   onChange={(e) => setCriteriaForm(prev => ({ ...prev, CriteriaCode: e.target.value }))}
						   />
						   <input
							   className={fieldClass}
							   placeholder="Criteria Name"
							   value={criteriaForm.CriteriaName}
							   onChange={(e) => setCriteriaForm(prev => ({ ...prev, CriteriaName: e.target.value }))}
						   />
						   <textarea
							   className={fieldClass}
							   placeholder="Description"
							   value={criteriaForm.Description}
							   onChange={(e) => setCriteriaForm(prev => ({ ...prev, Description: e.target.value }))}
						   />
						   <div className="flex gap-2 justify-end">
							   <button type="submit" disabled={saving} className={actionButtonClass}>
								   {saving ? 'Saving...' : 'Save Criteria'}
							   </button>
						   </div>
					   </form>
				   )}

				   {mainMode === 'add' && mode === 'add-requirement' && (
					   <form onSubmit={handleAddRequirement} className="space-y-3 rounded-xl border border-slate-200 bg-white/80 p-4">
						   <select
							   className={fieldClass}
							   value={requirementForm.AreaFilter}
							   onChange={(e) => setRequirementForm(prev => ({ ...prev, AreaFilter: e.target.value, CriteriaID: '' }))}
						   >
							   <option value="">Select area</option>
							   {(areas || []).map((area) => (
								   <option key={area.AreaID} value={area.AreaID}>{area.AreaCode ? `${area.AreaCode} - ${area.AreaName}` : area.AreaName}</option>
							   ))}
						   </select>
						   <select
							   className={fieldClass}
							   value={requirementForm.CriteriaID}
							   onChange={(e) => handleRequirementCriteriaChange(e.target.value)}
						   >
							   <option value="">Select criteria</option>
							   {filteredCriteriaOptions.map((crit) => (
								   <option key={crit.CriteriaID} value={crit.CriteriaID}>
									   {crit.CriteriaCode ? `${crit.CriteriaCode} - ${crit.CriteriaName}` : crit.CriteriaName} {crit.AreaName ? `- (${crit.AreaName})` : '- (No Area)'}
								   </option>
							   ))}
						   </select>
						   {requirementForm.AreaFilter && filteredCriteriaOptions.length === 0 && (
							   <p className="text-xs text-gray-500">No criteria found for the selected area filter.</p>
						   )}
						   {!requirementForm.AreaFilter && (
							   <p className="text-xs text-gray-500">Select an area first to load criteria.</p>
						   )}
						   <select
							   className={fieldClass}
							   value={requirementForm.ParentRequirementCode}
							   onChange={(e) => handleParentRequirementChange(e.target.value)}
							   disabled={!requirementForm.CriteriaID || loadingParents}
						   >
							   <option value="">No parent requirement (optional)</option>
							   {parentRequirementOptions.map((req) => (
								   <option key={req.RequirementID} value={req.RequirementCode}>
									   {req.RequirementCode} - {req.Description}
								   </option>
							   ))}
						   </select>
						   {requirementForm.CriteriaID && loadingParents && (
							   <p className="text-xs text-gray-500">Loading parent requirement options...</p>
						   )}
						   <div>
							   <label className="block text-xs font-semibold text-slate-600 mb-1">Requirement Code (editable)</label>
							   <input
								   className={fieldClass}
								   value={requirementForm.RequirementCode || ''}
								   onChange={(e) => setRequirementForm(prev => ({ ...prev, RequirementCode: e.target.value }))}
								   placeholder="Leave empty to auto-generate"
							   />
						   </div>
						   <textarea
							   className={fieldClass}
							   placeholder="Requirement Description"
							   value={requirementForm.Description}
							   onChange={(e) => setRequirementForm(prev => ({ ...prev, Description: e.target.value }))}
							   disabled={!requirementForm.CriteriaID}
						   />
						   <div className="flex gap-2 justify-end">
							   <button type="submit" disabled={saving || !requirementForm.CriteriaID} className={actionButtonClass}>
								   {saving ? 'Saving...' : 'Save Requirement'}
							   </button>
						   </div>
					   </form>
				   )}

				   {mainMode === 'assign' && (
					   <form onSubmit={handleAssignRequirementsToOffices} className="space-y-3 rounded-xl border border-slate-200 bg-white/80 p-4">
						   <div className="flex items-center justify-between">
							   <p className="text-sm font-semibold text-slate-700">Bulk Assign Requirements To Offices</p>
							   <p className="text-xs text-slate-500">Select offices and requirements, then assign in one action.</p>
						   </div>

						   {loadingAssignmentData ? (
							   <p className="text-sm text-slate-500 py-6">Loading offices and requirements...</p>
						   ) : (
							   <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
								   <div className="rounded-xl border border-slate-200 bg-white p-3">
									   <div className="mb-2 flex items-center justify-between">
										   <p className="text-sm font-semibold text-slate-700">Offices</p>
										   <label className="inline-flex items-center gap-2 text-xs text-slate-600">
											   <input
												   type="checkbox"
												   checked={allOfficesSelected}
												   onChange={(e) => {
													   if (e.target.checked) setSelectedOfficeIds(allOfficeIds);
													   else setSelectedOfficeIds([]);
												   }}
											   />
											   Select all
										   </label>
									   </div>
									   <input
										   type="text"
										   className="mb-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
										   placeholder="Search offices..."
										   value={officeSearchTerm}
										   onChange={(e) => setOfficeSearchTerm(e.target.value)}
									   />
									   <div className="h-72 overflow-y-scroll space-y-2 pr-1 [scrollbar-gutter:stable] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-slate-300 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400">
										   {eventOffices.length === 0 ? (
											   <p className="text-xs text-slate-500">No offices found for this event.</p>
										   ) : filteredEventOffices.length === 0 ? (
											   <p className="text-xs text-slate-500">No matching offices for your search.</p>
										   ) : (
											   filteredEventOffices.map((office) => {
												   const officeId = Number(office.id || office.OfficeID);
												   const checked = selectedOfficeIds.includes(officeId);
												   const label = office.office_name || office.OfficeName || `Office ${officeId}`;
												   return (
													   <label
														   key={officeId}
														   className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm transition ${
															   checked
																   ? 'border-cyan-300 bg-cyan-50 text-cyan-800 shadow-sm'
																   : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
														   }`}
													   >
														   <input
															   type="checkbox"
															   className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
															   checked={checked}
															   onChange={(e) => toggleOffice(officeId, e.target.checked)}
														   />
														   <span className="truncate">{label}</span>
													   </label>
												   );
											   })
										   )}
									   </div>
								   </div>

								   <div className="rounded-xl border border-slate-200 bg-white p-3">
									   <div className="mb-2 flex items-center justify-between">
										   <p className="text-sm font-semibold text-slate-700">Requirements by Area and Criteria</p>
										   <label className="inline-flex items-center gap-2 text-xs text-slate-600">
											   <input
												   type="checkbox"
												   checked={allRequirementsSelected}
												   onChange={(e) => toggleRequirementBatch(allRequirementIds, e.target.checked)}
											   />
											   Select all
										   </label>
									   </div>
									   <input
										   type="text"
										   className="mb-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
										   placeholder="Search areas, criteria, or requirements..."
										   value={requirementSearchTerm}
										   onChange={(e) => setRequirementSearchTerm(e.target.value)}
									   />
									   <div className="h-72 overflow-y-scroll space-y-3 pr-1 [scrollbar-gutter:stable] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-slate-300 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400">
										   {requirementTree.length === 0 ? (
											   <p className="text-xs text-slate-500">No requirements found for this event.</p>
										   ) : filteredRequirementTree.length === 0 ? (
											   <p className="text-xs text-slate-500">No matching requirements for your search.</p>
										   ) : (
											   filteredRequirementTree.map((area) => {
												   const areaRequirementIds = area.criteria.flatMap((criteria) =>
													   criteria.requirements.map((req) => Number(req.RequirementID))
												   );
												   const areaChecked =
													   areaRequirementIds.length > 0 &&
													   areaRequirementIds.every((id) => selectedRequirementIdSet.has(id));

												   return (
													   <div key={area.key} className="rounded-xl border border-violet-200 bg-violet-50/30 p-2.5">
														   <label className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-2 text-sm font-semibold text-white shadow-sm">
															   <input
																   type="checkbox"
																   className="h-4 w-4 rounded border-white/70 bg-white text-violet-600 focus:ring-white"
																   checked={areaChecked}
																   onChange={(e) => toggleRequirementBatch(areaRequirementIds, e.target.checked)}
															   />
															   {area.label}
															   <span className="ml-auto rounded bg-white/20 px-2 py-0.5 text-[11px] font-medium">
																   {areaRequirementIds.length} req
															   </span>
														   </label>

														   <div className="relative ml-5 mt-3 space-y-2 border-l-4 border-violet-200 pl-4">
															   {area.criteria.map((criteria) => {
																   const criteriaRequirementIds = criteria.requirements.map((req) => Number(req.RequirementID));
																   const criteriaChecked =
																	   criteriaRequirementIds.length > 0 &&
																	   criteriaRequirementIds.every((id) => selectedRequirementIdSet.has(id));

																   return (
																	   <div key={criteria.key} className="rounded-lg border border-indigo-200 bg-white overflow-hidden">
																		   <label className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 px-3 py-2 text-xs font-semibold text-white">
																			   <input
																				   type="checkbox"
																				   className="h-4 w-4 rounded border-white/70 bg-white text-indigo-600 focus:ring-white"
																				   checked={criteriaChecked}
																				   onChange={(e) => toggleRequirementBatch(criteriaRequirementIds, e.target.checked)}
																			   />
																			   {criteria.label}
																			   <span className="ml-auto rounded bg-white/20 px-2 py-0.5 text-[10px] font-medium">
																				   {criteriaRequirementIds.length}
																			   </span>
																		   </label>

																		   <div className="space-y-1.5 bg-slate-50 px-3 py-2">
																			   {criteria.requirements.map((req) => {
																				   const reqId = Number(req.RequirementID);
																				   const reqChecked = selectedRequirementIdSet.has(reqId);
																				   const reqLabel = req.RequirementCode
																					   ? `${req.RequirementCode} - ${req.Description}`
																					   : req.Description;

																				   return (
																					   <label key={reqId} className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs transition ${reqChecked ? 'border-cyan-300 bg-cyan-50 text-cyan-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'}`}>
																						   <input
																							   type="checkbox"
																							   className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
																							   checked={reqChecked}
																							   onChange={(e) => toggleRequirement(reqId, e.target.checked)}
																						   />
																						   <span className="truncate font-medium">{reqLabel}</span>
																					   </label>
																				   );
																			   })}
																		   </div>
																	   </div>
																   );
															   })}
														   </div>
													   </div>
												   );
											   })
										   )}
									   </div>
								   </div>
							   </div>
						   )}

						   <div className="mt-2 flex flex-col gap-2 border-t border-slate-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
							   <p className="text-xs text-slate-600">
								   Selected: {selectedOfficeIds.length} office(s), {selectedRequirementIds.length} requirement(s)
							   </p>
							   <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
								   {(error || success) && (
									   <p className={`max-w-[540px] text-right text-xs ${error ? 'text-rose-700' : 'text-emerald-700'}`}>
										   {error || success}
									   </p>
								   )}
								   <button type="submit" disabled={saving || loadingAssignmentData} className={actionButtonClass}>
									   {saving ? 'Assigning...' : 'Assign Selected'}
								   </button>
							   </div>
						   </div>
					   </form>
				   )}
				</div>

                   

			</div>
		</div>
	);
}

