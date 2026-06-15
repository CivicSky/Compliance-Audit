const navBtn = (active) =>
	`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
		active
			? 'bg-indigo-600 text-white shadow-sm'
			: 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
	}`;

const subNavBtn = (active) =>
	`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition ${
		active
			? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200/80'
			: 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
	}`;

export default function EventStructureSidebar({
	mainMode,
	mode,
	onSelectAdd,
	onSelectAssign,
	onSelectAddArea,
	onSelectAddCriteria,
	onSelectAddRequirement,
}) {
	return (
		<aside className="flex w-[220px] shrink-0 flex-col border-r border-stone-200/90 bg-app-surface">
			<div className="border-b border-slate-300/50 px-3 py-3">
				<p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Workflow</p>
			</div>

			<nav className="flex flex-1 flex-col gap-1 p-2">
				<button type="button" onClick={onSelectAdd} className={navBtn(mainMode === 'add')}>
					<svg className="h-4 w-4 shrink-0 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
					</svg>
					Build structure
				</button>

				{mainMode === 'add' && (
					<div className="ml-1 space-y-0.5 border-l-2 border-slate-300/60 pl-2">
						<button type="button" onClick={onSelectAddArea} className={subNavBtn(mode === 'add-area')}>
							Area
						</button>
						<button type="button" onClick={onSelectAddCriteria} className={subNavBtn(mode === 'add-criteria')}>
							Criteria
						</button>
						<button type="button" onClick={onSelectAddRequirement} className={subNavBtn(mode === 'add-requirement')}>
							Requirement
						</button>
					</div>
				)}

				<button type="button" onClick={onSelectAssign} className={navBtn(mainMode === 'assign')}>
					<svg className="h-4 w-4 shrink-0 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
					</svg>
					Assign to offices
				</button>
			</nav>

			<div className="border-t border-slate-300/50 p-3">
				<p className="text-[11px] leading-relaxed text-slate-500">
					{mainMode === 'assign'
						? 'Pick offices on the left, then requirements on the right.'
						: 'Add areas, then criteria, then requirements.'}
				</p>
			</div>
		</aside>
	);
}
