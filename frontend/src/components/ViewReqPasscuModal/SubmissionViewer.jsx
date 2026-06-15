import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth/mammoth.browser';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorkerSrc from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';
import YourWorkFileUpload from './YourWorkFileUpload';
import { useModal } from '../UI/ModalProvider';
import { API_BASE_URL } from '../../utils/apiBase';

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
			return `<text x="12" y="${y}" font-size="10" fill="#374151" font-family="ui-sans-serif, system-ui, -apple-system">${
				l.replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]))
			}</text>`;
		})
		.join('');

	return svgDataUrl(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${THUMB_W}" height="${THUMB_H}" viewBox="0 0 ${THUMB_W} ${THUMB_H}">
  <rect x="0" y="0" width="${THUMB_W}" height="${THUMB_H}" fill="#ffffff"/>
  <rect x="0.5" y="0.5" width="${THUMB_W - 1}" height="${THUMB_H - 1}" rx="8" fill="#ffffff" stroke="#e5e7eb"/>
  <text x="12" y="22" font-size="11" font-weight="600" fill="#111827" font-family="ui-sans-serif, system-ui, -apple-system">${
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
				cells += `<text x="${x + 4}" y="${y + 12}" font-size="9" fill="#374151" font-family="ui-sans-serif, system-ui, -apple-system">${esc(
					v
				)}</text>`;
			}
		}
	}

	return svgDataUrl(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${THUMB_W}" height="${THUMB_H}" viewBox="0 0 ${THUMB_W} ${THUMB_H}">
  <rect x="0" y="0" width="${THUMB_W}" height="${THUMB_H}" fill="#ffffff"/>
  <rect x="0.5" y="0.5" width="${THUMB_W - 1}" height="${THUMB_H - 1}" rx="8" fill="#ffffff" stroke="#e5e7eb"/>
  <text x="12" y="22" font-size="11" font-weight="600" fill="#111827" font-family="ui-sans-serif, system-ui, -apple-system">${esc(
		title
	)}</text>
  <line x1="12" y1="30" x2="${THUMB_W - 12}" y2="30" stroke="#e5e7eb"/>
  ${cells}
</svg>`);
};

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
	showPrivateComments = true,
	canEditPrivateComments = true,
	allowWorkActions = false,
	viewerRoleId = 0,
	onFileUpload,
	onFileUnsubmit,
	uploadingFile = false,
	unsubmittingFile = false,
}) {
	const requirementId = requirement?.RequirementID;
	const title = requirement?.RequirementTitle || requirement?.Title || requirement?.RequirementCode || 'Submission';
	const { showConfirm } = useModal();

	const assignedCount = users.length;
	const turnedInCount = users.reduce(
		(acc, u) => acc + ((u?.HasUploaded === 1 || u?.HasUploaded === true) ? 1 : 0),
		0
	);

	const uploadedUserIds = useMemo(() => {
		return (users || [])
			.filter((u) => (u?.HasUploaded === 1 || u?.HasUploaded === true) && u?.UserID)
			.map((u) => Number(u.UserID))
			.filter((id) => Number.isFinite(id) && id > 0);
	}, [users]);
	const uploadedUserIdsKey = uploadedUserIds.join(',');

	const [fileByUserId, setFileByUserId] = useState({});
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
			setLoadingByUserId({});
			setThumbByUserId({});
			setThumbLoadingByUserId({});
			return;
		}

		let cancelled = false;
		const controller = new AbortController();

		setFileByUserId({});
		setLoadingByUserId(
			uploadedUserIds.reduce((acc, id) => {
				acc[id] = true;
				return acc;
			}, {})
		);
		setThumbByUserId({});
		setThumbLoadingByUserId({});
		lastThumbKeyRef.current = '';

		const fetchUserFile = async (userId) => {
			try {
				const token = localStorage.getItem('token');
				const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
				const res = await fetch(
					`${API_BASE_URL}/api/requirements/${requirementId}/user-file/${userId}`,
					{ headers, signal: controller.signal }
				);
				if (!res.ok) {
					// 404 means no file exists; silently ignore
					return;
				}
				const data = await res.json();
				if (cancelled) return;
				if (data?.success && data?.file) {
					setFileByUserId((prev) => ({ ...prev, [userId]: data.file }));
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
	}, [show, requirementId, uploadedUserIdsKey]);

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
		} catch (e) {
			setCommentStatus('Failed to clear');
		} finally {
			setSavingComment(false);
		}
	};

	const isYourWorkView = !canEditPrivateComments && users.length === 1;
	const isReadOnlyWorkView = isYourWorkView && !allowWorkActions;
	const workUser = isYourWorkView ? users[0] : null;
	const workUserId = workUser?.UserID ? Number(workUser.UserID) : null;
	const workHasUploaded = workUser?.HasUploaded === 1 || workUser?.HasUploaded === true;
	const workFile = workUserId ? fileByUserId[workUserId] : null;
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

	if (!show) return null;

	return (
		<div
			className="fixed inset-0 z-[130]"
			style={leftStyle}
			onClick={(e) => {
				e.stopPropagation();
				onClose?.();
			}}
			role="presentation"
		>
			<div
				className="relative ml-auto flex h-full w-[28%] min-w-[340px] flex-col border-l border-stone-200/90 bg-app-surface shadow-2xl shadow-slate-900/10"
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-label="Submission"
			>
				<div className="relative flex h-14 shrink-0 items-center justify-between border-b border-stone-200/90 bg-app-surface px-4">
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
						className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
					>
						Close
					</button>
				</div>

				<div className="min-h-0 flex-1 overflow-y-auto bg-app">
					<div className="flex min-h-full flex-col p-4">
						{!isYourWorkView && (
							<div className="mb-3 flex gap-3">
								<div className="flex-1 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-sm">
									<div className="text-lg font-bold tabular-nums leading-none text-slate-900">{assignedCount}</div>
									<div className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">Assigned</div>
								</div>
								<div className="flex-1 rounded-xl border border-emerald-200/60 bg-emerald-50/50 px-3 py-2.5 shadow-sm">
									<div className="text-lg font-bold tabular-nums leading-none text-emerald-800">{turnedInCount}</div>
									<div className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-emerald-600/90">Submitted</div>
								</div>
							</div>
						)}

						{isYourWorkView && (
							<YourWorkFileUpload
								requirementId={requirementId}
								hasUploaded={workHasUploaded}
								file={workFile}
								thumb={workThumb}
								isLoadingFile={workLoadingFile}
								isLoadingThumb={workLoadingThumb}
								uploading={uploadingFile}
								unsubmitting={unsubmittingFile}
								onUpload={onFileUpload}
								onUnsubmit={onFileUnsubmit}
								onViewFile={
									workHasUploaded && onViewUserFile && workUser
										? () => onViewUserFile(workUser, requirementId)
										: undefined
								}
								readOnly={isReadOnlyWorkView}
								viewerRoleId={viewerRoleId}
							/>
						)}

						{!isYourWorkView && (
						<div className="mt-3 pr-1">
							<div className="grid grid-cols-1 gap-3">
								{users.map((u) => {
									const displayName = `${u?.FirstName || ''}${u?.LastName ? ' ' + u.LastName : ''}`.trim() || u?.Username || 'User';
									const hasUploaded = u?.HasUploaded === 1 || u?.HasUploaded === true;
									const userId = u?.UserID ? Number(u.UserID) : null;
									const canOpen = !!(onViewUserFile && requirementId && hasUploaded && userId);
									const avatarSrc = u?.ProfilePic
										? `${API_BASE_URL}/uploads/profile-pics/${u.ProfilePic}`
										: '/src/assets/images/user.svg';
									const file = userId ? fileByUserId[userId] : null;
									const isLoadingFile = userId ? loadingByUserId[userId] : false;
									const thumb = userId ? thumbByUserId[userId] : null;
									const isLoadingThumb = userId ? thumbLoadingByUserId[userId] : false;
									const ext = getExtension(file?.fileName || file?.url);

									return (
										<div
											key={u?.UserID || displayName}
											className={`w-full min-h-[142px] overflow-hidden rounded-xl border border-slate-300/50 bg-slate-100/90 shadow-sm ${canOpen ? 'cursor-pointer transition hover:border-indigo-300/60 hover:shadow-md' : ''}`}
											onClick={() => {
												if (!canOpen) return;
												onViewUserFile?.(u, requirementId);
											}}
											onKeyDown={(e) => {
												if (!canOpen) return;
												if (e.key === 'Enter' || e.key === ' ') {
													e.preventDefault();
													onViewUserFile?.(u, requirementId);
												}
										}}
											role={canOpen ? 'button' : undefined}
											tabIndex={canOpen ? 0 : undefined}
										>
											<div className="p-3 h-full flex flex-col min-h-0">
												<div className="flex items-center gap-3">
													<div className="relative">
														<img
															src={avatarSrc}
															alt={displayName}
															title={displayName}
															onError={(e) => {
															e.target.src = '/src/assets/images/user.svg';
														}}
														className={`h-11 w-11 rounded-full object-cover border-2 ring-1 ring-slate-200/50 ${hasUploaded ? 'border-emerald-500' : 'border-slate-200'}`}
													/>
													{hasUploaded && (
														<span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-[11px] font-bold text-white">
															✓
														</span>
													)}
												</div>
													<div className="min-w-0">
														<div className="truncate text-[12px] font-semibold text-slate-800">{displayName}</div>
													</div>
												</div>

												<div className="mt-3 min-h-0 flex-1">
													<div className="h-[74px] overflow-hidden rounded-xl border border-slate-200 bg-white">
														<div className="h-full w-full flex items-stretch">
															<div className="min-w-0 flex-1 px-3 py-2.5">
																{(!hasUploaded && !isLoadingFile && !isLoadingThumb) ? (
																	<>
																		<div className="truncate text-sm font-medium text-slate-500">No attachment submitted</div>
																		<div className="mt-0.5 text-[13px] text-slate-400">File</div>
																	</>
																) : isLoadingFile ? (
																	<>
																		<div className="truncate text-sm font-medium text-slate-500">Loading preview...</div>
																		<div className="mt-0.5 text-[13px] text-slate-400">File</div>
																	</>
																) : isLoadingThumb ? (
																	<>
																		<div className="truncate text-sm font-medium text-slate-500">Preparing preview...</div>
																		<div className="mt-0.5 text-[13px] text-slate-400">File</div>
																	</>
																) : (file?.fileName || file?.url) ? (
																	<>
																		<div className="truncate text-[17px] font-medium text-blue-700 underline decoration-blue-300/80 underline-offset-2">{String(file?.fileName || file?.url).split('/').pop()}</div>
																		<div className="mt-0.5 text-[13px] text-slate-500">{getFileTypeLabel(ext)}</div>
																	</>
																) : (
																	<>
																		<div className="truncate text-sm font-medium text-slate-500">Attachment</div>
																		<div className="mt-0.5 text-[13px] text-slate-400">File</div>
																	</>
																)}
															</div>

															<div className="w-28 shrink-0 border-l border-slate-200 bg-white">
																<div className="h-full w-full flex items-center justify-center p-2">
																	{(!hasUploaded && !isLoadingFile && !isLoadingThumb) ? (
																		<div className="h-full w-full rounded-lg bg-slate-50 border border-slate-200/70 flex items-center justify-center text-gray-300">
																			<svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
																				<path d="M7 7h6l4 4v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" stroke="#CBD5E1" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
																				<path d="M13 7v4h4" stroke="#E2E8F0" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
																			</svg>
																		</div>
																	) : isLoadingFile || isLoadingThumb ? (
																		<div className="h-full w-full rounded-lg bg-slate-50 border border-slate-200/70 flex items-center justify-center text-slate-400 text-sm">...</div>
																	) : file?.url && isImageExt(ext) ? (
																		<img src={file.url} alt="thumb" className="h-full w-full object-cover rounded-lg" />
																	) : thumb ? (
																		<img src={thumb} alt="thumb" className="h-full w-full object-cover rounded-lg bg-white" />
																	) : (
																		<div className="h-full w-full rounded-lg bg-slate-50 border border-slate-200/70 flex items-center justify-center text-xs font-semibold text-slate-500">{(ext || 'FILE').toUpperCase()}</div>
																	)}
																</div>
															</div>
														</div>
													</div>
												</div>

												<div className={`mt-2 text-[11px] font-semibold ${hasUploaded ? 'text-emerald-600' : 'text-slate-400'}`}>
													{hasUploaded ? 'Submitted' : 'Assigned'}
												</div>
											</div>
										</div>
									);
								})}
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
