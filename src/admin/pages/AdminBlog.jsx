import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Eye, EyeOff, FileText, Plus, RefreshCcw, Search, Trash2, X } from 'lucide-react';
import {
  createAdminBlogPost,
  deleteAdminBlogPost,
  getAdminBlogPosts,
  updateAdminBlogPost,
} from '../../services/adminApi';

const emptyForm = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  featuredImageUrl: '',
  author: 'Universe Consult',
  category: '',
  isPublished: false,
};

const formatDate = (value) => {
  const date = new Date(value);
  return !value || Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const slugify = (value) => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const StatusBadge = ({ isPublished }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${isPublished ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
    <span className="h-1.5 w-1.5 rounded-full bg-current" />
    {isPublished ? 'Published' : 'Draft'}
  </span>
);

const AdminBlog = () => {
  const [posts, setPosts] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchPosts = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getAdminBlogPosts();
      if (!result.success) throw new Error(result.message);
      setPosts(result.data?.posts || []);
    } catch {
      setError('Unable to load blog posts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPosts(); }, []);

  const filtered = useMemo(() => posts.filter((post) => {
    const matchesSearch = [post.title, post.excerpt, post.author, post.category, post.slug].join(' ').toLowerCase().includes(search.trim().toLowerCase());
    const matchesStatus = statusFilter === 'all'
      || (statusFilter === 'published' && post.isPublished)
      || (statusFilter === 'draft' && !post.isPublished);
    return matchesSearch && matchesStatus;
  }), [posts, search, statusFilter]);

  const updateForm = (patch) => setForm((current) => ({ ...current, ...patch }));

  const handleTitleChange = (title) => {
    setForm((current) => ({
      ...current,
      title,
      slug: slugTouched ? current.slug : slugify(title),
    }));
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setSlugTouched(false);
    setFormError('');
    setSuccess('');
    setFormOpen(true);
  };

  const openEdit = (post) => {
    setEditing(post);
    setForm({
      title: post.title || '',
      slug: post.slug || '',
      excerpt: post.excerpt || '',
      content: post.content || '',
      featuredImageUrl: post.featuredImageUrl || '',
      author: post.author || 'Universe Consult',
      category: post.category || '',
      isPublished: post.isPublished,
    });
    setSlugTouched(true);
    setFormError('');
    setSuccess('');
    setFormOpen(true);
  };

  const closeForm = () => {
    if (!saving) setFormOpen(false);
  };

  const savePost = async (event) => {
    event.preventDefault();
    const required = [form.title, form.slug, form.excerpt, form.content, form.author, form.category];
    if (required.some((value) => !value.trim())) {
      setFormError('Title, slug, excerpt, content, author, and category are required.');
      return;
    }

    setSaving(true);
    setFormError('');
    setSuccess('');
    try {
      const result = editing
        ? await updateAdminBlogPost(editing.id, form)
        : await createAdminBlogPost(form);
      if (!result.success || !result.data?.post) throw new Error(result.message);
      const saved = result.data.post;
      setPosts((current) => editing
        ? current.map((item) => item.id === saved.id ? saved : item)
        : [saved, ...current]);
      setSuccess(editing ? 'Blog post updated.' : 'Blog post created.');
      setFormOpen(false);
    } catch (saveError) {
      setFormError(saveError.message || 'Unable to save blog post. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (post) => {
    setSuccess('');
    setError('');
    try {
      const result = await updateAdminBlogPost(post.id, { isPublished: !post.isPublished });
      if (!result.success || !result.data?.post) throw new Error(result.message);
      setPosts((current) => current.map((item) => item.id === post.id ? result.data.post : item));
      setSuccess(result.data.post.isPublished ? 'Blog post published.' : 'Blog post unpublished.');
    } catch {
      setError('Unable to update blog post status.');
    }
  };

  const removePost = async (post) => {
    if (!window.confirm(`Delete the blog post "${post.title}"?`)) return;
    setDeletingId(post.id);
    setSuccess('');
    setError('');
    try {
      const result = await deleteAdminBlogPost(post.id);
      if (!result.success) throw new Error(result.message);
      setPosts((current) => current.filter((item) => item.id !== post.id));
      setSuccess('Blog post deleted.');
    } catch {
      setError('Unable to delete blog post.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary-700">Admin</p>
          <h1 className="font-display text-3xl font-bold text-slate-950">Blog</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">Create and manage blog posts for future public publishing.</p>
        </div>
        <button type="button" onClick={openCreate} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-primary-800">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Blog Post
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
              <label htmlFor="blog-search" className="text-sm font-semibold text-slate-700">Search</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input id="blog-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Title, slug, category, or author" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100" />
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="blog-status" className="text-sm font-semibold text-slate-700">Status</label>
              <select id="blog-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100">
                <option value="all">All posts</option>
                <option value="published">Published</option>
                <option value="draft">Drafts</option>
              </select>
            </div>
            <button type="button" onClick={fetchPosts} disabled={loading} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
              <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-72 items-center justify-center p-8 text-sm font-medium text-slate-500" role="status">
            <RefreshCcw className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            Loading blog posts...
          </div>
        ) : filtered.length === 0 ? (
          <div className="min-h-72 p-8 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
              <AlertCircle className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-900">No blog posts found.</h2>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Post</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Author</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Updated</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filtered.map((post) => (
                    <tr key={post.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {post.featuredImageUrl ? <img src={post.featuredImageUrl} alt="" className="h-12 w-16 rounded-lg object-cover" /> : <span className="grid h-12 w-16 place-items-center rounded-lg bg-primary-50 text-primary-700"><FileText className="h-5 w-5" /></span>}
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-950">{post.title}</p>
                            <p className="mt-1 max-w-md truncate text-xs text-slate-500">{post.excerpt}</p>
                            <p className="mt-1 text-xs text-slate-400">/{post.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{post.category}</td>
                      <td className="px-5 py-4 text-slate-600">{post.author}</td>
                      <td className="px-5 py-4"><StatusBadge isPublished={post.isPublished} /></td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">{formatDate(post.updatedAt)}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => togglePublish(post)} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                            {post.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            {post.isPublished ? 'Unpublish' : 'Publish'}
                          </button>
                          <button type="button" onClick={() => openEdit(post)} className="h-9 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">Edit</button>
                          <button type="button" onClick={() => removePost(post)} disabled={deletingId === post.id} aria-label={`Delete ${post.title}`} className="grid h-9 w-9 place-items-center rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-50">
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
              {filtered.map((post) => (
                <article key={post.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-semibold text-slate-950">{post.title}</h2>
                      <p className="mt-1 text-xs text-slate-500">{post.category} by {post.author}</p>
                    </div>
                    <StatusBadge isPublished={post.isPublished} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{post.excerpt}</p>
                  <p className="mt-3 text-xs text-slate-500">Updated {formatDate(post.updatedAt)}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => togglePublish(post)} className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700">
                      {post.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {post.isPublished ? 'Unpublish' : 'Publish'}
                    </button>
                    <button type="button" onClick={() => openEdit(post)} className="h-10 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700">Edit</button>
                  </div>
                  <button type="button" onClick={() => removePost(post)} disabled={deletingId === post.id} className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 text-sm font-semibold text-rose-700 disabled:opacity-50">
                    <Trash2 className="h-4 w-4" />
                    Delete post
                  </button>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 px-4 py-6 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="blog-form-title">
          <form onSubmit={savePost} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-primary-700">{editing ? 'Edit blog post' : 'New blog post'}</p>
                <h2 id="blog-form-title" className="mt-1 text-2xl font-bold text-slate-950">{editing ? 'Update blog post' : 'Add Blog Post'}</h2>
              </div>
              <button type="button" onClick={closeForm} aria-label="Close blog form" className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label htmlFor="blog-title" className="text-sm font-semibold text-slate-700">Title</label>
                <input id="blog-title" value={form.title} onChange={(event) => handleTitleChange(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100" />
              </div>
              <div>
                <label htmlFor="blog-slug" className="text-sm font-semibold text-slate-700">Slug</label>
                <input id="blog-slug" value={form.slug} onChange={(event) => { setSlugTouched(true); updateForm({ slug: slugify(event.target.value) }); }} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100" />
              </div>
              <div>
                <label htmlFor="blog-category" className="text-sm font-semibold text-slate-700">Category</label>
                <input id="blog-category" value={form.category} onChange={(event) => updateForm({ category: event.target.value })} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100" />
              </div>
              <div>
                <label htmlFor="blog-author" className="text-sm font-semibold text-slate-700">Author</label>
                <input id="blog-author" value={form.author} onChange={(event) => updateForm({ author: event.target.value })} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100" />
              </div>
              <div>
                <label htmlFor="blog-image" className="text-sm font-semibold text-slate-700">Featured image URL</label>
                <input id="blog-image" value={form.featuredImageUrl} onChange={(event) => updateForm({ featuredImageUrl: event.target.value })} placeholder="Optional" className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100" />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="blog-excerpt" className="text-sm font-semibold text-slate-700">Excerpt</label>
                <textarea id="blog-excerpt" rows="3" value={form.excerpt} onChange={(event) => updateForm({ excerpt: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100" />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="blog-content" className="text-sm font-semibold text-slate-700">Content</label>
                <textarea id="blog-content" rows="8" value={form.content} onChange={(event) => updateForm({ content: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100" />
              </div>
              <label className="flex items-center gap-3 text-sm font-semibold text-slate-700 md:col-span-2">
                <input type="checkbox" checked={form.isPublished} onChange={(event) => updateForm({ isPublished: event.target.checked })} className="h-4 w-4 rounded border-slate-300 text-primary-700 focus:ring-primary-600" />
                Published and visible through the public API
              </label>
              {formError && <p className="text-sm text-rose-700 md:col-span-2">{formError}</p>}
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 p-5">
              <button type="button" onClick={closeForm} disabled={saving} className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700">Cancel</button>
              <button type="submit" disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary-700 px-4 text-sm font-semibold text-white disabled:opacity-60">
                {saving && <RefreshCcw className="h-4 w-4 animate-spin" />}
                {saving ? 'Saving...' : editing ? 'Save changes' : 'Create post'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminBlog;
