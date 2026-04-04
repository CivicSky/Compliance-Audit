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

	if (!open) return null;

	return (
		<div className="fixed inset-y-0 right-0 left-0 lg:left-[var(--sidebar-width)] lg:transition-[left] lg:duration-200 lg:ease-in-out z-[120] flex items-center justify-center bg-black bg-opacity-40">
			<div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
				<h2 className="text-xl font-bold mb-4">Copy Event</h2>
				<div className="mb-3">
					<label className="block text-sm font-medium mb-1">Event Name</label>
					<input
						className="w-full border rounded px-3 py-2 text-sm"
						value={eventName}
						onChange={e => setEventName(e.target.value)}
						autoFocus
					/>
				</div>
				<div className="mb-3">
					<label className="block text-sm font-medium mb-1">Event Code</label>
					<input
						className="w-full border rounded px-3 py-2 text-sm"
						value={eventCode}
						onChange={e => setEventCode(e.target.value)}
					/>
				</div>
				<div className="mb-4">
					<label className="block text-sm font-medium mb-1">Description</label>
					<textarea
						className="w-full border rounded px-3 py-2 text-sm"
						value={description}
						onChange={e => setDescription(e.target.value)}
						rows={3}
					/>
				</div>
				<div className="flex justify-end gap-2">
					<button
						className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
						onClick={onCancel}
					>
						Cancel
					</button>
					<button
						className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
						onClick={() => onConfirm({ eventName, eventCode, description })}
						disabled={!eventName.trim() || !eventCode.trim()}
					>
						Copy
					</button>
				</div>
			</div>
		</div>
	);
}

