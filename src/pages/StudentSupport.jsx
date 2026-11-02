import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  Clock3,
  FileText,
  LifeBuoy,
  MapPin,
  Mail,
  MessageCircle,
  Phone,
} from 'lucide-react';
import Seo from '../components/Seo';

const supportEmail = 'support@universeconsultsedu.com';
const whatsappNumber = '+44 7760 907775';
const whatsappUrl = 'https://wa.me/447760907775';
const nigeriaPhone = '+234 703 398 8286';
const nigeriaPhoneUrl = 'tel:+2347033988286';
const ukPhoneUrl = 'tel:+447760907775';
const abujaOffice = '27 Oke-Agbe Street, Garki 2, Abuja, Nigeria';
const ukOffice = 'Leeds, United Kingdom';
const abujaMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(abujaOffice)}`;
const ukMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ukOffice)}`;

const supportTopics = [
  {
    title: 'Application documents',
    description: 'Need help preparing or replacing an upload? Review your required documents in your application.',
    icon: FileText,
    link: '/profile',
    linkLabel: 'Review documents',
  },
  {
    title: 'Application progress',
    description: 'Your dashboard shows the latest stage update shared by the admissions team.',
    icon: Clock3,
    link: '/dashboard',
    linkLabel: 'View dashboard',
  },
];

const StudentSupport = () => (
  <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
    <Seo
      title="Student Support | Universe Consult"
      description="Get support with your Universe Consult student application."
      pathname="/support"
      noIndex
    />
    <div className="mx-auto max-w-5xl">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-primary-700 transition hover:text-primary-900">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Dashboard
      </Link>

      <header className="mt-6 overflow-hidden rounded-3xl bg-[#0b1b31] p-6 text-white shadow-xl shadow-slate-900/10 sm:mt-8 sm:p-9">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-accent-300 ring-1 ring-white/10">
          <LifeBuoy className="h-6 w-6" aria-hidden="true" />
        </span>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-accent-300">Student support</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">We’re here to help</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
          Get help with your application, documents, or the next step in your study journey.
          Our team is ready to point you in the right direction.
        </p>
      </header>

      <section aria-labelledby="support-options-heading" className="mt-7">
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-700">Support options</p>
          <h2 id="support-options-heading" className="mt-1.5 text-xl font-bold text-slate-950">What can we help with?</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {supportTopics.map(({ title, description, icon: Icon, link, linkLabel }) => (
            <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-primary-700">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-bold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
              <Link to={link} className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-primary-700 hover:text-primary-900">
                {linkLabel} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="contact-support-heading" className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-3.5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700">
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="contact-support-heading" className="text-lg font-bold text-slate-950">Contact our team</h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600">
              Choose the contact method that works best for you. Include the email address on your student account so we can assist you.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-14 items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 transition hover:border-emerald-300 hover:bg-emerald-50"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-emerald-700 shadow-sm">
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-emerald-800">WhatsApp</span>
              <span className="mt-0.5 block text-sm font-bold text-slate-900">{whatsappNumber}</span>
            </span>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
          </a>

          <a
            href={`mailto:${supportEmail}`}
            className="flex min-h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-primary-200 hover:bg-blue-50/40"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-primary-700">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-slate-500">Email</span>
              <span className="mt-0.5 block break-all text-sm font-bold text-slate-900">{supportEmail}</span>
            </span>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-primary-700" aria-hidden="true" />
          </a>
        </div>

        <div className="mt-7 border-t border-slate-100 pt-6">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary-700" aria-hidden="true" />
            <h3 className="text-base font-bold text-slate-950">Our offices</h3>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Abuja, Nigeria</p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-900">{abujaOffice}</p>
              <a href={abujaMapUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-primary-700 hover:text-primary-900">
                View map <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">United Kingdom</p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-900">{ukOffice}</p>
              <a href={ukMapUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-primary-700 hover:text-primary-900">
                View map <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs">
            <a href={ukPhoneUrl} className="inline-flex items-center gap-1.5 font-semibold text-slate-600 hover:text-primary-700">
              <Phone className="h-3.5 w-3.5" aria-hidden="true" /> +44 7760 907775 (UK)
            </a>
            <a href={nigeriaPhoneUrl} className="inline-flex items-center gap-1.5 font-semibold text-slate-600 hover:text-primary-700">
              <Phone className="h-3.5 w-3.5" aria-hidden="true" /> {nigeriaPhone} (NG)
            </a>
          </div>
        </div>
      </section>
    </div>
  </main>
);

export default StudentSupport;
