import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { adminLogin, getAdminMe } from '../../services/adminApi';

const AdminLogin = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      try {
        const result = await getAdminMe();
        if (!isMounted) return;

        if (result.success) {
          navigate('/admin/dashboard', { replace: true });
          return;
        }
      } catch {
        // Unauthenticated administrators should simply see the login form.
      } finally {
        if (isMounted) {
          setCheckingSession(false);
        }
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) {
      newErrors.email = 'Please enter your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }
    if (!formData.password) {
      newErrors.password = 'Please enter your password.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    try {
      const result = await adminLogin(formData);
      if (!result.success) {
        setErrors({ submit: 'Invalid email or password.' });
        setLoading(false);
        return;
      }

      const session = await getAdminMe();
      if (!session.success) {
        setErrors({ submit: 'Unable to confirm your admin session. Please try again.' });
        setLoading(false);
        return;
      }

      navigate('/admin/dashboard', { replace: true });
    } catch {
      setErrors({ submit: 'Unable to connect to the server. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (errors.submit) {
      setErrors((prev) => ({ ...prev, submit: '' }));
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="flex items-center gap-3 text-sm font-medium text-primary-900">
          <span className="h-5 w-5 rounded-full border-2 border-primary-200 border-t-primary-700 animate-spin" />
          Checking admin session
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="grid min-h-[620px] lg:grid-cols-[0.95fr_1.05fr]">
          <div className="hidden bg-primary-900 px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <img src="/logo.png" alt="Universe Consult Logo" className="h-20 w-auto bg-white rounded-xl px-3 py-2" />
              <div className="mt-12">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-accent-400">Secure Access</p>
                <h1 className="mt-4 text-4xl font-display font-bold leading-tight text-white">
                  Universe Consult administration
                </h1>
                <p className="mt-5 max-w-sm text-sm leading-6 text-primary-100">
                  Manage student applications and enquiries through a protected business portal.
                </p>
              </div>
            </div>
            <div className="border-t border-white/15 pt-6 text-xs leading-5 text-primary-200">
              Authorized personnel only. All access is authenticated and monitored.
            </div>
          </div>

          <div className="flex items-center justify-center px-5 py-10 sm:px-10 lg:px-14">
            <div className="w-full max-w-md">
              <div className="mb-8 text-center lg:text-left">
                <img src="/logo.png" alt="Universe Consult Logo" className="mx-auto mb-6 h-16 w-auto lg:hidden" />
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-600">Admin Portal</p>
                <h2 className="mt-3 text-3xl font-display font-bold text-slate-950">Administrator Login</h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Sign in with your administrator credentials to continue.
                </p>
              </div>

              {errors.submit && (
                <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700" role="alert">
                  {errors.submit}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full rounded-lg border bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-primary-600 focus:ring-4 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-slate-50 ${errors.email ? 'border-rose-400' : 'border-slate-300'}`}
                      placeholder="admin@example.com"
                      disabled={loading}
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? 'email-error' : undefined}
                    />
                  </div>
                  {errors.email && <p id="email-error" className="mt-2 text-sm text-rose-600">{errors.email}</p>}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`w-full rounded-lg border bg-white py-3 pl-11 pr-12 text-sm text-slate-900 outline-none transition focus:border-primary-600 focus:ring-4 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-slate-50 ${errors.password ? 'border-rose-400' : 'border-slate-300'}`}
                      placeholder="Enter your password"
                      disabled={loading}
                      aria-invalid={Boolean(errors.password)}
                      aria-describedby={errors.password ? 'password-error' : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                    </button>
                  </div>
                  {errors.password && <p id="password-error" className="mt-2 text-sm text-rose-600">{errors.password}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-900 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-primary-800 focus:outline-none focus:ring-4 focus:ring-primary-200 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading && <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden="true" />}
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <p className="mt-8 text-center text-xs leading-5 text-slate-500 lg:text-left">
                Access is restricted to authorized Universe Consult administrators.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
