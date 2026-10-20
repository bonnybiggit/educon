import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, CheckCircle2, ChevronLeft, ChevronRight, FileText, GraduationCap, Lock, Save, Upload, User } from 'lucide-react';
import Seo from '../components/Seo';
import { universityData } from '../data/universityData';
import { studyDestinationNames } from '../data/studyDestinations';
import { getApplicationStageLabel } from '../data/applicationStages';
import { getStudentProfile, updateStudentProfile } from '../services/studentApi';
import { usePortal } from '../context/PortalContext';

const intakeSessions = ['Sept 2026', 'Jan 2027', 'Sept 2027', 'Jan 2028'];

// Fields the backend profile endpoint accepts (server/controllers/studentProfileController.js)
const emptyForm = {
  dateOfBirth: '',
  passportNumber: '',
  profilePicture: '',
  mobileNumber: '',
  country: '',
  fullAddress: '',
  targetCountry: '',
  targetUniversity: '',
  customUniversity: '',
  highestQualification: '',
  previousInstitution: '',
  cgpa: '',
  courseOfStudy: '',
  intakeSession: '',
};

const emptyFiles = {
  passport: null,
  transcripts: null,
  cv: null,
  waec: null,
  waecScratchCard: null,
  degreeCertificate: null,
  statementOfPurpose: null,
  academicReferenceLetter: null,
  professionalReferenceLetter: null,
};

const academicDocumentTypes = [
  { field: 'waec', label: 'WAEC', accept: 'image/*,.pdf' },
  { field: 'waecScratchCard', label: 'WAEC Scratch Card', accept: 'image/jpeg,image/png,image/webp', imageOnly: true },
  { field: 'degreeCertificate', label: 'Degree Certificate', accept: 'image/*,.pdf' },
  { field: 'transcripts', label: 'Academic Transcript', accept: 'image/*,.pdf' },
];

const applicationDocumentTypes = [
  { field: 'passport', label: 'International Passport', accept: 'image/*,.pdf' },
  { field: 'cv', label: 'CV', accept: '.pdf,.doc,.docx' },
  { field: 'statementOfPurpose', label: 'Statement of Purpose', accept: '.pdf,.doc,.docx' },
  { field: 'academicReferenceLetter', label: 'Academic Reference Letter', accept: '.pdf,.doc,.docx,image/*' },
  { field: 'professionalReferenceLetter', label: 'Professional Reference Letter', accept: '.pdf,.doc,.docx,image/*' },
];

const allDocumentTypes = [...academicDocumentTypes, ...applicationDocumentTypes];

const requiredFieldsForSubmit = ['dateOfBirth', 'passportNumber', 'targetCountry', 'targetUniversity', 'courseOfStudy', 'intakeSession', 'highestQualification', 'previousInstitution', 'cgpa'];
const requiredUploadsForSubmit = allDocumentTypes.map((doc) => doc.field);

const fieldClass = 'w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20';
const readOnlyFieldClass = 'w-full px-4 py-3 border-2 border-gray-100 bg-gray-50 rounded-xl text-gray-600 cursor-not-allowed';

const steps = [
  { key: 'personal', label: 'Personal Information', icon: User },
  { key: 'academic', label: 'Academic Information', icon: GraduationCap },
  { key: 'documents', label: 'Application Documents', icon: FileText },
  { key: 'review', label: 'Review & Submit', icon: CheckCircle2 },
];

const StudentProfile = () => {
  const { verifySession } = usePortal();
  const [formData, setFormData] = useState(emptyForm);
  const [completion, setCompletion] = useState(null);
  const [student, setStudent] = useState(null);
  const [files, setFiles] = useState(emptyFiles);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [errors, setErrors] = useState({});
  const universitiesByCountry = useMemo(() => universityData.reduce((result, university) => {
    if (!studyDestinationNames.includes(university.country)) return result;
    result[university.country] ||= [];
    if (!result[university.country].includes(university.name)) result[university.country].push(university.name);
    return result;
  }, {}), []);

  const loadProfile = async () => {
    setStatus('loading');
    const result = await getStudentProfile();
    if (!result.success) {
      setStatus('error');
      setMessage(result.message || 'Unable to load your profile.');
      return;
    }
    const profile = result.data?.profile || {};
    setStudent(profile);
    setCompletion(result.data?.completion || null);
    setFormData((current) => ({ ...current, ...Object.fromEntries(Object.keys(emptyForm).map((key) => [key, profile[key] || ''])) }));
    setStatus('ready');
  };

  useEffect(() => {
    loadProfile().catch(() => {
      setStatus('error');
      setMessage('Unable to load your profile.');
    });
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const handleProfilePicture = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFormData((current) => ({ ...current, profilePicture: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleDocumentFile = (field, file, { imageOnly } = {}) => {
    if (file && imageOnly && !file.type.startsWith('image/')) {
      setErrors((current) => ({ ...current, [field]: 'Please choose an image file (JPEG, PNG, or WebP).' }));
      return;
    }
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFiles((current) => ({ ...current, [field]: file }));
  };

  const validateForSubmit = () => {
    const nextErrors = {};
    requiredFieldsForSubmit.forEach((field) => {
      if (!String(formData[field] || '').trim()) nextErrors[field] = 'Required';
    });
    if (formData.targetUniversity === 'OTHER' && !formData.customUniversity.trim()) nextErrors.customUniversity = 'Required';
    requiredUploadsForSubmit.forEach((field) => {
      if (!files[field] && !student?.uploads?.[field]) nextErrors[field] = 'Required';
    });
    return nextErrors;
  };

  const persistProfile = async (successMessage) => {
    setIsSaving(true);
    setMessage('');
    const payload = new FormData();
    Object.entries(formData).forEach(([field, value]) => payload.append(field, String(value || '')));
    Object.entries(files).forEach(([field, file]) => {
      if (file) payload.append(field, file);
    });

    try {
      const result = await updateStudentProfile(payload);
      if (!result.success) {
        setMessage(result.message || 'Unable to save your profile.');
        return false;
      }
      setStudent(result.data?.profile || student);
      setCompletion(result.data?.completion || completion);
      setFiles(emptyFiles);
      await verifySession();
      setMessage(successMessage);
      return true;
    } catch {
      setMessage('Unable to save your profile right now.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveForLater = async () => {
    await persistProfile('Progress saved. You can continue later.');
  };

  const handleSubmitApplication = async () => {
    const nextErrors = validateForSubmit();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setMessage('Please complete the required fields highlighted below before submitting.');
      const firstErrorStep = requiredFieldsForSubmit.some((field) => nextErrors[field]) || nextErrors.customUniversity
        ? 1
        : 2;
      setActiveStep(firstErrorStep);
      return;
    }
    await persistProfile('Application submitted successfully.');
  };

  const goNext = () => setActiveStep((current) => Math.min(current + 1, steps.length - 1));
  const goBack = () => setActiveStep((current) => Math.max(current - 1, 0));

  if (status === 'loading') return <div className="min-h-screen bg-gray-50 py-16 px-4 text-center text-gray-600">Loading your application...</div>;
  if (status === 'error') return <div className="min-h-screen bg-gray-50 py-16 px-4 text-center"><p className="text-red-600">{message}</p><Link to="/dashboard" className="inline-block mt-5 text-primary-600 font-semibold">Back to dashboard</Link></div>;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <Seo title="Complete Your Application | Universe Consult" description="Complete your private Universe Consult student application." pathname="/profile" noIndex />
      <div className="max-w-4xl mx-auto">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-primary-600 font-semibold hover:text-primary-800"><ArrowLeft className="w-4 h-4" />Back to dashboard</Link>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mt-8 mb-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary-600">Student application</p>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mt-2">{completion?.isComplete ? 'Your application is complete' : 'Complete Your Application'}</h1>
            <p className="text-gray-600 mt-2">Save your progress and return whenever you are ready.</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-5 py-4 min-w-52">
            <div className="flex items-center justify-between text-sm font-semibold text-gray-700"><span>Completion</span><span>{completion?.percentage || 0}%</span></div>
            <div className="h-2 bg-gray-100 rounded-full mt-3 overflow-hidden"><div className="h-full bg-primary-600 rounded-full transition-all" style={{ width: `${completion?.percentage || 0}%` }} /></div>
            <p className="text-xs text-gray-500 mt-2">{completion?.completedFields || 0} of {completion?.totalFields || 0} required items</p>
          </div>
        </div>

        {completion?.isComplete && <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"><CheckCircle2 className="w-5 h-5" />Your application is complete. You can still review and update it below.</div>}

        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-8">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === activeStep;
              const isDone = index < activeStep;
              return (
                <button key={step.key} type="button" onClick={() => setActiveStep(index)} className={`flex flex-col items-center gap-2 rounded-xl px-2 py-3 text-center transition-colors ${isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-400 hover:text-gray-600'}`}>
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${isActive ? 'border-primary-600 bg-primary-600 text-white' : isDone ? 'border-primary-600 text-primary-600' : 'border-gray-200'}`}>
                    {isDone ? <Check className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                  </span>
                  <span className="text-xs font-semibold leading-tight">{step.label}</span>
                </button>
              );
            })}
          </div>

          {activeStep === 0 && (
            <section className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Personal Information</h2>
                <p className="text-sm text-gray-500 mt-1">Your name, contact and identity details.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                  <label className="text-sm font-semibold text-gray-700">Full name
                    <input value={student?.fullName || ''} disabled className={`${readOnlyFieldClass} mt-2 font-normal`} />
                  </label>
                  <label className="text-sm font-semibold text-gray-700">Email address
                    <span className="relative block mt-2">
                      <input value={student?.email || ''} disabled className={`${readOnlyFieldClass} font-normal pr-10`} />
                      <Lock className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    </span>
                    <span className="mt-1 flex items-center gap-1 text-xs font-normal text-green-700"><CheckCircle2 className="w-3.5 h-3.5" />Verified &amp; read-only</span>
                  </label>
                  <label className="text-sm font-semibold text-gray-700">WhatsApp Number
                    <input name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} className={`${errors.mobileNumber ? 'border-red-400' : ''} ${fieldClass} mt-2 font-normal`} />
                    <span className="mt-1 block text-xs font-normal text-gray-400">Your only contact number for this application.</span>
                  </label>
                  <label className="text-sm font-semibold text-gray-700">Country
                    <input name="country" value={formData.country} onChange={handleChange} className={`${errors.country ? 'border-red-400' : ''} ${fieldClass} mt-2 font-normal`} />
                  </label>
                  <label className="text-sm font-semibold text-gray-700 md:col-span-2">Full address
                    <textarea name="fullAddress" value={formData.fullAddress} onChange={handleChange} rows={2} className={`${fieldClass} mt-2 font-normal`} placeholder="Street, city, state" />
                  </label>
                  <label className="text-sm font-semibold text-gray-700">Date of birth *
                    <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className={`${errors.dateOfBirth ? 'border-red-400' : ''} ${fieldClass} mt-2 font-normal`} />
                  </label>
                  <label className="text-sm font-semibold text-gray-700">Passport number *
                    <input name="passportNumber" value={formData.passportNumber} onChange={handleChange} className={`${errors.passportNumber ? 'border-red-400' : ''} ${fieldClass} mt-2 font-normal`} />
                  </label>
                  <label className="text-sm font-semibold text-gray-700 md:col-span-2">Profile picture
                    <input type="file" accept="image/*" onChange={handleProfilePicture} className="mt-2 block w-full text-sm font-normal text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:font-semibold file:text-primary-700" />
                  </label>
                </div>
              </div>
            </section>
          )}

          {activeStep === 1 && (
            <section className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Academic Information</h2>
                <p className="text-sm text-gray-500 mt-1">Your qualifications and study plan.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                  <label className="text-sm font-semibold text-gray-700">Highest qualification *
                    <input name="highestQualification" value={formData.highestQualification} onChange={handleChange} className={`${errors.highestQualification ? 'border-red-400' : ''} ${fieldClass} mt-2 font-normal`} />
                  </label>
                  <label className="text-sm font-semibold text-gray-700">Previous institution *
                    <input name="previousInstitution" value={formData.previousInstitution} onChange={handleChange} className={`${errors.previousInstitution ? 'border-red-400' : ''} ${fieldClass} mt-2 font-normal`} />
                  </label>
                  <label className="text-sm font-semibold text-gray-700">Course of study *
                    <input name="courseOfStudy" value={formData.courseOfStudy} onChange={handleChange} className={`${errors.courseOfStudy ? 'border-red-400' : ''} ${fieldClass} mt-2 font-normal`} />
                  </label>
                  <label className="text-sm font-semibold text-gray-700">CGPA *
                    <input name="cgpa" value={formData.cgpa} onChange={handleChange} className={`${errors.cgpa ? 'border-red-400' : ''} ${fieldClass} mt-2 font-normal`} />
                  </label>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-7">
                <h3 className="text-lg font-bold text-gray-900">Study plan</h3>
                <p className="text-sm text-gray-500 mt-1">These details help us match you with the right destination.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                  <label className="text-sm font-semibold text-gray-700">Target country *
                    <select name="targetCountry" value={formData.targetCountry} onChange={handleChange} className={`${errors.targetCountry ? 'border-red-400' : ''} ${fieldClass} mt-2 font-normal`}><option value="">Select country</option>{studyDestinationNames.map((country) => <option key={country} value={country}>{country}</option>)}</select>
                  </label>
                  <label className="text-sm font-semibold text-gray-700">Target university *
                    <select name="targetUniversity" value={formData.targetUniversity} onChange={handleChange} className={`${errors.targetUniversity ? 'border-red-400' : ''} ${fieldClass} mt-2 font-normal`}><option value="">Select university</option>{(universitiesByCountry[formData.targetCountry] || []).map((university) => <option key={university} value={university}>{university}</option>)}<option value="OTHER">Other</option></select>
                  </label>
                  {formData.targetUniversity === 'OTHER' && <label className="text-sm font-semibold text-gray-700 md:col-span-2">Custom university *
                    <input name="customUniversity" value={formData.customUniversity} onChange={handleChange} className={`${errors.customUniversity ? 'border-red-400' : ''} ${fieldClass} mt-2 font-normal`} />
                  </label>}
                  <label className="text-sm font-semibold text-gray-700">Intake session *
                    <select name="intakeSession" value={formData.intakeSession} onChange={handleChange} className={`${errors.intakeSession ? 'border-red-400' : ''} ${fieldClass} mt-2 font-normal`}><option value="">Select intake</option>{intakeSessions.map((intake) => <option key={intake} value={intake}>{intake}</option>)}</select>
                  </label>
                  <div className="text-sm font-semibold text-gray-700">
                    <span>Current stage</span>
                    <p className={`${readOnlyFieldClass} mt-2 font-normal`} aria-live="polite">
                      {getApplicationStageLabel(student?.currentStage)}
                    </p>
                    <span className="mt-1 block text-xs font-normal text-gray-400">Your application stage is updated by an administrator.</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-7">
                <h3 className="text-lg font-bold text-gray-900">Academic documents</h3>
                <p className="text-sm text-gray-500 mt-1">PDF or approved image/document files, up to 5MB each. WAEC Scratch Card accepts images only (JPEG, PNG, WebP).</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                  {academicDocumentTypes.map((doc) => (
                    <label key={doc.field} className={`flex items-center gap-3 rounded-xl border-2 border-dashed p-4 text-sm font-semibold cursor-pointer ${errors[doc.field] ? 'border-red-300' : 'border-gray-200 hover:border-primary-400'} text-gray-700`}>
                      <Upload className="w-5 h-5 text-primary-600 shrink-0" />
                      <span className="min-w-0"><span className="block">{doc.label} upload{doc.imageOnly ? ' (images only)' : ''}</span><span className="block text-xs font-normal text-gray-500 truncate">{files[doc.field]?.name || student?.uploads?.[doc.field] || 'Choose file'}</span>{errors[doc.field] && <span className="block text-xs font-normal text-red-600">{errors[doc.field]}</span>}</span>
                      <input type="file" className="sr-only" accept={doc.accept} onChange={(event) => handleDocumentFile(doc.field, event.target.files?.[0] || null, { imageOnly: doc.imageOnly })} />
                    </label>
                  ))}
                </div>
              </div>
            </section>
          )}

          {activeStep === 2 && (
            <section className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Application Documents</h2>
                <p className="text-sm text-gray-500 mt-1">PDF or approved image/document files, up to 5MB each.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                  {applicationDocumentTypes.map((doc) => (
                    <label key={doc.field} className={`flex items-center gap-3 rounded-xl border-2 border-dashed p-4 text-sm font-semibold cursor-pointer ${errors[doc.field] ? 'border-red-300' : 'border-gray-200 hover:border-primary-400'} text-gray-700`}>
                      <Upload className="w-5 h-5 text-primary-600 shrink-0" />
                      <span className="min-w-0"><span className="block">{doc.label} upload</span><span className="block text-xs font-normal text-gray-500 truncate">{files[doc.field]?.name || student?.uploads?.[doc.field] || 'Choose file'}</span>{errors[doc.field] && <span className="block text-xs font-normal text-red-600">{errors[doc.field]}</span>}</span>
                      <input type="file" className="sr-only" accept={doc.accept} onChange={(event) => handleDocumentFile(doc.field, event.target.files?.[0] || null, { imageOnly: doc.imageOnly })} />
                    </label>
                  ))}
                </div>
              </div>
            </section>
          )}

          {activeStep === 3 && (
            <section className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Review &amp; Submit</h2>
                <p className="text-sm text-gray-500 mt-1">Check your details before submitting your application.</p>

                <div className="mt-5 space-y-5">
                  <div className="rounded-xl border border-gray-200 p-5">
                    <h3 className="font-bold text-gray-900">Personal information</h3>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-3 text-sm">
                      <div className="flex justify-between sm:block"><dt className="text-gray-500">Full name</dt><dd className="font-semibold text-gray-800">{student?.fullName || '—'}</dd></div>
                      <div className="flex justify-between sm:block"><dt className="text-gray-500">Email address</dt><dd className="font-semibold text-gray-800">{student?.email || '—'}</dd></div>
                      <div className="flex justify-between sm:block"><dt className="text-gray-500">WhatsApp number</dt><dd className="font-semibold text-gray-800">{formData.mobileNumber || '—'}</dd></div>
                      <div className="flex justify-between sm:block"><dt className="text-gray-500">Country</dt><dd className="font-semibold text-gray-800">{formData.country || '—'}</dd></div>
                      <div className="flex justify-between sm:block"><dt className="text-gray-500">Full address</dt><dd className="font-semibold text-gray-800">{formData.fullAddress || '—'}</dd></div>
                      <div className="flex justify-between sm:block"><dt className="text-gray-500">Date of birth</dt><dd className="font-semibold text-gray-800">{formData.dateOfBirth || '—'}</dd></div>
                      <div className="flex justify-between sm:block"><dt className="text-gray-500">Passport number</dt><dd className="font-semibold text-gray-800">{formData.passportNumber || '—'}</dd></div>
                    </dl>
                  </div>

                  <div className="rounded-xl border border-gray-200 p-5">
                    <h3 className="font-bold text-gray-900">Academic information</h3>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-3 text-sm">
                      <div className="flex justify-between sm:block"><dt className="text-gray-500">Highest qualification</dt><dd className="font-semibold text-gray-800">{formData.highestQualification || '—'}</dd></div>
                      <div className="flex justify-between sm:block"><dt className="text-gray-500">Previous institution</dt><dd className="font-semibold text-gray-800">{formData.previousInstitution || '—'}</dd></div>
                      <div className="flex justify-between sm:block"><dt className="text-gray-500">Course of study</dt><dd className="font-semibold text-gray-800">{formData.courseOfStudy || '—'}</dd></div>
                      <div className="flex justify-between sm:block"><dt className="text-gray-500">CGPA</dt><dd className="font-semibold text-gray-800">{formData.cgpa || '—'}</dd></div>
                      <div className="flex justify-between sm:block"><dt className="text-gray-500">Target country</dt><dd className="font-semibold text-gray-800">{formData.targetCountry || '—'}</dd></div>
                      <div className="flex justify-between sm:block"><dt className="text-gray-500">Target university</dt><dd className="font-semibold text-gray-800">{(formData.targetUniversity === 'OTHER' ? formData.customUniversity : formData.targetUniversity) || '—'}</dd></div>
                      <div className="flex justify-between sm:block"><dt className="text-gray-500">Intake session</dt><dd className="font-semibold text-gray-800">{formData.intakeSession || '—'}</dd></div>
                      <div className="flex justify-between sm:block"><dt className="text-gray-500">Current stage</dt><dd className="font-semibold text-gray-800">{getApplicationStageLabel(student?.currentStage)}</dd></div>
                    </dl>
                  </div>

                  <div className="rounded-xl border border-gray-200 p-5">
                    <h3 className="font-bold text-gray-900">Uploaded documents</h3>
                    <ul className="mt-3 space-y-2 text-sm">
                      {allDocumentTypes.map((doc) => {
                        const uploaded = files[doc.field]?.name || student?.uploads?.[doc.field];
                        return (
                          <li key={doc.field} className="flex items-center justify-between gap-3">
                            <span className="text-gray-700">{doc.label}</span>
                            {uploaded ? <span className="inline-flex items-center gap-1 text-green-700 font-semibold"><CheckCircle2 className="w-4 h-4" />{uploaded}</span> : <span className="text-gray-400">Not uploaded</span>}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          )}

          {message && <p className="text-sm text-gray-700 rounded-lg bg-gray-50 px-4 py-3 mt-6" role="status">{message}</p>}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-8 border-t border-gray-100 pt-6">
            <div className="flex gap-3">
              {activeStep > 0 && <button type="button" onClick={goBack} className="inline-flex items-center gap-1 px-4 py-3 rounded-lg font-semibold text-gray-600 hover:bg-gray-50"><ChevronLeft className="w-4 h-4" />Back</button>}
              {activeStep < steps.length - 1 && <button type="button" onClick={goNext} className="inline-flex items-center gap-1 px-4 py-3 rounded-lg font-semibold text-primary-700 hover:bg-primary-50">Next<ChevronRight className="w-4 h-4" /></button>}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button type="button" disabled={isSaving} onClick={handleSaveForLater} className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50"><Save className="w-5 h-5" />{isSaving ? 'Saving...' : 'Save & Continue Later'}</button>
              {activeStep === steps.length - 1 && <button type="button" disabled={isSaving} onClick={handleSubmitApplication} className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50"><CheckCircle2 className="w-5 h-5" />{isSaving ? 'Submitting...' : 'Submit Application'}</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
