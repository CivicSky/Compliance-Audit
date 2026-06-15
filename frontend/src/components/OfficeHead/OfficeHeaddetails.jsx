import React, { useEffect, useMemo, useState } from "react";
import user from "../../assets/images/user.svg";
import { eventsAPI } from "../../utils/api";
import { API_BASE_URL } from '../../utils/apiBase';

export default function OfficeHeaddetails({ visible, onClose, head, offices = [] }) {
	const [eventNameById, setEventNameById] = useState({});
	const safeHead = head || {};

	const getEventId = (office = {}) => {
		const rawId = office.EventID ?? office.event_id ?? office.eventId;
		const parsedId = Number(rawId);
		return Number.isInteger(parsedId) ? parsedId : null;
	};

	const missingEventIds = useMemo(() => {
		const ids = new Set();
		offices.forEach((office) => {
			const eventId = getEventId(office);
			// Always attempt to fetch event metadata (codes) when we have an EventID
			if (eventId && !eventNameById[eventId]) {
				ids.add(eventId);
			}
		});
		return Array.from(ids);
	}, [offices, eventNameById]);

	useEffect(() => {
		if (!visible || missingEventIds.length === 0) return;

		let cancelled = false;

		const fetchEventNames = async () => {
			try {
				const response = await eventsAPI.getAllEvents();
				const events = Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : [];

				const fetchedMap = {};
				events.forEach((event) => {
					const eventId = Number(event.EventID ?? event.event_id ?? event.id);
					// Prefer EventCode to keep labels short; fallback to EventName
					const eventCode = event.EventCode || event.event_code || event.code || null;
					const eventName = event.EventName || event.event_name || event.eventName || null;
					const label = eventCode || eventName;
					if (Number.isInteger(eventId) && label) {
						fetchedMap[eventId] = label;
					}
				});

				if (!cancelled) {
					setEventNameById((prev) => ({ ...prev, ...fetchedMap }));
				}
			} catch (error) {
				console.error('Failed to fetch event names for office head details:', error);
			}
		};

		fetchEventNames();

		return () => {
			cancelled = true;
		};
	}, [visible, missingEventIds]);

	const getEventLabel = (office = {}) => {
		// Prefer explicit EventCode if present on the office record
		const eventCode = office.EventCode || office.event_code || office.code || null;
		if (eventCode) return eventCode;

		// If we have an EventID and fetched mapping (which stores code when available), prefer that next
		const eventId = getEventId(office);
		if (eventId && eventNameById[eventId]) {
			return eventNameById[eventId];
		}

		// Otherwise use EventName if present on the office record
		const eventName = office.EventName || office.event_name || office.eventName;
		if (eventName) return eventName;

		return 'Unknown event';
	};

	const getOfficeLabel = (office = {}) => office.OfficeName || office.office_name || office.officeName || 'Unknown office';

	const groupedOffices = useMemo(() => {
		const groups = new Map();

		offices.forEach((office) => {
			const eventLabel = getEventLabel(office);
			if (!groups.has(eventLabel)) {
				groups.set(eventLabel, []);
			}
			groups.get(eventLabel).push(office);
		});

		return Array.from(groups.entries())
			.map(([eventLabel, officeItems]) => ({
				eventLabel,
				officeItems: [...officeItems].sort((a, b) => getOfficeLabel(a).localeCompare(getOfficeLabel(b)))
			}))
			.sort((a, b) => {
				if (a.eventLabel === 'Unknown event') return 1;
				if (b.eventLabel === 'Unknown event') return -1;
				return a.eventLabel.localeCompare(b.eventLabel);
			});
	}, [offices, eventNameById]);

	if (!visible || !head) return null;

	const fullName = `${safeHead.FirstName || ''}${safeHead.MiddleInitial ? ` ${safeHead.MiddleInitial}.` : ''} ${safeHead.LastName || ''}`.trim();
	const profilePicUrl = safeHead.TempPreview
		? safeHead.TempPreview
		: safeHead.ProfilePic
			? `${API_BASE_URL}/uploads/profile-pics/${safeHead.ProfilePic}`
			: user;


	return (
		<div
			className="fixed inset-y-0 right-0 z-[120] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
			style={{ left: 'var(--sidebar-width, 0px)', transition: 'left 200ms ease-in-out' }}
			onClick={onClose}
		>
			<div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.28)]" onClick={(e) => e.stopPropagation()}>
				<div className="flex items-start justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-cyan-50 px-6 py-5">
					<div className="flex min-w-0 items-center gap-4">
							<div className="h-24 w-24 rounded-full bg-[#d6f0ec] p-0.5 ring-2 ring-white shadow-sm flex-shrink-0">
								<img
									src={profilePicUrl}
									alt={fullName}
									className="h-full w-full rounded-full border border-white object-cover"
									onError={(e) => {
										e.target.src = user;
									}}
								/>
							</div>
							<div className="min-w-0">
								<h3 className="truncate text-3xl font-semibold tracking-tight text-slate-900">{fullName}</h3>
								<div className="mt-1 flex flex-wrap items-center gap-2">
									<span className="rounded-full bg-slate-100 px-4 py-1 text-base font-medium text-slate-700">{safeHead.Position || 'Office Personnel'}</span>
								</div>
							</div>
						</div>
					<button
						onClick={onClose}
						className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
					>
						Close
					</button>
				</div>

				<div className="px-6 py-5">
					<div className="mb-3 flex items-center justify-between">
						<p className="text-base font-semibold text-slate-800">Offices Managed</p>
						<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
							{offices.length} office{offices.length === 1 ? '' : 's'}
						</span>
					</div>
					{groupedOffices.length > 0 ? (
						<ul className="grid max-h-[56vh] grid-cols-1 gap-3 overflow-y-auto pr-1 md:grid-cols-2">
							{groupedOffices.map((group) => (
								<li
									key={group.eventLabel}
									className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 px-4 py-3 shadow-sm"
								>
									<div className="mb-2 flex items-center justify-between gap-2">
										<p className="truncate text-sm font-semibold uppercase tracking-wide text-cyan-700">{group.eventLabel}</p>
										<span className="rounded-full bg-cyan-100 px-2.5 py-0.5 text-xs font-semibold text-cyan-800">
											{group.officeItems.length}
										</span>
									</div>
									<ul className="space-y-1.5">
										{group.officeItems.map((office, index) => (
											<li
												key={`${office.id || office.OfficeID || getOfficeLabel(office)}-${index}`}
												className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800"
											>
												{getOfficeLabel(office)}
											</li>
										))}
									</ul>
								</li>
							))}
						</ul>
					) : (
						<p className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">No assigned offices.</p>
					)}
				</div>
			</div>
		</div>
	);
}

