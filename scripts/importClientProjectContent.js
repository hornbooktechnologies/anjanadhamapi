/* Refresh existing admin modules from the client-approved content reference.
 * Preview: node scripts/importClientProjectContent.js
 * Apply:   node scripts/importClientProjectContent.js --apply
 * A dated snapshot is saved before changes. Existing records and files are
 * retained; only known demonstration entries are made inactive.
 */
const fs = require("node:fs");
const path = require("node:path");
const { query, pool } = require("../src/config/database");
const facilities = require("../src/modules/facilities/facilities.service");
const members = require("../src/modules/key-members/key-members.service");
const galleries = require("../src/modules/gallery/gallery.service");
const blogs = require("../src/modules/blogs/blogs.service");
const homepage = require("../src/modules/homepage/homepage.service");
const {
  saveEntityTranslations,
  deleteEntityTranslations,
} = require("../src/modules/translations/translations.service");
const { uploadBase64File } = require("../src/utils/fileUpload");
const frontend = path.resolve(__dirname, "../../anjanadham");
const project = JSON.parse(
  fs.readFileSync(
    path.join(frontend, "src/data/client-project-content.json"),
    "utf8",
  ),
);
const workDir = path.resolve(__dirname, "../.agent");
const mediaManifest = path.join(workDir, "project-import-media.json");
let media = fs.existsSync(mediaManifest)
  ? JSON.parse(fs.readFileSync(mediaManifest, "utf8"))
  : {};

async function image(file) {
  if (!file) return null;
  if (media[file]) return media[file];
  const bytes = fs.readFileSync(path.join(frontend, "public", file));
  const mime = file.endsWith(".webp")
    ? "image/webp"
    : file.endsWith(".png")
      ? "image/png"
      : "image/jpeg";
  media[file] = await uploadBase64File(
    `data:${mime};base64,${bytes.toString("base64")}`,
    "project-content",
  );
  fs.writeFileSync(mediaManifest, JSON.stringify(media, null, 2));
  return media[file];
}

async function translate(entity, id, gu) {
  // Previous translations must not resurrect superseded claims.
  await deleteEntityTranslations(entity, id);
  await saveEntityTranslations(entity, id, { gu });
}

async function deactivate(service, rows, titles, nameField, update) {
  for (const row of rows.filter(
    (record) =>
      titles.includes(record[nameField]) && record.status === "active",
  )) {
    await service[update](row.id, { ...row, status: "inactive" });
  }
}

async function main() {
  const tables = [
    "homepage_stats",
    "facilities",
    "key_members",
    "gallery",
    "gallery_images",
    "blogs",
    "media_coverage",
    "content_translations",
  ];
  const snapshot = {};
  for (const table of tables)
    snapshot[table] = await query(`SELECT * FROM ${table}`);
  console.log(
    `Content: ${project.stats.length} campus figures, ${project.facilities.length} facilities, ${project.team.length} panel members, ${project.albums.length} galleries, ${project.blogs.length} articles.`,
  );
  if (!process.argv.includes("--apply")) {
    console.log(
      "Preview complete. Use --apply to update the existing admin records.",
    );
    return;
  }
  fs.mkdirSync(workDir, { recursive: true });
  const backup = path.join(
    workDir,
    `project-content-before-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  fs.writeFileSync(backup, JSON.stringify(snapshot, null, 2));
  console.log(`Backup: ${backup}`);

  const oldStatTitles = [
    "Students Educated",
    "Facilities & Hostels",
    "Community Beneficiaries",
    "Non-Profit 80G",
  ];
  for (const [index, stat] of project.stats.entries()) {
    const prev = snapshot.homepage_stats.find(
      (row) =>
        row.title === stat.label.en || row.title === oldStatTitles[index],
    );
    const data = {
      title: stat.label.en,
      description: stat.description.en,
      value_text: stat.value + stat.suffix,
      icon_url: prev?.icon_url || null,
      icon_alt: stat.label.en,
      sequence: index + 1,
      status: "active",
    };
    const row = prev
      ? await homepage.updateStat(prev.id, data)
      : await homepage.createStat(data);
    await translate("homepage_stats", row.id, {
      title: stat.label.gu,
      description: stat.description.gu,
      value_text: stat.value + stat.suffix,
    });
  }
  for (const [index, facility] of project.facilities.entries()) {
    const prev = snapshot.facilities.find(
      (row) => row.title === facility.title,
    );
    const data = {
      title: facility.title,
      category: facility.category,
      short_description: facility.description,
      description: [facility.description, ...facility.features].join("\n\n"),
      metric: facility.metric,
      image_url: prev?.image_url || (await image(facility.image)),
      image_alt: facility.alt,
      sequence: index + 1,
      status: "active",
    };
    const row = prev
      ? await facilities.updateFacility(prev.id, data)
      : await facilities.createFacility(data);
    await translate("facilities", row.id, {
      title: facility.titleGu,
      short_description: facility.descriptionGu,
      description: [facility.descriptionGu, ...facility.featuresGu].join(
        "\n\n",
      ),
      metric: facility.metricGu,
      image_alt: facility.titleGu,
    });
  }
  const oldMemberNames = [
    "Shree Manibhai Chaudhary",
    "Shree Manishbhai Chaudhary",
  ];
  for (const [index, member] of project.team.entries()) {
    const prev = snapshot.key_members.find(
      (row) =>
        row.name === member.name ||
        (index < 2 && row.name === oldMemberNames[index]),
    );
    const data = {
      name: member.name,
      designation: member.role,
      location: "Vishwa Anjanadham",
      short_description: member.description,
      description: member.description,
      photo_url: member.photo
        ? prev?.photo_url || (await image(member.photo))
        : null,
      photo_alt: member.name,
      sequence: index + 1,
      status: "active",
    };
    const row = prev
      ? await members.updateKeyMember(prev.id, data)
      : await members.createKeyMember(data);
    await translate("key_members", row.id, {
      name: member.nameGu,
      designation: member.roleGu,
      short_description: member.descriptionGu,
      description: member.descriptionGu,
      photo_alt: member.nameGu,
    });
  }
  await deactivate(
    members,
    snapshot.key_members,
    [
      "Shree Shankarlal Chaudhary",
      "Shree Nanjibhai Chaudhary",
      "Shree Rameshbhai Chaudhary",
      "Shree Ramanbhai Chaudhary",
    ],
    "name",
    "updateKeyMember",
  );
  for (const [index, album] of project.albums.entries()) {
    const prev = snapshot.gallery.find((row) => row.title === album.title);
    const data = {
      title: album.title,
      description: album.description,
      is_default: false,
      sequence: index + 1,
      status: "active",
    };
    // On repeat imports keep existing images and their identities/files.
    if (!prev)
      data.images = await Promise.all(
        album.images.map(async ([id, caption], position) => ({
          image_url: await image(`/images/project/${id}.webp`),
          image_alt: caption,
          sequence: position + 1,
        })),
      );
    const row = prev
      ? await galleries.updateGallery(prev.id, data)
      : await galleries.createGallery(data);
    await translate("gallery", row.id, {
      title: album.titleGu,
      description: album.descriptionGu,
    });
  }
  for (const row of snapshot.gallery.filter((record) =>
    [
      "Vishwa Anjanadham Campus & Facilities",
      "Bhoomi Poojan Mahotsav",
    ].includes(record.title),
  )) {
    await galleries.updateGallery(row.id, {
      ...row,
      status: "inactive",
      is_default: false,
    });
  }
  for (const [index, blog] of project.blogs.entries()) {
    const prev = snapshot.blogs.find((row) => row.title === blog.title);
    const data = {
      title: blog.title,
      category: blog.category,
      author: "Vishwa Anjanadham",
      publish_date: null,
      read_time: "3 min read",
      short_description: blog.body,
      description: blog.paragraphs.join("\n\n"),
      image_url: prev?.image_url || (await image(blog.image)),
      image_alt: blog.title,
      sequence: index + 1,
      status: "active",
    };
    const row = prev
      ? await blogs.updateBlog(prev.id, data)
      : await blogs.createBlog(data);
    await translate("blogs", row.id, {
      title: blog.titleGu,
      short_description: blog.bodyGu,
      description: blog.paragraphsGu.join("\n\n"),
      image_alt: blog.titleGu,
    });
  }
  const demoBlogTitles = [
    "Annual Youth Leadership Camp 2025: Inspiring the Next Generation",
    "The Balance of Sanskar and Science in Contemporary Education",
    "Free Medical & Eye Checkup Camp Serves 1,200 Villagers",
    "Building Future Leaders: UPSC & GPSC Study Wing at Campus",
    "Historic Bhoomi Poojan Mahotsav: Foundation of a 300 Crore Campus",
  ];
  await deactivate(
    blogs,
    snapshot.blogs,
    demoBlogTitles,
    "title",
    "updateBlog",
  );
  for (const row of snapshot.media_coverage) {
    if (demoBlogTitles.includes(row.title))
      await query(
        "UPDATE media_coverage SET status = 'inactive' WHERE id = ?",
        [row.id],
      );
    if (row.description?.includes("9 bighas")) {
      await query("UPDATE media_coverage SET description = ? WHERE id = ?", [
        "Published coverage of the proposed education and community campus in Gandhinagar.",
        row.id,
      ]);
      await deleteEntityTranslations("media_coverage", row.id);
    }
    const coverageGu = {
      "Divya Bhaskar": {
        title: "ગાંધીનગરમાં આંખ આંજી દે એવું 300 કરોડનું 'વિશ્વ આંજણાધામ'",
        description:
          "ગાંધીનગરના સૂચિત શૈક્ષણિક અને સામાજિક સંકુલ વિશે દિવ્ય ભાસ્કરનો પ્રકાશિત અહેવાલ.",
      },
      DeshGujarat: {
        title: "ગાંધીનગરમાં ૫ જાન્યુઆરીએ વિશ્વ આંજણાધામનું શિલાન્યાસ",
        description:
          "વિશ્વ આંજણાધામના શિલાન્યાસ કાર્યક્રમ વિશે દેશગુજરાતનો પ્રકાશિત અહેવાલ.",
      },
      "Loktej English": {
        title: "ગાંધીનગરમાં વિશ્વ આંજણાધામની કલ્પના",
        description:
          "શિક્ષણ, કૌશલ્ય વિકાસ અને સમાજ સહયોગ માટેના સૂચિત સંકુલ વિશે લોકતેજનો પ્રકાશિત અહેવાલ.",
      },
    }[row.media_name];
    if (coverageGu && row.status === "active")
      await saveEntityTranslations("media_coverage", row.id, {
        gu: coverageGu,
      });
  }
  console.log(
    "Updated existing admin content; Gujarati translations saved. Known demo entries were retained as inactive.",
  );
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
