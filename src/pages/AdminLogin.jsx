import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';

const ADMIN_EMAIL = 'admin@educon.com';
const ADMIN_PASSWORD = 'Admin123!';

const AdminLogin = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    setTimeout(() => {
      if (formData.email.toLowerCase() === ADMIN_EMAIL && formData.password === ADMIN_PASSWORD) {
        sessionStorage.setItem('educonAdminAuthenticated', 'true');
        navigate('/admin/dashboard');
      } else {
        setErrors({ submit: 'Incorrect admin credentials' });
      }
      setLoading(false);
    }, 400);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-slate-900/95 border border-slate-700 rounded-3xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Universe Consult Logo" className="mx-auto h-16 mb-4" />
          <h1 className="text-3xl font-bold">Admin Portal</h1>
          <p className="text-slate-400 mt-2">Login to manage registrations, update statuses, and review pending applications.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-200 mb-2">Admin Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="admin@educon.com"
                disabled={loading}
              />
            </div>
            {errors.email && <p className="mt-2 text-sm text-rose-400">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-200 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Enter admin password"
                disabled={loading}
              />
            </div>
            {errors.password && <p className="mt-2 text-sm text-rose-400">{errors.password}</p>}
          </div>

          {errors.submit && <p className="text-center text-sm text-rose-400">{errors.submit}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center rounded-2xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400 transition"
          >
            {loading ? 'Verifying...' : 'Sign in as Admin'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-700 text-center text-xs text-slate-400">
          <p className="mb-3 font-semibold text-slate-300">Demo Credentials</p>
          <p>Email: <span className="text-slate-200 font-mono">admin@educon.com</span></p>
          <p>Password: <span className="text-slate-200 font-mono">Admin123!</span></p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
