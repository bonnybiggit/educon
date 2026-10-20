import { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { getStudentMe, loginStudent, logoutStudent } from '../services/studentApi';
import { APPLICATION_STAGES, getApplicationStageIndex } from '../data/applicationStages';

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

  const milestones = useMemo(() => APPLICATION_STAGES.map((stage, index) => ({
    id: index + 1,
    title: stage.label,
    description: stage.description,
  })), []);

  // Unknown/legacy currentStage values (from before this stage system) safely fall back to "not started".
  const stageIndex = getApplicationStageIndex(applicationData.currentStage);
  const hasKnownStage = stageIndex >= 0;
  const completedMilestoneCount = !hasKnownStage
    ? 0
    : stageIndex === milestones.length - 1
      ? milestones.length
      : stageIndex;
  const milestoneStatuses = useMemo(() => milestones.reduce((statuses, milestone, index) => {
    statuses[milestone.id] = !hasKnownStage
      ? 'pending'
      : index < completedMilestoneCount
        ? 'completed'
        : index === stageIndex
          ? 'current'
          : 'pending';
    return statuses;
  }, {}), [completedMilestoneCount, hasKnownStage, milestones, stageIndex]);

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
