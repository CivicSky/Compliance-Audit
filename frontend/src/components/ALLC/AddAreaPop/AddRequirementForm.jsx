import { useMemo } from 'react';
import LongSelectPreview from './LongSelectPreview';
import { formShellClass, saveButtonClass, formFooterClass } from './formStyles';

function optionLabel(code, name, suffix = '') {
	const base = code ? `${code} - ${name}` : name;
	return suffix ? `${base} ${suffix}` : base;
}

export default function AddRequirementForm({
	areas,
	requirementForm,
	setRequirementForm,
	filteredCriteriaOptions,
	handleRequirementCriteriaChange,
	onChildCriteriaChange,
	childCriteriaOptions,
	parentRequirementOptions,
	handleParentRequirementChange,
	loadingParents,
	fieldClass,
	saving,
	onSubmit,
}) {
	const selectedCriteria = useMemo(
		() => filteredCriteriaOptions.find((c) => String(c.CriteriaID) === String(requirementForm.CriteriaID)),
		[filteredCriteriaOptions, requirementForm.CriteriaID]
	);

	const selectedParent = useMemo(
		() =>
			parentRequirementOptions.find(
				(r) => String(r.RequirementCode) === String(requirementForm.ParentRequirementCode)
			),
		[parentRequirementOptions, requirementForm.ParentRequirementCode]
	);

	const selectedArea = useMemo(() => {
		if (requirementForm.AreaFilter === '__no_area__') return { label: 'No Area (criteria without area)' };
		return (areas || []).find((a) => String(a.AreaID) === String(requirementForm.AreaFilter));
	}, [areas, requirementForm.AreaFilter]);

	return (
		<form onSubmit={onSubmit} className={formShellClass}>
			<div>
				<label className="mb-1 block text-xs font-semibold text-stone-600">Area</label>
				<select
					className={fieldClass}
					value={requirementForm.AreaFilter}
					onChange={(e) => setRequirementForm((prev) => ({ ...prev, AreaFilter: e.target.value, CriteriaID: '' }))}
				>
					<option value="">Select area</option>
					<option value="__no_area__">No Area (criteria without area)</option>
					{(areas || []).map((area) => (
						<option
							key={area.AreaID}
							value={area.AreaID}
							title={optionLabel(area.AreaCode, area.AreaName)}
						>
							{optionLabel(area.AreaCode, area.AreaName)}
						</option>
					))}
				</select>
				{selectedArea && requirementForm.AreaFilter && (
					<div className="mt-2">
						<LongSelectPreview
							label="Selected area"
							title={
								requirementForm.AreaFilter === '__no_area__'
									? selectedArea.label
									: optionLabel(selectedArea.AreaCode, selectedArea.AreaName)
							}
						/>
					</div>
				)}
			</div>

			<div>
				<label className="mb-1 block text-xs font-semibold text-stone-600">Criteria</label>
				<select
					className={fieldClass}
					value={requirementForm.CriteriaID}
					onChange={(e) => handleRequirementCriteriaChange(e.target.value, false, requirementForm.AreaFilter)}
					disabled={!requirementForm.AreaFilter}
				>
					<option value="">Select criteria</option>
					{filteredCriteriaOptions.map((crit) => {
						const text = optionLabel(
							crit.CriteriaCode,
							crit.CriteriaName,
							crit.AreaName ? `- (${crit.AreaName})` : '- (No Area)'
						);
						return (
							<option key={crit.CriteriaID} value={crit.CriteriaID} title={text}>
								{text}
							</option>
						);
					})}
				</select>
				{requirementForm.AreaFilter && filteredCriteriaOptions.length === 0 && (
					<p className="mt-1 text-xs text-stone-500">No criteria found for the selected area filter.</p>
				)}
				{!requirementForm.AreaFilter && (
					<p className="mt-1 text-xs text-stone-500">Select an area first to load criteria.</p>
				)}
				{selectedCriteria && (
					<div className="mt-2">
						<LongSelectPreview
							label="Selected criteria"
							title={optionLabel(selectedCriteria.CriteriaCode, selectedCriteria.CriteriaName)}
							body={selectedCriteria.Description || null}
						/>
					</div>
				)}
			</div>

			{childCriteriaOptions.length > 0 && (
				<div>
					<label className="mb-1 block text-xs font-semibold text-stone-600">Child criteria (optional)</label>
					<select
						className={fieldClass}
						value={requirementForm.ChildCriteriaID}
						onChange={(e) => {
							const val = e.target.value;
							setRequirementForm((prev) => ({ ...prev, ChildCriteriaID: val }));
							onChildCriteriaChange?.(val);
						}}
						disabled={!requirementForm.CriteriaID}
					>
						<option value="">No child selected (use selected criteria)</option>
						{childCriteriaOptions.map((cc) => {
							const text = optionLabel(cc.CriteriaCode, cc.CriteriaName);
							return (
								<option key={cc.CriteriaID} value={cc.CriteriaID} title={text}>
									{text}
								</option>
							);
						})}
					</select>
				</div>
			)}

			<div>
				<label className="mb-1 block text-xs font-semibold text-stone-600">Parent requirement (optional)</label>
				<select
					className={fieldClass}
					value={requirementForm.ParentRequirementCode}
					onChange={(e) => handleParentRequirementChange(e.target.value)}
					disabled={!requirementForm.CriteriaID || loadingParents}
				>
					<option value="">No parent requirement (optional)</option>
					{parentRequirementOptions.map((req) => {
						const text = optionLabel(req.RequirementCode, req.Description);
						return (
							<option key={req.RequirementID} value={req.RequirementCode} title={text}>
								{text}
							</option>
						);
					})}
				</select>
				{requirementForm.CriteriaID && loadingParents && (
					<p className="mt-1 text-xs text-stone-500">Loading parent requirement options…</p>
				)}
				<div className="mt-2">
					<LongSelectPreview
						label="Selected parent requirement"
						title={
							selectedParent
								? selectedParent.RequirementCode
								: requirementForm.ParentRequirementCode
									? requirementForm.ParentRequirementCode
									: null
						}
						body={selectedParent?.Description}
						emptyHint={
							requirementForm.CriteriaID && !loadingParents
								? 'No parent selected — this will be a top-level requirement under the criteria.'
								: null
						}
					/>
				</div>
			</div>

			<div>
				<label className="mb-1 block text-xs font-semibold text-stone-600">Requirement code (editable)</label>
				<input
					className={fieldClass}
					value={requirementForm.RequirementCode || ''}
					onChange={(e) => setRequirementForm((prev) => ({ ...prev, RequirementCode: e.target.value }))}
					placeholder="Leave empty to auto-generate"
					disabled={!requirementForm.CriteriaID}
				/>
			</div>

			<div>
				<label className="mb-1 block text-xs font-semibold text-stone-600">Requirement description</label>
				<textarea
					className={`${fieldClass} min-h-[120px] resize-y`}
					placeholder="Requirement description"
					value={requirementForm.Description}
					onChange={(e) => setRequirementForm((prev) => ({ ...prev, Description: e.target.value }))}
					disabled={!requirementForm.CriteriaID}
				/>
			</div>

			<div className={formFooterClass}>
				<button type="submit" disabled={saving || !requirementForm.CriteriaID} className={saveButtonClass}>
					{saving ? 'Saving…' : 'Save requirement'}
				</button>
			</div>
		</form>
	);
}
