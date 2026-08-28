import { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, MessageCircle } from 'lucide-react';

const faqs = [
  {
    category: 'General',
    questions: [
      { q: 'Which countries do you process admissions for?', a: 'We process admissions for 14 countries including the UK, New Zealand, Canada, Australia, Ireland, Sweden, Malta, Switzerland, Turkey, UAE, Malaysia, France, Germany, and Japan.' },
      { q: 'Can anyone apply regardless of nationality?', a: 'Yes! We serve students of all ages and nationalities seeking Bachelors, Masters, or MRES degrees — irrespective of background or nationality.' },
    ]
  },
  {
    category: 'Pricing',
    questions: [
      { q: 'How much do your services cost?', a: 'All our services are 100% FREE for applicants across all 14 countries. There is no application fee or service fee charged to students.' },
      { q: 'Do I pay tuition fees to Universe Consult?', a: 'No. We will guide you on how to make your payments securely and directly to the universities upon receiving your admission offer.' },
    ]
  },
  {
    category: 'Admissions & Visa',
    questions: [
      { q: 'Can I apply with a 3rd class degree?', a: 'Yes! We have successfully secured Masters admissions for students with 3rd class degrees. We evaluate your full profile and guide you to the right institutions.' },
      { q: 'Do you help with visa applications?', a: 'Absolutely. We provide full visa application assistance, compliance checks, proof of funds checklists, and thorough interview preparation.' },
    ]
  },
  {
    category: 'UK-Specific',
    questions: [
      { q: 'What extra services do students receive?', a: 'In addition to free processing, students receive support with accommodation guidance, airport pickup coordination on arrival, and part-time job search assistance where available.' },
      { q: 'What is a preCAS interview?', a: 'A preCAS interview is conducted by the university to verify your credibility before issuing a CAS (Confirmation of Acceptance for Studies). We provide one-on-one preparation sessions.' },
    ]
  }
];

const FAQs = () => {
  const [openIndex, setOpenIndex] = useState('0-0');

  const toggle = (idx) => setOpenIndex(openIndex === idx ? null : idx);

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Compact header */}
      <div
        className="relative py-12 text-center text-white"
        style={{
          backgroundImage: "linear-gradient(135deg, rgba(2, 16, 39, 0.88), rgba(15, 23, 42, 0.72)), url('https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=80')",
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/4 w-full h-full bg-primary-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute -bottom-1/2 -left-1/4 w-full h-full bg-primary-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0wIDEwaDQwdjJIMHoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-30"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-accent-400 text-xs font-semibold tracking-wide uppercase mb-4 backdrop-blur-sm">
            <HelpCircle className="w-3.5 h-3.5" /> Help Center
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-3 tracking-tight">
            Frequently Asked <span className="text-primary-400">Questions</span>
          </h1>
          <p className="text-base text-primary-200 max-w-2xl mx-auto font-light leading-relaxed">
            Find quick answers to the most common questions about studying abroad and our services.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          {faqs.map((section, sIdx) => (
            <div key={sIdx}>
              {/* Category label */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-2 bg-primary-600 rounded-full" />
                <h2 className="text-base font-bold text-primary-900 tracking-wide uppercase">{section.category}</h2>
              </div>

              <div className="space-y-2">
                {section.questions.map((faq, qIdx) => {
                  const idx = `${sIdx}-${qIdx}`;
                  const isOpen = openIndex === idx;
                  return (
                    <div
                      key={qIdx}
                      className={`bg-white border rounded-xl overflow-hidden transition-all duration-200 ${isOpen ? 'border-primary-300 shadow-sm' : 'border-gray-200'}`}
                    >
                      <button
                        onClick={() => toggle(idx)}
                        className="w-full flex items-center justify-between px-5 py-4 text-left focus:outline-none"
                      >
                        <span className={`font-medium text-sm pr-6 ${isOpen ? 'text-primary-700' : 'text-gray-800'}`}>{faq.q}</span>
                        <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${isOpen ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </div>
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* WhatsApp CTA */}
        <div className="mt-12 bg-primary-900 rounded-2xl p-6 text-center text-white">
          <h3 className="text-lg font-display font-bold mb-2">Still have questions?</h3>
          <p className="text-primary-300 text-sm mb-5">Our consultants are ready to help you — usually within hours.</p>
          <a
            href="https://wa.me/447760907775"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold px-6 py-3 rounded-lg transition-colors text-sm"
          >
            <MessageCircle className="w-4 h-4" />
            Ask Us on WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
};

export default FAQs;
