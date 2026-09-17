import { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { getStudentMe, loginStudent, logoutStudent } from '../services/studentApi';

const PortalContext = createContext(null);

const defaultApplicationData = {
  fullName: '',
  dateOfBirth: '',
  email: '',
  mobileNumber: '',
  countryCode: '234',
  country: '',
  passportNumber: '',
  targetUniversity: '',
  customUniversity: '',
  profilePicture: '',
  courseOfStudy: '',
  intakeSession: '',
  currentStage: '',
  consent: false,
};

const completedMilestonesByStage = {
  'Initial Consultation': 0,
  'Document Preparation': 1,
  'Application Submitted': 2,
  'Document Verification': 3,
  'CAS Letter Processing': 4,
  'Visa Preparation': 5,
};

const clearLegacyStudentStorage = () => {
  try {
    sessionStorage.removeItem('educonStudentProfile');
    sessionStorage.removeItem('educonStudentAuthenticated');
  } catch {
    // Storage can be disabled; it is never used as authentication state.
  }
};

export const PortalProvider = ({ children }) => {
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const requestVersion = useRef(0);
  const applicationData = loggedInUser
    ? { ...defaultApplicationData, ...loggedInUser } : { ...defaultApplicationData };

  const milestones = useMemo(() => [
    { id: 1, title: 'Initial Enrollment Deposit', description: 'Deposit received and enrollment confirmed' },
    { id: 2, title: 'Document Verification', description: 'Academic documents under review' },
    { id: 3, title: 'CAS Letter Issuance', description: 'Confirmation of Acceptance for Studies' },
    { id: 4, title: 'Visa Application Submission', description: 'Visa application in process' },
    { id: 5, title: 'Flight & Pre-Departure Briefing', description: 'Final preparations before travel' },
  ], []);

  const completedMilestoneCount = Math.min(
    completedMilestonesByStage[applicationData.currentStage] ?? 0,
    milestones.length,
  );
  const milestoneStatuses = useMemo(() => milestones.reduce((statuses, milestone, index) => {
    statuses[milestone.id] = index < completedMilestoneCount
      ? 'completed'
      : index === completedMilestoneCount
        ? 'current'
        : 'pending';
    return statuses;
  }, {}), [completedMilestoneCount, milestones]);

  useEffect(() => {
    clearLegacyStudentStorage();
  }, []);

  const clearSession = useCallback(() => {
    requestVersion.current += 1;
    setLoggedInUser(null);
    setExpiresAt(null);
    clearLegacyStudentStorage();
  }, []);

  const acceptSession = useCallback((result) => {
    const expiry = Date.parse(result.data?.expiresAt);
    if (!result.success || !result.data?.user?.id || !Number.isFinite(expiry) || expiry <= Date.now()) {
      clearSession();
      return false;
    }
    setLoggedInUser(result.data.user);
    setExpiresAt(expiry);
    clearLegacyStudentStorage();
    return true;
  }, [clearSession]);

  const verifySession = useCallback(async () => {
    const version = ++requestVersion.current;
    try {
      const result = await getStudentMe();
      return version === requestVersion.current && acceptSession(result);
    } catch {
      if (version === requestVersion.current) clearSession();
      return false;
    }
  }, [acceptSession, clearSession]);

  useEffect(() => {
    if (!expiresAt) return;
    const timer = window.setTimeout(clearSession, Math.max(0, expiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [expiresAt, clearSession]);

  const login = async (email, password) => {
    const version = ++requestVersion.current;
    try {
      const result = await loginStudent({ email, password });

      if (version !== requestVersion.current || !acceptSession(result)) {
        return { success: false, error: result.message || 'Login failed' };
      }
      return { success: true };
    } catch {
      if (version === requestVersion.current) clearSession();
      return { success: false, error: 'Login service unavailable' };
    }
  };

  const logout = async () => {
    requestVersion.current += 1;
    try {
      const result = await logoutStudent();
      if (!result.success) return false;
      clearSession();
      return true;
    } catch {
      return false;
    }
  };

  return (
    <PortalContext.Provider value={{
      loggedInUser,
      applicationData,
      milestones,
      completedMilestoneCount,
      milestoneStatuses,
      login,
      logout,
      verifySession,
    }}>
      {children}
    </PortalContext.Provider>
  );
};

export const usePortal = () => {
  const context = useContext(PortalContext);
  if (!context) {
    throw new Error('usePortal must be used within PortalProvider');
  }
  return context;
};
