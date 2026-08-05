export default function ModalHeader({ event, onClose, mainMode }) {
	const subtitle =
		mainMode === 'assign'
			? 'Assign requirements from your event structure to one or more offices.'
			: 'Create and organize areas, criteria, and requirements.';

	return (
		<header className="flex shrink-0 items-start justify-between gap-4 border-b border-blue-100 bg-app-surface px-5 py-4">
			<div className="min-w-0">
				<h2 className="text-xl font-semibold tracking-tight text-slate-900">Manage event structure</h2>
				<p className="mt-1 text-sm text-slate-500">{subtitle}</p>
				{event && (
					<span className="mt-2 inline-flex items-center rounded-full border border-blue-200/80 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">
						{event.EventCode || event.EventName}
					</span>
				)}
			</div>
			<button
				type="button"
				onClick={onClose}
				className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-200/70 bg-blue-50 text-blue-600 transition hover:bg-blue-100"
				aria-label="Close"
			>
				<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</header>
	);
}
