import { usePortal } from '../context/PortalContext';
import { LogOut, User, GraduationCap, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MilestoneStep = ({ milestone, status }) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'completed':
        return {
          bgColor: 'bg-primary-600',
          textColor: 'text-white',
          iconColor: 'text-white',
          border: 'border-primary-600',
        };
      case 'current':
        return {
          bgColor: 'bg-accent-400',
          textColor: 'text-primary-900',
          iconColor: 'text-primary-900',
          border: 'border-accent-400',
        };
      default:
        return {
          bgColor: 'bg-gray-200',
          textColor: 'text-gray-500',
          iconColor: 'text-gray-500',
          border: 'border-gray-300',
        };
    }
  };

  const styles = getStatusStyles();

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-12 h-12 rounded-full ${styles.bgColor} border-2 ${styles.border} flex items-center justify-center ${
          status === 'current' ? 'animate-pulse-gold' : ''
        }`}>
          {status === 'completed' && <CheckCircle className={`w-6 h-6 ${styles.iconColor}`} />}
          {status === 'current' && <Clock className={`w-6 h-6 ${styles.iconColor}`} />}
          {status === 'pending' && <Clock className={`w-6 h-6 ${styles.iconColor}`} />}
        </div>
        <div className={`flex-1 w-0.5 ${status === 'completed' ? 'bg-primary-600' : 'bg-gray-300'} mt-2`} />
      </div>
      <div className="pb-8">
        <h3 className={`font-bold text-lg ${
          status === 'pending' ? 'text-gray-500' : 'text-gray-900'
        }`}>
          {milestone.title}
        </h3>
        <p className={`text-sm mt-1 ${
          status === 'pending' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          {milestone.description}
        </p>
        <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${
          status === 'completed' ? 'bg-primary-100 text-primary-700' :
          status === 'current' ? 'bg-accent-100 text-primary-900' :
          'bg-gray-100 text-gray-600'
        }`}>
          {status === 'completed' ? 'Completed' :
           status === 'current' ? 'In Progress' : 'Pending'}
        </span>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { applicationData, milestones, mockMilestoneStatus, logout } = usePortal();
  const navigate = useNavigate();

  const handleLogout = () => {
    const name = applicationData.fullName || (loggedInUser && loggedInUser.name) || '';
    logout();
    navigate('/logout', { state: { name } });
  };

  if (!applicationData.fullName) {
    navigate('/portal/setup');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-900">Student Dashboard</h1>
            <p className="text-gray-600 mt-1">Track your application progress</p>
          </div>
          <div className="flex items-center gap-4">
            {applicationData.profilePicture && (
              <img src={applicationData.profilePicture} alt="avatar" className="w-12 h-12 rounded-full object-cover border" />
            )}
            <button onClick={handleLogout} className="flex items-center gap-2 text-gray-600 hover:text-primary-600 transition-colors">
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary-600" />
              Profile Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider">Full Name</span>
                <p className="font-semibold text-gray-900">{applicationData.fullName}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider">Date of Birth</span>
                <p className="font-semibold text-gray-900">{applicationData.dateOfBirth}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider">Email Address</span>
                <p className="font-semibold text-gray-900">{applicationData.email}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider">Mobile Number</span>
                <p className="font-semibold text-gray-900">+{applicationData.countryCode} {applicationData.mobileNumber}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider">Country</span>
                <p className="font-semibold text-gray-900">{applicationData.country}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider">Passport Number</span>
                <p className="font-semibold text-gray-900">{applicationData.passportNumber}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider">Target University</span>
                <p className="font-semibold text-gray-900">{applicationData.targetUniversity}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider">Course of Study</span>
                <p className="font-semibold text-gray-900">{applicationData.courseOfStudy}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider">Intake Session</span>
                <p className="font-semibold text-gray-900">{applicationData.intakeSession}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider">Current Stage</span>
                <p className="font-semibold text-gray-900">{applicationData.currentStage}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Ready to Study?</h3>
                <p className="text-primary-200 text-sm">Your journey begins</p>
              </div>
            </div>
            <p className="text-primary-100 text-sm mb-4">
              You're on track with your UK university application. The next step is CAS Letter processing.
            </p>
            <div className="text-3xl font-display font-bold text-accent-400">
              3/5
            </div>
            <p className="text-xs text-primary-300">Milestones completed</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Application Timeline
          </h2>
          <div className="space-y-2">
            {milestones.map((milestone) => (
              <MilestoneStep
                key={milestone.id}
                milestone={milestone}
                status={mockMilestoneStatus[milestone.id]}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;