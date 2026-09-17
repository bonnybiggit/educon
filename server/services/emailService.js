import { Resend } from 'resend';
import { env } from '../config/env.js';
import { AppError } from '../middleware/http.js';

let verificationEmailSender;

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

export const buildVerificationEmail = ({ code, recipientName = 'there' }) => ({
  subject: 'Verify your Universe Consult email',
  html: `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033;max-width:560px;margin:auto;padding:32px 20px">
      <h1 style="color:#123b78;margin:0 0 16px">Universe Educational Consultancy</h1>
      <p>Hello ${escapeHtml(recipientName)},</p>
      <p>Use the verification code below to confirm your email address:</p>
      <p style="font-size:32px;letter-spacing:8px;font-weight:700;color:#123b78;margin:24px 0">${escapeHtml(code)}</p>
      <p>This code expires in 10 minutes and can only be used once.</p>
      <p style="color:#667085;font-size:13px">If you did not request this code, you can safely ignore this email.</p>
    </div>
  `,
  text: `Hello ${recipientName}, your Universe Consult email verification code is ${code}. It expires in 10 minutes and can only be used once.`,
});

export const sendVerificationEmail = async ({ email, code, recipientName }) => {
  if (verificationEmailSender) {
    await verificationEmailSender({ email, code, recipientName });
    return;
  }
  if (!env.resendApiKey) throw new AppError('Email service is not configured', 503);
  const resend = new Resend(env.resendApiKey);
  const message = buildVerificationEmail({ code, recipientName });
  const { error } = await resend.emails.send({
    from: env.emailFrom,
    to: [email],
    subject: message.subject,
    html: message.html,
    text: message.text,
  });
  if (error) throw new AppError('Email delivery failed', 503);
};

export const setVerificationEmailSenderForTests = (sender) => {
  verificationEmailSender = sender;
};
