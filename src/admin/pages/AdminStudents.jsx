import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  RefreshCcw,
  Search,
  UserRoundCheck,
  Users,
  X,
} from 'lucide-react';
import { getAdminStudents, updateAdminStudent } from '../../services/adminApi';

const fallbackStages = [
  'Initial Consultation',
  'Document Preparation',
  'Application Submitted',
  'Document Verification',
  'CAS Letter Processing',
  'Visa Preparation',
];

const fallbackStatuses = ['pending', 'in review', 'accepted', 'declined'];

const statusLabels = {
  pending: 'Pending',
  'in review': 'Under Review',
  accepted: 'Approved',
  declined: 'Declined',
};

const statusClasses = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  'in review': 'bg-sky-50 text-sky-700 ring-sky-200',
  accepted: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  declined: 'bg-rose-50 text-rose-700 ring-rose-200',
};

const formatDate = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const SummaryCard = ({ icon: Icon, label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value ?? 0}</p>
      </div>
    </div>
  </div>
);

const StatusBadge = ({ status }) => (
  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClasses[status] || statusClasses.pending}`}>
    {statusLabels[status] || status || 'Pending'}
  </span>
);

const AdminStudents = () => {
  const [students, setStudents] = useState([]);
  const [summary, setSummary] = useState({ total: 0, pending: 0, review: 0, approved: 0 });
  const [availableFilters, setAvailableFilters] = useState({
    statuses: fallbackStatuses,
    stages: fallbackStages,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState({
    search: '',
    status: 'all',
    stage: 'all',
    page: 1,
    limit: 10,
  });
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);

  const hasActiveFilter = Boolean(query.search || query.status !== 'all' || query.stage !== 'all');

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await getAdminStudents(query);
      if (!result.success) {
        throw new Error(result.message || 'Unable to load students.');
      }

      const data = result.data || {};
      setStudents(data.students || []);
      setSummary(data.summary || { total: 0, pending: 0, review: 0, approved: 0 });
      setAvailableFilters({
        statuses: data.filters?.statuses || fallbackStatuses,
        stages: data.filters?.stages || fallbackStages,
      });
      setPagination(data.pagination || {
        page: query.page,
        limit: query.limit,
        total: 0,
        totalPages: 1,
      });
    } catch (fetchError) {
      setError(fetchError.message || 'Unable to load students.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    if (!selectedStudent) return;
    const refreshedStudent = students.find((student) => student.id === selectedStudent.id);
    if (refreshedStudent) {
      setSelectedStudent(refreshedStudent);
    }
  }, [selectedStudent, students]);

  const visiblePages = useMemo(() => {
    const totalPages = pagination.totalPages || 1;
    const currentPage = pagination.page || 1;
    const start = Math.max(currentPage - 1, 1);
    const end = Math.min(start + 2, totalPages);

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [pagination.page, pagination.totalPages]);

  const applySearch = () => {
    setQuery((current) => ({ ...current, search: searchInput.trim(), page: 1 }));
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    applySearch();
  };

  const handleFilterChange = (key, value) => {
    setQuery((current) => ({ ...current, [key]: value, page: 1 }));
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > pagination.totalPages || page === pagination.page) return;
    setQuery((current) => ({ ...current, page }));
  };

  const clearFilters = () => {
    setSearchInput('');
    setQuery({
      search: '',
      status: 'all',
      stage: 'all',
      page: 1,
      limit: 10,
    });
  };

  const handleUpdate = async (student, updates) => {
    setSavingId(student.id);
    setError('');

    try {
      const result = await updateAdminStudent(student.id, updates);
      if (!result.success) {
        throw new Error(result.message || 'Unable to update student.');
      }

      const updatedStudent = result.data?.student;
      if (!updatedStudent) {
        throw new Error('Unable to update student.');
      }

      setStudents((current) => current.map((item) => (
        item.id === updatedStudent.id ? updatedStudent : item
      )));
      setSelectedStudent((current) => (
        current?.id === updatedStudent.id ? updatedStudent : current
      ));
      await fetchStudents();
    } catch (updateError) {
      setError(updateError.message || 'Unable to update student.');
    } finally {
      setSavingId(null);
    }
  };

  const emptyMessage = hasActiveFilter
    ? 'No students match your search or filter.'
    : 'No students have been registered yet.';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary-700">Admin</p>
          <h1 className="font-display text-3xl font-bold text-slate-950">Students</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Review student registrations, track application progress, and keep status updates current.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchStudents}
          disabled={loading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Users} label="Total Students" value={summary.total} />
        <SummaryCard icon={Clock} label="Pending" value={summary.pending} />
        <SummaryCard icon={AlertCircle} label="Under Review" value={summary.review} />
        <SummaryCard icon={UserRoundCheck} label="Approved" value={summary.approved} />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4 sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_260px_auto_auto] lg:items-end">
            <form onSubmit={handleSearchSubmit} className="space-y-1">
              <label htmlFor="student-search" className="text-sm font-semibold text-slate-700">Search</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  id="student-search"
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Name, email, or phone"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
                />
              </div>
            </form>

            <div className="space-y-1">
              <label htmlFor="student-status" className="text-sm font-semibold text-slate-700">Status</label>
              <select
                id="student-status"
                value={query.status}
                onChange={(event) => handleFilterChange('status', event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
              >
                <option value="all">All statuses</option>
                {availableFilters.statuses.map((status) => (
                  <option key={status} value={status}>{statusLabels[status] || status}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="student-stage" className="text-sm font-semibold text-slate-700">Stage</label>
              <select
                id="student-stage"
                value={query.stage}
                onChange={(event) => handleFilterChange('stage', event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
              >
                <option value="all">All stages</option>
                {availableFilters.stages.map((stage) => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={applySearch}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-primary-700 px-4 text-sm font-semibold text-white transition hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2"
            >
              Apply
            </button>

            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasActiveFilter}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        </div>

        {error && (
          <div className="m-4 flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 sm:m-5 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={fetchStudents}
              className="inline-flex items-center justify-center rounded-lg bg-rose-100 px-3 py-2 font-semibold text-rose-800 hover:bg-rose-200"
            >
              Try Again
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-72 items-center justify-center p-8 text-sm font-medium text-slate-500">
            <RefreshCcw className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            Loading students...
          </div>
        ) : students.length === 0 ? (
          <div className="min-h-72 p-8 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
              <Users className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-900">{emptyMessage}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {hasActiveFilter ? 'Adjust the filters and try again.' : 'New registrations will appear here.'}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Student</th>
                    <th className="px-5 py-3">Phone</th>
                    <th className="px-5 py-3">Current Stage</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Registered</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {students.map((student) => (
                    <tr key={student.id} className="transition hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-950">{student.fullName || 'Unnamed student'}</p>
                        <p className="mt-1 text-xs text-slate-500">{student.email}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{student.mobileNumber || 'Not provided'}</td>
                      <td className="px-5 py-4 text-slate-700">{student.currentStage || 'Initial Consultation'}</td>
                      <td className="px-5 py-4"><StatusBadge status={student.status || 'pending'} /></td>
                      <td className="px-5 py-4 text-slate-600">{formatDate(student.createdAt)}</td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedStudent(student)}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2"
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-4 lg:hidden">
              {students.map((student) => (
                <article key={student.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-slate-950">{student.fullName || 'Unnamed student'}</h2>
                      <p className="mt-1 text-sm text-slate-500">{student.email}</p>
                    </div>
                    <StatusBadge status={student.status || 'pending'} />
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <div>
                      <dt className="font-semibold text-slate-500">Phone</dt>
                      <dd className="text-slate-800">{student.mobileNumber || 'Not provided'}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-500">Current Stage</dt>
                      <dd className="text-slate-800">{student.currentStage || 'Initial Consultation'}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-500">Registered</dt>
                      <dd className="text-slate-800">{formatDate(student.createdAt)}</dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    onClick={() => setSelectedStudent(student)}
                    className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2"
                  >
                    <Eye className="h-4 w-4" aria-hidden="true" />
                    View Details
                  </button>
                </article>
              ))}
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p>
                Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} students)
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                {visiblePages.map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => handlePageChange(page)}
                    className={`h-9 min-w-9 rounded-lg px-3 text-sm font-semibold transition ${
                      page === pagination.page
                        ? 'bg-primary-700 text-white'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 px-4 py-6 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="student-details-title">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-primary-700">Student Details</p>
                <h2 id="student-details-title" className="mt-1 text-2xl font-bold text-slate-950">
                  {selectedStudent.fullName || 'Unnamed student'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">{selectedStudent.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2"
                aria-label="Close student details"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="grid gap-5 p-5 lg:grid-cols-[1fr_260px]">
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    ['Email', selectedStudent.email],
                    ['Phone', selectedStudent.mobileNumber],
                    ['Destination', selectedStudent.targetCountry],
                    ['Target University', selectedStudent.targetUniversity],
                    ['Course', selectedStudent.courseOfStudy],
                    ['Registered', formatDate(selectedStudent.createdAt)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{value || 'Not provided'}</p>
                    </div>
                  ))}
                </div>
              </div>

              <aside className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <label htmlFor="student-detail-status" className="text-sm font-semibold text-slate-700">Status</label>
                  <select
                    id="student-detail-status"
                    value={selectedStudent.status || 'pending'}
                    disabled={savingId === selectedStudent.id}
                    onChange={(event) => handleUpdate(selectedStudent, { status: event.target.value })}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-primary-600 focus:ring-2 focus:ring-primary-100 disabled:opacity-60"
                  >
                    {availableFilters.statuses.map((status) => (
                      <option key={status} value={status}>{statusLabels[status] || status}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="student-detail-stage" className="text-sm font-semibold text-slate-700">Application Stage</label>
                  <select
                    id="student-detail-stage"
                    value={selectedStudent.currentStage || 'Initial Consultation'}
                    disabled={savingId === selectedStudent.id}
                    onChange={(event) => handleUpdate(selectedStudent, { currentStage: event.target.value })}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-primary-600 focus:ring-2 focus:ring-primary-100 disabled:opacity-60"
                  >
                    {availableFilters.stages.map((stage) => (
                      <option key={stage} value={stage}>{stage}</option>
                    ))}
                  </select>
                </div>

                {savingId === selectedStudent.id && (
                  <p className="text-sm font-medium text-slate-500">Saving changes...</p>
                )}
              </aside>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStudents;
