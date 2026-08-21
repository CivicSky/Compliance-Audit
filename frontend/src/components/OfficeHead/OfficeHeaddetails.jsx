import React, { useEffect, useMemo, useState } from "react";
import user from "../../assets/images/user.svg";
import { eventsAPI } from "../../utils/api";
import { API_BASE_URL } from '../../utils/apiBase';

export default function OfficeHeaddetails({ visible, onClose, head, offices = [] }) {
	const [eventStatusById, setEventStatusById] = useState({});
	const [eventNameById, setEventNameById] = useState({});
	const safeHead = head || {};

	const getEventId = (office = {}) => {
		const rawId = office.EventID ?? office.event_id ?? office.eventId;
		const parsedId = Number(rawId);
		return Number.isInteger(parsedId) ? parsedId : null;
	};

	const allEventIds = useMemo(() => {
		const ids = new Set();
		offices.forEach((office) => {
			const eventId = getEventId(office);
			if (eventId) ids.add(eventId);
		});
		return Array.from(ids);
	}, [offices]);

	const missingEventIds = useMemo(() => {
		return allEventIds.filter((id) => !eventNameById[id]);
	}, [allEventIds, eventNameById]);

	useEffect(() => {
		if (!visible || missingEventIds.length === 0) return;

		let cancelled = false;

		const fetchEvents = async () => {
			try {
				const response = await eventsAPI.getAllEvents();
				const events = Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : [];

				const fetchedNames = {};
				const fetchedStatuses = {};

				events.forEach((event) => {
					const eventId = Number(event.EventID ?? event.event_id ?? event.id);
					const eventCode = event.EventCode || event.event_code || event.code || null;
					const eventName = event.EventName || event.event_name || event.eventName || null;
					const label = eventCode || eventName;
					const status = event.status || event.Status || 'active';

					if (Number.isInteger(eventId)) {
						if (label) fetchedNames[eventId] = label;
						fetchedStatuses[eventId] = String(status).toLowerCase();
					}
				});

				if (!cancelled) {
					setEventNameById((prev) => ({ ...prev, ...fetchedNames }));
					setEventStatusById((prev) => ({ ...prev, ...fetchedStatuses }));
				}
			} catch (error) {
				console.error('Failed to fetch events for office head details:', error);
			}
		};

		fetchEvents();

		return () => {
			cancelled = true;
		};
	}, [visible, missingEventIds]);

	// Only show offices whose event is 'active' (filters out 'inactive' events)
	const activeOffices = useMemo(() => {
		return offices.filter((office) => {
			const eventId = getEventId(office);
			if (!eventId) return true;
			if (!(eventId in eventStatusById)) return true;
			return eventStatusById[eventId] === 'active';
		});
	}, [offices, eventStatusById]);

	const getEventLabel = (office = {}) => {
		const eventCode = office.EventCode || office.event_code || office.code || null;
		if (eventCode) return eventCode;

		const eventId = getEventId(office);
		if (eventId && eventNameById[eventId]) {
			return eventNameById[eventId];
		}

		const eventName = office.EventName || office.event_name || office.eventName;
		if (eventName) return eventName;

		return 'General / Unassigned Event';
	};

	const getOfficeLabel = (office = {}) => office.OfficeName || office.office_name || office.officeName || 'Unknown office';

	const isAcademicProgram = (office = {}) => {
		const typeId = Number(office.entity_type_id || office.OfficeTypeID || office.type_id || office.EntityTypeID);
		if (typeId === 1) return true;
		if (typeId === 2) return false;

		const typeName = String(
			office.category_name || office.TypeName || office.office_type_name || office.office_type || office.CategoryName || office.OfficeTypeName || ''
		).toLowerCase();

		if (typeName.includes('non academic') || typeName.includes('non-academic') || typeName.includes('office') || typeName.includes('administrative')) {
			return false;
		}
		return typeName.includes('academic') || typeName.includes('program');
	};

	const groupedOffices = useMemo(() => {
		const groups = new Map();

		activeOffices.forEach((office) => {
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
				if (a.eventLabel === 'General / Unassigned Event') return 1;
				if (b.eventLabel === 'General / Unassigned Event') return -1;
				return a.eventLabel.localeCompare(b.eventLabel);
			});
	}, [activeOffices, eventNameById]);

	if (!visible || !head) return null;

	const fullName = `${safeHead.FirstName || ''}${safeHead.MiddleInitial ? ` ${safeHead.MiddleInitial}.` : ''} ${safeHead.LastName || ''}`.trim() || 'Office Personnel';
	const initialLetter = (safeHead.FirstName || safeHead.Email || 'P').charAt(0).toUpperCase();

	const profilePicUrl = safeHead.TempPreview
		? safeHead.TempPreview
		: safeHead.ProfilePic
			? `${API_BASE_URL}/uploads/profile-pics/${safeHead.ProfilePic}`
			: null;

	return (
		<div
			className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
			onClick={onClose}
		>
			<div 
				className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]" 
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header - 100% System Standard Blueprint */}
				<div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 text-white flex items-center justify-between shrink-0">
					<div className="flex items-center gap-3 min-w-0">
						{profilePicUrl ? (
							<img
								src={profilePicUrl}
								alt={fullName}
								onError={(e) => { e.target.style.display = 'none'; }}
								className="h-11 w-11 rounded-full object-cover border border-white/40 shrink-0 shadow-sm"
							/>
						) : (
							<div className="h-11 w-11 rounded-full bg-white/20 border border-white/30 text-white font-bold flex items-center justify-center text-lg shrink-0 shadow-inner">
								{initialLetter}
							</div>
						)}
						<div className="min-w-0">
							<h3 className="font-bold text-base text-white leading-tight truncate">
								{fullName}
							</h3>
							<p className="text-xs text-blue-100 mt-0.5 truncate">
								{safeHead.Position || safeHead.RoleName || 'Office Personnel'} {safeHead.Email ? `(${safeHead.Email})` : ''}
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition shrink-0 ml-3"
						aria-label="Close"
					>
						<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				{/* Main Content Body */}
				<div className="p-5 bg-slate-50/50 overflow-y-auto">
					<div className="mb-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
						<div className="flex items-center gap-2.5">
							<div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
								<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
									<path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
								</svg>
							</div>
							<div>
								<h4 className="text-sm font-bold text-slate-900">Programs & Offices Managed</h4>
								<p className="text-[11px] font-medium text-slate-500">Entities assigned to this personnel grouped by accreditation</p>
							</div>
						</div>

						<span className="inline-flex items-center rounded-full bg-slate-200/80 px-3 py-1 text-[11px] font-extrabold tracking-wider uppercase text-slate-700 shrink-0">
							{activeOffices.length} {activeOffices.length === 1 ? 'OFFICE / PROGRAM' : 'OFFICES / PROGRAMS'}
						</span>
					</div>

					{groupedOffices.length > 0 ? (
						<div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
							{groupedOffices.map((group) => {
								const codeMatch = group.eventLabel.match(/\(([^)]+)\)/);
								const displayTitle = codeMatch ? `${codeMatch[1]} — ${group.eventLabel.replace(/\([^)]+\)/, '').trim()}` : group.eventLabel;

								return (
									<div key={group.eventLabel} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition hover:shadow-xs">
										{/* Event Header */}
										<div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
											<div className="flex items-center gap-2 min-w-0">
												<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-bold shrink-0 border border-blue-100">
													<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
														<path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
													</svg>
												</div>
												<h4 className="text-xs font-bold text-slate-900 truncate">
													{displayTitle}
												</h4>
											</div>
											<span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-100">
												{group.officeItems.length} {group.officeItems.length === 1 ? 'Entity' : 'Entities'}
											</span>
										</div>

										{/* Programs & Offices Grid */}
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
											{group.officeItems.map((office, index) => {
												const isProg = isAcademicProgram(office);
												const label = getOfficeLabel(office);

												return (
													<div 
														key={`${office.id || office.OfficeID || label}-${index}`} 
														className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs transition hover:bg-blue-50/40 hover:border-blue-200"
													>
														<div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border shadow-2xs ${
															isProg 
																? 'bg-cyan-50 border-cyan-200 text-cyan-600' 
																: 'bg-emerald-50 border-emerald-200 text-emerald-600'
														}`}>
															{isProg ? (
																/* Masterlist Mortarboard Icon for Academic Program */
																<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
																	<path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A57.778 57.778 0 0012 13.5" />
																</svg>
															) : (
																/* Building Icon for Office */
																<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
																	<path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 16.5h1.5m3 0H15M9 21v-3a1 1 0 011-1h4a1 1 0 011 1v3" />
																</svg>
															)}
														</div>
														<div className="min-w-0">
															<span className="font-extrabold text-slate-900 block truncate">
																{label}
															</span>
															<span className="text-[10px] font-semibold text-slate-500 block truncate uppercase tracking-wider">
																{isProg ? 'Academic Program' : 'Administrative Office'}
															</span>
														</div>
													</div>
												);
											})}
										</div>
									</div>
								);
							})}
						</div>
					) : (
						<div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-2xs">
							<div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-2xs">
								<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
									<path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
							<h4 className="text-sm font-bold text-slate-800">No Assigned Programs or Offices</h4>
							<p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
								This personnel currently has no assigned academic programs or administrative offices.
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}