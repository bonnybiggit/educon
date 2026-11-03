import { Link } from 'react-router-dom';
import { ArrowLeft, GraduationCap, ShieldCheck } from 'lucide-react';

const StudentAuthShell = ({ heading, text, highlights = [], children }) => (
  <div className="relative min-h-screen overflow-x-hidden lg:grid lg:grid-cols-2">
    <Link
      to="/"
      aria-label="Back to homepage"
      title="Back to homepage"
      className="absolute top-4 left-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/30 backdrop-blur transition hover:bg-accent-400 hover:text-primary-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-400/70 sm:top-6 sm:left-6"
    >
      <ArrowLeft className="h-5 w-5" aria-hidden="true" />
    </Link>

    <aside className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 px-6 pt-20 pb-10 text-white sm:px-12 lg:flex lg:items-center lg:py-20">
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-primary-400/10 blur-2xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full border border-accent-400/20" />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-10 -left-8 h-56 w-56 rounded-full border border-accent-400/10" />
      <GraduationCap aria-hidden="true" className="pointer-events-none absolute top-10 right-8 h-40 w-40 -rotate-12 text-white/5" />
      <div className="relative mx-auto max-w-lg lg:mx-0 lg:ml-auto lg:pr-8">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent-400">
          <span className="h-px w-8 bg-accent-400" /> Universe Consults
        </span>
        <h1 className="mt-5 font-display text-3xl font-bold leading-tight text-white sm:text-4xl xl:text-5xl">
          {heading}
        </h1>
        <p className="mt-5 text-base leading-relaxed text-primary-100/90 sm:text-lg">{text}</p>
        {highlights.length > 0 && (
          <ul className="mt-8 hidden space-y-4 sm:block">
            {highlights.map(({ icon: Icon, text: label }) => (
              <li key={label} className="flex items-center gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-accent-400/40">
                  <Icon className="h-5 w-5 text-accent-400" aria-hidden="true" />
                </span>
                <span className="font-medium text-white/95">{label}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-10 hidden items-center gap-2 text-sm text-primary-100/70 sm:flex">
          <ShieldCheck className="h-4 w-4 text-accent-400" aria-hidden="true" /> Your details are kept private and secure.
        </p>
      </div>
    </aside>

    <main className="bg-gradient-to-br from-primary-50 via-white to-primary-100 px-4 py-8 sm:px-8 lg:flex lg:items-center lg:py-16">
      <div className="mx-auto w-full max-w-xl rounded-3xl border border-gray-100 bg-white p-6 shadow-xl shadow-primary-900/10 sm:p-10">
        {children}
      </div>
    </main>
  </div>
);

export default StudentAuthShell;
