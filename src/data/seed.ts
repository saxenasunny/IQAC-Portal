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
  Programme,
  School,
  Section,
  Student,
  UserRole,
} from '@/types'

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
  { id: 'sch_eng', code: 'SOE', name: 'School of Engineering', deanName: '', campusId: 'camp_main' },
  { id: 'sch_mgmt', code: 'SOM', name: 'School of Management', deanName: '', campusId: 'camp_main' },
  { id: 'sch_sci', code: 'SOS', name: 'School of Sciences', deanName: '', campusId: 'camp_main' },
  { id: 'sch_law', code: 'SOL', name: 'School of Law', deanName: '', campusId: 'camp_noida' },
  { id: 'sch_hum', code: 'SOH', name: 'School of Humanities', deanName: '', campusId: 'camp_main' },
]

export const departments: Department[] = [
  { id: 'dep_cse', schoolId: 'sch_eng', code: 'CSE', name: 'Computer Science & Engineering', hodName: '' },
  { id: 'dep_ece', schoolId: 'sch_eng', code: 'ECE', name: 'Electronics & Communication', hodName: '' },
  { id: 'dep_mech', schoolId: 'sch_eng', code: 'ME', name: 'Mechanical Engineering', hodName: '' },
  { id: 'dep_mba', schoolId: 'sch_mgmt', code: 'MBA', name: 'Business Administration', hodName: '' },
  { id: 'dep_com', schoolId: 'sch_mgmt', code: 'COM', name: 'Commerce', hodName: '' },
  { id: 'dep_phy', schoolId: 'sch_sci', code: 'PHY', name: 'Physics', hodName: '' },
  { id: 'dep_bt', schoolId: 'sch_sci', code: 'BT', name: 'Biotechnology', hodName: '' },
  { id: 'dep_law', schoolId: 'sch_law', code: 'LAW', name: 'Legal Studies', hodName: '' },
  { id: 'dep_eng', schoolId: 'sch_hum', code: 'ENG', name: 'English', hodName: '' },
  { id: 'dep_psy', schoolId: 'sch_hum', code: 'PSY', name: 'Psychology', hodName: '' },
  { id: 'dep_ses', schoolId: 'sch_eng', code: 'SES', name: 'School of Engineering & Sciences', hodName: '' },
]

export const academicYears: AcademicYear[] = [
  { id: 'ay_2324', label: '2023-24', startDate: '2023-07-01', endDate: '2024-06-30', isCurrent: false },
  { id: 'ay_2425', label: '2024-25', startDate: '2024-07-01', endDate: '2025-06-30', isCurrent: false },
  { id: 'ay_2526', label: '2025-26', startDate: '2025-07-01', endDate: '2026-06-30', isCurrent: true },
]

export const programmes: Programme[] = [
  { id: 'prg_btech_cse', departmentId: 'dep_cse', code: 'BTECH-CSE', name: 'B.Tech Computer Science', level: 'UG', isActive: true },
  { id: 'prg_btech_ai', departmentId: 'dep_cse', code: 'BTECH-AI', name: 'B.Tech Artificial Intelligence', level: 'UG', isActive: true },
  { id: 'prg_mtech_cse', departmentId: 'dep_cse', code: 'MTECH-CSE', name: 'M.Tech Computer Science', level: 'PG', isActive: true },
  { id: 'prg_phd_cse', departmentId: 'dep_cse', code: 'PHD-CSE', name: 'Ph.D Computer Science', level: 'Doctoral', isActive: true },
  { id: 'prg_btech_ece', departmentId: 'dep_ece', code: 'BTECH-ECE', name: 'B.Tech Electronics', level: 'UG', isActive: true },
  { id: 'prg_mtech_vlsi', departmentId: 'dep_ece', code: 'MTECH-VLSI', name: 'M.Tech VLSI', level: 'PG', isActive: true },
  { id: 'prg_btech_me', departmentId: 'dep_mech', code: 'BTECH-ME', name: 'B.Tech Mechanical', level: 'UG', isActive: true },
  { id: 'prg_mtech_me', departmentId: 'dep_mech', code: 'MTECH-ME', name: 'M.Tech Mechanical', level: 'PG', isActive: true },
  { id: 'prg_mba', departmentId: 'dep_mba', code: 'MBA', name: 'Master of Business Administration', level: 'PG', isActive: true },
  { id: 'prg_bba', departmentId: 'dep_mba', code: 'BBA', name: 'Bachelor of Business Administration', level: 'UG', isActive: true },
  { id: 'prg_bcom', departmentId: 'dep_com', code: 'BCOM', name: 'B.Com (Hons)', level: 'UG', isActive: true },
  { id: 'prg_mcom', departmentId: 'dep_com', code: 'MCOM', name: 'M.Com', level: 'PG', isActive: true },
  { id: 'prg_bsc_phy', departmentId: 'dep_phy', code: 'BSC-PHY', name: 'B.Sc Physics', level: 'UG', isActive: true },
  { id: 'prg_msc_phy', departmentId: 'dep_phy', code: 'MSC-PHY', name: 'M.Sc Physics', level: 'PG', isActive: true },
  { id: 'prg_bsc_bt', departmentId: 'dep_bt', code: 'BSC-BT', name: 'B.Sc Biotechnology', level: 'UG', isActive: true },
  { id: 'prg_msc_bt', departmentId: 'dep_bt', code: 'MSC-BT', name: 'M.Sc Biotechnology', level: 'PG', isActive: true },
  { id: 'prg_ba_llb', departmentId: 'dep_law', code: 'BA-LLB', name: 'B.A. LL.B (Hons)', level: 'UG', isActive: true },
  { id: 'prg_llm', departmentId: 'dep_law', code: 'LLM', name: 'LL.M', level: 'PG', isActive: true },
  { id: 'prg_ba_eng', departmentId: 'dep_eng', code: 'BA-ENG', name: 'B.A. English', level: 'UG', isActive: true },
  { id: 'prg_ma_psy', departmentId: 'dep_psy', code: 'MA-PSY', name: 'M.A. Psychology', level: 'PG', isActive: true },
  { id: 'prg_ses_btech_biotech', departmentId: 'dep_ses', code: 'SES-BTECH-BIOTECH', name: 'Bachelor of Technology - Biotechnology', level: 'UG', isActive: true },
  { id: 'prg_ses_btech_cse_aiml', departmentId: 'dep_ses', code: 'SES-BTECH-CSE-AIML', name: 'Bachelor of Technology - Computer Science and Engineering (AI and ML)', level: 'UG', isActive: true },
  { id: 'prg_ses_btech_cse', departmentId: 'dep_ses', code: 'SES-BTECH-CSE', name: 'Bachelor of Technology - Computer Science and Engineering', level: 'UG', isActive: true },
  { id: 'prg_ses_bca_aiml', departmentId: 'dep_ses', code: 'SES-BCA-AIML', name: 'Bachelor of Computer Application - Artificial Intelligence & Machine Learning', level: 'UG', isActive: true },
  { id: 'prg_ses_btech_me_ev', departmentId: 'dep_ses', code: 'SES-BTECH-MECH-EV', name: 'B. Tech Mechanical Engineering - Specialization in EV', level: 'UG', isActive: true },
  { id: 'prg_ses_bsc_biotech', departmentId: 'dep_ses', code: 'SES-BSC-BIOTECH-RES', name: 'B.Sc. (Hons. with Research) - Biotechnology', level: 'UG', isActive: true },
  { id: 'prg_ses_bsc_forensic', departmentId: 'dep_ses', code: 'SES-BSC-FORENSIC-RES', name: 'B.Sc. (Hons. with Research) - Forensic Science', level: 'UG', isActive: true },
  { id: 'prg_ses_bsc_micro', departmentId: 'dep_ses', code: 'SES-BSC-MICRO-RES', name: 'B.Sc. (Hons. with Research) - Microbiology', level: 'UG', isActive: true },
  { id: 'prg_ses_btech_ai_ds', departmentId: 'dep_ses', code: 'SES-BTECH-AI-DS', name: 'Bachelor of Technology - Artificial Intelligence (AI) & Data Science', level: 'UG', isActive: true },
  { id: 'prg_ses_bca_cyber', departmentId: 'dep_ses', code: 'SES-BCA-CYBER', name: 'Bachelor of Computer Application - Cyber Security', level: 'UG', isActive: true },
  { id: 'prg_ses_bca_data_analytics', departmentId: 'dep_ses', code: 'SES-BCA-DATA-ANALYTICS', name: 'Bachelor of Computer Application - Data Analytics', level: 'UG', isActive: true },
  { id: 'prg_ses_bca_data_science', departmentId: 'dep_ses', code: 'SES-BCA-DATA-SCIENCE', name: 'Bachelor of Computer Application - Data Science', level: 'UG', isActive: true },
  { id: 'prg_ses_bca_ml', departmentId: 'dep_ses', code: 'SES-BCA-ML', name: 'Bachelor of Computer Application - Machine Learning', level: 'UG', isActive: true },
  { id: 'prg_ses_btech_aero', departmentId: 'dep_ses', code: 'SES-BTECH-AERO', name: 'Bachelor of Technology - Aerospace Engineering', level: 'UG', isActive: true },
  { id: 'prg_ses_btech_civil_si', departmentId: 'dep_ses', code: 'SES-BTECH-CIVIL-SI', name: 'Bachelor of Technology - Civil Engineering (Smart Infrastructures)', level: 'UG', isActive: true },
  { id: 'prg_ses_btech_ece_bme', departmentId: 'dep_ses', code: 'SES-BTECH-ECE-BME', name: 'Bachelor of Technology - Electronics and Communication Engineering (Biomedical Engineering)', level: 'UG', isActive: true },
  { id: 'prg_ses_btech_ece_iot', departmentId: 'dep_ses', code: 'SES-BTECH-ECE-IOT', name: 'Bachelor of Technology - Electronics and Communication Engineering (Internet of Things)', level: 'UG', isActive: true },
  { id: 'prg_ses_btech_ece_vlsi', departmentId: 'dep_ses', code: 'SES-BTECH-ECE-VLSI', name: 'Bachelor of Technology - Electronics and Communication Engineering (VLSI Design and Technology)', level: 'UG', isActive: true },
  { id: 'prg_ses_btech_energy', departmentId: 'dep_ses', code: 'SES-BTECH-ENERGY', name: 'Bachelor of Technology - Energy Engineering', level: 'UG', isActive: true },
  { id: 'prg_ses_btech_fire', departmentId: 'dep_ses', code: 'SES-BTECH-FIRE-SAFETY', name: 'Bachelor of Technology - Fire and Safety Engineering', level: 'UG', isActive: true },
  { id: 'prg_ses_btech_me_power', departmentId: 'dep_ses', code: 'SES-BTECH-MECH-POWER', name: 'Bachelor of Technology - Mechanical Engineering (Power Engineering)', level: 'UG', isActive: true },
  { id: 'prg_ses_btech_cse_cyber', departmentId: 'dep_ses', code: 'SES-BTECH-CSE-CYBER', name: 'Bachelor of Technology - Computer Science and Engineering (Cyber Security)', level: 'UG', isActive: true },
  { id: 'prg_ses_btech_cse_ds', departmentId: 'dep_ses', code: 'SES-BTECH-CSE-DS', name: 'Bachelor of Technology - Computer Science and Engineering (Data Science)', level: 'UG', isActive: true },
  { id: 'prg_ses_btech_cse_quantum', departmentId: 'dep_ses', code: 'SES-BTECH-CSE-QUANTUM', name: 'B.Tech. in Computer Science and Engineering With Specialization in Quantum Computing', level: 'UG', isActive: true },
  { id: 'prg_ses_mca', departmentId: 'dep_ses', code: 'SES-MCA', name: 'Master of Computer Application', level: 'PG', isActive: true },
  { id: 'prg_ses_msc_biotech', departmentId: 'dep_ses', code: 'SES-MSC-BIOTECH', name: 'Master of Science - Biotechnology', level: 'PG', isActive: true },
  { id: 'prg_ses_msc_forensic', departmentId: 'dep_ses', code: 'SES-MSC-FORENSIC', name: 'Master of Science - Forensic Science', level: 'PG', isActive: true },
  { id: 'prg_ses_msc_micro', departmentId: 'dep_ses', code: 'SES-MSC-MICRO', name: 'Master of Science - Microbiology', level: 'PG', isActive: true },
  { id: 'prg_ses_mca_cyber', departmentId: 'dep_ses', code: 'SES-MCA-CYBER', name: 'MCA (Master of Computer Applications) Cybersecurity', level: 'PG', isActive: true },
  { id: 'prg_ses_mca_ds_nvidia', departmentId: 'dep_ses', code: 'SES-MCA-DS-NVIDIA', name: 'MCA (Master of Computer Applications) Data Science - NVIDIA', level: 'PG', isActive: true },
  { id: 'prg_ses_mca_genai_nvidia', departmentId: 'dep_ses', code: 'SES-MCA-GENAI-NVIDIA', name: 'MCA (Master of Computer Applications) Generative AI - NVIDIA', level: 'PG', isActive: true },
  { id: 'prg_ses_btech_ece_quantum', departmentId: 'dep_ses', code: 'SES-BTECH-ECE-QUANTUM', name: 'B.Tech. in Electronics and Communication Engineering with Specialization in Quantum Technology', level: 'UG', isActive: true },
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

export const students: Student[] = []
export const faculty: Faculty[] = []

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

export const frameworkRequirements: FrameworkRequirement[] = []
export const frameworkTasks: FrameworkTask[] = []
export const documents: DocumentRecord[] = []
export const auditLogs: AuditLog[] = []
export const notifications: NotificationItem[] = []

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
