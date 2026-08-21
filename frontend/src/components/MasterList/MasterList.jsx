import React, { useEffect, useMemo, useRef, useState } from 'react';
import AddMasterListModal from './AddMasterListModal';
import EditMasterListModal from './EditMasterListModal';
import Pagination from '../Pagination/Pagination';
import NotificationToast from '../Notification/NotificationToast';
import { departmentsAPI, masterlistAPI, usersAPI } from '../../utils/api';
import { formatDateTime } from '../../utils/formatDateTime';

const DEFAULT_DEPARTMENTS = [];

const ITEMS_PER_PAGE = 9;

export default function MasterList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [deleteMode, setDeleteMode] = useState(false);
  const [notice, setNotice] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [items, setItems] = useState([]);
  const [departments, setDepartments] = useState(DEFAULT_DEPARTMENTS);
  const [loadingItems, setLoadingItems] = useState(true);
  const [isNoticeVisible, setIsNoticeVisible] = useState(false);
  const headerRef = useRef(null);
  const controlsRef = useRef(null);
  const [contentHeight, setContentHeight] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const dotBtnRefs = useRef({});

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await usersAPI.getLoggedInUser();
        if (response?.success) setCurrentUser(response.user);
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };
    fetchCurrentUser();
  }, []);

  const isAdmin = currentUser?.RoleName === 'admin' || currentUser?.RoleID === 1;

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
    const loadMasterList = async () => {
      try {
        setLoadingItems(true);
        const response = await masterlistAPI.getAll();
        setItems(response.data || response);
      } catch (error) {
        console.error('Failed to load master list items:', error);
        if (error.response?.status === 429) {
          setNotice('Rate limit exceeded (Max 30 requests/min). Please try again later.');
        } else {
          setNotice('Failed to load master list items.');
        }
      } finally {
        setLoadingItems(false);
      }
    };

    const loadDepartments = async () => {
      try {
        const response = await departmentsAPI.getAll();
        setDepartments(response.data || response);
      } catch (error) {
        console.error('Failed to load departments:', error);
      }
    };

    loadMasterList();
    loadDepartments();
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    setIsNoticeVisible(true);
    const hideTimer = window.setTimeout(() => setIsNoticeVisible(false), 1500);
    const clearTimer = window.setTimeout(() => setNotice(''), 1800);
    return () => {
      clearTimeout(hideTimer);
      clearTimeout(clearTimer);
    };
  }, [notice]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, departmentFilter]);

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = items.filter((item) => {
      const matchesSearch = !term || item.name.toLowerCase().includes(term) || item.type.toLowerCase().includes(term) || (item.description || '').toLowerCase().includes(term);
      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      const matchesDepartment = departmentFilter === 'all' || String(item.departmentId ?? '') === departmentFilter;
      return matchesSearch && matchesType && matchesDepartment;
    });

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [items, departmentFilter, searchTerm, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const renderItemIcon = (type) => {
    const isAcademic = type === 'Academic Program';
    if (isAcademic) {
      return (
        <div className="h-9 w-9 rounded-full bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0 border border-cyan-100">
          <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A57.778 57.778 0 0012 13.5" />
          </svg>
        </div>
      );
    }
    return (
      <div className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
        <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 16.5h1.5m3 0H15M9 21v-3a1 1 0 011-1h4a1 1 0 011 1v3" />
        </svg>
      </div>
    );
  };

  const handleAddItem = async (newItem) => {
    try {
      const response = await masterlistAPI.addItem(newItem);
      const addedItem = response.data || response;
      setItems((prev) => [addedItem, ...prev]);
      setNotice(`${newItem.name} added to master list.`);
      setCurrentPage(1);
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to add master list item:', error);
      if (error.response?.status === 429) {
        setNotice('Rate limit exceeded (Max 30 requests/min). Please try again later.');
      } else {
        setNotice('Failed to add item.');
      }
    }
  };

  const handleEditItem = async (updatedFields) => {
    if (!editItem) return;
    try {
      const response = await masterlistAPI.updateItem(editItem.id, updatedFields);
      const updated = response.data || response;
      setItems((prev) => prev.map((i) => (i.id === editItem.id ? updated : i)));
      setNotice(`"${updated.name}" updated successfully.`);
      setEditItem(null);
    } catch (error) {
      console.error('Failed to update master list item:', error);
      setNotice('Failed to update item.');
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await masterlistAPI.deleteItem(deleteTarget.id);
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      setNotice(`"${deleteTarget.name}" deleted successfully.`);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Failed to delete master list item:', error);
      setNotice('Failed to delete item.');
      setDeleteTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col bg-app pb-12">
      <div ref={headerRef} style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'transparent' }}>
</div>

      <NotificationToast title="Notice" message={notice} visible={isNoticeVisible} onDismiss={() => setNotice('')} />

      <div className="flex flex-col gap-0 px-4 pt-6 pb-0" style={{ marginTop: headerRef.current ? headerRef.current.offsetHeight : 0 }}>
        <div className="flex items-start justify-between gap-2">
          <div ref={controlsRef}>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">Master List</h1>
            <p className="text-xs text-gray-600">{deleteMode ? ' ' : 'Manage your reusable academic programs and non-academic offices.'}</p>
          </div>
          {isAdmin && (
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
                className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-[11px] font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <span className="text-sm leading-none">+</span>
                Add
              </button>
            </div>
          )}
        </div>

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
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-[9px] text-slate-700 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                  className="h-8 min-w-[146px] appearance-none rounded-md border border-slate-200 bg-white px-4 text-center text-[10px] font-medium leading-4 text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                  className="h-8 min-w-[146px] appearance-none rounded-md border border-slate-200 bg-white px-4 text-center text-[10px] font-medium leading-4 text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  style={{ textAlignLast: 'center' }}
                >
                  <option value="all">All Departments</option>
                  {departments.map((department) => (
                    <option key={department.id} value={String(department.id)}>
                      {department.name}
                    </option>
                  ))}
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

      <div className="w-full px-4 pt-6 pb-6" style={{ marginTop: 0 }}>
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

            <div className="w-full px-0 pb-6" style={{ marginTop: 0 }}>
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
                        <div className="grid grid-cols-[minmax(140px,1fr)_180px_180px_120px] items-center gap-6 px-5 py-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-3">
                              {renderItemIcon(item.type)}
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-slate-900 truncate">{item.name}</div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-center">
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                              item.type === 'Academic Program'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {item.type}
                            </span>
                          </div>
                          <div className="flex items-center justify-center text-sm text-slate-700">{item.department ?? '—'}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="h-6 md:h-12" aria-hidden="true" />
              </div>
            </div>

            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={(page) => setCurrentPage(page)}
              fixed={true}
              showWhenSinglePage={true}
            />
          </div>
        ) : (
          <div className="w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredItems.length === 0 ? (
                <div className="col-span-full rounded-2xl border border-slate-200 bg-white px-5 py-6 text-sm text-slate-500 shadow-sm">No items match your current filters.</div>
              ) : (
                paginatedItems.map((item) => (
                  <div key={item.id} className="relative rounded-2xl border border-slate-200 bg-white px-4 py-5 shadow-sm transition hover:shadow-md min-h-[175px] flex flex-col justify-between">
                    {/* 3-dot button & options popup (Admin only) */}
                    {isAdmin && (
                      <>
                        <button
                          ref={(el) => { dotBtnRefs.current[item.id] = el; }}
                          type="button"
                          className="absolute top-3 right-3 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 focus:outline-none"
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId((prev) => (prev === item.id ? null : item.id)); }}
                          aria-label="More options"
                        >
                          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="5" r="1.5" />
                            <circle cx="12" cy="12" r="1.5" />
                            <circle cx="12" cy="19" r="1.5" />
                          </svg>
                        </button>

                        {openMenuId === item.id && (
                          <div
                            className="absolute right-3 top-11 z-50 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition whitespace-nowrap"
                              onClick={() => { setEditItem(item); setOpenMenuId(null); }}
                            >
                              <svg className="h-4 w-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              <span>Edit Item</span>
                            </button>
                            <button
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 transition whitespace-nowrap"
                              onClick={() => { setDeleteTarget(item); setOpenMenuId(null); }}
                            >
                              <svg className="h-4 w-4 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
                              </svg>
                              <span>Delete Item</span>
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    <div className="flex items-start gap-3 pr-8">
                        {renderItemIcon(item.type)}
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-800 truncate">{item.name}</h3>
                        <p className="mt-1 text-[11px] text-slate-500 truncate">{item.department ?? 'Institution-wide'}</p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] text-slate-500">
                      <div>
                        <span className="block font-semibold uppercase tracking-wide text-slate-400">Created</span>
                        <span className="text-slate-700">{formatDateTime(item.created_at)}</span>
                      </div>
                      <div>
                        <span className="block font-semibold uppercase tracking-wide text-slate-400">Updated</span>
                        <span className="text-slate-700">{formatDateTime(item.updated_at || item.created_at)}</span>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-600">
                      <span className={`rounded-full border px-2.5 py-1 font-medium ${
                        item.type === 'Academic Program'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {item.type}
                      </span>
                      <span>{item.department ?? 'Institution-wide'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={(page) => setCurrentPage(page)}
              fixed={true}
              showWhenSinglePage={true}
            />
          </div>
        )}
      </div>

      <AddMasterListModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddItem}
        departments={departments}
      />

      <EditMasterListModal
        isOpen={!!editItem}
        onClose={() => setEditItem(null)}
        onSubmit={handleEditItem}
        item={editItem}
        departments={departments}
      />

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Confirm</h3>
            <p className="mt-2 text-sm text-slate-600">
              Delete <span className="font-semibold">&ldquo;{deleteTarget.name}&rdquo;</span>? This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteItem}
                disabled={deleteLoading}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting...' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
