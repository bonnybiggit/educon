import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Mail,
  Briefcase,
  MessageSquare,
  FileText,
  Settings,
  LogOut,
  ShieldCheck,
  ClipboardList
} from 'lucide-react';
import { adminLogout } from '../../services/adminApi';
import { canManageAdmins, canManageEnquiries, canManageServices, canViewActivityLogs } from '../permissions';

const navigationItems = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Students', href: '/admin/students', icon: Users },
  { name: 'Enquiries', href: '/admin/enquiries', icon: Mail, canView: canManageEnquiries },
  { name: 'Services', href: '/admin/services', icon: Briefcase, canView: canManageServices },
  { name: 'Testimonials', href: '/admin/testimonials', icon: MessageSquare },
  { name: 'Blog', href: '/admin/blog', icon: FileText },
  { name: 'Admin Management', href: '/admin/admins', icon: ShieldCheck, canView: canManageAdmins },
  { name: 'Activity Logs', href: '/admin/activity-logs', icon: ClipboardList, canView: canViewActivityLogs },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

const AdminSidebar = ({ onClose, admin }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (href) => location.pathname === href;

  const handleLogoutClick = async () => {
    try {
      await adminLogout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      navigate('/admin/login');
      if (onClose) onClose();
    }
  };

  return (
    <aside className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Header section with Logo */}
      <div className="flex items-center justify-between px-6 py-6 border-b border-slate-100">
        <Link to="/admin/dashboard" className="flex items-center" onClick={onClose}>
          <img
            src="/logo.png"
            alt="Universe Consult Logo"
            className="h-12 w-auto object-contain"
          />
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navigationItems.filter((item) => !item.canView || item.canView(admin)).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500/20 ${
                active
                  ? 'bg-primary-50 text-primary-900 border-r-4 border-accent-400'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-primary-900'
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-primary-700' : 'text-slate-400 group-hover:text-primary-700'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout action */}
      <div className="p-4 border-t border-slate-100 bg-slate-50">
        <button
          type="button"
          onClick={handleLogoutClick}
          className="flex items-center w-full gap-3 px-4 py-3 text-sm font-semibold text-rose-600 rounded-lg transition-colors duration-150 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          aria-label="Sign out of administration panel"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
