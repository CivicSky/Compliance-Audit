import { useEffect, useMemo, useState, useCallback } from "react";
import Pagination from "../components/Pagination/Pagination";
import CustomDropdown from "../components/UI/CustomDropdown";
import Header from "../components/Header/header";
import { CardListSkeleton } from "../components/UI/Skeleton";
import { useLiveRefresh } from "../utils/liveSync";
import ServerOfflineState from "../components/UI/ServerOfflineState";
import { Activity, Plus, FileEdit, ShieldAlert, X, FileText, Award } from "lucide-react";

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
    const itemsPerPage = 7;

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

    const stripEmojis = (str) => {
        return String(str || '')
            .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]|[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{200D}])/gu, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
    };

    const normalizeActionLabel = (rawAction) => {
        const normalized = String(rawAction || "").trim();
        const action = normalized;
        const httpMatch = action.match(/^(GET|POST|PUT|PATCH|DELETE)\s+/i);
        if (httpMatch) return verbToCrud[httpMatch[1].toUpperCase()] || "Updated";

        if (/login/i.test(action)) return "Login";
        if (/logout/i.test(action)) return "Logout";
        if (/AuditorAssignedAreas/i.test(action)) return "Updated";
        if (/OfficeHeadUpdated/i.test(action)) return "Updated";
        if (/OfficeHeadAdded/i.test(action)) return "Created";
        if (/OfficeHeadDeleted/i.test(action)) return "Deleted";
        if (/CriteriaDeleted|Criteria deleted/i.test(action)) return "Deleted";
        if (/RequirementDeleted/i.test(action)) return "Deleted";
        if (/EventDeleted/i.test(action)) return "Deleted";
        if (/OfficeDeleted/i.test(action)) return "Deleted";
        if (/AreaDeleted/i.test(action)) return "Deleted";
        if (/RequirementUpdated|OfficeUpdated|EventUpdated|AccreditationLevelUpdated/i.test(action)) return "Updated";
        if (/(added|created|registered|copied)$/i.test(action)) return "Created";
        if (/(updated|relocated|assigned)$/i.test(action)) return "Updated";
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
        const d = ctx.rawDetails || {};

        if (actionLabel === "Login") return "User logged in to Compliance Portal";
        if (actionLabel === "Logout") return "User logged out of Compliance Portal";

        // External Auditor Assignment
        if (/AuditorAssignedAreas/i.test(rawAction)) {
            const audName = d.AuditorName || (d.AuditorUserID ? `Auditor #${d.AuditorUserID}` : 'External Auditor');
            const count = d.AssignedAreaCount ?? (Array.isArray(d.Areas) ? d.Areas.length : 0);
            const areaNames = Array.isArray(d.Areas)
                ? d.Areas.map(a => a.AreaCode ? (a.AreaName ? `${a.AreaCode} (${a.AreaName})` : a.AreaCode) : a.AreaName).filter(Boolean).join(', ')
                : '';
            if (count === 0) return `Updated assignments for ${audName} (cleared assigned areas)`;
            return `Assigned External Auditor ${audName} to ${count} area(s)${areaNames ? `: ${areaNames}` : ''}`;
        }

        // Office Personnel
        if (/OfficeHeadUpdated/i.test(rawAction)) {
            const headName = d.HeadName || 'Office Personnel';
            const changes = d.changes || {};
            if (changes.Position) {
                return `Updated position of "${headName}" from "${changes.Position.from}" to "${changes.Position.to}"`;
            }
            const changedFields = Object.keys(changes);
            if (changedFields.length > 0) {
                return `Updated Office Personnel "${headName}" (changed: ${changedFields.join(', ')})`;
            }
            return `Updated Office Personnel "${headName}"`;
        }
        if (/OfficeHeadAdded/i.test(rawAction)) {
            const headName = d.HeadName || (Array.isArray(d.HeadNames) ? d.HeadNames.join(', ') : 'Office Personnel');
            const pos = d.Position ? ` as ${d.Position}` : '';
            return `Added Office Personnel "${headName}"${pos}`;
        }
        if (/OfficeHeadDeleted/i.test(rawAction)) {
            const headName = d.HeadName || (Array.isArray(d.HeadNames) ? d.HeadNames.join(', ') : 'Office Personnel');
            return `Removed Office Personnel "${headName}"`;
        }

        // File Upload
        if (/RequirementFileUploaded|Upload/i.test(rawAction)) {
            let msg = `Uploaded standard file ${ctx.fileName ? `"${ctx.fileName}"` : 'document'}`;
            if (ctx.reqCode) msg += ` for Standard ${ctx.reqCode}`;
            if (ctx.officeName) msg += ` in ${ctx.officeName}`;
            if (ctx.eventName) msg += ` under "${ctx.eventName}"`;
            return msg;
        }

        // File Delete
        if (/RequirementFileDeleted|Unsubmit/i.test(rawAction)) {
            let msg = `Removed standard file ${ctx.fileName ? `"${ctx.fileName}"` : 'document'}`;
            if (ctx.reqCode) msg += ` from Standard ${ctx.reqCode}`;
            if (ctx.officeName) msg += ` in ${ctx.officeName}`;
            return msg;
        }

        // Requirement Added
        if (/RequirementAdded/i.test(rawAction) && actionLabel === "Created") {
            let msg = `Created Standard ${ctx.reqCode ? ctx.reqCode : ''}`;
            if (ctx.reqDesc) msg += ` ("${ctx.reqDesc}")`;
            if (ctx.critLabel) msg += ` under Sub Area ${ctx.critLabel}`;
            if (ctx.areaName) msg += ` in ${ctx.areaName}`;
            if (ctx.eventName) msg += ` — "${ctx.eventName}"`;
            return msg;
        }

        // Requirement Updated
        if (/RequirementUpdated/i.test(rawAction)) {
            const changes = d.changes || {};
            const code = d.RequirementCode || ctx.reqCode || '';
            if (changes.RequirementCode) {
                return `Updated Standard: code changed from "${changes.RequirementCode.from}" to "${changes.RequirementCode.to}"`;
            }
            if (changes.Description) {
                const prev = String(changes.Description.from || '').slice(0, 60);
                const next = String(changes.Description.to || '').slice(0, 60);
                return `Updated Standard ${code}: description changed from "${prev}" to "${next}"`;
            }
            const changedFields = Object.keys(changes);
            if (changedFields.length > 0) {
                return `Updated Standard ${code} (changed: ${changedFields.join(', ')})`;
            }
            return `Updated Standard ${code}${ctx.critLabel ? ` under Sub Area ${ctx.critLabel}` : ''}`;
        }

        // Requirement Deleted
        if (/RequirementDeleted/i.test(rawAction)) {
            const deleted = Array.isArray(d.deletedRequirements) ? d.deletedRequirements : [];
            if (deleted.length === 1) {
                const r = deleted[0];
                return `Deleted Standard ${r.RequirementCode || ''}${r.Description ? ` ("${r.Description}")` : ''}${r.EventName ? ` from "${r.EventName}"` : ''}`;
            }
            if (deleted.length > 1) {
                return `Deleted ${deleted.length} Standards: ${deleted.map(r => r.RequirementCode || 'Unknown').join(', ')}`;
            }
            return `Deleted ${(d.deletedCount || d.requirementIds?.length || 0)} Standard(s)`;
        }

        // Criteria Added
        if (/CriteriaAdded|Criteria/i.test(rawAction) && actionLabel === "Created") {
            let msg = `Created Sub Area ${ctx.critLabel ? `"${ctx.critLabel}"` : ''}`;
            if (ctx.areaName) msg += ` under ${ctx.areaName}`;
            if (ctx.eventName) msg += ` — "${ctx.eventName}"`;
            return msg;
        }

        // Criteria Deleted
        if (/CriteriaDeleted|Criteria deleted/i.test(rawAction)) {
            const deleted = Array.isArray(d.deletedCriteria) ? d.deletedCriteria : [];
            if (deleted.length === 1) {
                const c = deleted[0];
                const label = c.CriteriaCode && c.CriteriaName ? `${c.CriteriaCode}. ${c.CriteriaName}` : (c.CriteriaCode || c.CriteriaName || 'Unknown');
                return `Deleted Sub Area "${label}"${c.EventName ? ` from "${c.EventName}"` : ''}`;
            }
            if (deleted.length > 1) {
                return `Deleted ${deleted.length} Sub Areas: ${deleted.map(c => c.CriteriaCode || 'Unknown').join(', ')}`;
            }
            return `Deleted ${(d.deletedCount || d.criteriaIds?.length || 0)} Sub Area(s)`;
        }

        // Area Added
        if (/AreaAdded|Area/i.test(rawAction) && actionLabel === "Created") {
            let msg = `Created Area ${ctx.areaName ? `"${ctx.areaName}"` : ''}`;
            if (ctx.eventName) msg += ` under "${ctx.eventName}"`;
            return msg;
        }

        // Area Deleted
        if (/AreaDeleted/i.test(rawAction)) {
            const areaIds = d.areaIds || [];
            return `Deleted ${areaIds.length || 1} Area(s)${ctx.areaName ? `: "${ctx.areaName}"` : ''}`;
        }

        // Office / Program Created or Updated
        if (/OfficeAdded/i.test(rawAction)) {
            let msg = `Created Office/Program ${ctx.officeName ? `"${ctx.officeName}"` : ''}`;
            if (ctx.eventName) msg += ` under "${ctx.eventName}"`;
            if (Array.isArray(ctx.reqIds)) msg += ` (${ctx.reqIds.length} requirement${ctx.reqIds.length === 1 ? '' : 's'} assigned)`;
            return msg;
        }
        if (/OfficeUpdated/i.test(rawAction)) {
            const changes = d.changes || {};
            const name = d.OfficeName || ctx.officeName || '';
            if (changes.OfficeName) {
                return `Updated Office: name changed from "${changes.OfficeName.from}" to "${changes.OfficeName.to}"`;
            }
            const changedFields = Object.keys(changes);
            const headChanges = d.headChanges || {};
            const headAdded = Array.isArray(headChanges.added) && headChanges.added.length > 0 ? ` Added personnel: ${headChanges.added.join(', ')}.` : '';
            const headRemoved = Array.isArray(headChanges.removed) && headChanges.removed.length > 0 ? ` Removed personnel: ${headChanges.removed.join(', ')}.` : '';
            if (changedFields.length > 0 || headAdded || headRemoved) {
                return `Updated Office "${name}" (changed: ${changedFields.join(', ') || 'personnel'}).${headAdded}${headRemoved}`;
            }
            return `Updated Office/Program ${name ? `"${name}"` : ''}${ctx.eventName ? ` under "${ctx.eventName}"` : ''}`;
        }
        if (/OfficeDeleted/i.test(rawAction)) {
            const name = d.OfficeName || ctx.officeName || '';
            return `Deleted Office/Program${name ? ` "${name}"` : ''}${d.EventName || ctx.eventName ? ` from "${d.EventName || ctx.eventName}"` : ''}`;
        }
        if (/Office/i.test(rawAction)) {
            let msg = `${actionLabel} Office/Program ${ctx.officeName ? `"${ctx.officeName}"` : ''}`;
            if (ctx.eventName) msg += ` under "${ctx.eventName}"`;
            if (Array.isArray(ctx.reqIds)) msg += ` (${ctx.reqIds.length} requirement${ctx.reqIds.length === 1 ? '' : 's'} assigned)`;
            return msg;
        }

        // Accreditation Event
        if (/EventAdded/i.test(rawAction)) {
            return `Created Accreditation Event ${ctx.eventName ? `"${ctx.eventName}"` : ''}${d.EventCode ? ` (${d.EventCode})` : ''}`;
        }
        if (/EventUpdated/i.test(rawAction)) {
            const changes = d.changes || {};
            if (changes.EventName) {
                return `Updated Accreditation Event: name changed from "${changes.EventName.from}" to "${changes.EventName.to}"`;
            }
            if (changes.EventCode) {
                return `Updated Accreditation Event "${d.EventName}": code changed from "${changes.EventCode.from}" to "${changes.EventCode.to}"`;
            }
            return `Updated Accreditation Event ${ctx.eventName ? `"${ctx.eventName}"` : ''}`;
        }
        if (/EventDeleted/i.test(rawAction)) {
            const names = Array.isArray(d.deletedNames) ? d.deletedNames.filter(Boolean) : [];
            if (names.length === 1) return `Deleted Accreditation Event "${names[0]}"`;
            if (names.length > 1) return `Deleted ${names.length} Accreditation Events: ${names.join(', ')}`;
            return `Deleted Accreditation Event ${ctx.eventName ? `"${ctx.eventName}"` : ''}`;
        }
        if (/EventCopied/i.test(rawAction)) {
            return `Copied Accreditation Event ${ctx.eventName ? `"${ctx.eventName}"` : ''}`;
        }

        // User Updates
        if (/UserRoleUpdated/i.test(rawAction)) {
            return `Updated role for user ${ctx.targetUserName ? `"${ctx.targetUserName}"` : ''}`;
        }
        if (/UserApprovalUpdated/i.test(rawAction)) {
            return `Updated approval status for user ${ctx.targetUserName ? `"${ctx.targetUserName}"` : ''}`;
        }
        if (/UserUpdated|User/i.test(rawAction)) {
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
            const rawMessage = buildInDepthMessage(log, normalizedAction, ctx);
            return {
                ...log,
                Action: stripEmojis(log.Action),
                normalizedAction,
                context: ctx,
                readableMessage: stripEmojis(rawMessage),
                displayName: stripEmojis(log.displayName),
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
    const [serverStats, setServerStats] = useState({
        total: 0,
        created: 0,
        updated: 0,
        deletedAndAuth: 0
    });

    const stats = useMemo(() => {
        if (serverStats.total > 0) {
            return serverStats;
        }
        let created = 0, updated = 0, deleted = 0, auth = 0;
        preparedLogs.forEach(l => {
            if (l.normalizedAction === 'Created') created++;
            else if (l.normalizedAction === 'Updated') updated++;
            else if (l.normalizedAction === 'Deleted') deleted++;
            else if (['Login', 'Logout'].includes(l.normalizedAction)) auth++;
        });
        return { total: serverTotalCount || preparedLogs.length, created, updated, deletedAndAuth: deleted + auth };
    }, [serverStats, preparedLogs, serverTotalCount]);

    const totalPages = serverTotalPages;
    const visibleLogs = filteredLogs;

    const clearControls = () => {
        setSearchTerm("");
        setActionFilter("all");
    };

    const [serverError, setServerError] = useState(null);
    const [isRetrying, setIsRetrying] = useState(false);

    const fetchLogs = useCallback(async (isRetry = false) => {
        try {
            if (isRetry) setIsRetrying(true);
            else setloading(true);
            setServerError(null);

            const token = localStorage.getItem("token");
            const res = await fetch(`/api/logs?page=${currentPage}&limit=${itemsPerPage}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch logs`);
            const data = await res.json();
            const logsArr = data.logs || [];
            setLogs(logsArr);
            if (data.totalPages) setServerTotalPages(data.totalPages);
            if (data.total !== undefined) setServerTotalCount(data.total);
            if (data.stats) {
                setServerStats({
                    total: data.stats.total ?? data.total ?? 0,
                    created: data.stats.created ?? 0,
                    updated: data.stats.updated ?? 0,
                    deletedAndAuth: data.stats.deletedAndAuth ?? ((data.stats.deleted || 0) + (data.stats.auth || 0))
                });
            }
            setServerError(null);
        } catch (err) {
            console.error("Failed to load audit logs:", err);
            setLogs([]);
            if (!err.response || err.message?.toLowerCase().includes('failed to fetch') || err.message?.toLowerCase().includes('network error')) {
                setServerError('Server Offline');
            } else {
                setServerError(err.message || 'Failed to load activity logs.');
            }
        } finally {
            setloading(false);
            setIsRetrying(false);
        }
    }, [currentPage]);

    // Fetch Logs on Demand when currentPage changes
    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Live syncing on mutations / window focus
    useLiveRefresh(fetchLogs, { deps: [currentPage] });

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
        <div className="w-full flex-1 flex flex-col min-w-0 bg-slate-50/50 overflow-hidden">
            {/* Top Header Card */}
            <div className="px-4 sm:px-6 pt-4 pb-3.5 shrink-0 border-b border-slate-200/70 bg-white shadow-2xs">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-md shadow-indigo-500/20 shrink-0">
                        <svg className="w-5 h-5 sm:w-5.5 sm:h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">Audit Logs &amp; Security Trails</h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Chronological immutable record of accreditation data modifications, file operations, and user logins.
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 px-4 sm:px-6 pt-3 pb-8 flex flex-col gap-3 overflow-hidden">
                {/* Stat Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 shrink-0">
                        <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs flex items-center justify-between hover:border-slate-300 transition">
                            <div>
                                <p className="text-[11px] font-semibold text-slate-500">Total Activities</p>
                                <p className="text-xl font-bold text-slate-900 mt-0.5">{stats.total}</p>
                            </div>
                            <div className="h-9 w-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm shadow-2xs">
                                <Activity className="w-4 h-4 text-slate-700" />
                            </div>
                        </div>

                        <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/30 p-3 shadow-2xs flex items-center justify-between hover:border-emerald-300 transition">
                            <div>
                                <p className="text-[11px] font-semibold text-emerald-800">Created Records</p>
                                <p className="text-xl font-bold text-emerald-700 mt-0.5">{stats.created}</p>
                            </div>
                            <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shadow-2xs">
                                <Plus className="w-4 h-4 text-emerald-700" />
                            </div>
                        </div>

                        <div className="rounded-xl border border-indigo-200/70 bg-indigo-50/30 p-3 shadow-2xs flex items-center justify-between hover:border-indigo-300 transition">
                            <div>
                                <p className="text-[11px] font-semibold text-indigo-800">Updated Records</p>
                                <p className="text-xl font-bold text-indigo-700 mt-0.5">{stats.updated}</p>
                            </div>
                            <div className="h-9 w-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shadow-2xs">
                                <FileEdit className="w-4 h-4 text-indigo-700" />
                            </div>
                        </div>

                        <div className="rounded-xl border border-rose-200/70 bg-rose-50/30 p-3 shadow-2xs flex items-center justify-between hover:border-rose-300 transition">
                            <div>
                                <p className="text-[11px] font-semibold text-rose-800">Security & Deletions</p>
                                <p className="text-xl font-bold text-rose-700 mt-0.5">{stats.deletedAndAuth}</p>
                            </div>
                            <div className="h-9 w-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm shadow-2xs">
                                <ShieldAlert className="w-4 h-4 text-rose-700" />
                            </div>
                        </div>
                    </div>

                    {/* Main Card Container */}
                    <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 flex flex-col overflow-hidden flex-1 min-h-0">
                    {/* Filter Toolbar */}
                    <div className="px-4 py-2.5 border-b border-slate-200/90 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Activity History</h2>
                            <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                                {filteredLogs.length} record(s)
                            </span>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-start sm:justify-end">
                            {/* Search Input */}
                            <div className="relative w-full sm:w-64">
                                <svg
                                    className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search activity, user, office..."
                                    className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-8 text-xs text-slate-800 placeholder-slate-400 shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-slate-300"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchTerm("")}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs flex items-center justify-center"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Action Filter Dropdown */}
                            <CustomDropdown
                                value={actionFilter}
                                onChange={setActionFilter}
                                options={[
                                    { value: 'all', label: 'All Actions' },
                                    { value: 'Created', label: 'Created' },
                                    { value: 'Updated', label: 'Updated' },
                                    { value: 'Deleted', label: 'Deleted' },
                                    { value: 'Viewed', label: 'Viewed' },
                                    { value: 'Login', label: 'Login' },
                                    { value: 'Logout', label: 'Logout' },
                                ]}
                                minWidth="min-w-[130px]"
                                size="sm"
                            />

                            {/* Reset Controls Button */}
                            {(searchTerm || actionFilter !== "all") && (
                                <button
                                    onClick={clearControls}
                                    title="Clear All Filters"
                                    className="flex h-8 px-2.5 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-100 transition shadow-2xs cursor-pointer"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex-1 overflow-y-auto">
                            <CardListSkeleton count={7} />
                        </div>
                    ) : serverError ? (
                        <ServerOfflineState
                            onRetry={() => fetchLogs(true)}
                            isRetrying={isRetrying}
                            title={serverError === 'Server Offline' ? 'Backend Server Unavailable' : 'Unable to Load Logs'}
                            message={serverError === 'Server Offline' 
                                ? 'The backend server is unreachable or offline. If you stopped the backend server, please start it and click Retry Connection.' 
                                : serverError}
                        />
                    ) : filteredLogs.length === 0 ? (
                        <div className="flex-1 w-full min-h-[300px] flex flex-col items-center justify-center p-8 text-center bg-white/70 animate-fadeIn my-auto">
                            <div className="h-14 w-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3 text-xl">
                                <FileText className="w-7 h-7 text-slate-400" />
                            </div>
                            <h3 className="text-base font-bold text-slate-800 mb-1">No Activity Logs Found</h3>
                            <p className="text-xs text-slate-500 max-w-sm mb-3">
                                {logs.length === 0 ? 'No activity logs have been recorded in the database yet.' : 'No logs match your search term or action filter.'}
                            </p>
                            {(searchTerm || actionFilter !== "all") && (
                                <button
                                    type="button"
                                    onClick={clearControls}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                                >
                                    Clear Filters
                                </button>
                            )}
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
                                            className="flex items-center justify-between px-4 py-2 text-xs cursor-pointer gap-3"
                                            onClick={() => setExpandedLogId(prev => prev === log.LogID ? null : log.LogID)}
                                        >
                                            {/* Left: Icon + Action Badge + Message */}
                                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                <div className={`h-7 w-7 shrink-0 rounded-lg flex items-center justify-center shadow-2xs ${style.iconBg}`}>
                                                    {style.icon}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold ${style.badge}`}>
                                                            {action}
                                                        </span>
                                                        <p className="text-xs font-bold text-slate-900 truncate">
                                                            {readableMessage}
                                                        </p>
                                                    </div>

                                                    <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                                                        <span>By <strong className="text-slate-700">{userDisplayName}</strong></span>
                                                        {roleLabel && (
                                                            <>
                                                                <span>•</span>
                                                                <span className="rounded bg-slate-100 px-1 py-0.2 text-[9px] font-semibold text-slate-600">{roleLabel}</span>
                                                            </>
                                                        )}
                                                        {ctx.eventName && (
                                                            <>
                                                                <span>•</span>
                                                                <span className="text-blue-600 font-semibold truncate max-w-[180px] inline-flex items-center gap-1" title={ctx.eventName}>
                                                                    <Award className="w-3 h-3 text-blue-500 shrink-0" />
                                                                    <span>{ctx.eventName}</span>
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right: Timestamp & Details Toggle */}
                                            <div className="flex items-center gap-2.5 shrink-0">
                                                <div className="text-right text-[10px] text-slate-500 font-medium leading-tight">
                                                    <div className="font-bold text-slate-700">{time}</div>
                                                    <div className="text-slate-400 text-[9px] mt-0.5">{date}</div>
                                                </div>
                                                <div className="text-slate-400 group-hover:text-slate-600 transition-colors">
                                                    <svg
                                                        className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-blue-600' : ''}`}
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
                                                                Accreditation Event
                                                            </span>
                                                            <span className="text-xs font-bold text-slate-900 mt-1 block">{ctx.eventName}</span>
                                                        </div>
                                                    )}

                                                    {ctx.areaName && (
                                                        <div className="rounded-xl border border-indigo-200/80 bg-white p-3 shadow-2xs">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1">
                                                                Area
                                                            </span>
                                                            <span className="text-xs font-bold text-slate-900 mt-1 block">{ctx.areaName}</span>
                                                        </div>
                                                    )}

                                                    {ctx.critLabel && (
                                                        <div className="rounded-xl border border-purple-200/80 bg-white p-3 shadow-2xs">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 flex items-center gap-1">
                                                                Criteria
                                                            </span>
                                                            <span className="text-xs font-bold text-slate-900 mt-1 block">{ctx.critLabel}</span>
                                                        </div>
                                                    )}

                                                    {(ctx.reqCode || ctx.reqDesc) && (
                                                        <div className="rounded-xl border border-sky-200/80 bg-white p-3 shadow-2xs">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 flex items-center gap-1">
                                                                Requirement
                                                            </span>
                                                            <span className="text-xs font-bold text-slate-900 mt-1 block">
                                                                {ctx.reqCode} {ctx.reqDesc ? `— ${ctx.reqDesc}` : ''}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {ctx.officeName && (
                                                        <div className="rounded-xl border border-emerald-200/80 bg-white p-3 shadow-2xs">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1">
                                                                Office / Program
                                                            </span>
                                                            <span className="text-xs font-bold text-slate-900 mt-1 block">{ctx.officeName}</span>
                                                        </div>
                                                    )}

                                                    {ctx.fileName && (
                                                        <div className="rounded-xl border border-amber-200/80 bg-white p-3 shadow-2xs">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1">
                                                                Standard File
                                                            </span>
                                                            <span className="text-xs font-bold text-slate-900 mt-1 block truncate" title={ctx.fileName}>
                                                                {ctx.fileName}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                                            Performed By
                                                        </span>
                                                        <span className="text-xs font-bold text-slate-900 mt-1 block">
                                                            {userDisplayName} ({roleLabel || 'User'})
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Before / After Changes Diff Table */}
                                                {(() => {
                                                    const d = ctx.rawDetails || {};
                                                    const changes = d.changes || {};
                                                    const entries = Object.entries(changes);
                                                    if (entries.length === 0) return null;
                                                    return (
                                                        <div className="mt-3 rounded-xl border border-orange-200/80 bg-white overflow-hidden shadow-2xs">
                                                            <div className="px-3 py-2 bg-orange-50 border-b border-orange-100 text-[10px] font-bold uppercase tracking-wider text-orange-700">
                                                                Field Changes
                                                            </div>
                                                            <table className="w-full text-xs">
                                                                <thead>
                                                                    <tr className="bg-slate-50 border-b border-slate-100">
                                                                        <th className="text-left px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase w-1/4">Field</th>
                                                                        <th className="text-left px-3 py-1.5 text-[10px] font-bold text-rose-500 uppercase w-[37.5%]">Before</th>
                                                                        <th className="text-left px-3 py-1.5 text-[10px] font-bold text-emerald-600 uppercase w-[37.5%]">After</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100">
                                                                    {entries.map(([field, val]) => {
                                                                        if (typeof val !== 'object' || val === null) {
                                                                            return (
                                                                                <tr key={field}>
                                                                                    <td className="px-3 py-1.5 font-semibold text-slate-700">{toTitle(field)}</td>
                                                                                    <td className="px-3 py-1.5 text-slate-500" colSpan={2}>{String(val)}</td>
                                                                                </tr>
                                                                            );
                                                                        }
                                                                        const from = val.from === null || val.from === undefined ? '(none)' : String(val.from);
                                                                        const to = val.to === null || val.to === undefined ? '(none)' : String(val.to);
                                                                        return (
                                                                            <tr key={field}>
                                                                                <td className="px-3 py-1.5 font-semibold text-slate-700">{toTitle(field)}</td>
                                                                                <td className="px-3 py-1.5 text-rose-700 bg-rose-50/50 font-mono text-[10px] max-w-[200px] truncate" title={from}>{from}</td>
                                                                                <td className="px-3 py-1.5 text-emerald-700 bg-emerald-50/50 font-mono text-[10px] max-w-[200px] truncate" title={to}>{to}</td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    );
                                                })()}

                                                {/* Deleted Items List */}
                                                {(() => {
                                                    const d = ctx.rawDetails || {};
                                                    const deleted =
                                                        (Array.isArray(d.deletedRequirements) && d.deletedRequirements.length > 0 && d.deletedRequirements) ||
                                                        (Array.isArray(d.deletedCriteria) && d.deletedCriteria.length > 0 && d.deletedCriteria) ||
                                                        (Array.isArray(d.deletedNames) && d.deletedNames.length > 0 && d.deletedNames.map(n => ({ name: n }))) ||
                                                        null;
                                                    if (!deleted) return null;
                                                    const isReq = Array.isArray(d.deletedRequirements) && d.deletedRequirements.length > 0;
                                                    const isCrit = Array.isArray(d.deletedCriteria) && d.deletedCriteria.length > 0;
                                                    return (
                                                        <div className="mt-3 rounded-xl border border-rose-200/80 bg-white overflow-hidden shadow-2xs">
                                                            <div className="px-3 py-2 bg-rose-50 border-b border-rose-100 text-[10px] font-bold uppercase tracking-wider text-rose-700">
                                                                Deleted Items ({deleted.length})
                                                            </div>
                                                            <div className="divide-y divide-slate-100">
                                                                {deleted.map((item, idx) => {
                                                                    if (isReq) {
                                                                        return (
                                                                            <div key={idx} className="px-3 py-1.5 flex items-start gap-2">
                                                                                <span className="font-mono font-bold text-rose-700 text-[10px] shrink-0 mt-0.5">{item.RequirementCode || `#${idx + 1}`}</span>
                                                                                <span className="text-slate-700">{item.Description || '(no description)'}</span>
                                                                                {item.EventName && <span className="ml-auto text-slate-400 text-[10px] shrink-0">{item.EventName}</span>}
                                                                            </div>
                                                                        );
                                                                    }
                                                                    if (isCrit) {
                                                                        return (
                                                                            <div key={idx} className="px-3 py-1.5 flex items-start gap-2">
                                                                                <span className="font-mono font-bold text-rose-700 text-[10px] shrink-0 mt-0.5">{item.CriteriaCode || `#${idx + 1}`}</span>
                                                                                <span className="text-slate-700">{item.CriteriaName || '(no name)'}</span>
                                                                                {item.EventName && <span className="ml-auto text-slate-400 text-[10px] shrink-0">{item.EventName}</span>}
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return (
                                                                        <div key={idx} className="px-3 py-1.5 text-slate-700">
                                                                            {item.name || String(item)}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
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
