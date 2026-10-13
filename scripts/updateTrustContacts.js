const { transaction, pool } = require('../src/config/database');
const contact = require('../src/config/trustContact');

async function updateTrustContacts() {
  return transaction(async connection => {
    const [records] = await connection.execute('SELECT id FROM contact_details LIMIT 1 FOR UPDATE');
    if (records.length) {
      await connection.execute('UPDATE contact_details SET phone = ?, email = ? WHERE id = ?', [contact.phone, contact.baseEmail, records[0].id]);
    } else {
      await connection.execute('INSERT INTO contact_details (phone, email, address, footer_description) VALUES (?, ?, ?, ?)', [
        contact.phone, contact.baseEmail,
        'Anjana Dham, Highway, near Ahmedabad-Mehsana, Kalol, Jamyatpura, Adalaj, Gujarat 382423',
        'Dedicated to education, values, student welfare, and community service. Empowering youth with cultural grounding, modern learning, and practical support for social progress.',
      ]);
    }
    const [links] = await connection.execute("SELECT id, url FROM social_links WHERE LOWER(TRIM(platform_name)) = 'whatsapp' FOR UPDATE");
    if (links.length) {
      for (const link of links) {
        let url = contact.whatsappUrl;
        try {
          const previous = new URL(link.url);
          const next = new URL(contact.whatsappUrl);
          if (previous.search) next.search = previous.search;
          if (next.searchParams.has('phone')) next.searchParams.set('phone', contact.phone.replace(/\D/g, ''));
          url = next.href;
        } catch { /* Use the trust's default WhatsApp message for invalid URLs. */ }
        await connection.execute('UPDATE social_links SET url = ? WHERE id = ?', [url, link.id]);
      }
    } else {
      const [sequence] = await connection.execute('SELECT COALESCE(MAX(sequence), 0) + 1 AS next_sequence FROM social_links');
      await connection.execute('INSERT INTO social_links (platform_name, icon_url, url, alt_text, sequence, status) VALUES (?, ?, ?, ?, ?, ?)', [
        'WhatsApp', '', contact.whatsappUrl, 'Chat with Vishwa Anjanadham on WhatsApp', Math.max(4, sequence[0].next_sequence), 'active',
      ]);
    }
    return { contactUpdated: true, whatsappUpdated: true };
  });
}

if (require.main === module) {
  updateTrustContacts().then(result => console.log(JSON.stringify(result)))
    .catch(error => { console.error('Unable to update trust contacts:', error.code || error.message); process.exitCode = 1; })
    .finally(() => pool.end());
}
module.exports = { updateTrustContacts };
