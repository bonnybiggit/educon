import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Files,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MessageCircle,
} from 'lucide-react';
import { usePortal } from '../context/PortalContext';

const navigationItems = [
  { label: 'Dashboard', mobileLabel: 'Home', to: '/dashboard', icon: LayoutDashboard },
  { label: 'My application', mobileLabel: 'Application', to: '/profile', icon: Files },
];

const getLinkClassName = ({ isActive }) => (
  `group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-colors ${
    isActive
      ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/10'
      : 'text-slate-300 hover:bg-white/5 hover:text-white'
  }`
);

const StudentPortalLayout = ({ children }) => {
  const { loggedInUser, logout } = usePortal();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const studentName = loggedInUser?.fullName || loggedInUser?.name || 'Student';
  const studentInitial = studentName.trim().charAt(0).toUpperCase() || 'S';

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setSignOutError('');
    const succeeded = await logout();
    if (succeeded) {
      navigate('/logout', { state: { name: studentName } });
      return;
    }
    setSignOutError('Unable to sign out. Please try again.');
    setIsSigningOut(false);
  };

  const renderNavigation = (mobile = false) => (
    <nav aria-label="Student portal">
      <ul className={mobile ? 'grid grid-cols-2 gap-2' : 'space-y-1.5'}>
        {navigationItems.map(({ label, mobileLabel, to, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end
              className={({ isActive }) => (mobile
                ? `group flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-semibold transition-colors ${
                  isActive ? 'bg-white/10 text-white ring-1 ring-white/10' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`
                : getLinkClassName({ isActive }))}
            >
              {({ isActive }) => (
                <>
                  <Icon className={`${mobile ? 'h-4 w-4' : 'h-5 w-5'} shrink-0 ${isActive ? 'text-accent-400' : 'text-slate-400 group-hover:text-slate-200'}`} aria-hidden="true" />
                  <span>{mobile ? mobileLabel : label}</span>
                  {isActive && !mobile && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent-400" aria-hidden="true" />}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );

  const renderSignOut = () => (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isSigningOut}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/5 hover:text-white disabled:cursor-wait disabled:opacity-60 lg:justify-start"
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      {isSigningOut ? 'Signing out...' : 'Sign out'}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 lg:pl-72">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col overflow-y-auto bg-[#0b1b31] px-5 py-7 text-white shadow-2xl shadow-slate-950/15 lg:flex">
        <div className="flex items-center gap-3 px-2">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/10">
            <GraduationCap className="h-6 w-6 text-accent-400" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-bold tracking-[0.16em] text-white">UNIVERSE</span>
            <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.25em] text-accent-300">Consults · Student</span>
          </span>
        </div>

        <div className="mt-10 px-3 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
          Student workspace
        </div>
        <div className="mt-3">{renderNavigation()}</div>

        <div className="mt-auto space-y-5 pt-10">
          <NavLink to="/support" className="block rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.07]">
            <span className="flex items-center gap-2 text-sm font-semibold text-white">
              <MessageCircle className="h-4 w-4 text-sky-300" aria-hidden="true" />
              Need a hand?
            </span>
            <span className="mt-1.5 block text-xs leading-relaxed text-slate-400">
              Our team is here to support your application.
            </span>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent-300">
              Contact support <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </NavLink>

          <div className="border-t border-white/10 pt-5">
            <div className="mb-4 flex items-center gap-3 px-1">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#17375b] text-sm font-bold text-accent-300 ring-1 ring-white/10">
                {studentInitial}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-white">{studentName}</span>
                <span className="mt-0.5 block text-xs text-slate-400">Student account</span>
              </span>
            </div>
            {renderSignOut()}
            {signOutError && <p className="mt-2 text-xs text-rose-300" role="status">{signOutError}</p>}
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b1b31] px-4 py-3 text-white shadow-lg shadow-slate-950/10 lg:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10">
              <GraduationCap className="h-5 w-5 text-accent-400" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-bold tracking-[0.12em]">UNIVERSE CONSULTS</span>
              <span className="block truncate text-[10px] text-slate-400">{studentName}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            aria-label="Sign out"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mx-auto mt-3 max-w-5xl">
          {renderNavigation(true)}
          {signOutError && <p className="mt-2 text-xs text-rose-300" role="status">{signOutError}</p>}
        </div>
      </header>

      <div className="min-w-0">
        {children}
        <div className="px-4 pb-5 text-center text-[11px] font-medium tracking-wide text-slate-400">
          UNIVERSE CONSULTS <span className="px-1 text-accent-500">·</span> STUDENT PORTAL
        </div>
      </div>
    </div>
  );
};

export default StudentPortalLayout;
