# Public inquiry and application forms

All three public forms POST to the website's `/api/inquiries` route. That server route forwards to the existing backend `/api/contact-enquiries` endpoint using `API_BASE_URL`, which should end in `/api`.

Submission types are `contact`, `membership`, and `volunteer`. The existing admin inbox at `/global-content/inquiries` displays them and supports type, purpose, search and date filters. Membership and volunteer fields are stored as JSON and displayed with readable labels. CSV export includes the full application summary. Admin dates display in Indian Standard Time.

On the first inbox request, the existing table initializer adds `form_type` and `details` to `contact_enquiries` if needed. Existing records retain their contents and default to `contact`. This upgrade has been applied to the current configured database. No records need to be reimported.

The server validates required fields, supported selections and registration consent. Public forms show a pending state, reject duplicate submissions, retain inputs on errors and reset after a successful save. Browser and API validation errors appear beside their corresponding fields, including custom dropdowns and consent. The first invalid field receives focus, and its message clears when edited. Network and service failures remain visible as form-level errors. A confirmation-email failure does not discard the saved submission; `email_sent` records its result. The inquiry mail connection has bounded timeouts, while other mail flows retain their existing configuration.

## Verification

- Backend: `node --test test/contact-enquiries.test.js` covers all form schemas, invalid dates and consent, storage, filtering, pagination, legacy records, email HTML escaping, and email failure after a save.
- Admin: `node node_modules/react-scripts/bin/react-scripts.js test --watchAll=false --runInBand --runTestsByPath src/pages/GlobalContent/Inquiries/InquiryList.test.js` verifies filtering, rows per page and viewing application details.
- Browser: the isolated verification setup submitted all three forms through the actual Next route and Express validation to the configured MySQL database, tested an invalid membership date and retry, checked duplicate protection and custom-select resets, and submitted the volunteer form at a mobile viewport. SMTP was simulated; outgoing mail delivery was not exercised. Verification records were removed afterwards.
