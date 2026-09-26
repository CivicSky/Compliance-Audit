const META_TAG = '[[meta:';
const META_END = ']]';

export function parseMetaFromMessage(message) {
	const raw = String(message || '');
	const start = raw.lastIndexOf(META_TAG);
	if (start === -1) return { text: raw.trim(), meta: null };

	const end = raw.indexOf(META_END, start);
	if (end === -1) return { text: raw.trim(), meta: null };

	try {
		const meta = JSON.parse(raw.slice(start + META_TAG.length, end));
		return { text: raw.slice(0, start).trim(), meta };
	} catch {
		return { text: raw.trim(), meta: null };
	}
}

export function getDisplayMessage(notification) {
	return parseMetaFromMessage(notification?.Message).text;
}

export function getNotificationMeta(notification) {
	const { meta } = parseMetaFromMessage(notification?.Message);
	const table = String(notification?.RelatedTable || '').toLowerCase();
	const relatedId = notification?.RelatedID != null ? Number(notification.RelatedID) : null;

	const officeId =
		meta?.officeId ??
		(['office_personnel', 'requirements_assignment', 'requirement_file_upload', 'offices'].includes(table)
			? relatedId
			: null);

	return {
		...meta,
		officeId: officeId != null && !Number.isNaN(officeId) ? Number(officeId) : null,
		requirementId: meta?.requirementId != null ? Number(meta.requirementId) : null,
		viewUserId: meta?.viewUserId != null ? Number(meta.viewUserId) : null,
		openSubmission: Boolean(meta?.openSubmission) || table === 'requirement_file_upload',
	};
}

export function buildNotificationRedirect(notification) {
	const table = String(notification?.RelatedTable || '').toLowerCase();
	const meta = getNotificationMeta(notification);

	if (table === 'users_role') return { path: '/home/profile' };

	const params = new URLSearchParams({
		fromNotif: '1',
		tab: 'categories',
	});

	if (meta.officeId) {
		params.set('officeId', String(meta.officeId));
	} else if (table === 'office_head' || table === 'office_personnel' || table === 'offices') {
		if (notification?.RelatedID) params.set('officeId', String(notification.RelatedID));
	}

	if (meta.requirementId) params.set('requirementId', String(meta.requirementId));
	if (meta.openSubmission) params.set('openSubmission', '1');
	if (meta.viewUserId) params.set('viewUserId', String(meta.viewUserId));

	// Auditor area assignment notifications
	if (table === 'auditor_assignments' || table === 'auditor_area_assignments') {
		const areaId = meta.areaIds?.[0] || meta.areaId;
		if (areaId) params.set('areaId', String(areaId));
		if (meta.officeId) params.set('officeId', String(meta.officeId));
		if (meta.eventId) params.set('eventId', String(meta.eventId));
	}

	return { path: `/home/acc-management?${params.toString()}` };
}
