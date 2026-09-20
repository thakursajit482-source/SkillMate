import { PrismaClient, UserRole, UserStatus, VerificationStatus, SkillLevel } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting SkillMate database seeding...');

  // 1. Seed MMR Colleges
  const collegesData = [
    // Existing 9 MMR colleges (names preserved exactly to prevent duplicate key or relation issues)
    {
      name: 'Thakur College of Engineering and Technology',
      city: 'Mumbai',
      area: 'Kandivali',
      emailDomains: ['tcetmumbai.in', 'thakureducation.org'],
    },
    {
      name: 'VIVA Institute of Technology',
      city: 'Virar',
      area: 'Virar',
      emailDomains: ['viva-technology.org'],
    },
    {
      name: 'Shree L. R. Tiwari College of Engineering',
      city: 'Mira-Bhayandar',
      area: 'Mira Road',
      emailDomains: ['slrtce.in'],
    },
    {
      name: 'Sardar Patel Institute of Technology',
      city: 'Mumbai',
      area: 'Andheri',
      emailDomains: ['spit.ac.in'],
    },
    {
      name: 'Veermata Jijabai Technological Institute (VJTI)',
      city: 'Mumbai',
      area: 'Matunga',
      emailDomains: ['vjti.ac.in'],
    },
    {
      name: 'K. J. Somaiya College of Engineering',
      city: 'Mumbai',
      area: 'Vidyavihar',
      emailDomains: ['somaiya.edu'],
    },
    {
      name: 'Mithibai College of Arts and Chauhan Institute of Science',
      city: 'Mumbai',
      area: 'Vile Parle',
      emailDomains: ['mithibai.ac.in'],
    },
    {
      name: 'N. M. College of Commerce and Economics',
      city: 'Mumbai',
      area: 'Vile Parle',
      emailDomains: ['nmcollege.in'],
    },
    {
      name: 'Indian Institute of Technology Bombay (IITB)',
      city: 'Mumbai',
      area: 'Powai',
      emailDomains: ['iitb.ac.in'],
    },

    // Western Suburbs: Kandivali, Borivali, Malad, Goregaon
    {
      name: 'Thakur College of Science and Commerce (TCSC)',
      city: 'Mumbai',
      area: 'Kandivali',
      emailDomains: ['tcsc.edu.in'],
    },
    {
      name: "Kandivli Education Society's Shroff College (KES Shroff)",
      city: 'Mumbai',
      area: 'Kandivali',
      emailDomains: ['kesshroffcollege.com'],
    },
    {
      name: 'St. Francis Institute of Technology (SFIT)',
      city: 'Mumbai',
      area: 'Borivali',
      emailDomains: ['sfit.ac.in'],
    },
    {
      name: 'Atharva College of Engineering',
      city: 'Mumbai',
      area: 'Malad',
      emailDomains: ['atharvacoe.ac.in'],
    },
    {
      name: 'Nagindas Khandwala College (Autonomous)',
      city: 'Mumbai',
      area: 'Malad',
      emailDomains: ['nkc.ac.in'],
    },
    {
      name: 'Patkar-Varde College of Arts, Science & Commerce',
      city: 'Mumbai',
      area: 'Goregaon',
      emailDomains: ['patkarvardecollege.edu.in'],
    },
    {
      name: 'Vivek College of Commerce',
      city: 'Mumbai',
      area: 'Goregaon',
      emailDomains: [],
    },

    // Western Suburbs: Andheri, Bandra, Vile Parle
    {
      name: 'Sardar Patel College of Engineering (SPCE)',
      city: 'Mumbai',
      area: 'Andheri',
      emailDomains: ['spce.ac.in'],
    },
    {
      name: "Bhavan's College (Autonomous)",
      city: 'Mumbai',
      area: 'Andheri',
      emailDomains: ['bhavans.ac.in'],
    },
    {
      name: 'Mukesh Patel School of Technology Management & Engineering (NMIMS)',
      city: 'Mumbai',
      area: 'Vile Parle',
      emailDomains: ['nmims.edu'],
    },
    {
      name: 'Thadomal Shahani Engineering College (TSEC)',
      city: 'Mumbai',
      area: 'Bandra',
      emailDomains: ['tsec.edu'],
    },
    {
      name: 'Fr. Conceicao Rodrigues College of Engineering (CRCE)',
      city: 'Mumbai',
      area: 'Bandra',
      emailDomains: ['frcrce.ac.in'],
    },
    {
      name: 'Rizvi College of Engineering',
      city: 'Mumbai',
      area: 'Bandra',
      emailDomains: ['eng.rizvi.edu.in'],
    },
    {
      name: "St. Andrew's College of Arts, Science and Commerce",
      city: 'Mumbai',
      area: 'Bandra',
      emailDomains: ['standrewscollege.ac.in'],
    },
    {
      name: 'R. D. National College',
      city: 'Mumbai',
      area: 'Bandra',
      emailDomains: ['rdnational.ac.in'],
    },

    // Central & South Mumbai: Matunga, Dadar, Mahim, Sion, Fort, Churchgate
    {
      name: 'Institute of Chemical Technology (ICT Mumbai)',
      city: 'Mumbai',
      area: 'Matunga',
      emailDomains: ['ictmumbai.edu.in'],
    },
    {
      name: 'Ramnarain Ruia Autonomous College',
      city: 'Mumbai',
      area: 'Matunga',
      emailDomains: ['ruiacollege.edu'],
    },
    {
      name: 'R. A. Podar College of Commerce and Economics',
      city: 'Mumbai',
      area: 'Matunga',
      emailDomains: ['rapodar.ac.in'],
    },
    {
      name: 'Kirti M. Doongursee College',
      city: 'Mumbai',
      area: 'Dadar',
      emailDomains: ['kirticollege.edu.in'],
    },
    {
      name: 'Xavier Institute of Engineering (XIE)',
      city: 'Mumbai',
      area: 'Mahim',
      emailDomains: ['xavier.ac.in'],
    },
    {
      name: 'SIES College of Arts, Science and Commerce (Autonomous)',
      city: 'Mumbai',
      area: 'Sion',
      emailDomains: ['siesascs.edu.in'],
    },
    {
      name: "St. Xavier's College (Autonomous Mumbai)",
      city: 'Mumbai',
      area: 'Fort',
      emailDomains: ['xaviers.edu'],
    },
    {
      name: 'Jai Hind College (Autonomous)',
      city: 'Mumbai',
      area: 'Churchgate',
      emailDomains: ['jaihindcollege.com'],
    },
    {
      name: 'H.R. College of Commerce and Economics',
      city: 'Mumbai',
      area: 'Churchgate',
      emailDomains: ['hrcollege.edu'],
    },
    {
      name: 'Kishinchand Chellaram College (KC College)',
      city: 'Mumbai',
      area: 'Churchgate',
      emailDomains: ['kccollege.edu.in'],
    },

    // Eastern Suburbs: Vidyavihar, Kurla, Chembur, Mulund
    {
      name: 'K. J. Somaiya Institute of Technology (KJSIT)',
      city: 'Mumbai',
      area: 'Sion',
      emailDomains: ['somaiya.edu'],
    },
    {
      name: 'Don Bosco Institute of Technology (DBIT)',
      city: 'Mumbai',
      area: 'Kurla',
      emailDomains: ['dbit.in'],
    },
    {
      name: "Vivekanand Education Society's Institute of Technology (VESIT)",
      city: 'Mumbai',
      area: 'Chembur',
      emailDomains: ['ves.ac.in'],
    },
    {
      name: 'Shah & Anchor Kutchhi Engineering College (SAKEC)',
      city: 'Mumbai',
      area: 'Chembur',
      emailDomains: ['sakec.ac.in'],
    },
    {
      name: 'V. G. Vaze College of Arts, Science and Commerce (Kelkar College)',
      city: 'Mumbai',
      area: 'Mulund',
      emailDomains: ['vazecollege.net'],
    },

    // Thane & Kalyan-Dombivli
    {
      name: 'A. P. Shah Institute of Technology (APSIT)',
      city: 'Thane',
      area: 'Thane',
      emailDomains: ['apsit.edu.in'],
    },
    {
      name: 'K. C. College of Engineering and Management Studies & Research',
      city: 'Thane',
      area: 'Thane',
      emailDomains: ['kccemsr.edu.in'],
    },
    {
      name: "Vidya Prasarak Mandal's B. N. Bandodkar College of Science",
      city: 'Thane',
      area: 'Thane',
      emailDomains: ['vpmthane.org'],
    },
    {
      name: 'B. K. Birla College of Arts, Science & Commerce (Autonomous)',
      city: 'Kalyan',
      area: 'Kalyan',
      emailDomains: ['bkbirlacollegekalyan.com'],
    },
    {
      name: 'Shivajirao S. Jondhale College of Engineering',
      city: 'Dombivli',
      area: 'Dombivli',
      emailDomains: ['jondhale.org'],
    },
    {
      name: 'Model College (Autonomous)',
      city: 'Dombivli',
      area: 'Dombivli',
      emailDomains: ['model-college.edu.in'],
    },

    // Navi Mumbai: Vashi, Nerul, Belapur, Kharghar, Airoli, Panvel
    {
      name: 'Fr. C. Rodrigues Institute of Technology (FCRIT)',
      city: 'Navi Mumbai',
      area: 'Vashi',
      emailDomains: ['fcrit.ac.in'],
    },
    {
      name: 'SIES Graduate School of Technology (SIES GST)',
      city: 'Navi Mumbai',
      area: 'Nerul',
      emailDomains: ['siesgst.edu.in'],
    },
    {
      name: 'Terna Engineering College',
      city: 'Navi Mumbai',
      area: 'Nerul',
      emailDomains: ['ternaengg.ac.in'],
    },
    {
      name: 'Ramrao Adik Institute of Technology (RAIT)',
      city: 'Navi Mumbai',
      area: 'Nerul',
      emailDomains: ['dypatil.edu'],
    },
    {
      name: 'Bharati Vidyapeeth College of Engineering (BVCOE)',
      city: 'Navi Mumbai',
      area: 'Belapur',
      emailDomains: ['bvcoenm.edu.in'],
    },
    {
      name: 'Saraswati College of Engineering',
      city: 'Navi Mumbai',
      area: 'Kharghar',
      emailDomains: ['scoe.edu.in'],
    },
    {
      name: 'Datta Meghe College of Engineering (DMCE)',
      city: 'Navi Mumbai',
      area: 'Airoli',
      emailDomains: ['dmce.ac.in'],
    },
    {
      name: 'Pillai College of Engineering (PCE)',
      city: 'Navi Mumbai',
      area: 'Panvel',
      emailDomains: ['mes.ac.in', 'pce.ac.in'],
    },

    // Northern Suburbs: Mira Road, Vasai, Virar
    {
      name: 'Royal College of Arts, Science and Commerce',
      city: 'Mira-Bhayandar',
      area: 'Mira Road',
      emailDomains: ['royalcollegemiraroad.edu.in'],
    },
    {
      name: 'Universal College of Engineering (UCoE)',
      city: 'Vasai',
      area: 'Vasai',
      emailDomains: ['universalcollegeofengineering.edu.in'],
    },
    {
      name: 'Annasaheb Vartak College of Arts, Commerce and Science',
      city: 'Vasai',
      area: 'Vasai',
      emailDomains: ['avc.ac.in'],
    },
  ];

  for (const college of collegesData) {
    await prisma.college.upsert({
      where: { name: college.name },
      update: {
        city: college.city,
        area: college.area,
        emailDomains: college.emailDomains,
      },
      create: college,
    });
  }
  console.log(`✅ Seeded ${collegesData.length} MMR Colleges`);

  // 2. Seed Skills Taxonomy
  const skillsData = [
    { name: 'Flutter', category: 'Engineering' },
    { name: 'React Native', category: 'Engineering' },
    { name: 'Python', category: 'Engineering' },
    { name: 'Node.js', category: 'Engineering' },
    { name: 'Photoshop', category: 'Design' },
    { name: 'Figma', category: 'Design' },
    { name: 'UI/UX Design', category: 'Design' },
    { name: 'Badminton', category: 'Sports' },
    { name: 'Table Tennis', category: 'Sports' },
    { name: 'Calculus & Engineering Math', category: 'Academics' },
    { name: 'Financial Accounting', category: 'Academics' },
    { name: 'Video Editing (Premiere Pro)', category: 'Media' },
  ];

  for (const skill of skillsData) {
    await prisma.skill.upsert({
      where: { name: skill.name },
      update: {},
      create: skill,
    });
  }
  console.log(`✅ Seeded ${skillsData.length} Skills`);

  // 3. Seed Admin User
  const adminPasswordHash = await bcrypt.hash('Admin@SkillMate2026', 10);
  await prisma.user.upsert({
    where: { email: 'admin@skillmate.internal' },
    update: {},
    create: {
      email: 'admin@skillmate.internal',
      phone: '+919999900000',
      name: 'SkillMate Admin',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });
  console.log('✅ Seeded Admin Account (admin@skillmate.internal)');

  console.log('🌱 Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
