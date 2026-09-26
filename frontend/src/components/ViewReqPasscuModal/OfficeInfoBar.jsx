import React, { useState, useEffect } from 'react';
import StatusBadge from './StatusBadge';
import { API_BASE_URL } from '../../utils/apiBase';
import SmartUserAvatar from './SmartUserAvatar';

export default function OfficeInfoBar({ officeData, isAssignedInCurrentOffice, assignedRequirementCount, requirements = [] }) {
    const [auditors, setAuditors] = useState([]);
    const [fetchedHeads, setFetchedHeads] = useState([]);

    const { complianceNum, compliance, statusId } = React.useMemo(() => {
        const totalOfficeReqs = Number(officeData?.total_requirements ?? officeData?.TotalRequirements ?? 0);
        const rawPct = officeData?.compliance_percent ?? officeData?.CompliancePercent ?? officeData?.compliance_percentage ?? officeData?.compliancePercentage;

        // If officeData provides the comprehensive compliance percent across all areas and total requirements exceed the loaded array
        if (rawPct !== undefined && rawPct !== null && !isNaN(Number(rawPct)) && totalOfficeReqs > 0 && Array.isArray(requirements) && totalOfficeReqs > requirements.length) {
            const score = Number(rawPct);
            const status =
                officeData?.overall_status === 'Complied' || officeData?.OverallStatus === 'Complied' ? 5 :
                officeData?.overall_status === 'Partially Complied' || officeData?.OverallStatus === 'Partially Complied' ? 4 : 3;

            return {
                complianceNum: score,
                compliance: score.toFixed(1),
                statusId: status
            };
        }

        if (Array.isArray(requirements) && requirements.length > 0) {
            const total = totalOfficeReqs > requirements.length ? totalOfficeReqs : requirements.length;
            const complied = requirements.filter(r => {
                const s = Number(r.ComplianceStatusID ?? r.complianceStatusId ?? r.Status ?? r.status);
                return s === 5;
            }).length;
            const partial = requirements.filter(r => {
                const s = Number(r.ComplianceStatusID ?? r.complianceStatusId ?? r.Status ?? r.status);
                return s === 4;
            }).length;
            const notComplied = requirements.filter(r => {
                const s = Number(r.ComplianceStatusID ?? r.complianceStatusId ?? r.Status ?? r.status);
                return s === 3 || (![4, 5].includes(s));
            }).length;

            const score = total > 0 ? ((complied * 100 + partial * 50) / (total * 100)) * 100 : 0;
            
            let status = 3;
            if (total > 0 && complied === total) {
                status = 5;
            } else if (total > 0 && (notComplied === total || (complied === 0 && partial === 0))) {
                status = 3;
            } else if (total > 0) {
                status = 4;
            }

            return {
                complianceNum: score,
                compliance: score.toFixed(1),
                statusId: status
            };
        }

        const score = rawPct !== undefined && rawPct !== null && !isNaN(Number(rawPct)) ? Number(rawPct) : 0;
        const status =
            officeData?.overall_status === 'Complied' || officeData?.OverallStatus === 'Complied' ? 5 :
            officeData?.overall_status === 'Partially Complied' || officeData?.OverallStatus === 'Partially Complied' ? 4 : 3;

        return {
            complianceNum: score,
            compliance: score.toFixed(1),
            statusId: status
        };
    }, [requirements, officeData]);

    useEffect(() => {
        const officeId = officeData?.office_id || officeData?.OfficeID || officeData?.id;
        if (!officeId) return;
        let mounted = true;

        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        // Fetch auditors
        fetch(`${API_BASE_URL}/api/areas/auditors/office/${officeId}`, { headers })
            .then(res => res.json())
            .then(data => {
                if (mounted && data.success) {
                    const list = data.auditors || [];
                    const unique = Array.from(new Map(list.map(a => [a.UserID ?? a.id, a])).values());
                    setAuditors(unique);
                }
            })
            .catch(() => {});

        // Fetch office heads if not directly present
        const existingHeads = officeData?.heads || officeData?.Heads;
        if (!Array.isArray(existingHeads) || existingHeads.length === 0) {
            fetch(`${API_BASE_URL}/api/officeheads/all`, { headers })
                .then(res => res.json())
                .then(data => {
                    if (!mounted) return;
                    const allHeads = Array.isArray(data) ? data : (data.data || []);
                    const matching = allHeads.filter(h => {
                        if (Number(h.OfficeID) === Number(officeId)) return true;
                        if (Array.isArray(h.assigned_offices)) {
                            return h.assigned_offices.some(o => Number(o.id || o.OfficeID || o.office_id) === Number(officeId));
                        }
                        return false;
                    });
                    if (matching.length > 0) {
                        setFetchedHeads(matching);
                    }
                })
                .catch(() => {});
        }

        return () => { mounted = false; };
    }, [officeData]);

    // Compliance color
    const complianceColor = complianceNum >= 80
        ? 'text-emerald-600'
        : complianceNum >= 50
            ? 'text-amber-600'
            : 'text-rose-600';

    // Compute heads
    const rawHeads = (Array.isArray(officeData?.heads) && officeData.heads.length > 0)
        ? officeData.heads
        : (Array.isArray(officeData?.Heads) && officeData.Heads.length > 0)
        ? officeData.Heads
        : (fetchedHeads.length > 0)
        ? fetchedHeads
        : [];

    let officeHeads = [...rawHeads];

    if (officeHeads.length === 0 && (officeData?.head_name || officeData?.HeadName)) {
        const name = officeData.head_name || officeData.HeadName;
        if (name && name !== 'Unassigned' && name !== 'Unknown Head') {
            officeHeads = [{
                HeadID: officeData.head_id || officeData.HeadID || 1,
                full_name: name,
                FirstName: name,
                ProfilePic: officeData.head_profile_pic || officeData.HeadProfilePic || null
            }];
        }
    }

    return (
        <div className="border-b border-slate-200/70 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Left: Personnel + Auditor */}
                <div className="flex min-w-0 flex-wrap items-center gap-4">
                    {/* Personnel */}
                    {(() => {
                        if (officeHeads.length === 0) {
                            return (
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-400 shadow-xs">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
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
                                        {officeHeads.map((head) => (
                                            <SmartUserAvatar
                                                key={head.HeadID || head.UserID || head.id || Math.random()}
                                                user={head}
                                                size="h-8 w-8"
                                                ring="border-2 border-white"
                                            />
                                        ))}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Personnel</p>
                                        <p className="text-xs font-semibold text-slate-700">
                                            {officeHeads.map(h => h.FirstName || h.full_name).filter(Boolean).join(', ') || `${officeHeads.length} members`}
                                        </p>
                                    </div>
                                </div>
                            );
                        }

                        const primaryHead = officeHeads[0];
                        const headDisplayName = primaryHead?.full_name || `${primaryHead?.FirstName || ''} ${primaryHead?.LastName || ''}`.trim() || primaryHead?.FirstName || 'Assigned';
                        return (
                            <div className="flex items-center gap-2.5">
                                <SmartUserAvatar
                                    user={primaryHead}
                                    size="h-8 w-8"
                                    ring="border-2 border-white ring-1 ring-slate-200"
                                />
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Personnel</p>
                                    <p className="text-xs font-semibold text-slate-700">{headDisplayName}</p>
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
                                        <SmartUserAvatar
                                            key={aud.UserID ?? aud.id}
                                            user={aud}
                                            size="h-8 w-8"
                                            ring="border-2 border-white ring-1 ring-sky-300"
                                        />
                                    ))}
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600">External Auditor</p>
                                    <p className="text-xs font-semibold text-sky-800">
                                        {auditors.length === 1
                                            ? `${auditors[0].FirstName || ''} ${auditors[0].LastName || ''}`.trim() || auditors[0].FirstName || 'Auditor'
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
