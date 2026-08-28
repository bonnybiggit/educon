import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getAdminMe } from '../../services/adminApi';

const AdminRouteGuard = ({ children }) => {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      try {
        const result = await getAdminMe();
        if (!isMounted) return;
        setStatus(result.success ? 'authenticated' : 'unauthenticated');
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

  return children;
};

export default AdminRouteGuard;
