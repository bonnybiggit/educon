import { useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, Eye, EyeOff, Plus, RefreshCcw, Search, Trash2, X } from 'lucide-react';
import { createAdminService, deleteAdminService, getAdminServices, updateAdminService } from '../../services/adminApi';

const emptyForm = { name: '', description: '', isPublished: true };
const formatDate = (value) => {
  const date = new Date(value);
  return !value || Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const VisibilityBadge = ({ isPublished }) => <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${isPublished ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-200'}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{isPublished ? 'Published' : 'Hidden'}</span>;

const AdminServices = () => {
  const [services, setServices] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchServices = async () => {
    setLoading(true); setError(false);
    try {
      const result = await getAdminServices();
      if (!result.success) throw new Error(result.message);
      setServices(result.data?.services || []);
    } catch { setError(true); } finally { setLoading(false); }
  };
  useEffect(() => { fetchServices(); }, []);

  const filtered = useMemo(() => services.filter((service) => service.name.toLowerCase().includes(search.trim().toLowerCase())), [services, search]);
  const openCreate = () => { setEditing(null); setForm(emptyForm); setFormError(''); setFormOpen(true); };
  const openEdit = (service) => { setEditing(service); setForm({ name: service.name, description: service.description, isPublished: service.isPublished }); setFormError(''); setFormOpen(true); };
  const closeForm = () => { if (!saving) setFormOpen(false); };

  const saveService = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.description.trim()) { setFormError('Service name and description are required.'); return; }
    setSaving(true); setFormError('');
    try {
      const result = editing ? await updateAdminService(editing.id, form) : await createAdminService(form);
      if (!result.success || !result.data?.service) throw new Error(result.message);
      const saved = result.data.service;
      setServices((current) => editing ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current]);
      setFormOpen(false);
    } catch { setFormError('Unable to save service. Please try again.'); } finally { setSaving(false); }
  };

  const toggleVisibility = async (service) => {
    try {
      const result = await updateAdminService(service.id, { isPublished: !service.isPublished });
      if (!result.success || !result.data?.service) throw new Error(result.message);
      setServices((current) => current.map((item) => item.id === service.id ? result.data.service : item));
    } catch {
      setError(true);
    }
  };
  const removeService = async (service) => {
    if (!window.confirm(`Delete the service "${service.name}"?`)) return;
    setDeletingId(service.id);
    try {
      const result = await deleteAdminService(service.id);
      if (!result.success) throw new Error(result.message);
      setServices((current) => current.filter((item) => item.id !== service.id));
    } catch { setError(true); } finally { setDeletingId(null); }
  };

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-wide text-primary-700">Admin</p><h1 className="font-display text-3xl font-bold text-slate-950">Services</h1><p className="mt-2 max-w-2xl text-sm text-slate-600">Manage the services offered by Universe Consult.</p></div><button type="button" onClick={openCreate} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-primary-800"><Plus className="h-4 w-4" aria-hidden="true" />Add Service</button></div>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 p-4 sm:p-5"><div className="relative max-w-xl"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><label htmlFor="service-search" className="sr-only">Search services by name</label><input id="service-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search services by name" className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100" /></div></div>
      {error && <div className="m-4 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><span>Unable to load services.</span><button type="button" onClick={fetchServices} className="rounded-lg bg-rose-100 px-3 py-2 font-semibold text-rose-800">Try Again</button></div>}
      {loading ? <div className="flex min-h-72 items-center justify-center p-8 text-sm font-medium text-slate-500" role="status"><RefreshCcw className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />Loading services...</div> : filtered.length === 0 ? <div className="min-h-72 p-8 text-center"><BriefcaseBusiness className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" /><h2 className="mt-4 text-lg font-bold text-slate-900">{search ? 'No services match your search.' : 'No services yet.'}</h2></div> : <><div className="hidden overflow-x-auto lg:block"><table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Service</th><th className="px-5 py-3">Description</th><th className="px-5 py-3">Visibility</th><th className="px-5 py-3">Last updated</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-200">{filtered.map((service) => <tr key={service.id} className="hover:bg-slate-50"><td className="px-5 py-4 font-semibold text-slate-950">{service.name}</td><td className="max-w-md px-5 py-4 text-slate-600">{service.description}</td><td className="px-5 py-4"><VisibilityBadge isPublished={service.isPublished} /></td><td className="whitespace-nowrap px-5 py-4 text-slate-600">{formatDate(service.updatedAt)}</td><td className="px-5 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => toggleVisibility(service)} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">{service.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{service.isPublished ? 'Hide' : 'Publish'}</button><button type="button" onClick={() => openEdit(service)} className="h-9 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">Edit</button><button type="button" onClick={() => removeService(service)} disabled={deletingId === service.id} aria-label={`Delete ${service.name}`} className="grid h-9 w-9 place-items-center rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></div><div className="grid gap-3 p-4 lg:hidden">{filtered.map((service) => <article key={service.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><h2 className="font-semibold text-slate-950">{service.name}</h2><VisibilityBadge isPublished={service.isPublished} /></div><p className="mt-3 text-sm leading-6 text-slate-600">{service.description}</p><p className="mt-3 text-xs text-slate-500">Updated {formatDate(service.updatedAt)}</p><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => toggleVisibility(service)} className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700">{service.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{service.isPublished ? 'Hide' : 'Publish'}</button><button type="button" onClick={() => openEdit(service)} className="h-10 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700">Edit</button></div><button type="button" onClick={() => removeService(service)} className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 text-sm font-semibold text-rose-700"><Trash2 className="h-4 w-4" />Delete service</button></article>)}</div></>}
    </section>
    {formOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 px-4 py-6 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="service-form-title"><form onSubmit={saveService} className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-slate-200 p-5"><div><p className="text-sm font-semibold uppercase tracking-wide text-primary-700">{editing ? 'Edit service' : 'New service'}</p><h2 id="service-form-title" className="mt-1 text-2xl font-bold text-slate-950">{editing ? 'Update service' : 'Add Service'}</h2></div><button type="button" onClick={closeForm} aria-label="Close service form" className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><div className="space-y-4 p-5"><div><label htmlFor="service-name" className="text-sm font-semibold text-slate-700">Service name</label><input id="service-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100" /></div><div><label htmlFor="service-description" className="text-sm font-semibold text-slate-700">Short description</label><textarea id="service-description" rows="4" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100" /></div><label className="flex items-center gap-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={form.isPublished} onChange={(event) => setForm({ ...form, isPublished: event.target.checked })} className="h-4 w-4 rounded border-slate-300 text-primary-700 focus:ring-primary-600" />Published and visible</label>{formError && <p className="text-sm text-rose-700">{formError}</p>}</div><div className="flex justify-end gap-3 border-t border-slate-200 p-5"><button type="button" onClick={closeForm} disabled={saving} className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700">Cancel</button><button type="submit" disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary-700 px-4 text-sm font-semibold text-white disabled:opacity-60">{saving && <RefreshCcw className="h-4 w-4 animate-spin" />}{saving ? 'Saving...' : editing ? 'Save changes' : 'Create service'}</button></div></form></div>}
  </div>;
};

export default AdminServices;
