import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Lock, Mail } from 'lucide-react';
import { Globe2, ShieldCheck, GraduationCap } from 'lucide-react';
import Seo from '../components/Seo';
import StudentAuthShell from '../components/StudentAuthShell';
import { confirmStudentPasswordReset, requestStudentPasswordReset } from '../services/studentApi';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const highlights = [
  { icon: ShieldCheck, text: 'Secure email verification' },
  { icon: Globe2, text: 'Back to exploring universities' },
  { icon: GraduationCap, text: 'Continue your application journey' },
];

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!cooldown) return undefined;
    const timer = window.setInterval(() => setCooldown((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const sendCode = async () => {
    if (!emailPattern.test(email)) {
      setError('Enter a valid email address.');
      return;
    }
    setIsLoading(true);
    setError('');
    setNotice('');
    try {
      const result = await requestStudentPasswordReset(email);
      if (!result.success) {
        setError(result.message || 'Unable to send a reset code right now.');
        return;
      }
      setStep('confirm');
      setCooldown(60);
      setNotice(result.message);
    } catch {
      setError('Unable to reach the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequest = (event) => {
    event.preventDefault();
    sendCode();
  };

  const handleConfirm = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) return setError('Enter the 6-digit code from your email.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirmPassword) return setError('Passwords do not match.');

    setIsLoading(true);
    setError('');
    try {
      const result = await confirmStudentPasswordReset({ email, code, password });
      if (!result.success) {
        setError(result.message || 'Unable to reset your password.');
        return;
      }
      setStep('done');
    } catch {
      setError('Unable to reach the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = 'w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 transition focus:outline-none focus:ring-4 focus:ring-primary-500/15 focus:border-primary-600';
  const primaryButton = 'w-full flex items-center justify-center gap-2 bg-primary-900 hover:bg-primary-800 text-white font-semibold py-3.5 rounded-xl border-b-4 border-accent-400 shadow-lg shadow-primary-900/20 transition focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-400/50 disabled:opacity-50 disabled:cursor-not-allowed';
  const focusLink = 'rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500';

  return (
    <StudentAuthShell
      heading={<>Securely Recover <span className="text-accent-400">Your Account</span></>}
      text="Forgot your password? We're here to help you get back to your education journey."
      highlights={highlights}
    >
      <Seo
        title="Reset Password | Universe Consult"
        description="Reset your Universe Consult student portal password."
        pathname="/forgot-password"
        noIndex
      />
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-primary-900">
          {step === 'done' ? 'Password Updated' : 'Forgot Your Password?'}
        </h2>
        <p className="mt-2 text-gray-600">
          {step === 'request' && 'Enter your registered email address to receive a verification code.'}
          {step === 'confirm' && 'Enter the code we emailed you and choose a new password.'}
          {step === 'done' && 'Your password has been updated.'}
        </p>
        <div className="mt-4 h-1 w-12 rounded-full bg-accent-400" />
      </div>

          {step === 'request' && (
            <form onSubmit={handleRequest} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="email" id="email" name="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} placeholder="you@example.com" disabled={isLoading} />
                </div>
              </div>
              {error && <p className="text-sm text-red-600 flex items-center gap-1" role="alert"><AlertCircle className="w-4 h-4" />{error}</p>}
              <button type="submit" disabled={isLoading} className={primaryButton}>
                {isLoading ? 'Sending...' : 'Send Reset Code'}
              </button>
            </form>
          )}

          {step === 'confirm' && (
            <form onSubmit={handleConfirm} className="space-y-6">
              {notice && <p className="text-sm text-gray-600 bg-primary-50 rounded-lg p-3" role="status">{notice}</p>}
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">Reset Code</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className={`${inputClass} tracking-[0.3em] font-semibold`} placeholder="000000" disabled={isLoading} />
                </div>
              </div>
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type={showPassword ? 'text' : 'password'} id="newPassword" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className={`${inputClass} pr-12`} placeholder="At least 6 characters" disabled={isLoading} />
                  <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-gray-500 hover:text-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type={showPassword ? 'text' : 'password'} id="confirmNewPassword" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputClass} placeholder="Repeat password" disabled={isLoading} />
                </div>
              </div>
              {error && <p className="text-sm text-red-600 flex items-center gap-1" role="alert"><AlertCircle className="w-4 h-4" />{error}</p>}
              <button type="submit" disabled={isLoading} className={primaryButton}>
                {isLoading ? 'Updating...' : 'Update Password'}
              </button>
              <button type="button" onClick={sendCode} disabled={isLoading || cooldown > 0} className={`w-full text-sm font-semibold text-primary-700 hover:text-primary-900 disabled:text-gray-400 ${focusLink}`}>
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
              </button>
            </form>
          )}

          {step === 'done' && (
            <div className="text-center space-y-6">
              <CheckCircle2 className="w-14 h-14 text-green-600 mx-auto" />
              <p className="text-sm text-gray-600">For your security you have been signed out of all devices.</p>
              <button type="button" onClick={() => navigate('/login')} className={primaryButton}>
                Go to Sign In
              </button>
            </div>
          )}

          {step !== 'done' && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <Link to="/login" className={`block text-center text-sm text-primary-700 hover:text-primary-900 hover:underline font-medium ${focusLink}`}>Back to sign in</Link>
            </div>
          )}
    </StudentAuthShell>
  );
};

export default ForgotPassword;
