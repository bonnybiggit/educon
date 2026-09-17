import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Save, Upload } from 'lucide-react';
import Seo from '../components/Seo';
import { universityData } from '../data/universityData';
import { studyDestinationNames } from '../data/studyDestinations';
import { getStudentProfile, updateStudentProfile } from '../services/studentApi';

const stages = [
  'Initial Consultation',
  'Document Preparation',
  'Application Submitted',
  'Document Verification',
  'CAS Letter Processing',
  'Visa Preparation',
];

const emptyForm = {
  dateOfBirth: '',
  passportNumber: '',
  profilePicture: '',
  targetCountry: '',
  targetUniversity: '',
  customUniversity: '',
  highestQualification: '',
  previousInstitution: '',
  cgpa: '',
  courseOfStudy: '',
  intakeSession: '',
  currentStage: '',
};

const fieldClass = 'w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20';

const StudentProfile = () => {
  const [formData, setFormData] = useState(emptyForm);
  const [completion, setCompletion] = useState(null);
  const [student, setStudent] = useState(null);
  const [files, setFiles] = useState({ passport: null, transcripts: null, cv: null });
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
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
  };

  const handleProfilePicture = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFormData((current) => ({ ...current, profilePicture: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleSave = async (event) => {
    event.preventDefault();
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
        return;
      }
      setStudent(result.data?.profile || student);
      setCompletion(result.data?.completion || completion);
      setFiles({ passport: null, transcripts: null, cv: null });
      setMessage(result.data?.completion?.isComplete ? 'Profile completed successfully.' : 'Progress saved. You can continue later.');
    } catch {
      setMessage('Unable to save your profile right now.');
    } finally {
      setIsSaving(false);
    }
  };

  if (status === 'loading') return <div className="min-h-screen bg-gray-50 py-16 px-4 text-center text-gray-600">Loading your profile...</div>;
  if (status === 'error') return <div className="min-h-screen bg-gray-50 py-16 px-4 text-center"><p className="text-red-600">{message}</p><Link to="/dashboard" className="inline-block mt-5 text-primary-600 font-semibold">Back to dashboard</Link></div>;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <Seo title="Complete Your Profile | Universe Consult" description="Complete your private Universe Consult student profile." pathname="/profile" noIndex />
      <div className="max-w-4xl mx-auto">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-primary-600 font-semibold hover:text-primary-800"><ArrowLeft className="w-4 h-4" />Back to dashboard</Link>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mt-8 mb-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary-600">Student profile</p>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mt-2">{completion?.isComplete ? 'Your profile is complete' : 'Complete Your Profile'}</h1>
            <p className="text-gray-600 mt-2">Save your progress and return whenever you are ready.</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-5 py-4 min-w-52">
            <div className="flex items-center justify-between text-sm font-semibold text-gray-700"><span>Completion</span><span>{completion?.percentage || 0}%</span></div>
            <div className="h-2 bg-gray-100 rounded-full mt-3 overflow-hidden"><div className="h-full bg-primary-600 rounded-full transition-all" style={{ width: `${completion?.percentage || 0}%` }} /></div>
            <p className="text-xs text-gray-500 mt-2">{completion?.completedFields || 0} of {completion?.totalFields || 0} required items</p>
          </div>
        </div>

        {completion?.isComplete && <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"><CheckCircle2 className="w-5 h-5" />Your application profile is complete. You can still review and update it below.</div>}

        <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-lg p-6 md:p-8 space-y-8">
          <section>
            <h2 className="text-xl font-bold text-gray-900">Required application information</h2>
            <p className="text-sm text-gray-500 mt-1">These fields contribute to your completion status.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
              <label className="text-sm font-semibold text-gray-700">Date of birth *<input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className={`${fieldClass} mt-2 font-normal`} /></label>
              <label className="text-sm font-semibold text-gray-700">Passport number *<input name="passportNumber" value={formData.passportNumber} onChange={handleChange} className={`${fieldClass} mt-2 font-normal`} /></label>
              <label className="text-sm font-semibold text-gray-700">Target country *<select name="targetCountry" value={formData.targetCountry} onChange={handleChange} className={`${fieldClass} mt-2 font-normal`}><option value="">Select country</option>{studyDestinationNames.map((country) => <option key={country} value={country}>{country}</option>)}</select></label>
              <label className="text-sm font-semibold text-gray-700">Target university *<select name="targetUniversity" value={formData.targetUniversity} onChange={handleChange} className={`${fieldClass} mt-2 font-normal`}><option value="">Select university</option>{(universitiesByCountry[formData.targetCountry] || []).map((university) => <option key={university} value={university}>{university}</option>)}<option value="OTHER">Other</option></select></label>
              {formData.targetUniversity === 'OTHER' && <label className="text-sm font-semibold text-gray-700 md:col-span-2">Custom university *<input name="customUniversity" value={formData.customUniversity} onChange={handleChange} className={`${fieldClass} mt-2 font-normal`} /></label>}
              <label className="text-sm font-semibold text-gray-700">Course of study *<input name="courseOfStudy" value={formData.courseOfStudy} onChange={handleChange} className={`${fieldClass} mt-2 font-normal`} /></label>
              <label className="text-sm font-semibold text-gray-700">Intake session *<select name="intakeSession" value={formData.intakeSession} onChange={handleChange} className={`${fieldClass} mt-2 font-normal`}><option value="">Select intake</option>{['Sept 2026', 'Jan 2027', 'Sept 2027', 'Jan 2028'].map((intake) => <option key={intake} value={intake}>{intake}</option>)}</select></label>
              <label className="text-sm font-semibold text-gray-700">Current stage *<select name="currentStage" value={formData.currentStage} onChange={handleChange} className={`${fieldClass} mt-2 font-normal`}><option value="">Select stage</option>{stages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}</select></label>
            </div>
          </section>

          <section className="border-t border-gray-100 pt-7">
            <h2 className="text-xl font-bold text-gray-900">Optional information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
              <label className="text-sm font-semibold text-gray-700">Profile picture
                <input type="file" accept="image/*" onChange={handleProfilePicture} className="mt-2 block w-full text-sm font-normal text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:font-semibold file:text-primary-700" />
              </label>
              <label className="text-sm font-semibold text-gray-700">Highest qualification<input name="highestQualification" value={formData.highestQualification} onChange={handleChange} className={`${fieldClass} mt-2 font-normal`} /></label>
              <label className="text-sm font-semibold text-gray-700">Previous institution<input name="previousInstitution" value={formData.previousInstitution} onChange={handleChange} className={`${fieldClass} mt-2 font-normal`} /></label>
              <label className="text-sm font-semibold text-gray-700">CGPA<input name="cgpa" value={formData.cgpa} onChange={handleChange} className={`${fieldClass} mt-2 font-normal`} /></label>
            </div>
          </section>

          <section className="border-t border-gray-100 pt-7">
            <h2 className="text-xl font-bold text-gray-900">Documents</h2>
            <p className="text-sm text-gray-500 mt-1">PDF or approved image/document files, up to 5MB each.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
              {[['passport', 'Passport'], ['transcripts', 'Transcript'], ['cv', 'CV / SOP']].map(([field, label]) => <label key={field} className="flex items-center gap-3 rounded-xl border-2 border-dashed border-gray-200 p-4 text-sm font-semibold text-gray-700 cursor-pointer hover:border-primary-400"><Upload className="w-5 h-5 text-primary-600 shrink-0" /><span className="min-w-0"><span className="block">{label} upload</span><span className="block text-xs font-normal text-gray-500 truncate">{files[field]?.name || student?.uploads?.[field] || 'Choose file'}</span></span><input type="file" className="sr-only" accept={field === 'cv' ? '.pdf,.doc,.docx' : 'image/*,.pdf'} onChange={(event) => setFiles((current) => ({ ...current, [field]: event.target.files?.[0] || null }))} /></label>)}
            </div>
          </section>

          {message && <p className="text-sm text-gray-700 rounded-lg bg-gray-50 px-4 py-3" role="status">{message}</p>}
          <div className="flex justify-end"><button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50"><Save className="w-5 h-5" />{isSaving ? 'Saving...' : 'Save Progress'}</button></div>
        </form>
      </div>
    </div>
  );
};

export default StudentProfile;
