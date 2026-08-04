import React, { useEffect, useMemo, useRef, useState } from 'react';
import Header from '../Header/header';
import AddMasterListModal from './AddMasterListModal';

const initialItems = [
  { id: 1, name: 'BSIT', type: 'Academic Program', department: 'SBIT', status: 'Active', description: 'Bachelor of Science in Information Technology' },
  { id: 2, name: 'BSCS', type: 'Academic Program', department: 'SBIT', status: 'Active', description: 'Bachelor of Science in Computer Science' },
  { id: 3, name: 'BSIS', type: 'Academic Program', department: 'SBIT', status: 'Active', description: 'Bachelor of Science in Information Systems' },
  { id: 4, name: 'Registrar', type: 'Non-Academic Office', department: null, status: 'Active', description: 'Institution-wide academic records office' },
  { id: 5, name: 'Library', type: 'Non-Academic Office', department: null, status: 'Active', description: 'Central learning resource center' },
  { id: 6, name: 'Clinic', type: 'Non-Academic Office', department: null, status: 'Inactive', description: 'Student wellness and health services' },
  { id: 7, name: 'BSEd', type: 'Academic Program', department: 'SSLATE', status: 'Active', description: 'Bachelor of Secondary Education' },
  { id: 8, name: 'HR Office', type: 'Non-Academic Office', department: null, status: 'Active', description: 'Human resource and personnel services' },
];

const departments = [
  { id: 1, name: 'SBIT' },
  { id: 2, name: 'SHTM' },
  { id: 3, name: 'SARFAID' },
  { id: 4, name: 'SSLATE' },
  { id: 5, name: 'IBED' },
];

const ITEMS_PER_PAGE = 30;

export default function MasterList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [sortStatus, setSortStatus] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [deleteMode, setDeleteMode] = useState(false);
  const [notice, setNotice] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const headerRef = useRef(null);
  const controlsRef = useRef(null);
  const [contentHeight, setContentHeight] = useState(null);

  useEffect(() => {
    const updateContentHeight = () => {
      const headerH = headerRef.current ? headerRef.current.offsetHeight : 0;
      const controlsH = controlsRef.current ? controlsRef.current.offsetHeight : 0;
      const gap = 16;
      const h = Math.max(240, window.innerHeight - headerH - controlsH - gap);
      setContentHeight(h);
    };

    updateContentHeight();
    const rafId = requestAnimationFrame(() => updateContentHeight());
    window.addEventListener('resize', updateContentHeight);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateContentHeight);
    };
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, departmentFilter, sortStatus]);

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = initialItems.filter((item) => {
      const matchesSearch = !term || item.name.toLowerCase().includes(term) || item.type.toLowerCase().includes(term) || (item.description || '').toLowerCase().includes(term);
      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      const matchesDepartment = departmentFilter === 'all' || item.department === departments.find((d) => String(d.id) === departmentFilter)?.name;
      const matchesStatus = sortStatus === 'all' || item.status === sortStatus;
      return matchesSearch && matchesType && matchesDepartment && matchesStatus;
    });

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [departmentFilter, searchTerm, sortStatus, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleAddItem = (newItem) => {
    const nextItem = {
      id: Date.now(),
      ...newItem,
    };

    initialItems.unshift(nextItem);
    setNotice(`${newItem.name} added to master list.`);
    setCurrentPage(1);
    setShowAddModal(false);
  };

  return (
    <div className="w-full h-screen flex flex-col bg-app">
      <div ref={headerRef} style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'transparent' }}>
        <Header />
      </div>

      <div className="flex flex-col gap-0 px-4 pt-6 pb-0" style={{ marginTop: headerRef.current ? headerRef.current.offsetHeight : 0 }}>
        <div className="flex items-start justify-between gap-2">
          <div ref={controlsRef}>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">Master List</h1>
            <p className="text-xs text-gray-600">{deleteMode ? ' ' : 'Manage your reusable academic programs and non-academic offices.'}</p>
          </div>
          <div className="flex items-center gap-1 pt-0.5">
            {deleteMode && (
              <button
                type="button"
                className="ml-2 inline-flex h-8 items-center rounded-lg border px-3 text-[11px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-red-400 bg-red-600 text-white hover:bg-red-700"
              >
                Delete Selected (0)
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (deleteMode) {
                  setDeleteMode(false);
                  return;
                }
                setDeleteMode(true);
              }}
              className={`inline-flex h-8 items-center rounded-lg border px-3 text-[11px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-red-400 ${
                deleteMode
                  ? 'border-red-300 bg-red-100 text-red-700 hover:bg-red-200'
                  : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
              }`}
            >
              {deleteMode ? 'Cancel Delete' : 'Delete'}
            </button>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-[11px] font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <span className="text-sm leading-none">+</span>
              Add
            </button>
          </div>
        </div>

        {notice ? (
          <div className="mt-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-[11px] text-cyan-700">
            {notice}
          </div>
        ) : null}

        <div className="flex w-full items-center justify-between gap-1 mt-2">
          <div className="relative w-full max-w-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="text"
              placeholder="Search master list..."
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-[9px] text-slate-700 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-cyan-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1">
            <div className="flex items-center gap-2 mr-2">
              <div className="relative inline-flex">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-8 min-w-[146px] appearance-none rounded-md border border-slate-200 bg-white px-4 text-center text-[10px] font-medium leading-4 text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  style={{ textAlignLast: 'center' }}
                >
                  <option value="all">All Types</option>
                  <option value="Academic Program">Academic Program</option>
                  <option value="Non-Academic Office">Non-Academic Office</option>
                </select>
                <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute right-2.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                </svg>
              </div>

              <div className="relative inline-flex">
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="h-8 min-w-[146px] appearance-none rounded-md border border-slate-200 bg-white px-4 text-center text-[10px] font-medium leading-4 text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  style={{ textAlignLast: 'center' }}
                >
                  <option value="all">All Departments</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
                <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute right-2.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                </svg>
              </div>

              <div className="relative inline-flex">
                <select
                  value={sortStatus}
                  onChange={(e) => setSortStatus(e.target.value)}
                  className="h-8 min-w-[146px] appearance-none rounded-md border border-slate-200 bg-white px-4 text-center text-[10px] font-medium leading-4 text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  style={{ textAlignLast: 'center' }}
                >
                  <option value="all">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute right-2.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            <div className="flex h-9 items-center justify-end gap-1">
              <div className="flex h-7 items-center gap-0.5 rounded-md border border-slate-200 bg-slate-100 p-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                  title="Grid View"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${viewMode === 'list' ? 'bg-white text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                  title="List View"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 px-4 pt-6 pb-6" style={{ marginTop: 0, height: contentHeight ? `${contentHeight}px` : undefined }}>
        {viewMode === 'list' ? (
          <div className="flex h-full flex-col">
            <div className="px-0">
              <div className="hidden md:grid grid-cols-[minmax(140px,1fr)_180px_180px_120px] gap-6 px-6 py-3 mb-1 bg-white border border-slate-200 rounded-xl shadow-sm text-xs font-semibold text-gray-700 w-full">
                <div className="flex items-center">Name</div>
                <div className="flex items-center justify-center">Type</div>
                <div className="flex items-center justify-center">Department</div>
                <div className="flex items-center justify-center">Status</div>
              </div>
            </div>

            <div className="flex-1 min-h-0 px-0 pb-6 overflow-y-auto" style={{ marginTop: 0 }}>
              <div className="relative z-10">
                <div className="space-y-2">
                  {filteredItems.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 text-sm text-slate-500 shadow-sm">No items match your current filters.</div>
                  ) : (
                    paginatedItems.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:border-indigo-200 hover:shadow-md"
                      >
                        <div className="grid grid-cols-[minmax(140px,1fr)_180px_180px_120px] items-center gap-6 px-6 py-4">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900 truncate">{item.name}</div>
                            <div className="mt-0.5 text-xs text-slate-500">{item.description}</div>
                          </div>
                          <div className="flex items-center justify-center">
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                              {item.type}
                            </span>
                          </div>
                          <div className="flex items-center justify-center text-sm text-slate-700">{item.department ?? '—'}</div>
                          <div className="flex items-center justify-center">
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${item.status === 'Active' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                              <span className={`h-2 w-2 rounded-full ${item.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                              {item.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="h-6 md:h-12" aria-hidden="true" />
              </div>
            </div>

            {filteredItems.length > ITEMS_PER_PAGE ? (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className="text-xs text-slate-500">
                  Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredItems.length)} of {filteredItems.length}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={safePage === 1}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-[11px] font-semibold text-slate-700">
                    Page {safePage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={safePage === totalPages}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredItems.length === 0 ? (
                <div className="col-span-full rounded-2xl border border-slate-200 bg-white px-6 py-8 text-sm text-slate-500 shadow-sm">No items match your current filters.</div>
              ) : (
                paginatedItems.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800">{item.name}</h3>
                        <p className="mt-1 text-[11px] text-slate-500">{item.description}</p>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ${item.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-600">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium">{item.type}</span>
                      <span>{item.department ?? 'Institution-wide'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <AddMasterListModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddItem}
        departments={departments}
      />
    </div>
  );
}
