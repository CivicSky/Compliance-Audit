import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth/mammoth.browser';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorkerSrc from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';
import YourWorkFileUpload from './YourWorkFileUpload';
import { useToast } from '../UI/Toast';
import { useModal } from '../UI/ModalProvider';
import { API_BASE_URL } from '../../utils/apiBase';
import { dataCache, CacheKeys } from '../../utils/dataCache';
import { useLiveRefresh } from '../../utils/liveSync';

GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

const THUMB_W = 220;
const THUMB_H = 120;

const svgDataUrl = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const wrapLines = (text, maxLen, maxLines) => {
	const raw = String(text || '').replace(/\s+/g, ' ').trim();
	if (!raw) return [];
	const lines = [];
	let i = 0;
	while (i < raw.length && lines.length < maxLines) {
		lines.push(raw.slice(i, i + maxLen));
		i += maxLen;
	}
	return lines;
};

const renderDocxThumbSvg = (fileName, rawText) => {
	const title = String(fileName || 'Document').slice(0, 28);
	const lines = wrapLines(rawText, 34, 6);
	const textEls = lines
		.map((l, idx) => {
			const y = 44 + idx * 12;
			return `<text x="12" y="${y}" font-size="10" fill="#374151" font-family="Poppins, Inter, sans-serif">${
				l.replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]))
			}</text>`;
		})
		.join('');

	return svgDataUrl(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${THUMB_W}" height="${THUMB_H}" viewBox="0 0 ${THUMB_W} ${THUMB_H}">
  <rect x="0" y="0" width="${THUMB_W}" height="${THUMB_H}" fill="#ffffff"/>
  <rect x="0.5" y="0.5" width="${THUMB_W - 1}" height="${THUMB_H - 1}" rx="8" fill="#ffffff" stroke="#e5e7eb"/>
  <text x="12" y="22" font-size="11" font-weight="600" fill="#111827" font-family="Poppins, Inter, sans-serif">${
		title.replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]))
	}</text>
  <line x1="12" y1="30" x2="${THUMB_W - 12}" y2="30" stroke="#e5e7eb"/>
  ${textEls}
</svg>`);
};

const renderXlsxThumbSvg = (fileName, workbook) => {
	const sheetName = workbook?.SheetNames?.[0];
	const sheet = sheetName ? workbook.Sheets[sheetName] : null;
	const title = String(fileName || sheetName || 'Spreadsheet').slice(0, 26);

	const maxRows = 6;
	const maxCols = 4;
	let grid = Array.from({ length: maxRows }, () => Array.from({ length: maxCols }, () => ''));

	if (sheet) {
		const ref = sheet['!ref'] || 'A1';
		const range = XLSX.utils.decode_range(ref);
		for (let r = 0; r < Math.min(maxRows, range.e.r - range.s.r + 1); r++) {
			for (let c = 0; c < Math.min(maxCols, range.e.c - range.s.c + 1); c++) {
				const cellAddr = XLSX.utils.encode_cell({ r: range.s.r + r, c: range.s.c + c });
				const cell = sheet[cellAddr];
				const val = cell?.w ?? cell?.v;
				grid[r][c] = val == null ? '' : String(val).slice(0, 10);
			}
		}
	}

	const esc = (s) => String(s).replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
	const x0 = 12;
	const y0 = 34;
	const w = THUMB_W - 24;
	const h = THUMB_H - 46;
	const cellW = w / maxCols;
	const cellH = h / maxRows;
	let cells = '';
	for (let r = 0; r < maxRows; r++) {
		for (let c = 0; c < maxCols; c++) {
			const x = x0 + c * cellW;
			const y = y0 + r * cellH;
			cells += `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" fill="#ffffff" stroke="#e5e7eb"/>`;
			const v = grid[r][c];
			if (v) {
				cells += `<text x="${x + 4}" y="${y + 12}" font-size="9" fill="#374151" font-family="Poppins, Inter, sans-serif">${esc(
					v
				)}</text>`;
			}
		}
	}

	return svgDataUrl(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${THUMB_W}" height="${THUMB_H}" viewBox="0 0 ${THUMB_W} ${THUMB_H}">
  <rect x="0" y="0" width="${THUMB_W}" height="${THUMB_H}" fill="#ffffff"/>
  <rect x="0.5" y="0.5" width="${THUMB_W - 1}" height="${THUMB_H - 1}" rx="8" fill="#ffffff" stroke="#e5e7eb"/>
  <text x="12" y="22" font-size="11" font-weight="600" fill="#111827" font-family="Poppins, Inter, sans-serif">${esc(
		title
	)}</text>
  <line x1="12" y1="30" x2="${THUMB_W - 12}" y2="30" stroke="#e5e7eb"/>
  ${cells}
</svg>`);
};

const getExtension = (fileNameOrUrl) => {
    const s = String(fileNameOrUrl || '');
    const clean = s.split('?')[0].split('#')[0];
    const dot = clean.lastIndexOf('.');
    return dot >= 0 ? clean.slice(dot + 1).toLowerCase() : '';
};

const getFileTypeLabel = (ext) => {
    if (['doc', 'docx'].includes(ext)) return 'Microsoft Word';
    if (['xls', 'xlsx'].includes(ext)) return 'Microsoft Excel';
    if (ext === 'pdf') return 'PDF Document';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'Image File';
    if (['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(ext)) return 'Video File';
    return ext ? ext.toUpperCase() : 'File';
};

const isImageExt = (ext) => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'].includes(ext);
const isVideoExt = (ext) => ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(ext);

export default function SubmissionViewer({
	show,
	leftStyle,
	onClose,
	requirement,
	users = [],
	officeId,
	onCommentSaved,
	currentUser,
	onViewUserFile,
	onViewUserFilesModal,
	showPrivateComments = true,
	canEditPrivateComments = true,
	allowWorkActions = false,
	viewerRoleId = 0,
	onFileUpload,
	onFileUnsubmit,
	onFileRename,
	onFileUpdateComment,
	uploadingFile = false,
	uploadProgressMap = {},
	unsubmittingFile = false,
}) {
	const { showConfirm } = useModal();
	const isViewerAuditor = Number(viewerRoleId || currentUser?.RoleID || 0) === 4 ||
		String(currentUser?.RoleName || '').toLowerCase().includes('auditor') ||
		String(currentUser?.Position || '').toLowerCase().includes('auditor') ||
		Boolean(currentUser?.isExternalAuditor);

	const [active, setActive] = useState(false);
	const [shouldRender, setShouldRender] = useState(false);
	const [cachedRequirement, setCachedRequirement] = useState(null);
	const [cachedUsers, setCachedUsers] = useState([]);

	useEffect(() => {
		if (show) {
			setShouldRender(true);
			const timer = setTimeout(() => setActive(true), 20);
			return () => clearTimeout(timer);
		} else {
			setActive(false);
			const timer = setTimeout(() => setShouldRender(false), 300);
			return () => clearTimeout(timer);
		}
	}, [show]);

	useEffect(() => {
		if (show && requirement) {
			setCachedRequirement(requirement);
			setCachedUsers(users);
		}
	}, [show, requirement, users]);

	const activeRequirement = show ? requirement : cachedRequirement;
	const activeUsers = show ? users : cachedUsers;

	const requirementId = activeRequirement?.RequirementID;
	const title = activeRequirement?.RequirementTitle || activeRequirement?.Title || activeRequirement?.RequirementCode || 'Submission';

	const assignedCount = activeUsers.length;
	const turnedInCount = activeUsers.reduce(
		(acc, u) => acc + ((u?.HasUploaded === 1 || u?.HasUploaded === true) ? 1 : 0),
		0
	);

	const uploadedUserIds = useMemo(() => {
		return (activeUsers || [])
			.filter((u) => (u?.HasUploaded === 1 || u?.HasUploaded === true) && u?.UserID)
			.map((u) => Number(u.UserID))
			.filter((id) => Number.isFinite(id) && id > 0);
	}, [activeUsers]);
	const uploadedUserIdsKey = uploadedUserIds.join(',');

	const [fileByUserId, setFileByUserId] = useState({});
	const [filesByUserId, setFilesByUserId] = useState({});
	const [loadingByUserId, setLoadingByUserId] = useState({});
	const [thumbByUserId, setThumbByUserId] = useState({});
	const [thumbLoadingByUserId, setThumbLoadingByUserId] = useState({});
	const [savedComment, setSavedComment] = useState('');
	const [savedCommentAt, setSavedCommentAt] = useState(null);
	const [commentInput, setCommentInput] = useState('');
	const [savingComment, setSavingComment] = useState(false);
	const [commentStatus, setCommentStatus] = useState('');
	const lastThumbKeyRef = useRef('');
	const thumbByUserIdRef = useRef({});
	const thumbLoadingByUserIdRef = useRef({});
	const shouldRenderPrivateCommentSection = !!(showPrivateComments && (canEditPrivateComments || String(savedComment || '').trim()));

	const { toast } = useToast();

	useEffect(() => {
		if (!show) return;
		setSavedComment(requirement?.comments || '');
		setSavedCommentAt(null);
		setCommentInput('');
		setCommentStatus('');
	}, [show, requirementId]);

	useEffect(() => {
		thumbByUserIdRef.current = thumbByUserId;
	}, [thumbByUserId]);
	useEffect(() => {
		thumbLoadingByUserIdRef.current = thumbLoadingByUserId;
	}, [thumbLoadingByUserId]);

	useEffect(() => {
		if (!show || !requirementId || uploadedUserIds.length === 0) {
			setFileByUserId({});
			setFilesByUserId({});
			setLoadingByUserId({});
			setThumbByUserId({});
			setThumbLoadingByUserId({});
			return;
		}

		let cancelled = false;
		const controller = new AbortController();

		// Immediately check and populate from cache for instant 0ms rendering
		const initialFilesMap = {};
		const initialFileMap = {};
		const initialLoadingMap = {};

		uploadedUserIds.forEach((id) => {
			const cacheKey = CacheKeys.userFiles(requirementId, id, officeId);
			const cached = dataCache.get(cacheKey);
			if (cached && Array.isArray(cached) && cached.length > 0) {
				initialFilesMap[id] = cached;
				initialFileMap[id] = cached[cached.length - 1];
				initialLoadingMap[id] = false;
			} else {
				initialLoadingMap[id] = true;
			}
		});

		setFileByUserId((prev) => ({ ...prev, ...initialFileMap }));
		setFilesByUserId((prev) => ({ ...prev, ...initialFilesMap }));
		setLoadingByUserId((prev) => ({ ...prev, ...initialLoadingMap }));
		setThumbByUserId({});
		setThumbLoadingByUserId({});
		lastThumbKeyRef.current = '';

		const fetchUserFile = async (userId) => {
			try {
				const token = localStorage.getItem('token');
				const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
				const res = await fetch(
					`${API_BASE_URL}/api/requirements/${requirementId}/user-file/${userId}${officeId ? `?officeId=${officeId}` : ''}`,
					{ headers, signal: controller.signal }
				);
				if (!res.ok) {
					// 404 means no file exists; silently ignore
					return;
				}
				const data = await res.json();
				if (cancelled) return;
				if (data?.success) {
					const list = Array.isArray(data.files) && data.files.length > 0 
						? data.files 
						: (data.file ? [data.file] : []);
					
					// Save in dataCache
					dataCache.set(CacheKeys.userFiles(requirementId, userId, officeId), list);

					setFilesByUserId((prev) => ({ ...prev, [userId]: list }));
					if (data.file || list.length > 0) {
						setFileByUserId((prev) => ({ ...prev, [userId]: data.file || list[list.length - 1] }));
					}
				}
			} catch (e) {
				// ignore
			} finally {
				if (!cancelled) {
					setLoadingByUserId((prev) => ({ ...prev, [userId]: false }));
				}
			}
		};

		const run = async () => {
			const concurrency = 4;
			let index = 0;
			const workers = Array.from({ length: Math.min(concurrency, uploadedUserIds.length) }).map(async () => {
				while (!cancelled) {
					const i = index++;
					if (i >= uploadedUserIds.length) break;
					await fetchUserFile(uploadedUserIds[i]);
				}
			});
			await Promise.all(workers);
		};

		run();
		return () => {
			cancelled = true;
			controller.abort();
		};
	}, [show, requirementId, officeId, uploadedUserIdsKey]);

	// Real-time live synchronization for evidence files while drawer is open
	useLiveRefresh(async () => {
		if (!show || !requirementId || uploadedUserIds.length === 0) return;
		for (const userId of uploadedUserIds) {
			try {
				const token = localStorage.getItem('token');
				const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
				const res = await fetch(
					`${API_BASE_URL}/api/requirements/${requirementId}/user-file/${userId}${officeId ? `?officeId=${officeId}` : ''}`,
					{ headers }
				);
				if (res.ok) {
					const data = await res.json();
					if (data?.success) {
						const list = Array.isArray(data.files) && data.files.length > 0 
							? data.files 
							: (data.file ? [data.file] : []);
						dataCache.set(CacheKeys.userFiles(requirementId, userId, officeId), list);
						setFilesByUserId((prev) => ({ ...prev, [userId]: list }));
						if (data.file || list.length > 0) {
							setFileByUserId((prev) => ({ ...prev, [userId]: data.file || list[list.length - 1] }));
						}
					}
				}
			} catch (e) {
				// ignore
			}
		}
	}, { entityTypes: ['requirements', 'compliance', 'documents', 'all'], deps: [show, requirementId, officeId, uploadedUserIdsKey] });

	// Listen for immediate local review and update events to update file review statuses with 0ms delay
	useEffect(() => {
		const handleReviewed = (e) => {
			const { reqId, fileId, status, userId, reason, resData } = e.detail || {};
			if (reqId && Number(reqId) !== Number(requirementId)) return;

			const targetUserId = userId ? Number(userId) : null;
			if (targetUserId) {
				setFilesByUserId((prev) => {
					const existing = prev[targetUserId] || [];
					const updated = existing.map((f) => {
						if (Number(f.id) === Number(fileId)) {
							return {
								...f,
								reviewStatus: status,
								rejectionReason: status === 'rejected' ? reason : (f.rejectionReason || ''),
								comment: reason || f.comment,
								...(resData || {})
							};
						}
						return f;
					});
					if (requirementId) {
						dataCache.set(CacheKeys.userFiles(requirementId, targetUserId), updated);
					}
					return { ...prev, [targetUserId]: updated };
				});

				setFileByUserId((prev) => {
					const f = prev[targetUserId];
					if (f && Number(f.id) === Number(fileId)) {
						const updated = {
							...f,
							reviewStatus: status,
							rejectionReason: status === 'rejected' ? reason : (f.rejectionReason || ''),
							comment: reason || f.comment,
							...(resData || {})
						};
						return { ...prev, [targetUserId]: updated };
					}
					return prev;
				});
			} else {
				// If userId wasn't specified, scan all users
				setFilesByUserId((prev) => {
					let changed = false;
					const next = { ...prev };
					Object.keys(next).forEach((uid) => {
						const list = next[uid] || [];
						const hasFile = list.some((f) => Number(f.id) === Number(fileId));
						if (hasFile) {
							changed = true;
							next[uid] = list.map((f) => Number(f.id) === Number(fileId) ? {
								...f,
								reviewStatus: status,
								rejectionReason: status === 'rejected' ? reason : (f.rejectionReason || ''),
								comment: reason || f.comment,
								...(resData || {})
							} : f);
							if (requirementId) {
								dataCache.set(CacheKeys.userFiles(requirementId, uid), next[uid]);
							}
						}
					});
					return changed ? next : prev;
				});
			}
		};

		const handleFileUpdated = (e) => {
			const { reqId, userId, files } = e.detail || {};
			if (reqId && Number(reqId) !== Number(requirementId)) return;
			if (userId && Array.isArray(files)) {
				const uid = Number(userId);
				setFilesByUserId((prev) => ({ ...prev, [uid]: files }));
				if (files.length > 0) {
					setFileByUserId((prev) => ({ ...prev, [uid]: files[files.length - 1] }));
				}
				if (requirementId) {
					dataCache.set(CacheKeys.userFiles(requirementId, uid), files);
				}
			}
		};

		window.addEventListener('evidence-file-reviewed', handleReviewed);
		window.addEventListener('evidence-file-updated', handleFileUpdated);
		return () => {
			window.removeEventListener('evidence-file-reviewed', handleReviewed);
			window.removeEventListener('evidence-file-updated', handleFileUpdated);
		};
	}, [requirementId]);

	const handleSaveComment = async () => {
		if (!show || !requirementId || !officeId) return;
		const next = String(commentInput || '').trim();
		if (!next) return;
		setSavingComment(true);
		setCommentStatus('');
		try {
			const token = localStorage.getItem('token');
			const headers = {
				'Content-Type': 'application/json',
				...(token ? { Authorization: `Bearer ${token}` } : {})
			};
			const res = await fetch(
				`${API_BASE_URL}/api/offices/${officeId}/requirements/${requirementId}/status`,
				{
					method: 'PUT',
					headers,
					body: JSON.stringify({
						statusId: requirement?.ComplianceStatusID || 3,
						comments: commentInput
					})
				}
			);
			if (!res.ok) throw new Error('Failed to save');
			setSavedComment(next);
			setSavedCommentAt(new Date());
			setCommentInput('');
			onCommentSaved?.(next);
			toast?.({
				title: 'Comment Saved',
				description: 'Your comment has been saved successfully.',
				variant: 'success',
				duration: 2500
			});
		} catch (e) {
			setCommentStatus('Failed to save');
		} finally {
			setSavingComment(false);
		}
	};

	const handleClearComment = async () => {
		if (!show || !requirementId || !officeId || !canEditPrivateComments || !savedComment) return;
		const ok = await showConfirm('Clear this comment? This cannot be undone.');
		if (!ok) return;

		setSavingComment(true);
		setCommentStatus('');
		try {
			const token = localStorage.getItem('token');
			const headers = {
				'Content-Type': 'application/json',
				...(token ? { Authorization: `Bearer ${token}` } : {})
			};
			const res = await fetch(
				`${API_BASE_URL}/api/offices/${officeId}/requirements/${requirementId}/status`,
				{
					method: 'PUT',
					headers,
					body: JSON.stringify({
						statusId: requirement?.ComplianceStatusID || 3,
						comments: ''
					})
				}
			);
			if (!res.ok) throw new Error('Failed to clear');
			setSavedComment('');
			setSavedCommentAt(null);
			setCommentInput('');
			onCommentSaved?.('');
			toast?.({
				title: 'Comment Cleared',
				description: 'The comment has been removed.',
				variant: 'info',
				duration: 2500
			});
		} catch (e) {
			setCommentStatus('Failed to clear');
		} finally {
			setSavingComment(false);
		}
	};

	// 'Your Work' view only when there's exactly one assigned user and viewer is not admin.
	const isYourWorkView = !canEditPrivateComments && users.length === 1;
	const isReadOnlyWorkView = false;
	const workUser = isYourWorkView
		? (users.length === 1 ? users[0] : users.find(u => Number(u?.UserID) === Number(currentUser?.UserID)))
		: null;
	const workUserId = workUser?.UserID ? Number(workUser.UserID) : null;
	const workHasUploaded = workUser?.HasUploaded === 1 || workUser?.HasUploaded === true;
	const workFile = workUserId ? fileByUserId[workUserId] : null;
	const workFiles = workUserId ? (filesByUserId[workUserId] || (workFile ? [workFile] : [])) : [];
	const workThumb = workUserId ? thumbByUserId[workUserId] : null;
	const workLoadingFile = workUserId ? loadingByUserId[workUserId] : false;
	const workLoadingThumb = workUserId ? thumbLoadingByUserId[workUserId] : false;

	const commentLabel = canEditPrivateComments ? 'Comment' : 'Private comment';
	const formatShortDate = (d) => {
		try {
			return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(d);
		} catch {
			return '';
		}
	};

	const fileByUserIdKey = useMemo(() => {
		return uploadedUserIds
			.map((id) => {
				const f = fileByUserId[id];
				return f ? `${id}:${f.url || ''}:${f.fileName || ''}` : `${id}:`;
			})
			.join('|');
	}, [uploadedUserIdsKey, fileByUserId]);

	const getExtension = (fileNameOrUrl) => {
		const s = String(fileNameOrUrl || '');
		const clean = s.split('?')[0].split('#')[0];
		const dot = clean.lastIndexOf('.');
		return dot >= 0 ? clean.slice(dot + 1).toLowerCase() : '';
	};
	const isImageExt = (ext) => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'].includes(ext);
	const isPdfExt = (ext) => ext === 'pdf';
	const isDocxExt = (ext) => ext === 'docx';
	const isXlsxExt = (ext) => ext === 'xlsx' || ext === 'xls';
	const getFileTypeLabel = (ext) => {
		if (isImageExt(ext)) return 'Image';
		if (isPdfExt(ext)) return 'PDF';
		if (isDocxExt(ext) || ext === 'doc') return 'Document';
		if (isXlsxExt(ext) || ext === 'csv') return 'Spreadsheet';
		return ext ? ext.toUpperCase() : 'File';
	};

	// Upload then refresh files for the current user so UI updates immediately
	const handleUploadAndRefresh = async (e) => {
		if (!onFileUpload || !currentUser) return;
		try {
			await onFileUpload(e, requirementId);
		} catch (err) {
			console.error('Upload handler error', err);
			toast?.({ title: 'Upload failed', description: err?.message || 'Failed to upload files', variant: 'error', duration: 2500 });
		}
		// After upload completes, fetch the user's files for this requirement
		try {
			const userId = Number(currentUser.UserID);
			if (!userId) return;
			const token = localStorage.getItem('token');
			const headers = token ? { Authorization: `Bearer ${token}` } : {};
			const res = await fetch(`${API_BASE_URL}/api/requirements/${requirementId}/user-file/${userId}${officeId ? `?officeId=${officeId}` : ''}`, { headers });
			if (!res.ok) return;
			const data = await res.json();
			if (data?.success) {
				const list = Array.isArray(data.files) && data.files.length > 0 ? data.files : (data.file ? [data.file] : []);
				dataCache.set(CacheKeys.userFiles(requirementId, userId, officeId), list);
				setFilesByUserId((prev) => ({ ...prev, [userId]: list }));
				if (list.length > 0) setFileByUserId((prev) => ({ ...prev, [userId]: list[list.length - 1] }));
				toast?.({ title: 'Upload complete', description: 'Your files are now available', variant: 'success', duration: 1800 });
			}
		} catch (err) {
			console.error('Failed to refresh files after upload', err);
		}
	};

	useEffect(() => {
		if (!show || !requirementId || uploadedUserIds.length === 0) return;
		if (!fileByUserIdKey) return;

		const thumbKey = `${requirementId}:${uploadedUserIdsKey}:${fileByUserIdKey}`;
		if (lastThumbKeyRef.current === thumbKey) return;
		lastThumbKeyRef.current = thumbKey;

		let cancelled = false;
		const controller = new AbortController();
		const inFlight = new Set();

		const fetchArrayBuffer = async (url) => {
			const token = localStorage.getItem('token');
			const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
			const res = await fetch(url, { headers, signal: controller.signal });
			if (!res.ok) throw new Error('Failed to fetch');
			return await res.arrayBuffer();
		};

		const makePdfThumb = async (file) => {
			const buf = await fetchArrayBuffer(file.url);
			const loadingTask = getDocument({ data: buf });
			const pdf = await loadingTask.promise;
			try {
				const page = await pdf.getPage(1);
				try {
					const baseViewport = page.getViewport({ scale: 1 });
					const scale = Math.min(2, THUMB_W / Math.max(1, baseViewport.width));
					const viewport = page.getViewport({ scale });
					const canvas = document.createElement('canvas');
					const ctx = canvas.getContext('2d', { alpha: false });
					canvas.width = Math.floor(viewport.width);
					canvas.height = Math.floor(viewport.height);
					if (!ctx) throw new Error('No canvas context');
					await page.render({ canvasContext: ctx, viewport }).promise;
					return canvas.toDataURL('image/png');
				} finally {
					page.cleanup?.();
				}
			} finally {
				pdf.cleanup?.();
				await pdf.destroy?.();
			}
		};

		const makeXlsxThumb = async (file) => {
			const buf = await fetchArrayBuffer(file.url);
			const wb = XLSX.read(buf, { type: 'array' });
			return renderXlsxThumbSvg(file.fileName, wb);
		};

		const makeDocxThumb = async (file) => {
			const buf = await fetchArrayBuffer(file.url);
			const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
			return renderDocxThumbSvg(file.fileName, value);
		};

		const generateForUser = async (userId) => {
			const file = fileByUserId[userId];
			if (!file?.url) return;
			const ext = getExtension(file.fileName || file.url);
			if (isImageExt(ext)) return;
			if (!isPdfExt(ext) && !isDocxExt(ext) && !isXlsxExt(ext)) return;
			if (thumbByUserIdRef.current[userId] || thumbLoadingByUserIdRef.current[userId]) return;
			if (inFlight.has(userId)) return;
			inFlight.add(userId);

			setThumbLoadingByUserId((prev) => ({ ...prev, [userId]: true }));
			try {
				let thumb;
				if (isPdfExt(ext)) thumb = await makePdfThumb(file);
				else if (isXlsxExt(ext)) thumb = await makeXlsxThumb(file);
				else if (isDocxExt(ext)) thumb = await makeDocxThumb(file);
				if (cancelled) return;
				if (thumb) setThumbByUserId((prev) => ({ ...prev, [userId]: thumb }));
			} catch (e) {
				// ignore; fallback UI remains
			} finally {
				inFlight.delete(userId);
				if (!cancelled) setThumbLoadingByUserId((prev) => ({ ...prev, [userId]: false }));
			}
		};

		const run = async () => {
			const targets = uploadedUserIds.filter((id) => fileByUserId[id]?.url);
			const concurrency = 2;
			let index = 0;
			const workers = Array.from({ length: Math.min(concurrency, targets.length) }).map(async () => {
				while (!cancelled) {
					const i = index++;
					if (i >= targets.length) break;
					await generateForUser(targets[i]);
				}
			});
			await Promise.all(workers);
		};

		run();
		return () => {
			cancelled = true;
			controller.abort();
		};
	}, [show, requirementId, uploadedUserIdsKey, fileByUserIdKey]);

	if (!shouldRender) return null;

	return (
		<div
			className={`fixed inset-0 z-[130] bg-transparent transition-opacity duration-300 ease-out ${
				active ? 'opacity-100' : 'opacity-0 pointer-events-none'
			}`}
			style={leftStyle}
			onClick={(e) => {
				e.stopPropagation();
				onClose?.();
			}}
			role="presentation"
		>
			<div
				className={`relative ml-auto flex h-full w-[34%] min-w-[420px] flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-out ${
					active ? 'translate-x-0' : 'translate-x-full'
				}`}
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-label="Submission"
			>
				<div className="relative flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
					<div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-indigo-500 to-violet-500" />
					<div className="min-w-0">
						<div className="truncate text-base font-semibold tracking-tight text-slate-900">{title}</div>
					</div>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onClose?.();
						}}
						className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
						aria-label="Close"
					>
						<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<div className="min-h-0 flex-1 overflow-y-auto bg-app">
					<div className="flex min-h-full flex-col p-4">


						{isYourWorkView && (
							<YourWorkFileUpload
								requirementId={requirementId}
								userId={workUserId}
								hasUploaded={workHasUploaded || workFiles.length > 0}
								file={workFile}
								files={workFiles}
								thumb={workThumb}
								isLoadingFile={workLoadingFile}
								isLoadingThumb={workLoadingThumb}
								uploading={uploadingFile}
								uploadProgressMap={uploadProgressMap}
								onReorder={(newFiles) => {
									if (workUserId) {
										setFilesByUserId((prev) => ({ ...prev, [workUserId]: newFiles }));
										if (newFiles && newFiles.length > 0) {
											setFileByUserId((prev) => ({ ...prev, [workUserId]: newFiles[newFiles.length - 1] }));
										}
										if (requirementId) {
											dataCache.set(CacheKeys.userFiles(requirementId, workUserId), newFiles);
										}
									}
								}}
								onUpload={(e, reqId) => {
									onFileUpload?.(e, reqId, (newFile) => {
										if (!newFile || !workUserId) return;
										setFilesByUserId((prev) => {
											const existing = prev[workUserId] || [];
											const exists = existing.some((f) => ((f.id && newFile.id && f.id === newFile.id) || (f.fileName && newFile.fileName && f.fileName === newFile.fileName)));
											const updated = exists ? existing : [...existing, newFile];
											if (requirementId) {
												dataCache.set(CacheKeys.userFiles(requirementId, workUserId), updated);
											}
											return {
												...prev,
												[workUserId]: updated,
											};
										});
										setFileByUserId((prev) => ({
											...prev,
											[workUserId]: newFile,
										}));
									});
								}}
								onUnsubmit={async (reqId, fileId) => {
									if (workUserId) {
										setFilesByUserId((prev) => ({
											...prev,
											[workUserId]: (prev[workUserId] || []).filter((f) => ((f.id && fileId) ? f.id !== fileId : f.fileName !== fileId))
										}));
										setFileByUserId((prev) => {
											const list = (filesByUserId[workUserId] || []).filter((f) => ((f.id && fileId) ? f.id !== fileId : f.fileName !== fileId));
											return { ...prev, [workUserId]: list[list.length - 1] || null };
										});
									}
									if (onFileUnsubmit) {
										await onFileUnsubmit(reqId, fileId);
									}
								}}
								onRename={(reqId, fileId, newDisplayName) => {
									if (workUserId) {
										setFilesByUserId((prev) => ({
											...prev,
											[workUserId]: (prev[workUserId] || []).map((f) =>
												((f.id && fileId && f.id === fileId) || f.fileName === fileId)
													? { ...f, displayName: newDisplayName }
													: f
											)
										}));
										setFileByUserId((prev) => {
											const curr = prev[workUserId];
											if (curr && ((curr.id && fileId && curr.id === fileId) || curr.fileName === fileId)) {
												return { ...prev, [workUserId]: { ...curr, displayName: newDisplayName } };
											}
											return prev;
										});
									}
									onFileRename?.(reqId, fileId, newDisplayName);
								}}
								onUpdateComment={(reqId, fileId, newComment) => {
									if (workUserId) {
										setFilesByUserId((prev) => ({
											...prev,
											[workUserId]: (prev[workUserId] || []).map((f) =>
												((f.id && fileId && f.id === fileId) || f.fileName === fileId)
													? { ...f, comment: newComment }
													: f
											)
										}));
									}
									onFileUpdateComment?.(reqId, fileId, newComment);
								}}
								onViewFile={
									workHasUploaded && onViewUserFile && workUser
										? (item) => onViewUserFile(workUser, requirementId, item)
										: undefined
								}
								readOnly={isReadOnlyWorkView}
								isAdmin={canEditPrivateComments}
								viewerRoleId={viewerRoleId}
							/>
						)}

						{!isYourWorkView && (
							<div className="mt-3 pr-1">
								<div className="flex flex-col gap-3">
									{users.map((u) => {
										const displayName = `${u?.FirstName || ''}${u?.LastName ? ' ' + u.LastName : ''}`.trim() || u?.Username || 'User';
										const userId = u?.UserID ? Number(u.UserID) : null;
										const cachedFiles = (userId && requirementId) ? dataCache.get(CacheKeys.userFiles(requirementId, userId)) : null;
										const userFiles = (userId && filesByUserId[userId] && filesByUserId[userId].length > 0)
											? filesByUserId[userId]
											: (cachedFiles && Array.isArray(cachedFiles) && cachedFiles.length > 0)
											? cachedFiles
											: (u?.userFiles && Array.isArray(u.userFiles) && u.userFiles.length > 0)
											? u.userFiles
											: (userId && fileByUserId[userId] ? [fileByUserId[userId]] : []);
										const hasUploaded = u?.HasUploaded === 1 || u?.HasUploaded === true || userFiles.length > 0;
										const avatarSrc = u?.ProfilePic
											? `${API_BASE_URL}/uploads/profile-pics/${u.ProfilePic}`
											: '/src/assets/images/user.svg';

										return (
											<div
												key={u?.UserID || displayName}
												className="w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs cursor-pointer transition hover:border-blue-400 hover:shadow-md hover:bg-blue-50/20"
												onClick={() => {
													if (onViewUserFilesModal) {
														onViewUserFilesModal(u, requirementId, userFiles);
													} else {
														onViewUserFile?.(u, requirementId);
													}
												}}
												role="button"
												tabIndex={0}
											>
												<div className="flex items-center justify-between">
													<div className="flex items-center gap-3 min-w-0">
														<div className="relative shrink-0">
															<img
																src={avatarSrc}
																alt={displayName}
																onError={(e) => { e.target.src = '/src/assets/images/user.svg'; }}
																className={`h-11 w-11 rounded-full object-cover border-2 ${hasUploaded ? 'border-emerald-500' : 'border-slate-200'}`}
															/>
															{hasUploaded && (
																<span className="absolute -bottom-0.5 -right-0.5 flex h-[18px] w-[18px] min-w-[18px] min-h-[18px] shrink-0 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-white shadow-2xs">
																	<svg className="w-2.5 h-2.5 stroke-white" fill="none" viewBox="0 0 24 24" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
																		<polyline points="20 6 9 17 4 12" />
																	</svg>
																</span>
															)}
														</div>
														<div className="min-w-0">
															<div className="truncate text-xs font-bold text-slate-800">{displayName}</div>
															<div className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
																{hasUploaded ? `${userFiles.length} evidence file(s) uploaded` : 'Assigned (Pending upload)'}
															</div>
														</div>
													</div>

													<div className="flex items-center gap-2">
														{(() => {
															if (!hasUploaded) {
																return (
																	<span className="shrink-0 rounded-full px-3 py-1 text-[11px] font-bold bg-slate-100 text-slate-500">
																		Assigned
																	</span>
																);
															}
															const approvedCount = userFiles.filter(f => f.reviewStatus === 'approved').length;
															const rejectedCount = userFiles.filter(f => f.reviewStatus === 'rejected').length;

															if (isViewerAuditor) {
																return (
																	<span className="shrink-0 rounded-full px-3 py-1 text-[11px] font-bold bg-emerald-100 text-emerald-700 shadow-2xs">
																		Submitted ({userFiles.length})
																	</span>
																);
															}

															if (rejectedCount > 0) {
																return (
																	<span className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200 shadow-2xs flex items-center gap-1">
																		<span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
																		Needs Revision ({rejectedCount})
																	</span>
																);
															}
															if (approvedCount === userFiles.length && userFiles.length > 0) {
																return (
																	<span className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs flex items-center gap-1">
																		<span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
																		All Approved
																	</span>
																);
															}
															if (approvedCount > 0) {
																return (
																	<span className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 shadow-2xs flex items-center gap-1">
																		<span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
																		{approvedCount}/{userFiles.length} Approved
																	</span>
																);
															}
															return (
																<span className="shrink-0 rounded-full px-3 py-1 text-[11px] font-bold bg-emerald-100 text-emerald-700 shadow-2xs">
																	Submitted
																</span>
															);
														})()}
													</div>
												</div>
											</div>
										);
									})}

									{/* Single upload control placed below the user list for auditors to add files */}
									{currentUser && onFileUpload && users.some((uu) => Number(uu?.UserID) === Number(currentUser?.UserID)) && (
										<div className="mt-2 px-0">
											<input
												id={`user-upload-${requirementId}-${currentUser?.UserID}`}
												type="file"
												accept=".pdf,.doc,.docx,.xlsx,.xls,.jpg,.jpeg,.png,.gif,.mp4,.webm,.ogg,.mov,.avi,.mkv"
												multiple
												className="hidden"
												onChange={handleUploadAndRefresh}
											/>
											<label
												htmlFor={`user-upload-${requirementId}-${currentUser?.UserID}`}
												onClick={(e) => e.stopPropagation()}
												className="mx-3 w-full cursor-pointer items-center justify-center rounded-xl border border-dashed border-blue-300 bg-blue-50/50 font-semibold text-blue-700 hover:border-blue-400 hover:bg-blue-100/60 transition-all flex px-4 py-2.5 text-xs gap-2"
											>
												<svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
													<path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
												</svg>
												<span>+ Add More Evidence Files</span>
											</label>
										</div>
									)}
									{users.length === 0 && (
										<div className="rounded-xl border border-dashed border-slate-300/60 bg-slate-100/80 py-8 text-center text-sm text-slate-500">
											No assigned users.
										</div>
									)}
								</div>
							</div>
						)}

						{isYourWorkView && <div className="flex-1 min-h-2" />}

						{shouldRenderPrivateCommentSection ? (
							<div className="mt-4">
							{savedComment ? (
								<div className="mb-2">
									<div className="rounded-lg border border-slate-300/50 bg-slate-50 p-3 shadow-sm">
										<div className="flex items-center justify-between gap-2 text-[12px] font-semibold text-gray-800">
											<span>
												{commentLabel}
												{savedCommentAt ? (
													<span className="font-normal text-gray-500"> - {formatShortDate(savedCommentAt)}</span>
												) : null}
											</span>
											{canEditPrivateComments ? (
												<button
													type="button"
													onClick={handleClearComment}
													disabled={savingComment}
													className="rounded-md px-2 py-0.5 text-[11px] font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-40"
												>
													Clear
												</button>
											) : null}
										</div>
										<div className="mt-1 text-[14px] text-gray-800 break-words">{savedComment}</div>
									</div>
								</div>
							) : null}

							{canEditPrivateComments ? (
								<>
									<div className="rounded-full border border-slate-300/50 bg-slate-50 px-3 py-2 flex items-center gap-2">
										<input
											type="text"
											value={commentInput}
											onChange={(e) => setCommentInput(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === 'Enter') {
													e.preventDefault();
													handleSaveComment();
												}
											}}
											className="flex-1 bg-transparent outline-none text-[13px] text-gray-800 placeholder:text-gray-400"
											placeholder="Add private comment..."
											disabled={savingComment || !officeId}
										/>
										<button
											type="button"
											onClick={handleSaveComment}
											disabled={savingComment || !officeId || !String(commentInput || '').trim()}
											className="h-8 w-8 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40"
											aria-label="Send private comment"
											title={!officeId ? 'Office required' : 'Send'}
										>
											<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
												<path d="M3 12L21 3l-6 18-2.7-7.3L3 12Z" fill="currentColor" />
											</svg>
										</button>
									</div>
									{commentStatus === 'Failed to save' ? (
										<div className="mt-1 text-[11px] text-red-600">Failed to save</div>
									) : null}
								</>
							) : null}
						</div>
					) : null}
					</div>
				</div>
			</div>
		</div>
	);
}
