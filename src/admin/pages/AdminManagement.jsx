import { useEffect, useState } from 'react';
import { CheckCircle2, KeyRound, Plus, RefreshCcw, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import {
  createAdmin,
  deleteAdminAccount,
  getAdmins,
  resetAdminPassword,
  updateAdminAccount,
} from '../../services/adminApi';

const emptyForm = { name: '', email: '', temporaryPassword: '' };
const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15';
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-lg bg-primary-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60';
const strongPassword = (value) => value.length >= 12 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value);

const roleLabel = (role) => role === 'super_admin' ? 'Super Admin' : 'Admin';

const AdminManagement = () => {
  const [admins, setAdmins] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  const loadAdmins = async () => {
    setLoading(true);
    const result = await getAdmins();
    if (result.success) {
      setAdmins(result.data?.admins || []);
    } else {
      setNotice({ type: 'error', message: result.message || 'Unable to load admin accounts.' });
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const showNotice = (type, message) => setNotice({ type, message });

  const handleCreate = async (event) => {
    event.preventDefault();
    setNotice(null);
    if (!strongPassword(form.temporaryPassword)) {
      showNotice('error', 'Temporary password must be at least 12 characters and include uppercase, lowercase, and a number.');
      return;
    }

    setSaving(true);
    const result = await createAdmin(form);
    if (result.success && result.data?.admin) {
      setAdmins((current) => [result.data.admin, ...current]);
      setForm(emptyForm);
      showNotice('success', 'Admin account created. Share the temporary password securely outside this portal.');
    } else {
      showNotice('error', result.message || 'Unable to create admin account.');
    }
    setSaving(false);
  };

  const handleProfileChange = async (admin, patch) => {
    const result = await updateAdminAccount(admin.id, patch);
    if (result.success && result.data?.admin) {
      setAdmins((current) => current.map((item) => item.id === admin.id ? result.data.admin : item));
      showNotice('success', 'Admin account updated.');
    } else {
      showNotice('error', result.message || 'Unable to update admin account.');
    }
  };

  const handleEdit = async (admin) => {
    const name = window.prompt('Admin name', admin.name);
    if (name === null) return;
    const email = window.prompt('Admin email', admin.email);
    if (email === null) return;
    await handleProfileChange(admin, { name, email });
  };

  const handleResetPassword = async (admin) => {
    const newPassword = window.prompt(`New temporary password for ${admin.email}`);
    if (!newPassword) return;
    if (!strongPassword(newPassword)) {
      showNotice('error', 'New password must be at least 12 characters and include uppercase, lowercase, and a number.');
      return;
    }
    const result = await resetAdminPassword(admin.id, { newPassword });
    showNotice(result.success ? 'success' : 'error', result.success ? 'Password reset. Share it securely outside this portal.' : result.message || 'Unable to reset password.');
  };

  const handleDelete = async (admin) => {
    if (!window.confirm(`Delete ${admin.email}?`)) return;
    const result = await deleteAdminAccount(admin.id);
    if (result.success) {
      setAdmins((current) => current.filter((item) => item.id !== admin.id));
      showNotice('success', 'Admin account deleted.');
    } else {
      showNotice('error', result.message || 'Unable to delete admin account.');
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary-700">Super Admin</p>
        <h1 className="font-display text-3xl font-bold text-slate-950">Admin Management</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">Create and manage administrator accounts.</p>
      </div>

      {notice && (
        <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${notice.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-700'}`} role="status">
          {notice.type === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0" />}
          {notice.message}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-5 flex items-start gap-3">
          <div className="rounded-lg bg-primary-50 p-2 text-primary-800"><Plus className="h-5 w-5" /></div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Create Admin</h2>
            <p className="text-sm text-slate-500">New accounts are created with the ADMIN role and must change the temporary password.</p>
          </div>
        </div>
        <form onSubmit={handleCreate} className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
          <label className="block text-sm font-semibold text-slate-700">Name<input required minLength="2" maxLength="100" className={`${inputClass} mt-1.5`} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label className="block text-sm font-semibold text-slate-700">Email<input required type="email" className={`${inputClass} mt-1.5`} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          <label className="block text-sm font-semibold text-slate-700">Temporary password<input required type="password" className={`${inputClass} mt-1.5`} value={form.temporaryPassword} onChange={(event) => setForm({ ...form, temporaryPassword: event.target.value })} /></label>
          <button type="submit" className={buttonClass} disabled={saving}><UserRound className="h-4 w-4" />{saving ? 'Creating...' : 'Create'}</button>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <h2 className="text-lg font-bold text-slate-900">Admin Accounts</h2>
          <button type="button" onClick={loadAdmins} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCcw className="h-4 w-4" />Refresh</button>
        </div>
        {loading ? (
          <div className="flex min-h-52 items-center justify-center text-sm font-medium text-slate-500"><RefreshCcw className="mr-2 h-4 w-4 animate-spin" />Loading admins...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr><th className="px-5 py-3">Admin</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Password</th><th className="px-5 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4"><p className="font-semibold text-slate-950">{admin.name}</p><p className="text-slate-500">{admin.email}</p></td>
                    <td className="px-5 py-4"><span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"><ShieldCheck className="h-3.5 w-3.5" />{roleLabel(admin.role)}</span></td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${admin.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{admin.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-5 py-4 text-slate-600">{admin.passwordChangeRequired ? 'Change required' : 'Current'}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => handleEdit(admin)} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">Edit</button>
                        <button type="button" onClick={() => handleProfileChange(admin, { isActive: !admin.isActive })} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">{admin.isActive ? 'Deactivate' : 'Activate'}</button>
                        <button type="button" onClick={() => handleResetPassword(admin)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50" aria-label={`Reset password for ${admin.email}`}><KeyRound className="h-4 w-4" /></button>
                        <button type="button" onClick={() => handleDelete(admin)} className="grid h-9 w-9 place-items-center rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50" aria-label={`Delete ${admin.email}`}><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
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

export default AdminManagement;
