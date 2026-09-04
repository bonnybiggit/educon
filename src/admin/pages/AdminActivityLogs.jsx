import { useEffect, useState } from 'react';
import { ClipboardList, RefreshCcw } from 'lucide-react';
import { getActivityLogs } from '../../services/adminApi';

const formatDate = (value) => {
  const date = new Date(value);
  return !value || Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

const AdminActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    setError('');
    const result = await getActivityLogs();
    if (result.success) {
      setLogs(result.data?.logs || []);
    } else {
      setError(result.message || 'Unable to load activity logs.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary-700">Super Admin</p>
          <h1 className="font-display text-3xl font-bold text-slate-950">Activity Logs</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">Review security-sensitive admin actions.</p>
        </div>
        <button type="button" onClick={loadLogs} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh
        </button>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-64 items-center justify-center text-sm font-medium text-slate-500"><RefreshCcw className="mr-2 h-4 w-4 animate-spin" />Loading activity...</div>
        ) : logs.length === 0 ? (
          <div className="min-h-64 p-8 text-center">
            <ClipboardList className="mx-auto h-10 w-10 text-slate-400" />
            <h2 className="mt-4 text-lg font-bold text-slate-900">No activity logs yet.</h2>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr><th className="px-5 py-3">Time</th><th className="px-5 py-3">Actor</th><th className="px-5 py-3">Action</th><th className="px-5 py-3">Resource</th><th className="px-5 py-3">Details</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {logs.map((log) => (
                  <tr key={log.id} className="align-top hover:bg-slate-50">
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">{formatDate(log.createdAt)}</td>
                    <td className="px-5 py-4"><p className="font-medium text-slate-900">{log.actorEmail || 'System'}</p><p className="break-all text-xs text-slate-500">{log.adminId || 'No admin id'}</p></td>
                    <td className="px-5 py-4 font-semibold text-slate-900">{log.action}</td>
                    <td className="px-5 py-4 text-slate-600">{log.resource}{log.resourceId ? `:${log.resourceId}` : ''}</td>
                    <td className="max-w-md px-5 py-4 text-xs text-slate-500"><pre className="whitespace-pre-wrap break-words font-mono">{JSON.stringify(log.details || {}, null, 2)}</pre></td>
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
