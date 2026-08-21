import React, { useEffect, useState } from 'react';
import { eventsAPI, usersAPI } from '../../utils/api';
import { API_BASE_URL } from '../../utils/apiBase';

export default function EventTabs({ selectedEventId, onChange }) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const userRes = await usersAPI.getLoggedInUser().catch(() => null);
        const currentUser = userRes?.user || userRes?.data || userRes;
        const isAuditor = Number(currentUser?.RoleID) === 4 || 
                          String(currentUser?.RoleName || '').toLowerCase().includes('auditor') || 
                          Boolean(currentUser?.isExternalAuditor);

        let assignedEventIds = null;
        if (isAuditor && currentUser?.UserID) {
          const token = localStorage.getItem('token');
          const assignRes = await fetch(`${API_BASE_URL}/api/areas/assignments/${currentUser.UserID}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          }).then(r => r.json()).catch(() => null);
          if (assignRes?.success && Array.isArray(assignRes.assignments)) {
            assignedEventIds = new Set(assignRes.assignments.map(a => Number(a.EventID)));
          }
        }

        const res = await eventsAPI.getAllEvents();
        const list = Array.isArray(res) ? res : (res?.data || res?.events || []);
        
        // Filter active events (exclude only explicitly inactive events)
        let active = list.filter(e => {
          const status = String(e.Status || e.status || '').toLowerCase().trim();
          return status !== 'inactive';
        });

        // Auditor Scoping: if user is auditor, only show events they are assigned to!
        if (isAuditor && assignedEventIds) {
          active = active.filter(e => assignedEventIds.has(Number(e.EventID || e.id)));
        }

        const toShow = Array.isArray(active) ? active : [];
        if (mounted) setEvents(toShow);

        // If current selectedEventId is not in toShow list (or empty), pick first available
        const currentValid = toShow.some(e => String(e.EventID || e.id) === String(selectedEventId));
        if (!currentValid && toShow.length > 0 && typeof onChange === 'function') {
          onChange(toShow[0].EventID || toShow[0].id || '');
        }
      } catch (err) {
        console.error('Failed to load events for tabs', err);
        if (mounted) setEvents([]);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const handleSelect = (ev) => {
    const id = ev.EventID || ev.id || ev.EventCode || ev.EventName || ev.name || '';
    if (typeof onChange === 'function') onChange(id);
  };

  if (events.length === 0) {
    return (
      <div className="w-full border-b-2 border-slate-300 px-1">
        <div className="text-xs text-slate-500 py-1 italic">No assigned accreditation events</div>
      </div>
    );
  }

  return (
    <div className="w-full border-b-2 border-slate-300 px-1">
      <div className="flex items-end justify-start gap-4 flex-nowrap overflow-x-auto">
        {events.map(ev => {
          const id = ev.EventID || ev.id || ev.EventCode || '';
          const isActive = String(id) === String(selectedEventId);
          const fullName = ev.EventCode || ev.EventName || ev.name || '';
          return (
            <button
              key={id || JSON.stringify(ev)}
              onClick={() => handleSelect(ev)}
              className={`relative -mb-[2px] h-8 whitespace-nowrap border-b-4 px-0.5 text-xs transition-colors ${isActive ? 'border-blue-600 font-medium text-slate-900' : 'border-transparent font-normal text-slate-600 hover:text-slate-800'}`}
            >
              <span>{fullName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
