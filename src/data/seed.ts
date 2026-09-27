import type {
  AcademicYear,
  AuditLog,
  Batch,
  Campus,
  Department,
  DocumentRecord,
  Faculty,
  Framework,
  FrameworkCategory,
  FrameworkRequirement,
  FrameworkTask,
  FrameworkVersion,
  Institution,
  NotificationItem,
  Profile,
  Programme,
  School,
  Section,
  Student,
  UserRole,
} from '@/types'

const now = '2026-09-27T10:15:00+05:30'

export const institution: Institution = {
  id: 'inst_apex',
  name: 'Apex University',
  shortName: 'Apex',
  type: 'Private University',
  establishedYear: 2009,
  naacGrade: 'A+',
  nirfRank: 86,
  city: 'Jaipur',
  state: 'Rajasthan',
  website: 'https://apex.university',
}

export const campuses: Campus[] = [
  { id: 'camp_main', name: 'Main Campus', city: 'Jaipur', isMain: true },
  { id: 'camp_noida', name: 'NCR Campus', city: 'Noida', isMain: false },
]

export const schools: School[] = [
  { id: 'sch_eng', code: 'SOE', name: 'School of Engineering', deanName: 'Prof. Meera Iyer', campusId: 'camp_main' },
  { id: 'sch_mgmt', code: 'SOM', name: 'School of Management', deanName: 'Prof. Arvind Malhotra', campusId: 'camp_main' },
  { id: 'sch_sci', code: 'SOS', name: 'School of Sciences', deanName: 'Prof. Kavita Rao', campusId: 'camp_main' },
  { id: 'sch_law', code: 'SOL', name: 'School of Law', deanName: 'Prof. Nidhi Bansal', campusId: 'camp_noida' },
  { id: 'sch_hum', code: 'SOH', name: 'School of Humanities', deanName: 'Prof. Farhan Qureshi', campusId: 'camp_main' },
]

export const departments: Department[] = [
  { id: 'dep_cse', schoolId: 'sch_eng', code: 'CSE', name: 'Computer Science & Engineering', hodName: 'Dr. Ankit Sharma', establishedYear: 2009 },
  { id: 'dep_ece', schoolId: 'sch_eng', code: 'ECE', name: 'Electronics & Communication', hodName: 'Dr. Priya Nair', establishedYear: 2010 },
  { id: 'dep_mech', schoolId: 'sch_eng', code: 'ME', name: 'Mechanical Engineering', hodName: 'Dr. Rajesh Gupta', establishedYear: 2009 },
  { id: 'dep_mba', schoolId: 'sch_mgmt', code: 'MBA', name: 'Business Administration', hodName: 'Dr. Sonal Kapoor', establishedYear: 2011 },
  { id: 'dep_com', schoolId: 'sch_mgmt', code: 'COM', name: 'Commerce', hodName: 'Dr. Vivek Jain', establishedYear: 2012 },
  { id: 'dep_phy', schoolId: 'sch_sci', code: 'PHY', name: 'Physics', hodName: 'Dr. Leena Das', establishedYear: 2013 },
  { id: 'dep_bt', schoolId: 'sch_sci', code: 'BT', name: 'Biotechnology', hodName: 'Dr. Imran Khan', establishedYear: 2014 },
  { id: 'dep_law', schoolId: 'sch_law', code: 'LAW', name: 'Legal Studies', hodName: 'Dr. Aditi Menon', establishedYear: 2015 },
  { id: 'dep_eng', schoolId: 'sch_hum', code: 'ENG', name: 'English', hodName: 'Dr. Rohan Sethi', establishedYear: 2012 },
  { id: 'dep_psy', schoolId: 'sch_hum', code: 'PSY', name: 'Psychology', hodName: 'Dr. Neha Bhatt', establishedYear: 2016 },
]

export const academicYears: AcademicYear[] = [
  { id: 'ay_2324', label: '2023-24', startDate: '2023-07-01', endDate: '2024-06-30', isCurrent: false },
  { id: 'ay_2425', label: '2024-25', startDate: '2024-07-01', endDate: '2025-06-30', isCurrent: false },
  { id: 'ay_2526', label: '2025-26', startDate: '2025-07-01', endDate: '2026-06-30', isCurrent: true },
]

export const programmes: Programme[] = [
  { id: 'prg_btech_cse', departmentId: 'dep_cse', code: 'BTECH-CSE', name: 'B.Tech Computer Science', level: 'UG', durationYears: 4, intake: 180, isActive: true },
  { id: 'prg_btech_ai', departmentId: 'dep_cse', code: 'BTECH-AI', name: 'B.Tech Artificial Intelligence', level: 'UG', durationYears: 4, intake: 60, isActive: true },
  { id: 'prg_mtech_cse', departmentId: 'dep_cse', code: 'MTECH-CSE', name: 'M.Tech Computer Science', level: 'PG', durationYears: 2, intake: 30, isActive: true },
  { id: 'prg_phd_cse', departmentId: 'dep_cse', code: 'PHD-CSE', name: 'Ph.D Computer Science', level: 'Doctoral', durationYears: 4, intake: 12, isActive: true },
  { id: 'prg_btech_ece', departmentId: 'dep_ece', code: 'BTECH-ECE', name: 'B.Tech Electronics', level: 'UG', durationYears: 4, intake: 120, isActive: true },
  { id: 'prg_mtech_vlsi', departmentId: 'dep_ece', code: 'MTECH-VLSI', name: 'M.Tech VLSI', level: 'PG', durationYears: 2, intake: 18, isActive: true },
  { id: 'prg_btech_me', departmentId: 'dep_mech', code: 'BTECH-ME', name: 'B.Tech Mechanical', level: 'UG', durationYears: 4, intake: 120, isActive: true },
  { id: 'prg_mtech_me', departmentId: 'dep_mech', code: 'MTECH-ME', name: 'M.Tech Mechanical', level: 'PG', durationYears: 2, intake: 18, isActive: true },
  { id: 'prg_mba', departmentId: 'dep_mba', code: 'MBA', name: 'Master of Business Administration', level: 'PG', durationYears: 2, intake: 120, isActive: true },
  { id: 'prg_bba', departmentId: 'dep_mba', code: 'BBA', name: 'Bachelor of Business Administration', level: 'UG', durationYears: 3, intake: 90, isActive: true },
  { id: 'prg_bcom', departmentId: 'dep_com', code: 'BCOM', name: 'B.Com (Hons)', level: 'UG', durationYears: 3, intake: 120, isActive: true },
  { id: 'prg_mcom', departmentId: 'dep_com', code: 'MCOM', name: 'M.Com', level: 'PG', durationYears: 2, intake: 40, isActive: true },
  { id: 'prg_bsc_phy', departmentId: 'dep_phy', code: 'BSC-PHY', name: 'B.Sc Physics', level: 'UG', durationYears: 3, intake: 60, isActive: true },
  { id: 'prg_msc_phy', departmentId: 'dep_phy', code: 'MSC-PHY', name: 'M.Sc Physics', level: 'PG', durationYears: 2, intake: 24, isActive: true },
  { id: 'prg_bsc_bt', departmentId: 'dep_bt', code: 'BSC-BT', name: 'B.Sc Biotechnology', level: 'UG', durationYears: 3, intake: 60, isActive: true },
  { id: 'prg_msc_bt', departmentId: 'dep_bt', code: 'MSC-BT', name: 'M.Sc Biotechnology', level: 'PG', durationYears: 2, intake: 24, isActive: true },
  { id: 'prg_ba_llb', departmentId: 'dep_law', code: 'BA-LLB', name: 'B.A. LL.B (Hons)', level: 'UG', durationYears: 5, intake: 120, isActive: true },
  { id: 'prg_llm', departmentId: 'dep_law', code: 'LLM', name: 'LL.M', level: 'PG', durationYears: 1, intake: 30, isActive: true },
  { id: 'prg_ba_eng', departmentId: 'dep_eng', code: 'BA-ENG', name: 'B.A. English', level: 'UG', durationYears: 3, intake: 60, isActive: true },
  { id: 'prg_ma_psy', departmentId: 'dep_psy', code: 'MA-PSY', name: 'M.A. Psychology', level: 'PG', durationYears: 2, intake: 30, isActive: true },
]

export const batches: Batch[] = programmes.flatMap((p, i) => [
  { id: `bat_${p.id}_24`, programmeId: p.id, academicYearId: 'ay_2425', year: 2024, label: `${p.code} 2024` },
  { id: `bat_${p.id}_25`, programmeId: p.id, academicYearId: 'ay_2526', year: 2025, label: `${p.code} 2025` },
  ...(i < 8 ? [{ id: `bat_${p.id}_23`, programmeId: p.id, academicYearId: 'ay_2324', year: 2023, label: `${p.code} 2023` }] : []),
])

export const sections: Section[] = batches.slice(0, 24).map((b, i) => ({
  id: `sec_${b.id}_a`,
  batchId: b.id,
  name: i % 2 === 0 ? 'A' : 'B',
}))

const firstNames = ['Rahul', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Ananya', 'Rohit', 'Isha', 'Kunal', 'Meera', 'Aditya', 'Pooja', 'Siddharth', 'Kavya', 'Arjun', 'Nisha', 'Harsh', 'Divya', 'Yash', 'Riya']
const lastNames = ['Sharma', 'Patel', 'Singh', 'Reddy', 'Nair', 'Gupta', 'Khan', 'Iyer', 'Verma', 'Das', 'Joshi', 'Mehta', 'Kapoor', 'Bose', 'Malhotra']
const categories = ['General', 'OBC', 'SC', 'ST', 'EWS']
const states = ['Rajasthan', 'Delhi', 'Maharashtra', 'Karnataka', 'Uttar Pradesh', 'Gujarat', 'Tamil Nadu', 'West Bengal']
const genders = ['male', 'female'] as const

function pad(n: number, w = 4) {
  return String(n).padStart(w, '0')
}

export const students: Student[] = Array.from({ length: 100 }, (_, i) => {
  const programme = programmes[i % programmes.length]
  const dept = departments.find((d) => d.id === programme.departmentId)!
  const school = schools.find((s) => s.id === dept.schoolId)!
  const batchYear = i % 3 === 0 ? 2023 : i % 3 === 1 ? 2024 : 2025
  const batch = batches.find((b) => b.programmeId === programme.id && b.year === batchYear) ?? batches.find((b) => b.programmeId === programme.id)!
  const fn = firstNames[i % firstNames.length]
  const ln = lastNames[i % lastNames.length]
  const gender = genders[i % 2]
  const category = categories[i % categories.length]
  const status = i % 17 === 0 ? 'graduated' : i % 29 === 0 ? 'inactive' : 'active'
  const international = i % 23 === 0
  return {
    id: `stu_${pad(i + 1)}`,
    registrationId: `AU${batchYear}${pad(i + 101, 5)}`,
    applicationNumber: `APP${batchYear}${pad(i + 501, 5)}`,
    universityRollNumber: `${batchYear}${programme.code.slice(0, 3)}${pad(i + 1, 3)}`,
    fullName: `${fn} ${ln}`,
    email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i + 1}@apex.edu`,
    phone: `98${String(70000000 + i * 137).slice(0, 8)}`,
    gender,
    dateOfBirth: `${2002 - (batchYear === 2023 ? 1 : 0)}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}`,
    nationality: international ? (i % 2 === 0 ? 'Nepal' : 'Bangladesh') : 'India',
    programmeId: programme.id,
    departmentId: dept.id,
    schoolId: school.id,
    batchId: batch.id,
    sectionId: sections.find((s) => s.batchId === batch.id)?.id,
    academicYearId: 'ay_2526',
    currentYear: programme.level === 'UG' ? (i % 4) + 1 : (i % 2) + 1,
    currentTerm: i % 2 === 0 ? 'Odd' : 'Even',
    studentStatus: status,
    academicStatus: i % 11 === 0 ? 'lateral' : 'regular',
    admissionType: i % 9 === 0 ? 'Management' : 'Merit',
    workflow: i % 13 === 0 ? 'submitted' : 'approved',
    isArchived: false,
    personal: {
      firstName: fn,
      lastName: ln,
      religion: i % 5 === 0 ? 'Hindu' : undefined,
      bloodGroup: ['A+', 'B+', 'O+', 'AB+'][i % 4],
      firstGeneration: i % 8 === 0,
      differentlyAbled: i % 31 === 0,
      ews: category === 'EWS',
      domicileState: states[i % states.length],
      category,
    },
    academic: {
      cgpa: Number((6.4 + (i % 35) / 10).toFixed(2)),
      percentage: Number((62 + (i % 32)).toFixed(1)),
      backlogs: i % 7 === 0 ? (i % 3) + 1 : 0,
      admissionDate: `${batchYear}-07-15`,
      expectedGraduation: `${batchYear + Math.ceil(programme.durationYears)}-06-30`,
    },
    contact: {
      personalEmail: `${fn.toLowerCase()}${i}@gmail.com`,
      alternatePhone: i % 4 === 0 ? undefined : `99${String(80000000 + i * 91).slice(0, 8)}`,
      emergencyContactName: `${ln} Parent`,
      emergencyContactPhone: `97${String(60000000 + i * 53).slice(0, 8)}`,
    },
    addresses: [
      { type: 'permanent', line1: `${12 + i} Civil Lines`, city: states[i % states.length] === 'Rajasthan' ? 'Jaipur' : 'Delhi', state: states[i % states.length], pincode: `30${pad(i + 12, 4)}` },
      { type: 'present', line1: `Hostel Block ${(i % 6) + 1}`, city: 'Jaipur', state: 'Rajasthan', pincode: '302017' },
    ],
    family: {
      fatherName: i % 6 === 0 ? undefined : `${lastNames[(i + 3) % lastNames.length]} ${ln}`,
      fatherOccupation: 'Service',
      motherName: `${firstNames[(i + 4) % firstNames.length]} ${ln}`,
      motherOccupation: i % 5 === 0 ? 'Homemaker' : 'Teacher',
      annualIncome: 400000 + (i % 12) * 80000,
    },
    qualifications: [
      { level: '10th', boardUniversity: 'CBSE', yearOfPassing: batchYear - 6, percentage: 78 + (i % 18) },
      { level: '12th', boardUniversity: 'CBSE', yearOfPassing: batchYear - 4, percentage: 74 + (i % 20) },
    ],
    entranceExams: programme.level === 'UG' && school.id === 'sch_eng'
      ? [{ examName: 'JEE Main', score: 84 + (i % 15), rank: 12000 + i * 37, year: batchYear }]
      : programme.id === 'prg_mba'
        ? [{ examName: 'CAT', score: 72 + (i % 20), year: batchYear }]
        : [],
    mentor: { name: 'Dr. Ankit Sharma', email: 'ankit.sharma@apex.edu', phone: '9876500001' },
    sensitive: i % 4 === 0
      ? undefined
      : { aadhaar: `23451234${pad(i + 11, 4)}`, pan: `ABCDE${pad(i + 1000, 4)}F`, bankAccount: `10020030${pad(i, 4)}`, ifsc: 'SBIN0001234', abcId: i % 5 === 0 ? undefined : `ABC${pad(i + 900, 6)}` },
    createdAt: now,
    updatedAt: now,
  } satisfies Student
})

const designations = ['Professor', 'Associate Professor', 'Assistant Professor', 'Professor', 'Assistant Professor']
export const faculty: Faculty[] = Array.from({ length: 20 }, (_, i) => {
  const dept = departments[i % departments.length]
  const school = schools.find((s) => s.id === dept.schoolId)!
  const fn = firstNames[(i + 7) % firstNames.length]
  const ln = lastNames[(i + 2) % lastNames.length]
  return {
    id: `fac_${pad(i + 1)}`,
    employeeId: `EMP${pad(i + 201, 4)}`,
    fullName: `Dr. ${fn} ${ln}`,
    email: `${fn.toLowerCase()}.${ln.toLowerCase()}@apex.edu`,
    phone: `98111${pad(i + 20, 5)}`,
    gender: i % 3 === 0 ? 'female' : 'male',
    dateOfBirth: `${1974 + (i % 18)}-05-${String((i % 27) + 1).padStart(2, '0')}`,
    schoolId: school.id,
    departmentId: dept.id,
    designation: designations[i % designations.length],
    employmentType: i % 9 === 0 ? 'contract' : 'permanent',
    joiningDate: `${2012 + (i % 10)}-07-01`,
    highestQualification: i % 4 === 0 ? 'Post-Doc' : 'Ph.D',
    specialization: ['Machine Learning', 'VLSI', 'Thermal', 'Finance', 'Marketing', 'Condensed Matter', 'Genetics', 'Constitutional Law', 'Linguistics', 'Clinical Psychology'][i % 10],
    orcid: `0000-0002-11${pad(i, 2)}-${pad(i * 3, 4)}`,
    googleScholar: `scholar.google/${fn.toLowerCase()}${i}`,
    scopusId: `55${pad(i + 1000, 8)}`,
    teachingExperienceYears: 8 + (i % 14),
    researchExperienceYears: 4 + (i % 10),
    isActive: i !== 18,
    workflow: 'approved',
    qualifications: [
      { degree: 'Ph.D', specialization: 'Core', university: 'IIT Delhi', year: 2010 + (i % 8) },
      { degree: 'M.Tech / M.A.', specialization: 'Core', university: 'University of Delhi', year: 2006 + (i % 6) },
    ],
    publications: [
      { title: `Institutional study ${i + 1} on applied research`, journal: 'Apex Journal', year: 2023 + (i % 3), indexedIn: i % 2 === 0 ? 'Scopus' : 'WoS' },
    ],
    projects: i % 3 === 0
      ? [{ title: `DST project ${i + 1}`, fundingAgency: 'DST', amount: 1200000 + i * 50000, year: 2024, status: 'Ongoing' }]
      : [],
    patents: i % 5 === 0 ? [{ title: `Method ${i + 1}`, patentNumber: `IN${2024}${pad(i, 4)}`, year: 2024, status: 'Published' }] : [],
    createdAt: now,
    updatedAt: now,
  } satisfies Faculty
})

export const demoUsers: Array<Profile & { password: string }> = [
  { id: 'usr_super', email: 'super.admin@apex.edu', fullName: 'Kiran Joshi', role: 'super_admin', isActive: true, password: 'Portal@2026' },
  { id: 'usr_iqac', email: 'iqac.admin@apex.edu', fullName: 'Dr. Sunita Rao', role: 'iqac_admin', isActive: true, password: 'Portal@2026' },
  { id: 'usr_viewer', email: 'iqac.viewer@apex.edu', fullName: 'Asha Pillai', role: 'iqac_viewer', isActive: true, password: 'Portal@2026' },
  { id: 'usr_reg', email: 'registrar@apex.edu', fullName: 'Ramesh Kulkarni', role: 'registrar', isActive: true, password: 'Portal@2026' },
  { id: 'usr_dean', email: 'dean.eng@apex.edu', fullName: 'Prof. Meera Iyer', role: 'dean', schoolId: 'sch_eng', isActive: true, password: 'Portal@2026' },
  { id: 'usr_hod', email: 'hod.cse@apex.edu', fullName: 'Dr. Ankit Sharma', role: 'hod', schoolId: 'sch_eng', departmentId: 'dep_cse', isActive: true, password: 'Portal@2026' },
  { id: 'usr_fac', email: 'faculty.cse@apex.edu', fullName: 'Dr. Priya Nair', role: 'faculty', schoolId: 'sch_eng', departmentId: 'dep_cse', isActive: true, password: 'Portal@2026' },
  { id: 'usr_entry', email: 'data.entry@apex.edu', fullName: 'Manoj Yadav', role: 'data_entry', isActive: true, password: 'Portal@2026' },
  { id: 'usr_ver', email: 'verifier@apex.edu', fullName: 'Lakshmi Krishnan', role: 'verifier', isActive: true, password: 'Portal@2026' },
  { id: 'usr_aud', email: 'auditor@apex.edu', fullName: 'Deepak Banerjee', role: 'auditor', isActive: true, password: 'Portal@2026' },
]

export const frameworks: Framework[] = [
  { id: 'fw_naac', code: 'NAAC', name: 'NAAC', description: 'National Assessment and Accreditation Council', isActive: true },
  { id: 'fw_nirf', code: 'NIRF', name: 'NIRF', description: 'National Institutional Ranking Framework', isActive: true },
  { id: 'fw_nba', code: 'NBA', name: 'NBA', description: 'National Board of Accreditation', isActive: true },
  { id: 'fw_qs', code: 'QS', name: 'QS', description: 'QS World University Rankings', isActive: true },
  { id: 'fw_the', code: 'THE', name: 'THE', description: 'Times Higher Education Rankings', isActive: true },
  { id: 'fw_sus', code: 'SUS', name: 'Sustainability', description: 'Sustainability and green rankings', isActive: true },
]

export const frameworkVersions: FrameworkVersion[] = frameworks.map((f) => ({
  id: `fv_${f.code}_2026`,
  frameworkId: f.id,
  versionLabel: `${f.code} 2026`,
  academicYearId: 'ay_2526',
  isCurrent: true,
}))

export const frameworkCategories: FrameworkCategory[] = [
  { id: 'nc1', frameworkVersionId: 'fv_NAAC_2026', code: 'C1', name: 'Curricular Aspects', weight: 15, sortOrder: 1 },
  { id: 'nc2', frameworkVersionId: 'fv_NAAC_2026', code: 'C2', name: 'Teaching-Learning & Evaluation', weight: 20, sortOrder: 2 },
  { id: 'nc3', frameworkVersionId: 'fv_NAAC_2026', code: 'C3', name: 'Research, Innovations & Extension', weight: 25, sortOrder: 3 },
  { id: 'nc4', frameworkVersionId: 'fv_NAAC_2026', code: 'C4', name: 'Infrastructure & Learning Resources', weight: 10, sortOrder: 4 },
  { id: 'nc5', frameworkVersionId: 'fv_NAAC_2026', code: 'C5', name: 'Student Support & Progression', weight: 10, sortOrder: 5 },
  { id: 'nc6', frameworkVersionId: 'fv_NAAC_2026', code: 'C6', name: 'Governance, Leadership & Management', weight: 10, sortOrder: 6 },
  { id: 'nc7', frameworkVersionId: 'fv_NAAC_2026', code: 'C7', name: 'Institutional Values & Best Practices', weight: 10, sortOrder: 7 },
  { id: 'nr1', frameworkVersionId: 'fv_NIRF_2026', code: 'TLR', name: 'Teaching, Learning & Resources', weight: 30, sortOrder: 1 },
  { id: 'nr2', frameworkVersionId: 'fv_NIRF_2026', code: 'RPC', name: 'Research & Professional Practice', weight: 30, sortOrder: 2 },
  { id: 'nr3', frameworkVersionId: 'fv_NIRF_2026', code: 'GO', name: 'Graduation Outcomes', weight: 20, sortOrder: 3 },
  { id: 'nr4', frameworkVersionId: 'fv_NIRF_2026', code: 'OI', name: 'Outreach & Inclusivity', weight: 10, sortOrder: 4 },
  { id: 'nr5', frameworkVersionId: 'fv_NIRF_2026', code: 'PR', name: 'Perception', weight: 10, sortOrder: 5 },
  { id: 'nb1', frameworkVersionId: 'fv_NBA_2026', code: 'C1', name: 'Vision, Mission & PEOs', weight: 10, sortOrder: 1 },
  { id: 'nb2', frameworkVersionId: 'fv_NBA_2026', code: 'C2', name: 'Programme Curriculum', weight: 15, sortOrder: 2 },
  { id: 'nb3', frameworkVersionId: 'fv_NBA_2026', code: 'C3', name: 'Course Outcomes', weight: 15, sortOrder: 3 },
  { id: 'qs1', frameworkVersionId: 'fv_QS_2026', code: 'AR', name: 'Academic Reputation', weight: 30, sortOrder: 1 },
  { id: 'qs2', frameworkVersionId: 'fv_QS_2026', code: 'FR', name: 'Faculty/Student Ratio', weight: 20, sortOrder: 2 },
  { id: 'the1', frameworkVersionId: 'fv_THE_2026', code: 'TE', name: 'Teaching', weight: 30, sortOrder: 1 },
  { id: 'the2', frameworkVersionId: 'fv_THE_2026', code: 'RE', name: 'Research', weight: 30, sortOrder: 2 },
  { id: 'su1', frameworkVersionId: 'fv_SUS_2026', code: 'SDG', name: 'SDG Alignment', weight: 40, sortOrder: 1 },
]

export const frameworkRequirements: FrameworkRequirement[] = [
  { id: 'req_n_stu', frameworkVersionId: 'fv_NAAC_2026', categoryId: 'nc2', indicatorCode: '2.1.1', title: 'Number of students enrolled', requirementType: 'data', sourceTable: 'students', filters: { academicYear: '2025-26', studentStatus: 'active' }, formula: 'COUNT(active students)', responsibleDepartmentId: 'dep_cse', dataOwnerName: 'Registrar', dueDate: '2026-10-15', status: 'verified', lastUpdatedAt: '2026-09-20T11:00:00+05:30', verifiedBy: 'Lakshmi Krishnan', verifiedAt: '2026-09-21T10:00:00+05:30', computedValue: '92', progress: 100 },
  { id: 'req_n_sfr', frameworkVersionId: 'fv_NAAC_2026', categoryId: 'nc2', indicatorCode: '2.2.1', title: 'Student–faculty ratio', requirementType: 'data', sourceTable: 'students,faculty', filters: { academicYear: '2025-26' }, formula: 'Total Students / Total Faculty', dataOwnerName: 'IQAC', dueDate: '2026-10-20', status: 'approved', lastUpdatedAt: '2026-09-22T09:00:00+05:30', verifiedBy: 'Dr. Sunita Rao', computedValue: '5.00', progress: 100 },
  { id: 'req_n_phd', frameworkVersionId: 'fv_NAAC_2026', categoryId: 'nc3', indicatorCode: '3.2.1', title: 'Faculty with Ph.D', requirementType: 'both', sourceTable: 'faculty', filters: { highestQualification: 'Ph.D' }, formula: 'COUNT(faculty where qualification in Ph.D, Post-Doc)', responsibleDepartmentId: 'dep_cse', dataOwnerName: 'HOD CSE', dueDate: '2026-10-30', status: 'data_collection', lastUpdatedAt: '2026-09-18T16:00:00+05:30', computedValue: '20', progress: 55 },
  { id: 'req_n_pub', frameworkVersionId: 'fv_NAAC_2026', categoryId: 'nc3', indicatorCode: '3.4.3', title: 'Number of research publications', requirementType: 'document', sourceTable: 'faculty_publications', filters: { year: '2024-26' }, responsibleDepartmentId: 'dep_cse', dataOwnerName: 'Research Cell', dueDate: '2026-11-05', status: 'submitted', lastUpdatedAt: '2026-09-25T12:00:00+05:30', computedValue: '20', progress: 74 },
  { id: 'req_n_infra', frameworkVersionId: 'fv_NAAC_2026', categoryId: 'nc4', indicatorCode: '4.1.2', title: 'Infrastructure evidence pack', requirementType: 'document', filters: {}, dataOwnerName: 'Estate Office', dueDate: '2026-11-10', status: 'under_review', progress: 63 },
  { id: 'req_n_ss', frameworkVersionId: 'fv_NAAC_2026', categoryId: 'nc5', indicatorCode: '5.1.1', title: 'Scholarship and support data', requirementType: 'both', sourceTable: 'students', filters: { ews: 'true' }, dataOwnerName: 'Student Welfare', dueDate: '2026-10-28', status: 'needs_revision', comments: 'Category-wise breakup required.', progress: 40 },
  { id: 'req_n_gov', frameworkVersionId: 'fv_NAAC_2026', categoryId: 'nc6', indicatorCode: '6.2.1', title: 'Strategic plan document', requirementType: 'document', filters: {}, dataOwnerName: 'IQAC', dueDate: '2026-12-01', status: 'not_started', progress: 10 },
  { id: 'req_ir_enr', frameworkVersionId: 'fv_NIRF_2026', categoryId: 'nr1', indicatorCode: 'SS', title: 'Number of enrolled students', requirementType: 'data', sourceTable: 'students', filters: { academicYear: '2025-26', studentStatus: 'active' }, formula: 'COUNT(active students)', dataOwnerName: 'Registrar', dueDate: '2025-12-31', status: 'verified', verifiedBy: 'Lakshmi Krishnan', computedValue: '92', progress: 100 },
  { id: 'req_ir_fac', frameworkVersionId: 'fv_NIRF_2026', categoryId: 'nr1', indicatorCode: 'FSR', title: 'Faculty strength', requirementType: 'data', sourceTable: 'faculty', filters: { isActive: 'true' }, formula: 'COUNT(active faculty)', dataOwnerName: 'HR', status: 'approved', computedValue: '19', progress: 100 },
  { id: 'req_ir_int', frameworkVersionId: 'fv_NIRF_2026', categoryId: 'nr4', indicatorCode: 'OI', title: 'International students', requirementType: 'data', sourceTable: 'students', filters: { nationality: 'not:India' }, formula: "COUNT(nationality != India)", dataOwnerName: 'International Office', status: 'data_collection', computedValue: '5', progress: 48 },
  { id: 'req_nba_peo', frameworkVersionId: 'fv_NBA_2026', categoryId: 'nb1', indicatorCode: 'C1', title: 'PEO attainment evidence', requirementType: 'document', filters: {}, responsibleDepartmentId: 'dep_cse', dataOwnerName: 'HOD CSE', status: 'submitted', progress: 70 },
  { id: 'req_qs_sfr', frameworkVersionId: 'fv_QS_2026', categoryId: 'qs2', indicatorCode: 'FSR', title: 'Faculty/student ratio', requirementType: 'data', sourceTable: 'students,faculty', filters: {}, formula: 'Total Students / Total Faculty', dataOwnerName: 'IQAC', status: 'verified', computedValue: '5.00', progress: 90 },
  { id: 'req_the_teach', frameworkVersionId: 'fv_THE_2026', categoryId: 'the1', indicatorCode: 'TE', title: 'Teaching reputation dataset', requirementType: 'both', filters: {}, dataOwnerName: 'IQAC', status: 'data_collection', progress: 35 },
  { id: 'req_sus_sdg', frameworkVersionId: 'fv_SUS_2026', categoryId: 'su1', indicatorCode: 'SDG4', title: 'SDG 4 evidence pack', requirementType: 'document', filters: {}, dataOwnerName: 'Sustainability Cell', status: 'not_started', progress: 12 },
]

export const frameworkTasks: FrameworkTask[] = [
  { id: 'task_1', requirementId: 'req_n_phd', title: 'Collect Faculty PhD Data', assignedTo: 'Dr. Ankit Sharma', departmentId: 'dep_cse', dueDate: '2026-10-15', status: 'in_progress' },
  { id: 'task_2', requirementId: 'req_n_ss', title: 'Revise scholarship category breakup', assignedTo: 'Manoj Yadav', dueDate: '2026-10-05', status: 'open' },
  { id: 'task_3', requirementId: 'req_n_infra', title: 'Upload campus infrastructure photos', assignedTo: 'Estate Office', dueDate: '2026-10-12', status: 'in_progress' },
  { id: 'task_4', requirementId: 'req_ir_int', title: 'Reconcile international student list', assignedTo: 'Asha Pillai', dueDate: '2026-10-08', status: 'open' },
]

export const documents: DocumentRecord[] = [
  { id: 'doc_ar', title: 'Annual Report 2025-26', documentType: 'Annual Report', departmentId: undefined, ownerName: 'IQAC Office', academicYearId: 'ay_2526', documentDate: '2026-08-01', status: 'verified', description: 'Institution annual report used across NAAC, NIRF and QS.', tags: ['annual', 'institutional'], currentVersion: 2, versions: [{ version: 1, fileName: 'annual-report-2025-draft.pdf', uploadedBy: 'Dr. Sunita Rao', uploadedAt: '2026-07-12T10:00:00+05:30', changeReason: 'Draft', sizeKb: 2400 }, { version: 2, fileName: 'annual-report-2025-26.pdf', uploadedBy: 'Dr. Sunita Rao', uploadedAt: '2026-08-01T16:20:00+05:30', changeReason: 'Board approved version', sizeKb: 2680 }], linkedRequirementIds: ['req_n_stu', 'req_ir_enr', 'req_qs_sfr'], createdAt: '2026-08-01T16:20:00+05:30' },
  { id: 'doc_ssr', title: 'NAAC SSR Draft – Criterion 2', documentType: 'SSR', ownerName: 'IQAC Office', academicYearId: 'ay_2526', documentDate: '2026-09-10', status: 'submitted', description: 'Self-study report extract for teaching-learning.', tags: ['naac', 'ssr'], currentVersion: 1, versions: [{ version: 1, fileName: 'ssr-c2.docx', uploadedBy: 'Asha Pillai', uploadedAt: '2026-09-10T09:00:00+05:30', sizeKb: 880 }], linkedRequirementIds: ['req_n_stu', 'req_n_sfr'], createdAt: '2026-09-10T09:00:00+05:30' },
  { id: 'doc_phd', title: 'Faculty Ph.D Certificates Bundle', documentType: 'Certificate', departmentId: 'dep_cse', ownerName: 'Dr. Ankit Sharma', academicYearId: 'ay_2526', documentDate: '2026-09-18', expiryDate: '2027-09-18', status: 'submitted', description: 'Scanned Ph.D certificates for CSE faculty.', tags: ['faculty', 'qualification'], currentVersion: 1, versions: [{ version: 1, fileName: 'cse-phd-bundle.pdf', uploadedBy: 'Dr. Ankit Sharma', uploadedAt: '2026-09-18T14:00:00+05:30', sizeKb: 5400 }], linkedRequirementIds: ['req_n_phd'], createdAt: '2026-09-18T14:00:00+05:30' },
  { id: 'doc_infra', title: 'Infrastructure Photographs 2025-26', documentType: 'Photograph', ownerName: 'Estate Office', academicYearId: 'ay_2526', documentDate: '2026-06-20', status: 'submitted', description: 'Labs, library, hostels and sports facilities.', tags: ['infrastructure'], currentVersion: 1, versions: [{ version: 1, fileName: 'infra-pack.zip', uploadedBy: 'Manoj Yadav', uploadedAt: '2026-06-20T11:00:00+05:30', sizeKb: 18000 }], linkedRequirementIds: ['req_n_infra'], createdAt: '2026-06-20T11:00:00+05:30' },
  { id: 'doc_pol', title: 'Research Promotion Policy', documentType: 'Policy', ownerName: 'Research Cell', academicYearId: 'ay_2526', documentDate: '2025-01-15', expiryDate: '2026-12-31', status: 'approved', description: 'Approved research incentive policy.', tags: ['policy', 'research'], currentVersion: 3, versions: [{ version: 1, fileName: 'rpp-v1.pdf', uploadedBy: 'Dr. Sunita Rao', uploadedAt: '2024-01-10T10:00:00+05:30', sizeKb: 420 }, { version: 2, fileName: 'rpp-v2.pdf', uploadedBy: 'Dr. Sunita Rao', uploadedAt: '2025-01-15T10:00:00+05:30', changeReason: 'Incentive revision', sizeKb: 460 }, { version: 3, fileName: 'rpp-v3.pdf', uploadedBy: 'Dr. Sunita Rao', uploadedAt: '2026-01-12T10:00:00+05:30', changeReason: 'Board amendment', sizeKb: 480 }], linkedRequirementIds: ['req_n_pub'], createdAt: '2026-01-12T10:00:00+05:30' },
  { id: 'doc_green', title: 'Green Campus Audit', documentType: 'Audit Report', ownerName: 'Sustainability Cell', academicYearId: 'ay_2526', documentDate: '2026-04-02', expiryDate: '2026-10-02', status: 'expired', description: 'Third-party green audit; renewal pending.', tags: ['sustainability'], currentVersion: 1, versions: [{ version: 1, fileName: 'green-audit-2026.pdf', uploadedBy: 'Asha Pillai', uploadedAt: '2026-04-02T12:00:00+05:30', sizeKb: 1500 }], linkedRequirementIds: ['req_sus_sdg'], createdAt: '2026-04-02T12:00:00+05:30' },
  { id: 'doc_nba', title: 'NBA SAR – CSE', documentType: 'SAR', departmentId: 'dep_cse', ownerName: 'Dr. Ankit Sharma', academicYearId: 'ay_2526', documentDate: '2026-09-01', status: 'draft', description: 'Self-assessment report for CSE NBA cycle.', tags: ['nba', 'cse'], currentVersion: 1, versions: [{ version: 1, fileName: 'nba-sar-cse.docx', uploadedBy: 'Dr. Ankit Sharma', uploadedAt: '2026-09-01T18:00:00+05:30', sizeKb: 2100 }], linkedRequirementIds: ['req_nba_peo'], createdAt: '2026-09-01T18:00:00+05:30' },
  { id: 'doc_int', title: 'International Students Register', documentType: 'Register', ownerName: 'International Office', academicYearId: 'ay_2526', documentDate: '2026-08-20', status: 'submitted', description: 'Passport and enrolment evidence for non-Indian students.', tags: ['international'], currentVersion: 1, versions: [{ version: 1, fileName: 'intl-register.xlsx', uploadedBy: 'Manoj Yadav', uploadedAt: '2026-08-20T11:30:00+05:30', sizeKb: 220 }], linkedRequirementIds: ['req_ir_int'], createdAt: '2026-08-20T11:30:00+05:30' },
]

export const auditLogs: AuditLog[] = [
  { id: 'aud_1', actorName: 'Dr. Sunita Rao', actorRole: 'iqac_admin', action: 'Updated student record', entity: 'Student', entityId: 'AU2025105', oldValue: 'Programme = BCA', newValue: 'Programme = B.Tech CSE', reason: 'Correction received from department', ipAddress: '10.12.4.22', createdAt: '2026-09-27T15:42:00+05:30' },
  { id: 'aud_2', actorName: 'Manoj Yadav', actorRole: 'data_entry', action: 'Imported student file', entity: 'Import', entityId: 'imp_seed', oldValue: '', newValue: '100 rows committed', reason: 'Annual refresh', ipAddress: '10.12.4.40', createdAt: '2026-09-20T09:12:00+05:30' },
  { id: 'aud_3', actorName: 'Lakshmi Krishnan', actorRole: 'verifier', action: 'Verified requirement', entity: 'Requirement', entityId: 'req_n_stu', oldValue: 'submitted', newValue: 'verified', reason: 'Counts match registrar extract', ipAddress: '10.12.4.18', createdAt: '2026-09-21T10:00:00+05:30' },
  { id: 'aud_4', actorName: 'Dr. Ankit Sharma', actorRole: 'hod', action: 'Uploaded document', entity: 'Document', entityId: 'doc_phd', newValue: 'cse-phd-bundle.pdf v1', ipAddress: '10.12.5.9', createdAt: '2026-09-18T14:00:00+05:30' },
  { id: 'aud_5', actorName: 'Dr. Sunita Rao', actorRole: 'iqac_admin', action: 'Requested revision', entity: 'Requirement', entityId: 'req_n_ss', oldValue: 'submitted', newValue: 'needs_revision', reason: 'Category-wise breakup missing', ipAddress: '10.12.4.22', createdAt: '2026-09-26T11:20:00+05:30' },
]

export const notifications: NotificationItem[] = [
  { id: 'nt_1', title: 'Document expiring', body: 'Green Campus Audit expires on 02 Oct 2026.', isRead: false, link: '/documents', createdAt: '2026-09-27T08:00:00+05:30' },
  { id: 'nt_2', title: 'Verification pending', body: 'Infrastructure evidence pack is under review.', isRead: false, link: '/accreditation/NAAC', createdAt: '2026-09-26T16:40:00+05:30' },
  { id: 'nt_3', title: 'Data correction requested', body: 'Scholarship and support data needs revision.', isRead: false, link: '/accreditation/NAAC/req_n_ss', createdAt: '2026-09-26T11:21:00+05:30' },
  { id: 'nt_4', title: 'Import completed', body: 'Student annual refresh committed 100 records.', isRead: true, link: '/data/import', createdAt: '2026-09-20T09:15:00+05:30' },
]

export const roleCatalog: Array<{ role: UserRole; description: string }> = [
  { role: 'super_admin', description: 'Full system access including configuration and user management.' },
  { role: 'iqac_admin', description: 'Manages accreditation data, documents, imports and verification.' },
  { role: 'iqac_viewer', description: 'Read-only institutional access.' },
  { role: 'registrar', description: 'Institution-level student and academic data access, including sensitive fields.' },
  { role: 'dean', description: 'School-level access to students, faculty, programmes and tasks.' },
  { role: 'hod', description: 'Department-level access only.' },
  { role: 'faculty', description: 'Own profile plus department read access.' },
  { role: 'data_entry', description: 'Can enter and import assigned datasets.' },
  { role: 'verifier', description: 'Can verify submitted data and documents.' },
  { role: 'auditor', description: 'Read-only access plus audit logs.' },
]
