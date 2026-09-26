import React, { useState, useEffect, useMemo } from "react";
import {
    AlertTriangle,
    AlertCircle,
    CheckCircle2,
    GraduationCap,
    Building2,
    ShieldCheck,
    Search,
    ChevronLeft,
    ChevronRight,
    Eye,
    Users,
    RefreshCw,
    X,
    LayoutGrid,
    LayoutList,
} from "lucide-react";
import CustomDropdown from "../UI/CustomDropdown";
import { API_BASE_URL } from "../../utils/apiBase";
import userIcon from "../../assets/images/user.svg";
import SmartUserAvatar from "../UI/SmartUserAvatar";

export default function DeficiencyTracker({
    offices = [],
    events = [],
    complianceData = [],
    onInspectOffice,
    onRefresh,
    isAdmin = false,
}) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedEventFilter, setSelectedEventFilter] = useState("");
    const [activeTab, setActiveTab] = useState("deficiencies"); // 'deficiencies' | 'critical' | 'moderate' | 'academic' | 'non_academic'
    const [sortBy, setSortBy] = useState("lowest_compliance"); // 'lowest_compliance' | 'highest_deficiencies' | 'name_asc'
    const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    // Automatically select the first available event (no "All" option)
    useEffect(() => {
        if (events && events.length > 0) {
            const hasMatch = events.some((ev) => String(ev.EventID) === String(selectedEventFilter));
            if (!selectedEventFilter || !hasMatch) {
                setSelectedEventFilter(String(events[0].EventID));
            }
        }
    }, [events, selectedEventFilter]);

    // Build event lookup map
    const eventMap = useMemo(() => {
        const map = {};
        for (const ev of events) {
            if (ev?.EventID != null) {
                map[String(ev.EventID)] = ev;
            }
        }
        return map;
    }, [events]);

    // Event dropdown options (without "All")
    const eventOptions = useMemo(() => {
        return events.map((ev) => ({
            value: String(ev.EventID),
            label: ev.EventCode || ev.EventName,
        }));
    }, [events]);

    // Sort dropdown options
    const sortOptions = [
        { value: "lowest_compliance", label: "Lowest Compliance %" },
        { value: "highest_deficiencies", label: "Most Deficiencies" },
        { value: "name_asc", label: "Name (A to Z)" },
    ];

    // Build compliance stats by office fallback
    const complianceByOffice = useMemo(() => {
        const map = {};
        for (const row of complianceData) {
            const officeId = String(row?.OfficeID ?? "");
            if (!officeId) continue;
            if (!map[officeId]) {
                map[officeId] = { total: 0, compiled: 0, partial: 0, notCompiled: 0 };
            }
            map[officeId].total += 1;
            const st = Number(row?.Status);
            if (st === 5) map[officeId].compiled += 1;
            else if (st === 4) map[officeId].partial += 1;
            else if (st === 3) map[officeId].notCompiled += 1;
            else map[officeId].notCompiled += 1;
        }
        return map;
    }, [complianceData]);

    // Process and enrich all offices
    const enrichedOffices = useMemo(() => {
        return offices.map((office) => {
            const officeId = String(office?.id ?? office?.OfficeID ?? "");
            const eventId = String(office?.event_id ?? office?.EventID ?? "");
            const eventObj = eventMap[eventId] || null;

            const isAcademic = (() => {
                const entityTypeId = Number(office?.entity_type_id ?? office?.EntityTypeID);
                if (entityTypeId === 1) return true;
                if (entityTypeId === 2) return false;

                const typeStr = String(
                    office?.category_name ||
                    office?.office_type_name ||
                    office?.TypeName ||
                    office?.office_type ||
                    office?.officeTypeName ||
                    ""
                ).trim().toLowerCase();

                if (/\bnon\b|non-?academic|not\s+academic|administrative|admin|support|staff|services/i.test(typeStr)) {
                    return false;
                }
                if (/\bacademic\b|program|course|curriculum|department|college|school|faculty/i.test(typeStr)) {
                    return true;
                }
                return false;
            })();

            const categoryName = isAcademic ? "Academic Program" : "Non-Academic Office";

            const eventName =
                eventObj?.EventName ||
                office?.event_name ||
                office?.EventName ||
                (eventId ? `Event #${eventId}` : "Unassigned Event");

            const eventCode = eventObj?.EventCode || office?.EventCode || "";

            // Determine requirement counts
            const fallback = complianceByOffice[officeId] || { total: 0, compiled: 0, partial: 0, notCompiled: 0 };
            const totalRequirements = Number(office?.total_requirements ?? fallback.total);
            const compliedCount = Number(office?.complied_count ?? fallback.compiled);
            const partiallyCompliedCount = Number(office?.partially_complied_count ?? fallback.partial);
            const notCompliedCount = Number(office?.not_complied_count ?? fallback.notCompiled);

            let percent = 0;
            if (office?.compliance_percent !== undefined && office?.compliance_percent !== null) {
                percent = Math.min(100, Math.max(0, Number(office.compliance_percent)));
            } else if (totalRequirements > 0) {
                percent = Math.min(100, Math.max(0, ((compliedCount * 100) + (partiallyCompliedCount * 50)) / totalRequirements));
            }

            const deficienciesCount = notCompliedCount + partiallyCompliedCount;

            let severity = "critical";
            if (percent === 100 && totalRequirements > 0) {
                severity = "compliant";
            } else if (percent >= 80) {
                severity = "minor";
            } else if (percent >= 50) {
                severity = "moderate";
            } else {
                severity = "critical";
            }

            // Head of office display (handles up to 4 assigned personnel)
            let headsList = [];
            if (Array.isArray(office.heads) && office.heads.length > 0) {
                headsList = office.heads;
            } else if (office.head_name && office.head_name !== "Unassigned") {
                const names = String(office.head_name).split(",").map((n) => n.trim()).filter(Boolean);
                headsList = names.map((name, idx) => ({
                    HeadID: idx + 1,
                    full_name: name,
                    Position: office.position || "",
                    ProfilePic: idx === 0 ? office.head_profile_pic : null,
                }));
            }

            return {
                ...office,
                officeId,
                officeName: office?.office_name || office?.OfficeName || `Office #${officeId}`,
                departmentName: office?.department_name || null,
                isAcademic,
                categoryName,
                eventId,
                eventName,
                eventCode,
                totalRequirements,
                compliedCount,
                partiallyCompliedCount,
                notCompliedCount,
                deficienciesCount,
                percent,
                severity,
                headsList,
            };
        });
    }, [offices, eventMap, complianceByOffice]);

    // Units belonging to the currently selected event
    const eventFilteredOffices = useMemo(() => {
        if (!selectedEventFilter) return enrichedOffices;
        return enrichedOffices.filter((unit) => String(unit.eventId) === String(selectedEventFilter));
    }, [enrichedOffices, selectedEventFilter]);

    // High-level KPI metrics for the current event
    const kpis = useMemo(() => {
        let criticalCount = 0;
        let moderateCount = 0;
        let compliantCount = 0;
        let totalDeficientItems = 0;
        let academicDeficientCount = 0;
        let nonAcademicDeficientCount = 0;

        for (const unit of eventFilteredOffices) {
            if (unit.totalRequirements === 0) {
                continue;
            }
            if (unit.percent === 100) {
                compliantCount += 1;
            } else {
                if (unit.percent < 50) criticalCount += 1;
                else moderateCount += 1;

                totalDeficientItems += unit.deficienciesCount;

                if (unit.isAcademic) academicDeficientCount += 1;
                else nonAcademicDeficientCount += 1;
            }
        }

        const totalUnits = eventFilteredOffices.length;
        const deficientUnits = criticalCount + moderateCount;

        return {
            totalUnits,
            deficientUnits,
            criticalCount,
            moderateCount,
            compliantCount,
            totalDeficientItems,
            academicDeficientCount,
            nonAcademicDeficientCount,
        };
    }, [eventFilteredOffices]);

    // Filter and Sort by tab and search
    const filteredAndSortedOffices = useMemo(() => {
        let result = eventFilteredOffices.filter((unit) => {
            // Tab filtering
            if (activeTab === "deficiencies") {
                if (unit.percent === 100 && unit.totalRequirements > 0) return false;
            } else if (activeTab === "critical") {
                if (unit.percent >= 50 || (unit.percent === 100 && unit.totalRequirements > 0)) return false;
            } else if (activeTab === "moderate") {
                if (unit.percent < 50 || unit.percent >= 100) return false;
            } else if (activeTab === "academic") {
                if (!unit.isAcademic) return false;
                if (unit.percent === 100 && unit.totalRequirements > 0) return false;
            } else if (activeTab === "non_academic") {
                if (unit.isAcademic) return false;
                if (unit.percent === 100 && unit.totalRequirements > 0) return false;
            }

            // Search term
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase().trim();
                const matchName = unit.officeName.toLowerCase().includes(term);
                const matchEvent = unit.eventName.toLowerCase().includes(term) || unit.eventCode.toLowerCase().includes(term);
                const matchDept = unit.departmentName ? unit.departmentName.toLowerCase().includes(term) : false;
                const matchHead = unit.headsList.some((h) => (h.full_name || "").toLowerCase().includes(term));
                if (!matchName && !matchEvent && !matchDept && !matchHead) return false;
            }

            return true;
        });

        // Sorting
        result.sort((a, b) => {
            if (sortBy === "lowest_compliance") {
                if (a.percent !== b.percent) return a.percent - b.percent;
                return b.deficienciesCount - a.deficienciesCount;
            }
            if (sortBy === "highest_deficiencies") {
                if (a.deficienciesCount !== b.deficienciesCount) return b.deficienciesCount - a.deficienciesCount;
                return a.percent - b.percent;
            }
            if (sortBy === "name_asc") {
                return a.officeName.localeCompare(b.officeName);
            }
            return 0;
        });

        return result;
    }, [eventFilteredOffices, activeTab, searchTerm, sortBy]);

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(filteredAndSortedOffices.length / itemsPerPage));
    const paginatedOffices = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredAndSortedOffices.slice(start, start + itemsPerPage);
    }, [filteredAndSortedOffices, currentPage]);

    const handleTabChange = (tabKey) => {
        setActiveTab(tabKey);
        setCurrentPage(1);
    };

    const handleEventFilterChange = (val) => {
        setSelectedEventFilter(val);
        setCurrentPage(1);
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    // Helper to render personnel avatar with photo and tooltip
    const renderPersonnelAvatar = (head, size = "md") => {
        const name = head?.full_name || `${head?.FirstName || ""} ${head?.LastName || ""}`.trim() || "Head";
        const dimClass = size === "sm" ? "h-6 w-6" : "h-7 w-7";
        const textClass = size === "sm" ? "text-[10px] font-bold" : "text-xs font-bold";

        return (
            <div key={head.HeadID || head.UserID || name} className="group relative inline-block shrink-0">
                <SmartUserAvatar
                    user={head}
                    fullName={name}
                    size={dimClass}
                    textSize={textClass}
                    ring="border-2 border-white shadow-xs"
                />
                {/* Tooltip */}
                <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                    <p className="font-semibold">{name}</p>
                    {head.Position && <p className="text-[10px] text-slate-300">{head.Position}</p>}
                </div>
            </div>
        );
    };

    return (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all">
            {/* Header section */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 pb-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100 shadow-sm">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold text-slate-800">
                                    Compliance Deficiencies & Action Tracker
                                </h2>
                                {kpis.deficientUnits > 0 ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                                        {kpis.deficientUnits} Unit(s) Needing Work
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                                        <CheckCircle2 size={12} /> All Compliant
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Monitor academic programs and non-academic offices with pending or incomplete standards under each accreditation.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start lg:self-center">
                    {onRefresh && (
                        <button
                            onClick={onRefresh}
                            title="Refresh data"
                            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition shadow-sm cursor-pointer"
                        >
                            <RefreshCw size={13} /> Refresh
                        </button>
                    )}
                </div>
            </div>

            {/* Top Stat Cards - 5 Columns */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {/* 1. All Deficiencies Card */}
                <div
                    onClick={() => handleTabChange("deficiencies")}
                    className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                        activeTab === "deficiencies"
                            ? "border-blue-500 bg-blue-50/90 shadow-sm ring-2 ring-blue-500/20"
                            : "border-slate-200 bg-slate-50/70 hover:bg-slate-100"
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">All Deficiencies</span>
                        <AlertTriangle size={15} className="text-slate-500" />
                    </div>
                    <p className="mt-1.5 text-2xl font-bold text-slate-900">{kpis.deficientUnits}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{kpis.totalDeficientItems} total unmet items</p>
                </div>

                {/* 2. Critical (<50%) Card */}
                <div
                    onClick={() => handleTabChange("critical")}
                    className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                        activeTab === "critical"
                            ? "border-rose-500 bg-rose-50/90 shadow-sm ring-2 ring-rose-500/20"
                            : "border-rose-100 bg-rose-50/40 hover:bg-rose-50/70"
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Critical (&lt;50%)</span>
                        <AlertCircle size={15} className="text-rose-500" />
                    </div>
                    <p className="mt-1.5 text-2xl font-bold text-rose-800">{kpis.criticalCount}</p>
                    <p className="text-[10px] text-rose-600 mt-0.5">Urgent compliance needed</p>
                </div>

                {/* 3. In Progress (50-99%) Card */}
                <div
                    onClick={() => handleTabChange("moderate")}
                    className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                        activeTab === "moderate"
                            ? "border-amber-500 bg-amber-50/90 shadow-sm ring-2 ring-amber-500/20"
                            : "border-amber-100 bg-amber-50/40 hover:bg-amber-50/70"
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">In Progress (50-99%)</span>
                        <AlertTriangle size={15} className="text-amber-500" />
                    </div>
                    <p className="mt-1.5 text-2xl font-bold text-amber-800">{kpis.moderateCount}</p>
                    <p className="text-[10px] text-amber-600 mt-0.5">Partially complied units</p>
                </div>

                {/* 4. Academic Programs Card */}
                <div
                    onClick={() => handleTabChange("academic")}
                    className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                        activeTab === "academic"
                            ? "border-cyan-500 bg-cyan-50/90 shadow-sm ring-2 ring-cyan-500/20"
                            : "border-cyan-100 bg-cyan-50/40 hover:bg-cyan-50/70"
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-700">Academic Programs</span>
                        <GraduationCap size={15} className="text-cyan-600" />
                    </div>
                    <p className="mt-1.5 text-2xl font-bold text-cyan-900">{kpis.academicDeficientCount}</p>
                    <p className="text-[10px] text-cyan-600 mt-0.5">Programs needing work</p>
                </div>

                {/* 5. Non-Academic Offices Card */}
                <div
                    onClick={() => handleTabChange("non_academic")}
                    className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                        activeTab === "non_academic"
                            ? "border-indigo-500 bg-indigo-50/90 shadow-sm ring-2 ring-indigo-500/20"
                            : "border-indigo-100 bg-indigo-50/40 hover:bg-indigo-50/70"
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Non-Academic Offices</span>
                        <Building2 size={15} className="text-indigo-600" />
                    </div>
                    <p className="mt-1.5 text-2xl font-bold text-indigo-900">{kpis.nonAcademicDeficientCount}</p>
                    <p className="text-[10px] text-indigo-600 mt-0.5">Offices needing work</p>
                </div>
            </div>

            {/* Filter Tabs Row - 5 Columns Perfectly Matching the Top Cards */}
            <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <button
                    onClick={() => handleTabChange("deficiencies")}
                    className={`w-full flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition cursor-pointer ${
                        activeTab === "deficiencies"
                            ? "bg-slate-800 text-white shadow-sm"
                            : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                >
                    <AlertTriangle size={13} /> All Deficiencies ({kpis.deficientUnits})
                </button>
                <button
                    onClick={() => handleTabChange("critical")}
                    className={`w-full flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition cursor-pointer ${
                        activeTab === "critical"
                            ? "bg-rose-600 text-white shadow-sm"
                            : "border border-rose-200 bg-rose-50/60 text-rose-700 hover:bg-rose-100/70"
                    }`}
                >
                    <AlertCircle size={13} /> Critical &lt;50% ({kpis.criticalCount})
                </button>
                <button
                    onClick={() => handleTabChange("moderate")}
                    className={`w-full flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition cursor-pointer ${
                        activeTab === "moderate"
                            ? "bg-amber-600 text-white shadow-sm"
                            : "border border-amber-200 bg-amber-50/60 text-amber-700 hover:bg-amber-100/70"
                    }`}
                >
                    <AlertTriangle size={13} /> In Progress 50-99% ({kpis.moderateCount})
                </button>
                <button
                    onClick={() => handleTabChange("academic")}
                    className={`w-full flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition cursor-pointer ${
                        activeTab === "academic"
                            ? "bg-cyan-700 text-white shadow-sm"
                            : "border border-cyan-200 bg-cyan-50/60 text-cyan-700 hover:bg-cyan-100/70"
                    }`}
                >
                    <GraduationCap size={13} /> Academic Programs ({kpis.academicDeficientCount})
                </button>
                <button
                    onClick={() => handleTabChange("non_academic")}
                    className={`w-full flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition cursor-pointer ${
                        activeTab === "non_academic"
                            ? "bg-indigo-700 text-white shadow-sm"
                            : "border border-indigo-200 bg-indigo-50/60 text-indigo-700 hover:bg-indigo-100/70"
                    }`}
                >
                    <Building2 size={13} /> Non-Academic Offices ({kpis.nonAcademicDeficientCount})
                </button>
            </div>

            {/* Controls Bar: Search, CustomDropdown for Event & Sort, View Toggle */}
            <div className="mt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Search Input */}
                <div className="relative w-full sm:w-64 md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search offices..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-8 text-xs text-slate-800 placeholder-slate-400 shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                            <X size={13} />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                    {/* Accreditation Dropdown using standard CustomDropdown (No "All" option) */}
                    <CustomDropdown
                        value={selectedEventFilter}
                        onChange={handleEventFilterChange}
                        options={eventOptions}
                        placeholder="Accreditation / Event"
                        size="sm"
                        minWidth="min-w-[146px]"
                        align="right"
                    />

                    {/* Sort Dropdown using standard CustomDropdown */}
                    <CustomDropdown
                        value={sortBy}
                        onChange={(val) => setSortBy(val)}
                        options={sortOptions}
                        placeholder="Sort order"
                        size="sm"
                        minWidth="min-w-[150px]"
                        align="right"
                    />

                    {/* View Mode Toggle */}
                    <div className="flex h-7 items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-100 p-0.5">
                        <button
                            type="button"
                            onClick={() => setViewMode("grid")}
                            title="Grid View"
                            className={`flex h-6 w-6 items-center justify-center rounded-md transition-all cursor-pointer ${
                                viewMode === "grid" ? "bg-white text-blue-600 shadow-2xs font-semibold" : "text-slate-500 hover:text-slate-700"
                            }`}
                        >
                            <LayoutGrid size={13} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("table")}
                            title="Table View"
                            className={`flex h-6 w-6 items-center justify-center rounded-md transition-all cursor-pointer ${
                                viewMode === "table" ? "bg-white text-blue-600 shadow-2xs font-semibold" : "text-slate-500 hover:text-slate-700"
                            }`}
                        >
                            <LayoutList size={13} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Display: Cards Grid or Table View */}
            <div className="mt-4">
                {filteredAndSortedOffices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center">
                        {kpis.deficientUnits === 0 && activeTab === "deficiencies" ? (
                            <>
                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                    <CheckCircle2 size={28} />
                                </div>
                                <h3 className="mt-3 text-base font-bold text-slate-800">All Units are 100% Compliant</h3>
                                <p className="mt-1 max-w-sm text-xs text-slate-500">
                                    Every academic program and non-academic office has fulfilled their compliance standards for this accreditation.
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                    <Search size={22} />
                                </div>
                                <h3 className="mt-3 text-sm font-semibold text-slate-700">No matching units found</h3>
                                <p className="mt-1 text-xs text-slate-500">
                                    Try clearing your search term or selecting a different tab.
                                </p>
                                <button
                                    onClick={() => {
                                        setSearchTerm("");
                                        setActiveTab("deficiencies");
                                    }}
                                    className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                                >
                                    Reset Filters
                                </button>
                            </>
                        )}
                    </div>
                ) : viewMode === "grid" ? (
                    /* Cards Grid View */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1.5 pb-1.5">
                        {paginatedOffices.map((office) => {
                            const hasNoReqs = office.totalRequirements === 0;
                            const isCompliant = !hasNoReqs && office.percent === 100;
                            const isCritical = !hasNoReqs && office.percent < 50;

                            return (
                                <div
                                    key={office.officeId || office.OfficeID}
                                    className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 app-card-hover cursor-pointer"
                                >
                                    <div>
                                        {/* Top badges row */}
                                        <div className="flex items-start justify-between gap-2 mb-2.5">
                                            {/* Category badge */}
                                            <div className="flex items-center gap-1.5">
                                                {office.isAcademic ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2 py-0.5 text-[11px] font-semibold text-cyan-700 border border-cyan-200/60">
                                                        <GraduationCap size={12} /> Academic Program
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 border border-indigo-200/60">
                                                        <Building2 size={12} /> Non-Academic Office
                                                    </span>
                                                )}
                                            </div>

                                            {/* Severity status chip */}
                                            {hasNoReqs ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 border border-slate-200">
                                                    No Requirements
                                                </span>
                                            ) : isCompliant ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                                                    <CheckCircle2 size={11} /> 100% Complied
                                                </span>
                                            ) : isCritical ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200">
                                                    <AlertCircle size={11} /> Critical ({office.percent}%)
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">
                                                    <AlertTriangle size={11} /> In Progress ({office.percent}%)
                                                </span>
                                            )}
                                        </div>

                                        {/* Office / Program Name */}
                                        <h3 className="text-base font-bold text-slate-800 line-clamp-1 group-hover:text-blue-600 transition">
                                            {office.officeName}
                                        </h3>
                                        {office.departmentName && (
                                            <p className="text-[11px] font-medium text-slate-500 line-clamp-1">
                                                {office.departmentName}
                                            </p>
                                        )}

                                        {/* Accreditation / Event Tag */}
                                        <div className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5">
                                            <ShieldCheck size={14} className="shrink-0 text-emerald-600" />
                                            <div className="min-w-0">
                                                <p className="text-[11px] font-semibold text-slate-700 truncate">
                                                    {office.eventCode || office.eventName}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Assigned Personnel Section (Supports up to 4 heads) */}
                                        <div className="mt-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                    Personnel ({office.headsList.length}/4)
                                                </span>
                                                {office.headsList.length > 0 && (
                                                    <span className="text-[10px] font-medium text-slate-400">
                                                        {office.headsList.length} assigned
                                                    </span>
                                                )}
                                            </div>

                                            {office.headsList.length === 0 ? (
                                                <div className="flex items-center gap-2 text-xs text-slate-400 py-0.5">
                                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200/80 text-slate-400 shrink-0">
                                                        <Users size={12} />
                                                    </div>
                                                    <span className="text-[11px] font-medium">Unassigned Personnel</span>
                                                </div>
                                            ) : (
                                                <div className="space-y-1.5">
                                                    {/* Avatar Row */}
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="flex -space-x-1.5 overflow-hidden py-0.5">
                                                            {office.headsList.slice(0, 4).map((head) => renderPersonnelAvatar(head, "md"))}
                                                        </div>
                                                    </div>

                                                    {/* Personnel Names */}
                                                    <div className="flex flex-wrap gap-1">
                                                        {office.headsList.slice(0, 4).map((head, idx) => (
                                                            <span
                                                                key={head.HeadID || head.UserID || idx}
                                                                className="inline-flex items-center rounded-md bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700 border border-slate-200 shadow-2xs truncate max-w-[150px]"
                                                                title={`${head.full_name}${head.Position ? ` (${head.Position})` : ""}`}
                                                            >
                                                                {head.full_name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Segmented Multi-Color Progress Bar */}
                                        <div className="mt-3.5">
                                            <div className="mb-1 flex items-center justify-between text-xs">
                                                <span className="text-[11px] font-semibold text-slate-600">Compliance Rate</span>
                                                <span className="text-xs font-bold text-slate-800">{office.percent}%</span>
                                            </div>

                                            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                                                {/* Complied segment */}
                                                {office.totalRequirements > 0 && office.compliedCount > 0 && (
                                                    <div
                                                        style={{ width: `${(office.compliedCount / office.totalRequirements) * 100}%` }}
                                                        className="bg-emerald-500 transition-all duration-300"
                                                        title={`${office.compliedCount} Complied`}
                                                    />
                                                )}
                                                {/* Partial segment */}
                                                {office.totalRequirements > 0 && office.partiallyCompliedCount > 0 && (
                                                    <div
                                                        style={{ width: `${(office.partiallyCompliedCount / office.totalRequirements) * 100}%` }}
                                                        className="bg-amber-400 transition-all duration-300"
                                                        title={`${office.partiallyCompliedCount} Partially Complied`}
                                                    />
                                                )}
                                                {/* Not complied segment */}
                                                {office.totalRequirements > 0 && office.notCompliedCount > 0 && (
                                                    <div
                                                        style={{ width: `${(office.notCompliedCount / office.totalRequirements) * 100}%` }}
                                                        className="bg-rose-500 transition-all duration-300"
                                                        title={`${office.notCompliedCount} Not Complied`}
                                                    />
                                                )}
                                            </div>

                                            {/* Requirement count chips */}
                                            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                                                <div className="flex items-center gap-2">
                                                    <span className="flex items-center gap-1 font-medium text-rose-600">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                                        {office.notCompliedCount} Missing
                                                    </span>
                                                    <span className="flex items-center gap-1 font-medium text-amber-600">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                                                        {office.partiallyCompliedCount} Partial
                                                    </span>
                                                    <span className="flex items-center gap-1 font-medium text-emerald-600">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                        {office.compliedCount} Done
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-slate-400">
                                                    {office.totalRequirements} total
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <div className="mt-4 pt-3 border-t border-slate-100">
                                        <button
                                            onClick={() => onInspectOffice && onInspectOffice(office)}
                                            className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/70 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition cursor-pointer"
                                        >
                                            <Eye size={13} /> Inspect Standards
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* Table View */
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left text-xs min-w-[720px]">
                            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Office / Academic Program</th>
                                    <th className="px-3 py-3 font-semibold">Category</th>
                                    <th className="px-3 py-3 font-semibold">Accreditation / Event</th>
                                    <th className="px-3 py-3 font-semibold">Assigned Personnel (Up to 4)</th>
                                    <th className="px-3 py-3 font-semibold">Deficiencies Breakdown</th>
                                    <th className="px-3 py-3 font-semibold">Compliance Rate</th>
                                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {paginatedOffices.map((office) => {
                                    const hasNoReqs = office.totalRequirements === 0;
                                    const isCompliant = !hasNoReqs && office.percent === 100;
                                    const isCritical = !hasNoReqs && office.percent < 50;

                                    return (
                                        <tr key={office.officeId || office.OfficeID} className="hover:bg-slate-50/80 transition">
                                            <td className="px-4 py-3">
                                                <p className="font-bold text-slate-800">{office.officeName}</p>
                                                {office.departmentName && (
                                                    <p className="text-[10px] text-slate-500">{office.departmentName}</p>
                                                )}
                                            </td>
                                            <td className="px-3 py-3">
                                                {office.isAcademic ? (
                                                    <span className="inline-flex items-center gap-1 rounded-md bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold text-cyan-700 border border-cyan-200/60">
                                                        <GraduationCap size={11} /> Academic Program
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 border border-indigo-200/60">
                                                        <Building2 size={11} /> Non-Academic Office
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    <ShieldCheck size={13} className="text-emerald-600 shrink-0" />
                                                    <span className="font-medium text-slate-700 max-w-[150px] truncate" title={office.eventCode || office.eventName}>
                                                        {office.eventCode || office.eventName}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3">
                                                {office.headsList.length === 0 ? (
                                                    <span className="text-slate-400 text-xs">Unassigned</span>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex -space-x-1.5 overflow-hidden shrink-0">
                                                            {office.headsList.slice(0, 4).map((head) => renderPersonnelAvatar(head, "sm"))}
                                                        </div>
                                                        <div className="min-w-0 max-w-[180px]">
                                                            <p
                                                                className="text-xs font-medium text-slate-800 truncate"
                                                                title={office.headsList.map((h) => h.full_name).join(", ")}
                                                            >
                                                                {office.headsList.map((h) => h.full_name).join(", ")}
                                                            </p>
                                                            <span className="text-[10px] text-slate-400">
                                                                {office.headsList.length}/4 assigned
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="flex items-center gap-2 text-[11px]">
                                                    <span className="rounded bg-rose-50 px-1.5 py-0.5 font-semibold text-rose-700 border border-rose-100">
                                                        {office.notCompliedCount} Missing
                                                    </span>
                                                    <span className="rounded bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-700 border border-amber-100">
                                                        {office.partiallyCompliedCount} Partial
                                                    </span>
                                                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700 border border-emerald-100">
                                                        {office.compliedCount} Done
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="w-28">
                                                    <div className="mb-0.5 flex justify-between text-[10px] font-semibold">
                                                        <span className={isCompliant ? "text-emerald-600" : isCritical ? "text-rose-600" : "text-amber-600"}>
                                                            {office.percent}%
                                                        </span>
                                                        <span className="text-slate-400">{office.compliedCount}/{office.totalRequirements}</span>
                                                    </div>
                                                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${
                                                                isCompliant ? "bg-emerald-500" : isCritical ? "bg-rose-500" : "bg-amber-400"
                                                            }`}
                                                            style={{ width: `${office.percent}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => onInspectOffice && onInspectOffice(office)}
                                                    className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                                                >
                                                    Inspect
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination Controls */}
                {filteredAndSortedOffices.length > itemsPerPage && (
                    <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                        <div>
                            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                            {Math.min(currentPage * itemsPerPage, filteredAndSortedOffices.length)} of{" "}
                            {filteredAndSortedOffices.length} units
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition shadow-xs cursor-pointer"
                            >
                                <ChevronLeft size={14} />
                            </button>

                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter((page) => {
                                    return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                                })
                                .map((page, idx, arr) => {
                                    const prevPage = arr[idx - 1];
                                    const showEllipsis = prevPage && page - prevPage > 1;

                                    return (
                                        <React.Fragment key={page}>
                                            {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                                            <button
                                                onClick={() => setCurrentPage(page)}
                                                className={`min-w-[28px] rounded-lg px-2 py-1 text-xs font-semibold transition cursor-pointer ${
                                                    currentPage === page
                                                        ? "bg-blue-600 text-white shadow-xs"
                                                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                                }`}
                                            >
                                                {page}
                                            </button>
                                        </React.Fragment>
                                    );
                                })}

                            <button
                                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition shadow-xs cursor-pointer"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
