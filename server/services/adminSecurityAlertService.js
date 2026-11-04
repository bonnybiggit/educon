import { env } from '../config/env.js';
import { isNotificationEmailConfigured, sendEmail } from './emailService.js';
import { claimCooldown } from './securityCounterService.js';

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

// Partial address for display only: "jo***@example.com".
export const maskEmail = (email) => {
  const [local = '', domain = ''] = String(email || '').split('@');
  if (!domain) return '';
  return `${local.slice(0, 2)}***@${domain}`;
};

// Coarse network location for logs and alerts: drops the last IPv4 octet / most of an IPv6 address.
export const maskIp = (ip) => {
  const value = String(ip || '').replace(/^::ffff:/i, '');
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) return `${value.split('.').slice(0, 3).join('.')}.x`;
  if (value.includes(':')) return `${value.split(':').filter(Boolean).slice(0, 3).join(':')}::x`;
  return 'unknown';
};

const ALERTS = {
  failed_logins: {
    subject: 'Security alert: repeated failed admin sign-in attempts',
    summary: 'We detected several failed sign-in attempts on your administrator account.',
    advice: 'If this was not you, change your password and use "Sign out everywhere" in Admin Settings. Your account has not been locked and your password has not changed.',
    cooldownSeconds: () => env.adminAlertCooldownSeconds,
  },
  password_changed: {
    subject: 'Security alert: your admin password was changed',
    summary: 'The password for your administrator account was changed. All existing sessions were signed out.',
    advice: 'If you did not do this, contact another administrator immediately and use the password recovery option to regain access.',
    cooldownSeconds: () => 60,
  },
  password_reset: {
    subject: 'Security alert: your admin password was reset',
    summary: 'The password for your administrator account was reset. All existing sessions were signed out.',
    advice: 'If you did not do this, contact another administrator immediately.',
    cooldownSeconds: () => 60,
  },
  email_changed_old: {
    subject: 'Security alert: your admin email address was changed',
    summary: 'The sign-in email for your administrator account was changed. This address will no longer be used to sign in.',
    advice: 'If you did not do this, contact another administrator immediately. All sessions were signed out.',
    cooldownSeconds: () => 60,
  },
  email_changed_new: {
    subject: 'Security notice: this address is now your admin sign-in email',
    summary: 'This email address was set as the sign-in email for a Universe Consult administrator account. All sessions were signed out.',
    advice: 'If you did not expect this, contact another administrator.',
    cooldownSeconds: () => 60,
  },
};

// Builds alert content from fixed text and non-secret facts only. Callers cannot pass free-form text.
export const buildSecurityAlertEmail = (type, { name = 'Administrator', ip = '', attempts = 0, previousEmail = '', newEmail = '' } = {}) => {
  const alert = ALERTS[type];
  if (!alert) throw new Error(`Unknown security alert type: ${type}`);
  const when = `${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC`;
  const facts = [
    ['Time', when],
    ...(ip ? [['Network', maskIp(ip)]] : []),
    ...(attempts ? [['Failed attempts', String(attempts)]] : []),
    ...(previousEmail ? [['Previous email', maskEmail(previousEmail)]] : []),
    ...(newEmail ? [['New email', maskEmail(newEmail)]] : []),
  ];
  return {
    subject: alert.subject,
    html: `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033;max-width:560px;margin:auto;padding:32px 20px">
      <h1 style="color:#123b78;margin:0 0 16px;font-size:20px">Universe Educational Consultancy</h1>
      <p>Hello ${escapeHtml(name)},</p>
      <p>${escapeHtml(alert.summary)}</p>
      <ul style="padding-left:18px">${facts.map(([label, value]) => `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</li>`).join('')}</ul>
      <p>${escapeHtml(alert.advice)}</p>
      <p style="color:#667085;font-size:13px">This is an automated message. We never include passwords, codes or session details in security emails.</p>
    </div>`,
    text: [`Hello ${name},`, alert.summary, ...facts.map(([label, value]) => `${label}: ${value}`), alert.advice].join('\n'),
  };
};

// Fire-and-forget safe: never throws, so authentication and account updates can never fail because of an alert.
export const sendAdminSecurityAlert = async (type, { to, accountId = '', ...facts }) => {
  try {
    if (!env.adminSecurityAlertsEnabled || !to || !isNotificationEmailConfigured()) return false;
    const alert = ALERTS[type];
    if (!alert) return false;
    // The address is part of the key so the old and new address of an email change are throttled independently.
    const allowed = await claimCooldown(`admin-alert:${type}:${accountId || to}:${String(to).toLowerCase()}`, alert.cooldownSeconds() * 1000);
    if (!allowed) return false;
    const message = buildSecurityAlertEmail(type, facts);
    await sendEmail({ to, subject: message.subject, html: message.html, text: message.text });
    return true;
  } catch (error) {
    console.error('Admin security alert not delivered:', { type, reason: error?.message });
    return false;
  }
};

export const buildAdminPasswordResetEmail = ({ code, recipientName = 'there' }) => ({
  subject: 'Your Universe Consult admin password reset code',
  html: `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033;max-width:560px;margin:auto;padding:32px 20px">
      <h1 style="color:#123b78;margin:0 0 16px">Universe Educational Consultancy</h1>
      <p>Hello ${escapeHtml(recipientName)},</p>
      <p>Use this code to set a new password for your administrator account:</p>
      <p style="font-size:32px;letter-spacing:8px;font-weight:700;color:#123b78;margin:24px 0">${escapeHtml(code)}</p>
      <p>This code expires in 10 minutes and can only be used once. Never share it with anyone.</p>
      <p style="color:#667085;font-size:13px">If you did not request this, ignore this email. Your password will not change.</p>
    </div>`,
  text: `Hello ${recipientName}, your Universe Consult admin password reset code is ${code}. It expires in 10 minutes and can only be used once. Never share it. If you did not request this, ignore this email.`,
});

// Delivered to the admin account's own address only; throws on failure so the caller can discard the code.
export const sendAdminPasswordResetEmail = async ({ to, code, recipientName }) => {
  const message = buildAdminPasswordResetEmail({ code, recipientName });
  await sendEmail({ to, subject: message.subject, html: message.html, text: message.text });
};
