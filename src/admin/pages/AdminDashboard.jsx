import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Clock,
  Search,
  CheckCircle2,
  Mail,
  AlertCircle,
  Plus,
  ArrowRight,
  RefreshCcw
} from 'lucide-react';
import { getAdminDashboard, getAdminMe } from '../../services/adminApi';

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [admin, setAdmin] = useState(() => {
    try {
      const raw = sessionStorage.getItem('educonAdminProfile');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getAdminDashboard();
      if (!result.success) {
        throw new Error(result.message || 'Unable to load dashboard data');
      }
      setData(result.data);
    } catch (err) {
      setError(err.message || 'Unable to connect to the server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const verifySessionAndLoad = async () => {
      try {
        if (!admin) {
          const profileResult = await getAdminMe();
          if (profileResult.success && profileResult.data?.admin) {
            setAdmin(profileResult.data.admin);
            sessionStorage.setItem('educonAdminProfile', JSON.stringify(profileResult.data.admin));
          } else {
            navigate('/admin/login', { replace: true });
            return;
          }
        }
        await fetchDashboardData();
      } catch {
        navigate('/admin/login', { replace: true });
      }
    };
    verifySessionAndLoad();
  }, [admin, fetchDashboardData, navigate]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <RefreshCcw className="w-8 h-8 text-primary-900 animate-spin" />
        <p className="text-slate-500 font-semibold text-sm">Fetching overview statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 text-center max-w-xl mx-auto my-10">
        <AlertCircle className="w-12 h-12 text-rose-600 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-900 mb-2">Error Loading Dashboard</h3>
        <p className="text-rose-700 text-sm mb-6">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition"
        >
          <RefreshCcw className="w-4 h-4" /> Try Again
        </button>
      </div>
    );
  }

  const { students = {}, enquiries = {}, recentStudents = [], recentEnquiries = [] } = data || {};

  return (
    <div className="space-y-8">
      {/* Dynamic Greeting */}
      <div>
        <h2 className="text-3xl font-display font-bold text-slate-950">
          {getGreeting()}, {admin?.fullName || 'Administrator'}
        </h2>
        <p className="text-slate-600 text-sm mt-1">
          Here's an overview of your Universe Consult activity.
        </p>
      </div>

      {/* Row 1: Student Status Metrics */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Students */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-start gap-4">
          <div className="p-3 bg-primary-50 rounded-xl text-primary-900 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">Total Students</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-2">{students.total ?? 0}</p>
          </div>
        </div>

        {/* Pending */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-start gap-4">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">Pending Applications</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-2">{students.pending ?? 0}</p>
          </div>
        </div>

        {/* Review */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-start gap-4">
          <div className="p-3 bg-sky-50 rounded-xl text-sky-600 shrink-0">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">Under Review</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-2">{students.review ?? 0}</p>
          </div>
        </div>

        {/* Approved */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-start gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">Approved</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-2">{students.approved ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Row 2: Enquiry Metrics */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Total Enquiries */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-start gap-4">
          <div className="p-3 bg-primary-50 rounded-xl text-primary-900 shrink-0">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">Total Enquiries</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-2">{enquiries.total ?? 0}</p>
          </div>
        </div>

        {/* New Enquiries */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-start gap-4">
          <div className="p-3 bg-purple-50 rounded-xl text-purple-600 shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">New Enquiries</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-2">{enquiries.new ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Grid: Recent Students & Recent Enquiries */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Recent Students Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="font-semibold text-slate-950 text-lg">Recent Student Signups</h3>
              <Link
                to="/admin/students"
                className="text-xs font-bold text-primary-900 hover:text-primary-700 flex items-center gap-1 transition"
              >
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentStudents.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">No students have been registered yet.</p>
            ) : (
              <div className="space-y-4">
                {recentStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-sm transition"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{student.fullName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{student.email}</p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-2xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          student.status === 'accepted'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : student.status === 'in review'
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : student.status === 'declined'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {student.status || 'pending'}
                      </span>
                      <p className="text-3xs text-slate-400 mt-1.5">
                        {new Date(student.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Enquiries Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="font-semibold text-slate-950 text-lg">Recent Enquiries</h3>
              <Link
                to="/admin/enquiries"
                className="text-xs font-bold text-primary-900 hover:text-primary-700 flex items-center gap-1 transition"
              >
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentEnquiries.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">No enquiries yet.</p>
            ) : (
              <div className="space-y-4">
                {recentEnquiries.map((enquiry) => (
                  <div
                    key={enquiry.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-sm transition"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{enquiry.name}</p>
                      <p className="text-xs font-medium text-primary-700 mt-0.5">{enquiry.subject}</p>
                      <p className="text-3xs text-slate-400 mt-0.5">{enquiry.email}</p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-2xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          enquiry.status === 'replied'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : enquiry.status === 'closed'
                            ? 'bg-slate-100 text-slate-700 border border-slate-300'
                            : enquiry.status === 'read'
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {enquiry.status === 'new' ? 'New' : enquiry.status}
                      </span>
                      <p className="text-3xs text-slate-400 mt-1.5">
                        {new Date(enquiry.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-950 text-lg mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-4">
          <Link
            to="/admin/students"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-900 text-white rounded-xl text-sm font-bold hover:bg-primary-800 transition"
          >
            <Plus className="w-4 h-4" /> Add Student
          </Link>
          <Link
            to="/admin/students"
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-300 text-slate-700 bg-white rounded-xl text-sm font-semibold hover:bg-slate-50 transition"
          >
            View Students
          </Link>
          <Link
            to="/admin/enquiries"
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-300 text-slate-700 bg-white rounded-xl text-sm font-semibold hover:bg-slate-50 transition"
          >
            View Enquiries
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
