import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Lock, Mail } from 'lucide-react';
import Seo from '../components/Seo';
import { confirmStudentPasswordReset, requestStudentPasswordReset } from '../services/studentApi';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const inputClass = 'w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all';

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center px-4 py-12">
      <Seo
        title="Reset Password | Universe Consult"
        description="Reset your Universe Consult student portal password."
        pathname="/forgot-password"
        noIndex
      />
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <Link to="/" className="inline-block mb-6">
              <img src="/logo.png" alt="Universe Consult" className="h-16 mx-auto" />
            </Link>
            <h1 className="text-2xl font-display font-bold text-gray-900 mb-2">Reset your password</h1>
            <p className="text-gray-600 text-sm">
              {step === 'request' && 'Enter your registered email and we will send you a 6-digit reset code.'}
              {step === 'confirm' && 'Enter the code we emailed you and choose a new password.'}
              {step === 'done' && 'Your password has been updated.'}
            </p>
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
              <button type="submit" disabled={isLoading} className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
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
                  <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-600">
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
              <button type="submit" disabled={isLoading} className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {isLoading ? 'Updating...' : 'Update Password'}
              </button>
              <button type="button" onClick={sendCode} disabled={isLoading || cooldown > 0} className="w-full text-sm font-semibold text-primary-600 hover:text-primary-800 disabled:text-gray-400">
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
              </button>
            </form>
          )}

          {step === 'done' && (
            <div className="text-center space-y-6">
              <CheckCircle2 className="w-14 h-14 text-green-600 mx-auto" />
              <p className="text-sm text-gray-600">For your security you have been signed out of all devices.</p>
              <button type="button" onClick={() => navigate('/login')} className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-lg transition-all">
                Go to Sign In
              </button>
            </div>
          )}

          {step !== 'done' && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <Link to="/login" className="block text-center text-sm text-primary-600 hover:text-primary-700 font-medium">Back to sign in</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
