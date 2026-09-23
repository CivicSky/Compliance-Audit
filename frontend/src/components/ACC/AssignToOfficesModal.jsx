import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, ChevronDown, ChevronRight, GraduationCap, Building2, CheckSquare, Square, Loader2, X, SlidersHorizontal } from 'lucide-react';
import { officesAPI, areasAPI } from '../../utils/api';
import axios from 'axios';
import { API_BASE_URL } from '../../utils/apiBase';
import CustomSelect from '../UI/CustomSelect';

export default function AssignToOfficesModal({
  offices = [],
  areasData = [],
  events = [],
  selectedEventId = '',
  onSelectEvent,
  onAssign,
  onClose,
  saving = false,
  error = '',
  success = ''
}) {
  const [officeSearch, setOfficeSearch] = useState('');
  const [requirementSearch, setRequirementSearch] = useState('');
  const [activeOfficeTab, setActiveOfficeTab] = useState('All');
  const [selectedOfficeIds, setSelectedOfficeIds] = useState(new Set());
  const [selectedRequirementIds, setSelectedRequirementIds] = useState(new Set());
  const [expandedAreas, setExpandedAreas] = useState(new Set([1, 2]));
  const [expandedCriteria, setExpandedCriteria] = useState(new Set());

  const [localOffices, setLocalOffices] = useState(offices || []);
  const [localAreasData, setLocalAreasData] = useState(areasData || []);
  const [loadingData, setLoadingData] = useState(false);

  // Sync props if provided
  useEffect(() => {
    if (Array.isArray(offices) && offices.length > 0) {
      setLocalOffices(offices);
    }
  }, [offices]);

  useEffect(() => {
    if (Array.isArray(areasData) && areasData.length > 0) {
      setLocalAreasData(areasData);
    }
  }, [areasData]);

  // Fetch live fresh data directly on mount or when event changes
  const fetchFreshData = useCallback(async (eventId) => {
    try {
      setLoadingData(true);
      const res = await officesAPI.getAll().catch(() => []);
      const list = Array.isArray(res) ? res : (res?.data || []);
      setLocalOffices(list);

      if (eventId && eventId !== 'all') {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        let areas = [];
        try {
          const aRes = await axios.get(`${API_BASE_URL}/api/areas/event/${eventId}`, { headers });
          areas = aRes.data?.data || aRes.data || [];
        } catch {
          areas = await areasAPI.getAll().catch(() => []);
        }

        let allCriteria = [];
        try {
          const cRes = await axios.get(`${API_BASE_URL}/api/criteria/event/${eventId}`, { headers });
          allCriteria = cRes.data?.data || cRes.data || [];
        } catch {
          allCriteria = [];
        }

        const criteriaWithReqs = await Promise.all(
          allCriteria.map(async (crit) => {
            const critId = crit.CriteriaID || crit.id;
            let reqs = [];
            try {
              const rRes = await axios.get(`${API_BASE_URL}/api/requirements/criteria/${critId}`, { headers });
              reqs = rRes.data?.data || rRes.data || [];
            } catch {
              reqs = [];
            }
            return { ...crit, requirements: reqs, children: [] };
          })
        );

        // Build criteria hierarchy (parent -> children)
        const criteriaMap = {};
        criteriaWithReqs.forEach(c => {
          const cId = String(c.CriteriaID || c.id);
          criteriaMap[cId] = c;
        });

        const topLevelCriteria = [];
        criteriaWithReqs.forEach(c => {
          const parentId = c.ParentCriteriaID ? String(c.ParentCriteriaID) : null;
          if (parentId && criteriaMap[parentId]) {
            if (!c.AreaID && criteriaMap[parentId].AreaID) {
              c.AreaID = criteriaMap[parentId].AreaID;
            }
            criteriaMap[parentId].children.push(c);
          } else {
            topLevelCriteria.push(c);
          }
        });

        const groupedAreas = (Array.isArray(areas) ? areas : []).map(a => {
          const aId = String(a.AreaID || a.id);
          const crits = topLevelCriteria.filter(c => String(c.AreaID || c.area_id) === aId);
          return { ...a, criteria: crits };
        });

        setLocalAreasData(groupedAreas);
      }
    } catch (err) {
      console.error('Failed to load fresh modal data:', err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchFreshData(selectedEventId);
  }, [selectedEventId, fetchFreshData]);

  const formatDateString = (dateStr) => {
    if (!dateStr) return 'Aug 24, 2026';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Aug 24, 2026';
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Aug 24, 2026';
    }
  };

  // Filter offices
  const filteredOffices = useMemo(() => {
    let list = localOffices || [];

    // Filter by selected event ID if provided
    if (selectedEventId && selectedEventId !== 'all') {
      list = list.filter(o => {
        const evId = String(o.event_id || o.EventID || '');
        return evId === String(selectedEventId);
      });
    }

    if (activeOfficeTab === 'Programs') {
      list = list.filter(o =>
        o.entity_type_id === 1 ||
        String(o.category_name || o.TypeName || '').toLowerCase().includes('program') ||
        String(o.office_type_name || o.office_type || '').toLowerCase().includes('academic')
      );
    } else if (activeOfficeTab === 'Offices') {
      list = list.filter(o =>
        o.entity_type_id === 2 ||
        String(o.category_name || o.TypeName || '').toLowerCase().includes('office') ||
        String(o.office_type_name || o.office_type || '').toLowerCase().includes('non-academic')
      );
    }

    const q = officeSearch.trim().toLowerCase();
    if (!q) return list;

    return list.filter(o => {
      const name = String(o.OfficeName || o.office_name || '').toLowerCase();
      const dept = String(o.department_name || o.DepartmentCode || '').toLowerCase();
      return name.includes(q) || dept.includes(q);
    });
  }, [offices, selectedEventId, activeOfficeTab, officeSearch]);

  // Office Selection Handlers
  const toggleOffice = (officeId) => {
    setSelectedOfficeIds(prev => {
      const next = new Set(prev);
      if (next.has(officeId)) next.delete(officeId);
      else next.add(officeId);
      return next;
    });
  };

  const toggleAllOffices = () => {
    const allFilteredIds = filteredOffices.map(o => Number(o.OfficeID || o.id));
    const allSelected = allFilteredIds.every(id => selectedOfficeIds.has(id));

    setSelectedOfficeIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        allFilteredIds.forEach(id => next.delete(id));
      } else {
        allFilteredIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  // Requirement Selection Handlers
  const toggleRequirement = (reqId) => {
    setSelectedRequirementIds(prev => {
      const next = new Set(prev);
      if (next.has(reqId)) next.delete(reqId);
      else next.add(reqId);
      return next;
    });
  };

  const getAllReqIdsForCriteria = (criteria) => {
    const ids = (criteria.requirements || []).map(r => Number(r.id || r.RequirementID));
    (criteria.children || []).forEach(child => {
      ids.push(...getAllReqIdsForCriteria(child));
    });
    return ids;
  };

  const toggleAreaAll = (area) => {
    const reqIds = [];
    (area.criteria || []).forEach(c => {
      reqIds.push(...getAllReqIdsForCriteria(c));
    });

    if (reqIds.length === 0) return;
    const allSelected = reqIds.every(id => selectedRequirementIds.has(id));
    setSelectedRequirementIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        reqIds.forEach(id => next.delete(id));
      } else {
        reqIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const toggleCriteriaAll = (criteria) => {
    const reqIds = getAllReqIdsForCriteria(criteria);
    if (reqIds.length === 0) return;
    const allSelected = reqIds.every(id => selectedRequirementIds.has(id));

    setSelectedRequirementIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        reqIds.forEach(id => next.delete(id));
      } else {
        reqIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const toggleExpandArea = (areaId) => {
    setExpandedAreas(prev => {
      const next = new Set(prev);
      if (next.has(areaId)) next.delete(areaId);
      else next.add(areaId);
      return next;
    });
  };

  const toggleExpandCriteria = (critId) => {
    setExpandedCriteria(prev => {
      const next = new Set(prev);
      if (next.has(critId)) next.delete(critId);
      else next.add(critId);
      return next;
    });
  };

  const handleSubmit = () => {
    if (selectedOfficeIds.size === 0 || selectedRequirementIds.size === 0) return;
    if (onAssign) {
      onAssign(Array.from(selectedOfficeIds), Array.from(selectedRequirementIds));
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-slate-50/40 font-sans">
      {/* Header - Fixed in position */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight uppercase">Assign Evidence to Offices</h2>
              {events && events.length > 0 && (
                <div className="flex items-center gap-1.5 min-w-[200px]">
                  <CustomSelect
                    size="sm"
                    value={selectedEventId || ''}
                    onChange={(val) => {
                      if (val) {
                        localStorage.setItem('acc_selected_event_id', String(val));
                        localStorage.setItem('selected_audit_event_id', String(val));
                      }
                      if (onSelectEvent) onSelectEvent(val);
                    }}
                    options={events.map(ev => ({
                      value: String(ev.EventID || ev.id),
                      label: ev.EventCode || ev.EventName
                    }))}
                    placeholder="Select accreditation"
                  />
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium">Select programs or offices on the left and assign evidence items on the right.</p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Main Grid Content */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4 min-h-0">
        {/* Left Panel: Programs and Offices Checklist */}
        <div className="w-80 md:w-96 flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden shrink-0 shadow-2xs min-h-0">
          <div className="p-3.5 border-b border-slate-200 bg-white">
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search programs and offices..."
                value={officeSearch}
                onChange={(e) => setOfficeSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-3 text-xs font-semibold">
                {['All', 'Programs', 'Offices'].map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveOfficeTab(tab)}
                    className={`transition-colors cursor-pointer ${activeOfficeTab === tab ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Select All */}
              <button
                type="button"
                onClick={toggleAllOffices}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors"
              >
                Select All
              </button>
            </div>
          </div>

          {/* List of Offices with Checkboxes */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-slate-50/50">
            {filteredOffices.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                {loadingData ? (
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span>Loading programs & offices...</span>
                  </div>
                ) : (
                  <span>No programs or offices found.</span>
                )}
              </div>
            ) : (
              filteredOffices.map((office) => {
                const officeId = Number(office.OfficeID || office.id);
                const isSelected = selectedOfficeIds.has(officeId);
                const isAcademic = office.entity_type_id === 1 ||
                  String(office.category_name || office.TypeName || office.office_type || '').toLowerCase().includes('academic') ||
                  String(office.category_name || office.TypeName || office.office_type || '').toLowerCase().includes('program');

                return (
                  <div
                    key={officeId}
                    onClick={() => toggleOffice(officeId)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 bg-white ${isSelected
                        ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300'
                      }`}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOffice(officeId)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 cursor-pointer"
                    />

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 border ${isAcademic ? 'bg-cyan-50 text-cyan-600 border-cyan-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          }`}>
                          {isAcademic ? <GraduationCap className="h-3.5 w-3.5" /> : <Building2 className="h-3.5 w-3.5" />}
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {office.OfficeName || office.office_name}
                        </h4>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-2 pt-1.5 border-t border-slate-100 text-[10px] text-slate-500">
                        <div>
                          <span className="block font-semibold uppercase text-[8px] text-slate-400">CREATED</span>
                          <span>{formatDateString(office.created_at || office.CreatedAt)}</span>
                        </div>
                        <div>
                          <span className="block font-semibold uppercase text-[8px] text-slate-400">UPDATED</span>
                          <span>{formatDateString(office.updated_at || office.UpdatedAt)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-50 text-blue-700">
                          {isAcademic ? 'Academic Program' : 'Office'}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">
                          {office.department_name || office.DepartmentCode || 'SSLATE'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Areas, Criteria, Requirements Checklist Tree */}
        <div className="flex-1 flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs min-w-0 min-h-0">
          <div className="p-3.5 border-b border-slate-200 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search loaded hierarchy..."
                value={requirementSearch}
                onChange={(e) => setRequirementSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
              />
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/30">
            {localAreasData.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center text-slate-400 text-xs gap-2">
                {loadingData ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    <span>Loading evidence structure...</span>
                  </>
                ) : (
                  <span>No evidence hierarchy found for this accreditation.</span>
                )}
              </div>
            ) : (
              localAreasData.map((area) => {
                const areaId = area.id || area.AreaID;
                const isExpanded = expandedAreas.has(areaId);
                const criteriaList = area.criteria || [];
                const areaCode = area.AreaCode || area.code || '';
                const areaName = area.AreaName || area.name || area.title || 'Area';

                const allAreaReqIds = [];
                criteriaList.forEach(c => (c.requirements || []).forEach(r => allAreaReqIds.push(Number(r.id || r.RequirementID))));
                const isAreaAllSelected = allAreaReqIds.length > 0 && allAreaReqIds.every(id => selectedRequirementIds.has(id));

                return (
                  <div key={areaId} className="rounded-xl border border-blue-200 bg-white overflow-hidden shadow-2xs">
                    {/* Area Banner */}
                    <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white select-none">
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isAreaAllSelected}
                          onChange={() => toggleAreaAll(area)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 rounded border-white/40 text-blue-600 focus:ring-blue-400 cursor-pointer"
                        />
                        <span className="text-xs font-semibold bg-white/20 px-2 py-0.5 rounded text-white uppercase">AREA</span>
                        <h3
                          onClick={() => toggleExpandArea(areaId)}
                          className="text-xs font-bold text-white truncate cursor-pointer hover:underline"
                        >
                          {areaCode ? `${areaCode} - ${areaName}` : areaName}
                        </h3>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleExpandArea(areaId)}
                        className="p-1 text-white/80 hover:text-white rounded"
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </div>

                    {/* Criteria List */}
                    {isExpanded && (
                      <div className="p-3 space-y-2 bg-slate-50 border-t border-blue-100">
                        {criteriaList.map((crit) => {
                          const critId = crit.id || crit.CriteriaID;
                          const isCritExpanded = expandedCriteria.has(critId);
                          const reqs = crit.requirements || [];
                          const critCode = crit.CriteriaCode || crit.code || '';
                          const critName = crit.CriteriaName || crit.name || crit.title || 'Criteria';

                          const critChildren = crit.children || [];
                          const allCritReqIds = getAllReqIdsForCriteria(crit);
                          const isCritAllSelected = allCritReqIds.length > 0 && allCritReqIds.every(id => selectedRequirementIds.has(id));

                          return (
                            <div key={critId} className="rounded-xl border border-amber-200 bg-white overflow-hidden shadow-2xs transition-all">
                              <div className="flex items-center justify-between px-3 py-2.5 bg-amber-50/80 border-b border-amber-200/80 select-none hover:bg-amber-100/60 transition-colors">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isCritAllSelected}
                                    onChange={() => toggleCriteriaAll(crit)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-3.5 w-3.5 rounded border-amber-400 text-amber-600 focus:ring-amber-500/30 cursor-pointer"
                                  />
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-amber-600 text-white shrink-0 shadow-2xs">
                                    CRITERIA
                                  </span>
                                  <span
                                    onClick={() => toggleExpandCriteria(critId)}
                                    className="text-xs font-bold text-slate-800 truncate cursor-pointer hover:text-amber-700"
                                  >
                                    {critCode ? `${critCode}. ${critName}` : critName}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => toggleExpandCriteria(critId)}
                                  className="text-amber-600 hover:text-amber-800 p-0.5 rounded hover:bg-amber-200/50 transition-colors"
                                >
                                  {isCritExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </button>
                              </div>

                              {/* Criteria Contents: Direct Requirements & Subcriteria */}
                              {isCritExpanded && (
                                <div className="p-2.5 space-y-2.5 bg-white border-t border-slate-100">
                                  {/* Direct Requirements */}
                                  {reqs.length > 0 && (
                                    <div className="space-y-1.5">
                                      {reqs.map((req) => {
                                        const reqId = Number(req.id || req.RequirementID);
                                        const isReqSelected = selectedRequirementIds.has(reqId);
                                        const reqCode = req.RequirementCode || req.code || req.req_code || `Req #${reqId}`;
                                        const reqTitle = req.RequirementTitle || req.Title || req.title || req.RequirementName || req.description || req.Description || '';

                                        return (
                                          <div
                                            key={reqId}
                                            onClick={() => toggleRequirement(reqId)}
                                            className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer ${isReqSelected
                                                ? 'border-blue-400 bg-blue-50/40 text-blue-950'
                                                : 'border-slate-100 hover:border-slate-300 bg-slate-50/40'
                                              }`}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isReqSelected}
                                              onChange={() => toggleRequirement(reqId)}
                                              onClick={(e) => e.stopPropagation()}
                                              className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 cursor-pointer"
                                            />
                                            <div className="text-xs min-w-0">
                                              <span className="font-bold block mb-0.5">
                                                {reqCode}
                                              </span>
                                              {reqTitle && (
                                                <p className="text-slate-600 text-[11px] leading-relaxed">
                                                  {reqTitle}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Sub-criteria (Children) */}
                                  {critChildren.length > 0 && (
                                    <div className="space-y-2 pt-1">
                                      {critChildren.map((subCrit) => {
                                        const subCritId = subCrit.id || subCrit.CriteriaID;
                                        const isSubCritExpanded = expandedCriteria.has(subCritId);
                                        const subReqs = subCrit.requirements || [];
                                        const subCritCode = subCrit.CriteriaCode || subCrit.code || '';
                                        const subCritName = subCrit.CriteriaName || subCrit.name || subCrit.title || 'Sub-Criteria';
                                        const subReqIds = subReqs.map(r => Number(r.id || r.RequirementID));
                                        const isSubAllSelected = subReqIds.length > 0 && subReqIds.every(id => selectedRequirementIds.has(id));

                                        return (
                                          <div key={subCritId} className="rounded-lg border border-blue-200 bg-white overflow-hidden shadow-2xs ml-2">
                                            <div className="flex items-center justify-between px-3 py-2 bg-blue-50/70 border-b border-blue-200/70 select-none hover:bg-blue-100/60 transition-colors">
                                              <div className="flex items-center gap-2 min-w-0">
                                                <input
                                                  type="checkbox"
                                                  checked={isSubAllSelected}
                                                  onChange={() => toggleCriteriaAll(subCrit)}
                                                  onClick={(e) => e.stopPropagation()}
                                                  className="h-3.5 w-3.5 rounded border-blue-400 text-blue-600 focus:ring-blue-500/30 cursor-pointer"
                                                />
                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase bg-blue-600 text-white shrink-0 shadow-2xs">
                                                  SUBCRITERIA
                                                </span>
                                                <span
                                                  onClick={() => toggleExpandCriteria(subCritId)}
                                                  className="text-xs font-bold text-slate-800 truncate cursor-pointer hover:text-blue-700"
                                                >
                                                  {subCritCode ? `${subCritCode}. ${subCritName}` : subCritName}
                                                </span>
                                              </div>

                                              <button
                                                type="button"
                                                onClick={() => toggleExpandCriteria(subCritId)}
                                                className="text-blue-600 hover:text-blue-800 p-0.5 rounded hover:bg-blue-200/50 transition-colors"
                                              >
                                                {isSubCritExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                              </button>
                                            </div>

                                            {/* Sub-criteria Requirements */}
                                            {isSubCritExpanded && (
                                              <div className="p-2 space-y-1.5 bg-slate-50/40">
                                                {subReqs.length === 0 ? (
                                                  <p className="text-[11px] text-slate-400 italic px-2 py-1">No evidence in this subcriterion.</p>
                                                ) : (
                                                  subReqs.map((req) => {
                                                    const reqId = Number(req.id || req.RequirementID);
                                                    const isReqSelected = selectedRequirementIds.has(reqId);
                                                    const reqCode = req.RequirementCode || req.code || req.req_code || `Req #${reqId}`;
                                                    const reqTitle = req.RequirementTitle || req.Title || req.title || req.RequirementName || req.description || req.Description || '';

                                                    return (
                                                      <div
                                                        key={reqId}
                                                        onClick={() => toggleRequirement(reqId)}
                                                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer ${isReqSelected
                                                            ? 'border-blue-500 bg-blue-50/70 text-blue-950 shadow-2xs'
                                                            : 'border-slate-200 hover:border-blue-200 bg-white'
                                                          }`}
                                                      >
                                                        <input
                                                          type="checkbox"
                                                          checked={isReqSelected}
                                                          onChange={() => toggleRequirement(reqId)}
                                                          onClick={(e) => e.stopPropagation()}
                                                          className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 cursor-pointer"
                                                        />
                                                        <div className="text-xs min-w-0">
                                                          <span className="font-bold block mb-0.5">
                                                             {reqCode}
                                                          </span>
                                                          {reqTitle && (
                                                            <p className="text-slate-600 text-[11px] leading-relaxed">
                                                              {reqTitle}
                                                            </p>
                                                          )}
                                                        </div>
                                                      </div>
                                                    );
                                                  })
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {reqs.length === 0 && critChildren.length === 0 && (
                                    <p className="text-[11px] text-slate-400 italic px-2 py-1">No evidence or sub-criteria added yet.</p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }))}
          </div>
        </div>
      </div>

      {/* Fixed Bottom Footer Action Bar */}
      <div className="shrink-0 bg-white border-t border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-lg z-10">
        <p className="text-xs font-semibold text-slate-500">
          Pick offices on the left, then evidence on the right.
        </p>

        <div className="flex items-center gap-3">
          {/* Counters */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200">
              OFFICES <strong className="ml-1 text-slate-900">{selectedOfficeIds.size}</strong>
            </span>
            <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200">
              EVIDENCE <strong className="ml-1 text-slate-900">{selectedRequirementIds.size}</strong>
            </span>
          </div>

          {/* Action Button */}
          <button
            type="button"
            disabled={saving || selectedOfficeIds.size === 0 || selectedRequirementIds.size === 0}
            onClick={handleSubmit}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 ${selectedOfficeIds.size > 0 && selectedRequirementIds.size > 0 && !saving
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer active:scale-98'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
              }`}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Assigning...</span>
              </>
            ) : (
              <span>Assign to offices</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
