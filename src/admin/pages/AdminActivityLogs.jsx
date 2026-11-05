import { useEffect, useState } from 'react';
import { ClipboardList, Eye, EyeOff, RefreshCcw, RotateCcw, Trash2, X } from 'lucide-react';
import { getActivityLogs, getHiddenActivityLogs, hideActivityLogs, restoreActivityLogs } from '../../services/adminApi';

const formatDate = (value) => {
  const date = new Date(value);
  return !value || Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

const buttonClass = 'inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50';

const AdminActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);

  const loadLogs = async (hidden = showHidden) => {
    setLoading(true);
    setError('');
    const result = hidden ? await getHiddenActivityLogs() : await getActivityLogs();
    if (result.success) {
      setLogs(result.data?.logs || []);
    } else {
      setError(result.message || 'Unable to load activity logs.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLogs(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectableLogs = logs.filter((log) => !log.protected);
  const allSelected = selectableLogs.length > 0 && selectableLogs.every((log) => selected.includes(log.id));

  const cancelSelection = () => {
    setSelecting(false);
    setSelected([]);
  };

  const toggleHidden = () => {
    const next = !showHidden;
    setShowHidden(next);
    cancelSelection();
    setNotice('');
    loadLogs(next);
  };

  const toggleOne = (id) => setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  const toggleAll = () => setSelected(allSelected ? [] : selectableLogs.map((log) => log.id));

  const applyChange = async (action, ids, success) => {
    setBusy(true);
    setError('');
    setNotice('');
    const result = await action(ids);
    if (result.success) {
      setNotice(success(result.data));
      cancelSelection();
      await loadLogs();
    } else {
      setError(result.message || 'Action failed.');
    }
    setBusy(false);
  };

  const handleDeleteSelected = () => {
    if (selected.length === 0) return;
    if (!window.confirm(`Delete ${selected.length} selected log${selected.length === 1 ? '' : 's'}? They will be hidden from this table and permanently removed after 90 days. You can restore them from View Hidden until then.`)) return;
    applyChange(hideActivityLogs, selected, (data) => `${data?.hidden ?? selected.length} log(s) hidden.`);
  };

  const handleRestore = (log) => {
    if (!window.confirm('Restore this log to the Activity Logs table?')) return;
    applyChange(restoreActivityLogs, [log.id], () => 'Log restored.');
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary-700">Super Admin</p>
          <h1 className="font-display text-3xl font-bold text-slate-950">{showHidden ? 'Hidden Activity Logs' : 'Activity Logs'}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            {showHidden ? 'Deleted logs are kept for 90 days, then removed permanently. Restore a log to return it to the table.' : 'Review security-sensitive admin actions.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => loadLogs()} className={buttonClass}>
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh
          </button>
          {!showHidden && !selecting && (
            <button type="button" onClick={() => setSelecting(true)} className={buttonClass}><Trash2 className="h-4 w-4" />Delete</button>
          )}
          {!selecting && (
            <button type="button" onClick={toggleHidden} className={buttonClass}>
              {showHidden ? <><ClipboardList className="h-4 w-4" />Back to Logs</> : <><EyeOff className="h-4 w-4" />View Hidden</>}
            </button>
          )}
          {selecting && (
            <>
              <button type="button" onClick={handleDeleteSelected} disabled={busy || selected.length === 0} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50">
                <Trash2 className="h-4 w-4" />Delete Selected ({selected.length})
              </button>
              <button type="button" onClick={cancelSelection} className={buttonClass}><X className="h-4 w-4" />Cancel</button>
            </>
          )}
        </div>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-64 items-center justify-center text-sm font-medium text-slate-500"><RefreshCcw className="mr-2 h-4 w-4 animate-spin" />Loading activity...</div>
        ) : logs.length === 0 ? (
          <div className="min-h-64 p-8 text-center">
            {showHidden ? <Eye className="mx-auto h-10 w-10 text-slate-400" /> : <ClipboardList className="mx-auto h-10 w-10 text-slate-400" />}
            <h2 className="mt-4 text-lg font-bold text-slate-900">{showHidden ? 'No hidden logs.' : 'No activity logs yet.'}</h2>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {selecting && (
                    <th className="w-10 px-5 py-3">
                      <input type="checkbox" aria-label="Select all displayed logs" checked={allSelected} onChange={toggleAll} />
                    </th>
                  )}
                  <th className="px-5 py-3">Time</th><th className="px-5 py-3">Actor</th><th className="px-5 py-3">Action</th><th className="px-5 py-3">Resource</th><th className="px-5 py-3">Details</th>
                  {showHidden && <><th className="px-5 py-3">Deleted</th><th className="px-5 py-3">Days left</th><th className="px-5 py-3 text-right">Actions</th></>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {logs.map((log) => (
                  <tr key={log.id} className="align-top hover:bg-slate-50">
                    {selecting && (
                      <td className="px-5 py-4">
                        <input
                          type="checkbox"
                          aria-label={`Select log ${log.action}`}
                          checked={selected.includes(log.id)}
                          disabled={log.protected}
                          title={log.protected ? 'Protected security record' : undefined}
                          onChange={() => toggleOne(log.id)}
                        />
                      </td>
                    )}
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">{formatDate(log.createdAt)}</td>
                    <td className="px-5 py-4"><p className="font-medium text-slate-900">{log.actorEmail || 'System'}</p><p className="break-all text-xs text-slate-500">{log.adminId || 'No admin id'}</p></td>
                    <td className="px-5 py-4 font-semibold text-slate-900">{log.action}{log.protected && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">Protected</span>}</td>
                    <td className="px-5 py-4 text-slate-600">{log.resource}{log.resourceId ? `:${log.resourceId}` : ''}</td>
                    <td className="max-w-md px-5 py-4 text-xs text-slate-500"><pre className="whitespace-pre-wrap break-words font-mono">{JSON.stringify(log.details || {}, null, 2)}</pre></td>
                    {showHidden && (
                      <>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">{formatDate(log.hiddenAt)}</td>
                        <td className="px-5 py-4 font-semibold text-slate-900">{log.daysRemaining}</td>
                        <td className="whitespace-nowrap px-5 py-4 text-right">
                          <button type="button" disabled={busy} onClick={() => handleRestore(log)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                            <RotateCcw className="h-3.5 w-3.5" />Restore
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminActivityLogs;
