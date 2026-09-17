import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { usePortal } from '../context/PortalContext';

export default function StudentRouteGuard({ children }) {
  const { loggedInUser, verifySession } = usePortal();
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let active = true;
    let checkVersion = 0;
    const check = async () => {
      const version = ++checkVersion;
      setStatus('checking');
      const authenticated = await verifySession();
      if (active && version === checkVersion) {
        setStatus(authenticated ? 'authenticated' : 'unauthenticated');
      }
    };
    check();
    window.addEventListener('focus', check);
    return () => {
      active = false;
      window.removeEventListener('focus', check);
    };
  }, [verifySession]);

  if (status === 'checking') return null;
  if (status !== 'authenticated' || !loggedInUser) return <Navigate to="/login" replace />;
  return children;
}
