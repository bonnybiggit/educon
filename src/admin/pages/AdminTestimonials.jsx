import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Eye, EyeOff, Plus, RefreshCcw, Search, Trash2, X } from 'lucide-react';
import {
  createAdminTestimonial,
  deleteAdminTestimonial,
  getAdminTestimonials,
  updateAdminTestimonial,
} from '../../services/adminApi';

const emptyForm = { name: '', role: '', text: '', imageUrl: '', isPublished: true };

const formatDate = (value) => {
  const date = new Date(value);
  return !value || Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const VisibilityBadge = ({ isPublished }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${isPublished ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
    <span className="h-1.5 w-1.5 rounded-full bg-current" />
    {isPublished ? 'Published' : 'Hidden'}
  </span>
);

const AdminTestimonials = () => {
  const [testimonials, setTestimonials] = useState([]);
  const [search, setSearch] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchTestimonials = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getAdminTestimonials();
      if (!result.success) throw new Error(result.message);
      setTestimonials(result.data?.testimonials || []);
    } catch {
      setError('Unable to load testimonials.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTestimonials(); }, []);

  const filtered = useMemo(() => testimonials.filter((testimonial) => {
    const matchesSearch = [testimonial.name, testimonial.role, testimonial.text].join(' ').toLowerCase().includes(search.trim().toLowerCase());
    const matchesVisibility = visibilityFilter === 'all'
      || (visibilityFilter === 'published' && testimonial.isPublished)
      || (visibilityFilter === 'hidden' && !testimonial.isPublished);
    return matchesSearch && matchesVisibility;
  }), [testimonials, search, visibilityFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setSuccess('');
    setFormOpen(true);
  };

  const openEdit = (testimonial) => {
    setEditing(testimonial);
    setForm({
      name: testimonial.name || '',
      role: testimonial.role || '',
      text: testimonial.text || '',
      imageUrl: testimonial.imageUrl || '',
      isPublished: testimonial.isPublished,
    });
    setFormError('');
    setSuccess('');
    setFormOpen(true);
  };

  const closeForm = () => {
    if (!saving) setFormOpen(false);
  };

  const saveTestimonial = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.text.trim()) {
      setFormError('Name and testimonial message are required.');
      return;
    }

    setSaving(true);
    setFormError('');
    setSuccess('');
    try {
      const result = editing
        ? await updateAdminTestimonial(editing.id, form)
        : await createAdminTestimonial(form);
      if (!result.success || !result.data?.testimonial) throw new Error(result.message);
      const saved = result.data.testimonial;
      setTestimonials((current) => editing
        ? current.map((item) => item.id === saved.id ? saved : item)
        : [saved, ...current]);
      setSuccess(editing ? 'Testimonial updated.' : 'Testimonial created.');
      setFormOpen(false);
    } catch {
      setFormError('Unable to save testimonial. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = async (testimonial) => {
    setSuccess('');
    setError('');
    try {
      const result = await updateAdminTestimonial(testimonial.id, { isPublished: !testimonial.isPublished });
      if (!result.success || !result.data?.testimonial) throw new Error(result.message);
      setTestimonials((current) => current.map((item) => item.id === testimonial.id ? result.data.testimonial : item));
      setSuccess(result.data.testimonial.isPublished ? 'Testimonial published.' : 'Testimonial hidden.');
    } catch {
      setError('Unable to update testimonial visibility.');
    }
  };

  const removeTestimonial = async (testimonial) => {
    if (!window.confirm(`Delete the testimonial from "${testimonial.name}"?`)) return;
    setDeletingId(testimonial.id);
    setSuccess('');
    setError('');
    try {
      const result = await deleteAdminTestimonial(testimonial.id);
      if (!result.success) throw new Error(result.message);
      setTestimonials((current) => current.filter((item) => item.id !== testimonial.id));
      setSuccess('Testimonial deleted.');
    } catch {
      setError('Unable to delete testimonial.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary-700">Admin</p>
          <h1 className="font-display text-3xl font-bold text-slate-950">Testimonials</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">Manage student stories shown on the public website.</p>
        </div>
        <button type="button" onClick={openCreate} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-primary-800">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Testimonial
        </button>
      </div>

      {(error || success) && (
        <div className={`rounded-xl border p-4 text-sm font-medium ${error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error || success}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4 sm:p-5">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
            <div className="space-y-1">
              <label htmlFor="testimonial-search" className="text-sm font-semibold text-slate-700">Search</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input id="testimonial-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, role, or testimonial" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100" />
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="testimonial-status" className="text-sm font-semibold text-slate-700">Visibility</label>
              <select id="testimonial-status" value={visibilityFilter} onChange={(event) => setVisibilityFilter(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100">
                <option value="all">All testimonials</option>
                <option value="published">Published</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>
            <button type="button" onClick={fetchTestimonials} disabled={loading} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
              <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-72 items-center justify-center p-8 text-sm font-medium text-slate-500" role="status">
            <RefreshCcw className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            Loading testimonials...
          </div>
        ) : filtered.length === 0 ? (
          <div className="min-h-72 p-8 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
              <AlertCircle className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-900">No testimonials found.</h2>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Testimonial</th>
                    <th className="px-5 py-3">Visibility</th>
                    <th className="px-5 py-3">Last updated</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filtered.map((testimonial) => (
                    <tr key={testimonial.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {testimonial.imageUrl ? <img src={testimonial.imageUrl} alt="" className="h-10 w-10 rounded-full object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-50 text-sm font-bold text-primary-700">{testimonial.name.charAt(0)}</span>}
                          <div>
                            <p className="font-semibold text-slate-950">{testimonial.name}</p>
                            {testimonial.role && <p className="text-xs text-slate-500">{testimonial.role}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="max-w-xl px-5 py-4 text-slate-600">{testimonial.text}</td>
                      <td className="px-5 py-4"><VisibilityBadge isPublished={testimonial.isPublished} /></td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">{formatDate(testimonial.updatedAt)}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => toggleVisibility(testimonial)} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                            {testimonial.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            {testimonial.isPublished ? 'Hide' : 'Publish'}
                          </button>
                          <button type="button" onClick={() => openEdit(testimonial)} className="h-9 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">Edit</button>
                          <button type="button" onClick={() => removeTestimonial(testimonial)} disabled={deletingId === testimonial.id} aria-label={`Delete ${testimonial.name}`} className="grid h-9 w-9 place-items-center rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 p-4 lg:hidden">
              {filtered.map((testimonial) => (
                <article key={testimonial.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-semibold text-slate-950">{testimonial.name}</h2>
                      {testimonial.role && <p className="mt-1 text-sm text-slate-500">{testimonial.role}</p>}
                    </div>
                    <VisibilityBadge isPublished={testimonial.isPublished} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{testimonial.text}</p>
                  <p className="mt-3 text-xs text-slate-500">Updated {formatDate(testimonial.updatedAt)}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => toggleVisibility(testimonial)} className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700">
                      {testimonial.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {testimonial.isPublished ? 'Hide' : 'Publish'}
                    </button>
                    <button type="button" onClick={() => openEdit(testimonial)} className="h-10 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700">Edit</button>
                  </div>
                  <button type="button" onClick={() => removeTestimonial(testimonial)} disabled={deletingId === testimonial.id} className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 text-sm font-semibold text-rose-700 disabled:opacity-50">
                    <Trash2 className="h-4 w-4" />
                    Delete testimonial
                  </button>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 px-4 py-6 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="testimonial-form-title">
          <form onSubmit={saveTestimonial} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-primary-700">{editing ? 'Edit testimonial' : 'New testimonial'}</p>
                <h2 id="testimonial-form-title" className="mt-1 text-2xl font-bold text-slate-950">{editing ? 'Update testimonial' : 'Add Testimonial'}</h2>
              </div>
              <button type="button" onClick={closeForm} aria-label="Close testimonial form" className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label htmlFor="testimonial-name" className="text-sm font-semibold text-slate-700">Name</label>
                <input id="testimonial-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100" />
              </div>
              <div>
                <label htmlFor="testimonial-role" className="text-sm font-semibold text-slate-700">Role/location</label>
                <input id="testimonial-role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} placeholder="Optional" className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100" />
              </div>
              <div>
                <label htmlFor="testimonial-image" className="text-sm font-semibold text-slate-700">Image URL</label>
                <input id="testimonial-image" value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} placeholder="Optional" className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100" />
              </div>
              <div>
                <label htmlFor="testimonial-text" className="text-sm font-semibold text-slate-700">Testimonial</label>
                <textarea id="testimonial-text" rows="5" value={form.text} onChange={(event) => setForm({ ...form, text: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100" />
              </div>
              <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={form.isPublished} onChange={(event) => setForm({ ...form, isPublished: event.target.checked })} className="h-4 w-4 rounded border-slate-300 text-primary-700 focus:ring-primary-600" />
                Published and visible
              </label>
              {formError && <p className="text-sm text-rose-700">{formError}</p>}
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 p-5">
              <button type="button" onClick={closeForm} disabled={saving} className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700">Cancel</button>
              <button type="submit" disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary-700 px-4 text-sm font-semibold text-white disabled:opacity-60">
                {saving && <RefreshCcw className="h-4 w-4 animate-spin" />}
                {saving ? 'Saving...' : editing ? 'Save changes' : 'Create testimonial'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminTestimonials;
