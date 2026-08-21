import { useEffect, useMemo, useState, useRef } from 'react';
import { criteriaAPI, officesAPI, requirementsAPI } from '../../utils/api';
import ModalHeader from './AddAreaPop/ModalHeader';
import EventStructureSidebar from './AddAreaPop/EventStructureSidebar';
import ToastBanner from './AddAreaPop/ToastBanner';
import AddAreaForm from './AddAreaPop/AddAreaForm';
import AddCriteriaForm from './AddAreaPop/AddCriteriaForm';
import AddRequirementForm from './AddAreaPop/AddRequirementForm';
import AssignPanel from './AddAreaPop/AssignPanel';
import { saveButtonClass } from './AddAreaPop/formStyles';
import { useToast } from '../UI/Toast';

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
	const { toast } = useToast();
	const [mainMode, setMainMode] = useState('add');
	const [mode, setMode] = useState('add-area'); // for backward compatibility, will be used for add sub-tabs
	const [saving, setSaving] = useState(false);
	const [loadingParents, setLoadingParents] = useState(false);
	const [loadingAssignmentData, setLoadingAssignmentData] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [toastVisible, setToastVisible] = useState(false);
	const toastTimerRef = useRef(null);

	const [areaForm, setAreaForm] = useState({ AreaCode: '', AreaName: '', Description: '' });
	const [criteriaForm, setCriteriaForm] = useState({ CriteriaCode: '', CriteriaName: '', Description: '', AreaID: '', ParentCriteriaID: '' });
	const [requirementForm, setRequirementForm] = useState({ RequirementCode: '', Description: '', CriteriaID: '', ParentRequirementCode: '', AreaFilter: '', ChildCriteriaID: '' });
	const [parentRequirementOptions, setParentRequirementOptions] = useState([]);
	const parentCriteriaOptions = useMemo(() => {
		const list = criteriaOptions || [];
		if (!event) return [];
		// only criteria for this event
		const byEvent = list.filter(c => Number(c.EventID) === Number(event.EventID) || Number(c.event_id) === Number(event.EventID));
		// only top-level criteria (exclude children)
		const topLevel = byEvent.filter((c) => c.ParentCriteriaID === null || c.ParentCriteriaID === undefined || String(c.ParentCriteriaID) === '');
		// if AreaID selected, filter by same area; empty means show all
		if (!criteriaForm.AreaID) return topLevel;
		if (criteriaForm.AreaID === '__no_area__') {
			return topLevel.filter((c) => {
				const noArea = c.AreaID === null || c.AreaID === undefined || c.AreaID === '' || Number(c.AreaID) === 0;
				return noArea;
			});
		}
		return topLevel.filter(c => String(c.AreaID) === String(criteriaForm.AreaID));
	}, [criteriaOptions, criteriaForm.AreaID, event]);
	const [eventOffices, setEventOffices] = useState([]);
	const [assignmentCriteriaByArea, setAssignmentCriteriaByArea] = useState({});
	const [assignmentRequirementsByCriteria, setAssignmentRequirementsByCriteria] = useState({});
	const [loadingAssignmentCriteria, setLoadingAssignmentCriteria] = useState(new Set());
	const [loadingAssignmentRequirements, setLoadingAssignmentRequirements] = useState(new Set());
	const [selectedOfficeIds, setSelectedOfficeIds] = useState([]);
	const [selectedRequirementIds, setSelectedRequirementIds] = useState([]);
	const [officeSearchTerm, setOfficeSearchTerm] = useState('');
	const [requirementSearchTerm, setRequirementSearchTerm] = useState('');
    

	const filteredCriteriaOptions = useMemo(() => {
		const list = criteriaOptions || [];
		// Only show top-level criteria here (exclude children)
		const topLevel = list.filter((crit) => crit.ParentCriteriaID === null || crit.ParentCriteriaID === undefined || String(crit.ParentCriteriaID) === '');
		const af = requirementForm.AreaFilter;
		if (!af) return [];

		if (af === '__no_area__') {
			return topLevel.filter((crit) => {
				const noArea = crit.AreaID === null || crit.AreaID === undefined || crit.AreaID === '' || Number(crit.AreaID) === 0;
				const sameEvent = event && (Number(crit.EventID) === Number(event.EventID) || Number(crit.event_id) === Number(event.EventID));
				return noArea && (event ? sameEvent : true);
			});
		}

		return topLevel.filter(crit => Number(crit.AreaID) === Number(af));
	}, [criteriaOptions, requirementForm.AreaFilter, event]);

	// child criteria options for the selected criteria (only direct children)
	const childCriteriaOptions = useMemo(() => {
		if (!requirementForm.CriteriaID) return [];
		return (criteriaOptions || []).filter(c => {
			const isChild = c.ParentCriteriaID !== undefined && c.ParentCriteriaID !== null && String(c.ParentCriteriaID) !== '' && String(c.ParentCriteriaID) === String(requirementForm.CriteriaID);
			const sameEvent = event ? (Number(c.EventID) === Number(event.EventID) || Number(c.event_id) === Number(event.EventID)) : true;
			return isChild && sameEvent;
		});
	}, [criteriaOptions, requirementForm.CriteriaID, event]);

	// helper: get the effective base CriteriaCode for a target criteria id
	const getBaseCriteriaCode = (criteriaId) => {
		if (!criteriaId) return '';
		const list = criteriaOptions || [];
		const crit = list.find(c => String(c.CriteriaID) === String(criteriaId) || Number(c.CriteriaID) === Number(criteriaId));
		if (!crit) return '';
		const code = crit.CriteriaCode ?? crit.criteria_code ?? '';
		if (code) return code;
		// if this crit has no code but has a parent, use parent's code
		const parentId = crit.ParentCriteriaID ?? crit.parent_criteria_id ?? null;
		if (parentId) {
			const parent = list.find(c => String(c.CriteriaID) === String(parentId) || Number(c.CriteriaID) === Number(parentId));
			return parent?.CriteriaCode ?? parent?.criteria_code ?? '';
		}
		return '';
	};

	const requirementTree = useMemo(() => {
		const eventAreas = (areas || [])
			.filter((area) => !event?.EventID || Number(area.EventID ?? area.EventChildID ?? event.EventID) === Number(event.EventID))
			.slice()
			.sort((a, b) => String(a.AreaCode || a.AreaName || '').localeCompare(String(b.AreaCode || b.AreaName || ''), undefined, { numeric: true, sensitivity: 'base' }));

		return eventAreas.map((area) => {
			const areaId = Number(area.AreaID);
			const criteria = (assignmentCriteriaByArea[areaId] || []).map((crit) => {
				const criteriaId = Number(crit.CriteriaID);
				const code = crit.CriteriaCode ?? crit.criteria_code ?? '';
				const name = crit.CriteriaName ?? crit.criteria_name ?? '';
				const requirementsLoaded = Object.prototype.hasOwnProperty.call(assignmentRequirementsByCriteria, criteriaId);
				return {
					...crit,
					id: criteriaId,
					key: `criteria-${criteriaId}`,
					label: code ? `${code} - ${name}` : name,
					requirements: requirementsLoaded ? assignmentRequirementsByCriteria[criteriaId] || [] : [],
					requirementsLoaded,
				};
			});

			const areaCode = area.AreaCode ?? area.area_code ?? '';
			const areaName = area.AreaName ?? area.area_name ?? '';
			return {
				...area,
				id: areaId,
				key: `area-${areaId}`,
				label: areaCode ? `${areaCode} - ${areaName}` : areaName,
				criteria,
				criteriaLoaded: Object.prototype.hasOwnProperty.call(assignmentCriteriaByArea, areaId),
			};
		});
	}, [areas, assignmentCriteriaByArea, assignmentRequirementsByCriteria, event?.EventID]);

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

	const loadAssignmentCriteriaForArea = async (areaId, force = false) => {
		const normalizedAreaId = Number(areaId);
		if (!Number.isInteger(normalizedAreaId) || normalizedAreaId <= 0) return [];
		if (!force && Object.prototype.hasOwnProperty.call(assignmentCriteriaByArea, normalizedAreaId)) {
			return assignmentCriteriaByArea[normalizedAreaId] || [];
		}

		try {
			setLoadingAssignmentCriteria((prev) => new Set([...prev, normalizedAreaId]));
			const payload = await criteriaAPI.getByArea(normalizedAreaId);
			const list = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
			setAssignmentCriteriaByArea((prev) => ({ ...prev, [normalizedAreaId]: list }));
			return list;
		} catch (err) {
			console.error('Failed to load assignment criteria:', err);
			setAssignmentCriteriaByArea((prev) => ({ ...prev, [normalizedAreaId]: [] }));
			return [];
		} finally {
			setLoadingAssignmentCriteria((prev) => {
				const next = new Set(prev);
				next.delete(normalizedAreaId);
				return next;
			});
		}
	};

	const loadAssignmentRequirementsForCriteria = async (criteriaId, force = false) => {
		const normalizedCriteriaId = Number(criteriaId);
		if (!Number.isInteger(normalizedCriteriaId) || normalizedCriteriaId <= 0) return [];
		if (!force && Object.prototype.hasOwnProperty.call(assignmentRequirementsByCriteria, normalizedCriteriaId)) {
			return assignmentRequirementsByCriteria[normalizedCriteriaId] || [];
		}

		try {
			setLoadingAssignmentRequirements((prev) => new Set([...prev, normalizedCriteriaId]));
			const payload = await requirementsAPI.getRequirementsByCriteria(normalizedCriteriaId);
			const list = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
			setAssignmentRequirementsByCriteria((prev) => ({ ...prev, [normalizedCriteriaId]: list }));
			return list;
		} catch (err) {
			console.error('Failed to load assignment requirements:', err);
			setAssignmentRequirementsByCriteria((prev) => ({ ...prev, [normalizedCriteriaId]: [] }));
			return [];
		} finally {
			setLoadingAssignmentRequirements((prev) => {
				const next = new Set(prev);
				next.delete(normalizedCriteriaId);
				return next;
			});
		}
	};

	useEffect(() => {
		if (!isOpen || !event?.EventID || mainMode !== 'assign') return;

		const loadAssignmentData = async () => {
			setLoadingAssignmentData(true);
			setError('');
			setSuccess('');
			try {
				const officesPayload = await officesAPI.getAll();

				const officesList = Array.isArray(officesPayload)
					? officesPayload
					: Array.isArray(officesPayload?.data)
						? officesPayload.data
						: [];

				const filteredOffices = officesList.filter((office) => {
					const officeEventId = office.event_id ?? office.EventID ?? office.eventId;
					return Number(officeEventId) === Number(event.EventID);
				});

				setEventOffices(filteredOffices);
				setAssignmentCriteriaByArea({});
				setAssignmentRequirementsByCriteria({});
				setLoadingAssignmentCriteria(new Set());
				setLoadingAssignmentRequirements(new Set());
				setSelectedOfficeIds([]);
				setSelectedRequirementIds([]);
				setOfficeSearchTerm('');
				setRequirementSearchTerm('');
			} catch (err) {
				showError(err?.message || 'Failed to load offices and requirements for assignment.');
			} finally {
				setLoadingAssignmentData(false);
			}
		};

		loadAssignmentData();
	}, [isOpen, event?.EventID, mainMode]);

	const fieldClass =
		'w-full rounded-lg border border-blue-100 bg-app-surface px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors';

	const resetAndClose = () => {
		setMainMode('add');
		setMode('add-area');
		setError('');
		setSuccess('');
		if (toastTimerRef.current) {
			clearTimeout(toastTimerRef.current);
			toastTimerRef.current = null;
			setToastVisible(false);
		}
		setSaving(false);
		setEventOffices([]);
		setAssignmentCriteriaByArea({});
		setAssignmentRequirementsByCriteria({});
		setLoadingAssignmentCriteria(new Set());
		setLoadingAssignmentRequirements(new Set());
		setCriteriaForm({ CriteriaCode: '', CriteriaName: '', Description: '', AreaID: '' });
		setAreaForm({ AreaCode: '', AreaName: '', Description: '' });
		setSelectedOfficeIds([]);
		setSelectedRequirementIds([]);
		setOfficeSearchTerm('');
		setRequirementSearchTerm('');
		onClose();
	};

	const setMessage = (msg) => {
		if (toastTimerRef.current) {
			clearTimeout(toastTimerRef.current);
			toastTimerRef.current = null;
		}

		setSuccess(msg);
		setError('');
		setToastVisible(true);

		// Trigger standard floating toast slide-in from right
		toast({ title: 'Success', description: msg, variant: 'success' });

		// fade out after 2.5s, then clear string shortly after
		toastTimerRef.current = setTimeout(() => {
			setToastVisible(false);
			toastTimerRef.current = setTimeout(() => {
				setSuccess('');
				toastTimerRef.current = null;
			}, 400);
		}, 2500);
	};

	const showError = (msg) => {
		if (toastTimerRef.current) {
			clearTimeout(toastTimerRef.current);
			toastTimerRef.current = null;
		}

		setError(msg);
		setSuccess('');
		setToastVisible(true);

		// Trigger standard floating toast slide-in from right
		toast({ title: 'Error', description: msg, variant: 'error' });

		toastTimerRef.current = setTimeout(() => {
			setToastVisible(false);
			toastTimerRef.current = setTimeout(() => {
				setError('');
				toastTimerRef.current = null;
			}, 400);
		}, 4000);
	};

	const handleAddArea = async (e) => {
		e.preventDefault();
		setError('');
		setSuccess('');
		if (!areaForm.AreaCode.trim() || !areaForm.AreaName.trim()) {
			showError('Area code and area name are required.');
			return;
		}
		try {
			setSaving(true);
			await onAddArea(event.EventID, { ...areaForm, Description: areaForm.Description?.trim() ? areaForm.Description : null });
			setAreaForm({ AreaCode: '', AreaName: '', Description: '' });
			setMessage('Area added successfully.');
		} catch (err) {
			showError(err?.message || 'Failed to add area.');
		} finally {
			setSaving(false);
		}
	};

	const handleAddCriteria = async (e) => {
		e.preventDefault();
		setError('');
		setSuccess('');
		// If a parent criteria is selected, child criteria do not require a CriteriaCode
		if (!criteriaForm.CriteriaName.trim()) {
			showError('Criteria name is required.');
			return;
		}
		if (!criteriaForm.ParentCriteriaID && !criteriaForm.CriteriaCode.trim()) {
			showError('Criteria code is required for top-level criteria.');
			return;
		}
		try {
			setSaving(true);
			// ensure criteria code uniqueness within this event (case-insensitive)
			const newCode = String(criteriaForm.CriteriaCode || '').trim().toLowerCase();
			if (newCode) {
				const duplicate = (criteriaOptions || []).find((c) => String(c.CriteriaCode || '').trim().toLowerCase() === newCode && Number(c.EventID) === Number(event.EventID));
				if (duplicate) {
					showError('A criteria with this code already exists for this event.');
					setSaving(false);
					return;
				}
			}

					const selectedArea = criteriaForm.AreaID;
					const selectedParent = criteriaForm.ParentCriteriaID || '';
					await onAddCriteria(event.EventID, {
						// explicitly send CriteriaCode as null when creating a child criteria
						CriteriaCode: criteriaForm.ParentCriteriaID ? null : criteriaForm.CriteriaCode,
						...criteriaForm,
						AreaID: criteriaForm.AreaID ? Number(criteriaForm.AreaID) : null,
						ParentCriteriaID: criteriaForm.ParentCriteriaID === '' ? null : criteriaForm.ParentCriteriaID,
						Description: criteriaForm.Description?.trim() ? criteriaForm.Description : null,
					});
			// keep last chosen AreaID and ParentCriteriaID after saving; clear other fields
			setCriteriaForm({ CriteriaCode: '', CriteriaName: '', Description: '', AreaID: selectedArea || '', ParentCriteriaID: selectedParent || '' });
			setMessage('Criteria added successfully.');
		} catch (err) {
			showError(err?.message || 'Failed to add criteria.');
		} finally {
			setSaving(false);
		}
	};

	const handleAddRequirement = async (e) => {
		e.preventDefault();
		setError('');
		setSuccess('');
		if (!requirementForm.Description.trim() || !requirementForm.CriteriaID) {
			showError('Requirement description and criteria are required.');
			return;
		}

		try {
			setSaving(true);
			const selectedArea = requirementForm.AreaFilter;
			const selectedCriteria = requirementForm.CriteriaID;
			const selectedChild = requirementForm.ChildCriteriaID || '';
			const selectedParent = requirementForm.ParentRequirementCode || '';
			await onAddRequirement({
				RequirementCode: requirementForm.RequirementCode || null,
				Description: requirementForm.Description,
				CriteriaID: Number(selectedChild || requirementForm.CriteriaID),
				ParentRequirementCode: requirementForm.ParentRequirementCode || null
			});
			// keep selected Area, Criteria, Child and Parent after saving; clear other fields except preserved selections
			setRequirementForm({ RequirementCode: '', Description: '', CriteriaID: selectedCriteria || '', ChildCriteriaID: selectedChild || '', ParentRequirementCode: selectedParent || '', AreaFilter: selectedArea || '' });
			// reload parent options and regenerate next requirement code for the preserved criteria (preserve parent)
			if (selectedChild) {
				// if we added under a child, reload parent options for that child so the parent list updates immediately
				await loadParentRequirementsFor(selectedChild, true, selectedArea);
			} else if (selectedCriteria) {
				await handleRequirementCriteriaChange(selectedCriteria, true, selectedArea);
			} else {
				setParentRequirementOptions([]);
			}
			setMessage('Requirement added successfully.');
		} catch (err) {
			showError(err?.message || 'Failed to add requirement.');
		} finally {
			setSaving(false);
		}
	};

	const handleRequirementCriteriaChange = async (criteriaId, preserveParent = false, areaFilter = null) => {
		setRequirementForm(prev => ({
			...prev,
			CriteriaID: criteriaId,
			ParentRequirementCode: preserveParent ? prev.ParentRequirementCode : '',
			ChildCriteriaID: preserveParent ? prev.ChildCriteriaID : ''
		}));

		if (!criteriaId) {
			setParentRequirementOptions([]);
			return;
		}

		try {
			setLoadingParents(true);
			const options = await onLoadRequirementsByCriteria(Number(criteriaId));
			// DEBUG: log criteriaId and API response for troubleshooting empty parent list
			console.log('[DEBUG] handleRequirementCriteriaChange criteriaId=', criteriaId, 'options=', options);
			let list = Array.isArray(options) ? options : [];
			// if an area filter is provided (or set in form), filter parent requirement options by area
			// do not filter by area here — parent requirements for a chosen child should come from that child directly
			setParentRequirementOptions(list);

			// auto-generate next requirement code based on criteria code and existing requirements
			const baseCode = getBaseCriteriaCode(criteriaId);
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

	// Load parent requirement options for a given criteria id without changing the selected CriteriaID
	const loadParentRequirementsFor = async (criteriaId, preserveParent = false, areaFilter = null) => {
		if (!criteriaId) {
			setParentRequirementOptions([]);
			setRequirementForm(prev => ({ ...prev, RequirementCode: '' }));
			return;
		}
		try {
			setLoadingParents(true);
			const options = await onLoadRequirementsByCriteria(Number(criteriaId));
			// DEBUG: log criteriaId and API response for troubleshooting empty parent list
			console.log('[DEBUG] loadParentRequirementsFor criteriaId=', criteriaId, 'options=', options);
			let list = Array.isArray(options) ? options : [];
			// Do not filter by area here; show requirements belonging to the chosen criteria (child or parent)
			setParentRequirementOptions(list);

			// auto-generate next requirement code based on the target criteria code and existing requirements
			const baseCode = getBaseCriteriaCode(criteriaId);
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

	// regenerate RequirementCode whenever relevant selection changes
	useEffect(() => {
		const targetCriteriaId = requirementForm.ChildCriteriaID || requirementForm.CriteriaID;
		const baseCode = getBaseCriteriaCode(targetCriteriaId || requirementForm.CriteriaID);
		if (!baseCode) {
			setRequirementForm(prev => ({ ...prev, RequirementCode: '' }));
			return;
		}

		if (requirementForm.ParentRequirementCode) {
			// generate child code under selected parent
			const escapedParent = requirementForm.ParentRequirementCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const nums = (parentRequirementOptions || []).map(o => {
				const rc = String(o.RequirementCode || '');
				const m = rc.match(new RegExp(`^${escapedParent}\\.(\\d+)$`));
				return m ? Number(m[1]) : null;
			}).filter(n => n !== null);
			const next = nums.length ? Math.max(...nums) + 1 : 1;
			setRequirementForm(prev => ({ ...prev, RequirementCode: `${requirementForm.ParentRequirementCode}.${next}` }));
			return;
		}

		// otherwise generate top-level code under the target criteria
		const escapedBase = baseCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const nums = (parentRequirementOptions || []).map(o => {
			const rc = String(o.RequirementCode || '');
			const m = rc.match(new RegExp(`^${escapedBase}\\.(\\d+)$`));
			return m ? Number(m[1]) : null;
		}).filter(n => n !== null);
		const next = nums.length ? Math.max(...nums) + 1 : 1;
		setRequirementForm(prev => ({ ...prev, RequirementCode: `${baseCode}.${next}` }));
	}, [requirementForm.ParentRequirementCode, requirementForm.ChildCriteriaID, requirementForm.CriteriaID, parentRequirementOptions]);

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
			showError('Select at least one office.');
			return;
		}

		if (normalizedRequirementIds.length === 0) {
			showError('Select at least one requirement, criteria, or area.');
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
			showError(err?.message || 'Failed to assign requirements to selected offices.');
		} finally {
			setSaving(false);
		}
	};

    
    
	if (!isOpen || !event) return null;

	return (
		<div className="fixed top-4 right-4 bottom-4 z-[50] flex bg-transparent" style={{ left: 'calc(var(--sidebar-width, 0px) + 28px)' }}>
			<div className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl">
				<ModalHeader event={event} onClose={resetAndClose} mainMode={mainMode} />
				<div className="flex min-h-0 flex-1 gap-4">
					<EventStructureSidebar
						mainMode={mainMode}
						mode={mode}
						onSelectAdd={() => {
							setMainMode('add');
							setMode('add-area');
							setError('');
							setSuccess('');
						}}
						onSelectAssign={() => {
							setMainMode('assign');
							setError('');
							setSuccess('');
						}}
						onSelectAddArea={() => {
							setMainMode('add');
							setMode('add-area');
							setError('');
							setSuccess('');
						}}
						onSelectAddCriteria={() => {
							setMainMode('add');
							setMode('add-criteria');
							setError('');
							setSuccess('');
						}}
						onSelectAddRequirement={() => {
							setMainMode('add');
							setMode('add-requirement');
							setError('');
							setSuccess('');
						}}
					/>

				<div className="relative flex min-w-0 flex-1 flex-col bg-slate-50/50">


						<div
							className={`flex min-h-0 flex-1 flex-col overflow-hidden py-4 ${
								mainMode === 'assign' ? 'px-3 sm:px-4' : 'px-4 sm:px-5'
							}`}
						>
							{mainMode === 'add' && (
								<div className="mx-auto w-full max-w-2xl">
									{mode === 'add-area' && (
										<AddAreaForm
											fieldClass={fieldClass}
											saving={saving}
											areaForm={areaForm}
											setAreaForm={setAreaForm}
											onSubmit={handleAddArea}
										/>
									)}
									{mode === 'add-criteria' && (
										<AddCriteriaForm
											areas={areas}
											criteriaForm={criteriaForm}
											setCriteriaForm={setCriteriaForm}
											parentCriteriaOptions={parentCriteriaOptions}
											fieldClass={fieldClass}
											saving={saving}
											onSubmit={handleAddCriteria}
										/>
									)}
									{mode === 'add-requirement' && (
										<AddRequirementForm
											areas={areas}
											requirementForm={requirementForm}
											setRequirementForm={setRequirementForm}
											filteredCriteriaOptions={filteredCriteriaOptions}
											handleRequirementCriteriaChange={handleRequirementCriteriaChange}
											onChildCriteriaChange={(val) => {
												if (val) loadParentRequirementsFor(val, false, requirementForm.AreaFilter);
												else if (requirementForm.CriteriaID)
													loadParentRequirementsFor(requirementForm.CriteriaID, false, requirementForm.AreaFilter);
											}}
											childCriteriaOptions={childCriteriaOptions}
											parentRequirementOptions={parentRequirementOptions}
											handleParentRequirementChange={handleParentRequirementChange}
											loadingParents={loadingParents}
											fieldClass={fieldClass}
											saving={saving}
											onSubmit={handleAddRequirement}
										/>
									)}
								</div>
							)}

							{mainMode === 'assign' && (
								<div className="flex min-h-0 flex-1 flex-col">
								<AssignPanel
									onAssign={handleAssignRequirementsToOffices}
									loadingAssignmentData={loadingAssignmentData}
									allOfficesSelected={allOfficesSelected}
									allOfficeIds={allOfficeIds}
									setSelectedOfficeIds={setSelectedOfficeIds}
									officeSearchTerm={officeSearchTerm}
									setOfficeSearchTerm={setOfficeSearchTerm}
									eventOffices={eventOffices}
									filteredEventOffices={filteredEventOffices}
									selectedOfficeIds={selectedOfficeIds}
									toggleOffice={toggleOffice}
									requirementSearchTerm={requirementSearchTerm}
									setRequirementSearchTerm={setRequirementSearchTerm}
									requirementTree={requirementTree}
									filteredRequirementTree={filteredRequirementTree}
									selectedRequirementIdSet={selectedRequirementIdSet}
									toggleRequirement={toggleRequirement}
									toggleRequirementBatch={toggleRequirementBatch}
									loadCriteriaForArea={loadAssignmentCriteriaForArea}
									loadRequirementsForCriteria={loadAssignmentRequirementsForCriteria}
									loadingCriteriaIds={loadingAssignmentCriteria}
									loadingRequirementIds={loadingAssignmentRequirements}
									allRequirementsSelected={allRequirementsSelected}
									allRequirementIds={allRequirementIds}
									selectedRequirementIds={selectedRequirementIds}
									actionButtonClass={saveButtonClass}
									saving={saving}
									error={error}
									success={success}
									criteriaOptions={criteriaOptions}
								/>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
