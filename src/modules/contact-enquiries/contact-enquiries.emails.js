const { detailFields } = require('./contact-enquiries.forms');

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

function buildUserEmail({ full_name }) {
  return {
    subject: 'Thank you - Vishw Anjanadham',
    text: `Dear ${full_name},\n\nThank you for reaching out to Vishw Anjanadham. We have received your submission.\n\nRegards,\nVishw Anjanadham Team`,
    html: `<p>Dear ${escapeHtml(full_name)},</p><p>Thank you for reaching out to <strong>Vishw Anjanadham</strong>. We have received your submission.</p><p>Regards,<br>Vishw Anjanadham Team</p>`,
  };
}

function buildAdminEmail(payload, id, submittedAt = new Date()) {
  const formName = { contact: 'Contact inquiry', membership: 'Membership application', volunteer: 'Volunteer application' }[payload.form_type] || 'Contact inquiry';
  const fields = [
    { label: 'Reference', value: id },
    { label: 'Form', value: formName },
    { label: 'Full name', value: payload.full_name },
    { label: 'Email', value: payload.email },
    { label: 'Phone number', value: payload.phone_number },
    { label: 'Inquiry purpose', value: payload.inquiry_purpose },
    ...(payload.details ? detailFields(payload.details) : [{ label: 'Message', value: payload.message }]),
    { label: 'Page URL', value: payload.page_url || 'Not provided' },
    { label: 'Submitted at (IST)', value: submittedAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) },
  ];
  return {
    subject: `New ${formName} - Vishw Anjanadham`,
    text: fields.map(({ label, value }) => `${label}: ${value}`).join('\n\n'),
    html: `<h2>New ${escapeHtml(formName)}</h2><table style="border-collapse:collapse;width:100%;max-width:720px"><tbody>${fields.map(({ label, value }) => `<tr><th scope="row" style="border:1px solid #ddd;padding:12px;text-align:left;vertical-align:top">${escapeHtml(label)}</th><td style="border:1px solid #ddd;padding:12px;vertical-align:top;overflow-wrap:anywhere">${escapeHtml(value).replace(/\r?\n/g, '<br>')}</td></tr>`).join('')}</tbody></table>`,
  };
}

module.exports = { buildUserEmail, buildAdminEmail };
