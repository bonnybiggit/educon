import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageCircle, CheckCircle, Clock } from 'lucide-react';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', country: '', level: '', service: '', message: ''
  });
  const [status, setStatus] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus('submitting');
    setTimeout(() => {
      setStatus('success');
      setFormData({ name: '', email: '', phone: '', country: '', level: '', service: '', message: '' });
    }, 1500);
  };

  const inputClass = "w-full px-3.5 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm bg-white";

  return (
    <div className="bg-gray-50 min-h-screen">

      {/* Compact header */}
      <div className="bg-primary-900 py-12 text-center text-white">
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Get in Touch</h1>
        <p className="text-primary-300 text-sm max-w-lg mx-auto">
          Start your global education journey today. We respond to all enquiries within 3 working days.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 -mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── CONTACT INFO SIDEBAR ── */}
          <div className="space-y-4">
            {/* Info card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-base font-bold text-gray-900 mb-5">Contact Information</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600 shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Phone</div>
                    <a href="tel:+447760907775" className="block text-sm text-gray-700 hover:text-primary-600 transition-colors">+44 7760 907775</a>
                    <a href="tel:+2347033988286" className="block text-sm text-gray-700 hover:text-primary-600 transition-colors">+234 703 398 8286</a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600 shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Email</div>
                    <a href="mailto:Universeconsults@outlook.com" className="text-sm text-gray-700 hover:text-primary-600 transition-colors break-all">
                      Universeconsults@outlook.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600 shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Offices</div>
                    <p className="text-sm text-gray-700">27 Oke-Agbe Street, Garki 2, Abuja, Nigeria</p>
                    <p className="text-sm text-gray-700 mt-1">Leeds, United Kingdom</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600 shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Response Time</div>
                    <p className="text-sm text-gray-700">Within 3 working days</p>
                  </div>
                </div>
              </div>
            </div>

            {/* WhatsApp */}
            <a
              href="https://wa.me/447760907775"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#1fb857] text-white py-3 rounded-xl font-semibold text-sm transition-colors shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              Fastest: Chat on WhatsApp
            </a>

            {/* Trust badges */}
            <div className="bg-primary-900 rounded-2xl p-5 text-white">
              <div className="text-xs font-semibold uppercase tracking-widest text-primary-400 mb-3">Verified & Trusted</div>
              <div className="space-y-2">
                {['CAC Registered, Nigeria', 'SCUML Certified', '5+ Years of Service', '200+ Partner Universities (90+ in UK)'].map((b, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-primary-200">
                    <CheckCircle className="w-3.5 h-3.5 text-accent-400 shrink-0" /> {b}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── FORM ── */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Send an Enquiry</h3>

            {status === 'success' ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-7 h-7 text-green-500" />
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">Message Sent!</h4>
                <p className="text-gray-500 text-sm mb-5">Our experts will contact you within 3 working days.</p>
                <button
                  onClick={() => setStatus(null)}
                  className="text-primary-600 text-sm underline font-medium hover:text-primary-800"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Full Name *</label>
                    <input required type="text" name="name" value={formData.name} onChange={handleChange} className={inputClass} placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Email Address *</label>
                    <input required type="email" name="email" value={formData.email} onChange={handleChange} className={inputClass} placeholder="john@example.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Phone Number *</label>
                    <input required type="tel" name="phone" value={formData.phone} onChange={handleChange} className={inputClass} placeholder="+1234567890" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Country of Residence *</label>
                    <input required type="text" name="country" value={formData.country} onChange={handleChange} className={inputClass} placeholder="e.g. Nigeria" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Level of Study *</label>
                    <select required name="level" value={formData.level} onChange={handleChange} className={inputClass}>
                      <option value="">Select Level</option>
                      <option value="Bachelors">Bachelor's Degree</option>
                      <option value="Masters">Master's Degree</option>
                      <option value="MRES">Masters by Research (MRES)</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Service of Interest</label>
                    <select name="service" value={formData.service} onChange={handleChange} className={inputClass}>
                      <option value="">Select Service</option>
                      <option value="Admission">Admission Processing</option>
                      <option value="Visa">Visa Assistance</option>
                      <option value="Consultation">General Consultation</option>
                      <option value="Scholarship">Scholarships & Funding</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Message *</label>
                  <textarea
                    required
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows="4"
                    className={inputClass}
                    placeholder="Tell us about yourself and how we can help..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="w-full bg-primary-900 hover:bg-primary-800 text-white font-bold py-3.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-60"
                >
                  {status === 'submitting' ? (
                    <span className="flex items-center gap-2"><span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" /> Sending...</span>
                  ) : (
                    <><Send className="w-4 h-4" /> Submit Enquiry</>
                  )}
                </button>
                <p className="text-xs text-gray-400 text-center">We'll never share your information. Response within 3 working days.</p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
