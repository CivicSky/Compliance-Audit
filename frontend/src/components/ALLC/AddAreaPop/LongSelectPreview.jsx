/**
 * Native <select> truncates long labels. Pair with this read-only preview for full text.
 */
export default function LongSelectPreview({ label, title, body, emptyHint }) {
	if (!title && !body) {
		if (!emptyHint) return null;
		return <p className="text-xs text-stone-500">{emptyHint}</p>;
	}

	return (
		<div className="rounded-lg border border-stone-200/90 bg-app-muted px-3 py-2.5">
			{label && (
				<p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">{label}</p>
			)}
			{title && <p className="mt-0.5 text-sm font-semibold text-stone-900">{title}</p>}
			{body && (
				<p className="mt-1 text-sm leading-relaxed text-stone-700 whitespace-pre-wrap break-words">{body}</p>
			)}
		</div>
	);
}
