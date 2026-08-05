import React, { useEffect, useState } from 'react';

export default function AddMasterListModal({ isOpen, onClose, onSubmit, departments = [] }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('Academic Program');
  const [departmentId, setDepartmentId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setName('');
    setType('Academic Program');
    setDepartmentId('');
    setLoading(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const isAcademic = type === 'Academic Program';

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!name.trim()) return;

    if (isAcademic && !departmentId) return;

    setLoading(true);

    try {
      await onSubmit?.({
        name: name.trim(),
        type,
        entityTypeId: isAcademic ? 1 : 2,
        departmentId: isAcademic ? departmentId : null,
      });
      onClose?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[50] flex items-center justify-center bg-black/50 px-4">
      <div className="mx-4 w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Add Master List Item</h2>
            <p className="mt-1 text-sm text-gray-500">Create a new academic program or non-academic office entry.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 transition hover:text-gray-600 disabled:opacity-50"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-10 w-full rounded-md border border-gray-300 bg-white px-4 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. BSIT"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Type *</label>
            <div className="relative">
              <select
                value={type}
                onChange={(event) => {
                  setType(event.target.value);
                  if (event.target.value !== 'Academic Program') {
                    setDepartmentId('');
                  }
                }}
                className="h-10 w-full appearance-none rounded-md border border-gray-300 bg-white px-4 pr-10 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Academic Program">Academic Program</option>
                <option value="Non-Academic Office">Non-Academic Office</option>
              </select>
              <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-slate-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

          {isAcademic && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Department *</label>
              <div className="relative">
                <select
                  value={departmentId}
                  onChange={(event) => setDepartmentId(event.target.value)}
                  className="h-10 w-full appearance-none rounded-md border border-gray-300 bg-white px-4 pr-10 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required={isAcademic}
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={String(dept.id)}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-slate-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          )}


          <div className="flex justify-end gap-3 border-t border-slate-200 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
