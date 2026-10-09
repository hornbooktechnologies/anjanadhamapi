const formPurposes = { membership: 'Membership registration', volunteer: 'Volunteer registration' };
const options = {
  preferredContact: { phone: 'Phone call', whatsapp: 'WhatsApp', email: 'Email' },
  membershipCategory: { 'seva-member': 'Seva Member', 'patron-member': 'Patron Member', 'life-member': 'Life Member / Trustee Circle' },
  ageGroup: { '18-24': '18–24 years', '25-39': '25–39 years', '40-59': '40–59 years', '60-plus': '60 years and above' },
  serviceArea: { education: 'Education and mentoring', events: 'Events and community programs', health: 'Health camps and wellbeing', campus: 'Campus and hostel support', media: 'Digital, media, and communication', outreach: 'Village and community outreach' },
  availability: { weekdays: 'Weekdays', weekends: 'Weekends', 'events-only': 'Specific events only', remote: 'Remote volunteering', flexible: 'Flexible' },
};
const labels = {
  dateOfBirth: 'Date of birth', city: 'City / Town', state: 'State', occupation: 'Occupation',
  preferredContact: 'Preferred contact method', membershipCategory: 'Membership category',
  contributionInterest: 'Contribution interests', address: 'Postal address', memberConsent: 'Consent to membership contact',
  ageGroup: 'Age group', serviceArea: 'Preferred service area', availability: 'Availability',
  skills: 'Skills and relevant experience', motivation: 'Reason for volunteering', emergencyContact: 'Emergency contact number',
  volunteerConsent: 'Consent to volunteer contact',
};

function detailFields(details = {}) {
  return Object.entries(details).filter(([key]) => labels[key]).map(([key, value]) => ({
    label: labels[key], value: typeof value === 'boolean' ? (value ? 'Yes' : 'No') : (options[key]?.[value] || value || 'Not provided'),
  }));
}

function normalizeSubmission(row) {
  let details = row.details || {};
  if (typeof details === 'string') {
    try { details = JSON.parse(details); } catch { details = {}; }
  }
  return { ...row, form_type: row.form_type || 'contact', details, detail_fields: detailFields(details), email_sent: Boolean(row.email_sent) };
}

module.exports = { formPurposes, options, detailFields, normalizeSubmission };
