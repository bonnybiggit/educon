import { Target, Eye, Shield, CheckCircle, Award, Building2 } from 'lucide-react';

const About = () => {
  return (
    <div className="bg-white overflow-hidden">
      {/* Dynamic Hero Section */}
      <div
        className="relative py-12"
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
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-accent-400 text-xs font-semibold tracking-wide uppercase mb-4 backdrop-blur-sm">
            <Award className="w-3.5 h-3.5" />
            <span>Excellence in Education</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-3 tracking-tight">
            Our Story <span className="text-primary-400">&</span> Legacy
          </h1>
          <p className="text-base text-primary-200 max-w-2xl mx-auto font-light leading-relaxed">
            Your limitless pursuit of academic success starts here. We are an educational consultancy dedicated to making abroad study entirely hitch-free.
          </p>
        </div>
      </div>

      {/* Main Content - Split Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-px w-8 bg-primary-600"></div>
              <h2 className="text-primary-600 font-semibold tracking-widest uppercase text-xs">Who We Are</h2>
            </div>
            <h3 className="text-2xl md:text-3xl font-display font-bold text-gray-900 leading-tight">
              Bridging the gap to <span className="text-primary-600">global opportunities.</span>
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Universe Educational Consultancy Limited is a registered educational consulting firm with 5 years of dedicated operation. We have built strong affiliations with over <strong className="text-gray-900">200 partner universities across 14 countries</strong>, including 90+ in the UK, Canada, Australia, Ireland, and more.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Our commitment goes beyond processing applications; we provide genuine mentorship, transparent guidance, and holistic support to students of all backgrounds and nationalities.
            </p>
            
            {/* Quick Stats inline */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
              <div>
                <div className="text-2xl font-bold text-primary-600 font-display">5+</div>
                <div className="text-xs text-gray-500 mt-0.5 font-medium">Years Active</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary-600 font-display">200+</div>
                <div className="text-xs text-gray-500 mt-0.5 font-medium">Universities</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary-600 font-display">14</div>
                <div className="text-xs text-gray-500 mt-0.5 font-medium">Countries</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
              <div className="w-10 h-10 bg-accent-100 rounded-xl flex items-center justify-center text-accent-600 mb-4">
                <Shield className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold font-display text-gray-900 mb-2">
                Official Compliance
              </h4>
              <p className="text-sm text-gray-500 mb-5">
                We maintain the highest standards of professionalism and verified compliance.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <CheckCircle className="text-primary-600 w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <span className="block font-semibold text-gray-900 text-sm">CAC Registered</span>
                    <span className="text-xs text-gray-500">Corporate Affairs Commission, Nigeria</span>
                  </div>
                </li>
                <li className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <CheckCircle className="text-primary-600 w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <span className="block font-semibold text-gray-900 text-sm">SCUML Certified</span>
                    <span className="text-xs text-gray-500">Anti-Money Laundering Compliant</span>
                  </div>
                </li>
                <li className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <Building2 className="text-primary-600 w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <span className="block font-semibold text-gray-900 text-sm">Global Offices</span>
                    <span className="text-xs text-gray-500">Physical presence in Abuja & Leeds</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
          
        </div>
      </div>

      {/* Mission & Vision - Staggered Cards */}
      <div className="bg-gray-50 py-12 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-gray-900">Core Principles</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Mission Card */}
            <div className="bg-primary-900 text-white rounded-2xl p-8 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 shadow-lg">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <Target className="w-28 h-28 transform rotate-12" />
              </div>
              <div className="relative z-10">
                <div className="w-10 h-10 bg-primary-800 rounded-xl flex items-center justify-center text-primary-400 mb-4 border border-primary-700">
                  <Target className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-display font-bold mb-3 text-white">Our Mission</h3>
                <div className="w-8 h-0.5 bg-accent-400 mb-4"></div>
                <p className="text-sm text-primary-100 leading-relaxed font-light">
                  To make education accessible to everyone irrespective of life and academic backgrounds, race or nationality. We believe you are <strong className="text-white font-medium">limitless</strong> in your pursuit of academic success and excellence.
                </p>
              </div>
            </div>
            
            {/* Vision Card */}
            <div className="bg-white text-gray-900 rounded-2xl p-8 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 shadow-md border border-gray-100">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                <Eye className="w-28 h-28 transform -rotate-12" />
              </div>
              <div className="relative z-10">
                <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600 mb-4 border border-primary-100">
                  <Eye className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-display font-bold mb-3">Our Vision</h3>
                <div className="w-8 h-0.5 bg-primary-600 mb-4"></div>
                <p className="text-sm text-gray-600 leading-relaxed font-light">
                  To make education accessible to anyone from anywhere desiring to study any course in any country of the world. We provide adequate support, true information and often <strong className="text-primary-600 font-medium">free services to EVERYONE</strong>, making abroad study easy and hitch free.
                </p>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
