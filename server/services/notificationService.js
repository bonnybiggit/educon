import { env } from '../config/env.js';
import { claimNotification, releaseNotification } from '../models/notificationLogModel.js';
import { sendEmail } from './emailService.js';

const PUBLIC_SITE_URL = 'https://universeconsultsedu.com';
const BRAND = 'Universe Consults';

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

// Header/subject values must never carry line breaks.
const singleLine = (value) => String(value ?? '').replace(/[\r\n]+/g, ' ').trim();

const siteUrl = () => (env.frontendUrl || PUBLIC_SITE_URL).replace(/\/+$/, '');

export const formatNotificationTime = (date) => {
  const formatted = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'long', timeStyle: 'short', timeZone: 'Africa/Lagos',
  }).format(date);
  return `${formatted} (WAT, UTC+1)`;
};

const layout = ({ heading, rows, statusLabel, statusColor, ctaUrl, ctaLabel, intro }) => {
  const tableRows = rows.map(([label, value]) => `
        <tr>
          <td style="padding:10px 14px;border-bottom:1px solid #e4e7ec;color:#667085;width:38%;font-size:14px">${escapeHtml(label)}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #e4e7ec;color:#172033;font-size:14px;font-weight:600">${escapeHtml(value)}</td>
        </tr>`).join('');
  return `
    <div style="background:#f4f6fa;padding:24px 12px;font-family:Arial,sans-serif">
      <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e7ec">
        <div style="background:#123b78;padding:22px 28px">
          <a href="${escapeHtml(siteUrl())}" style="color:#ffffff;text-decoration:none;font-size:18px;font-weight:700;letter-spacing:0.5px">${BRAND}</a>
        </div>
        <div style="padding:28px;color:#172033;line-height:1.6">
          <h1 style="margin:0 0 8px;font-size:24px;color:#123b78">${escapeHtml(heading)}</h1>
          <p style="margin:0 0 20px;color:#475467;font-size:14px">${escapeHtml(intro)}</p>
          <p style="margin:0 0 20px"><span style="display:inline-block;background:${statusColor.bg};color:${statusColor.fg};border-radius:999px;padding:6px 14px;font-size:13px;font-weight:700">${escapeHtml(statusLabel)}</span></p>
          <table role="presentation" style="width:100%;border-collapse:collapse;border:1px solid #e4e7ec;border-radius:8px">${tableRows}
          </table>
          <p style="margin:28px 0 8px"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#123b78;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;font-size:14px">${escapeHtml(ctaLabel)}</a></p>
          <p style="margin:0;color:#98a2b3;font-size:12px">Sign-in is required. Only authorised staff can open the admin dashboard.</p>
        </div>
        <div style="background:#f9fafb;padding:16px 28px;color:#98a2b3;font-size:12px">
          ${BRAND} &middot; <a href="${escapeHtml(siteUrl())}" style="color:#98a2b3">${escapeHtml(siteUrl().replace(/^https?:\/\//, ''))}</a>
        </div>
      </div>
    </div>`;
};

// Each notification type maps a plain event payload to an email. New types (applications,
// enquiries, status changes) register here without touching delivery or error handling.
const templates = {
  'student.registered': ({ student, registeredAt }) => {
    const rows = [
      ['Full name', student.fullName || 'Not provided'],
      ['Email', student.email || 'Not provided'],
      ['Country', student.country || 'Not provided'],
      ['Mobile number', [student.countryCode && `+${student.countryCode}`, student.mobileNumber].filter(Boolean).join(' ') || 'Not provided'],
      ['Registered', formatNotificationTime(registeredAt)],
      ['Status', 'Pending Email Verification'],
    ];
    const ctaUrl = `${siteUrl()}/admin/students`;
    return {
      subject: 'New Student Registration | Universe Consults',
      html: layout({
        heading: 'New Student Registration',
        intro: 'A new student has created an account on the Universe Consults website.',
        rows,
        statusLabel: 'Pending Email Verification',
        statusColor: { bg: '#fef0c7', fg: '#93370d' },
        ctaUrl,
        ctaLabel: 'Review in Admin Dashboard',
      }),
      text: [
        'New Student Registration',
        `${BRAND}`,
        '',
        ...rows.map(([label, value]) => `${label}: ${singleLine(value)}`),
        '',
        `Review in the admin dashboard (sign-in required): ${ctaUrl}`,
      ].join('\n'),
    };
  },
};

const SAFE_REPLY_TO = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/;

templates['enquiry.created'] = ({ enquiry, receivedAt }) => {
  const rows = [
    ['Name', enquiry.name],
    ['Email', enquiry.email],
    ['Phone', enquiry.phone || 'Not provided'],
    ['Subject', enquiry.subject || 'Not provided'],
    ['Country', enquiry.country || 'Not provided'],
    ['Education level', enquiry.level || 'Not provided'],
    ['Service', enquiry.service || 'Not provided'],
    ['Message', enquiry.message],
    ['Received', formatNotificationTime(receivedAt)],
  ];
  const ctaUrl = `${siteUrl()}/admin/enquiries`;
  return {
    subject: `New Enquiry from ${singleLine(enquiry.name).slice(0, 80)} | Universe Consults`,
    replyTo: SAFE_REPLY_TO.test(enquiry.email) ? enquiry.email : undefined,
    html: layout({
      heading: 'New Website Enquiry',
      intro: 'A visitor has submitted the contact form on the Universe Consults website. Reply to this email to respond directly.',
      rows,
      statusLabel: 'New',
      statusColor: { bg: '#d1fadf', fg: '#05603a' },
      ctaUrl,
      ctaLabel: 'View in Admin Dashboard',
    }),
    text: [
      'New Website Enquiry',
      BRAND,
      '',
      ...rows.filter(([label]) => label !== 'Message').map(([label, value]) => `${label}: ${singleLine(value)}`),
      '',
      'Message:',
      String(enquiry.message ?? ''),
      '',
      `View in the admin dashboard (sign-in required): ${ctaUrl}`,
    ].join('\n'),
  };
};

export const buildNotificationEmail = (type, payload) => {
  const template = templates[type];
  if (!template) throw new Error(`Unknown notification type: ${type}`);
  return template(payload);
};

// Never throws: notifications are best-effort and must not affect the business operation that triggered them.
// `key` makes delivery idempotent: only the first claim for a key is sent.
export const notifySupport = async (type, payload, key) => {
  let claimed = false;
  try {
    const message = buildNotificationEmail(type, payload);
    if (key) {
      claimed = await claimNotification(key, type);
      if (!claimed) return false;
    }
    await sendEmail({ to: env.supportNotificationEmail, ...message });
    return true;
  } catch (error) {
    // Only the event type and error summary are logged, never the payload.
    console.error('Support notification failed:', { type, error: error?.message || 'unknown error' });
    if (claimed) await releaseNotification(key).catch(() => {});
    return false;
  }
};

export const notifyEnquiryCreated = (enquiry) => notifySupport('enquiry.created', {
  enquiry: {
    name: enquiry.name,
    email: enquiry.email,
    phone: enquiry.phone,
    subject: enquiry.subject,
    country: enquiry.country,
    level: enquiry.level,
    service: enquiry.service,
    message: enquiry.message,
  },
  receivedAt: enquiry.createdAt instanceof Date ? enquiry.createdAt : new Date(),
}, `enquiry.created:${enquiry._id}`);

export const notifyStudentRegistered = (student) => notifySupport('student.registered', {
  student: {
    fullName: student.fullName,
    email: student.email,
    country: student.country,
    countryCode: student.countryCode,
    mobileNumber: student.mobileNumber,
  },
  registeredAt: student.createdAt instanceof Date ? student.createdAt : new Date(),
}, `student.registered:${student._id}`);
