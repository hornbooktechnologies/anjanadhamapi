const { test } = require('node:test');
const assert = require('node:assert/strict');
const { submitContactEnquiry } = require('../src/modules/contact-enquiries/contact-enquiries.validation');
const { normalizeSubmission } = require('../src/modules/contact-enquiries/contact-enquiries.forms');

const basic = { full_name: 'Test Applicant', phone_number: '+91 98765 43210', email: 'applicant@example.com', page_url: 'https://example.com/volunteer' };
const applications = {
  contact: { ...basic, inquiry_purpose: 'General Campus Visit', message: '<script>Contact</script>' },
  membership: { ...basic, form_type: 'membership', details: { dateOfBirth: '1990-02-28', city: 'Kalol', state: 'Gujarat', occupation: 'Teacher', preferredContact: 'email', membershipCategory: 'seva-member', contributionInterest: 'Education', address: 'Test address', memberConsent: true } },
  volunteer: { ...basic, form_type: 'volunteer', details: { ageGroup: '25-39', city: 'Kalol', state: 'Gujarat', serviceArea: 'education', availability: 'weekends', skills: 'Mentoring', motivation: 'Community service', emergencyContact: '', volunteerConsent: true } },
};

test('all three forms validate; missing consent, invalid choices and malformed dates fail', () => {
  for (const payload of Object.values(applications)) assert.equal(submitContactEnquiry.validate(payload).error, undefined);
  for (const type of ['membership', 'volunteer']) {
    const payload = structuredClone(applications[type]);
    payload.details[type === 'membership' ? 'memberConsent' : 'volunteerConsent'] = false;
    assert.ok(submitContactEnquiry.validate(payload).error);
  }
  for (const dateOfBirth of ['2025-02-30', '2999-01-01']) assert.ok(submitContactEnquiry.validate({ ...applications.membership, details: { ...applications.membership.details, dateOfBirth } }).error);
  assert.ok(submitContactEnquiry.validate({ ...applications.volunteer, details: { ...applications.volunteer.details, serviceArea: 'anything' } }).error);
  assert.ok(submitContactEnquiry.validate({ ...applications.contact, email: 'invalid' }).error);
  assert.ok(submitContactEnquiry.validate({ ...applications.membership, details: undefined }).error);
});

let records = [], migrationCount = 0, createCount = 0, mailFailure = false, failedRecipient = '', capturedMail = [];
const env = require('../src/config/env');
env.mail.adminEmail = 'admin@example.com';
const database = require.resolve('../src/config/database');
require.cache[database] = { id: database, filename: database, loaded: true, exports: { query: async (sql, values = []) => {
  if (sql.includes('CREATE TABLE')) { createCount++; return {}; }
  if (sql.startsWith('SHOW COLUMNS')) return [{ Field: 'id' }];
  if (sql.startsWith('ALTER TABLE')) { migrationCount++; return {}; }
  if (sql.includes('INSERT INTO contact_enquiries')) {
    const [full_name, phone_number, email, inquiry_purpose, message, page_url, email_sent, form_type, details] = values;
    const id = records.length + 1;
    records.push({ id, full_name, phone_number, email, inquiry_purpose, message, page_url, email_sent, form_type, details });
    return { insertId: id };
  }
  if (sql.startsWith('UPDATE contact_enquiries')) { records.find(row => row.id === values[0]).email_sent = 1; return {}; }
  if (sql.startsWith('SELECT COUNT')) return [{ total: records.filter(row => !sql.includes('form_type = ?') || row.form_type === values[0]).length }];
  if (sql.includes('SELECT id, full_name')) return records.filter(row => !sql.includes('form_type = ?') || row.form_type === values[0]).slice(values.at(-1), values.at(-1) + values.at(-2));
  throw new Error('Unexpected SQL: ' + sql);
} } };
const mailer = require.resolve('../src/utils/mailer');
require.cache[mailer] = { id: mailer, filename: mailer, loaded: true, exports: { sendMail: async payload => { capturedMail.push(payload); if (mailFailure || payload.to === failedRecipient) throw new Error('SMTP unavailable'); } } };
const service = require('../src/modules/contact-enquiries/contact-enquiries.service');

test('all forms persist all fields, initialize once, filter types, and retain legacy rows', async () => {
  await Promise.all([service.ensureContactEnquiriesTable(), service.ensureContactEnquiriesTable()]);
  assert.equal(createCount, 1); assert.equal(migrationCount, 1);
  for (const payload of Object.values(applications)) {
    capturedMail = [];
    const validated = submitContactEnquiry.validate(payload).value;
    const saved = await service.createContactEnquiry(validated);
    assert.equal(saved.email_sent, true);
    assert.equal(saved.admin_email_sent, true);
    assert.equal(capturedMail.length, 2);
    const confirmation = capturedMail.find(mail => mail.to === basic.email);
    const admin = capturedMail.find(mail => mail.to === env.mail.adminEmail);
    assert.match(confirmation.text, /Thank you/);
    assert.ok(!confirmation.html.includes('<table'));
    assert.ok(!confirmation.text.includes(saved.message));
    assert.ok(!confirmation.text.includes(saved.inquiry_purpose));
    assert.ok(admin.html.includes('<table'));
    assert.ok(admin.text.includes(payload.email));
    if (payload.details) {
      for (const field of normalizeSubmission({ details: validated.details }).detail_fields) {
        assert.ok(admin.text.includes(`${field.label}: ${field.value}`));
      }
    }
    const row = records.find(record => record.id === saved.id);
    if (payload.details) assert.deepEqual(JSON.parse(row.details), validated.details);
    else {
      assert.equal(row.message, payload.message);
      assert.ok(admin.html.includes('&lt;script&gt;'));
      assert.ok(!admin.html.includes('<script>'));
    }
  }
  const volunteer = await service.getContactEnquiries({ formType: 'volunteer' });
  assert.equal(volunteer.pagination.total, 1);
  assert.equal(volunteer.data[0].form_type, 'volunteer');
  assert.equal(volunteer.data[0].detail_fields.find(field => field.label === 'Preferred service area').value, 'Education and mentoring');
  assert.equal(normalizeSubmission({ message: 'Old inquiry', details: null }).form_type, 'contact');
  assert.equal((await service.getContactEnquiries({ page: 2, limit: 2 })).data.length, 1);
});

test('SMTP failure does not turn a successfully saved inquiry into a failed submission', async () => {
  mailFailure = true;
  const oldError = console.error; console.error = () => {};
  try {
    const result = await service.createContactEnquiry(applications.contact);
    assert.equal(result.email_sent, false);
    assert.equal(result.admin_email_sent, false);
    assert.ok(records.some(row => row.id === result.id));
  } finally { console.error = oldError; mailFailure = false; }
});

test('each recipient is attempted even when the other email fails', async () => {
  const oldError = console.error; console.error = () => {};
  try {
    for (const recipient of [basic.email, env.mail.adminEmail]) {
      capturedMail = []; failedRecipient = recipient;
      const result = await service.createContactEnquiry(applications.contact);
      assert.equal(capturedMail.length, 2);
      assert.equal(result.email_sent, recipient !== basic.email);
      assert.equal(result.admin_email_sent, recipient !== env.mail.adminEmail);
      assert.ok(records.some(row => row.id === result.id));
    }
  } finally { console.error = oldError; failedRecipient = ''; }
});
