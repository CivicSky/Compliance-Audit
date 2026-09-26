import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    complianceStatusOfficesAPI,
    usersAPI,
    officesAPI,
    officeHeadsAPI,
    eventsAPI,
    requirementsAPI,
    criteriaAPI,
} from "../utils/api";
import api from "../utils/api";
import { Link } from "react-router-dom";
import { isAcademicEntity } from "../utils/entityHelpers";
import UnifiedSetupWizard from "../components/UnifiedSetupWizard/UnifiedSetupWizard";
import { DashboardSkeleton } from "../components/UI/Skeleton";
import DeficiencyTracker from "../components/Home/DeficiencyTracker";
import ViewReqPasscuModal from "../components/ViewReqPasscuModal/ViewReqPasscuModal";
import { useLiveRefresh } from "../utils/liveSync";
import {
    Activity,
    Building2,
    CheckCircle2,
    AlertTriangle,
    Clock,
    FileCheck2,
    Plus,
    ShieldCheck,
    Users,
    ArrowUpRight,
    Sparkles,
    Calendar,
    Layers,
    ListChecks,
} from "lucide-react";

const unwrapArray = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.logs)) return payload.logs;
    if (Array.isArray(payload?.users)) return payload.users;
    if (Array.isArray(payload?.events)) return payload.events;
    return [];
};

const normalizeAction = (rawAction) => {
    const action = String(rawAction || "").trim();
    if (/^POST\s+/i.test(action)) return "Created";
    if (/^(PUT|PATCH)\s+/i.test(action)) return "Updated";
    if (/^DELETE\s+/i.test(action)) return "Deleted";
    if (/^GET\s+/i.test(action)) return "Viewed";
    if (/login/i.test(action)) return "Login";
    if (/logout/i.test(action)) return "Logout";
    if (/(added|created|registered|copied)$/i.test(action)) return "Created";
    if (/(updated|relocated)$/i.test(action)) return "Updated";
    if (/(deleted|canceled|cancelled|removed)$/i.test(action)) return "Deleted";
    return "Updated";
};

const statusBadgeStyles = {
    Created: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Updated: "bg-blue-50 text-blue-700 border-blue-200",
    Deleted: "bg-rose-50 text-rose-700 border-rose-200",
    Viewed: "bg-amber-50 text-amber-700 border-amber-200",
    Login: "bg-slate-100 text-slate-700 border-slate-200",
    Logout: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function Home() {
    const [complianceData, setComplianceData] = useState([]);
    const [offices, setOffices] = useState([]);
    const [officeHeads, setOfficeHeads] = useState([]);
    const [events, setEvents] = useState([]);
    const [requirements, setRequirements] = useState([]);
    const [criteria, setCriteria] = useState([]);
    const [users, setUsers] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showWizard, setShowWizard] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [inspectOffice, setInspectOffice] = useState(null);
    const [isViewReqModalOpen, setIsViewReqModalOpen] = useState(false);

    // Default to admin (show features) until we confirm otherwise
    const isAdmin = !!(currentUser && (currentUser.RoleName === 'admin' || currentUser.RoleID === 1));

    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const response = await usersAPI.getLoggedInUser();
                if (response.success) setCurrentUser(response.user);
            } catch (error) {
                console.error('Error fetching current user:', error);
            }
        };
        fetchCurrentUser();
    }, []);

    const fetchDashboardData = useCallback(async (options = {}) => {
        const isSilent = Boolean(options?.silent);
        if (!isSilent) {
            setLoading(true);
        }
        try {
            const [
                compliancePayload,
                officesPayload,
                officeHeadsPayload,
                eventsPayload,
                requirementsPayload,
                criteriaPayload,
                usersPayload,
                logsResponse,
            ] = await Promise.all([
                complianceStatusOfficesAPI.getAll().catch(() => []),
                officesAPI.getAll().catch(() => []),
                officeHeadsAPI.getAllHeads().catch(() => []),
                eventsAPI.getAllEvents().catch(() => ({ data: [] })),
                requirementsAPI.getAllRequirements().catch(() => ({ data: [] })),
                criteriaAPI.getAll().catch(() => ({ data: [] })),
                usersAPI.getAllUsers().catch(() => ({ users: [] })),
                api.get("/api/logs").catch(() => ({ data: { logs: [] } })),
            ]);

            const nextCompliance = unwrapArray(compliancePayload);
            const nextOffices = unwrapArray(officesPayload);
            const nextOfficeHeads = unwrapArray(officeHeadsPayload);
            const nextEvents = unwrapArray(eventsPayload);
            const nextRequirements = unwrapArray(requirementsPayload);
            const nextCriteria = unwrapArray(criteriaPayload);
            const nextUsers = unwrapArray(usersPayload);
            const nextLogs = unwrapArray(logsResponse?.data)
                .slice()
                .sort((a, b) => new Date(b.Timestamp || 0) - new Date(a.Timestamp || 0));

            setComplianceData(nextCompliance);
            setOffices(nextOffices);
            setOfficeHeads(nextOfficeHeads);
            setEvents(nextEvents);
            setRequirements(nextRequirements);
            setCriteria(nextCriteria);
            setUsers(nextUsers);
            setLogs(nextLogs);
            setError(null);
        } catch (err) {
            console.error("Failed to fetch dashboard data:", err);
            if (!isSilent) {
                setError("Failed to load dashboard data.");
            }
        } finally {
            if (!isSilent) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // Live real-time syncing for dashboard metrics and logs
    useLiveRefresh(fetchDashboardData);

    const {
        officeMap,
        compiledOffices,
        notCompiledOffices,
        partialOffices,
        academicSummary,
        activeEventProgress,
        complianceSummary,
        completionRate,
    } = useMemo(() => {
        const getOfficeId = (office) =>
            office?.OfficeID ?? office?.id ?? office?.office_id ?? null;
        const getOfficeEventId = (office) =>
            office?.EventID ?? office?.EventId ?? office?.event_id ?? null;
        const getOfficeName = (office) =>
            office?.OfficeName ?? office?.office_name ?? office?.OfficeCode ?? office?.office_code ?? null;
        const getEventId = (entity) =>
            entity?.EventID ?? entity?.EventId ?? entity?.event_id ?? entity?.eventId ?? null;
        const getCriteriaId = (criterion) =>
            criterion?.CriteriaID ?? criterion?.CriteriaId ?? criterion?.criteria_id ?? criterion?.id ?? null;
        const getRequirementId = (requirement) =>
            requirement?.RequirementID ?? requirement?.RequirementId ?? requirement?.requirement_id ?? requirement?.id ?? null;
        const getRequirementCriteriaId = (requirement) =>
            requirement?.CriteriaID ?? requirement?.CriteriaId ?? requirement?.criteria_id ?? null;
        const getComplianceOfficeId = (row) =>
            row?.OfficeID ?? row?.office_id ?? row?.officeId ?? null;
        const getComplianceRequirementId = (row) =>
            row?.RequirementID ?? row?.requirement_id ?? row?.requirementId ?? null;
        const getComplianceStatus = (row) =>
            row?.Status ?? row?.status ?? null;

        const byOffice = {};
        const byEvent = {};
        const officeNameMap = {};
        const eventNameMap = {};
        const officeByIdMap = new Map();

        for (const office of offices) {
            const officeId = getOfficeId(office);
            if (officeId !== undefined && officeId !== null) {
                const idStr = String(officeId);
                officeByIdMap.set(idStr, office);
                officeNameMap[idStr] = getOfficeName(office) || `Office ${officeId}`;
            }
        }

        for (const event of events) {
            if (event?.EventID !== undefined && event?.EventID !== null) {
                eventNameMap[String(event.EventID)] =
                    event.EventName || event.EventCode || `Event ${event.EventID}`;
            }
        }

        const criteriaCountByEvent = {};
        const criteriaEventById = {};
        for (const criterion of criteria) {
            const criteriaId = getCriteriaId(criterion);
            const eventId = getEventId(criterion);
            if (criteriaId !== undefined && criteriaId !== null && eventId !== undefined && eventId !== null) {
                criteriaEventById[String(criteriaId)] = String(eventId);
            }
            if (eventId !== undefined && eventId !== null) {
                const key = String(eventId);
                criteriaCountByEvent[key] = (criteriaCountByEvent[key] || 0) + 1;
            }
        }

        for (const item of complianceData) {
            const officeId = item?.OfficeID;
            const eventId = item?.EventID;
            const status = Number(item?.Status);

            if (officeId !== undefined && officeId !== null) {
                if (!byOffice[officeId]) byOffice[officeId] = [];
                byOffice[officeId].push(status);
                if (!officeNameMap[String(officeId)]) {
                    officeNameMap[String(officeId)] = item?.OfficeName || `Office ${officeId}`;
                }
            }

            if (eventId !== undefined && eventId !== null) {
                if (!byEvent[eventId]) byEvent[eventId] = [];
                byEvent[eventId].push(status);
                if (!eventNameMap[String(eventId)]) {
                    eventNameMap[String(eventId)] = item?.EventName || `Event ${eventId}`;
                }
            }
        }

        // Helper to accurately classify any entity into: 'compiled' | 'partial' | 'notCompiled'
        const classifyOffice = (office, statuses = []) => {
            const statusStr = String(office?.overall_status || office?.OverallStatus || '').trim().toLowerCase();
            const percent = Number(office?.compliance_percent ?? office?.CompliancePercent ?? -1);

            if (statusStr === 'complied' || statusStr === 'fully complied' || percent >= 100) {
                return 'compiled';
            }
            if (statusStr === 'partially complied' || statusStr === 'partial' || (percent > 0 && percent < 100)) {
                return 'partial';
            }
            if (statusStr === 'not complied' || percent === 0) {
                if (statuses.length > 0) {
                    const allCompiled = statuses.every((s) => s === 5);
                    const hasComplied = statuses.some((s) => s === 5);
                    const hasPartial = statuses.some((s) => s === 4);
                    if (allCompiled) return 'compiled';
                    if (hasComplied || hasPartial) return 'partial';
                }
                return 'notCompiled';
            }

            if (statuses.length > 0) {
                const allCompiled = statuses.every((s) => s === 5);
                const hasComplied = statuses.some((s) => s === 5);
                const hasPartial = statuses.some((s) => s === 4);
                if (allCompiled) return 'compiled';
                if (hasComplied || hasPartial) return 'partial';
                return 'notCompiled';
            }

            return 'notCompiled';
        };

        // Classify all monitored entities (combining Academic Programs and Non-Academic Offices)
        const allEvaluatedOffices = offices.length > 0
            ? offices
            : Object.keys(byOffice).map((id) => ({ OfficeID: id, id }));

        let done = 0;
        let partial = 0;
        let notDone = 0;
        let academicCount = 0;
        let nonAcademicCount = 0;
        let academicPartial = 0;
        let nonAcademicPartial = 0;
        let academicDone = 0;
        let nonAcademicDone = 0;
        let academicNotDone = 0;
        let nonAcademicNotDone = 0;

        for (const office of allEvaluatedOffices) {
            const officeIdStr = String(getOfficeId(office));
            const statuses = byOffice[officeIdStr] || [];
            const bucket = classifyOffice(office, statuses);
            const isAcademic = isAcademicEntity(office);

            if (isAcademic) academicCount++;
            else nonAcademicCount++;

            if (bucket === 'compiled') {
                done++;
                if (isAcademic) academicDone++;
                else nonAcademicDone++;
            } else if (bucket === 'partial') {
                partial++;
                if (isAcademic) academicPartial++;
                else nonAcademicPartial++;
            } else {
                notDone++;
                if (isAcademic) academicNotDone++;
                else nonAcademicNotDone++;
            }
        }

        const activeEvents = events.filter((event) => {
            const eventStatus = String(event?.status || event?.Status || 'active').toLowerCase().trim();
            return eventStatus !== 'inactive';
        });

        const activeEventProgressList = activeEvents.map((event) => {
            const eventId = String(getEventId(event) ?? '');

            const eventOffices = offices.filter(
                (office) => String(getOfficeEventId(office) ?? '') === eventId
            );

            const eventOfficeIds = eventOffices
                .map((office) => String(getOfficeId(office) ?? ''))
                .filter(Boolean);

            const eventCriteriaIds = criteria
                .filter((criterion) => String(getEventId(criterion) ?? '') === eventId)
                .map((criterion) => String(getCriteriaId(criterion) ?? ''))
                .filter(Boolean);

            const eventCriteriaSet = new Set(eventCriteriaIds);
            const eventRequirementIds = requirements
                .filter((requirement) => {
                    const directEventId = getEventId(requirement);
                    if (directEventId !== undefined && directEventId !== null) {
                        return String(directEventId) === eventId;
                    }

                    const requirementCriteriaId = getRequirementCriteriaId(requirement);
                    return requirementCriteriaId !== undefined && requirementCriteriaId !== null
                        ? eventCriteriaSet.has(String(requirementCriteriaId))
                        : false;
                })
                .map((requirement) => String(getRequirementId(requirement) ?? ''))
                .filter(Boolean);

            const eventOfficeSet = new Set(eventOfficeIds);
            const eventRequirementSet = new Set(eventRequirementIds);
            const rowsForEvent = complianceData.filter((row) => {
                const officeId = String(getComplianceOfficeId(row) ?? '');
                if (!eventOfficeSet.has(officeId)) return false;

                if (eventRequirementSet.size === 0) return true;

                const requirementId = String(getComplianceRequirementId(row) ?? '');
                return eventRequirementSet.has(requirementId);
            });

            let compiledOfficeCount = 0;
            let partialOfficeCount = 0;
            let notCompiledOfficeCount = 0;
            let eventAcademicCount = 0;
            let eventNonAcademicCount = 0;
            let eventAcademicPartial = 0;
            let eventNonAcademicPartial = 0;

            const officeStatusesMap = new Map();
            for (const officeId of eventOfficeIds) {
                officeStatusesMap.set(officeId, []);
            }

            for (const row of rowsForEvent) {
                const officeId = String(getComplianceOfficeId(row) ?? '');
                if (!officeStatusesMap.has(officeId)) continue;
                const status = Number(getComplianceStatus(row));
                officeStatusesMap.get(officeId).push(Number.isFinite(status) ? status : 3);
            }

            for (const office of eventOffices) {
                const officeId = String(getOfficeId(office));
                const statusesForOffice = officeStatusesMap.get(officeId) || [];
                const officeBucket = classifyOffice(office, statusesForOffice);
                const isAcademic = isAcademicEntity(office);

                if (isAcademic) eventAcademicCount += 1;
                else eventNonAcademicCount += 1;

                if (officeBucket === 'compiled') {
                    compiledOfficeCount += 1;
                } else if (officeBucket === 'partial') {
                    partialOfficeCount += 1;
                    if (isAcademic) eventAcademicPartial += 1;
                    else eventNonAcademicPartial += 1;
                } else {
                    notCompiledOfficeCount += 1;
                }
            }

            let compiledRequirements = 0;
            let partialRequirements = 0;
            let notCompiledRequirements = 0;

            for (const row of rowsForEvent) {
                const status = Number(getComplianceStatus(row));
                if (status === 5) compiledRequirements += 1;
                else if (status === 4) partialRequirements += 1;
                else notCompiledRequirements += 1;
            }

            const totalOfficesForEvent = eventOfficeIds.length;
            const totalRequirementRows = rowsForEvent.length;
            const rawEventScore = totalRequirementRows > 0
                ? ((compiledRequirements * 100) + (partialRequirements * 50)) / totalRequirementRows
                : 0;
            const completionPercent = rawEventScore === 0
                ? 0
                : rawEventScore < 1
                ? Number(rawEventScore.toFixed(1))
                : (rawEventScore % 1 === 0 ? Number(rawEventScore.toFixed(0)) : Number(rawEventScore.toFixed(1)));

            return {
                id: eventId,
                name: event?.EventName || eventNameMap[eventId] || `Event ${eventId}`,
                code: event?.EventCode || '-',
                totalOffices: totalOfficesForEvent,
                totalEvents: 1,
                totalCriteria: criteriaCountByEvent[eventId] || 0,
                totalRequirements: rowsForEvent.length,
                completionPercent,
                officeStatus: {
                    compiled: compiledOfficeCount,
                    partial: partialOfficeCount,
                    notCompiled: notCompiledOfficeCount,
                    academicCount: eventAcademicCount,
                    nonAcademicCount: eventNonAcademicCount,
                    academicPartial: eventAcademicPartial,
                    nonAcademicPartial: eventNonAcademicPartial,
                },
                requirementStatus: {
                    compiled: compiledRequirements,
                    partial: partialRequirements,
                    notCompiled: notCompiledRequirements,
                },
            };
        });

        const totalRecords = complianceData.length;
        const compiledRecords = complianceData.filter((item) => Number(item?.Status) === 5).length;
        const partialRecords = complianceData.filter((item) => Number(item?.Status) === 4).length;
        const notCompiledRecords = complianceData.filter((item) => Number(item?.Status) === 3).length;

        const rawCompletion = totalRecords > 0
            ? ((compiledRecords * 100) + (partialRecords * 50)) / totalRecords
            : 0;

        const completionRate = rawCompletion === 0
            ? 0
            : rawCompletion < 1
            ? Number(rawCompletion.toFixed(1))
            : (rawCompletion % 1 === 0 ? Number(rawCompletion.toFixed(0)) : Number(rawCompletion.toFixed(1)));

        return {
            officeMap: byOffice,
            compiledOffices: done,
            notCompiledOffices: notDone,
            partialOffices: partial,
            academicSummary: {
                totalAcademic: academicCount,
                totalNonAcademic: nonAcademicCount,
                academicPartial,
                nonAcademicPartial,
                academicDone,
                nonAcademicDone,
                academicNotDone,
                nonAcademicNotDone,
            },
            activeEventProgress: activeEventProgressList,
            complianceSummary: {
                totalRecords,
                compiledRecords,
                partialRecords,
                notCompiledRecords,
            },
            completionRate,
        };
    }, [complianceData, offices, events, criteria, requirements]);

    const officesCount = Math.max(offices.length, Object.keys(officeMap).length);
    const recentLogs = useMemo(() => logs.slice(0, 6), [logs]);

    const activityByDay = useMemo(() => {
        const today = new Date();
        const buckets = [];
        for (let i = 6; i >= 0; i -= 1) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            buckets.push({
                key,
                label: d.toLocaleDateString("en-US", { weekday: "short" }),
                dateLabel: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                count: 0,
            });
        }

        const indexByKey = Object.fromEntries(buckets.map((item, idx) => [item.key, idx]));
        for (const log of logs) {
            if (!log?.Timestamp) continue;
            const key = new Date(log.Timestamp).toISOString().slice(0, 10);
            if (indexByKey[key] !== undefined) {
                buckets[indexByKey[key]].count += 1;
            }
        }
        return buckets;
    }, [logs]);

    const maxActivityCount = Math.max(...activityByDay.map((item) => item.count), 1);

    const totalOfficeUnits = compiledOffices + partialOffices + notCompiledOffices || officesCount || 1;
    const compiledOfficePct = Math.round((compiledOffices / totalOfficeUnits) * 100);
    const partialOfficePct = Math.round((partialOffices / totalOfficeUnits) * 100);
    const notCompiledOfficePct = Math.max(0, 100 - compiledOfficePct - partialOfficePct);

    const donutStyle = useMemo(() => {
        const total = compiledOffices + partialOffices + notCompiledOffices;
        if (total === 0) {
            return { background: "conic-gradient(#e2e8f0 0deg 360deg)" };
        }

        const compiledDeg = (compiledOffices / total) * 360;
        const partialDeg = (partialOffices / total) * 360;
        const notCompiledDeg = 360 - compiledDeg - partialDeg;

        return {
            background: `conic-gradient(
                #10b981 0deg ${compiledDeg}deg,
                #f59e0b ${compiledDeg}deg ${compiledDeg + partialDeg}deg,
                #f43f5e ${compiledDeg + partialDeg}deg ${compiledDeg + partialDeg + notCompiledDeg}deg
            )`,
        };
    }, [compiledOffices, partialOffices, notCompiledOffices]);

    if (loading) return <DashboardSkeleton />;
    if (error) return (
        <div className="m-6 rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
            <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
                <div>
                    <h3 className="font-semibold text-rose-900">Dashboard Unavailable</h3>
                    <p className="text-sm text-rose-700 mt-0.5">{error}</p>
                </div>
            </div>
            <button
                onClick={() => fetchDashboardData()}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 transition"
            >
                Retry Loading
            </button>
        </div>
    );

    return (
        <div className="w-full flex-1 flex flex-col min-w-0 bg-slate-50/50 overflow-hidden">
            {/* Top Header Card */}
            <div className="px-4 sm:px-6 pt-4 pb-3.5 shrink-0 border-b border-slate-200/70 bg-white shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-500/20 shrink-0">
                            <Activity className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
                        </div>
                        <div>
                            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">Compliance Dashboard</h1>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Operational compliance overview, institutional tracking, and audit activity.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {isAdmin && (
                            <button
                                onClick={() => setShowWizard(true)}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-emerald-700 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                            >
                                <Plus size={14} className="shrink-0" />
                                <span>Quick Setup</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 pt-4 pb-12">

            <UnifiedSetupWizard
                isOpen={showWizard}
                onClose={() => setShowWizard(false)}
                onSuccess={fetchDashboardData}
            />

            {/* ── Primary KPI Summary Bar (Hierarchy-First, Anti-Slop) ── */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                {/* 1. Global Compliance Index */}
                <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between">
                        <div>
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Overall Compliance</span>
                            <div className="mt-1 flex items-baseline gap-2">
                                <span className="text-3xl font-extrabold tracking-tight text-slate-900">{completionRate}%</span>
                                <span className="text-xs font-medium text-slate-500">of total items</span>
                            </div>
                        </div>
                        <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
                            <ShieldCheck size={20} />
                        </div>
                    </div>
                    <div className="mt-3.5">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                                style={{ width: `${completionRate > 0 ? Math.max(completionRate, 2) : 0}%` }}
                            />
                        </div>
                        <div className="mt-1.5 flex justify-between text-[11px] text-slate-500">
                            <span>{complianceSummary.compiledRecords} compliant{complianceSummary.partialRecords > 0 ? ` (${complianceSummary.partialRecords} partial)` : ''}</span>
                            <span>{complianceSummary.totalRecords} total</span>
                        </div>
                    </div>
                </div>

                {/* 2. Monitored Offices */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between">
                        <div>
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Monitored Offices</span>
                            <div className="mt-1 flex items-baseline gap-2">
                                <span className="text-3xl font-extrabold tracking-tight text-slate-900">{officesCount}</span>
                                <span className="text-xs font-medium text-slate-500">units</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                                {academicSummary?.totalAcademic || 0} Academic · {academicSummary?.totalNonAcademic || 0} Non-Academic
                            </p>
                        </div>
                        <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
                            <Building2 size={20} />
                        </div>
                    </div>
                    <div className="mt-3.5 flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="inline-flex items-center gap-1 font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                            {compiledOffices} Done
                        </span>
                        <span className="inline-flex items-center gap-1 font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60" title={`${academicSummary?.academicPartial || 0} Academic, ${academicSummary?.nonAcademicPartial || 0} Non-Academic`}>
                            {partialOffices} Partial
                        </span>
                        <span className="inline-flex items-center gap-1 font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200/60">
                            {notCompiledOffices} Deficient
                        </span>
                    </div>
                </div>

                {/* 3. Active Standards & Events */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between">
                        <div>
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Audit Standards</span>
                            <div className="mt-1 flex items-baseline gap-2">
                                <span className="text-3xl font-extrabold tracking-tight text-slate-900">{events.length}</span>
                                <span className="text-xs font-medium text-slate-500">active events</span>
                            </div>
                        </div>
                        <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
                            <Calendar size={20} />
                        </div>
                    </div>
                    <div className="mt-3.5 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
                        <span>{criteria.length} defined sub areas</span>
                        <Link to="/home/events" className="inline-flex items-center gap-0.5 font-medium text-blue-600 hover:text-blue-700">
                            View <ArrowUpRight size={12} />
                        </Link>
                    </div>
                </div>

                {/* 4. Personnel & Accounts */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between">
                        <div>
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Staff & Users</span>
                            <div className="mt-1 flex items-baseline gap-2">
                                <span className="text-3xl font-extrabold tracking-tight text-slate-900">{users.length}</span>
                                <span className="text-xs font-medium text-slate-500">accounts</span>
                            </div>
                        </div>
                        <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
                            <Users size={20} />
                        </div>
                    </div>
                    <div className="mt-3.5 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
                        <span>{officeHeads.length} assigned office heads</span>
                        <Link to="/home/users" className="inline-flex items-center gap-0.5 font-medium text-blue-600 hover:text-blue-700">
                            Manage <ArrowUpRight size={12} />
                        </Link>
                    </div>
                </div>
            </div>

            {/* ── Operational Visualizers: Status Split & Activity Pulse ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
                {/* Status Distribution (5 cols) */}
                <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-base font-bold text-slate-900">Institutional Compliance Ratio</h2>
                                <p className="text-xs text-slate-500">
                                    Distribution across {academicSummary?.totalAcademic || 0} academic & {academicSummary?.totalNonAcademic || 0} non-academic units
                                </p>
                            </div>
                            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                                {officesCount} Offices
                            </span>
                        </div>

                        <div className="flex items-center gap-6 py-2">
                            {/* Visual Donut Chart */}
                            <div className="relative h-32 w-32 shrink-0 rounded-full shadow-inner" style={donutStyle}>
                                <div className="absolute inset-3 rounded-full bg-white flex flex-col items-center justify-center shadow-sm">
                                    <span className="text-xl font-extrabold tracking-tight text-slate-900">{completionRate}%</span>
                                    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Compliant</span>
                                </div>
                            </div>

                            {/* Legend Breakdown */}
                            <div className="flex-1 space-y-2.5">
                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                                        <span className="font-medium text-slate-700">Fully Complied</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                                        <span>{compiledOffices}</span>
                                        <span className="text-slate-400 text-[11px] font-normal">({compiledOfficePct}%)</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
                                        <span className="font-medium text-slate-700">Partially Complied</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                                        <span>{partialOffices}</span>
                                        <span className="text-slate-400 text-[11px] font-normal">({partialOfficePct}%)</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shrink-0" />
                                        <span className="font-medium text-slate-700">Not Complied</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                                        <span>{notCompiledOffices}</span>
                                        <span className="text-slate-400 text-[11px] font-normal">({notCompiledOfficePct}%)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 border border-slate-100 flex items-center justify-between">
                        <span>Total evaluated requirements: <strong>{complianceSummary.totalRecords}</strong></span>
                        <span className="text-emerald-700 font-semibold">
                            {complianceSummary.compiledRecords} Verified{complianceSummary.partialRecords > 0 ? ` · ${complianceSummary.partialRecords} Partial` : ''}
                        </span>
                    </div>
                </div>

                {/* 7-Day Activity Velocity (7 cols) */}
                <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-base font-bold text-slate-900">Audit Activity Velocity</h2>
                                <p className="text-xs text-slate-500">System actions and submissions over the past 7 days</p>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-200/60">
                                <Activity size={13} className="text-blue-600" />
                                <span className="font-medium text-slate-700">{logs.length}</span>
                                <span>total logged</span>
                            </div>
                        </div>

                        {/* Velocity Bar Chart */}
                        <div className="h-36 pt-2">
                            <div className="flex h-full items-end justify-between gap-3">
                                {activityByDay.map((day) => {
                                    const heightPercent = day.count > 0 ? Math.max((day.count / maxActivityCount) * 100, 14) : 0;
                                    return (
                                        <div key={day.key} className="group relative flex h-full flex-1 flex-col items-center justify-end">
                                            {/* Tooltip on hover */}
                                            <div className="absolute -top-7 hidden group-hover:flex items-center gap-1 rounded bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-white shadow z-20 whitespace-nowrap">
                                                <span>{day.count} actions</span>
                                            </div>

                                            <span className="mb-1.5 text-[11px] font-semibold text-slate-500 transition-colors group-hover:text-blue-600">
                                                {day.count}
                                            </span>

                                            <div className="w-full max-w-[32px] h-20 flex flex-col justify-end rounded-t-md bg-slate-100 transition-all duration-200 overflow-hidden group-hover:bg-blue-100/70">
                                                <div
                                                    className="w-full rounded-t-md bg-blue-600 transition-all duration-300 group-hover:bg-blue-700"
                                                    style={{ height: `${heightPercent}%` }}
                                                />
                                            </div>

                                            <span className="mt-2 text-[11px] font-medium text-slate-500">
                                                {day.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                        <span>Past 7 days volume</span>
                        <Link to="/home/audit-logs" className="font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                            Explore full audit trail <ArrowUpRight size={12} />
                        </Link>
                    </div>
                </div>
            </div>

            {/* ── Active Audit Standards Progress (Clean Card Grid) ── */}
            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">Active Audit Standards Progress</h2>
                        <p className="text-xs text-slate-500">Progress breakdown separated by active compliance event</p>
                    </div>
                    <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded border border-slate-200/60 self-start sm:self-auto">
                        {activeEventProgress.length} Active {activeEventProgress.length === 1 ? 'Standard' : 'Standards'}
                    </span>
                </div>

                {activeEventProgress.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center">
                        <Layers className="mx-auto h-8 w-8 text-slate-300" />
                        <p className="mt-2 text-sm font-medium text-slate-600">No active audit standards found</p>
                        <p className="text-xs text-slate-400 mt-0.5">Create a compliance event in Settings to track progress.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeEventProgress.map((eventItem) => (
                            <div
                                key={eventItem.id}
                                className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 transition hover:border-slate-300 hover:bg-white flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="rounded bg-blue-100/80 px-2 py-0.5 text-xs font-bold text-blue-700 font-mono">
                                                    {eventItem.code && eventItem.code !== '-' ? eventItem.code : `EV-${eventItem.id}`}
                                                </span>
                                                <h3 className="truncate text-sm font-bold text-slate-900">
                                                    {eventItem.name}
                                                </h3>
                                            </div>
                                        </div>
                                        <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-bold text-slate-800">
                                            {eventItem.completionPercent}%
                                        </span>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                                        <div
                                            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                                            style={{ width: `${eventItem.completionPercent > 0 ? Math.max(eventItem.completionPercent, 2) : 0}%` }}
                                        />
                                    </div>

                                    {/* Event Metric Chips */}
                                    <div className="mt-3.5 grid grid-cols-3 gap-2 text-center text-xs">
                                        <div className="rounded-lg border border-slate-200/70 bg-white py-2 px-1">
                                            <span className="block text-[11px] text-slate-400">Offices</span>
                                            <span className="font-bold text-slate-800 text-sm">{eventItem.totalOffices}</span>
                                            <span className="block text-[9px] text-slate-400 truncate">
                                                {eventItem.officeStatus.academicCount || 0} Acad · {eventItem.officeStatus.nonAcademicCount || 0} Non
                                            </span>
                                        </div>
                                        <div className="rounded-lg border border-slate-200/70 bg-white py-2 px-1">
                                            <span className="block text-[11px] text-slate-400">Sub Areas</span>
                                            <span className="font-bold text-slate-800 text-sm">{eventItem.totalCriteria}</span>
                                            <span className="block text-[9px] text-slate-400">Categories</span>
                                        </div>
                                        <div className="rounded-lg border border-slate-200/70 bg-white py-2 px-1">
                                            <span className="block text-[11px] text-slate-400">Requirements</span>
                                            <span className="font-bold text-slate-800 text-sm">{eventItem.totalRequirements}</span>
                                            <span className="block text-[9px] text-slate-400">Standards</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Status Distribution Strip */}
                                <div className="mt-3.5 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
                                    <div className="flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                        <span>{eventItem.officeStatus.compiled} Done</span>
                                    </div>
                                    <div 
                                        className="flex items-center gap-1.5 cursor-help"
                                        title={`${eventItem.officeStatus.academicPartial || 0} Academic Program, ${eventItem.officeStatus.nonAcademicPartial || 0} Non-Academic Office`}
                                    >
                                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                                        <span>{eventItem.officeStatus.partial} Partial</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                                        <span>{eventItem.officeStatus.notCompiled} Deficient</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Comprehensive Compliance Deficiencies & Action Tracker ── */}
            <div className="mb-6">
                <DeficiencyTracker
                    offices={offices}
                    events={events}
                    complianceData={complianceData}
                    onInspectOffice={(office) => {
                        setInspectOffice(office);
                        setIsViewReqModalOpen(true);
                    }}
                    onRefresh={fetchDashboardData}
                    isAdmin={isAdmin}
                />
            </div>

            {/* ── In-place View/Edit Requirements Modal from Dashboard ── */}
            {isViewReqModalOpen && inspectOffice && (
                <ViewReqPasscuModal
                    isOpen={isViewReqModalOpen}
                    onClose={() => {
                        setIsViewReqModalOpen(false);
                        setInspectOffice(null);
                        fetchDashboardData();
                    }}
                    office={inspectOffice}
                />
            )}

            {/* ── Live Audit Activity Feed (Restrained, Scannable) ── */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3.5 flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">Recent Audit Activity</h2>
                        <p className="text-xs text-slate-500">Live feed of compliance updates, audits, and user actions</p>
                    </div>
                    <Link to="/home/audit-logs" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                        View all activity <ArrowUpRight size={13} />
                    </Link>
                </div>

                <div className="divide-y divide-slate-100">
                    {recentLogs.length === 0 ? (
                        <p className="py-6 text-center text-xs text-slate-400">No activity recorded yet.</p>
                    ) : (
                        recentLogs.map((log) => {
                            const action = normalizeAction(log.Action);
                            const badgeClass = statusBadgeStyles[action] || "bg-slate-50 text-slate-700 border-slate-200";
                            const message = String(log.Message || log.Action || "Activity recorded").trim();
                            const actor = log.displayName || log.FullName || (log.UserID ? `User #${log.UserID}` : "System");
                            const timestamp = log.Timestamp
                                ? new Date(log.Timestamp).toLocaleString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })
                                : "";

                            return (
                                <div
                                    key={log.LogID || `${log.Action}-${log.Timestamp}`}
                                    className="flex items-center justify-between gap-4 py-2.5 px-1 hover:bg-slate-50/80 rounded-lg transition"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${badgeClass}`}>
                                            {action}
                                        </span>
                                        <p className="truncate text-xs font-medium text-slate-800">
                                            {message}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0 text-xs text-slate-400">
                                        <span className="hidden sm:inline font-medium text-slate-600">{actor}</span>
                                        <span>{timestamp}</span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
            </div>
        </div>
    );
}
