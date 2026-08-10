import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, MessageCircle } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          
          {/* Brand & Mission */}
          <div className="space-y-6">
            <Link to="/" className="flex items-center group">
              <img src="/logo.png" alt="Universe Consult Logo" className="h-16 md:h-20 w-auto object-contain" />
            </Link>
            <p className="text-sm leading-relaxed text-gray-400">
              Making education accessible to everyone irrespective of life and academic backgrounds, race or nationality. We believe you are limitless in your pursuit of academic success.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://www.tiktok.com/@universe.edu.consults"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-primary-500 transition-colors"
              >
                <span className="sr-only">TikTok</span>
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.77 0 2.89 2.89 0 0 1 2.89-2.89h.88V9.12h-.88a6.33 6.33 0 1 0 6.33 6.33V9.13a7.35 7.35 0 0 0 4.67 1.63V7.27a4.41 4.41 0 0 1-1.08-.58z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-6">Quick Links</h3>
            <ul className="space-y-4">
              <li><Link to="/about" className="text-sm hover:text-primary-500 transition-colors">About Us</Link></li>
              <li><Link to="/services" className="text-sm hover:text-primary-500 transition-colors">Our Services</Link></li>
              {/* Blog removed */}
              <li><Link to="/faqs" className="text-sm hover:text-primary-500 transition-colors">FAQs</Link></li>
              <li><Link to="/contact" className="text-sm hover:text-primary-500 transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-6">Contact Us</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-primary-500 flex-shrink-0 mt-0.5" />
                <div className="flex flex-col text-sm">
                  <a href="tel:+447760907775" className="hover:text-primary-500 transition-colors">+44 7760 907775 (UK)</a>
                  <a href="tel:+2347033988286" className="hover:text-primary-500 transition-colors">+234 703 398 8286 (NG)</a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-primary-500 flex-shrink-0 mt-0.5" />
                <a href="mailto:Universeconsults@outlook.com" className="text-sm hover:text-primary-500 transition-colors break-all">
                  Universeconsults@outlook.com
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm">27 Oke-Agbe Street, Garki 2, Abuja, Nigeria</span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Leeds, United Kingdom</span>
              </li>
            </ul>
          </div>

          {/* Newsletter / CTA */}
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-6">Start Your Journey</h3>
            <p className="text-sm text-gray-400 mb-4">
              Get a free expert admission consultation today.
            </p>
            <a
              href="https://wa.me/447760907775"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-accent-600 hover:bg-accent-500 text-white px-5 py-2.5 rounded-md text-sm font-medium transition-colors w-full justify-center"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp Us Now
            </a>
            <div className="mt-6 text-xs text-gray-500 flex flex-col gap-1">
              <span>Registered with CAC (Nigeria)</span>
              <span>Registered with SCUML (Nigeria)</span>
            </div>
          </div>

        </div>
        
        <div className="mt-12 pt-8 border-t border-gray-800 text-sm text-center text-gray-500 flex flex-col md:flex-row justify-between items-center gap-4">
          <p>
            &copy; {new Date().getFullYear()} Universe Educational Consultancy Limited. All rights reserved.
          </p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
