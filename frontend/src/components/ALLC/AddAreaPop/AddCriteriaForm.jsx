import { useMemo } from 'react';
import LongSelectPreview from './LongSelectPreview';
import { formShellClass, saveButtonClass, formFooterClass } from './formStyles';

export default function AddCriteriaForm({
	areas,
	criteriaForm,
	setCriteriaForm,
	parentCriteriaOptions,
	fieldClass,
	saving,
	onSubmit,
}) {
	const selectedParent = useMemo(
		() => parentCriteriaOptions.find((c) => String(c.CriteriaID) === String(criteriaForm.ParentCriteriaID)),
		[parentCriteriaOptions, criteriaForm.ParentCriteriaID]
	);

	const selectedArea = useMemo(
		() => (areas || []).find((a) => String(a.AreaID) === String(criteriaForm.AreaID)),
		[areas, criteriaForm.AreaID]
	);

	return (
		<form onSubmit={onSubmit} className={formShellClass}>
			<div>
				<label className="mb-1 block text-xs font-semibold text-stone-600">Area</label>
				<select
					className={fieldClass}
					value={criteriaForm.AreaID}
					onChange={(e) => {
						const v = e.target.value;
						setCriteriaForm((prev) => ({ ...prev, AreaID: v, ParentCriteriaID: v ? prev.ParentCriteriaID : '' }));
					}}
				>
					<option value="">No area (optional)</option>
					{(areas || []).map((area) => (
						<option
							key={area.AreaID}
							value={area.AreaID}
							title={area.AreaCode ? `${area.AreaCode} - ${area.AreaName}` : area.AreaName}
						>
							{area.AreaCode ? `${area.AreaCode} - ${area.AreaName}` : area.AreaName}
						</option>
					))}
				</select>
				{selectedArea && (
					<div className="mt-2">
						<LongSelectPreview
							label="Selected area"
							title={selectedArea.AreaCode ? `${selectedArea.AreaCode} - ${selectedArea.AreaName}` : selectedArea.AreaName}
						/>
					</div>
				)}
			</div>

			<div>
				<label className="mb-1 block text-xs font-semibold text-stone-600">Parent criteria (optional)</label>
				<select
					className={fieldClass}
					value={criteriaForm.ParentCriteriaID}
					onChange={(e) => setCriteriaForm((prev) => ({ ...prev, ParentCriteriaID: e.target.value }))}
					disabled={!criteriaForm.AreaID}
					title={!criteriaForm.AreaID ? 'Select an area first to choose a parent criteria' : ''}
				>
					<option value="">No parent (optional)</option>
					{parentCriteriaOptions.map((crit) => {
						const text = crit.CriteriaCode ? `${crit.CriteriaCode} - ${crit.CriteriaName}` : crit.CriteriaName;
						return (
							<option key={crit.CriteriaID} value={crit.CriteriaID} title={text}>
								{text}
							</option>
						);
					})}
				</select>
				<div className="mt-2">
					<LongSelectPreview
						label="Selected parent criteria"
						title={
							selectedParent
								? selectedParent.CriteriaCode
									? `${selectedParent.CriteriaCode} - ${selectedParent.CriteriaName}`
									: selectedParent.CriteriaName
								: null
						}
						body={selectedParent?.Description || null}
						emptyHint={criteriaForm.AreaID ? 'No parent selected — this will be a top-level criteria.' : null}
					/>
				</div>
			</div>

			<div>
				<label className="mb-1 block text-xs font-semibold text-stone-600">Criteria code</label>
				<input
					className={fieldClass}
					placeholder={criteriaForm.ParentCriteriaID ? 'No code required for child criteria' : 'Criteria code'}
					value={criteriaForm.CriteriaCode}
					onChange={(e) => setCriteriaForm((prev) => ({ ...prev, CriteriaCode: (e.target.value || '').toUpperCase() }))}
					disabled={!!criteriaForm.ParentCriteriaID}
				/>
			</div>

			<div>
				<label className="mb-1 block text-xs font-semibold text-stone-600">Criteria name</label>
				<input
					className={fieldClass}
					placeholder="Criteria name"
					value={criteriaForm.CriteriaName}
					onChange={(e) => setCriteriaForm((prev) => ({ ...prev, CriteriaName: e.target.value }))}
				/>
			</div>

			<div className={formFooterClass}>
				<button type="submit" disabled={saving} className={saveButtonClass}>
					{saving ? 'Saving…' : 'Save criteria'}
				</button>
			</div>
		</form>
	);
}
