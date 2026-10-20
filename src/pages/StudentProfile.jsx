import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  FileCheck2,
  FileText,
  GraduationCap,
  ImagePlus,
  Lock,
  Save,
  ShieldCheck,
  UploadCloud,
  UserRound,
} from 'lucide-react';
import Seo from '../components/Seo';
import { universityData } from '../data/universityData';
import { studyDestinationNames } from '../data/studyDestinations';
import { getApplicationStageLabel } from '../data/applicationStages';
import { getStudentProfile, submitStudentApplication, updateStudentProfile } from '../services/studentApi';
import { usePortal } from '../context/PortalContext';

const intakeSessions = ['Sept 2026', 'Jan 2027', 'Sept 2027', 'Jan 2028'];

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
  { field: 'waec', label: 'WAEC result', description: 'Secondary school examination result', accept: 'image/*,.pdf' },
  { field: 'waecScratchCard', label: 'WAEC scratch card', description: 'Upload an image of the scratch card', accept: 'image/jpeg,image/png,image/webp', imageOnly: true },
  { field: 'degreeCertificate', label: 'Degree certificate', description: 'Certificate for your previous qualification', accept: 'image/*,.pdf' },
  { field: 'transcripts', label: 'Academic transcript', description: 'Official transcript or academic record', accept: 'image/*,.pdf' },
];

const applicationDocumentTypes = [
  { field: 'passport', label: 'International passport', description: 'A clear copy of your passport information page', accept: 'image/*,.pdf' },
  { field: 'cv', label: 'Curriculum vitae', description: 'Your current CV or résumé', accept: '.pdf,.doc,.docx' },
  { field: 'statementOfPurpose', label: 'Statement of purpose', description: 'Your personal statement for your studies', accept: '.pdf,.doc,.docx' },
  { field: 'academicReferenceLetter', label: 'Academic reference letter', description: 'A reference from an academic contact', accept: '.pdf,.doc,.docx,image/*' },
  { field: 'professionalReferenceLetter', label: 'Professional reference letter', description: 'A reference from a professional contact', accept: '.pdf,.doc,.docx,image/*' },
];

const allDocumentTypes = [...academicDocumentTypes, ...applicationDocumentTypes];
const requiredFieldsForSubmit = [
  'dateOfBirth',
  'passportNumber',
  'targetCountry',
  'targetUniversity',
  'courseOfStudy',
  'intakeSession',
  'highestQualification',
  'previousInstitution',
  'cgpa',
];
const requiredUploadsForSubmit = allDocumentTypes.map((doc) => doc.field);

const steps = [
  { key: 'personal', label: 'Personal Information', shortLabel: 'Personal', description: 'Your contact and identity details', icon: UserRound },
  { key: 'academic', label: 'Academic Background', shortLabel: 'Academic', description: 'Your education and study plans', icon: GraduationCap },
  { key: 'documents', label: 'Required Documents', shortLabel: 'Documents', description: 'Upload your supporting documents', icon: FileText },
  { key: 'review', label: 'Review & Submit', shortLabel: 'Review', description: 'Check your application before submitting', icon: FileCheck2 },
];

const inputClassName = (hasError = false) => (
  `mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-4 ${
    hasError
      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100'
      : 'border-slate-200 focus:border-primary-600 focus:ring-primary-100'
  }`
);

const readOnlyClassName = 'mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500';

const FieldError = ({ id, children }) => (
  children ? <span id={id} className="mt-1.5 block text-xs font-medium text-rose-700">{children}</span> : null
);

const FormField = ({ label, name, value, onChange, error, as = 'input', type = 'text', className, children, ...props }) => {
  const Control = as;
  const errorId = `${name}-error`;
  const controlProps = {
    name,
    type: as === 'input' ? type : undefined,
    value,
    onChange,
    className: `${inputClassName(Boolean(error))} ${className || ''}`,
    'aria-invalid': Boolean(error),
    'aria-describedby': error ? errorId : undefined,
    ...props,
  };

  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      {as === 'input' ? <Control {...controlProps} /> : <Control {...controlProps}>{children}</Control>}
      <FieldError id={errorId}>{error}</FieldError>
    </label>
  );
};

const DocumentUploadCard = ({ doc, file, existingFile, error, onChange }) => {
  const inputId = `upload-${doc.field}`;
  const uploadedFile = file?.name || existingFile;

  return (
    <div className={`relative rounded-2xl border bg-white p-4 transition sm:p-5 ${
      error ? 'border-rose-300 shadow-sm shadow-rose-100' : 'border-slate-200 hover:border-primary-200 hover:shadow-md'
    }`}>
      <input
        id={inputId}
        type="file"
        className="peer sr-only"
        accept={doc.accept}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${doc.field}-error` : `${doc.field}-hint`}
        onChange={(event) => onChange(doc.field, event.target.files?.[0] || null, { imageOnly: doc.imageOnly })}
      />
      <label htmlFor={inputId} className="block cursor-pointer">
        <div className="flex items-start gap-3.5">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
            uploadedFile ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-primary-700'
          }`}>
            {uploadedFile
              ? <FileCheck2 className="h-5 w-5" aria-hidden="true" />
              : <UploadCloud className="h-5 w-5" aria-hidden="true" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-slate-900">{doc.label}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">Required</span>
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-slate-500">{doc.description}</span>
          </span>
        </div>
        <span className={`mt-4 flex min-h-11 items-center justify-between gap-3 rounded-xl border border-dashed px-3 py-2.5 ${
          uploadedFile ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-300 bg-slate-50'
        }`}>
          <span className={`truncate text-xs font-semibold ${uploadedFile ? 'text-emerald-800' : 'text-slate-600'}`}>
            {uploadedFile || 'Choose a file to upload'}
          </span>
          <span className="shrink-0 text-xs font-bold text-primary-700">{uploadedFile ? 'Replace' : 'Browse'}</span>
        </span>
        <span id={`${doc.field}-hint`} className="mt-2 block text-[11px] leading-relaxed text-slate-400">
          {doc.imageOnly ? 'JPEG, PNG or WebP image · up to 5MB' : 'PDF or accepted document/image · up to 5MB'}
        </span>
      </label>
      <FieldError id={`${doc.field}-error`}>{error}</FieldError>
    </div>
  );
};

const ReviewGroup = ({ title, onEdit, editLabel, children }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      {onEdit && (
        <button type="button" onClick={onEdit} className="text-xs font-bold text-primary-700 hover:text-primary-900">
          {editLabel || 'Edit'}
        </button>
      )}
    </div>
    {children}
  </section>
);

const ReviewValue = ({ label, value }) => (
  <div className="min-w-0">
    <dt className="text-xs font-medium text-slate-500">{label}</dt>
    <dd className="mt-1 break-words text-sm font-semibold text-slate-800">{value || '—'}</dd>
  </div>
);

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
    setFormData((current) => ({
      ...current,
      ...Object.fromEntries(Object.keys(emptyForm).map((key) => [key, profile[key] || ''])),
    }));
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
    if (formData.targetUniversity === 'OTHER' && !formData.customUniversity.trim()) {
      nextErrors.customUniversity = 'Required';
    }
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
        if (/can no longer be edited|already been submitted/i.test(result.message || '')) {
          setFiles(emptyFiles);
          await loadProfile();
        }
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

  const isSubmitted = Boolean(student?.submittedAt);

  const handleSaveForLater = async () => {
    if (isSubmitted) return;
    await persistProfile('Progress saved. You can continue later.');
  };

  const handleSubmitApplication = async () => {
    if (isSubmitted || isSaving) return;
    const nextErrors = validateForSubmit();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setMessage('Please complete the required fields highlighted below before submitting.');
      const hasPersonalErrors = nextErrors.dateOfBirth || nextErrors.passportNumber;
      const hasAcademicErrors = [
        'targetCountry',
        'targetUniversity',
        'customUniversity',
        'courseOfStudy',
        'intakeSession',
        'highestQualification',
        'previousInstitution',
        'cgpa',
      ].some((field) => nextErrors[field]);
      setActiveStep(hasPersonalErrors ? 0 : hasAcademicErrors ? 1 : 2);
      return;
    }
    const saved = await persistProfile('');
    if (!saved) return;

    setIsSaving(true);
    try {
      const result = await submitStudentApplication();
      if (!result.success) {
        const conflictMessage = result.message || 'Unable to submit your application.';
        if (/already been submitted|changed while it was being submitted/i.test(conflictMessage)) {
          setFiles(emptyFiles);
          await loadProfile();
        }
        setMessage(conflictMessage);
        return;
      }
      setStudent(result.data?.profile || student);
      setCompletion(result.data?.completion || completion);
      await verifySession();
      setMessage('Application submitted successfully.');
    } catch {
      setMessage('Unable to submit your application right now.');
    } finally {
      setIsSaving(false);
    }
  };

  const goNext = () => {
    setMessage('');
    setActiveStep((current) => Math.min(current + 1, steps.length - 1));
  };
  const goBack = () => {
    setMessage('');
    setActiveStep((current) => Math.max(current - 1, 0));
  };
  const goToStep = (index) => {
    setMessage('');
    setActiveStep(index);
  };

  if (status === 'loading') {
    return (
      <main className="min-h-[70vh] bg-slate-50 px-4 py-16 text-center text-slate-600">
        <div className="mx-auto max-w-sm rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-primary-700">
            <GraduationCap className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="mt-4 text-sm font-semibold">Loading your application…</p>
        </div>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main className="min-h-[70vh] bg-slate-50 px-4 py-16 text-center">
        <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <CircleAlert className="mx-auto h-8 w-8 text-rose-600" aria-hidden="true" />
          <p className="mt-3 text-sm text-rose-700" role="alert">{message}</p>
          <Link to="/dashboard" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary-700">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const currentStep = steps[activeStep];
  const StepIcon = currentStep.icon;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <Seo
        title="Complete Your Application | Universe Consult"
        description="Complete your private Universe Consult student application."
        pathname="/profile"
        noIndex
      />
      <div className="mx-auto max-w-5xl">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-primary-700 transition hover:text-primary-900">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Dashboard
        </Link>

        <header className="mt-6 flex flex-col gap-5 sm:mt-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-700">Student application</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              {completion?.isComplete ? 'Your application is complete' : 'Build your study future'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Share your details and documents with our team. You can save your progress and return at any time.
            </p>
          </div>
          <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:w-56">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Application completion</span>
              <span className="text-lg font-bold text-slate-950">{completion?.percentage || 0}%</span>
            </div>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-label="Application completion"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={completion?.percentage || 0}
            >
              <div className="h-full rounded-full bg-gradient-to-r from-primary-700 to-sky-500 transition-all" style={{ width: `${completion?.percentage || 0}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {completion?.completedFields || 0} of {completion?.totalFields || 0} required items
            </p>
          </div>
        </header>

        {isSubmitted && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm text-emerald-900" role="status">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <p>
              Your application was submitted on {new Date(student.submittedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}.
              It can no longer be edited. Your progress stage is updated by our team.
            </p>
          </div>
        )}

        {!isSubmitted && completion?.isComplete && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <p>Your application is complete. Review it on the last step and submit it when you are ready.</p>
          </div>
        )}

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm sm:mt-8">
          <div className="border-b border-slate-100 bg-white px-4 py-5 sm:px-7 sm:py-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.17em] text-primary-700">Guided application</p>
                <p className="mt-1 text-sm text-slate-500">Step {activeStep + 1} of {steps.length}</p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-primary-800">
                {currentStep.shortLabel}
              </span>
            </div>

            <nav aria-label="Application steps">
              <ol className="grid grid-cols-4 gap-2 sm:gap-3">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = index === activeStep;
                  const isComplete = index < activeStep;
                  const hasStepError = index === 0
                    ? Boolean(errors.dateOfBirth || errors.passportNumber)
                    : index === 1
                      ? Boolean(errors.targetCountry || errors.targetUniversity || errors.customUniversity || errors.courseOfStudy || errors.intakeSession || errors.highestQualification || errors.previousInstitution || errors.cgpa)
                      : index === 2 && requiredUploadsForSubmit.some((field) => errors[field]);

                  return (
                    <li key={step.key}>
                      <button
                        type="button"
                        onClick={() => goToStep(index)}
                        aria-current={isActive ? 'step' : undefined}
                        className={`flex min-h-[74px] w-full flex-col items-center justify-center gap-1.5 rounded-xl border px-1.5 py-2 text-center transition sm:min-h-[82px] sm:flex-row sm:justify-start sm:gap-3 sm:px-3 ${
                          isActive
                            ? 'border-primary-700 bg-[#0b1b31] text-white shadow-md shadow-primary-950/10'
                            : hasStepError
                              ? 'border-rose-200 bg-rose-50 text-rose-800'
                              : isComplete
                                ? 'border-blue-100 bg-blue-50/70 text-primary-800'
                                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full sm:h-8 sm:w-8 ${
                          isActive ? 'bg-white/10 text-accent-300' : isComplete ? 'bg-primary-700 text-white' : hasStepError ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {isComplete
                            ? <Check className="h-4 w-4" aria-hidden="true" />
                            : <Icon className="h-4 w-4" aria-hidden="true" />}
                        </span>
                        <span className={`text-[10px] font-bold leading-tight sm:text-xs ${isActive ? 'text-white' : ''}`}>
                          <span className="hidden sm:inline">{step.label}</span>
                          <span className="sm:hidden">{step.shortLabel}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </div>

          <div className="px-4 py-6 sm:px-7 sm:py-8">
            <div className="mb-6 flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-primary-700">
                <StepIcon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-slate-950">{currentStep.label}</h2>
                <p className="mt-1 text-sm text-slate-500">{currentStep.description}</p>
              </div>
            </div>

            <fieldset disabled={isSubmitted} className="m-0 min-w-0 border-0 p-0">
            {activeStep === 0 && (
              <section aria-label="Personal Information" className="space-y-7">
                <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Full name
                    <input value={student?.fullName || ''} disabled className={`${readOnlyClassName} cursor-not-allowed`} />
                  </label>
                  <label className="block text-sm font-semibold text-slate-700">
                    Email address
                    <span className="relative block">
                      <input value={student?.email || ''} disabled className={`${readOnlyClassName} cursor-not-allowed pr-11`} />
                      <Lock className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    </span>
                    <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Verified and read-only
                    </span>
                  </label>

                  <FormField label="WhatsApp number" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} error={errors.mobileNumber} type="tel" />
                  <FormField label="Country" name="country" value={formData.country} onChange={handleChange} error={errors.country} />
                  <FormField label="Date of birth *" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} error={errors.dateOfBirth} type="date" />
                  <FormField label="Passport number *" name="passportNumber" value={formData.passportNumber} onChange={handleChange} error={errors.passportNumber} />
                  <FormField label="Full address" name="fullAddress" value={formData.fullAddress} onChange={handleChange} error={errors.fullAddress} as="textarea" rows={3} placeholder="Street, city, state" />

                  <div className="block text-sm font-semibold text-slate-700">
                    Profile picture
                    <label className="mt-2 flex min-h-[54px] cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-primary-300 hover:bg-blue-50/60">
                      <ImagePlus className="h-5 w-5 shrink-0 text-primary-700" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate">{formData.profilePicture ? 'Profile picture selected' : 'Choose an image'}</span>
                      <input type="file" accept="image/*" className="sr-only" onChange={handleProfilePicture} />
                    </label>
                    <span className="mt-1.5 block text-xs font-normal text-slate-400">Image files only</span>
                  </div>
                </div>
              </section>
            )}

            {activeStep === 1 && (
              <section aria-label="Academic Background" className="space-y-7">
                <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                  <FormField label="Highest qualification *" name="highestQualification" value={formData.highestQualification} onChange={handleChange} error={errors.highestQualification} />
                  <FormField label="Previous institution *" name="previousInstitution" value={formData.previousInstitution} onChange={handleChange} error={errors.previousInstitution} />
                  <FormField label="Course of study *" name="courseOfStudy" value={formData.courseOfStudy} onChange={handleChange} error={errors.courseOfStudy} />
                  <FormField label="CGPA *" name="cgpa" value={formData.cgpa} onChange={handleChange} error={errors.cgpa} />

                  <FormField
                    as="select"
                    label="Target country *"
                    name="targetCountry"
                    value={formData.targetCountry}
                    onChange={handleChange}
                    error={errors.targetCountry}
                  >
                    <option value="">Select country</option>
                    {studyDestinationNames.map((country) => <option key={country} value={country}>{country}</option>)}
                  </FormField>
                  <FormField
                    as="select"
                    label="Target university *"
                    name="targetUniversity"
                    value={formData.targetUniversity}
                    onChange={handleChange}
                    error={errors.targetUniversity}
                  >
                    <option value="">Select university</option>
                    {(universitiesByCountry[formData.targetCountry] || []).map((university) => (
                      <option key={university} value={university}>{university}</option>
                    ))}
                    <option value="OTHER">Other</option>
                  </FormField>
                  {formData.targetUniversity === 'OTHER' && (
                    <FormField
                      label="Custom university *"
                      name="customUniversity"
                      value={formData.customUniversity}
                      onChange={handleChange}
                      error={errors.customUniversity}
                    />
                  )}
                  <FormField
                    as="select"
                    label="Intake session *"
                    name="intakeSession"
                    value={formData.intakeSession}
                    onChange={handleChange}
                    error={errors.intakeSession}
                  >
                    <option value="">Select intake</option>
                    {intakeSessions.map((intake) => <option key={intake} value={intake}>{intake}</option>)}
                  </FormField>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
                    <div className="flex items-start gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-primary-700 shadow-sm">
                        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Current application stage</p>
                        <p className="mt-1 text-sm font-bold text-slate-900">{getApplicationStageLabel(student?.currentStage)}</p>
                        <p className="mt-1 text-xs text-slate-500">Your application stage is updated by an administrator.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeStep === 2 && (
              <section aria-label="Required Documents" className="space-y-8">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary-700" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-bold text-slate-900">Prepare clear, readable copies</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">
                        Each required file must be 5MB or smaller. Accepted formats vary by document; the WAEC scratch card accepts JPEG, PNG, or WebP images only.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-4">
                    <h3 className="text-base font-bold text-slate-900">Academic documents</h3>
                    <p className="mt-1 text-xs text-slate-500">Your educational records and results.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {academicDocumentTypes.map((doc) => (
                      <DocumentUploadCard
                        key={doc.field}
                        doc={doc}
                        file={files[doc.field]}
                        existingFile={student?.uploads?.[doc.field]}
                        error={errors[doc.field]}
                        onChange={handleDocumentFile}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-4">
                    <h3 className="text-base font-bold text-slate-900">Application documents</h3>
                    <p className="mt-1 text-xs text-slate-500">Identity, personal statements, and references.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {applicationDocumentTypes.map((doc) => (
                      <DocumentUploadCard
                        key={doc.field}
                        doc={doc}
                        file={files[doc.field]}
                        existingFile={student?.uploads?.[doc.field]}
                        error={errors[doc.field]}
                        onChange={handleDocumentFile}
                      />
                    ))}
                  </div>
                </div>
              </section>
            )}

            {activeStep === 3 && (
              <section aria-label="Review and submit" className="space-y-4">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary-700" aria-hidden="true" />
                    <p className="text-sm leading-relaxed text-slate-700">
                      Review your information before submitting. Required missing fields or documents will be highlighted so you can return to the right step.
                    </p>
                  </div>
                </div>

                <ReviewGroup title="Personal information" onEdit={() => goToStep(0)}>
                  <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                    <ReviewValue label="Full name" value={student?.fullName} />
                    <ReviewValue label="Email address" value={student?.email} />
                    <ReviewValue label="WhatsApp number" value={formData.mobileNumber} />
                    <ReviewValue label="Country" value={formData.country} />
                    <ReviewValue label="Full address" value={formData.fullAddress} />
                    <ReviewValue label="Date of birth" value={formData.dateOfBirth} />
                    <ReviewValue label="Passport number" value={formData.passportNumber} />
                  </dl>
                </ReviewGroup>

                <ReviewGroup title="Academic background" onEdit={() => goToStep(1)}>
                  <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                    <ReviewValue label="Highest qualification" value={formData.highestQualification} />
                    <ReviewValue label="Previous institution" value={formData.previousInstitution} />
                    <ReviewValue label="Course of study" value={formData.courseOfStudy} />
                    <ReviewValue label="CGPA" value={formData.cgpa} />
                    <ReviewValue label="Target country" value={formData.targetCountry} />
                    <ReviewValue
                      label="Target university"
                      value={formData.targetUniversity === 'OTHER' ? formData.customUniversity : formData.targetUniversity}
                    />
                    <ReviewValue label="Intake session" value={formData.intakeSession} />
                    <ReviewValue label="Current stage" value={getApplicationStageLabel(student?.currentStage)} />
                  </dl>
                </ReviewGroup>

                <ReviewGroup title="Required documents" onEdit={() => goToStep(2)}>
                  <ul className="mt-3 divide-y divide-slate-100">
                    {allDocumentTypes.map((doc) => {
                      const uploaded = files[doc.field]?.name || student?.uploads?.[doc.field];
                      const missing = !uploaded;
                      return (
                        <li key={doc.field} className="flex items-center justify-between gap-3 py-3">
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-slate-800">{doc.label}</span>
                            {uploaded && <span className="mt-0.5 block truncate text-xs text-slate-500">{uploaded}</span>}
                          </span>
                          <span className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-bold ${missing ? 'text-amber-700' : 'text-emerald-700'}`}>
                            {missing
                              ? <><CircleAlert className="h-4 w-4" aria-hidden="true" /> Required</>
                              : <><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Ready</>}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </ReviewGroup>
              </section>
            )}
            </fieldset>

            {message && (
              <div className={`mt-6 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${
                message.includes('successfully') || message.includes('saved.')
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-amber-200 bg-amber-50 text-amber-900'
              }`} role="status" aria-live="polite">
                {message.includes('successfully') || message.includes('saved.')
                  ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
                <span>{message}</span>
              </div>
            )}

            <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center justify-between gap-2 sm:justify-start">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={activeStep === 0 || isSaving}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Back
                </button>
                <button
                  type="button"
                  disabled={isSaving || isSubmitted}
                  onClick={handleSaveForLater}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 sm:px-4"
                >
                  <Save className="h-4 w-4" aria-hidden="true" />
                  {isSaving ? 'Saving…' : 'Save for later'}
                </button>
              </div>

              {activeStep < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={isSaving}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0b1b31] px-5 text-sm font-bold text-white shadow-md transition hover:bg-primary-900 focus:outline-none focus:ring-4 focus:ring-primary-100 disabled:opacity-50"
                >
                  Continue <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSaving || isSubmitted}
                  onClick={handleSubmitApplication}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent-400 px-5 text-sm font-bold text-[#13243a] shadow-md transition hover:bg-accent-300 focus:outline-none focus:ring-4 focus:ring-amber-100 disabled:opacity-50"
                >
                  {isSubmitted ? 'Application submitted' : isSaving ? 'Submitting…' : 'Submit application'}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </section>

        <p className="mt-5 text-center text-xs leading-relaxed text-slate-400">
          Your application information is securely handled by Universe Consults.
        </p>
      </div>
    </main>
  );
};

export default StudentProfile;
