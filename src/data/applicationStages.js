// Single source of truth for the approved student application progress stages.
// Backend allowlist: server/constants/applicationStages.js. Admins set this value;
// students can only view it (see src/pages/Dashboard.jsx and src/admin/pages/AdminStudents.jsx).
export const APPLICATION_STAGES = [
  { value: 'documents_review', label: 'Documents Review', description: 'Your submitted documents are being reviewed.' },
  { value: 'application_submitted', label: 'Application Submitted', description: 'Your application has been submitted to the university.' },
  { value: 'offer_given', label: 'Offer Given', description: 'An offer has been issued for your application.' },
  { value: 'visa_applied', label: 'Visa Applied', description: 'Your visa application has been submitted.' },
  { value: 'visa_issued', label: 'Visa Issued', description: 'Your visa has been issued.' },
];

export const APPLICATION_STAGE_VALUES = APPLICATION_STAGES.map((stage) => stage.value);

// Returns -1 for empty, legacy, or otherwise unrecognized values so callers can safely
// treat them as "not started yet" instead of breaking.
export const getApplicationStageIndex = (value) => APPLICATION_STAGE_VALUES.indexOf(value);

export const getApplicationStageLabel = (value) => APPLICATION_STAGES.find((stage) => stage.value === value)?.label || 'Not started';
