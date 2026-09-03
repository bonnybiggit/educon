import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, Eye, Inbox, Mail, RefreshCcw, Search, Trash2, X } from 'lucide-react';
import { deleteAdminEnquiry, getAdminEnquiries, getAdminEnquiry, updateAdminEnquiry } from '../../services/adminApi';

const statuses = ['new', 'read', 'replied', 'closed'];
const labels = { new: 'New', read: 'In Progress', replied: 'Replied', closed: 'Resolved' };
const badgeClasses = { new: 'bg-amber-50 text-amber-700 ring-amber-200', read: 'bg-sky-50 text-sky-700 ring-sky-200', replied: 'bg-indigo-50 text-indigo-700 ring-indigo-200', closed: 'bg-emerald-50 text-emerald-700 ring-emerald-200' };

const dateLabel = (value, withTime = false) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return 'Not available';
  return withTime ? date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const StatusBadge = ({ status }) => <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${badgeClasses[status] || badgeClasses.new}`}>{labels[status] || status || 'New'}</span>;
const SummaryCard = ({ icon: Icon, label, value, tone }) => <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-3"><span className={`grid h-10 w-10 place-items-center rounded-2xl ${tone}`}><Icon className="h-5 w-5" aria-hidden="true" /></span><div><p className="text-sm font-medium text-slate-500">{label}</p><p className="text-2xl font-bold text-slate-900">{value}</p></div></div></div>;

const AdminEnquiries = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchEnquiries = async () => {
    setLoading(true); setError(false);
    try {
      const result = await getAdminEnquiries();
      if (!result.success) throw new Error(result.message);
      setEnquiries(result.data?.enquiries || []);
    } catch { setError(true); } finally { setLoading(false); }
  };
  useEffect(() => { fetchEnquiries(); }, []);

  const filtered = useMemo(() => enquiries.filter((enquiry) => {
    const searchable = [enquiry.name, enquiry.email, enquiry.subject].join(' ').toLowerCase();
    return (statusFilter === 'all' || enquiry.status === statusFilter) && (!search || searchable.includes(search.toLowerCase()));
  }), [enquiries, search, statusFilter]);
  const summary = useMemo(() => ({ total: enquiries.length, newCount: enquiries.filter((item) => item.status === 'new').length, inProgress: enquiries.filter((item) => item.status === 'read').length, resolved: enquiries.filter((item) => item.status === 'closed').length }), [enquiries]);

  const openEnquiry = async (enquiry) => {
    setSelected(enquiry);
    const result = await getAdminEnquiry(enquiry.id);
    if (result.success && result.data?.enquiry) {
      setSelected(result.data.enquiry);
      setEnquiries((current) => current.map((item) => item.id === enquiry.id ? result.data.enquiry : item));
    }
  };
  const changeStatus = async (enquiry, status) => {
    setSavingId(enquiry.id);
    try {
      const result = await updateAdminEnquiry(enquiry.id, { status });
      if (!result.success || !result.data?.enquiry) throw new Error(result.message);
      const updated = result.data.enquiry;
      setEnquiries((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSelected((current) => current?.id === updated.id ? updated : current);
    } catch { setError(true); } finally { setSavingId(null); }
  };
  const removeEnquiry = async (enquiry) => {
    if (!window.confirm(`Delete the enquiry from ${enquiry.name || 'this contact'}?`)) return;
    setDeletingId(enquiry.id);
    try {
      const result = await deleteAdminEnquiry(enquiry.id);
      if (!result.success) throw new Error(result.message);
      setEnquiries((current) => current.filter((item) => item.id !== enquiry.id));
      setSelected(null);
    } catch { setError(true); } finally { setDeletingId(null); }
  };
  const hasFilter = Boolean(search || statusFilter !== 'all');

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-wide text-primary-700">Admin</p><h1 className="font-display text-3xl font-bold text-slate-950">Enquiries</h1><p className="mt-2 max-w-2xl text-sm text-slate-600">View and manage enquiries submitted through the website.</p></div><button type="button" onClick={fetchEnquiries} disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"><RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />Refresh</button></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><SummaryCard icon={Inbox} label="Total enquiries" value={summary.total} tone="bg-slate-100 text-slate-700" /><SummaryCard icon={Mail} label="New" value={summary.newCount} tone="bg-amber-50 text-amber-700" /><SummaryCard icon={Clock3} label="In Progress" value={summary.inProgress} tone="bg-sky-50 text-sky-700" /><SummaryCard icon={CheckCircle2} label="Resolved" value={summary.resolved} tone="bg-emerald-50 text-emerald-700" /></div>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 p-4 sm:p-5"><div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto_auto] md:items-end"><form id="enquiry-search-form" onSubmit={(event) => { event.preventDefault(); setSearch(searchInput.trim()); }} className="space-y-1"><label htmlFor="enquiry-search" className="text-sm font-semibold text-slate-700">Search</label><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input id="enquiry-search" type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Name, email, or subject" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100" /></div></form><div className="space-y-1"><label htmlFor="enquiry-status" className="text-sm font-semibold text-slate-700">Status</label><select id="enquiry-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100"><option value="all">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{labels[status]}</option>)}</select></div><button type="submit" form="enquiry-search-form" className="h-11 rounded-xl bg-primary-700 px-4 text-sm font-semibold text-white hover:bg-primary-800">Apply</button><button type="button" onClick={() => { setSearchInput(''); setSearch(''); setStatusFilter('all'); }} disabled={!hasFilter} className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Clear</button></div></div>
      {error && <div className="m-4 flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 sm:m-5 sm:flex-row sm:items-center sm:justify-between"><span>Unable to load enquiries.</span><button type="button" onClick={fetchEnquiries} className="rounded-lg bg-rose-100 px-3 py-2 font-semibold text-rose-800">Try Again</button></div>}
      {loading ? <div className="flex min-h-72 items-center justify-center p-8 text-sm font-medium text-slate-500" role="status"><RefreshCcw className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />Loading enquiries...</div> : filtered.length === 0 ? <div className="min-h-72 p-8 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500"><AlertCircle className="h-6 w-6" aria-hidden="true" /></div><h2 className="mt-4 text-lg font-bold text-slate-900">{hasFilter ? 'No enquiries match your search or filter.' : 'No enquiries yet.'}</h2></div> : <><div className="hidden overflow-x-auto lg:block"><table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Name</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Subject</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-200">{filtered.map((enquiry) => <tr key={enquiry.id} className="hover:bg-slate-50"><td className="px-5 py-4 font-semibold text-slate-950">{enquiry.name || 'Unnamed contact'}</td><td className="px-5 py-4 text-slate-600">{enquiry.email}</td><td className="max-w-xs px-5 py-4 text-slate-700">{enquiry.subject || 'General enquiry'}</td><td className="whitespace-nowrap px-5 py-4 text-slate-600">{dateLabel(enquiry.createdAt)}</td><td className="px-5 py-4"><StatusBadge status={enquiry.status} /></td><td className="px-5 py-4 text-right"><button type="button" onClick={() => openEnquiry(enquiry)} className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Eye className="h-4 w-4" aria-hidden="true" />View</button></td></tr>)}</tbody></table></div><div className="grid gap-3 p-4 lg:hidden">{filtered.map((enquiry) => <article key={enquiry.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="font-semibold text-slate-950">{enquiry.name || 'Unnamed contact'}</h2><p className="mt-1 break-all text-sm text-slate-500">{enquiry.email}</p></div><StatusBadge status={enquiry.status} /></div><p className="mt-4 text-sm font-semibold text-slate-800">{enquiry.subject || 'General enquiry'}</p><p className="mt-1 text-sm text-slate-500">{dateLabel(enquiry.createdAt)}</p><button type="button" onClick={() => openEnquiry(enquiry)} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Eye className="h-4 w-4" aria-hidden="true" />View enquiry</button></article>)}</div></>}
    </section>
    {selected && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 px-4 py-6 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="enquiry-details-title"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"><div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5"><div><p className="text-sm font-semibold uppercase tracking-wide text-primary-700">Enquiry Details</p><h2 id="enquiry-details-title" className="mt-1 text-2xl font-bold text-slate-950">{selected.name || 'Unnamed contact'}</h2><p className="mt-1 break-all text-sm text-slate-500">{selected.email}</p></div><button type="button" onClick={() => setSelected(null)} aria-label="Close enquiry details" className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><div className="space-y-5 p-5"><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</p><p className="mt-1 text-sm font-semibold text-slate-900">{selected.phone || 'Not provided'}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date</p><p className="mt-1 text-sm font-semibold text-slate-900">{dateLabel(selected.createdAt, true)}</p></div></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subject</p><p className="mt-1 text-base font-semibold text-slate-900">{selected.subject || 'General enquiry'}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Message</p><p className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-200 p-4 text-sm leading-6 text-slate-700">{selected.message || 'No message provided.'}</p></div><div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-end sm:justify-between"><div className="w-full sm:max-w-xs"><label htmlFor="enquiry-detail-status" className="text-sm font-semibold text-slate-700">Status</label><select id="enquiry-detail-status" value={selected.status || 'new'} disabled={savingId === selected.id} onChange={(event) => changeStatus(selected, event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 disabled:opacity-60">{statuses.map((status) => <option key={status} value={status}>{labels[status]}</option>)}</select></div><button type="button" onClick={() => removeEnquiry(selected)} disabled={deletingId === selected.id} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"><Trash2 className="h-4 w-4" aria-hidden="true" />{deletingId === selected.id ? 'Deleting...' : 'Delete enquiry'}</button></div></div></div></div>}
  </div>;
};

export default AdminEnquiries;
