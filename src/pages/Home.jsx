import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Globe, CheckCircle2, Award, GraduationCap, Users, Star, MapPin, ChevronRight } from 'lucide-react';
import TestimonialSlider from '../components/TestimonialSlider';

const stats = [
  { value: '5+', label: 'Years of Excellence' },
  { value: '200+', label: 'Partner Universities' },
  { value: '14', label: 'Countries' },
  { value: '100%', label: 'Success Rate' },
];

const services = [
  { icon: <GraduationCap className="w-5 h-5" />, title: 'University Admissions', desc: 'BSC, MSC & MRES applications handled globally.' },
  { icon: <CheckCircle2 className="w-5 h-5" />, title: 'Visa Assistance', desc: 'Full visa guidance, compliance & interview prep.' },
  { icon: <Globe className="w-5 h-5" />, title: 'Study Abroad', desc: 'Consulting across 14+ countries worldwide.' },
  { icon: <Award className="w-5 h-5" />, title: 'Scholarships', desc: 'Identifying financial aid opportunities for you.' },
  { icon: <Users className="w-5 h-5" />, title: 'Pre-departure', desc: 'Accommodation, airport pickup & job searches.' },
  { icon: <MapPin className="w-5 h-5" />, title: 'Free Consultation', desc: 'UK applicants get ALL services 100% FREE.' },
];

const countries = [
  { code: 'gb', label: 'UK', emoji: '🇬🇧' },
  { code: 'ca', label: 'Canada', emoji: '🇨🇦' },
  { code: 'au', label: 'Australia', emoji: '🇦🇺' },
  { code: 'ie', label: 'Ireland', emoji: '🇮🇪' },
  { code: 'nz', label: 'New Zealand', emoji: '🇳🇿' },
  { code: 'se', label: 'Sweden', emoji: '🇸🇪' },
  { code: 'de', label: 'Germany', emoji: '🇩🇪' },
  { code: 'fr', label: 'France', emoji: '🇫🇷' },
  { code: 'jp', label: 'Japan', emoji: '🇯🇵' },
  { code: 'ae', label: 'UAE', emoji: '🇦🇪' },
  { code: 'my', label: 'Malaysia', emoji: '🇲🇾' },
  { code: 'ch', label: 'Switzerland', emoji: '🇨🇭' },
  { code: 'mt', label: 'Malta', emoji: '🇲🇹' },
  { code: 'tr', label: 'Turkey', emoji: '🇹🇷' },
];

const testimonials = [
  { name: 'Korede', text: 'I got my admission for masters by research and it allowed me to bring my family with me. I did not pay any service fees. Excellent service, Universe Consults' },
  { name: 'Doreen', text: 'Seamlessly the best Educational consultancy. I rate them 5/5.' },
  { name: 'Jesuseun', text: 'I will recommend Universe Consults any day and any time. Thumps up.' },
  { name: 'Alex', text: 'You need personalised services? Think Universe Consults.' },
  { name: 'Nneka', text: 'I have 3rd class and everyone said I cannot study masters abroad. Universe Consults helped me secure my msc admission and assisted until I resumed in September 2025.' },
];

const Home = () => {

  return (
    <div className="bg-white overflow-x-hidden">

      {/* ── HERO ── */}
      <section className="relative bg-primary-900 overflow-hidden min-h-[90vh] flex items-center">
        {/* Background Image overlay */}
        <div className="absolute inset-0">
          <img
            src="/hero_graduates.png"
            alt="Graduating students celebrating"
            className="w-full h-full object-cover object-center opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary-900 via-primary-900/80 to-primary-800/50" />
        </div>

        {/* Decorative circles */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary-600 rounded-full filter blur-3xl opacity-20" />
        <div className="absolute -bottom-10 left-1/3 w-96 h-96 bg-accent-400 rounded-full filter blur-3xl opacity-10" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left text */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-400/20 border border-accent-400/40 text-accent-400 text-xs font-semibold tracking-widest uppercase mb-6">
              <Star className="w-3.5 h-3.5 fill-accent-400" />
              CAC & SCUML Registered · 5 Years of Excellence
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white leading-tight mb-5">
              Your Dream<br />
              University is<br />
              <span className="text-accent-400">Within Reach.</span>
            </h1>
              <p className="text-primary-200 text-base md:text-lg leading-relaxed mb-8 max-w-lg">
              Universe Educational Consultancy connects you to 200+ partner universities across 14 countries. Expert guidance, zero stress — your application process is completely <strong className="text-white">FREE across all 14 countries</strong>.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
              <Link
                to="/contact"
                className="bg-accent-400 hover:bg-accent-500 text-primary-900 font-bold px-7 py-3.5 rounded-lg transition-all hover:shadow-lg hover:shadow-accent-400/30 flex items-center justify-center gap-2"
              >
                Start Free Consultation <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/services"
                className="border border-white/30 hover:border-white/60 text-white px-7 py-3.5 rounded-lg transition-all hover:bg-white/10 flex items-center justify-center gap-2 backdrop-blur-sm"
              >
                Explore Services <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Right floating card */}
          <div className="flex flex-col gap-4 w-full max-w-md mx-auto lg:max-w-none lg:ml-auto mt-8 lg:mt-0">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 sm:p-6 text-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-accent-400 rounded-full flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-primary-900" />
                </div>
                <div>
                  <div className="font-bold text-sm">All Applicants</div>
                  <div className="text-xs text-primary-300">Across all 14 countries</div>
                </div>
                <div className="ml-auto bg-green-400 text-green-900 text-xs font-bold px-2 py-0.5 rounded-full">FREE</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {['Admission Processing', 'Visa Assistance', 'Accommodation', 'Airport Pickup'].map(s => (
                  <div key={s} className="flex items-center gap-1.5 text-xs text-primary-200 leading-relaxed">
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent-400 shrink-0" /> <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-5 text-white flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center shrink-0">
                  <Globe className="w-6 h-6 text-primary-200" />
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold font-display">14 Countries</div>
                  <div className="text-xs text-primary-300">200+ Partner Universities Worldwide (90+ in the UK)</div>
                </div>
              </div>
              <a
                href="https://wa.me/447760907775"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-accent-400 hover:bg-accent-500 text-primary-900 font-bold px-5 py-3 rounded-lg transition-all shadow-md hover:shadow-lg text-sm w-full sm:w-auto"
              >
                BECOME A PARTNER AND EARN <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <section className="bg-accent-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((s, i) => (
              <div key={i} className="text-primary-900">
                <div className="text-3xl font-display font-bold">{s.value}</div>
                <div className="text-sm font-medium mt-0.5 text-primary-800">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT SPLIT ── */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Image */}
          <div className="relative">
            <div className="absolute inset-0 bg-primary-100 rounded-3xl transform -rotate-2 scale-95" />
            <img
              src="/students_studying.png"
              alt="Students studying together"
              className="relative rounded-3xl w-full h-80 md:h-96 object-cover shadow-xl"
            />
            {/* floating badge */}
            <div className="absolute -bottom-5 -right-5 bg-primary-900 text-white rounded-2xl p-4 shadow-xl">
              <div className="text-2xl font-bold font-display text-accent-400">100%</div>
              <div className="text-xs text-primary-300">Admission Success</div>
            </div>
          </div>

          {/* Text */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-8 bg-primary-600" />
              <span className="text-primary-600 font-semibold text-xs tracking-widest uppercase">Why Choose Us</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mb-4 leading-tight">
              We make studying abroad <span className="text-primary-600">simple & stress-free.</span>
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed mb-6">
              Universe Educational Consultancy Limited has been bridging the gap between ambitious students and top global universities for over 5 years. We believe academic success is <strong>limitless</strong> — regardless of your background, nationality, or degree class.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                'Expert guidance from application to arrival',
                'Free services for all UK applicants',
                'Successful 3rd class degree admissions',
                'CAC & SCUML registered — fully compliant',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-gray-700">
                  <CheckCircle2 className="w-4 h-4 text-primary-600 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Link to="/about" className="inline-flex items-center gap-2 text-primary-600 font-semibold text-sm hover:text-primary-800 transition-colors">
              Learn More About Us <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-gray-900 mb-2">Everything You Need</h2>
            <p className="text-gray-500 text-sm max-w-xl mx-auto">From first consultation to your first day on campus — we've got you covered every step of the way.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((s, i) => (
              <div key={i} className="bg-white p-5 rounded-xl border border-gray-100 hover:border-primary-300 hover:shadow-md transition-all group">
                <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600 mb-3 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                  {s.icon}
                </div>
                <h3 className="font-bold text-primary-900 text-sm mb-1">{s.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/services" className="inline-flex items-center gap-2 bg-primary-900 hover:bg-primary-800 text-white px-6 py-3 rounded-lg font-semibold text-sm transition-colors">
              View All Services <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── COUNTRIES ── */}
      <section className="py-14 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-display font-bold text-gray-900 mb-1">Where Will You Study?</h2>
            <p className="text-gray-500 text-sm">We process admissions to 14 amazing countries around the world.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {countries.map((c) => (
              <span
                key={c.code}
                className="inline-flex items-center gap-3 px-4 py-2 bg-primary-50 text-primary-800 rounded-full text-sm font-medium hover:bg-primary-100 transition-colors cursor-default border border-primary-100"
              >
                <img
                  src={`https://flagcdn.com/24x18/${c.code}.png`}
                  alt={`${c.label} flag`}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  className="w-6 h-4 object-cover flex-shrink-0 rounded-sm"
                />
                <span className="leading-none">{c.label}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROCESS ── */}
      <section className="py-16 bg-gray-50 text-gray-900 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-2 text-gray-900">Your Journey in 4 Steps</h2>
            <p className="text-gray-600 text-sm">A seamless process from first contact to landing at your destination.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { n: '01', title: 'Free Consultation', desc: 'Reach out via WhatsApp, email, or our contact form.' },
              { n: '02', title: 'Course Matching', desc: 'We match you with the best universities for your profile.' },
              { n: '03', title: 'Application & Visa', desc: 'We handle all documents, submissions, and visa guidance.' },
              { n: '04', title: 'Arrive & Settle', desc: 'Accommodation, airport pickup & job support (UK).' },
            ].map((step, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all shadow-sm">
                <div className="text-4xl font-display font-bold text-primary-200 mb-3">{step.n}</div>
                <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS MARQUEE ── */}
      <section className="py-16 bg-primary-50 border-t border-primary-100 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-[11px] font-semibold uppercase tracking-[0.18em] mb-4">
              <Star className="w-3.5 h-3.5 fill-primary-600 text-primary-600" />
              Testimonials
            </div>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-gray-900">What our students say</h2>
          </div>

          <div className="relative overflow-hidden">
            <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-16 sm:w-20 bg-gradient-to-r from-primary-50 to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 sm:w-20 bg-gradient-to-l from-primary-50 to-transparent" />

            <div className="testimonial-marquee flex w-max">
              {Array.from({ length: 2 }).map((_, setIndex) => (
                <div key={setIndex} className="flex shrink-0">
                  {testimonials.map((item, idx) => (
                    <div
                      key={`${setIndex}-${item.name}-${idx}`}
                      className="testimonial-card w-[270px] sm:w-[320px] shrink-0 rounded-[24px] border border-primary-100 bg-white p-5 sm:p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)] hover:shadow-[0_18px_42px_rgba(15,23,42,0.10)] transition-all duration-300"
                      style={{ marginRight: idx === testimonials.length - 1 ? 0 : '1.25rem' }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-900 to-primary-700 text-accent-400 font-bold text-sm flex items-center justify-center shadow-md">
                            {item.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-gray-900">{item.name}</h3>
                            <div className="flex items-center gap-1 mt-1 text-amber-400">
                              {Array.from({ length: 5 }).map((_, starIdx) => (
                                <Star key={starIdx} className="w-3.5 h-3.5 fill-current" />
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="rounded-full bg-primary-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-700">
                          Verified
                        </div>
                      </div>
                      <p className="text-sm sm:text-[15px] leading-relaxed text-gray-600">“{item.text}”</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <style>{`
        .testimonial-marquee {
          animation: testimonial-scroll 34s linear infinite;
          will-change: transform;
        }

        .testimonial-marquee:hover {
          animation-play-state: paused;
        }

        .testimonial-card {
          background: linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(248,250,252,1) 100%);
        }

        @keyframes testimonial-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      {/* Blog removed */}
    </div>
  );
};

export default Home;
