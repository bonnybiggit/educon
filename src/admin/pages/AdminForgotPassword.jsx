import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, Lock, Mail } from 'lucide-react';
import { confirmAdminPasswordReset, requestAdminPasswordReset } from '../../services/adminApi';

const inputClass = 'w-full rounded-lg border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-primary-600 focus:ring-4 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-slate-50';
const iconClass = 'pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400';
const buttonClass = 'mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-900 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-primary-800 focus:outline-none focus:ring-4 focus:ring-primary-200 disabled:cursor-not-allowed disabled:opacity-70';

const friendlyError = (result, fallback) => {
  if (result.status === 429) return 'Too many attempts. Please wait a while and try again.';
  if (result.status >= 500) return 'Password recovery is temporarily unavailable. Please try again later.';
  return result.message || fallback;
};

const AdminForgotPassword = () => {
  const [step, setStep] = useState('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const navigate = useNavigate();

  const handleRequest = async (event) => {
    event.preventDefault();
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const result = await requestAdminPasswordReset(email.trim());
      if (!result.success) {
        setError(friendlyError(result, 'Unable to process your request. Please try again.'));
        return;
      }
      setNotice('If an administrator account exists for that email, a 6-digit code has been sent. It expires in 10 minutes.');
      setStep('confirm');
    } catch {
      setError('Unable to connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (event) => {
    event.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const result = await confirmAdminPasswordReset({ email: email.trim(), code, password });
      if (!result.success) {
        setError(friendlyError(result, 'Unable to reset your password. Please try again.'));
        return;
      }
      navigate('/admin/login', { replace: true });
    } catch {
      setError('Unable to connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-10 shadow-xl sm:px-10">
        <div className="mb-8 text-center">
          <img src="/logo.png" alt="Universe Consult Logo" className="mx-auto mb-6 h-16 w-auto" />
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-600">Admin Portal</p>
          <h1 className="mt-3 text-3xl font-display font-bold text-slate-950">Reset Password</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            {step === 'request'
              ? 'Enter your administrator email and we will send you a verification code.'
              : 'Enter the code we sent and choose a new password. You will be signed out everywhere.'}
          </p>
        </div>

        {notice && step === 'confirm' && (
          <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700" role="status">{notice}</div>
        )}
        {error && (
          <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700" role="alert">{error}</div>
        )}

        {step === 'request' ? (
          <form onSubmit={handleRequest} className="space-y-5" noValidate>
            <div>
              <label htmlFor="reset-email" className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
              <div className="relative">
                <Mail className={iconClass} aria-hidden="true" />
                <input id="reset-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="admin@example.com" disabled={loading} />
              </div>
            </div>
            <button type="submit" disabled={loading} className={buttonClass}>{loading ? 'Sending...' : 'Send reset code'}</button>
          </form>
        ) : (
          <form onSubmit={handleConfirm} className="space-y-5" noValidate>
            <div>
              <label htmlFor="reset-code" className="block text-sm font-semibold text-slate-700 mb-2">6-digit code</label>
              <div className="relative">
                <KeyRound className={iconClass} aria-hidden="true" />
                <input id="reset-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} className={inputClass} placeholder="123456" disabled={loading} />
              </div>
            </div>
            <div>
              <label htmlFor="reset-password" className="block text-sm font-semibold text-slate-700 mb-2">New password</label>
              <div className="relative">
                <Lock className={iconClass} aria-hidden="true" />
                <input id="reset-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="At least 12 characters" disabled={loading} />
              </div>
              <p className="mt-2 text-xs text-slate-500">Use 12+ characters with uppercase, lowercase and a number.</p>
            </div>
            <div>
              <label htmlFor="reset-confirm" className="block text-sm font-semibold text-slate-700 mb-2">Confirm new password</label>
              <div className="relative">
                <Lock className={iconClass} aria-hidden="true" />
                <input id="reset-confirm" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} disabled={loading} />
              </div>
            </div>
            <button type="submit" disabled={loading} className={buttonClass}>{loading ? 'Updating...' : 'Reset password'}</button>
            <button type="button" onClick={() => { setStep('request'); setError(''); setCode(''); }} className="w-full text-center text-sm font-semibold text-primary-700 hover:underline" disabled={loading}>
              Request a new code
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-sm">
          <Link to="/admin/login" className="font-semibold text-primary-700 hover:text-primary-900 hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default AdminForgotPassword;
