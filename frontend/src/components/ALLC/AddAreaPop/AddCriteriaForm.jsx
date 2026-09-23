import { useMemo } from 'react';
import LongSelectPreview from './LongSelectPreview';
import { formShellClass, saveButtonClass, formFooterClass } from './formStyles';
import CustomSelect from '../../UI/CustomSelect';

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
				<CustomSelect
					size="md"
					value={criteriaForm.AreaID}
					onChange={(v) => {
						setCriteriaForm((prev) => ({ ...prev, AreaID: v, ParentCriteriaID: v ? prev.ParentCriteriaID : '' }));
					}}
					options={[
						{ value: '', label: 'No area (optional)' },
						...(areas || []).map((area) => ({
							value: String(area.AreaID),
							label: area.AreaCode ? `${area.AreaCode} - ${area.AreaName}` : area.AreaName
						}))
					]}
					placeholder="No area (optional)"
				/>
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
				<CustomSelect
					size="md"
					value={criteriaForm.ParentCriteriaID}
					onChange={(val) => setCriteriaForm((prev) => ({ ...prev, ParentCriteriaID: val }))}
					disabled={!criteriaForm.AreaID}
					options={[
						{ value: '', label: 'No parent (optional)' },
						...parentCriteriaOptions.map((crit) => ({
							value: String(crit.CriteriaID),
							label: crit.CriteriaCode ? `${crit.CriteriaCode} - ${crit.CriteriaName}` : crit.CriteriaName
						}))
					]}
					placeholder="No parent (optional)"
				/>
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
