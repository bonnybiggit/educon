import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCcw } from 'lucide-react';
import { getAdminStudents, updateAdminStudent } from '../../services/adminApi';

const studentStages = [
  'Initial Consultation',
  'Document Preparation',
  'Application Submitted',
  'Document Verification',
  'CAS Letter Processing',
  'Visa Preparation',
];
const statusOptions = ['pending', 'in review', 'accepted', 'declined'];

const AdminPlaceholder = ({ title, message }) => {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
      <h1 className="text-3xl font-display font-bold text-slate-900 mb-4">{title}</h1>
      <p className="text-slate-600">{message}</p>
    </div>
  );
};

export const AdminStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getAdminStudents();
      if (!result.success) {
        throw new Error(result.message || 'Unable to load registrations');
      }
      const fetchedStudents = result.data?.students || result.students || [];
      setStudents(fetchedStudents.map((student) => ({
        ...student,
        localStatus: student.status || 'pending',
        localStage: student.currentStage || 'Initial Consultation',
      })));
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleUpdate = async (id) => {
    const student = students.find((item) => item.id === id);
    if (!student) return;
    setSavingId(id);
    setError('');
    try {
      const result = await updateAdminStudent(id, {
        currentStage: student.localStage,
        status: student.localStatus,
      });
      if (!result.success) {
        throw new Error(result.message || 'Unable to update student');
      }
      const updatedStudent = result.data?.student || result.student;
      setStudents((prev) => prev.map((item) => item.id === id ? {
        ...item,
        currentStage: updatedStudent.currentStage,
        status: updatedStudent.status,
      } : item));
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl bg-white shadow-sm border border-slate-200">
        <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-950 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-white font-display">Student Registry</h2>
            <p className="mt-1 text-sm text-slate-400">Search and manage every registration from one page.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/admin/dashboard" className="text-sm text-slate-300 underline hover:text-white">Back to Dashboard</Link>
            <button onClick={fetchStudents} className="inline-flex items-center gap-2 rounded-2xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 transition">
              <RefreshCcw className="w-4 h-4" /> Refresh
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
  );
};

export const AdminEnquiries = () => (
  <AdminPlaceholder title="Enquiries" message="Enquiries management will be available here." />
);

export const AdminServices = () => (
  <AdminPlaceholder title="Services" message="Services management will be available here." />
);

export const AdminTestimonials = () => (
  <AdminPlaceholder title="Testimonials" message="Testimonials management will be available here." />
);

export const AdminBlog = () => (
  <AdminPlaceholder title="Blog" message="Blog management will be available here." />
);

export const AdminSettings = () => (
  <AdminPlaceholder title="Settings" message="Settings management will be available here." />
);
