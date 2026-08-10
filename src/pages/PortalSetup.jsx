import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { usePortal } from '../context/PortalContext';
import { User, ArrowRight, Check } from 'lucide-react';
import { universityData } from '../data/universityData';
import { studyDestinationNames } from '../data/studyDestinations';

const countries = [
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', dial: '234' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', dial: '44' },
  { code: 'US', name: 'United States', flag: '🇺🇸', dial: '1' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', dial: '1' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', dial: '61' },
  { code: 'IN', name: 'India', flag: '🇮🇳', dial: '91' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', dial: '233' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', dial: '254' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', dial: '27' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', dial: '49' },
  { code: 'FR', name: 'France', flag: '🇫🇷', dial: '33' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', dial: '34' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', dial: '39' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', dial: '31' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', dial: '234' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', dial: '353' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', dial: '46' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴', dial: '47' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰', dial: '45' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', dial: '32' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', dial: '41' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', dial: '81' },
  { code: 'CN', name: 'China', flag: '🇨🇳', dial: '86' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', dial: '55' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', dial: '52' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', dial: '54' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷', dial: '90' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', dial: '966' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', dial: '971' },
];

const targetCountryOptions = studyDestinationNames;

const universitiesByCountry = universityData.reduce((acc, university) => {
  const countryName = university.country;
  if (!targetCountryOptions.includes(countryName)) return acc;

  if (!acc[countryName]) {
    acc[countryName] = [];
  }

  if (!acc[countryName].includes(university.name)) {
    acc[countryName].push(university.name);
  }

  return acc;
}, {});

const courses = [
  'Computer Science',
  'Business Administration',
  'Engineering',
  'Medicine',
  'Law',
  'Psychology',
  'Economics',
  'International Relations',
  'Marketing',
  'Finance',
];

const intakeSessions = ['Sept 2026', 'Jan 2027', 'Sept 2027', 'Jan 2028'];

const stages = [
  'Initial Consultation',
  'Document Preparation',
  'Application Submitted',
  'Document Verification',
  'CAS Letter Processing',
  'Visa Preparation',
];

const PortalSetup = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  const navigate = useNavigate();
  const { updateApplicationData } = usePortal();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Personal
    fullName: '',
    dateOfBirth: '',
    email: '',
    password: '',
    confirmPassword: '',
    mobileNumber: '',
    countryCode: '234',
    country: 'Nigeria',
    passportNumber: '',
    profilePicture: '',
    // Academic
    targetCountry: 'United Kingdom',
    targetUniversity: '',
    customUniversity: '',
    highestQualification: '',
    previousInstitution: '',
    cgpa: '',
    courseOfStudy: '',
    intakeSession: '',
    currentStage: '',
    // other
    consent: false,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    }
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.mobileNumber.trim()) {
      newErrors.mobileNumber = 'Mobile number is required';
    }
    if (!formData.country) {
      newErrors.country = 'Country is required';
    }
    if (!formData.passportNumber.trim()) {
      newErrors.passportNumber = 'Passport number is required';
    }
    if (!formData.targetCountry) {
      newErrors.targetUniversity = 'Target country is required';
    }
    if (!formData.courseOfStudy) {
      newErrors.courseOfStudy = 'Course of study is required';
    }
    if (!formData.intakeSession) {
      newErrors.intakeSession = 'Intake session is required';
    }
    if (!formData.currentStage) {
      newErrors.currentStage = 'Current stage is required';
    }
    if (!formData.consent) {
      newErrors.consent = 'You must accept the privacy policy';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep = (s) => {
    const oldErrors = {};
    if (s === 1) {
      if (!formData.fullName.trim()) oldErrors.fullName = 'Full name is required';
      if (!formData.email) oldErrors.email = 'Email is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) oldErrors.email = 'Invalid email format';
      if (!formData.password) oldErrors.password = 'Password is required';
      else if (formData.password.length < 6) oldErrors.password = 'Password must be at least 6 characters';
      if (!formData.confirmPassword) oldErrors.confirmPassword = 'Confirm password is required';
      else if (formData.password !== formData.confirmPassword) oldErrors.confirmPassword = 'Passwords do not match';
      if (!formData.mobileNumber) oldErrors.mobileNumber = 'Mobile number is required';
    }
    if (s === 2) {
      if (!formData.targetCountry) oldErrors.targetCountry = 'Target country is required';
      if (!formData.targetUniversity) oldErrors.targetUniversity = 'Target university is required';
      if (formData.targetUniversity === 'OTHER' && !formData.customUniversity.trim()) oldErrors.customUniversity = 'Please enter your university name';
      if (!formData.courseOfStudy) oldErrors.courseOfStudy = 'Course of study is required';
    }
    if (s === 3) {
      // files are optional but ensure consent checked
      if (!formData.consent) oldErrors.consent = 'You must accept the privacy policy';
    }
    setErrors(oldErrors);
    return Object.keys(oldErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(step)) return;
    if (step < 3) {
      setStep(prev => prev + 1);
      return;
    }

    setIsSubmitting(true);
    const registrationData = {
      ...formData,
      targetUniversity: formData.targetUniversity === 'OTHER' ? formData.customUniversity : formData.targetUniversity,
      uploads: {
        passport: uploads.passport?.name || '',
        transcripts: uploads.transcripts?.name || '',
        cv: uploads.cv?.name || '',
      },
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData),
      });
      const result = await response.json();

      if (!response.ok) {
        setErrors({ submit: result.error || 'Registration failed' });
        setIsSubmitting(false);
        return;
      }

      updateApplicationData(registrationData);
      navigate('/login');
    } catch (error) {
      setErrors({ submit: 'Unable to connect to registration service' });
    }

    setIsSubmitting(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleCountryChange = (e) => {
    const selectedCountryCode = e.target.value;
    const selectedCountry = countries.find(c => c.code === selectedCountryCode);
    setFormData(prev => ({ 
      ...prev, 
      countryCode: selectedCountry?.dial || selectedCountryCode,
      country: selectedCountry?.name || ''
    }));
  };

  const handleTargetCountryChange = (e) => {
    const countryName = e.target.value;
    setFormData(prev => ({ ...prev, targetCountry: countryName, targetUniversity: '' }));
  };

  // uploads state + helpers
  const [uploads, setUploads] = useState({ passport: null, transcripts: null, cv: null });
  const passportRef = useRef(null);
  const transcriptsRef = useRef(null);
  const cvRef = useRef(null);

  const handleFilePick = (field, file) => {
    setUploads(prev => ({ ...prev, [field]: file }));
  };

  const handleProfilePic = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({ ...prev, profilePicture: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e, field) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFilePick(field, file);
  };

  const prevent = (e) => e.preventDefault();

  const onFileChange = (e, field) => {
    const file = e.target.files?.[0];
    if (file) handleFilePick(field, file);
  };

  const onProfileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleProfilePic(file);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <User className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-display font-bold text-gray-900 mb-3">
            Student Registration
          </h1>
          <p className="text-gray-600 max-w-md mx-auto">
            Create your profile to begin your study abroad application journey
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-10 border border-primary-100">
          {/* Progress tracker header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-primary-900 font-bold text-sm ${step===1? 'bg-accent-400':'bg-gray-100'}`}>{step}</div>
                <h2 className="text-lg font-bold text-gray-900">{step===1? 'Personal Information' : step===2 ? 'Academic Details' : 'Upload Documents'}</h2>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className={`px-3 py-1 rounded-full ${step===1? 'bg-primary-50':'bg-gray-100'}`}></div>
                <div className={`px-3 py-1 rounded-full ${step===2? 'bg-primary-50':'bg-gray-100'}`}></div>
                <div className={`px-3 py-1 rounded-full ${step===3? 'bg-primary-50':'bg-gray-100'}`}></div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 1 && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div className="md:col-span-2">
                    <label htmlFor="fullName" className="block text-sm font-semibold text-gray-800 mb-2">Full Name *</label>
                    <input type="text" id="fullName" name="fullName" value={formData.fullName} onChange={handleChange} className={`w-full px-5 py-3.5 border-2 rounded-xl ${errors.fullName? 'border-red-500':'border-gray-200'}`} placeholder="Enter your legal full name" />
                    {errors.fullName && <p className="mt-2 text-sm text-red-600">{errors.fullName}</p>}
                  </div>

                  <div>
                    <label htmlFor="dateOfBirth" className="block text-sm font-semibold text-gray-800 mb-2">Date of Birth</label>
                    <input type="date" id="dateOfBirth" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className="w-full px-5 py-3.5 border-2 rounded-xl" />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-2">Email Address</label>
                    <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} className={`w-full px-5 py-3.5 border-2 rounded-xl ${errors.email? 'border-red-500':'border-gray-200'}`} placeholder="your.email@example.com" />
                    {errors.email && <p className="mt-2 text-sm text-red-600">{errors.email}</p>}
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-gray-800 mb-2">Password</label>
                    <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} className={`w-full px-5 py-3.5 border-2 rounded-xl ${errors.password? 'border-red-500':'border-gray-200'}`} placeholder="Create a password" />
                    {errors.password && <p className="mt-2 text-sm text-red-600">{errors.password}</p>}
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-800 mb-2">Confirm Password</label>
                    <input type="password" id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className={`w-full px-5 py-3.5 border-2 rounded-xl ${errors.confirmPassword? 'border-red-500':'border-gray-200'}`} placeholder="Repeat password" />
                    {errors.confirmPassword && <p className="mt-2 text-sm text-red-600">{errors.confirmPassword}</p>}
                  </div>

                  <div>
                    <label htmlFor="country" className="block text-sm font-semibold text-gray-800 mb-2">Country</label>
                    <select id="country" name="countryCode" value={countries.find(c=>c.dial===formData.countryCode)?.code || formData.countryCode} onChange={handleCountryChange} className={`w-full px-5 py-3.5 border-2 rounded-xl ${errors.country? 'border-red-500':'border-gray-200'}`}>
                      <option value="">Select country</option>
                      {countries.map(c => (<option key={c.code} value={c.code}>{c.name}</option>))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="mobileNumber" className="block text-sm font-semibold text-gray-800 mb-2">Mobile Number</label>
                    <div className="flex gap-2">
                      <span className="inline-flex items-center px-3 py-3.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-600 font-medium">+{formData.countryCode}</span>
                      <input type="tel" id="mobileNumber" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} className={`flex-1 px-4 py-3.5 border-2 rounded-xl ${errors.mobileNumber? 'border-red-500':'border-gray-200'}`} placeholder="e.g., 8123456789" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="passportNumber" className="block text-sm font-semibold text-gray-800 mb-2">Passport Number</label>
                    <input type="text" id="passportNumber" name="passportNumber" value={formData.passportNumber} onChange={handleChange} className={`w-full px-5 py-3.5 border-2 rounded-xl ${errors.passportNumber ? 'border-red-500' : 'border-gray-200'}`} placeholder="Enter passport number" />
                    {errors.passportNumber && <p className="mt-2 text-sm text-red-600">{errors.passportNumber}</p>}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-800 mb-2">Profile Picture</label>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                        {formData.profilePicture ? (
                          <img src={formData.profilePicture} alt="profile" className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-sm text-gray-500">No photo</div>
                        )}
                      </div>
                      <div>
                        <input type="file" accept="image/*" onChange={onProfileChange} className="hidden" id="profilePicInput" />
                        <label htmlFor="profilePicInput" className="inline-block px-4 py-2 bg-white border rounded-md cursor-pointer">Upload photo</label>
                        <p className="text-xs text-gray-500 mt-2">Recommended: clear headshot, JPG/PNG, &lt;2MB.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center gap-3 mt-6">
                  <Link to="/login" className="text-sm text-primary-600 hover:underline">Already registered? Log in</Link>
                  <button type="button" onClick={() => { if (validateStep(1)) setStep(2); }} className="px-6 py-3 bg-primary-600 text-white rounded-xl">Next</button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="targetCountry" className="block text-sm font-semibold text-gray-800 mb-2">Target Country *</label>
                    <select id="targetCountry" name="targetCountry" value={formData.targetCountry} onChange={handleTargetCountryChange} className={`w-full px-5 py-3.5 border-2 rounded-xl ${errors.targetCountry? 'border-red-500':'border-gray-200'}`}>
                      <option value="">Select country</option>
                      {targetCountryOptions.map(country => (<option key={country} value={country}>{country}</option>))}
                    </select>
                    {errors.targetCountry && <p className="mt-2 text-sm text-red-600">{errors.targetCountry}</p>}
                  </div>

                  <div>
                    <label htmlFor="targetUniversity" className="block text-sm font-semibold text-gray-800 mb-2">Target University *</label>
                    <select id="targetUniversity" name="targetUniversity" value={formData.targetUniversity} onChange={handleChange} className={`w-full px-5 py-3.5 border-2 rounded-xl ${errors.targetUniversity? 'border-red-500':'border-gray-200'}`}>
                      <option value="">
                        {formData.targetCountry ? 'Select university' : 'Select target country first'}
                      </option>
                      {(universitiesByCountry[formData.targetCountry] || []).map(uni => (<option key={uni} value={uni}>{uni}</option>))}
                      <option value="OTHER">
                        {(universitiesByCountry[formData.targetCountry] || []).length ? 'Other (specify)' : 'Other / school not listed'}
                      </option>
                    </select>
                    {formData.targetUniversity === 'OTHER' && (
                      <input name="customUniversity" value={formData.customUniversity} onChange={handleChange} placeholder="Enter university name" className={`mt-2 w-full px-4 py-2 border rounded-md ${errors.customUniversity? 'border-red-500':'border-gray-200'}`} />
                    )}
                    {errors.targetUniversity && <p className="mt-2 text-sm text-red-600">{errors.targetUniversity}</p>}
                    {errors.customUniversity && <p className="mt-2 text-sm text-red-600">{errors.customUniversity}</p>}
                  </div>

                  <div>
                    <label htmlFor="courseOfStudy" className="block text-sm font-semibold text-gray-800 mb-2">Course of Study *</label>
                    <select id="courseOfStudy" name="courseOfStudy" value={formData.courseOfStudy} onChange={handleChange} className={`w-full px-5 py-3.5 border-2 rounded-xl ${errors.courseOfStudy? 'border-red-500':'border-gray-200'}`}>
                      <option value="">Select course</option>
                      {courses.map(course => (<option key={course} value={course}>{course}</option>))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="intakeSession" className="block text-sm font-semibold text-gray-800 mb-2">Intake Session *</label>
                    <select id="intakeSession" name="intakeSession" value={formData.intakeSession} onChange={handleChange} className={`w-full px-5 py-3.5 border-2 rounded-xl ${errors.intakeSession? 'border-red-500':'border-gray-200'}`}>
                      <option value="">Select intake</option>
                      {intakeSessions.map(s => (<option key={s} value={s}>{s}</option>))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="currentStage" className="block text-sm font-semibold text-gray-800 mb-2">Current Application Stage *</label>
                    <select id="currentStage" name="currentStage" value={formData.currentStage} onChange={handleChange} className={`w-full px-5 py-3.5 border-2 rounded-xl ${errors.currentStage? 'border-red-500':'border-gray-200'}`}>
                      <option value="">Select current stage</option>
                      {stages.map(stage => (<option key={stage} value={stage}>{stage}</option>))}
                    </select>
                    {errors.currentStage && <p className="mt-2 text-sm text-red-600">{errors.currentStage}</p>}
                  </div>
                </div>

                <div className="flex justify-between gap-3 mt-6">
                  <button type="button" onClick={() => setStep(1)} className="px-6 py-3 bg-gray-100 rounded-xl">Back</button>
                  <button type="button" onClick={() => { if (validateStep(2)) setStep(3); }} className="px-6 py-3 bg-primary-600 text-white rounded-xl">Next</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-accent-400 rounded-full flex items-center justify-center text-primary-900 font-bold text-sm">3</div>
                    <h3 className="text-lg font-bold text-gray-900">Upload Documents</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Passport */}
                    <div onDrop={(e) => handleDrop(e, 'passport')} onDragOver={prevent} className="p-4 border border-dashed rounded-lg text-center bg-gray-50">
                      <label className="block text-sm font-semibold text-gray-800 mb-2">Passport Data Page</label>
                      <div className="text-sm text-gray-500 mb-2">Drag & drop or click to upload</div>
                      <input ref={passportRef} type="file" accept="image/*,application/pdf" onChange={(e) => onFileChange(e, 'passport')} className="hidden" />
                      <button type="button" onClick={() => passportRef.current?.click()} className="mt-2 px-4 py-2 bg-white border rounded-md">Choose file</button>
                      {uploads.passport && <div className="mt-3 text-xs text-gray-700">{uploads.passport.name}</div>}
                    </div>

                    {/* Transcripts */}
                    <div onDrop={(e) => handleDrop(e, 'transcripts')} onDragOver={prevent} className="p-4 border border-dashed rounded-lg text-center bg-gray-50">
                      <label className="block text-sm font-semibold text-gray-800 mb-2">Academic Certificates / Transcripts</label>
                      <div className="text-sm text-gray-500 mb-2">Drag & drop or click to upload</div>
                      <input ref={transcriptsRef} type="file" accept="image/*,application/pdf" onChange={(e) => onFileChange(e, 'transcripts')} className="hidden" />
                      <button type="button" onClick={() => transcriptsRef.current?.click()} className="mt-2 px-4 py-2 bg-white border rounded-md">Choose file</button>
                      {uploads.transcripts && <div className="mt-3 text-xs text-gray-700">{uploads.transcripts.name}</div>}
                    </div>

                    {/* CV / SOP */}
                    <div onDrop={(e) => handleDrop(e, 'cv')} onDragOver={prevent} className="p-4 border border-dashed rounded-lg text-center bg-gray-50">
                      <label className="block text-sm font-semibold text-gray-800 mb-2">CV / Statement of Purpose</label>
                      <div className="text-sm text-gray-500 mb-2">Drag & drop or click to upload</div>
                      <input ref={cvRef} type="file" accept="application/pdf,application/msword" onChange={(e) => onFileChange(e, 'cv')} className="hidden" />
                      <button type="button" onClick={() => cvRef.current?.click()} className="mt-2 px-4 py-2 bg-white border rounded-md">Choose file</button>
                      {uploads.cv && <div className="mt-3 text-xs text-gray-700">{uploads.cv.name}</div>}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <div className="relative flex-shrink-0 mt-0.5">
                      <input type="checkbox" name="consent" checked={formData.consent} onChange={handleChange} className="w-5 h-5 border-2 border-gray-300 rounded transition-all checked:bg-primary-600 checked:border-primary-600 appearance-none" />
                      {formData.consent && <Check className="absolute inset-0 w-3 h-3 m-auto text-white pointer-events-none" />}
                    </div>
                    <span className="text-sm text-gray-600">By clicking Submit, you consent to your data being handled as per our <a href="#" className="text-primary-600 underline">Privacy Policy</a></span>
                  </label>
                  {errors.consent && <p className="mt-2 text-sm text-red-600">{errors.consent}</p>}
                </div>

                <div className="flex justify-between gap-3 mt-6">
                  <button type="button" onClick={() => setStep(2)} className="px-6 py-3 bg-gray-100 rounded-xl">Back</button>
                  <button type="submit" disabled={isSubmitting} className="px-6 py-3 bg-primary-600 text-white rounded-xl">
                    {isSubmitting ? 'Saving...' : 'Complete Registration'}
                  </button>
                </div>
                {errors.submit && <p className="mt-4 text-sm text-red-600 text-center">{errors.submit}</p>}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default PortalSetup;
