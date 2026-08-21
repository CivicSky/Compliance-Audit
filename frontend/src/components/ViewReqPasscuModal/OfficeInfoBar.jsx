import React, { useState, useEffect } from 'react';
import StatusBadge from './StatusBadge';
import { API_BASE_URL } from '../../utils/apiBase';

export default function OfficeInfoBar({ officeData, isAssignedInCurrentOffice, assignedRequirementCount }) {
    const [auditors, setAuditors] = useState([]);
    const compliance = officeData?.compliance_percent ? Number(officeData.compliance_percent).toFixed(1) : '0';
    const complianceNum = parseFloat(compliance);
    const statusId =
        officeData?.overall_status === 'Complied' ? 5 :
        officeData?.overall_status === 'Partially Complied' ? 4 : 3;

    useEffect(() => {
        const officeId = officeData?.office_id || officeData?.OfficeID;
        if (!officeId) return;
        let mounted = true;
        fetch(`${API_BASE_URL}/api/areas/auditors/office/${officeId}`)
            .then(res => res.json())
            .then(data => {
                if (mounted && data.success) setAuditors(data.auditors || []);
            })
            .catch(() => {});
        return () => { mounted = false; };
    }, [officeData]);

    // Compliance color
    const complianceColor = complianceNum >= 80
        ? 'text-emerald-600'
        : complianceNum >= 50
            ? 'text-amber-600'
            : 'text-rose-600';

    return (
        <div className="border-b border-slate-200/70 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Left: Personnel + Auditor */}
                <div className="flex min-w-0 flex-wrap items-center gap-4">
                    {/* Personnel */}
                    {(() => {
                        const officeHeads = officeData?.heads || [];

                        if (officeHeads.length === 0) {
                            return (
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-100 shadow-sm">
                                        <img src="/src/assets/images/user.svg" alt="" className="h-4 w-4 opacity-40" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Personnel</p>
                                        <p className="text-xs font-medium text-slate-500 italic">Unassigned</p>
                                    </div>
                                </div>
                            );
                        }

                        if (officeHeads.length > 1) {
                            return (
                                <div className="flex items-center gap-2.5">
                                    <div className="flex -space-x-2 overflow-hidden">
                                        {officeHeads.map((head) => {
                                            const headPicUrl = head.ProfilePic
                                                ? `${API_BASE_URL}/uploads/profile-pics/${head.ProfilePic}`
                                                : '/src/assets/images/user.svg';
                                            return (
                                                <img
                                                    key={head.HeadID}
                                                    src={headPicUrl}
                                                    alt={head.FirstName || head.full_name}
                                                    title={head.FirstName || head.full_name}
                                                    className="h-8 w-8 rounded-full border-2 border-white object-cover shadow-sm"
                                                    onError={(e) => { e.target.src = '/src/assets/images/user.svg'; }}
                                                />
                                            );
                                        })}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Personnel</p>
                                        <p className="text-xs font-semibold text-slate-700">{officeHeads.length} members</p>
                                    </div>
                                </div>
                            );
                        }

                        const primaryHead = officeHeads[0];
                        const headPicUrl = primaryHead?.ProfilePic
                            ? `${API_BASE_URL}/uploads/profile-pics/${primaryHead.ProfilePic}`
                            : '/src/assets/images/user.svg';
                        return (
                            <div className="flex items-center gap-2.5">
                                <img
                                    src={headPicUrl}
                                    alt={primaryHead?.full_name}
                                    className="h-8 w-8 rounded-full border-2 border-white object-cover shadow-sm ring-1 ring-slate-200"
                                    onError={(e) => { e.target.src = '/src/assets/images/user.svg'; }}
                                />
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Personnel</p>
                                    <p className="text-xs font-semibold text-slate-700">{primaryHead?.FirstName || primaryHead?.full_name || '1 person'}</p>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Divider */}
                    <span className="h-8 w-px bg-slate-200" />

                    {/* External Auditor */}
                    <div className="flex items-center gap-2.5">
                        {auditors.length > 0 ? (
                            <>
                                <div className="flex -space-x-2 overflow-hidden">
                                    {auditors.map(aud => (
                                        <img
                                            key={aud.UserID}
                                            src={aud.ProfilePic ? `${API_BASE_URL}/uploads/profile-pics/${aud.ProfilePic}` : '/src/assets/images/user.svg'}
                                            alt={aud.FirstName}
                                            title={`External Auditor: ${aud.FirstName} ${aud.LastName}`}
                                            className="h-8 w-8 rounded-full border-2 border-white object-cover shadow-sm ring-1 ring-sky-300"
                                            onError={(e) => { e.target.src = '/src/assets/images/user.svg'; }}
                                        />
                                    ))}
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600">External Auditor</p>
                                    <p className="text-xs font-semibold text-sky-800">
                                        {auditors.length === 1
                                            ? `${auditors[0].FirstName} ${auditors[0].LastName}`
                                            : `${auditors.length} assigned`}
                                    </p>
                                </div>
                            </>
                        ) : (
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">External Auditor</p>
                                <p className="text-xs font-medium text-slate-400 italic">None assigned</p>
                            </div>
                        )}
                    </div>

                    {isAssignedInCurrentOffice && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold text-cyan-700 shadow-sm">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-500" />
                            Assigned here ({assignedRequirementCount})
                        </span>
                    )}
                </div>

                {/* Right: Compliance */}
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Compliance</p>
                        <p className={`text-2xl font-black tabular-nums tracking-tight ${complianceColor}`}>{compliance}%</p>
                    </div>
                    <div className="h-8 w-px bg-slate-200" />
                    <StatusBadge statusId={statusId} />
                </div>
            </div>
        </div>
    );
}
