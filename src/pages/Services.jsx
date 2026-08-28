import { BookOpen, MapPin, Search, GraduationCap, Plane, Home, DollarSign, Briefcase, FileCheck, CheckCircle2, Globe, Award } from 'lucide-react';
import { Link } from 'react-router-dom';

const Services = () => {
  const services = [
    { icon: <BookOpen className="w-5 h-5" />, title: 'Expert Consultation', desc: 'Personalized advice to kickstart your journey.' },
    { icon: <GraduationCap className="w-5 h-5" />, title: 'University Admissions', desc: 'Handling BSC, MSC & MRES applications globally.' },
    { icon: <FileCheck className="w-5 h-5" />, title: 'Compliance Checks', desc: 'Ensuring your documents meet all strict requirements.' },
    { icon: <Search className="w-5 h-5" />, title: 'Interview Preparation', desc: 'One-on-one preCAS and UKVI interview prep.' },
    { icon: <DollarSign className="w-5 h-5" />, title: 'Payment Guidance', desc: 'Secure guidance on making payments to schools.' },
    { icon: <CheckCircle2 className="w-5 h-5" />, title: 'Proof of Funds', desc: 'Detailed financial checklist for visa success.' },
    { icon: <Plane className="w-5 h-5" />, title: 'Visa Assistance', desc: 'Step-by-step guidance through the visa process.' },
    { icon: <Home className="w-5 h-5" />, title: 'Accommodation', desc: 'Finding the right home (UK students only).' },
    { icon: <MapPin className="w-5 h-5" />, title: 'Airport Pickup', desc: 'Warm welcome upon arrival (UK students only).' },
    { icon: <Briefcase className="w-5 h-5" />, title: 'Job Searches', desc: 'Helping you find part-time work (UK students only).' },
    { icon: <Globe className="w-5 h-5" />, title: 'Global Consulting', desc: 'Holistic consulting across 14+ countries.' },
    { icon: <Award className="w-5 h-5" />, title: 'Scholarships', desc: 'Identifying financial aid opportunities for your profile.' },
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Compact Hero */}
      <div
        className="relative py-12"
        style={{
          backgroundImage: "linear-gradient(135deg, rgba(2, 16, 39, 0.88), rgba(15, 23, 42, 0.72)), url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=80')",
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/4 w-full h-full bg-primary-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute -bottom-1/2 -left-1/4 w-full h-full bg-primary-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0wIDEwaDQwdjJIMHoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-30"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-accent-400 text-xs font-semibold tracking-wide uppercase mb-4 backdrop-blur-sm">
            <Award className="w-3.5 h-3.5" />
            <span>Premium Support</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-3 tracking-tight">
            Our Premium <span className="text-primary-400">Services</span>
          </h1>
          <p className="text-base text-primary-200 max-w-2xl mx-auto font-light leading-relaxed">
            Comprehensive, personalized support designed to make your study abroad journey completely hitch-free.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Compact Pricing Notice */}
        <div className="bg-accent-400 rounded-2xl p-6 md:p-8 text-gray-900 mb-16 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-display font-bold mb-2">Transparent Pricing Structure</h2>
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <div className="bg-white/60 px-4 py-2 rounded-lg flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-5 h-5 text-primary-700" />
                All applicants: <span className="font-bold text-primary-900">100% FREE</span>
              </div>
              <div className="bg-white/60 px-4 py-2 rounded-lg flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-5 h-5 text-primary-700" />
                Coverage: <span className="font-bold text-primary-900">All 14 Countries</span>
              </div>
            </div>
          </div>
          <div>
            <Link to="/contact" className="bg-primary-900 hover:bg-primary-800 text-white px-6 py-3 rounded-md font-bold transition-colors whitespace-nowrap block text-center shadow-md">
              Apply Now
            </Link>
          </div>
        </div>

        {/* Compact Services Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {services.map((service, index) => (
            <div key={index} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 group hover:border-primary-200">
              <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600 mb-4 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                {service.icon}
              </div>
              <h3 className="text-lg font-bold font-display text-primary-900 mb-2">{service.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{service.desc}</p>
            </div>
          ))}
        </div>

        {/* Step-by-Step Process */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-display font-bold text-primary-900">Our Seamless Process</h2>
          </div>
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-primary-200 before:to-transparent">
            
            {[
              { title: 'Free Consultation', desc: 'Contact via phone, email, WhatsApp, or form.' },
              { title: 'Course & University Selection', desc: 'Based on your unique profile and aspirations.' },
              { title: 'Application Processing', desc: 'We handle all documents and direct submission.' },
              { title: 'Offer & Payment Guidance', desc: 'Pay your tuition deposits directly to schools safely.' },
              { title: 'Visa & Compliance', desc: 'Interview prep, proof of funds checklist, and visa application.' },
              { title: 'Pre-departure & Arrival', desc: 'Accommodation, airport pickup, and job search (UK).' },
            ].map((step, idx) => (
              <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                <div className="flex items-center justify-center w-8 h-8 rounded-full border-4 border-gray-50 bg-primary-600 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 font-bold text-sm z-10">
                  {idx + 1}
                </div>
                <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] bg-white p-5 rounded-xl shadow-sm border border-gray-100 group-hover:border-primary-300 transition-colors">
                  <h3 className="font-bold text-primary-900 text-base mb-1">{step.title}</h3>
                  <p className="text-sm text-gray-600">{step.desc}</p>
                </div>
              </div>
            ))}
            
          </div>
        </div>

      </div>
    </div>
  );
};

export default Services;
