export default function ToastBanner({ error, success, toastVisible }) {
	if (!error && !success) return null;

	return (
		<div
			className="pointer-events-none absolute left-1/2 top-20 z-30 w-[min(92%,520px)] -translate-x-1/2"
			style={{ transition: 'opacity 400ms ease', opacity: (error || success) ? (toastVisible ? 1 : 0) : 0 }}
		>
			{error ? (
				<p className="rounded-lg border border-rose-300 bg-rose-100 px-3 py-2 text-sm text-rose-800 shadow-sm">{error}</p>
			) : (
				<p
					className="rounded-lg border border-emerald-300 bg-emerald-100 px-3 py-2 text-sm text-emerald-800 shadow-sm"
					aria-live="polite"
				>
					{success}
				</p>
			)}
		</div>
	);
}
