import { useState } from "react";

export default function CopyEventPopup({
	open,
	defaultName = "",
	defaultCode = "",
	defaultDescription = "",
	onCancel,
	onConfirm
}) {
	const [eventName, setEventName] = useState(defaultName);
	const [eventCode, setEventCode] = useState(defaultCode);
	const [description, setDescription] = useState(defaultDescription);
	const [submitting, setSubmitting] = useState(false);

	if (!open) return null;

	const handleCopy = async () => {
		if (!eventName.trim() || !eventCode.trim() || submitting) return;
		setSubmitting(true);
		try {
			await onConfirm({ eventName, eventCode, description });
		} catch (e) {
			console.error(e);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="fixed inset-y-0 right-0 left-0 lg:left-[var(--sidebar-width)] lg:transition-[left] lg:duration-200 lg:ease-in-out z-[50] flex items-center justify-center bg-black bg-opacity-40">
			<div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
				<h2 className="text-xl font-bold mb-4">Copy Event</h2>
				<div className="mb-3">
					<label className="block text-sm font-medium mb-1">Event Name</label>
					<input
						className="w-full border rounded px-3 py-2 text-sm disabled:opacity-50"
						value={eventName}
						onChange={e => setEventName(e.target.value)}
						disabled={submitting}
						autoFocus
					/>
				</div>
				<div className="mb-3">
					<label className="block text-sm font-medium mb-1">Event Code</label>
					<input
						className="w-full border rounded px-3 py-2 text-sm disabled:opacity-50"
						value={eventCode}
						onChange={e => setEventCode(e.target.value)}
						disabled={submitting}
					/>
				</div>
				<div className="mb-4">
					<label className="block text-sm font-medium mb-1">Description</label>
					<textarea
						className="w-full border rounded px-3 py-2 text-sm disabled:opacity-50"
						value={description}
						onChange={e => setDescription(e.target.value)}
						disabled={submitting}
						rows={3}
					/>
				</div>
				<div className="flex justify-end gap-2">
					<button
						className="px-4 py-2 rounded bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
						onClick={onCancel}
						disabled={submitting}
					>
						Cancel
					</button>
					<button
						className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 inline-flex items-center gap-2 font-medium text-sm"
						onClick={handleCopy}
						disabled={!eventName.trim() || !eventCode.trim() || submitting}
					>
						{submitting ? (
							<>
								<svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
									<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
									<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								<span>Copying...</span>
							</>
						) : (
							<span>Copy</span>
						)}
					</button>
				</div>
			</div>
		</div>
	);
}

