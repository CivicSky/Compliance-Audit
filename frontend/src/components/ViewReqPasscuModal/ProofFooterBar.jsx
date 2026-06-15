import React from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../utils/apiBase';

const btnBase = 'rounded-lg px-3 py-1.5 text-xs font-medium transition shadow-sm disabled:opacity-50';

export default function ProofFooterBar({
    isAdmin,
    proofFileUrl,
    fileInputRef,
    handleProofFileChange,
    uploadingProof,
    showConfirm,
    showAlert,
    officeId,
    fetchOfficeRequirements,
    unsubmittingProof,
    setUnsubmittingProof,
    setPersistedProof,
    setProofFileName,
    setProofFileUrl,
    setExcelHtml,
    setExcelPreviewError,
    setExcelHtmlLoading,
    setDocxPreviewError,
    setShowDocViewer,
    onClose,
}) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200/90 bg-app-surface px-5 py-3">
            {isAdmin && (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Proof document</span>
                    {!proofFileUrl && (
                        <>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                onChange={handleProofFileChange}
                                accept=".pdf,.doc,.docx,.xlsx,.xls,.jpg,.jpeg,.png"
                                disabled={uploadingProof}
                            />
                            <button
                                type="button"
                                className={`${btnBase} border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100`}
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingProof}
                            >
                                {uploadingProof ? 'Uploading...' : 'Upload proof'}
                            </button>
                        </>
                    )}
                    {proofFileUrl && (
                        <>
                            <a
                                href={proofFileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`${btnBase} border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
                                download
                            >
                                Download
                            </a>
                            <button
                                type="button"
                                className={`${btnBase} border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100`}
                                onClick={async () => {
                                    const ok = await showConfirm('Delete proof document? This cannot be undone.');
                                    if (!ok) return;
                                    setUnsubmittingProof(true);
                                    try {
                                        const token = localStorage.getItem('token');
                                        const res = await fetch(`${API_BASE_URL}/api/officedocuments/${officeId}/proof`, {
                                            method: 'DELETE',
                                            headers: { Authorization: `Bearer ${token}` },
                                        });
                                        let data = {};
                                        const text = await res.text();
                                        try {
                                            data = text ? JSON.parse(text) : {};
                                        } catch (e) {
                                            data = { __raw: text };
                                        }
                                        if (res.ok && data.success) {
                                            setPersistedProof(null);
                                            setProofFileName('');
                                            setProofFileUrl('');
                                            try { await fetchOfficeRequirements(); } catch (e) { /* ignore */ }
                                            try {
                                                const res2 = await axios.get(`${API_BASE_URL}/api/officedocuments/${officeId}/proof`);
                                                if (res2.data && res2.data.success) {
                                                    setPersistedProof({ fileName: res2.data.file_name, url: `${API_BASE_URL}${res2.data.url}` });
                                                    setProofFileName(res2.data.file_name);
                                                    setProofFileUrl(`${API_BASE_URL}${res2.data.url}`);
                                                } else {
                                                    setPersistedProof(null);
                                                    setProofFileName('');
                                                    setProofFileUrl('');
                                                }
                                            } catch (e) { /* ignore */ }
                                            await showAlert('Proof deleted');
                                        } else {
                                            await showAlert(data.message || 'Failed to delete proof');
                                        }
                                    } catch (err) {
                                        console.error('Delete proof error', err);
                                        await showAlert('Failed to delete proof');
                                    } finally {
                                        setUnsubmittingProof(false);
                                    }
                                }}
                                disabled={unsubmittingProof}
                            >
                                {unsubmittingProof ? '...' : 'Remove'}
                            </button>
                            <button
                                type="button"
                                className={`${btnBase} border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100`}
                                onClick={() => {
                                    setExcelHtml(null);
                                    setExcelPreviewError(null);
                                    setExcelHtmlLoading(false);
                                    setDocxPreviewError(null);
                                    setShowDocViewer(true);
                                }}
                            >
                                Preview
                            </button>
                        </>
                    )}
                </div>
            )}

            <button
                type="button"
                onClick={onClose}
                className={`${btnBase} ml-auto border border-slate-300/70 bg-slate-50 text-slate-700 hover:bg-slate-200/60`}
            >
                Close
            </button>
        </div>
    );
}
