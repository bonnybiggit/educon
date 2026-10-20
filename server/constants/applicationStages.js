// Single source of truth for the approved student application progress stages.
// Admins set this value on the student; students can only view it (see studentProfileController.js).
export const APPLICATION_STAGES = [
  { value: 'documents_review', label: 'Documents Review' },
  { value: 'application_submitted', label: 'Application Submitted' },
  { value: 'offer_given', label: 'Offer Given' },
  { value: 'visa_applied', label: 'Visa Applied' },
  { value: 'visa_issued', label: 'Visa Issued' },
];

export const APPLICATION_STAGE_VALUES = APPLICATION_STAGES.map((stage) => stage.value);

export const DEFAULT_APPLICATION_STAGE = APPLICATION_STAGE_VALUES[0];
