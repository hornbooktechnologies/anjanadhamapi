const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { query: rawQuery, pool } = require("../src/config/database");
const { getUploadRootDir } = require("../src/utils/uploadStorage");

const frontendPublicDir = path.resolve(__dirname, "../../GDB-Circular-Front/public");
const uploadsDir = getUploadRootDir();
const RETRYABLE_DB_ERRORS = new Set(["EAI_AGAIN", "ENOTFOUND", "ECONNRESET", "PROTOCOL_CONNECTION_LOST"]);

const DEFAULT_HERO_TITLE = "Engineering The\nFuture Of\nCircular Plastics";

const pageBanners = [
  {
    page: "home",
    title: DEFAULT_HERO_TITLE,
    file_path: "asset/home/videos/Hero - Resin Slow-Mo_compressed.MP4",
    alt_text: "GDB Circular homepage hero",
  },
  {
    page: "about-us",
    title: "About GDB Circular",
    file_path: "figma-assets/aboutus/hero.png",
    alt_text: "About GDB Circular hero",
  },
  {
    page: "products",
    title: "Built for Buyers. Trusted by Suppliers.",
    file_path: "figma-assets/products-hero.webp",
    alt_text: "PCR resin products hero",
  },
  {
    page: "seller",
    title: "Turn Your Plastic Scrap into a Reliable Revenue Stream",
    file_path: "figma-assets/seller/seller-hero-figma.webp",
    alt_text: "Seller page hero",
  },
  {
    page: "teams",
    title: "Circular Team",
    file_path: "figma-assets/team/team-hero.webp",
    alt_text: "Circular Team hero",
  },
  {
    page: "facilities",
    title: "Built Across Strategic Recycling Regions",
    file_path: "figma-assets/facilities_hero.jpg",
    alt_text: "Facilities page hero",
  },
  {
    page: "news-events",
    title: "News & Updates from GDB Circular",
    file_path: "figma-assets/news/main.png",
    alt_text: "News and updates hero",
  },
];

const homeStats = [
  {
    title: "Annual Processing Capacity (MTPA)",
    value_text: "55,000+",
    icon_alt: "Annual Processing Capacity",
    icon_path: "asset/home/images/Annual Processing Capacity.png",
    sequence: 1,
  },
  {
    title: "Years in Recycling",
    value_text: "33+",
    icon_alt: "Years in Recycling",
    icon_path: "asset/home/images/Years in Recycling.png",
    sequence: 2,
  },
  {
    title: "US Recycling Facilities",
    value_text: "8+",
    icon_alt: "US Recycling Facilities",
    icon_path: "asset/home/images/US Recycling Facilities.png",
    sequence: 3,
  },
];

const processSection = {
  section_title: "From Polymer Scrap to Spec-Grade Resin",
  section_description:
    "Four integrated steps - from post-consumer scrap collection to film-grade pellets ready for your production line.",
};

const processSteps = [
  {
    step_title: "Responsible Collection Of Plastic Scrap",
    step_description:
      "GDB aggregates millions of pounds of post-consumer plastic scrap annually from generators across the US and transports it to our processing facilities under documented chain of custody.",
    file_path: "figma-assets/process-collection.jpg",
    alt_text: "Responsible collection of plastic scrap",
    sequence: 1,
  },
  {
    step_title: "Precision Sorting by Polymer and End-Use",
    step_description:
      "AI-enabled NIR and RGB optical sorters separate polyolefin streams by resin type, color, and contamination level.",
    file_path: "figma-assets/process-sorting.jpg",
    alt_text: "Precision sorting by polymer and end-use",
    sequence: 2,
  },
  {
    step_title: "Food-grade Conversion Standards",
    step_description:
      "Extrusion lines use fine melt filtration, vacuum degassing, and deodorizing to support food-grade standards and odor-sensitive applications.",
    file_path: "figma-assets/process-conversion.jpg",
    alt_text: "Food-grade conversion standards",
    sequence: 3,
  },
  {
    step_title: "End-to-End Quality Assurance",
    step_description:
      "Every lot is tracked from feedstock intake through post-blend verification and released after in-house lab testing with full batch traceability.",
    file_path: "figma-assets/process-quality.jpg",
    alt_text: "End-to-end quality assurance",
    sequence: 4,
  },
];

const whyChooseSection = {
  section_title: "Built for the Demands of Modern Circular Supply",
  section_description:
    "Consistent PCR volume, food-grade quality standards, and full compliance documentation - designed for the EPR era.",
};

const whyChooseCards = [
  {
    card_title: "EPR & Compliance Ready",
    card_description:
      "Lot-level traceability, verified recycled content documentation, and supply chain data to support EPR reporting obligations.",
    file_path: "asset/home/videos/Why Choose Us - National Network - Tennessee Flyover.mp4",
    alt_text: "EPR and compliance ready",
    sequence: 1,
  },
  {
    card_title: "Food-Grade Processing Standards",
    card_description:
      "Systems designed for contamination control, deodorizing, and brand-ready recycled resin applications.",
    file_path: "asset/home/videos/Why Choose Us - Technology - Tennessee Shredder.mp4",
    alt_text: "Food-grade processing standards",
    sequence: 2,
  },
  {
    card_title: "Consistent Batch Quality",
    card_description:
      "Lab-tested material performance and repeatable resin specifications across production runs.",
    file_path: "asset/home/videos/Why Choose Us - Technology - Tennessee Shredder.mp4",
    alt_text: "Consistent batch quality",
    sequence: 3,
  },
  {
    card_title: "Deep Material Expertise",
    card_description:
      "Operational knowledge across PCR feedstocks, polymer streams, and large-scale commercial supply.",
    file_path: "asset/home/videos/Why Choose Us - Material Expertise - Tennessee Optical Sorter.mp4",
    alt_text: "Deep material expertise",
    sequence: 4,
  },
];

const certificates = [
  {
    title: "Recycled Materials Association certification",
    image_alt: "Recycled Materials Association certification",
    image_path: "figma-assets/cert-rema.png",
    sequence: 1,
  },
  {
    title: "Association of Plastic Recyclers member",
    image_alt: "Association of Plastic Recyclers member",
    image_path: "figma-assets/cert-apr.png",
    sequence: 2,
  },
  {
    title: "Certified recycling program",
    image_alt: "Certified recycling program",
    image_path: "figma-assets/cert-green.png",
    sequence: 3,
  },
  {
    title: "ISO 9001 certified",
    image_alt: "ISO 9001 certified",
    image_path: "figma-assets/cert-iso.png",
    sequence: 4,
  },
];

const faqs = [
  {
    page: "home",
    question: "Who leads the vision behind GDB Circular?",
    answer:
      "GDB Circular's growth is guided by experienced leadership, with Managing Director Raj Bagaria helping drive scalable recycling, reliable PCR supply, and long-term industry partnerships.",
    sequence: 1,
  },
  {
    page: "home",
    question: "What does GDB Circular do?",
    answer:
      "GDB Circular manufactures post-consumer recycled resin and supports buyers and suppliers across the circular plastics supply chain.",
    sequence: 2,
  },
  {
    page: "home",
    question: "What types of PCR materials does GDB offer?",
    answer:
      "The company focuses on LDPE, HDPE, and PP PCR materials for film-grade, blow molding, and injection-grade applications.",
    sequence: 3,
  },
  {
    page: "home",
    question: "Can GDB support large-scale material requirements?",
    answer:
      "Yes. Its facilities and processing capacity are built to support consistent commercial volumes and documented quality programs.",
    sequence: 4,
  },
  {
    page: "home",
    question: "Does GDB work with both buyers and suppliers?",
    answer:
      "Yes. GDB Circular works with PCR buyers as well as scrap suppliers looking for dependable recycling and offtake partnerships.",
    sequence: 5,
  },
];

const pageFaqs = [
  ...faqs,
  {
    page: "product-listing",
    question: "What PCR resin types does GDB Circular supply?",
    answer:
      "GDB Circular supplies LDPE, LLDPE, HDPE, and PP recycled resin solutions for films, packaging, rigid containers, and industrial applications.",
    sequence: 1,
  },
  {
    page: "product-listing",
    question: "Can GDB support custom resin specifications?",
    answer:
      "Yes. Material programs can be aligned to buyer requirements for color, application, batch consistency, and documentation needs.",
    sequence: 2,
  },
  {
    page: "product-listing",
    question: "How does GDB coordinate material movement?",
    answer:
      "GDB supports truckload coordination, pickup scheduling, facility routing, and receiving support across its circular material network.",
    sequence: 3,
  },
  {
    page: "product-listing",
    question: "Are these materials suitable for commercial-scale needs?",
    answer:
      "Yes. The product listing focuses on repeatable PCR supply for buyers and suppliers moving materials at industrial scale.",
    sequence: 4,
  },
  {
    page: "product-listing",
    question: "How do I ask about a product?",
    answer:
      "Use the contact form to share the resin type, application, target volume, and any specification requirements.",
    sequence: 5,
  },
  {
    page: "seller",
    question: "What types of materials does GDB procure?",
    answer:
      "We review post-consumer film, rigid plastics, mixed polyolefin scrap, and other qualified streams that align with our processing and logistics network.",
    sequence: 1,
  },
  {
    page: "seller",
    question: "What information should I share in my inquiry?",
    answer:
      "Please include material type, estimated quantity, location, format, and any relevant details.",
    sequence: 2,
  },
  {
    page: "seller",
    question: "Does GDB accept one-time loads or only ongoing supply?",
    answer:
      "We can evaluate one-time opportunities as well as recurring programs, depending on the material profile, timing, and freight fit.",
    sequence: 3,
  },
  {
    page: "seller",
    question: "Will my material be accepted immediately after submission?",
    answer:
      "Not always. Our team first reviews material details, quality, and logistics feasibility before confirming whether the stream is a fit.",
    sequence: 4,
  },
  {
    page: "seller",
    question: "What happens after I submit the supplier form?",
    answer:
      "A member of the purchasing team reviews the submission, evaluates the material fit, and reaches out with next steps for sampling, pricing, or logistics.",
    sequence: 5,
  },
];

const aboutOverview = {
  description:
    "What began with material recovery and processing has grown into a trusted recycling operation with advanced facilities, nationwide reach, and decades of operational expertise supporting modern manufacturing industries.",
  images: [
    { url: "figma-assets/aboutus/1.png", alt: "Material recovery machinery with yellow safety railing" },
    { url: "figma-assets/aboutus/2.png", alt: "HQ vertical processing equipment and silos" },
    { url: "figma-assets/aboutus/5.png", alt: "Blue sorting and processing platforms with boxes" },
    { url: "figma-assets/aboutus/3.png", alt: "Conveyor belt feeding plastic jugs into processor" },
    { url: "figma-assets/aboutus/6.png", alt: "Recycled plastic pellets pouring into storage container" },
    { url: "figma-assets/aboutus/4.png", alt: "Advanced mechanical recycling machinery and yellow safety fences" },
  ],
};

const aboutJourneySection = {
  section_title: "Our Journey Through Growth & Innovation",
  section_description: "",
};

const aboutJourneyItems = [
  {
    year: "1993",
    description: "Sunil Bagaria founds GDB International, Inc. in New Jersey, USA",
    icon_path: "figma-assets/aboutus/timeline/icons/material-symbols_foundation.png",
    icon_alt: "Foundation icon",
    file_path: "figma-assets/aboutus/timeline/card1.png",
    alt_text: "1993 milestone image",
    sequence: 1,
  },
  {
    year: "1998",
    description: "GDB begin polyolefin scrap trading business to India.",
    icon_path: "figma-assets/aboutus/timeline/icons/ic_baseline-business.png",
    icon_alt: "Business growth icon",
    file_path: "figma-assets/aboutus/timeline/card1.png",
    alt_text: "1998 milestone image",
    sequence: 2,
  },
  {
    year: "2008",
    description: "GDB formally opens headquarters in New Brunswick, NJ",
    icon_path: "figma-assets/aboutus/timeline/icons/carbon_location-company.png",
    icon_alt: "Company location icon",
    file_path: "figma-assets/aboutus/timeline/2008.jpeg",
    alt_text: "2008 milestone image",
    sequence: 3,
  },
  {
    year: "2017",
    description: "GDB begin LDPE / LLDPE PCR operations in NJ.",
    icon_path: "figma-assets/aboutus/timeline/icons/uim_process.png",
    icon_alt: "Process operations icon",
    file_path: "figma-assets/aboutus/timeline/2017.jpeg",
    alt_text: "2017 milestone image",
    sequence: 4,
  },
  {
    year: "2020",
    description: "GDB receives SCS Certified PCR License.",
    icon_path: "figma-assets/aboutus/timeline/icons/carbon_certificate.png",
    icon_alt: "Certification icon",
    file_path: "figma-assets/aboutus/timeline/card1.png",
    alt_text: "2020 milestone image",
    sequence: 5,
  },
  {
    year: "2024",
    description: "GDB acquires flagship Rogers, MN facility with other partners",
    icon_path: "figma-assets/aboutus/timeline/icons/carbon_partnership.png",
    icon_alt: "Partnership icon",
    file_path: "figma-assets/aboutus/timeline/2024.jpeg",
    alt_text: "2024 milestone image",
    sequence: 6,
  },
];

const aboutWhyIndustrySection = {
  section_title: "Why Industry Chooses GDB PCR",
  section_description:
    "Built on decades of operational expertise, GDB Circular delivers reliable PCR solutions through advanced recycling infrastructure.",
};

const aboutWhyIndustryItems = [
  {
    stat_value: "33+",
    title: "Years Of Experience",
    description: "Decades of recycling and material processing expertise across evolving industry demands.",
    sequence: 1,
  },
  {
    stat_value: "8+",
    title: "Recycling Facilities",
    description: "Strategically located facilities supporting scalable operations, and reliable PCR material supply.",
    sequence: 2,
  },
  {
    stat_value: "55,000+",
    title: "Tons Capacity",
    description: "Large-scale operational infrastructure designed for consistent PCR resin production.",
    sequence: 3,
  },
  {
    stat_value: "",
    title: "Multi-facility\nNetwork",
    description: "Strategically located facilities supporting reliable logistics and supply continuity.",
    sequence: 4,
  },
  {
    stat_value: "",
    title: "Quality-focused\nProcessing",
    description: "Advanced sorting, washing, extrusion, and testing for dependable material performance.",
    sequence: 5,
  },
  {
    stat_value: "",
    title: "Reliable\nSupply Chain",
    description: "Built to support converters and brands with long-term PCR material consistency.",
    sequence: 6,
  },
];

const productCatalogue = [
  {
    product_category: "LDPE",
    product_name: "LDPE Film-Grade PCR",
    short_description: "Flexible recycled resin for film, liners, bags, and extrusion applications.",
    image_path: "figma-assets/products/LDPE/1.png",
    image_alt: "LDPE Film-Grade PCR",
    pdf_url: "",
    show_on_homepage: 1,
    sequence: 1,
  },
  {
    product_category: "HDPE",
    product_name: "HDPE Blow Molding PCR",
    short_description: "High-strength recycled material built for rigid packaging and industrial applications.",
    image_path: "figma-assets/products/HDPE/1.png",
    image_alt: "HDPE Blow Molding PCR",
    pdf_url: "",
    show_on_homepage: 1,
    sequence: 2,
  },
  {
    product_category: "PP",
    product_name: "PP Injection-Grade PCR",
    short_description: "Durable recycled polypropylene for molded parts, closures, and consumer products.",
    image_path: "figma-assets/products/HDPE/3.png",
    image_alt: "PP Injection-Grade PCR",
    pdf_url: "",
    show_on_homepage: 1,
    sequence: 3,
  },
  {
    product_category: "LDPE",
    product_name: "LLDPE Food Grade",
    short_description: "Food-contact compliant LLDPE resin for stretch film and flexible packaging.",
    image_path: "figma-assets/products/LDPE/3.png",
    image_alt: "LLDPE Food Grade",
    pdf_url: "",
    show_on_homepage: 0,
    sequence: 4,
  },
  {
    product_category: "LDPE",
    product_name: "LLDPE Premium Stretch",
    short_description: "High-performance stretch resin engineered for pallet wrap and load containment.",
    image_path: "figma-assets/products/LDPE/4.png",
    image_alt: "LLDPE Premium Stretch",
    pdf_url: "",
    show_on_homepage: 0,
    sequence: 5,
  },
  {
    product_category: "LDPE",
    product_name: "LDPE Multi-purpose",
    short_description: "Versatile LDPE resin suited for a wide range of film and packaging formats.",
    image_path: "figma-assets/products/LDPE/2.png",
    image_alt: "LDPE Multi-purpose",
    pdf_url: "",
    show_on_homepage: 0,
    sequence: 6,
  },
  {
    product_category: "LDPE",
    product_name: "LDPE Black",
    short_description: "Flexible recycled resin for film, liners, bags, and extrusion applications.",
    image_path: "figma-assets/products/LDPE/1.png",
    image_alt: "LDPE Black",
    pdf_url: "",
    show_on_homepage: 0,
    sequence: 7,
  },
  {
    product_category: "HDPE",
    product_name: "HDPE Food Grade",
    short_description: "Food-contact compliant HDPE resin for rigid packaging and container applications.",
    image_path: "figma-assets/products/HDPE/1.png",
    image_alt: "HDPE Food Grade",
    pdf_url: "",
    show_on_homepage: 0,
    sequence: 8,
  },
  {
    product_category: "HDPE",
    product_name: "HDPE White PCR",
    short_description: "Clean white PCR resin for bottles, caps, closures, and molded packaging formats.",
    image_path: "figma-assets/products/HDPE/2.png",
    image_alt: "HDPE White PCR",
    pdf_url: "",
    show_on_homepage: 0,
    sequence: 9,
  },
];

const logisticsSection = {
  section_title: "Logistics That Keep Materials Moving",
  section_description: "Coordinated support for smooth material movement across the GDB network.",
};

const logisticsCards = [
  {
    card_title: "Truckload Coordination",
    card_description: "Planning full-load movement based on material volume and location.",
    icon_path: "figma-assets/facilities/network-icons/operationalSupport.svg",
    icon_alt: "Truckload Coordination",
    sequence: 1,
  },
  {
    card_title: "Pickup Scheduling",
    card_description: "Helping coordinate pickups or deliveries with suppliers and partners.",
    icon_path: "figma-assets/facilities/network-icons/storage.svg",
    icon_alt: "Pickup Scheduling",
    sequence: 2,
  },
  {
    card_title: "Facility Routing",
    card_description: "Routing materials to suitable facilities based on processing requirements.",
    icon_path: "figma-assets/facilities/network-icons/sorting.svg",
    icon_alt: "Facility Routing",
    sequence: 3,
  },
  {
    card_title: "Receiving Support",
    card_description: "Managing safe unloading, inspection, staging, and readiness for processing.",
    icon_path: "figma-assets/facilities/network-icons/testing.svg",
    icon_alt: "Receiving Support",
    sequence: 4,
  },
];

const caseStudies = [
  {
    title: "Delivered Regional Flexible Film Recovery at Industrial Scale",
    short_description:
      "GDB managed material intake and processing to convert recovered plastics into reusable PCR resin.",
    image_path: "figma-assets/products/ProvenProject.png",
    image_alt: "Recovered plastic material moving through an industrial recycling facility",
    full_description:
      "GDB managed material intake and processing to convert recovered plastics into reusable PCR resin.",
    sequence: 1,
  },
];

const sellerAlwaysBuying = {
  section_title: "We’re Always Buying",
  section_description:
    "GDB purchases post-consumer plastic scrap from large-scale generators, distribution generators, MRFs, brokers, and across the US with responsive service, compliant logistics, and a purchasing team that responds fast.",
  file_path: "figma-assets/seller/seller-partnership.webp",
  media_type: "image",
  alt_text: "Seller always buying section",
  points: [
    "Truckload or container quantities preferred",
    "Polymer type clearly identified (LDPE/LLDPE, HDPE, PP)",
    "Sorted or single-stream bales",
    "Post-consumer qualified stream",
    "Subject to quality inspection and logistics confirmation",
  ],
};

const sellerFeedstock = [
  {
    feedstock_category: "LDPE",
    material_name: "LDPE & LLDPE Grade A",
    short_description: "Flexible post-consumer feedstock evaluated for quality, volume, and downstream processing suitability.",
    image_path: "figma-assets/seller/ldpe-grade-a.png",
    image_alt: "Compressed LDPE and LLDPE feedstock bales stacked for shipment",
    pdf_url: "",
    sequence: 1,
  },
  {
    feedstock_category: "LDPE",
    material_name: "LDPE Laundry Bales",
    short_description: "Laundry bale streams reviewed for consistency, contamination profile, and program-fit logistics.",
    image_path: "figma-assets/seller/ldpe-laundry-bales.png",
    image_alt: "Laundry bale feedstock prepared for evaluation",
    pdf_url: "",
    sequence: 2,
  },
  {
    feedstock_category: "LDPE",
    material_name: "LLDPE Grade A",
    short_description: "LLDPE material assessed for recurring supply programs with practical pickup and receiving coordination.",
    image_path: "figma-assets/seller/lldpe-grade-a.png",
    image_alt: "LLDPE grade A plastic feedstock in processing",
    pdf_url: "",
    sequence: 3,
  },
  {
    feedstock_category: "HDPE",
    material_name: "HDPE Milk Jugs Bales",
    short_description: "Rigid HDPE bale streams qualified against quality expectations, volume, and processing fit.",
    image_path: "figma-assets/seller/hdpe-milk-jugs-bales.png",
    image_alt: "Baled HDPE milk jug material",
    pdf_url: "",
    sequence: 4,
  },
  {
    feedstock_category: "PP",
    material_name: "Product",
    short_description: "Additional mixed polyolefin feedstock reviewed based on specs, application, and logistics readiness.",
    image_path: "figma-assets/seller/product-placeholder.png",
    image_alt: "Mixed plastic feedstock material sample",
    pdf_url: "",
    sequence: 5,
  },
];

const teamLifeGallery = [
  { file_path: "figma-assets/team/life-01.webp", alt_text: "GDB Circular team at work", slider_group: 1, sequence: 1 },
  { file_path: "figma-assets/team/life-03.webp", alt_text: "Recycling facility operations", slider_group: 1, sequence: 2 },
  { file_path: "figma-assets/team/life-05.webp", alt_text: "Team members collaborating", slider_group: 1, sequence: 3 },
  { file_path: "figma-assets/team/life-07.webp", alt_text: "Material handling at GDB Circular", slider_group: 1, sequence: 4 },
  { file_path: "figma-assets/team/life-09.webp", alt_text: "GDB Circular workplace moment", slider_group: 1, sequence: 5 },
  { file_path: "figma-assets/team/life-6.webp", alt_text: "Team activity at GDB Circular", slider_group: 2, sequence: 1 },
  { file_path: "figma-assets/team/life-04.webp", alt_text: "Facility floor teamwork", slider_group: 2, sequence: 2 },
  { file_path: "figma-assets/team/life-06.webp", alt_text: "Operations and recycling team", slider_group: 2, sequence: 3 },
  { file_path: "figma-assets/team/life-08.webp", alt_text: "GDB Circular facility environment", slider_group: 2, sequence: 4 },
];

const teamLifeSection = {
  section_title: "Life at GDB Circular",
  section_description:
    "A workplace shaped by teamwork, innovation, operational excellence, and commitment to responsible recycling practices.",
};

const facilities = [
  {
    title: "Rogers (MN) Facility",
    addressLine1: "19850 S. Diamond Lake Rd Suite 100",
    addressLine2: "Rogers, MN 55374",
    phone: "",
    image_path: "figma-assets/facilities/2.jpg",
    sequence: 1,
  },
  {
    title: "Neenah (WI) Facility",
    addressLine1: "218 Jackson Street",
    addressLine2: "Neenah, WI 54956",
    phone: "",
    image_path: "figma-assets/facilities/2.jpg",
    sequence: 2,
  },
  {
    title: "Dayton (OH) Facility",
    addressLine1: "931 Deeds Avenue",
    addressLine2: "Dayton, OH 45404",
    phone: "(937) 829-4363",
    image_path: "figma-assets/facilities/Dayton.jpeg",
    sequence: 3,
  },
  {
    title: "Paint & Coatings HQ Nashville (IL) Facility",
    addressLine1: "17396 Mockingbird Road",
    addressLine2: "Nashville, IL 62263",
    phone: "",
    image_path: "figma-assets/facilities/7.png",
    sequence: 4,
  },
  {
    title: "Elizabethton (TN) Facility",
    addressLine1: "200 Smoky Mountain Place",
    addressLine2: "Elizabethton, TN 37643",
    phone: "",
    image_path: "figma-assets/facilities/4.png",
    sequence: 5,
  },
  {
    title: "Haines City (FL) Facility",
    addressLine1: "8 Railroad Avenue",
    addressLine2: "Haines City, FL 33844",
    phone: "",
    image_path: "figma-assets/facilities/5.png",
    sequence: 6,
  },
  {
    title: "Branchburg (NJ) Facility",
    addressLine1: "68 County Line Rd.",
    addressLine2: "Branchburg, NJ 08876",
    phone: "",
    image_path: "figma-assets/process-conversion.jpg",
    sequence: 7,
  },
  {
    title: "Corporate Office & HQ New Brunswick (NJ) Facility",
    addressLine1: "1 Home News Row",
    addressLine2: "New Brunswick, NJ 08901",
    phone: "+1 (732) 246-3001",
    image_path: "figma-assets/facilities/1.png",
    sequence: 8,
  },
];

const teamMembers = [
  {
    group_name: "Board of Directors",
    name: "Sunil Bagaria",
    designation: "Chairman & Director -\nGDB Circular",
    photo_alt: "Sunil Bagaria",
    photo_path: "asset/home/gdb-team/Sunil Bagaria.jpg",
    sequence: 1,
  },
  {
    group_name: "Board of Directors",
    name: "Steven Schweiger",
    designation: "Board of Directors,\nGeneral Mills",
    photo_alt: "Steven Schweiger",
    photo_path: "asset/home/gdb-team/Steven Schweiger.jpeg",
    sequence: 2,
  },
  {
    group_name: "Board of Directors",
    name: "Avinash Singh",
    designation: "CEO,\nGDB Circular MN",
    photo_alt: "Avinash Singh",
    photo_path: "asset/home/gdb-team/Avinash Singh Headshot.jpg",
    sequence: 3,
  },
  {
    group_name: "Board of Directors",
    name: "Mark Mikol",
    designation: "Board Of Director,\nThe Schwan's Company",
    photo_alt: "Mark Mikol",
    photo_path: "asset/home/gdb-team/Mark Mikol 1x1.jpg",
    sequence: 4,
  },
  {
    group_name: "Board of Directors",
    name: "Raj Bagaria",
    designation: "Managing Director,\nGDB Circular",
    photo_alt: "Raj Bagaria",
    photo_path: "asset/home/gdb-team/Raj Bagaria.jpg",
    sequence: 5,
  },
  {
    group_name: "Board of Directors",
    name: "Rishi Bagaria",
    designation: "Managing Director,\nGDB Circular",
    photo_alt: "Rishi Bagaria",
    photo_path: "asset/home/gdb-team/Rishi Bagaria.jpeg",
    sequence: 6,
  },
  {
    group_name: "Board of Directors",
    name: "Maite Quinn-Richards",
    designation: "Board Advisor,\nGDB Circular",
    photo_alt: "Maite Quinn-Richards",
    photo_path: "asset/home/gdb-team/Maite Quinn-Richards Headshot.png",
    sequence: 7,
  },
  {
    group_name: "Leadership",
    name: "Howard Schamach",
    designation: "EVP, Procurement & Sales",
    photo_alt: "Howard Schamach",
    photo_path: "asset/home/gdb-team/Howard Headshot.png",
    sequence: 8,
  },
  {
    group_name: "Leadership",
    name: "Omar Morales",
    designation: "SVP, Operations",
    photo_alt: "Omar Morales",
    photo_path: "asset/home/gdb-team/Omar Morales Headshot.jpeg",
    sequence: 9,
  },
  {
    group_name: "Leadership",
    name: "Amit Agarwal",
    designation: "VP, Finance",
    photo_alt: "Amit Agarwal",
    photo_path: "asset/home/gdb-team/Amit Agarwal Headshot.jpg",
    sequence: 10,
  },
  {
    group_name: "Leadership",
    name: "Harshad Patil",
    designation: "AVP, Recycling Operations",
    photo_alt: "Harshad Patil",
    photo_path: "asset/home/gdb-team/Harshad Patil.jpg",
    sequence: 11,
  },
];

const newsSeed = {
  categories: [
    {
      category_title: "News",
      sequence: 1,
      status: "active",
    },
    {
      category_title: "Updates",
      sequence: 2,
      status: "active",
    },
  ],
  articles: [
    {
      category_title: "News",
      title: "Fresh Perspective- Recycling industry professionals share their perspectives on the industry.",
      date: "2025-03-06",
      short_description:
        "For Raj Bagaria, finding a career in the recycling industry has been a lifelong journey.\n\nHis father, Sunil Bagaria, founded New Brunswick, New Jersey-based recycling company GDB International Inc. in 1993, which allowed Raj to grow up around the industry and develop a firsthand view of its evolution.",
      image_alt: "Raj Bagaria shares his perspective on the recycling industry",
      image_path: "figma-assets/news/main.png",
      logo_path: "asset/home/mediaGroup.png",
      external_url: "https://www.recyclingtoday.com/article/fresh-perspective-march-2025-raj-bagaria/",
      featured_homepage: 0,
      featured_listing: 1,
      publish_status: "published",
      sequence: 1,
    },
    {
      category_title: "News",
      title: "General Mills Lays Out Game Plan for Recycling Flexible Plastics",
      date: "2025-04-25",
      short_description:
        "In its 2025 Global Responsibility Report, General Mills goes into considerable detail about its approach to flexible packaging and strategies for facilitating recycling.",
      image_alt: "General Mills flexible plastics recycling story",
      image_path: "figma-assets/insight-general-mills.jpg",
      logo_path: "asset/home/mediaGroup.png",
      external_url: "https://www.packagingstrategies.com/articles/105609-general-mills-lays-out-game-plan-for-recycling-flexible-plastics",
      featured_homepage: 1,
      featured_listing: null,
      publish_status: "published",
      sequence: 2,
    },
    {
      category_title: "Updates",
      title: "GDB Circular Receives FDA Approval for Food-Grade Recycled Resin",
      date: "2026-03-18",
      short_description:
        "GDB Circular received a Letter of No Objection from the U.S. FDA for premium LDPE and LLDPE post-consumer recycled resin.",
      image_alt: "FDA approval for food-grade recycled resin",
      image_path: "figma-assets/insight-fda.jpg",
      logo_path: "figma-assets/aboutus/GDB_International.png",
      external_url: "/news-events",
      featured_homepage: 1,
      featured_listing: null,
      publish_status: "published",
      sequence: 3,
    },
    {
      category_title: "News",
      title: "One year after acquisition, GDB details revival strategy for Minnesota operations",
      date: "2025-10-17",
      short_description:
        "Brands across industries are accelerating the shift toward high-quality post-consumer recycled resins to meet sustainability goals.",
      image_alt: "GDB Minnesota recycling operations",
      image_path: "figma-assets/news/3.png",
      logo_path: "asset/home/packaging_black.svg",
      external_url: "https://www.packagingdive.com/news/gdb-circular-rogers-minnesota-film-recycling-plant-flagship-revive-myplas/803036/",
      featured_homepage: 0,
      featured_listing: null,
      publish_status: "published",
      sequence: 4,
    },
    {
      category_title: "News",
      title: "Plastics Recycling Facility in Rogers, MN Reopens Under New Name",
      date: "2024-09-18",
      short_description:
        "GDB International, Inc. through its subsidiary GDB Circular (MN), Inc. is reopening a state-of-the-art plastics recycling plant located in Rogers,",
      image_alt: "Rogers Minnesota plastics recycling facility",
      image_path: "figma-assets/news/4.png",
      logo_path: "asset/home/pw-logo.png",
      external_url: "https://www.packworld.com/sustainable-packaging/recycling/news/22920800/mbold-plastics-recycling-facility-in-rogers-mn-reopens-under-new-ownership-of-gdb-circular-mn-inc",
      featured_homepage: 0,
      featured_listing: null,
      publish_status: "published",
      sequence: 5,
    },
    {
      category_title: "News",
      title: "GDB International Grows Southeastern Reach with Acquisition of JP Plastics",
      date: "2022-05-06",
      short_description:
        "New Brunswick, N.J.-based ISRI member GDB International Inc. has expanded its ties in the southeast U.S. with the acquisition of JP Plastics Recycling.",
      image_alt: "GDB International acquisition of JP Plastics",
      image_path: "figma-assets/news/5.png",
      logo_path: "asset/home/ReMA-logo.svg",
      external_url: "https://www.recycledmaterials.org/gdb-international-grows-southeastern-reach-with-acquisition/",
      featured_homepage: 0,
      featured_listing: null,
      publish_status: "published",
      sequence: 6,
    },
    {
      category_title: "News",
      title: "GDB acquires plastics recycling plant in Minnesota",
      date: "2024-09-04",
      short_description:
        "GDB Circular, a subsidiary of GDB International, serves as the lead investor, with General Mills and Schwan's Co. among additional investors.",
      image_alt: "GDB acquisition of a Minnesota plastics recycling plant",
      image_path: "figma-assets/news/6.png",
      logo_path: "asset/home/mediaGroup.png",
      external_url: "https://www.recyclingtoday.com/news/gdb-international-acquires-plastics-recycling-plant-in-minnesota/",
      featured_homepage: 0,
      featured_listing: null,
      publish_status: "published",
      sequence: 7,
    },
  ],
};

function detectMediaFolder(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if ([".mp4", ".webm", ".mov"].includes(ext)) return "videos";
  if (ext === ".pdf") return "documents";
  return "images";
}

function copyAssetToUploads(relativeAssetPath) {
  if (!relativeAssetPath) return "";
  if (/^https?:\/\//i.test(relativeAssetPath) || relativeAssetPath.startsWith("/uploads/")) {
    return relativeAssetPath;
  }

  const sourcePath = path.join(frontendPublicDir, ...relativeAssetPath.split("/"));
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Asset not found: ${sourcePath}`);
  }

  const folder = detectMediaFolder(sourcePath);
  const targetDir = path.join(uploadsDir, folder);
  fs.mkdirSync(targetDir, { recursive: true });

  const ext = path.extname(sourcePath).toLowerCase();
  const hash = crypto.createHash("md5").update(relativeAssetPath).digest("hex");
  const fileName = `${hash}${ext}`;
  const targetPath = path.join(targetDir, fileName);

  if (!fs.existsSync(targetPath)) {
    fs.copyFileSync(sourcePath, targetPath);
  }

  return `/uploads/${folder}/${fileName}`;
}

async function upsertSingleton(table, payload) {
  const rows = await query(`SELECT id FROM ${table} ORDER BY id ASC LIMIT 1`);
  if (rows.length) {
    const assignments = Object.keys(payload).map((key) => `${key} = ?`).join(", ");
    await query(`UPDATE ${table} SET ${assignments} WHERE id = ?`, [...Object.values(payload), rows[0].id]);
    return rows[0].id;
  }

  const keys = Object.keys(payload);
  const placeholders = keys.map(() => "?").join(", ");
  const result = await query(
    `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`,
    Object.values(payload)
  );
  return result.insertId;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function query(sql, params = [], attempt = 1) {
  try {
    return await rawQuery(sql, params);
  } catch (error) {
    if (attempt < 5 && RETRYABLE_DB_ERRORS.has(error.code)) {
      const delay = attempt * 1500;
      console.warn(`Retrying DB query after ${error.code} (${attempt}/4)...`);
      await wait(delay);
      return query(sql, params, attempt + 1);
    }
    throw error;
  }
}

async function upsertRecord(table, match, payload) {
  const whereKeys = Object.keys(match);
  const whereSql = whereKeys.map((key) => `${key} = ?`).join(" AND ");
  const rows = await query(
    `SELECT id FROM ${table} WHERE ${whereSql} ORDER BY id ASC LIMIT 1`,
    whereKeys.map((key) => match[key])
  );

  if (rows.length) {
    const keys = Object.keys(payload);
    const assignments = keys.map((key) => `${key} = ?`).join(", ");
    await query(
      `UPDATE ${table} SET ${assignments} WHERE id = ?`,
      [...keys.map((key) => payload[key]), rows[0].id]
    );
    return rows[0].id;
  }

  const merged = { ...match, ...payload };
  const keys = Object.keys(merged);
  const placeholders = keys.map(() => "?").join(", ");
  const result = await query(
    `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`,
    keys.map((key) => merged[key])
  );
  return result.insertId;
}

async function seedBanners() {
  for (const banner of pageBanners) {
    await upsertRecord(
      "banners",
      { page: banner.page },
      {
        title: banner.title,
        file_url: copyAssetToUploads(banner.file_path),
        alt_text: banner.alt_text,
        cta_button_name: null,
        cta_button_link: null,
        status: "active",
      }
    );
  }
}

async function seedStats() {
  for (const item of homeStats) {
    await upsertRecord(
      "homepage_stats",
      { title: item.title },
      {
        icon_url: copyAssetToUploads(item.icon_path),
        icon_alt: item.icon_alt,
        value_text: item.value_text,
        sequence: item.sequence,
        status: "active",
      }
    );
  }
}

async function seedProcess() {
  await upsertSingleton("homepage_process_section", processSection);
  for (const step of processSteps) {
    await upsertRecord(
      "homepage_process_steps",
      { step_title: step.step_title },
      {
        step_description: step.step_description,
        file_url: copyAssetToUploads(step.file_path),
        alt_text: step.alt_text,
        sequence: step.sequence,
        status: "active",
      }
    );
  }
}

async function seedWhyChoose() {
  await upsertSingleton("homepage_whychoose_section", whyChooseSection);
  for (const card of whyChooseCards) {
    await upsertRecord(
      "homepage_whychoose_cards",
      { card_title: card.card_title },
      {
        card_description: card.card_description,
        file_url: copyAssetToUploads(card.file_path),
        cover_image_alt: card.alt_text,
        alt_text: card.alt_text,
        sequence: card.sequence,
        status: "active",
      }
    );
  }

  const managedTitles = whyChooseCards.map((card) => card.card_title);
  const placeholders = managedTitles.map(() => "?").join(", ");
  await query(
    `UPDATE homepage_whychoose_cards SET status = 'inactive' WHERE card_title NOT IN (${placeholders})`,
    managedTitles
  );
}

async function seedCertificates() {
  for (const cert of certificates) {
    await upsertRecord(
      "certificates",
      { title: cert.title },
      {
        image_url: copyAssetToUploads(cert.image_path),
        image_alt: cert.image_alt,
        link: null,
        sequence: cert.sequence,
        status: "active",
      }
    );
  }
}

async function seedFaqs() {
  for (const item of pageFaqs) {
    await upsertRecord(
      "faqs",
      { page: item.page, question: item.question },
      {
        answer: item.answer,
        sequence: item.sequence,
        status: "active",
      }
    );
  }
}

async function seedAboutPage() {
  await upsertSingleton("about_gdb_overview", {
    description: aboutOverview.description,
    images: JSON.stringify(
      aboutOverview.images.map((image) => ({
        url: copyAssetToUploads(image.url),
        alt: image.alt,
      }))
    ),
    status: "active",
  });

  await upsertSingleton("about_gdb_journey_timeline_section", aboutJourneySection);
  for (const item of aboutJourneyItems) {
    await upsertRecord(
      "about_gdb_journey_timeline_items",
      { year: item.year },
      {
        description: item.description,
        icon_url: copyAssetToUploads(item.icon_path),
        icon_alt: item.icon_alt,
        image_url: copyAssetToUploads(item.file_path),
        image_alt: item.alt_text,
        sequence: item.sequence,
        status: "active",
      }
    );
  }

  await upsertSingleton("about_gdb_why_industry_chooses_section", aboutWhyIndustrySection);
  for (const item of aboutWhyIndustryItems) {
    await upsertRecord(
      "about_gdb_why_industry_chooses_items",
      { title: item.title },
      {
        stat_value: item.stat_value,
        description: item.description,
        sequence: item.sequence,
        status: "active",
      }
    );
  }
}

async function seedFacilities() {
  await query("UPDATE facilities SET status = 'inactive'");
  for (const facility of facilities) {
    await upsertRecord(
      "facilities",
      { facility_name: facility.title },
      {
        facility_type: "",
        address: facility.addressLine1,
        phone: facility.phone,
        state: facility.addressLine2,
        latitude: "",
        longitude: "",
        image_url: copyAssetToUploads(facility.image_path),
        image_alt: facility.title,
        sequence: facility.sequence,
        status: "active",
      }
    );
  }
}

async function seedTeamMembers() {
  await query("UPDATE team_members SET status = 'inactive'");
  for (const member of teamMembers) {
    await upsertRecord(
      "team_members",
      { name: member.name },
      {
        group_name: member.group_name,
        designation: member.designation,
        photo_url: copyAssetToUploads(member.photo_path),
        photo_alt: member.photo_alt,
        linkedin_url: null,
        show_on_homepage: 1,
        sequence: member.sequence,
        status: "active",
      }
    );
  }
}

async function seedTeamLifeGallery() {
  await upsertSingleton("team_life_section", teamLifeSection);
  await query("UPDATE team_life_gallery SET status = 'inactive'");
  for (const item of teamLifeGallery) {
    await upsertRecord(
      "team_life_gallery",
      { alt_text: item.alt_text },
      {
        file_url: copyAssetToUploads(item.file_path),
        media_type: "image",
        alt_text: item.alt_text,
        slider_group: item.slider_group,
        status: "active",
      }
    );
  }
}

async function seedProductPage() {
  await upsertSingleton("logistics_support_section", logisticsSection);
  await query("UPDATE product_catalogue SET status = 'inactive'");

  for (const product of productCatalogue) {
    await upsertRecord(
      "product_catalogue",
      { product_name: product.product_name },
      {
        product_category: product.product_category,
        short_description: product.short_description,
        image_url: copyAssetToUploads(product.image_path),
        image_alt: product.image_alt,
        pdf_url: product.pdf_url,
        show_on_homepage: product.show_on_homepage,
        sequence: product.sequence,
        status: "active",
      }
    );
  }

  await query("UPDATE logistics_support_cards SET status = 'inactive'");
  for (const card of logisticsCards) {
    await upsertRecord(
      "logistics_support_cards",
      { card_title: card.card_title },
      {
        card_description: card.card_description,
        icon_url: copyAssetToUploads(card.icon_path),
        icon_alt: card.icon_alt,
        sequence: card.sequence,
        status: "active",
      }
    );
  }

  await query("UPDATE case_studies SET status = 'inactive'");
  for (const caseStudy of caseStudies) {
    await upsertRecord(
      "case_studies",
      { title: caseStudy.title },
      {
        short_description: caseStudy.short_description,
        image_url: copyAssetToUploads(caseStudy.image_path),
        image_alt: caseStudy.image_alt,
        full_description: caseStudy.full_description,
        sequence: caseStudy.sequence,
        status: "active",
      }
    );
  }
}

async function seedSellerPage() {
  await upsertSingleton("seller_always_buying", {
    section_title: sellerAlwaysBuying.section_title,
    section_description: sellerAlwaysBuying.section_description,
    file_url: copyAssetToUploads(sellerAlwaysBuying.file_path),
    media_type: sellerAlwaysBuying.media_type,
    alt_text: sellerAlwaysBuying.alt_text,
  });

  await query("UPDATE seller_purchasing_points SET status = 'inactive'");
  for (let index = 0; index < sellerAlwaysBuying.points.length; index += 1) {
    const pointTitle = sellerAlwaysBuying.points[index];
    await upsertRecord(
      "seller_purchasing_points",
      { point_title: pointTitle },
      {
        sequence: index + 1,
        status: "active",
      }
    );
  }

  await query("UPDATE seller_feedstock SET status = 'inactive'");
  for (const item of sellerFeedstock) {
    await upsertRecord(
      "seller_feedstock",
      { material_name: item.material_name },
      {
        feedstock_category: item.feedstock_category,
        short_description: item.short_description,
        image_url: copyAssetToUploads(item.image_path),
        image_alt: item.image_alt,
        pdf_url: item.pdf_url,
        sequence: item.sequence,
        status: "active",
      }
    );
  }
}

async function seedNews() {
  const categoryIds = {};
  for (const category of newsSeed.categories) {
    const id = await upsertRecord(
      "news_categories",
      { category_title: category.category_title },
      {
        sequence: category.sequence,
        status: category.status,
      }
    );
    categoryIds[category.category_title] = id;
  }

  for (const article of newsSeed.articles) {
    await upsertRecord(
      "news_content",
      { title: article.title },
      {
        category_id: categoryIds[article.category_title],
        date: article.date,
        short_description: article.short_description,
        image_url: copyAssetToUploads(article.image_path),
        logo_url: article.logo_path ? copyAssetToUploads(article.logo_path) : null,
        logo_alt: article.logo_path ? `${article.title} publisher logo` : null,
        image_alt: article.image_alt,
        external_url: article.external_url,
        featured_homepage: article.featured_homepage,
        featured_listing: article.featured_listing,
        publish_status: article.publish_status,
        sequence: article.sequence,
      }
    );
  }
}

async function main() {
  console.log("Importing frontend content into CMS tables...");
  await seedBanners();
  await seedStats();
  await seedProcess();
  await seedWhyChoose();
  await seedAboutPage();
  await seedCertificates();
  await seedFaqs();
  await seedProductPage();
  await seedSellerPage();
  await seedFacilities();
  await seedTeamMembers();
  await seedTeamLifeGallery();
  await seedNews();
  console.log("Frontend content import completed successfully.");
}

main()
  .catch((error) => {
    console.error("Frontend content import failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
