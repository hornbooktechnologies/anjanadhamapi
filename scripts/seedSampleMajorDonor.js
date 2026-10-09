const { pool } = require('../src/config/database');
const { getDonors, saveDonor } = require('../src/modules/donors/donors.service');

const sample = {
  name: 'Shree Devendra Chaudhary (Sample)',
  location: 'Mumbai, Maharashtra',
  amount: 110000000,
  initiative: 'Campus Development',
  contribution_date: '2026-09-15',
  photo_url: 'https://anjanadham.vercel.app/images/donors/sample-donor-1.webp',
  photo_alt: 'Fictional sample portrait of Devendra Chaudhary for demonstration.',
  status: 'active',
  translations: {
    gu: {
      name: 'શ્રી દેવેન્દ્ર ચૌધરી (નમૂનો)',
      location: 'મુંબઈ, મહારાષ્ટ્ર',
      initiative: 'કેમ્પસ વિકાસ',
      photo_alt: 'પ્રદર્શન માટે દેવેન્દ્ર ચૌધરીનું કાલ્પનિક નમૂના ચિત્ર.',
    },
    hi: {
      name: 'श्री देवेन्द्र चौधरी (नमूना)',
      location: 'मुंबई, महाराष्ट्र',
      initiative: 'परिसर विकास',
      photo_alt: 'प्रदर्शन के लिए देवेन्द्र चौधरी का काल्पनिक नमूना चित्र।',
    },
  },
};

async function main() {
  const matches = (await getDonors({ search: sample.name })).filter(donor => donor.name === sample.name);
  if (matches.length > 1 || (matches.length === 1 && matches[0].photo_alt !== sample.photo_alt)) {
    throw new Error('A conflicting donor record exists. No donor was changed.');
  }
  const donor = await saveDonor(matches[0]?.id ?? null, sample);
  console.log(JSON.stringify({ id: donor.id, name: donor.name, amount: donor.amount, contribution_date: donor.contribution_date, status: donor.status }));
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => pool.end());
