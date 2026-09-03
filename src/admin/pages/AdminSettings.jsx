import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, KeyRound, LogOut, Save, ShieldCheck, UserRound } from 'lucide-react';
import { adminLogout, getAdminSettings, updateAdminPassword, updateAdminProfile } from '../../services/adminApi';

const initialProfile = { name: '', email: '' };
const initialPasswords = { currentPassword: '', newPassword: '', confirmPassword: '' };
const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15';
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-lg bg-primary-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60';

const isStrongPassword = (password) => password.length >= 12 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);

const AdminSettings = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(initialProfile);
  const [session, setSession] = useState(null);
  const [passwords, setPasswords] = useState(initialPasswords);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await getAdminSettings();
        if (result.success && result.data?.admin) {
          const admin = result.data.admin;
          setProfile({ name: admin.name || '', email: admin.email || '' });
          setSession(admin);
        } else {
          setNotice({ type: 'error', message: result.message || 'Unable to load settings' });
        }
      } catch {
        setNotice({ type: 'error', message: 'Unable to load settings' });
      }
      setLoading(false);
    };
    loadSettings();
  }, []);

  const showNotice = (type, message) => setNotice({ type, message });

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setNotice(null);
    try {
      const result = await updateAdminProfile(profile);
      if (result.success && result.data?.admin) {
        const admin = result.data.admin;
        setProfile({ name: admin.name || '', email: admin.email || '' });
        setSession(admin);
        showNotice('success', 'Profile details updated.');
      } else {
        showNotice('error', result.message || 'Unable to update profile');
      }
    } catch {
      showNotice('error', 'Unable to update profile');
    }
    setSavingProfile(false);
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setNotice(null);
    if (!isStrongPassword(passwords.newPassword)) {
      showNotice('error', 'New password must be at least 12 characters and include uppercase, lowercase, and a number.');
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      showNotice('error', 'New passwords do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      const result = await updateAdminPassword(passwords);
      if (result.success) {
        setPasswords(initialPasswords);
        showNotice('success', 'Password updated successfully.');
      } else {
        showNotice('error', result.message || 'Unable to update password');
      }
    } catch {
      showNotice('error', 'Unable to update password');
    }
    setSavingPassword(false);
  };

  const handleSignOut = async () => {
    try {
      await adminLogout();
    } finally {
      navigate('/admin/login');
    }
  };

  if (loading) return <div className="flex min-h-64 items-center justify-center text-sm font-medium text-primary-900">Loading settings</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-600">Administration</p>
        <h1 className="mt-2 text-3xl font-display font-bold text-slate-900">Settings</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">Manage your administrator profile and account security.</p>
      </div>

      {notice && (
        <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${notice.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-700'}`} role="status">
          {notice.type === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0" />}
          {notice.message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-5 flex items-start gap-3"><div className="rounded-lg bg-primary-50 p-2 text-primary-800"><UserRound className="h-5 w-5" /></div><div><h2 className="text-lg font-bold text-slate-900">Admin Profile</h2><p className="text-sm text-slate-500">Keep your account details current.</p></div></div>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700">Name<input required minLength="2" maxLength="100" className={`${inputClass} mt-1.5`} value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></label>
            <label className="block text-sm font-semibold text-slate-700">Email<input required type="email" className={`${inputClass} mt-1.5`} value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} /></label>
            <button type="submit" className={buttonClass} disabled={savingProfile}><Save className="h-4 w-4" />{savingProfile ? 'Saving...' : 'Save profile'}</button>
          </form>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-5 flex items-start gap-3"><div className="rounded-lg bg-primary-50 p-2 text-primary-800"><KeyRound className="h-5 w-5" /></div><div><h2 className="text-lg font-bold text-slate-900">Change Password</h2><p className="text-sm text-slate-500">Use at least 12 characters with upper and lowercase letters and a number.</p></div></div>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {[['currentPassword', 'Current password'], ['newPassword', 'New password'], ['confirmPassword', 'Confirm new password']].map(([field, label]) => (
              <label key={field} className="block text-sm font-semibold text-slate-700">{label}<input required type="password" autoComplete={field === 'currentPassword' ? 'current-password' : 'new-password'} className={`${inputClass} mt-1.5`} value={passwords[field]} onChange={(event) => setPasswords({ ...passwords, [field]: event.target.value })} /></label>
            ))}
            <button type="submit" className={buttonClass} disabled={savingPassword}><ShieldCheck className="h-4 w-4" />{savingPassword ? 'Updating...' : 'Update password'}</button>
          </form>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-5 flex items-start gap-3"><div className="rounded-lg bg-primary-50 p-2 text-primary-800"><ShieldCheck className="h-5 w-5" /></div><div><h2 className="text-lg font-bold text-slate-900">Admin Session</h2><p className="text-sm text-slate-500">Your current access and account status.</p></div></div>
        <div className="grid gap-4 text-sm sm:grid-cols-3">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Logged-in email</p><p className="mt-1 break-words font-medium text-slate-800">{session?.email || profile.email}</p></div>
          <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Role</p><p className="mt-1 font-medium capitalize text-slate-800">{session?.role?.replace('_', ' ') || 'Administrator'}</p></div>
          <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Account status</p><p className="mt-1 font-medium text-emerald-700">{session?.isActive ? 'Active' : 'Inactive'}</p></div>
        </div>
        <button type="button" onClick={handleSignOut} className="mt-6 inline-flex items-center gap-2 rounded-lg border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"><LogOut className="h-4 w-4" />Sign out</button>
      </section>
    </div>
  );
};

export default AdminSettings;