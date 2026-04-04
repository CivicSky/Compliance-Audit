import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    complianceStatusOfficesAPI,
    usersAPI,
    officesAPI,
    officeHeadsAPI,
    eventsAPI,
    requirementsAPI,
    criteriaAPI,
} from "../../utils/api";
import api from "../../utils/api";
import { Link } from "react-router-dom";
import Header from "../Header/header";
import UnifiedSetupWizard from "../UnifiedSetupWizard/UnifiedSetupWizard";
import {
    Activity,
    Building2,
    ClipboardList,
    FileCheck2,
    Plus,
    ShieldCheck,
    UserRound,
    Users,
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
    Created: "bg-emerald-100 text-emerald-700 border-emerald-300",
    Updated: "bg-blue-100 text-blue-700 border-blue-300",
    Deleted: "bg-rose-100 text-rose-700 border-rose-300",
    Viewed: "bg-amber-100 text-amber-700 border-amber-300",
    Login: "bg-violet-100 text-violet-700 border-violet-300",
    Logout: "bg-slate-100 text-slate-700 border-slate-300",
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

    // Default to admin (show features) until we confirm otherwise
    const isAdmin = !currentUser || currentUser.RoleName === 'admin' || currentUser.RoleID === 1;

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

    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        setError(null);
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
        } catch (err) {
            console.error("Failed to fetch dashboard data:", err);
            setError("Failed to load dashboard data.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);


    const {
        officeMap,
        compiledOffices,
        notCompiledOffices,
        partialOffices,
        officeProgress,
        eventProgress,
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

        for (const office of offices) {
            const officeId = getOfficeId(office);
            if (officeId !== undefined && officeId !== null) {
                officeNameMap[String(officeId)] =
                    getOfficeName(office) || `Office ${officeId}`;
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

        let done = 0;
        let notDone = 0;
        let partial = 0;

        Object.values(byOffice).forEach((statuses) => {
            const allCompiled = statuses.every((s) => s === 5);
            const allNotCompiled = statuses.every((s) => s === 3);
            if (allCompiled) done += 1;
            else if (allNotCompiled) notDone += 1;
            else partial += 1;
        });

        const officeProgressList = Object.entries(byOffice)
            .map(([officeId, statuses]) => {
                const total = statuses.length || 1;
                const compiledCount = statuses.filter((s) => s === 5).length;
                const percent = Math.round((compiledCount / total) * 100);
                return {
                    id: officeId,
                    name: officeNameMap[String(officeId)] || `Office ${officeId}`,
                    percent,
                    compiledCount,
                    total,
                };
            })
            .sort((a, b) => a.percent - b.percent)
            .slice(0, 6);

        const eventProgressList = Object.entries(byEvent)
            .map(([eventId, statuses]) => {
                const total = statuses.length || 1;
                const compiledCount = statuses.filter((s) => s === 5).length;
                const percent = Math.round((compiledCount / total) * 100);
                return {
                    id: eventId,
                    name: eventNameMap[String(eventId)] || `Event ${eventId}`,
                    percent,
                    compiledCount,
                    total,
                };
            })
            .sort((a, b) => b.percent - a.percent)
            .slice(0, 6);

        const activeEvents = events.filter((event) => {
            const eventStatus = String(event?.status || event?.Status || 'active').toLowerCase().trim();
            return eventStatus !== 'inactive';
        });

        const activeEventProgressList = activeEvents.map((event) => {
            const eventId = String(getEventId(event) ?? '');

            const eventOfficeIds = offices
                .filter((office) => String(getOfficeEventId(office) ?? '') === eventId)
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

            const classifyStatusCollection = (statuses) => {
                if (statuses.length === 0) return 'notCompiled';
                const allCompiled = statuses.every((status) => status === 5);
                const allNotCompiled = statuses.every((status) => status === 3);
                if (allCompiled) return 'compiled';
                if (allNotCompiled) return 'notCompiled';
                return 'partial';
            };

            let compiledOfficeCount = 0;
            let partialOfficeCount = 0;
            let notCompiledOfficeCount = 0;

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

            for (const officeId of eventOfficeIds) {
                const statusesForOffice = officeStatusesMap.get(officeId) || [];
                const officeBucket = classifyStatusCollection(statusesForOffice);
                if (officeBucket === 'compiled') compiledOfficeCount += 1;
                else if (officeBucket === 'partial') partialOfficeCount += 1;
                else notCompiledOfficeCount += 1;
            }

            let compiledRequirements = 0;
            let partialRequirements = 0;
            let notCompiledRequirements = 0;

            for (const row of rowsForEvent) {
                const status = Number(getComplianceStatus(row));
                if (status === 5) compiledRequirements += 1;
                else if (status === 3) notCompiledRequirements += 1;
                else partialRequirements += 1;
            }

            const totalOfficesForEvent = eventOfficeIds.length;
            const completionPercent = totalOfficesForEvent > 0
                ? Math.round((compiledOfficeCount / totalOfficesForEvent) * 100)
                : 0;

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
        const notCompiledRecords = complianceData.filter((item) => Number(item?.Status) === 3).length;
        const partialRecords = Math.max(totalRecords - compiledRecords - notCompiledRecords, 0);
        const completion = totalRecords > 0 ? Math.round((compiledRecords / totalRecords) * 100) : 0;

        return {
            officeMap: byOffice,
            compiledOffices: done,
            notCompiledOffices: notDone,
            partialOffices: partial,
            officeProgress: officeProgressList,
            eventProgress: eventProgressList,
            activeEventProgress: activeEventProgressList,
            complianceSummary: {
                totalRecords,
                compiledRecords,
                notCompiledRecords,
                partialRecords,
            },
            completionRate: completion,
        };
    }, [complianceData, offices, events, criteria, requirements]);

    const officesCount = Math.max(offices.length, Object.keys(officeMap).length);

    const recentLogs = useMemo(() => logs.slice(0, 8), [logs]);

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

    const donutStyle = useMemo(() => {
        const total = compiledOffices + partialOffices + notCompiledOffices;
        if (total === 0) {
            return { background: "conic-gradient(#e5e7eb 0deg 360deg)" };
        }

        const compiledDeg = (compiledOffices / total) * 360;
        const partialDeg = (partialOffices / total) * 360;
        const notCompiledDeg = 360 - compiledDeg - partialDeg;

        return {
            background: `conic-gradient(
                #16a34a 0deg ${compiledDeg}deg,
                #f59e0b ${compiledDeg}deg ${compiledDeg + partialDeg}deg,
                #dc2626 ${compiledDeg + partialDeg}deg ${compiledDeg + partialDeg + notCompiledDeg}deg
            )`,
        };
    }, [compiledOffices, partialOffices, notCompiledOffices]);

    const dashboardCards = [
        { title: "Total Offices", value: officesCount, subtitle: "Managed units", Icon: Building2, tone: "text-sky-600" },
        { title: "Office Personnel", value: officeHeads.length, subtitle: "Assigned heads", Icon: UserRound, tone: "text-indigo-600" },
        { title: "Users", value: users.length, subtitle: "Registered accounts", Icon: Users, tone: "text-violet-600" },
        { title: "Events", value: events.length, subtitle: "Active standards", Icon: ShieldCheck, tone: "text-emerald-600" },
        { title: "Criteria", value: criteria.length, subtitle: "Across all events", Icon: ClipboardList, tone: "text-amber-600" },
        { title: "Requirements", value: requirements.length, subtitle: "Total compliance items", Icon: FileCheck2, tone: "text-rose-600" },
    ];

    if (loading) return <div className="p-6">Loading dashboard...</div>;
    if (error) return <div className="p-6 text-red-600">{error}</div>;

    return (
        <div className="h-screen w-full flex flex-col overflow-hidden">
            <Header pageTitle="Dashboard" />

            <div className="flex-1 overflow-y-auto px-4 pb-6 pt-6">
                <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-800 mb-2">Dashboard Overview</h1>
                        <p className="text-gray-600">Monitor operational health, compliance progress, and recent activity in one place.</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
                            <p className="text-xs text-slate-500">Completion Rate</p>
                            <p className="text-lg font-semibold text-slate-800">{completionRate}%</p>
                        </div>

                {isAdmin && (
                            <button
                                onClick={() => setShowWizard(true)}
                                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-5 py-3 font-semibold text-white shadow-md transition hover:from-emerald-700 hover:to-emerald-800"
                            >
                                <Plus size={18} /> Quick Setup
                            </button>
                )}
                    </div>
            </div>

            <UnifiedSetupWizard 
                isOpen={showWizard} 
                onClose={() => setShowWizard(false)}
                        onSuccess={fetchDashboardData}
            />

            <div className="relative z-10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {dashboardCards.map(({ title, value, subtitle, Icon, tone }) => (
                            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-slate-600">{title}</p>
                                        <p className="mt-1 text-3xl font-bold text-slate-800">{value}</p>
                                        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
                                    </div>
                                    <div className="rounded-xl bg-slate-100 p-2">
                                        <Icon size={18} className={tone} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-slate-800">Office Compliance Split</h2>
                                <span className="text-xs text-slate-500">By office</span>
                            </div>

                            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="relative h-40 w-40 rounded-full" style={donutStyle}>
                                    <div className="absolute inset-4 rounded-full bg-white flex flex-col items-center justify-center border border-slate-100">
                                        <span className="text-xs text-slate-500">Compiled</span>
                                        <span className="text-2xl font-bold text-slate-800">{completionRate}%</span>
                                    </div>
                                </div>

                                <div className="w-full sm:w-[52%] space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />Compiled</span>
                                        <span className="font-semibold text-slate-800">{compiledOffices}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" />Partial</span>
                                        <span className="font-semibold text-slate-800">{partialOffices}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 rounded-full bg-rose-600" />Not Compiled</span>
                                        <span className="font-semibold text-slate-800">{notCompiledOffices}</span>
                                    </div>
                                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                                        {complianceSummary.compiledRecords} compiled record(s), {complianceSummary.partialRecords} partial record(s), and {complianceSummary.notCompiledRecords} not compiled record(s).
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-slate-800">7-Day Activity Trend</h2>
                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                    <Activity size={14} /> {logs.length} total log(s)
                                </div>
                            </div>

                            <div className="h-44">
                                <div className="flex h-full items-end justify-between gap-2">
                                    {activityByDay.map((day) => {
                                        const heightPercent = Math.max((day.count / maxActivityCount) * 100, day.count > 0 ? 10 : 4);
                                        return (
                                            <div key={day.key} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                                                <div className="text-[11px] font-medium text-slate-500">{day.count}</div>
                                                <div className="w-full rounded-t-md bg-gradient-to-t from-cyan-600 to-sky-400 transition-all duration-300" style={{ height: `${heightPercent}%` }} />
                                                <div className="text-[11px] text-slate-500">{day.label}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-2xl font-semibold text-slate-800">Active Events Compliance Progress</h2>
                            <span className="text-xs text-slate-500">Separated by event</span>
                        </div>

                        {activeEventProgress.length === 0 ? (
                            <p className="text-sm text-slate-500">No active events with compliance data yet.</p>
                        ) : (
                            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                                {activeEventProgress.map((eventItem) => (
                                    <div key={eventItem.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                                        <div className="mb-3 flex items-start justify-between gap-3">
                                            <div>
                                                <h3 className="text-[30px] font-bold leading-none text-slate-900">{eventItem.name}</h3>
                                                <p className="mt-1 text-sm text-slate-600">Code: {eventItem.code}</p>
                                            </div>
                                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xl font-semibold text-slate-700">
                                                {eventItem.completionPercent}%
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                                            <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                                                <p className="text-xs text-slate-500">Total Offices</p>
                                                <p className="text-lg font-bold text-slate-900">{eventItem.totalOffices}</p>
                                            </div>
                                            <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                                                <p className="text-xs text-slate-500">Total Events</p>
                                                <p className="text-lg font-bold text-slate-900">{eventItem.totalEvents}</p>
                                            </div>
                                            <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                                                <p className="text-xs text-slate-500">Total Criteria</p>
                                                <p className="text-lg font-bold text-slate-900">{eventItem.totalCriteria}</p>
                                            </div>
                                            <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                                                <p className="text-xs text-slate-500">Total Requirements</p>
                                                <p className="text-lg font-bold text-slate-900">{eventItem.totalRequirements}</p>
                                            </div>
                                        </div>

                                        <div className="mt-3 h-3 rounded-full bg-slate-200">
                                            <div className="h-3 rounded-full bg-emerald-600 transition-all" style={{ width: `${eventItem.completionPercent}%` }} />
                                        </div>

                                        <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
                                            <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                                                <p className="mb-1 text-xs font-medium text-slate-600">Office Status</p>
                                                <div className="space-y-1 text-sm">
                                                    <div className="flex items-center justify-between">
                                                        <span className="flex items-center gap-2 text-slate-700"><span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />Compiled</span>
                                                        <span className="font-semibold text-slate-900">{eventItem.officeStatus.compiled}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="flex items-center gap-2 text-slate-700"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" />Partial</span>
                                                        <span className="font-semibold text-slate-900">{eventItem.officeStatus.partial}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="flex items-center gap-2 text-slate-700"><span className="h-2.5 w-2.5 rounded-full bg-rose-600" />Not Compiled</span>
                                                        <span className="font-semibold text-slate-900">{eventItem.officeStatus.notCompiled}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                                                <p className="mb-1 text-xs font-medium text-slate-600">Requirement Status</p>
                                                <div className="space-y-1 text-sm">
                                                    <div className="flex items-center justify-between">
                                                        <span className="flex items-center gap-2 text-slate-700"><span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />Compiled</span>
                                                        <span className="font-semibold text-slate-900">{eventItem.requirementStatus.compiled}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="flex items-center gap-2 text-slate-700"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" />Partial</span>
                                                        <span className="font-semibold text-slate-900">{eventItem.requirementStatus.partial}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="flex items-center gap-2 text-slate-700"><span className="h-2.5 w-2.5 rounded-full bg-rose-600" />Not Compiled</span>
                                                        <span className="font-semibold text-slate-900">{eventItem.requirementStatus.notCompiled}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="mb-4 text-lg font-semibold text-slate-800">Offices Needing Attention</h2>
                        <div className="space-y-3">
                            {officeProgress.length === 0 ? (
                                <p className="text-sm text-slate-500">No office compliance data yet.</p>
                            ) : (
                                officeProgress.map((officeItem) => (
                                    <div key={officeItem.id} className="rounded-xl border border-slate-200 p-3">
                                        <div className="mb-1 flex items-center justify-between text-sm">
                                            <p className="font-medium text-slate-700 truncate pr-3">{officeItem.name}</p>
                                            <span className="text-slate-600">{officeItem.percent}%</span>
                                        </div>
                                        <div className="h-2.5 rounded-full bg-slate-100">
                                            <div
                                                className={`h-2.5 rounded-full ${officeItem.percent >= 80 ? "bg-emerald-600" : officeItem.percent >= 50 ? "bg-amber-500" : "bg-rose-600"}`}
                                                style={{ width: `${officeItem.percent}%` }}
                                            />
                                        </div>
                                        <p className="mt-1 text-xs text-slate-500">{officeItem.compiledCount} of {officeItem.total} requirement(s) compiled</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <h2 className="text-lg font-semibold text-slate-800">Recent Activity Feed</h2>
                            <Link to="/home/audit-logs" className="text-sm font-medium text-cyan-700 hover:text-cyan-800">
                                View all logs
                            </Link>
                        </div>

                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                            {recentLogs.length === 0 ? (
                                <p className="text-sm text-slate-500">No recent logs found.</p>
                            ) : (
                                recentLogs.map((log) => {
                                    const action = normalizeAction(log.Action);
                                    const badgeClass = statusBadgeStyles[action] || "bg-slate-100 text-slate-700 border-slate-300";
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
                                        <div key={log.LogID || `${log.Action}-${log.Timestamp}`} className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badgeClass}`}>{action}</span>
                                                    <p className="truncate text-sm font-medium text-slate-700">{message}</p>
                                                </div>
                                                <p className="mt-1 text-xs text-slate-500">By {actor}</p>
                                            </div>
                                            <div className="shrink-0 text-xs text-slate-500">{timestamp}</div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}



