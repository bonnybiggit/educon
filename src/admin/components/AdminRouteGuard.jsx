import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getAdminMe } from '../../services/adminApi';
import { hasRole } from '../permissions';

const AdminRouteGuard = ({ children, roles = [] }) => {
  const [status, setStatus] = useState('checking');
  const [admin, setAdmin] = useState(null);
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      try {
        const result = await getAdminMe();
        if (!isMounted) return;
        if (result.success && result.data?.admin) {
          setAdmin(result.data.admin);
          setStatus('authenticated');
        } else {
          setStatus('unauthenticated');
        }
      } catch {
        if (isMounted) {
          setStatus('unauthenticated');
        }
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, []);

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="flex items-center gap-3 text-sm font-medium text-primary-900">
          <span className="h-5 w-5 rounded-full border-2 border-primary-200 border-t-primary-700 animate-spin" />
          Checking admin session
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/admin/login" replace />;
  }

  if (admin?.passwordChangeRequired && location.pathname !== '/admin/settings') {
    return <Navigate to="/admin/settings" replace />;
  }

  if (roles.length && !hasRole(admin, roles)) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
        <div className="mx-auto max-w-xl rounded-xl border border-rose-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-rose-600">Restricted</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">You are not authorized to view this page.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Please contact a Super Admin if you need access.</p>
        </div>
      </div>
    );
  }

  return typeof children === 'function' ? children(admin) : children;
};

export default AdminRouteGuard;
