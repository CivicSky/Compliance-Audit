import React, { useEffect, useState } from 'react';
import { eventsAPI } from '../../utils/api';

export default function EventTabs({ selectedEventId, onChange }) {
  const [events, setEvents] = useState([]);
  const [showingAll, setShowingAll] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await eventsAPI.getAllEvents();
        const list = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);
        // filter active events (show only active; do not fallback to all)
        const active = list.filter(e => {
          const status = String(e.Status || e.status || '').toLowerCase();
          // consider 'compiled' as active for compatibility with backend values
          return e.IsActive === true || e.active === true || e.Active === true || status === 'active' || status === 'compiled';
        });
        const toShow = Array.isArray(active) ? active : [];
        if (mounted) setEvents(toShow);
        if (mounted) setShowingAll(false);
        // If no selectedEventId provided, pick first available and emit
        if ((!selectedEventId || selectedEventId === '') && toShow.length > 0 && typeof onChange === 'function') {
          onChange(toShow[0].EventID || toShow[0].id || '');
        }
        console.debug('EventTabs: fetched events', { all: list, activeCount: active.length });
      } catch (err) {
        console.error('Failed to load events for tabs', err);
        if (mounted) setEvents([]);
      }
    };
    load();
    return () => { mounted = false; };
  }, [onChange, selectedEventId]);

  const handleSelect = (ev) => {
    const id = ev.EventID || ev.id || ev.EventCode || ev.EventName || ev.name || '';
    if (typeof onChange === 'function') onChange(id);
  };

  if (events.length === 0) {
    return (
      <div className="w-full border-b-2 border-slate-300 px-1">
        <div className="text-xs text-slate-500">No events available</div>
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
