import React from 'react';
import StatusBadge from './StatusBadge';
import { API_BASE_URL } from '../../utils/apiBase';

export default function OfficeInfoBar({ officeData, isAssignedInCurrentOffice, assignedRequirementCount }) {
    const compliance = officeData.compliance_percent ? Number(officeData.compliance_percent).toFixed(1) : '0';
    const statusId =
        officeData.overall_status === 'Complied' ? 5 :
        officeData.overall_status === 'Partially Complied' ? 4 : 3;

    return (
        <div className="border-b border-slate-300/60 bg-gradient-to-r from-slate-100 to-slate-200/50 px-5 py-3.5">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                    {(() => {
                        const officeHeads = officeData.heads || [];

                        if (officeHeads.length === 0) {
                            return (
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-slate-200 shadow-sm ring-1 ring-slate-200/80">
                                        <img src="/src/assets/images/user.svg" alt="" className="h-5 w-5 opacity-50" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Personnel</p>
                                        <p className="text-sm font-medium text-slate-700">Unassigned</p>
                                    </div>
                                </div>
                            );
                        }

                        if (officeHeads.length > 1) {
                            return (
                                <div className="flex flex-wrap items-center gap-4">
                                    {officeHeads.map((head) => {
                                        const headPicUrl = head.ProfilePic
                                            ? `${API_BASE_URL}/uploads/profile-pics/${head.ProfilePic}`
                                            : '/src/assets/images/user.svg';
                                        const displayName = head.FirstName || head.full_name || head.HeadName
                                            ? `${head.FirstName ? head.FirstName + (head.LastName ? ' ' + head.LastName : '') : (head.full_name || head.HeadName)}`
                                            : '';
                                        return (
                                            <div key={head.HeadID} className="flex w-20 flex-col items-center text-center">
                                                <img
                                                    src={headPicUrl}
                                                    alt={displayName}
                                                    className="h-9 w-9 rounded-full border-2 border-white object-cover shadow-sm ring-1 ring-slate-200/80"
                                                    onError={(e) => { e.target.src = '/src/assets/images/user.svg'; }}
                                                />
                                                <p className="mt-1 w-full truncate text-[11px] font-medium text-slate-700">{displayName}</p>
                                            </div>
                                        );
                                    })}
                                    <p className="text-xs text-slate-500">{officeHeads.length} personnel</p>
                                </div>
                            );
                        }

                        const primaryHead = officeHeads[0];
                        const headPicUrl = primaryHead?.ProfilePic
                            ? `${API_BASE_URL}/uploads/profile-pics/${primaryHead.ProfilePic}`
                            : '/src/assets/images/user.svg';
                        return (
                            <div className="flex items-center gap-3">
                                <img
                                    src={headPicUrl}
                                    alt={primaryHead?.full_name}
                                    className="h-10 w-10 rounded-full border-2 border-white object-cover shadow-sm ring-1 ring-slate-200/80"
                                    onError={(e) => { e.target.src = '/src/assets/images/user.svg'; }}
                                />
                                <p className="text-xs text-slate-500">1 personnel</p>
                            </div>
                        );
                    })()}

                    {isAssignedInCurrentOffice && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200/80 bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold text-cyan-800 shadow-sm">
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                            Assigned here ({assignedRequirementCount})
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Compliance</p>
                        <p className="text-2xl font-bold tabular-nums tracking-tight text-slate-900">{compliance}%</p>
                    </div>
                    <StatusBadge statusId={statusId} />
                </div>
            </div>
        </div>
    );
}
