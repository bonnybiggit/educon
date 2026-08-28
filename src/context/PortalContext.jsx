import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { loginStudent } from '../services/studentApi';

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

const getStoredStudentProfile = () => {
  try {
    const rawProfile = sessionStorage.getItem('educonStudentProfile');
    return rawProfile ? JSON.parse(rawProfile) : null;
  } catch {
    return null;
  }
};

export const PortalProvider = ({ children }) => {
  const [loggedInUser, setLoggedInUser] = useState(() => getStoredStudentProfile());
  const [applicationData, setApplicationData] = useState(() => {
    const storedProfile = getStoredStudentProfile();
    return storedProfile ? { ...defaultApplicationData, ...storedProfile } : { ...defaultApplicationData };
  });

  const milestones = useMemo(() => [
    { id: 1, title: 'Initial Enrollment Deposit', description: 'Deposit received and enrollment confirmed' },
    { id: 2, title: 'Document Verification', description: 'Academic documents under review' },
    { id: 3, title: 'CAS Letter Issuance', description: 'Confirmation of Acceptance for Studies' },
    { id: 4, title: 'Visa Application Submission', description: 'Visa application in process' },
    { id: 5, title: 'Flight & Pre-Departure Briefing', description: 'Final preparations before travel' },
  ], []);

  const mockMilestoneStatus = useMemo(() => ({
    1: 'completed',
    2: 'completed',
    3: 'current',
    4: 'pending',
    5: 'pending',
  }), []);

  useEffect(() => {
    if (loggedInUser) {
      const profile = { ...defaultApplicationData, ...loggedInUser };
      setApplicationData(profile);
      sessionStorage.setItem('educonStudentProfile', JSON.stringify(profile));
      sessionStorage.setItem('educonStudentAuthenticated', 'true');
    }
  }, [loggedInUser]);

  const login = async (email, password) => {
    try {
      const result = await loginStudent({ email, password });

      if (!result.success) {
        return { success: false, error: result.error || 'Login failed' };
      }

      const profile = { ...defaultApplicationData, ...(result.data?.user || result.user) };
      setLoggedInUser(profile);
      setApplicationData(profile);
      sessionStorage.setItem('educonStudentProfile', JSON.stringify(profile));
      sessionStorage.setItem('educonStudentAuthenticated', 'true');
      return { success: true };
    } catch {
      return { success: false, error: 'Login service unavailable' };
    }
  };

  const updateApplicationData = (data) => {
    const merged = { ...defaultApplicationData, ...applicationData, ...data };
    setApplicationData(merged);
    sessionStorage.setItem('educonStudentProfile', JSON.stringify(merged));
  };

  const logout = () => {
    setLoggedInUser(null);
    setApplicationData({ ...defaultApplicationData });
    sessionStorage.removeItem('educonStudentAuthenticated');
    sessionStorage.removeItem('educonStudentProfile');
  };

  return (
    <PortalContext.Provider value={{
      loggedInUser,
      applicationData,
      milestones,
      mockMilestoneStatus,
      login,
      logout,
      updateApplicationData,
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
