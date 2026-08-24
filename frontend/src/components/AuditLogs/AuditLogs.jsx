import { useEffect, useMemo, useState } from "react";
import Pagination from "../Pagination/Pagination";
import Header from "../Header/header";
import { CardListSkeleton } from "../UI/Skeleton";

export default function AuditLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setloading] = useState(true);

    // Comprehensive Lookups
    const [eventLookup, setEventLookup] = useState({});
    const [areaLookup, setAreaLookup] = useState({});
    const [criteriaLookup, setCriteriaLookup] = useState({});
    const [requirementLookup, setRequirementLookup] = useState({});
    const [officeLookup, setOfficeLookup] = useState({});
    const [userLookup, setUserLookup] = useState({});

    const [searchTerm, setSearchTerm] = useState("");
    const [actionFilter, setActionFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [expandedLogId, setExpandedLogId] = useState(null);
    const itemsPerPage = 8;

    const actionStyles = {
        Created: {
            badge: "bg-emerald-100/90 text-emerald-800 border-emerald-300/80",
            iconBg: "bg-emerald-500 text-white",
            icon: (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
            )
        },
        Updated: {
            badge: "bg-indigo-100/90 text-indigo-800 border-indigo-300/80",
            iconBg: "bg-indigo-500 text-white",
            icon: (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                </svg>
            )
        },
        Deleted: {
            badge: "bg-rose-100/90 text-rose-800 border-rose-300/80",
            iconBg: "bg-rose-500 text-white",
            icon: (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
            )
        },
        Viewed: {
            badge: "bg-sky-100/90 text-sky-800 border-sky-300/80",
            iconBg: "bg-sky-500 text-white",
            icon: (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            )
        },
        Login: {
            badge: "bg-violet-100/90 text-violet-800 border-violet-300/80",
            iconBg: "bg-violet-500 text-white",
            icon: (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l3 3m0 0l-3 3m3-3H2.25" />
                </svg>
            )
        },
        Logout: {
            badge: "bg-amber-100/90 text-amber-800 border-amber-300/80",
            iconBg: "bg-amber-500 text-white",
            icon: (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
            )
        },
        default: {
            badge: "bg-slate-100 text-slate-800 border-slate-300",
            iconBg: "bg-slate-500 text-white",
            icon: (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        }
    };

    const verbToCrud = {
        POST: "Created",
        PUT: "Updated",
        PATCH: "Updated",
        DELETE: "Deleted",
        GET: "Viewed",
    };

    const toTitle = (value) => {
        return String(value || "")
            .replace(/([a-z])([A-Z])/g, "$1 $2")
            .replace(/[._-]+/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .replace(/\b\w/g, (c) => c.toUpperCase());
    };

    const toArrayPayload = (payload) => {
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload?.data)) return payload.data;
        if (Array.isArray(payload?.events)) return payload.events;
        if (Array.isArray(payload?.areas)) return payload.areas;
        if (Array.isArray(payload?.criteria)) return payload.criteria;
        if (Array.isArray(payload?.requirements)) return payload.requirements;
        if (Array.isArray(payload?.offices)) return payload.offices;
        if (Array.isArray(payload?.logs)) return payload.logs;
        return [];
    };

    const tryParseJson = (value) => {
        if (!value || typeof value !== "string") return null;
        const trimmed = value.trim();
        if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return null;
        try {
            return JSON.parse(trimmed);
        } catch {
            return null;
        }
    };

    const roleIdToName = (value) => {
        const normalized = String(value ?? "").trim().toLowerCase();
        if (!normalized) return "";
        if (normalized === "1" || normalized === "admin") return "Admin";
        if (normalized === "2" || normalized === "user") return "User";
        return toTitle(normalized);
    };

    const normalizeActionLabel = (rawAction) => {
        const action = String(rawAction || "").trim();
        const httpMatch = action.match(/^(GET|POST|PUT|PATCH|DELETE)\s+/i);
        if (httpMatch) return verbToCrud[httpMatch[1].toUpperCase()] || "Updated";

        if (/login/i.test(action)) return "Login";
        if (/logout/i.test(action)) return "Logout";
        if (/(added|created|registered|copied)$/i.test(action)) return "Created";
        if (/(updated|relocated)$/i.test(action)) return "Updated";
        if (/(deleted|canceled|cancelled|removed)$/i.test(action)) return "Deleted";

        return "Updated";
    };

    // Deep context resolver walking up the accreditation tree
    const resolveLogContext = (log) => {
        const detailsSource = log.DetailsParsed || tryParseJson(log.Details) || null;
        const d = detailsSource && typeof detailsSource === "object"
            ? (detailsSource.body && typeof detailsSource.body === "object" ? detailsSource.body : detailsSource)
            : {};

        // 1. Office / Program
        const officeId = d.OfficeID || d.officeId;
        const officeObj = officeId ? officeLookup[String(officeId)] : null;
        const officeName = d.OfficeName || d.officeName || d.office_name || d.OfficeCode || officeObj?.OfficeName || officeObj?.OfficeCode || "";

        // 2. Requirement
        const reqId = d.RequirementID || d.requirementId;
        const reqObj = reqId ? requirementLookup[String(reqId)] : null;
        const reqCode = d.RequirementCode || d.requirementCode || reqObj?.RequirementCode || (reqId ? `REQ-${reqId}` : "");
        const reqDesc = d.RequirementDescription || d.Description || d.description || reqObj?.Description || "";

        // 3. Criteria
        const critId = d.CriteriaID || d.criteriaId || reqObj?.CriteriaID;
        const critObj = critId ? criteriaLookup[String(critId)] : null;
        const critCode = d.CriteriaCode || d.criteriaCode || critObj?.CriteriaCode || "";
        const critName = d.CriteriaName || d.criteriaName || critObj?.CriteriaName || "";
        const critLabel = critCode && critName ? `${critCode}. ${critName}` : (critCode || critName);

        // 4. Area
        const areaId = d.AreaID || d.areaId || critObj?.AreaID;
        const areaObj = areaId ? areaLookup[String(areaId)] : null;
        const areaName = d.AreaName || d.areaName || areaObj?.AreaName || "";

        // 5. Accreditation Event
        const eventId = d.EventID || d.eventId || areaObj?.EventID || officeObj?.EventID;
        const eventObj = eventId ? eventLookup[String(eventId)] : null;
        const eventName = d.EventName || d.eventName || eventObj?.EventName || (typeof eventObj === 'string' ? eventObj : "");

        // 6. Evidence File
        const fileName = d.DisplayName || d.displayName || d.FileName || d.fileName || d.file_name || "";

        // 7. Target User
        const targetUserId = d.userId || d.UserID || d.targetUserId || d.TargetUserID;
        const targetUserName = d.userName || d.FullName || (targetUserId ? userLookup[String(targetUserId)] : "");

        return {
            officeName,
            reqCode,
            reqDesc,
            critLabel,
            areaName,
            eventName,
            fileName,
            targetUserName,
            reqIds: d.requirementIds || d.RequirementIDs,
            rawDetails: d
        };
    };

    const buildInDepthMessage = (log, actionLabel, ctx) => {
        const rawAction = String(log.Action || "").trim();

        if (actionLabel === "Login") return "User logged in to Compliance Portal";
        if (actionLabel === "Logout") return "User logged out of Compliance Portal";

        // 1. File Upload
        if (/RequirementFileUploaded|Upload/i.test(rawAction)) {
            let msg = `Uploaded evidence file ${ctx.fileName ? `"${ctx.fileName}"` : 'document'}`;
            if (ctx.reqCode) msg += ` for Requirement ${ctx.reqCode}`;
            if (ctx.officeName) msg += ` in ${ctx.officeName}`;
            if (ctx.eventName) msg += ` under "${ctx.eventName}"`;
            return msg;
        }

        // 2. File Delete / Unsubmit
        if (/RequirementFileDeleted|Unsubmit/i.test(rawAction)) {
            let msg = `Removed evidence file ${ctx.fileName ? `"${ctx.fileName}"` : 'document'}`;
            if (ctx.reqCode) msg += ` from Requirement ${ctx.reqCode}`;
            if (ctx.officeName) msg += ` in ${ctx.officeName}`;
            return msg;
        }

        // 3. Requirement Added
        if (/RequirementAdded|Requirement/i.test(rawAction) && actionLabel === "Created") {
            let msg = `Created Requirement ${ctx.reqCode ? ctx.reqCode : ''}`;
            if (ctx.reqDesc) msg += ` ("${ctx.reqDesc}")`;
            if (ctx.critLabel) msg += ` under Criteria ${ctx.critLabel}`;
            if (ctx.areaName) msg += ` in ${ctx.areaName}`;
            if (ctx.eventName) msg += ` — "${ctx.eventName}"`;
            return msg;
        }

        // 4. Criteria Added
        if (/CriteriaAdded|Criteria/i.test(rawAction) && actionLabel === "Created") {
            let msg = `Created Criteria ${ctx.critLabel ? `"${ctx.critLabel}"` : ''}`;
            if (ctx.areaName) msg += ` under ${ctx.areaName}`;
            if (ctx.eventName) msg += ` — "${ctx.eventName}"`;
            return msg;
        }

        // 5. Area Added
        if (/AreaAdded|Area/i.test(rawAction) && actionLabel === "Created") {
            let msg = `Created Area ${ctx.areaName ? `"${ctx.areaName}"` : ''}`;
            if (ctx.eventName) msg += ` under "${ctx.eventName}"`;
            return msg;
        }

        // 6. Office / Program Created or Assigned
        if (/OfficeAdded|Created Office|Office/i.test(rawAction)) {
            let msg = `${actionLabel} Office/Program ${ctx.officeName ? `"${ctx.officeName}"` : ''}`;
            if (ctx.eventName) msg += ` under "${ctx.eventName}"`;
            if (Array.isArray(ctx.reqIds)) {
                msg += ` (${ctx.reqIds.length} requirement${ctx.reqIds.length === 1 ? '' : 's'} assigned)`;
            }
            return msg;
        }

        // 7. Accreditation Event
        if (/EventAdded|Event/i.test(rawAction)) {
            return `${actionLabel} Accreditation Event ${ctx.eventName ? `"${ctx.eventName}"` : ''}`;
        }

        // 8. User Updates
        if (/UserRoleUpdated|UserApprovalUpdated|UserUpdated|User/i.test(rawAction)) {
            return `Updated User ${ctx.targetUserName ? `"${ctx.targetUserName}"` : ''}`;
        }

        // Fallback
        const existingMessage = String(log.Message || "").trim();
        if (existingMessage && !/^(GET|POST|PUT|PATCH|DELETE)\s+\//i.test(existingMessage) && !/\/api\//i.test(existingMessage)) {
            return existingMessage;
        }

        let fallback = `${actionLabel} Record`;
        if (ctx.officeName) fallback += ` for ${ctx.officeName}`;
        if (ctx.reqCode) fallback += ` (${ctx.reqCode})`;
        if (ctx.eventName) fallback += ` under "${ctx.eventName}"`;
        return fallback;
    };

    const preparedLogs = useMemo(() => {
        return logs.map((log) => {
            const normalizedAction = normalizeActionLabel(log.Action);
            const ctx = resolveLogContext(log);
            return {
                ...log,
                normalizedAction,
                context: ctx,
                readableMessage: buildInDepthMessage(log, normalizedAction, ctx),
            };
        });
    }, [logs, eventLookup, areaLookup, criteriaLookup, requirementLookup, officeLookup, userLookup]);

    const filteredLogs = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        return preparedLogs.filter((log) => {
            const matchesAction = actionFilter === "all" || log.normalizedAction === actionFilter;
            if (!matchesAction) return false;
            if (!q) return true;

            const c = log.context;
            const haystack = [
                log.readableMessage,
                log.normalizedAction,
                log.displayName,
                log.RoleName,
                c.officeName,
                c.reqCode,
                c.reqDesc,
                c.critLabel,
                c.areaName,
                c.eventName,
                c.fileName,
                log.Details,
            ]
                .map((v) => String(v || "").toLowerCase())
                .join(" ");

            return haystack.includes(q);
        });
    }, [preparedLogs, searchTerm, actionFilter]);

    const [serverTotalPages, setServerTotalPages] = useState(1);
    const [serverTotalCount, setServerTotalCount] = useState(0);

    const stats = useMemo(() => {
        let created = 0, updated = 0, deleted = 0, auth = 0;
        preparedLogs.forEach(l => {
            if (l.normalizedAction === 'Created') created++;
            else if (l.normalizedAction === 'Updated') updated++;
            else if (l.normalizedAction === 'Deleted') deleted++;
            else if (['Login', 'Logout'].includes(l.normalizedAction)) auth++;
        });
        return { total: serverTotalCount || preparedLogs.length, created, updated, deletedAndAuth: deleted + auth };
    }, [preparedLogs, serverTotalCount]);

    const totalPages = serverTotalPages;
    const visibleLogs = filteredLogs;

    const clearControls = () => {
        setSearchTerm("");
        setActionFilter("all");
    };

    // Fetch Logs on Demand when currentPage changes
    useEffect(() => {
        const fetchLogs = async () => {
            setloading(true);
            try {
                const res = await fetch(`/api/logs?page=${currentPage}&limit=${itemsPerPage}`);
                if (!res.ok) throw new Error("Failed to fetch logs");
                const data = await res.json();
                const logsArr = data.logs || [];
                setLogs(logsArr);
                if (data.totalPages) setServerTotalPages(data.totalPages);
                if (data.total !== undefined) setServerTotalCount(data.total);
            } catch (err) {
                console.error("Failed to load audit logs:", err);
            } finally {
                setloading(false);
            }
        };
        fetchLogs();
    }, [currentPage]);

    // Fetch All Tree Lookups in Parallel
    useEffect(() => {
        const fetchLookups = async () => {
            try {
                const [eventsRes, areasRes, criteriaRes, reqsRes, officesRes, usersRes] = await Promise.all([
                    fetch("/api/events").catch(() => null),
                    fetch("/api/areas").catch(() => null),
                    fetch("/api/criteria").catch(() => null),
                    fetch("/api/requirements").catch(() => null),
                    fetch("/api/offices").catch(() => null),
                    fetch("/api/user").catch(() => null)
                ]);

                // 1. Events
                if (eventsRes?.ok) {
                    const payload = await eventsRes.json();
                    const arr = toArrayPayload(payload);
                    const map = {};
                    for (const item of arr) {
                        if (item?.EventID != null) {
                            map[String(item.EventID)] = {
                                EventName: item.EventName || "",
                                EventCode: item.EventCode || "",
                                Year: item.Year || ""
                            };
                        }
                    }
                    setEventLookup(map);
                }

                // 2. Areas
                if (areasRes?.ok) {
                    const payload = await areasRes.json();
                    const arr = toArrayPayload(payload);
                    const map = {};
                    for (const item of arr) {
                        if (item?.AreaID != null) {
                            map[String(item.AreaID)] = {
                                AreaName: item.AreaName || "",
                                EventID: item.EventID || null
                            };
                        }
                    }
                    setAreaLookup(map);
                }

                // 3. Criteria
                if (criteriaRes?.ok) {
                    const payload = await criteriaRes.json();
                    const arr = toArrayPayload(payload);
                    const map = {};
                    for (const item of arr) {
                        if (item?.CriteriaID != null) {
                            map[String(item.CriteriaID)] = {
                                CriteriaCode: item.CriteriaCode || "",
                                CriteriaName: item.CriteriaName || "",
                                AreaID: item.AreaID || null
                            };
                        }
                    }
                    setCriteriaLookup(map);
                }

                // 4. Requirements
                if (reqsRes?.ok) {
                    const payload = await reqsRes.json();
                    const arr = toArrayPayload(payload);
                    const map = {};
                    for (const item of arr) {
                        if (item?.RequirementID != null) {
                            map[String(item.RequirementID)] = {
                                RequirementCode: item.RequirementCode || "",
                                Description: item.Description || "",
                                CriteriaID: item.CriteriaID || null
                            };
                        }
                    }
                    setRequirementLookup(map);
                }

                // 5. Offices
                if (officesRes?.ok) {
                    const payload = await officesRes.json();
                    const arr = toArrayPayload(payload);
                    const map = {};
                    for (const item of arr) {
                        if (item?.OfficeID != null) {
                            map[String(item.OfficeID)] = {
                                OfficeName: item.OfficeName || "",
                                OfficeCode: item.OfficeCode || "",
                                EventID: item.EventID || null
                            };
                        }
                    }
                    setOfficeLookup(map);
                }

                // 6. Users
                if (usersRes?.ok) {
                    const payload = await usersRes.json();
                    const arr = toArrayPayload(payload?.users ? { data: payload.users } : payload);
                    const map = {};
                    for (const u of arr) {
                        if (u?.UserID != null) {
                            const name = String(
                                u.FullName ||
                                `${u.FirstName || ""}${u.MiddleInitial ? ` ${u.MiddleInitial}.` : ""} ${u.LastName || ""}`
                            ).replace(/\s+/g, " ").trim();
                            map[String(u.UserID)] = name || u.Email || "User";
                        }
                    }
                    setUserLookup(map);
                }
            } catch (err) {
                console.error("Failed to load audit lookups:", err);
            }
        };

        fetchLookups();
    }, []);

    useEffect(() => {
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prevOverflow;
        };
    }, []);

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return { time: "", date: "" };
        const d = new Date(timestamp);
        const time = d.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
        const date = d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
        return { time, date };
    };



    return (
        <div className="w-full min-h-[calc(100vh-80px)] flex flex-col bg-slate-50/80">
            <div className="px-4 pt-6 pb-20 flex-1 flex flex-col gap-4 min-h-0">
                {/* Header Title & Quick Stat Cards */}
                <div className="flex flex-col gap-3 shrink-0">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800 mb-1">Audit Logs</h1>
                            <p className="text-xs text-gray-600">Track system activity, updates, and account actions in detail.</p>
                        </div>
                    </div>

                    {/* Summary Stat Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs flex items-center justify-between">
                            <div>
                                <p className="text-[11px] font-semibold text-slate-500">Total Activity</p>
                                <p className="text-xl font-bold text-slate-900 mt-0.5">{stats.total}</p>
                            </div>
                            <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                                📋
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs flex items-center justify-between">
                            <div>
                                <p className="text-[11px] font-semibold text-slate-500 font-medium">Created Records</p>
                                <p className="text-xl font-bold text-emerald-600 mt-0.5">{stats.created}</p>
                            </div>
                            <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
                                ➕
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs flex items-center justify-between">
                            <div>
                                <p className="text-[11px] font-semibold text-slate-500">Updated Records</p>
                                <p className="text-xl font-bold text-indigo-600 mt-0.5">{stats.updated}</p>
                            </div>
                            <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                                ✏️
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs flex items-center justify-between">
                            <div>
                                <p className="text-[11px] font-semibold text-slate-500">Security & Deletions</p>
                                <p className="text-xl font-bold text-rose-600 mt-0.5">{stats.deletedAndAuth}</p>
                            </div>
                            <div className="h-9 w-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-sm">
                                🛡️
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Card Container — flex-1 so it fills all remaining vertical space down to pagination */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 flex flex-col overflow-hidden flex-1 min-h-0">
                    {/* Filter Toolbar */}
                    <div className="p-4 border-b border-slate-200/90 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
                        <div className="flex items-center gap-2">
                            <h2 className="text-base font-bold text-slate-900">Activity History</h2>
                            <span className="rounded-full bg-slate-200/70 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                                {filteredLogs.length} item(s)
                            </span>
                        </div>

                        <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                            {/* Search Input */}
                            <div className="relative w-full max-w-sm">
                                <svg
                                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search accreditation, requirement, area, office, or user..."
                                    className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-xs font-medium text-slate-800 shadow-2xs transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchTerm("")}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            {/* Action Filter Dropdown */}
                            <select
                                value={actionFilter}
                                onChange={(e) => setActionFilter(e.target.value)}
                                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                            >
                                <option value="all">All Actions</option>
                                <option value="Created">Created</option>
                                <option value="Updated">Updated</option>
                                <option value="Deleted">Deleted</option>
                                <option value="Viewed">Viewed</option>
                                <option value="Login">Login</option>
                                <option value="Logout">Logout</option>
                            </select>

                            {/* Reset Controls Button */}
                            {(searchTerm || actionFilter !== "all") && (
                                <button
                                    onClick={clearControls}
                                    title="Clear All Filters"
                                    className="flex h-9 px-3 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-100 transition shadow-2xs"
                                >
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex-1 overflow-y-auto">
                            <CardListSkeleton count={8} />
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3 text-lg">
                                🔍
                            </div>
                            <p className="text-sm font-bold text-slate-700">No activity logs found</p>
                            <p className="text-xs text-slate-400 mt-1 max-w-xs">
                                {logs.length === 0 ? 'No activity logs have been recorded in the database yet.' : 'No logs matching your search term or action filter.'}
                            </p>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-0 [contain:content]">
                            {visibleLogs.map((log) => {
                                const action = log.normalizedAction;
                                const style = actionStyles[action] || actionStyles.default;
                                const readableMessage = log.readableMessage;
                                const { time, date } = formatTimestamp(log.Timestamp);
                                const isExpanded = expandedLogId === log.LogID;
                                const userDisplayName = log.displayName || (log.UserID ? `User #${log.UserID}` : 'System');
                                const roleLabel = log.RoleName ? roleIdToName(log.RoleName) : '';
                                const ctx = log.context;

                                return (
                                    <div
                                        key={log.LogID}
                                        className="group transition-colors hover:bg-slate-50/80"
                                    >
                                        <div
                                            className="flex items-center justify-between px-5 py-3.5 text-xs cursor-pointer gap-4"
                                            onClick={() => setExpandedLogId(prev => prev === log.LogID ? null : log.LogID)}
                                        >
                                            {/* Left: Icon + Action Badge + Message */}
                                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                                <div className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center shadow-2xs ${style.iconBg}`}>
                                                    {style.icon}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${style.badge}`}>
                                                            {action}
                                                        </span>
                                                        <p className="text-xs font-bold text-slate-900 truncate">
                                                            {readableMessage}
                                                        </p>
                                                    </div>

                                                    <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                                                        <span>By <strong className="text-slate-700">{userDisplayName}</strong></span>
                                                        {roleLabel && (
                                                            <>
                                                                <span>•</span>
                                                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{roleLabel}</span>
                                                            </>
                                                        )}
                                                        {ctx.eventName && (
                                                            <>
                                                                <span>•</span>
                                                                <span className="text-blue-600 font-semibold truncate max-w-[200px]" title={ctx.eventName}>
                                                                    🎯 {ctx.eventName}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right: Timestamp & Details Toggle */}
                                            <div className="flex items-center gap-3 shrink-0">
                                                <div className="text-right text-[11px] text-slate-500 font-medium leading-tight">
                                                    <div className="font-bold text-slate-700">{time}</div>
                                                    <div className="text-slate-400 text-[10px] mt-0.5">{date}</div>
                                                </div>
                                                <div className="text-slate-400 group-hover:text-slate-600 transition-colors">
                                                    <svg
                                                        className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-blue-600' : ''}`}
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                        strokeWidth={2}
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Rich In-Depth Context Card (Tree Labeled Pills) */}
                                        {isExpanded && (
                                            <div className="px-5 py-4 bg-slate-50/90 border-t border-slate-100 text-xs text-slate-700 transition-all animate-in fade-in duration-150">
                                                <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                    <span>Detailed Activity Breakdown (Log ID #{log.LogID})</span>
                                                    <span>Action: {log.Action}</span>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                    {ctx.eventName && (
                                                        <div className="rounded-xl border border-blue-200/80 bg-white p-3 shadow-2xs">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1">
                                                                🎯 Accreditation Event
                                                            </span>
                                                            <span className="text-xs font-bold text-slate-900 mt-1 block">{ctx.eventName}</span>
                                                        </div>
                                                    )}

                                                    {ctx.areaName && (
                                                        <div className="rounded-xl border border-indigo-200/80 bg-white p-3 shadow-2xs">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1">
                                                                📁 Area
                                                            </span>
                                                            <span className="text-xs font-bold text-slate-900 mt-1 block">{ctx.areaName}</span>
                                                        </div>
                                                    )}

                                                    {ctx.critLabel && (
                                                        <div className="rounded-xl border border-purple-200/80 bg-white p-3 shadow-2xs">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 flex items-center gap-1">
                                                                📋 Criteria
                                                            </span>
                                                            <span className="text-xs font-bold text-slate-900 mt-1 block">{ctx.critLabel}</span>
                                                        </div>
                                                    )}

                                                    {(ctx.reqCode || ctx.reqDesc) && (
                                                        <div className="rounded-xl border border-sky-200/80 bg-white p-3 shadow-2xs">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 flex items-center gap-1">
                                                                📄 Requirement
                                                            </span>
                                                            <span className="text-xs font-bold text-slate-900 mt-1 block">
                                                                {ctx.reqCode} {ctx.reqDesc ? `— ${ctx.reqDesc}` : ''}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {ctx.officeName && (
                                                        <div className="rounded-xl border border-emerald-200/80 bg-white p-3 shadow-2xs">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1">
                                                                🏢 Office / Program
                                                            </span>
                                                            <span className="text-xs font-bold text-slate-900 mt-1 block">{ctx.officeName}</span>
                                                        </div>
                                                    )}

                                                    {ctx.fileName && (
                                                        <div className="rounded-xl border border-amber-200/80 bg-white p-3 shadow-2xs">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1">
                                                                📎 Evidence File
                                                            </span>
                                                            <span className="text-xs font-bold text-slate-900 mt-1 block truncate" title={ctx.fileName}>
                                                                {ctx.fileName}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                                            👤 Performed By
                                                        </span>
                                                        <span className="text-xs font-bold text-slate-900 mt-1 block">
                                                            {userDisplayName} ({roleLabel || 'User'})
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Fixed bottom pagination — same position as all other pages */}
            {!loading && filteredLogs.length > 0 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(p) => setCurrentPage(p)}
                    fixed={true}
                    showWhenSinglePage={false}
                />
            )}
        </div>
    );
}
