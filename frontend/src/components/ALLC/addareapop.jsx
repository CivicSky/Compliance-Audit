import { useMemo, useState } from 'react';

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
	const [mainMode, setMainMode] = useState('add'); // 'add' or 'edit'
	const [editMode, setEditMode] = useState('edit-area'); // 'edit-area', 'edit-criteria', 'edit-requirement'
	const [mode, setMode] = useState('add-area'); // for backward compatibility, will be used for add sub-tabs
	const [saving, setSaving] = useState(false);
	const [loadingParents, setLoadingParents] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');

	const [areaForm, setAreaForm] = useState({ AreaCode: '', AreaName: '', Description: '' });
	const [criteriaForm, setCriteriaForm] = useState({ CriteriaCode: '', CriteriaName: '', Description: '', AreaID: '' });
	const [requirementForm, setRequirementForm] = useState({ RequirementCode: '', Description: '', CriteriaID: '', ParentRequirementCode: '', AreaFilter: '' });
	const [parentRequirementOptions, setParentRequirementOptions] = useState([]);
	const [editAreaId, setEditAreaId] = useState('');
	const [editAreaForm, setEditAreaForm] = useState({ AreaCode: '', AreaName: '', Description: '' });

	const selectedArea = useMemo(
		() => (areas || []).find(a => Number(a.AreaID) === Number(editAreaId)),
		[areas, editAreaId]
	);

	const filteredCriteriaOptions = useMemo(() => {
		const list = criteriaOptions || [];
		if (!requirementForm.AreaFilter) return [];

		return list.filter(crit => Number(crit.AreaID) === Number(requirementForm.AreaFilter));
	}, [criteriaOptions, requirementForm.AreaFilter]);

	if (!isOpen || !event) return null;

	const resetAndClose = () => {
		setMode('add-area');
		setError('');
		setSuccess('');
		setSaving(false);
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
		if (!requirementForm.RequirementCode.trim() || !requirementForm.Description.trim() || !requirementForm.CriteriaID) {
			setError('Requirement code, description, and criteria are required.');
			return;
		}

		try {
			setSaving(true);
			await onAddRequirement({
				RequirementCode: requirementForm.RequirementCode,
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
			setParentRequirementOptions(Array.isArray(options) ? options : []);
		} catch {
			setParentRequirementOptions([]);
		} finally {
			setLoadingParents(false);
		}
	};

	const handleSelectEditArea = (areaId) => {
		setEditAreaId(areaId);
		const area = (areas || []).find(a => Number(a.AreaID) === Number(areaId));
		if (area) {
			setEditAreaForm({
				AreaCode: area.AreaCode || '',
				AreaName: area.AreaName || '',
				Description: area.Description || ''
			});
		}
	};

	const handleEditArea = async (e) => {
		e.preventDefault();
		setError('');
		setSuccess('');
		if (!editAreaId) {
			setError('Select an area to edit.');
			return;
		}
		if (!editAreaForm.AreaCode.trim() || !editAreaForm.AreaName.trim()) {
			setError('Area code and area name are required.');
			return;
		}
		try {
			setSaving(true);
			await onEditArea(editAreaId, editAreaForm);
			setMessage('Area updated successfully.');
		} catch (err) {
			setError(err?.message || 'Failed to edit area.');
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4">
				<div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-6">
				<div className="flex items-start justify-between mb-4">
					<div>
						<h3 className="text-xl font-bold text-gray-800">Manage Event Structure</h3>
						<p className="text-sm text-gray-600">{event.EventName}</p>
					</div>
					<button onClick={resetAndClose} className="text-gray-500 hover:text-gray-700 text-xl">✕</button>
				</div>

				{/* Main mode selector */}
				<div className="flex gap-2 mb-4">
					<button
						onClick={() => { setMainMode('add'); setMode('add-area'); }}
						className={`px-4 py-2 rounded ${mainMode === 'add' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}
					>
						Add
					</button>
					<button
						onClick={() => { setMainMode('edit'); setEditMode('edit-area'); }}
						className={`px-4 py-2 rounded ${mainMode === 'edit' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}
					>
						Edit
					</button>
				</div>

				{/* Sub-tabs for add/edit */}
				{mainMode === 'add' && (
					<div className="grid grid-cols-3 gap-2 mb-4">
						<button onClick={() => setMode('add-area')} className={`px-3 py-2 rounded ${mode === 'add-area' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Add Area</button>
						<button onClick={() => setMode('add-criteria')} className={`px-3 py-2 rounded ${mode === 'add-criteria' ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-700'}`}>Add Criteria</button>
						<button onClick={() => setMode('add-requirement')} className={`px-3 py-2 rounded ${mode === 'add-requirement' ? 'bg-emerald-700 text-white' : 'bg-gray-100 text-gray-700'}`}>Add Requirement</button>
					</div>
				)}
				{mainMode === 'edit' && (
					<div className="grid grid-cols-3 gap-2 mb-4">
						<button onClick={() => setEditMode('edit-area')} className={`px-3 py-2 rounded ${editMode === 'edit-area' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Edit Area</button>
						<button onClick={() => setEditMode('edit-criteria')} className={`px-3 py-2 rounded ${editMode === 'edit-criteria' ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-700'}`}>Edit Criteria</button>
						<button onClick={() => setEditMode('edit-requirement')} className={`px-3 py-2 rounded ${editMode === 'edit-requirement' ? 'bg-emerald-700 text-white' : 'bg-gray-100 text-gray-700'}`}>Edit Requirement</button>
					</div>
				)}

				{/* Modal content - removed fixed minHeight to eliminate empty space */}
				<div>
					{/* Add forms */}
					{mainMode === 'add' && mode === 'add-area' && (
						<form onSubmit={handleAddArea} className="space-y-3">
							<input
								className="w-full border rounded px-3 py-2"
								placeholder="Area Code"
								value={areaForm.AreaCode}
								onChange={(e) => setAreaForm(prev => ({ ...prev, AreaCode: e.target.value }))}
							/>
							<input
								className="w-full border rounded px-3 py-2"
								placeholder="Area Name"
								value={areaForm.AreaName}
								onChange={(e) => setAreaForm(prev => ({ ...prev, AreaName: e.target.value }))}
							/>
							<textarea
								className="w-full border rounded px-3 py-2"
								placeholder="Description (optional)"
								value={areaForm.Description}
								onChange={(e) => setAreaForm(prev => ({ ...prev, Description: e.target.value }))}
							/>
							<div className="flex gap-2 justify-end">
								<button type="submit" disabled={saving} className="px-4 py-2 rounded bg-purple-600 text-white disabled:opacity-60">
									{saving ? 'Saving...' : 'Save Area'}
								</button>
							</div>
						</form>
					)}

					{/* Edit forms */}
					{mainMode === 'edit' && editMode === 'edit-area' && (
						<form onSubmit={handleEditArea} className="space-y-3">
							<select
								className="w-full border rounded px-3 py-2"
								value={editAreaId}
								onChange={(e) => handleSelectEditArea(e.target.value)}
							>
								<option value="">Select area</option>
								{(areas || []).map(area => (
									<option key={area.AreaID} value={area.AreaID}>{area.AreaName}</option>
								))}
							</select>

							<input
								className="w-full border rounded px-3 py-2"
								placeholder="Area Code"
								value={editAreaForm.AreaCode}
								onChange={(e) => setEditAreaForm(prev => ({ ...prev, AreaCode: e.target.value }))}
								disabled={!selectedArea}
							/>
							<input
								className="w-full border rounded px-3 py-2"
								placeholder="Area Name"
								value={editAreaForm.AreaName}
								onChange={(e) => setEditAreaForm(prev => ({ ...prev, AreaName: e.target.value }))}
								disabled={!selectedArea}
							/>
							<textarea
								className="w-full border rounded px-3 py-2"
								placeholder="Description"
								value={editAreaForm.Description}
								onChange={(e) => setEditAreaForm(prev => ({ ...prev, Description: e.target.value }))}
								disabled={!selectedArea}
							/>
							<div className="flex gap-2 justify-end">
								<button type="submit" disabled={saving || !selectedArea} className="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-60">
									{saving ? 'Saving...' : 'Save Changes'}
								</button>
							</div>
						</form>
					)}

					{/* Placeholder for Edit Criteria and Edit Requirement */}
					{mainMode === 'edit' && editMode === 'edit-criteria' && (
						<div className="p-4 text-gray-500 border rounded">Edit Criteria form goes here.</div>
					)}
					{mainMode === 'edit' && editMode === 'edit-requirement' && (
						<div className="p-4 text-gray-500 border rounded">Edit Requirement form goes here.</div>
					)}
				</div>

				{mode === 'add-criteria' && (
					<form onSubmit={handleAddCriteria} className="space-y-3">
						<select
							className="w-full border rounded px-3 py-2"
							value={criteriaForm.AreaID}
							onChange={(e) => setCriteriaForm(prev => ({ ...prev, AreaID: e.target.value }))}
						>
							<option value="">No Area (optional)</option>
							{(areas || []).map((area) => (
								<option key={area.AreaID} value={area.AreaID}>{area.AreaName}</option>
							))}
						</select>
						<input
							className="w-full border rounded px-3 py-2"
							placeholder="Criteria Code"
							value={criteriaForm.CriteriaCode}
							onChange={(e) => setCriteriaForm(prev => ({ ...prev, CriteriaCode: e.target.value }))}
						/>
						<input
							className="w-full border rounded px-3 py-2"
							placeholder="Criteria Name"
							value={criteriaForm.CriteriaName}
							onChange={(e) => setCriteriaForm(prev => ({ ...prev, CriteriaName: e.target.value }))}
						/>
						<textarea
							className="w-full border rounded px-3 py-2"
							placeholder="Description"
							value={criteriaForm.Description}
							onChange={(e) => setCriteriaForm(prev => ({ ...prev, Description: e.target.value }))}
						/>
						<div className="flex gap-2 justify-end">
							<button type="submit" disabled={saving} className="px-4 py-2 rounded bg-slate-700 text-white disabled:opacity-60">
								{saving ? 'Saving...' : 'Save Criteria'}
							</button>
						</div>
					</form>
				)}

				{mode === 'add-requirement' && (
					<form onSubmit={handleAddRequirement} className="space-y-3">
						<select
							className="w-full border rounded px-3 py-2"
							value={requirementForm.AreaFilter}
							onChange={(e) => setRequirementForm(prev => ({ ...prev, AreaFilter: e.target.value, CriteriaID: '' }))}
						>
							<option value="">Select area</option>
							{(areas || []).map((area) => (
								<option key={area.AreaID} value={area.AreaID}>{area.AreaName}</option>
							))}
						</select>
						<select
							className="w-full border rounded px-3 py-2"
							value={requirementForm.CriteriaID}
							onChange={(e) => handleRequirementCriteriaChange(e.target.value)}
						>
							<option value="">Select criteria</option>
							{filteredCriteriaOptions.map((crit) => (
								<option key={crit.CriteriaID} value={crit.CriteriaID}>
									{crit.CriteriaName} {crit.AreaName ? `- (${crit.AreaName})` : '- (No Area)'}
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
							className="w-full border rounded px-3 py-2"
							value={requirementForm.ParentRequirementCode}
							onChange={(e) => setRequirementForm(prev => ({ ...prev, ParentRequirementCode: e.target.value }))}
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
						<input
							className="w-full border rounded px-3 py-2"
							placeholder="Requirement Code"
							value={requirementForm.RequirementCode}
							onChange={(e) => setRequirementForm(prev => ({ ...prev, RequirementCode: e.target.value }))}
							disabled={!requirementForm.CriteriaID}
						/>
						<textarea
							className="w-full border rounded px-3 py-2"
							placeholder="Requirement Description"
							value={requirementForm.Description}
							onChange={(e) => setRequirementForm(prev => ({ ...prev, Description: e.target.value }))}
							disabled={!requirementForm.CriteriaID}
						/>
						<div className="flex gap-2 justify-end">
							<button type="submit" disabled={saving || !requirementForm.CriteriaID} className="px-4 py-2 rounded bg-emerald-700 text-white disabled:opacity-60">
								{saving ? 'Saving...' : 'Save Requirement'}
							</button>
						</div>
					</form>
				)}

				{error && <p className="text-sm text-red-600 mt-3">{error}</p>}
				{success && <p className="text-sm text-emerald-600 mt-3">{success}</p>}
			</div>
		</div>
	);
}
