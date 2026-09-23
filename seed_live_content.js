const db = require('./src/config/database');

async function seed() {
  console.log('Starting seed process from live https://anjanadham.vercel.app/ content...');

  try {
    // 1. Homepage Banners
    console.log('\n1. Seeding homepage_banners...');
    await db.query('DELETE FROM homepage_banners');
    const banners = [
      {
        title: 'Vishwa Anjanadham Campus',
        file_url: 'https://anjanadham.vercel.app/images/home-new/homepage1.png',
        alt_text: 'Vishwa Anjanadham grand campus banner with central building and landscaped garden view.',
        sequence: 1,
        status: 'active'
      },
      {
        title: 'Bhoomi Poojan Mahotsav',
        file_url: 'https://anjanadham.vercel.app/images/home-new/bhoomipoojan1.png',
        alt_text: 'Vishwa Anjanadham homepage banner image showcasing the campus and community vision.',
        sequence: 2,
        status: 'active'
      },
      {
        title: 'Foundation & Milestones',
        file_url: 'https://anjanadham.vercel.app/images/home-new/bhumipoojan.png',
        alt_text: 'Vishwa Anjanadham banner image featuring the campus and community activities.',
        sequence: 3,
        status: 'active'
      },
      {
        title: 'Education & Community Vision',
        file_url: 'https://anjanadham.vercel.app/images/home-new/homepage-4.jpg',
        alt_text: 'Vishwa Anjanadham campus banner highlighting the community mission and modern facilities.',
        sequence: 4,
        status: 'active'
      }
    ];

    for (const b of banners) {
      await db.query(
        'INSERT INTO homepage_banners (title, file_url, alt_text, sequence, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        [b.title, b.file_url, b.alt_text, b.sequence, b.status]
      );
    }
    console.log(`Inserted ${banners.length} homepage banners.`);

    // 2. Homepage Stats / Value Strip
    console.log('\n2. Seeding homepage_stats...');
    await db.query('DELETE FROM homepage_stats');
    const stats = [
      {
        value_text: '5,000 +',
        title: 'Students Educated',
        description: 'Education & Boarding',
        sequence: 1,
        status: 'active'
      },
      {
        value_text: '25 +',
        title: 'Facilities & Hostels',
        description: 'Across Campus Complex',
        sequence: 2,
        status: 'active'
      },
      {
        value_text: '1,00,000 +',
        title: 'Community Beneficiaries',
        description: 'Health, Food & Relief Camps',
        sequence: 3,
        status: 'active'
      },
      {
        value_text: '100 %',
        title: 'Non-Profit 80G',
        description: 'Tax-Exempt Contributions',
        sequence: 4,
        status: 'active'
      }
    ];

    for (const s of stats) {
      await db.query(
        'INSERT INTO homepage_stats (value_text, title, description, sequence, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        [s.value_text, s.title, s.description, s.sequence, s.status]
      );
    }
    console.log(`Inserted ${stats.length} homepage stats.`);

    // 3. Media Coverage
    console.log('\n3. Seeding media_coverage...');
    await db.query('DELETE FROM media_coverage');
    const mediaCoverages = [
      {
        title: "ગાંધીનગરમાં આંખ આંજી દે એવું 300 કરોડનું 'વિશ્વ આંજણાધામ'",
        description: "ચૌધરી સમાજના 2500થી વધુ વિદ્યાર્થીને સમાવતું 13 માળનું ભવન, AI કોમ્પ્યુટર લેબથી માંડીને જિમની સુવિધાઓ આપશે.",
        media_type: 'image',
        media_url: 'https://images.bhaskarassets.com/thumb/1200x900/web2images/960/2026/01/09/comp-11_1767969145.gif',
        media_name: 'Divya Bhaskar',
        media_link: 'https://www.divyabhaskar.co.in/local/gujarat/gandhinagar/news/a-stunning-rs-300-crore-vishva-anjanadham-in-gandhinagar-136902140.html',
        sequence: 1,
        status: 'active'
      },
      {
        title: 'Foundation stone of Rs. 300 crore Vishwa Anjana Dham to be laid on Jan 5 in Gandhinagar',
        description: 'The foundation stone laying ceremony (Bhoomi Pujan) of the Vishwa Anjana Dham, a grand educational and cultural complex in Gandhinagar.',
        media_type: 'image',
        media_url: 'https://pbs.twimg.com/media/GgXg4q-WIAAXXNs?format=jpg&name=large',
        media_name: 'DeshGujarat',
        media_link: 'https://deshgujarat.com/2025/01/03/foundation-stone-of-rs-300-crore-vishwa-anjana-dham-to-be-laid-on-jan-5-in-gandhinagar/',
        sequence: 2,
        status: 'active'
      },
      {
        title: "Gujarat's Gandhinagar to Host World-Class Anjana Dham",
        description: 'A state-of-the-art campus aiming to provide high quality education, skill development, and community support in Gandhinagar, Gujarat.',
        media_type: 'image',
        media_url: 'https://english.loktej.com/media/c876x438/2024-05/k11052024-04.jpg',
        media_name: 'Loktej English',
        media_link: 'https://english.loktej.com/article/11813/gujarats-gandhinagar-to-host-world-class-anjana-dham',
        sequence: 3,
        status: 'active'
      },
      {
        title: 'Annual Youth Leadership Camp 2025: Inspiring the Next Generation',
        description: 'Inspiring youth leadership summit featuring mentors, skill workshops, and community leadership guidance.',
        media_type: 'image',
        media_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAKHLjOQtpFEF2coLd51Ep1om6SxuBwYpZd8A4D4d6gsQMNRKBDEzBeUvuBuV-JlJBKp42SMYYyVVj532_oIv3v3gy1nFoyQbuX3JEVNzHj2aQsxEAttwcfRAdmuhj7-6S7XD0RwAxx4akJQqmIa3U8d3S-SkA2QyFNwvhY97kTUeiGo5oY4sWol0BtU02vdQ2_kYbt2XCPQEmvoPKpI3w9Fo4-QjAk3zSv52ugg5nAtm5WyqmPG1GcGw',
        media_name: 'Community News',
        media_link: 'https://anjanadham.vercel.app/',
        sequence: 4,
        status: 'active'
      },
      {
        title: 'The Balance of Sanskar and Science in Contemporary Education',
        description: 'Integrating cultural values and modern scientific education with robotic labs, digital classrooms, and traditional ethos.',
        media_type: 'image',
        media_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuASVMu1NhAxvPa0uDYH_EEJ0y4Twvd3p_wwMN7MYw3VCLh7OJ5x_40oQvp_qtsnmlqMf6l9ZjYdjJ14539uEMmxhfznCZU7W2dzF8aWhWflKXfqzMJF2XxWJYze3V3TPq2IPD-mH4T3WU0TWREH1xL5-R5WzNJklrb373GUh15tiORqfvijJ_vzJ15YWsZrR8xNIq5zwM9YmANiiT1nCibxxSa6qtWah9uXpqkEvPWuz79obccJ6bJguw',
        media_name: 'Education Digest',
        media_link: 'https://anjanadham.vercel.app/',
        sequence: 5,
        status: 'active'
      },
      {
        title: 'Free Medical & Eye Checkup Camp Serves 1,200 Villagers',
        description: 'Community health initiative offering comprehensive checkups, optical aid, and medicine distribution for villagers.',
        media_type: 'image',
        media_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBPmaS6zdU0rkRt2FvQcoEKzWPvByqShMd7UjKYqwGxx2Bet7cVi5a4vwLOBKhL0oYyF1L0EGWbtoskD7ZnLAoyfPeZT-1Li8j7mlseYMsEbnFL6TEligZMzp9uozc-wM33JSQaxOFGnG9uvzRCy0UMvZtgnhRVJZHUJpwEVgBFGBSf9oMdjxQ84LRlTs4F5iFbSp98SJzORlH02Q1OenvkDYHizU_mBnpFFsuYBGwnjPLcMbb_QMmU3Q',
        media_name: 'Health & Seva',
        media_link: 'https://anjanadham.vercel.app/',
        sequence: 6,
        status: 'active'
      }
    ];

    for (const m of mediaCoverages) {
      await db.query(
        'INSERT INTO media_coverage (title, description, media_type, media_url, media_name, media_link, sequence, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [m.title, m.description, m.media_type, m.media_url, m.media_name, m.media_link, m.sequence, m.status]
      );
    }
    console.log(`Inserted ${mediaCoverages.length} media coverage articles.`);

    // 4. Photo Gallery & Images
    console.log('\n4. Seeding gallery and gallery_images...');
    await db.query('DELETE FROM gallery_images');
    await db.query('DELETE FROM gallery');

    // Album 1: Vishwa Anjanadham Campus & Facilities
    const res1 = await db.query(
      'INSERT INTO gallery (title, description, is_default, sequence, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      ['Vishwa Anjanadham Campus & Facilities', 'State-of-the-art campus facilities, hostel wings, laboratories, and sports grounds.', 1, 1, 'active']
    );
    const gallery1Id = res1.insertId;

    const campusImages = [
      { url: 'https://anjanadham.vercel.app/images/home-new/homepage1.png', alt: 'Vishwa Anjanadham Main Grand Building' },
      { url: 'https://anjanadham.vercel.app/images/home-new/facilities/sports-sankul.png', alt: 'Sports Complex & Athletic Grounds' },
      { url: 'https://anjanadham.vercel.app/images/home-new/facilities/library.png', alt: 'Digital & Central Library' },
      { url: 'https://anjanadham.vercel.app/images/home-new/facilities/computer-lab.png', alt: 'High-tech AI Computer Lab' },
      { url: 'https://anjanadham.vercel.app/images/home-new/facilities/dining-hall.png', alt: 'Spacious Dining Hall & Kitchen' },
      { url: 'https://anjanadham.vercel.app/images/home-new/facilities/community-hall.png', alt: 'Community Center & Auditorium' },
      { url: 'https://anjanadham.vercel.app/images/home-new/facilities/sanskar-kendra.jpeg', alt: 'Sanskar Kendra & Meditation Area' },
      { url: 'https://anjanadham.vercel.app/images/home-new/facilities/kanya-chhatralay.png', alt: 'Kanya Chhatralay (Girls Hostel)' },
      { url: 'https://anjanadham.vercel.app/images/home-new/facilities/kumar-chhatralay.png', alt: 'Kumar Chhatralay (Boys Hostel)' },
      { url: 'https://anjanadham.vercel.app/images/home-new/facilities/upsc-gpsc-other.png', alt: 'UPSC & GPSC Competitive Study Wing' }
    ];

    for (let i = 0; i < campusImages.length; i++) {
      await db.query(
        'INSERT INTO gallery_images (gallery_id, image_url, image_alt, sequence, created_at) VALUES (?, ?, ?, ?, NOW())',
        [gallery1Id, campusImages[i].url, campusImages[i].alt, i + 1]
      );
    }

    // Album 2: Bhoomi Poojan Mahotsav
    const res2 = await db.query(
      'INSERT INTO gallery (title, description, is_default, sequence, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      ['Bhoomi Poojan Mahotsav', 'Auspicious foundation ceremony and historic gathering of the community leaders and dignitaries.', 0, 2, 'active']
    );
    const gallery2Id = res2.insertId;

    const bhoomiImages = [
      { url: 'https://anjanadham.vercel.app/images/home-new/bhoomipoojan1.png', alt: 'Bhoomi Poojan Stage & Gathering' },
      { url: 'https://anjanadham.vercel.app/images/home-new/bhumipoojan.png', alt: 'Vishwa Anjanadham Bhoomi Poojan Rituals' },
      { url: 'https://anjanadham.vercel.app/images/home-new/about-us-1.png', alt: 'Community Leaders & Blessings' }
    ];

    for (let i = 0; i < bhoomiImages.length; i++) {
      await db.query(
        'INSERT INTO gallery_images (gallery_id, image_url, image_alt, sequence, created_at) VALUES (?, ?, ?, ?, NOW())',
        [gallery2Id, bhoomiImages[i].url, bhoomiImages[i].alt, i + 1]
      );
    }
    console.log(`Inserted 2 photo galleries with total ${campusImages.length + bhoomiImages.length} images.`);

    // 5. Video Gallery
    console.log('\n5. Seeding gallery_videos...');
    await db.query('DELETE FROM gallery_videos');
    const videos = [
      {
        title: 'Vishwa Anjanadham 3D Walkthrough & Project Overview',
        description: 'Explore the grand 300 crore educational campus design, featuring 13-story towers, sports arenas, and academic wings in Gandhinagar.',
        video_url: 'https://www.youtube.com/watch?v=ScMzIvxBSi4',
        thumbnail_url: 'https://anjanadham.vercel.app/images/home-new/homepage1.png',
        sequence: 1,
        status: 'active'
      },
      {
        title: 'Bhoomi Poojan Mahotsav Ceremony Highlights',
        description: 'Key highlights and speeches from the foundation stone laying ceremony of Vishwa Anjanadham.',
        video_url: 'https://www.youtube.com/watch?v=ScMzIvxBSi4',
        thumbnail_url: 'https://anjanadham.vercel.app/images/home-new/bhoomipoojan1.png',
        sequence: 2,
        status: 'active'
      },
      {
        title: 'Empowering Student Success - Facilities & Amenities',
        description: 'A detailed look at the student hostel rooms, AI computer lab, sports training, and dining facilities.',
        video_url: 'https://www.youtube.com/watch?v=ScMzIvxBSi4',
        thumbnail_url: 'https://anjanadham.vercel.app/images/home-new/facilities/computer-lab.png',
        sequence: 3,
        status: 'active'
      }
    ];

    for (const v of videos) {
      await db.query(
        'INSERT INTO gallery_videos (title, description, video_url, thumbnail_url, sequence, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [v.title, v.description, v.video_url, v.thumbnail_url, v.sequence, v.status]
      );
    }
    console.log(`Inserted ${videos.length} video gallery items.`);

    console.log('\nAll content successfully seeded and ready in Admin Panel!');
  } catch (err) {
    console.error('Error during seeding:', err);
  } finally {
    process.exit();
  }
}

seed();
