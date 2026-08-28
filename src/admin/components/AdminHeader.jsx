import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { getAdminMe } from '../../services/adminApi';

const pageTitles = {
  '/admin/dashboard': 'Dashboard',
  '/admin/students': 'Students',
  '/admin/enquiries': 'Enquiries',
  '/admin/services': 'Services',
  '/admin/testimonials': 'Testimonials',
  '/admin/blog': 'Blog',
  '/admin/settings': 'Settings',
};

const AdminHeader = ({ onMenuToggle }) => {
  const location = useLocation();
  const [admin, setAdmin] = useState(() => {
    try {
      const raw = sessionStorage.getItem('educonAdminProfile');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!admin) {
      const fetchAdminProfile = async () => {
        try {
          const result = await getAdminMe();
          if (result.success && result.data?.admin) {
            setAdmin(result.data.admin);
            sessionStorage.setItem('educonAdminProfile', JSON.stringify(result.data.admin));
          }
        } catch (error) {
          console.error('Failed to retrieve admin details:', error);
        }
      };
      fetchAdminProfile();
    }
  }, [admin]);

  const currentTitle = pageTitles[location.pathname] || 'Admin Control Panel';

  // Get initials for profile placeholder
  const getInitials = (fullName) => {
    if (!fullName) return 'A';
    return fullName
      .split(' ')
      .map((name) => name[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="h-20 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      {/* Left: Mobile Menu Trigger & Page Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-950 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="text-xl md:text-2xl font-display font-bold text-slate-900 leading-tight">
          {currentTitle}
        </h1>
      </div>

      {/* Right: Administrator Information */}
      {admin && (
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-900">{admin.fullName || 'Admin User'}</p>
            <p className="text-xs font-semibold text-accent-600 uppercase tracking-wider">
              {admin.role || 'Administrator'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary-900 text-white flex items-center justify-center font-bold text-sm border-2 border-accent-400 shadow-sm">
            {getInitials(admin.fullName)}
          </div>
        </div>
      )}
    </header>
  );
};

export default AdminHeader;
