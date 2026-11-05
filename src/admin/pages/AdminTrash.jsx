import { useCallback, useEffect, useState } from 'react';
import { RefreshCcw, RotateCcw, Trash2 } from 'lucide-react';
import { deleteTrashItemPermanently, emptyTrash, getTrash, restoreTrashItem } from '../../services/adminApi';
import { canPermanentlyDelete } from '../permissions';

const formatDate = (value) => {
  const date = new Date(value);
  return !value || Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

const inputClass = 'h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm';
const emptyFilters = { type: '', search: '', deletedFrom: '', deletedTo: '', deletedBy: '', maxDaysRemaining: '' };

const AdminTrash = ({ admin }) => {
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], categories: [], deletedByOptions: [], pagination: { total: 0, totalPages: 1 }, retentionDays: 30 });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [emptyText, setEmptyText] = useState('');
  const superAdmin = canPermanentlyDelete(admin);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const result = await getTrash({ ...filters, page });
    if (result.success) setData(result.data);
    else setError(result.message || 'Unable to load Trash.');
    setLoading(false);
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  const updateFilter = (name, value) => {
    setPage(1);
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const run = async (id, action, success) => {
    setBusyId(id);
    setError('');
    setNotice('');
    const result = await action();
    if (result.success) {
      setNotice(success);
      await load();
    } else {
      setError(result.message || 'Action failed.');
    }
    setBusyId('');
  };

  const handleRestore = (item) => {
    if (!window.confirm(`Restore "${item.label}" to ${item.typeLabel}s?`)) return;
    run(item.id, () => restoreTrashItem(item.id), `${item.typeLabel} restored.`);
  };

  const handlePurge = (item) => {
    if (!window.confirm(`Permanently delete "${item.label}"? This cannot be undone.`)) return;
    run(item.id, () => deleteTrashItemPermanently(item.id), 'Item permanently deleted.');
  };

  const handleEmpty = () => {
    setConfirmEmpty(false);
    setEmptyText('');
    run('all', emptyTrash, 'Trash emptied.');
  };

  const { items, categories, deletedByOptions, pagination } = data;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-950">Trash</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Deleted items are kept for {data.retentionDays} days, then removed permanently. Restore an item to return it to its original section.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh
          </button>
          {superAdmin && (
            <button type="button" onClick={() => setConfirmEmpty(true)} disabled={busyId === 'all' || pagination.total === 0} className="inline-flex h-10 items-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50">
              <Trash2 className="h-4 w-4" />Empty Trash
            </button>
          )}
        </div>
      </div>

      {confirmEmpty && superAdmin && (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-4" role="alertdialog" aria-label="Confirm empty Trash">
          <p className="text-sm font-semibold text-rose-800">This permanently deletes everything in Trash and cannot be undone.</p>
          <p className="mt-1 text-sm text-rose-700">Type EMPTY TRASH to confirm.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input aria-label="Type EMPTY TRASH" className={`${inputClass} sm:w-64`} value={emptyText} onChange={(e) => setEmptyText(e.target.value)} autoFocus />
            <button type="button" disabled={emptyText !== 'EMPTY TRASH'} onClick={handleEmpty} className="inline-flex h-10 items-center justify-center rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">Permanently empty Trash</button>
            <button type="button" onClick={() => { setConfirmEmpty(false); setEmptyText(''); }} className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          </div>
        </section>
      )}

      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
        <select aria-label="Category" className={inputClass} value={filters.type} onChange={(e) => updateFilter('type', e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.type} value={c.type}>{c.label} ({c.count})</option>)}
        </select>
        <input aria-label="Search" className={inputClass} placeholder="Search name, email or title" value={filters.search} onChange={(e) => updateFilter('search', e.target.value)} />
        <select aria-label="Deleted by" className={inputClass} value={filters.deletedBy} onChange={(e) => updateFilter('deletedBy', e.target.value)}>
          <option value="">Deleted by anyone</option>
          {deletedByOptions.map((a) => <option key={a.id} value={a.id}>{a.email}</option>)}
        </select>
        <label className="flex items-center gap-2 text-xs font-medium text-slate-500">Deleted from
          <input type="date" className={`${inputClass} flex-1`} value={filters.deletedFrom} onChange={(e) => updateFilter('deletedFrom', e.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-xs font-medium text-slate-500">to
          <input type="date" className={`${inputClass} flex-1`} value={filters.deletedTo} onChange={(e) => updateFilter('deletedTo', e.target.value)} />
        </label>
        <select aria-label="Days remaining" className={inputClass} value={filters.maxDaysRemaining} onChange={(e) => updateFilter('maxDaysRemaining', e.target.value)}>
          <option value="">Any time remaining</option>
          <option value="3">3 days or fewer left</option>
          <option value="7">7 days or fewer left</option>
          <option value="14">14 days or fewer left</option>
        </select>
      </section>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-48 items-center justify-center text-sm font-medium text-slate-500"><RefreshCcw className="mr-2 h-4 w-4 animate-spin" />Loading Trash...</div>
        ) : items.length === 0 ? (
          <div className="min-h-48 p-8 text-center">
            <Trash2 className="mx-auto h-10 w-10 text-slate-400" />
            <h2 className="mt-4 text-lg font-bold text-slate-900">Trash is empty.</h2>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr><th className="px-5 py-3">Item</th><th className="px-5 py-3">Category</th><th className="px-5 py-3">Deleted</th><th className="px-5 py-3">Deleted by</th><th className="px-5 py-3">Days left</th><th className="px-5 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((item) => (
                  <tr key={item.id} className="align-top hover:bg-slate-50">
                    <td className="px-5 py-4"><p className="font-medium text-slate-900">{item.label}</p>{item.subtitle && <p className="break-all text-xs text-slate-500">{item.subtitle}</p>}</td>
                    <td className="px-5 py-4 text-slate-600">{item.typeLabel}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">{formatDate(item.deletedAt)}</td>
                    <td className="px-5 py-4 text-slate-600">{item.deletedBy.email || 'Unknown'}</td>
                    <td className="px-5 py-4 font-semibold text-slate-900">{item.daysRemaining}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      <button type="button" disabled={busyId === item.id || !item.canRestore} onClick={() => handleRestore(item)} className="mr-2 inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                        <RotateCcw className="h-3.5 w-3.5" />Restore
                      </button>
                      {superAdmin && (
                        <button type="button" disabled={busyId === item.id} onClick={() => handlePurge(item)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                          <Trash2 className="h-3.5 w-3.5" />Delete forever
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-50">Previous</button>
          <span>Page {page} of {pagination.totalPages}</span>
          <button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
};

export default AdminTrash;
