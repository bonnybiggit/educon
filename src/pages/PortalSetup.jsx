import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Globe2, Compass, LineChart } from 'lucide-react';
import StudentAuthShell from '../components/StudentAuthShell';
import { registerStudent, resendStudentEmailVerification, verifyStudentEmail } from '../services/studentApi';
import { usePortal } from '../context/PortalContext';
import Seo from '../components/Seo';

const countries = [
  { code: 'NG', name: 'Nigeria', dial: '234' },
  { code: 'GB', name: 'United Kingdom', dial: '44' },
  { code: 'US', name: 'United States', dial: '1' },
  { code: 'CA', name: 'Canada', dial: '1' },
  { code: 'AU', name: 'Australia', dial: '61' },
  { code: 'IN', name: 'India', dial: '91' },
  { code: 'GH', name: 'Ghana', dial: '233' },
  { code: 'KE', name: 'Kenya', dial: '254' },
  { code: 'ZA', name: 'South Africa', dial: '27' },
  { code: 'DE', name: 'Germany', dial: '49' },
  { code: 'FR', name: 'France', dial: '33' },
  { code: 'ES', name: 'Spain', dial: '34' },
  { code: 'IT', name: 'Italy', dial: '39' },
  { code: 'NL', name: 'Netherlands', dial: '31' },
  { code: 'IE', name: 'Ireland', dial: '353' },
  { code: 'SE', name: 'Sweden', dial: '46' },
  { code: 'NO', name: 'Norway', dial: '47' },
  { code: 'DK', name: 'Denmark', dial: '45' },
  { code: 'BE', name: 'Belgium', dial: '32' },
  { code: 'CH', name: 'Switzerland', dial: '41' },
  { code: 'JP', name: 'Japan', dial: '81' },
  { code: 'CN', name: 'China', dial: '86' },
  { code: 'BR', name: 'Brazil', dial: '55' },
  { code: 'MX', name: 'Mexico', dial: '52' },
  { code: 'AR', name: 'Argentina', dial: '54' },
  { code: 'TR', name: 'Turkey', dial: '90' },
  { code: 'SA', name: 'Saudi Arabia', dial: '966' },
  { code: 'AE', name: 'United Arab Emirates', dial: '971' },
];

const PortalSetup = () => {
  const navigate = useNavigate();
  const { login } = usePortal();
  const [isEmailVerification, setIsEmailVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationMessage, setVerificationMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    mobileNumber: '',
    countryCode: '234',
    country: 'Nigeria',
    consent: false,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!resendCooldown) return undefined;
    const timer = window.setInterval(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Confirm password is required';
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!formData.mobileNumber) newErrors.mobileNumber = 'Mobile number is required';
    if (!formData.consent) newErrors.consent = 'You must accept the privacy policy';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const result = await registerStudent({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        country: formData.country,
        mobileNumber: formData.mobileNumber,
        consent: formData.consent,
      });
      if (!result.success) {
        setErrors({ submit: result.message || 'Registration failed' });
      } else {
        setIsEmailVerification(true);
        setResendCooldown(60);
        setErrors({});
      }
    } catch {
      setErrors({ submit: 'Unable to connect to registration service' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyEmail = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(verificationCode)) {
      setVerificationMessage('Enter the 6-digit verification code from your email.');
      return;
    }
    setIsSubmitting(true);
    setVerificationMessage('');
    try {
      const result = await verifyStudentEmail({ email: formData.email, code: verificationCode });
      if (!result.success || !result.data?.verified) {
        setVerificationMessage(result.message || 'That code is invalid or expired.');
        return;
      }
      const loginResult = await login(formData.email, formData.password);
      if (!loginResult.success) {
        setVerificationMessage('Email verified, but automatic sign in failed. Please sign in manually.');
        return;
      }
      navigate('/dashboard');
    } catch {
      setVerificationMessage('Unable to verify your email right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0 || isSubmitting) return;
    setIsSubmitting(true);
    setVerificationMessage('');
    try {
      const result = await resendStudentEmailVerification(formData.email);
      if (!result.success) {
        setVerificationMessage(result.message || 'Unable to resend the verification code.');
        return;
      }
      setResendCooldown(60);
      setVerificationMessage('If your email can be verified, a new code has been sent.');
    } catch {
      setVerificationMessage('Unable to resend the verification code right now.');
    } finally {
      setIsSubmitting(false);
    }
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

  const inputBase = 'w-full px-4 py-3 border rounded-xl bg-white text-gray-900 placeholder:text-gray-400 transition focus:outline-none focus:ring-4 focus:ring-primary-500/15 focus:border-primary-600';
  const inputClass = (name) => `${inputBase} ${errors[name] ? 'border-red-500' : 'border-gray-300'}`;
  const labelClass = 'block text-sm font-semibold text-gray-800 mb-1.5';
  const errorClass = 'mt-1.5 text-sm text-red-600';
  const highlights = [
    { icon: Globe2, text: 'Explore international universities' },
    { icon: Compass, text: 'Get expert admission guidance' },
    { icon: LineChart, text: 'Track your application journey' },
  ];

  return (
    <StudentAuthShell
      heading={<>Your Global Education <span className="text-accent-400">Journey Starts Here</span></>}
      text="Create your student profile and take the first step toward studying at your dream university."
      highlights={highlights}
    >
      <Seo
        title="Student Registration | Universe Consult"
        description="Create a private student portal profile with Universe Consult."
        pathname="/portal/setup"
        noIndex
      />
      {!isEmailVerification && (
            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-primary-900">Create Your Student Account</h2>
              <p className="mt-2 text-gray-600">Complete your details to get started.</p>
              <div className="mt-4 h-1 w-12 rounded-full bg-accent-400" />
            </div>
          )}
          {isEmailVerification ? (
            <div className="max-w-md mx-auto text-center">
              <div className="w-14 h-14 bg-accent-400 rounded-full flex items-center justify-center mx-auto mb-5 text-primary-900 font-bold text-xl">@</div>
              <h2 className="text-2xl font-bold text-gray-900">Verify Your Email</h2>
              <p className="text-gray-600 mt-3">Enter the 6-digit code sent to <span className="font-semibold text-gray-900">{formData.email}</span>.</p>
              <form onSubmit={handleVerifyEmail} className="mt-8 space-y-4">
                <label htmlFor="verificationCode" className="sr-only">Email verification code</label>
                <input
                  id="verificationCode"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full text-center tracking-[0.5em] text-2xl font-bold px-5 py-3.5 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  placeholder="000000"
                  disabled={isSubmitting}
                />
                <button type="submit" disabled={isSubmitting} className="w-full px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50">
                  {isSubmitting ? 'Verifying...' : 'Verify Email'}
                </button>
              </form>
              <button type="button" onClick={handleResendVerification} disabled={isSubmitting || resendCooldown > 0} className="mt-5 text-sm font-semibold text-primary-600 hover:text-primary-800 disabled:text-gray-400">
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend verification code'}
              </button>
              {verificationMessage && <p className="mt-4 text-sm text-gray-600" role="status">{verificationMessage}</p>}
            </div>
          ) : (
            <form onSubmit={handleSubmit}             className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label htmlFor="fullName" className={labelClass}>Full Name *</label>
                  <input type="text" id="fullName" name="fullName" value={formData.fullName} onChange={handleChange} className={inputClass('fullName')} placeholder="Enter your legal full name" aria-invalid={!!errors.fullName} />
                  {errors.fullName && <p className={errorClass} role="alert">{errors.fullName}</p>}
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="email" className={labelClass}>Email Address</label>
                  <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} className={inputClass('email')} placeholder="your.email@example.com" aria-invalid={!!errors.email} />
                  {errors.email && <p className={errorClass} role="alert">{errors.email}</p>}
                </div>

                <div>
                  <label htmlFor="password" className={labelClass}>Password</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} id="password" name="password" value={formData.password} onChange={handleChange} className={`${inputClass('password')} pr-12`} placeholder="Create a password" aria-invalid={!!errors.password} />
                    <button type="button" onClick={() => setShowPassword(prev => !prev)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-gray-500 hover:text-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && <p className={errorClass} role="alert">{errors.password}</p>}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className={labelClass}>Confirm Password</label>
                  <div className="relative">
                    <input type={showConfirmPassword ? 'text' : 'password'} id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className={`${inputClass('confirmPassword')} pr-12`} placeholder="Repeat password" aria-invalid={!!errors.confirmPassword} />
                    <button type="button" onClick={() => setShowConfirmPassword(prev => !prev)} aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'} className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-gray-500 hover:text-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className={errorClass} role="alert">{errors.confirmPassword}</p>}
                </div>

                <div>
                  <label htmlFor="country" className={labelClass}>Country</label>
                  <select id="country" name="countryCode" value={countries.find(c=>c.dial===formData.countryCode)?.code || formData.countryCode} onChange={handleCountryChange} className={`${inputBase} border-gray-300`}>
                    <option value="">Select country</option>
                    {countries.map(c => (<option key={c.code} value={c.code}>{c.name}</option>))}
                  </select>
                </div>

                <div>
                  <label htmlFor="mobileNumber" className={labelClass}>Mobile Number</label>
                  <div className="flex gap-2">
                    <span className="inline-flex items-center px-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-600 font-medium">+{formData.countryCode}</span>
                    <input type="tel" id="mobileNumber" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} className={`${inputClass('mobileNumber')} min-w-0 flex-1`} placeholder="e.g., 8123456789" aria-invalid={!!errors.mobileNumber} />
                  </div>
                  {errors.mobileNumber && <p className={errorClass} role="alert">{errors.mobileNumber}</p>}
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" name="consent" checked={formData.consent} onChange={handleChange} className="w-5 h-5 mt-0.5 accent-primary-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2" />
                <span className="text-sm text-gray-600">I consent to my data being handled as described in the Privacy Policy.</span>
              </label>
              {errors.consent && <p className="text-sm text-red-600" role="alert">{errors.consent}</p>}

              {errors.submit && <p className="text-sm text-red-600 text-center" role="alert">{errors.submit}</p>}

              <button type="submit" disabled={isSubmitting} className="w-full px-6 py-3.5 bg-primary-900 text-white rounded-xl font-semibold border-b-4 border-accent-400 shadow-lg shadow-primary-900/20 transition hover:bg-primary-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-400/50 disabled:opacity-50 disabled:cursor-not-allowed">{isSubmitting ? 'Creating Account...' : 'Create Account'}</button>
              <p className="text-center">
                <Link to="/login" className="text-sm font-medium text-primary-700 hover:text-primary-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded">Already registered? Log in</Link>
              </p>
            </form>
          )}
    </StudentAuthShell>
  );
};

export default PortalSetup;
