import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, UserCheck, Clock3, RefreshCcw, ArrowRight, CheckCircle2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const studentStages = [
  'Initial Consultation',
  'Document Preparation',
  'Application Submitted',
  'Document Verification',
  'CAS Letter Processing',
  'Visa Preparation',
];
const statusOptions = ['pending', 'in review', 'accepted', 'declined'];

const AdminDashboard = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const adminLoggedIn = sessionStorage.getItem('educonAdminAuthenticated') === 'true';
    if (!adminLoggedIn) {
      navigate('/admin/login');
      return;
    }
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/students`);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Unable to load registrations');
      }
      setStudents(result.students.map((student) => ({
        ...student,
        localStatus: student.status || 'pending',
        localStage: student.currentStage || 'Initial Consultation',
      })));
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id) => {
    const student = students.find((item) => item.id === id);
    if (!student) return;
    setSavingId(id);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/students/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentStage: student.localStage, status: student.localStatus }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Unable to update student');
      }
      setStudents((prev) => prev.map((item) => item.id === id ? {
        ...item,
        currentStage: result.student.currentStage,
        status: result.student.status,
      } : item));
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setSavingId(null);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('educonAdminAuthenticated');
    navigate('/admin/login');
  };

  const summary = useMemo(() => {
    const total = students.length;
    const pending = students.filter((student) => student.status === 'pending').length;
    const inReview = students.filter((student) => student.status === 'in review').length;
    const approved = students.filter((student) => student.status === 'accepted').length;
    return { total, pending, inReview, approved };
  }, [students]);

  const pendingStudents = students.filter((student) => student.status === 'pending');
  const recentStudents = students.slice(0, 8);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <img src="/logo.png" alt="Universe Consult Logo" className="h-16 w-auto mb-4" />
            <h1 className="text-4xl font-display font-bold text-slate-900">Admin Control Centre</h1>
            <p className="mt-2 text-slate-600 max-w-2xl">Review all student registrations, move applications through stages, and monitor pending requests in real time.</p>
          </div>

          <div className="flex flex-wrap gap-3 justify-start lg:justify-end">
            <button onClick={handleLogout} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition">
              <ShieldCheck className="w-5 h-5" /> Sign out
            </button>
            <button onClick={fetchStudents} className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-500 transition">
              <RefreshCcw className="w-5 h-5" /> Refresh list
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-10">
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Total applications</p>
            <p className="mt-4 text-4xl font-bold text-slate-900">{summary.total}</p>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Pending registration</p>
            <p className="mt-4 text-4xl font-bold text-amber-600">{summary.pending}</p>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Under review</p>
            <p className="mt-4 text-4xl font-bold text-sky-600">{summary.inReview}</p>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Approved</p>
            <p className="mt-4 text-4xl font-bold text-emerald-600">{summary.approved}</p>
          </div>
        </div>

        <div className="mb-10 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="font-semibold text-slate-900">Recently registered</h2>
            <p className="mt-2 text-sm text-slate-500">Most recent student signups.</p>
            <ul className="mt-6 space-y-4">
              {recentStudents.length === 0 ? (
                <li className="text-sm text-slate-500">No registrations yet.</li>
              ) : recentStudents.map((student) => (
                <li key={student.id} className="rounded-3xl border border-slate-200 p-4 bg-slate-50">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{student.fullName}</p>
                      <p className="text-sm text-slate-500">{student.email}</p>
                    </div>
                    <span className="text-xs uppercase tracking-[0.18em] text-slate-400">{new Date(student.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{student.targetUniversity} • {student.courseOfStudy}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl bg-slate-950 p-6 shadow-2xl text-white border border-slate-900">
            <div className="flex items-center gap-3 mb-4">
              <UserCheck className="w-6 h-6 text-sky-400" />
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Pending</p>
                <p className="mt-1 text-3xl font-extrabold">{summary.pending}</p>
              </div>
            </div>
            <p className="text-sm leading-6 text-slate-300">These students have registered and are waiting for review. Update their stage and status from the table below.</p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <Clock3 className="w-6 h-6 text-amber-500" />
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Work queue</p>
                <p className="mt-1 text-3xl font-extrabold">{pendingStudents.length}</p>
              </div>
            </div>
            <p className="text-sm leading-6 text-slate-600">These are applications that are ready for your action right now.</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-sm border border-slate-200">
          <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-950 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Student Registry</h2>
              <p className="mt-1 text-sm text-slate-400">Search and manage every registration from one page.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/admin/login" className="text-sm text-slate-300 underline hover:text-white">Admin login</Link>
              <button onClick={fetchStudents} className="inline-flex items-center gap-2 rounded-2xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 transition">
                <ArrowRight className="w-4 h-4" /> Refresh
              </button>
            </div>
          </div>
          <div className="px-4 py-4 sm:px-6">
            {loading ? (
              <div className="flex items-center justify-center py-24 text-slate-500">Loading registrations…</div>
            ) : error ? (
              <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-5 text-sm text-rose-700">{error}</div>
            ) : (
              <div className="space-y-6">
                {students.length === 0 ? (
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-10 text-center text-slate-500">No student registrations have been received yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-100 text-slate-600">
                        <tr>
                          <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Name</th>
                          <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Email</th>
                          <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">University</th>
                          <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Stage</th>
                          <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Status</th>
                          <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Registered</th>
                          <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {students.map((student) => (
                          <tr key={student.id} className="hover:bg-slate-50">
                            <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-900">{student.fullName}</td>
                            <td className="whitespace-nowrap px-4 py-4 text-slate-600">{student.email}</td>
                            <td className="whitespace-nowrap px-4 py-4 text-slate-600">{student.targetUniversity}</td>
                            <td className="whitespace-nowrap px-4 py-4">
                              <select
                                value={student.localStage}
                                onChange={(event) => setStudents((prev) => prev.map((item) => item.id === student.id ? { ...item, localStage: event.target.value } : item))}
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                              >
                                {studentStages.map((stage) => (
                                  <option key={stage} value={stage}>{stage}</option>
                                ))}
                              </select>
                            </td>
                            <td className="whitespace-nowrap px-4 py-4">
                              <select
                                value={student.localStatus}
                                onChange={(event) => setStudents((prev) => prev.map((item) => item.id === student.id ? { ...item, localStatus: event.target.value } : item))}
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                              >
                                {statusOptions.map((status) => (
                                  <option key={status} value={status}>{status}</option>
                                ))}
                              </select>
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-slate-600">{new Date(student.createdAt).toLocaleDateString()}</td>
                            <td className="whitespace-nowrap px-4 py-4">
                              <button
                                type="button"
                                onClick={() => handleUpdate(student.id)}
                                disabled={savingId === student.id}
                                className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 transition disabled:opacity-60"
                              >
                                {savingId === student.id ? 'Saving...' : 'Save'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
