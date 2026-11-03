import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { usePortal } from '../context/PortalContext';
import { Mail, Lock, LogIn, AlertCircle, Eye, EyeOff, Loader2, GraduationCap, BookOpen, Globe2 } from 'lucide-react';
import Seo from '../components/Seo';
import StudentAuthShell from '../components/StudentAuthShell';

const highlights = [
  { icon: Globe2, text: 'Explore international universities' },
  { icon: BookOpen, text: 'Pick up where you left off' },
  { icon: GraduationCap, text: 'Track your application journey' },
];

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = usePortal();

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    const result = await login(formData.email, formData.password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setErrors({ submit: result.error });
    }
    setIsLoading(false);
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) {
      setErrors(prev => ({ ...prev, [e.target.name]: '' }));
    }
  };

  return (
    <StudentAuthShell
      heading={<>Welcome Back to <span className="text-accent-400">Universe Consults</span></>}
      text="Sign in to continue your global education journey."
      highlights={highlights}
    >
      <Seo
        title="Student Login | Universe Consult"
        description="Sign in to the private Universe Consult student portal."
        pathname="/login"
        noIndex
      />
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-primary-900">Welcome Back</h2>
        <p className="mt-2 text-gray-600">Sign in to your student account.</p>
        <div className="mt-4 h-1 w-12 rounded-full bg-accent-400" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl bg-white text-gray-900 placeholder:text-gray-400 transition focus:outline-none focus:ring-4 focus:ring-primary-500/15 focus:border-primary-600 ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="student@test.com"
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-12 py-3 border rounded-xl bg-white text-gray-900 placeholder:text-gray-400 transition focus:outline-none focus:ring-4 focus:ring-primary-500/15 focus:border-primary-600 ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="password123"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-gray-500 hover:text-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.password}
                </p>
              )}
              <div className="mt-2 text-right">
                <Link to="/forgot-password" className="text-sm font-medium text-primary-600 hover:text-primary-700">
                  Forgot password?
                </Link>
              </div>
            </div>

            {errors.submit && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.submit}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary-900 hover:bg-primary-800 text-white font-semibold py-3.5 rounded-xl border-b-4 border-accent-400 shadow-lg shadow-primary-900/20 transition flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-400/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
              Sign In
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <Link to="/portal/setup" className="text-sm text-primary-700 hover:text-primary-900 hover:underline font-medium rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
              New to Universe Consults? Create an account.
            </Link>
          </div>
    </StudentAuthShell>
  );
};

export default Login;
