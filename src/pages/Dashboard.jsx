import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  Check,
  Clock3,
  Sparkles,
} from 'lucide-react';
import Seo from '../components/Seo';
import { usePortal } from '../context/PortalContext';
import { getApplicationStageLabel } from '../data/applicationStages';
import { getStudentProfile } from '../services/studentApi';

const formatStageStatus = (status) => {
  if (status === 'completed') return 'Completed';
  if (status === 'current') return 'In progress';
  return 'Upcoming';
};

const Dashboard = () => {
  const {
    applicationData,
    milestones,
    completedMilestoneCount,
    milestoneStatuses,
    loggedInUser,
  } = usePortal();
  const [completion, setCompletion] = useState(null);
  const [completionStatus, setCompletionStatus] = useState('loading');

  useEffect(() => {
    let active = true;

    const loadCompletion = async () => {
      try {
        const result = await getStudentProfile();
        if (!active) return;

        if (!result.success || !result.data?.completion) {
          setCompletionStatus('error');
          return;
        }

        setCompletion(result.data.completion);
        setCompletionStatus('ready');
      } catch {
        if (active) setCompletionStatus('error');
      }
    };

    loadCompletion();
    return () => {
      active = false;
    };
  }, []);

  const profileName = applicationData.fullName || loggedInUser?.fullName || loggedInUser?.name || 'Student';
  const currentStage = getApplicationStageLabel(applicationData.currentStage);
  const isApplicationComplete = completion?.isComplete === true;
  const completionPercent = completion?.percentage ?? 0;
  const isStageNotStarted = completedMilestoneCount === 0
    && !Object.values(milestoneStatuses).includes('current');

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <Seo
        title="Student Dashboard | Universe Consult"
        description="Private Universe Consult student dashboard."
        pathname="/dashboard"
        noIndex
      />
      <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-700">Student workspace</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Welcome back, {profileName}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Your study journey, application updates, and next steps—all in one place.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-800 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
            Student portal
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.85fr)]">
          <div className="relative isolate overflow-hidden rounded-3xl bg-[#0b1b31] p-6 text-white shadow-xl shadow-slate-900/10 sm:p-8 lg:p-9">
            <div className="absolute -right-14 -top-20 -z-10 h-64 w-64 rounded-full border border-white/10" aria-hidden="true" />
            <div className="absolute -right-3 -top-10 -z-10 h-44 w-44 rounded-full border border-white/10" aria-hidden="true" />
            <div className="absolute bottom-0 right-0 -z-10 h-40 w-40 rounded-full bg-sky-400/10 blur-3xl" aria-hidden="true" />

            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-accent-300">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Your application
            </div>
            <h2 className="mt-5 max-w-xl text-2xl font-bold leading-tight text-white sm:text-3xl">
              {isApplicationComplete ? 'Your application is ready' : 'Move your study plans forward'}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
              {isApplicationComplete
                ? 'Your required application details are complete. You can review your information and documents at any time.'
                : 'Complete your profile and upload the required documents so our team can keep your application moving.'}
            </p>

            <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                to="/profile"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent-400 px-5 py-3 text-sm font-bold text-[#13243a] shadow-lg shadow-black/10 transition hover:bg-accent-300 focus:outline-none focus:ring-2 focus:ring-accent-300 focus:ring-offset-2 focus:ring-offset-[#0b1b31]"
              >
                {isApplicationComplete ? 'Review my application' : 'Continue my application'}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Clock3 className="h-4 w-4 text-sky-300" aria-hidden="true" />
                Current stage: <span className="font-semibold text-white">{currentStage}</span>
              </div>
            </div>
          </div>

          <section aria-labelledby="completion-heading" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-700">Completion summary</p>
                <h2 id="completion-heading" className="mt-2 text-xl font-bold text-slate-950">Application profile</h2>
              </div>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-primary-700">
                {isApplicationComplete
                  ? <BadgeCheck className="h-5 w-5" aria-hidden="true" />
                  : <BookOpenCheck className="h-5 w-5" aria-hidden="true" />}
              </span>
            </div>

            {completionStatus === 'loading' && (
              <p className="mt-7 text-sm text-slate-500" role="status">Loading your application summary…</p>
            )}
            {completionStatus === 'error' && (
              <div className="mt-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900" role="status">
                Your completion summary is temporarily unavailable. Open your application to review your details.
              </div>
            )}
            {completionStatus === 'ready' && (
              <>
                <div className="mt-7 flex items-end justify-between gap-3">
                  <p className="text-sm font-medium text-slate-600">
                    {completion.isComplete ? 'All required items are complete' : 'Required items completed'}
                  </p>
                  <p className="text-3xl font-bold tracking-tight text-slate-950">
                    {completionPercent}<span className="text-lg text-slate-400">%</span>
                  </p>
                </div>
                <div
                  className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                  aria-label="Application completion"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-valuenow={completionPercent}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-700 to-sky-500 transition-all duration-500"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
                <p className="mt-3 text-xs font-medium text-slate-500">
                  {completion.completedFields} of {completion.totalFields} required items
                </p>
              </>
            )}
          </section>
        </section>

        <section aria-labelledby="tracking-heading" className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-7">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-700">Application tracking</p>
              <h2 id="tracking-heading" className="mt-1.5 text-xl font-bold text-slate-950 sm:text-2xl">Your application journey</h2>
            </div>
            <p className="w-fit rounded-full bg-blue-50 px-3.5 py-2 text-xs font-semibold text-primary-800">
              {completedMilestoneCount} of {milestones.length} milestones completed
            </p>
          </div>

          <div className="px-5 py-5 sm:px-7 sm:py-7">
            {isStageNotStarted && (
              <p className="mb-5 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-950">
                Your application stage has not been updated yet. Your progress will appear here once it is available.
              </p>
            )}
            <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {milestones.map((milestone, index) => {
                const status = milestoneStatuses[milestone.id] || 'pending';
                const isCompleted = status === 'completed';
                const isCurrent = status === 'current';

                return (
                  <li key={milestone.id} className="relative min-w-0">
                    {index < milestones.length - 1 && (
                      <span
                        className={`absolute left-5 top-11 hidden h-px w-[calc(100%-1.25rem)] lg:block ${
                          isCompleted ? 'bg-primary-300' : 'bg-slate-200'
                        }`}
                        aria-hidden="true"
                      />
                    )}
                    <div className={`relative h-full rounded-2xl border p-4 transition-colors ${
                      isCurrent
                        ? 'border-accent-300 bg-amber-50/70'
                        : isCompleted
                          ? 'border-blue-100 bg-blue-50/60'
                          : 'border-slate-200 bg-white'
                    }`}>
                      <div className="flex items-start gap-3 lg:flex-col">
                        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                          isCurrent
                            ? 'bg-accent-400 text-[#13243a]'
                            : isCompleted
                              ? 'bg-primary-700 text-white'
                              : 'bg-slate-100 text-slate-400'
                        }`}>
                          {isCompleted
                            ? <Check className="h-5 w-5" aria-hidden="true" />
                            : <span className="text-sm font-bold">{String(index + 1).padStart(2, '0')}</span>}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2 lg:mt-3">
                            <h3 className="text-sm font-bold leading-snug text-slate-900">{milestone.title}</h3>
                            <span className={`text-[10px] font-bold uppercase tracking-wide ${
                              isCurrent ? 'text-amber-800' : isCompleted ? 'text-primary-800' : 'text-slate-400'
                            }`}>
                              {formatStageStatus(status)}
                            </span>
                          </div>
                          <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{milestone.description}</p>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

      </div>
    </main>
  );
};

export default Dashboard;
