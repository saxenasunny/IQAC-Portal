-- Reference catalogue seed. No student, faculty, or demo-user records are created.
-- Run after migrations 0001 through 0003. Auth users must be created separately in Supabase Auth
-- and their UUIDs substituted into public.profiles.

insert into public.institutions (id, name, short_name, type, established_year, naac_grade, nirf_rank, city, state, website)
values (
  '00000000-0000-0000-0000-000000000001',
  'GD Goenka University',
  'GD Goenka',
  'Private University',
  2009,
  'A+',
  86,
  'Jaipur',
  'Rajasthan',
  'https://www.gdgoenkauniversity.com'
)
on conflict (id) do update set
  name = excluded.name,
  short_name = excluded.short_name,
  website = excluded.website;

insert into public.campuses (id, institution_id, name, city, is_main) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Main Campus', 'Jaipur', true),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'NCR Campus', 'Noida', false)
on conflict do nothing;

insert into public.academic_years (id, label, start_date, end_date, is_current) values
  ('00000000-0000-0000-0000-00000000aa01', '2023-24', '2023-07-01', '2024-06-30', false),
  ('00000000-0000-0000-0000-00000000aa02', '2024-25', '2024-07-01', '2025-06-30', false),
  ('00000000-0000-0000-0000-00000000aa03', '2025-26', '2025-07-01', '2026-06-30', true)
on conflict do nothing;

insert into public.frameworks (code, name, description) values
  ('NAAC', 'NAAC', 'National Assessment and Accreditation Council'),
  ('NIRF', 'NIRF', 'National Institutional Ranking Framework'),
  ('NBA', 'NBA', 'National Board of Accreditation'),
  ('QS', 'QS', 'QS World University Rankings'),
  ('THE', 'THE', 'Times Higher Education Rankings'),
  ('SUS', 'Sustainability', 'Sustainability and green rankings')
on conflict do nothing;

insert into public.schools (id, institution_id, campus_id, code, name, dean_name)
select
  ('20000000-0000-0000-0000-' || lpad(s.seq::text, 12, '0'))::uuid,
  '00000000-0000-0000-0000-000000000001',
  ('10000000-0000-0000-0000-' || lpad(s.campus_seq::text, 12, '0'))::uuid,
  s.code,
  s.name,
  s.dean_name
from (values
  (1, 'SOE', 'School of Engineering', '', 1),
  (2, 'SOM', 'School of Management', '', 1),
  (3, 'SOS', 'School of Sciences', '', 1),
  (4, 'SOL', 'School of Law', '', 2),
  (5, 'SOH', 'School of Humanities', '', 1)
) as s(seq, code, name, dean_name, campus_seq)
on conflict do nothing;

insert into public.departments (id, school_id, code, name, hod_name, established_year)
select
  ('30000000-0000-0000-0000-' || lpad(d.seq::text, 12, '0'))::uuid,
  s.id,
  d.code,
  d.name,
  d.hod_name,
  d.established_year
from (values
  (1, 'SOE', 'CSE', 'Computer Science & Engineering', '', 2009),
  (2, 'SOE', 'ECE', 'Electronics & Communication', '', 2010),
  (3, 'SOE', 'ME', 'Mechanical Engineering', '', 2009),
  (4, 'SOM', 'MBA', 'Business Administration', '', 2011),
  (5, 'SOM', 'COM', 'Commerce', '', 2012),
  (6, 'SOS', 'PHY', 'Physics', '', 2013),
  (7, 'SOS', 'BT', 'Biotechnology', '', 2014),
  (8, 'SOL', 'LAW', 'Legal Studies', '', 2015),
  (9, 'SOH', 'ENG', 'English', '', 2012),
  (10, 'SOH', 'PSY', 'Psychology', '', 2016),
  (11, 'SOE', 'SES', 'School of Engineering & Sciences', '', 2026)
) as d(seq, school_code, code, name, hod_name, established_year)
join public.schools s on s.code = d.school_code
on conflict do nothing;

insert into public.programmes (id, department_id, code, name, level, duration_years, intake, is_active)
select
  ('40000000-0000-0000-0000-' || lpad(p.seq::text, 12, '0'))::uuid,
  d.id,
  p.code,
  p.name,
  p.level,
  p.duration_years,
  p.intake,
  true
from (values
  (1, 'CSE', 'BTECH-CSE', 'B.Tech Computer Science', 'UG', null::numeric, null::integer),
  (2, 'CSE', 'BTECH-AI', 'B.Tech Artificial Intelligence', 'UG', null, null),
  (3, 'CSE', 'MTECH-CSE', 'M.Tech Computer Science', 'PG', null, null),
  (4, 'CSE', 'PHD-CSE', 'Ph.D Computer Science', 'Doctoral', null, null),
  (5, 'ECE', 'BTECH-ECE', 'B.Tech Electronics', 'UG', null, null),
  (6, 'ECE', 'MTECH-VLSI', 'M.Tech VLSI', 'PG', null, null),
  (7, 'ME', 'BTECH-ME', 'B.Tech Mechanical', 'UG', null, null),
  (8, 'ME', 'MTECH-ME', 'M.Tech Mechanical', 'PG', null, null),
  (9, 'MBA', 'MBA', 'Master of Business Administration', 'PG', null, null),
  (10, 'MBA', 'BBA', 'Bachelor of Business Administration', 'UG', null, null),
  (11, 'COM', 'BCOM', 'B.Com (Hons)', 'UG', null, null),
  (12, 'COM', 'MCOM', 'M.Com', 'PG', null, null),
  (13, 'PHY', 'BSC-PHY', 'B.Sc Physics', 'UG', null, null),
  (14, 'PHY', 'MSC-PHY', 'M.Sc Physics', 'PG', null, null),
  (15, 'BT', 'BSC-BT', 'B.Sc Biotechnology', 'UG', null, null),
  (16, 'BT', 'MSC-BT', 'M.Sc Biotechnology', 'PG', null, null),
  (17, 'LAW', 'BA-LLB', 'B.A. LL.B (Hons)', 'UG', null, null),
  (18, 'LAW', 'LLM', 'LL.M', 'PG', null, null),
  (19, 'ENG', 'BA-ENG', 'B.A. English', 'UG', null, null),
  (20, 'PSY', 'MA-PSY', 'M.A. Psychology', 'PG', null, null),
  (21, 'SES', 'SES-BTECH-BIOTECH', 'Bachelor of Technology - Biotechnology', 'UG', null, null),
  (22, 'SES', 'SES-BTECH-CSE-AIML', 'Bachelor of Technology - Computer Science and Engineering (AI and ML)', 'UG', null, null),
  (23, 'SES', 'SES-BTECH-CSE', 'Bachelor of Technology - Computer Science and Engineering', 'UG', null, null),
  (24, 'SES', 'SES-BCA-AIML', 'Bachelor of Computer Application - Artificial Intelligence & Machine Learning', 'UG', null, null),
  (25, 'SES', 'SES-BTECH-MECH-EV', 'B. Tech Mechanical Engineering - Specialization in EV', 'UG', null, null),
  (26, 'SES', 'SES-BSC-BIOTECH-RES', 'B.Sc. (Hons. with Research) - Biotechnology', 'UG', null, null),
  (27, 'SES', 'SES-BSC-FORENSIC-RES', 'B.Sc. (Hons. with Research) - Forensic Science', 'UG', null, null),
  (28, 'SES', 'SES-BSC-MICRO-RES', 'B.Sc. (Hons. with Research) - Microbiology', 'UG', null, null),
  (29, 'SES', 'SES-BTECH-AI-DS', 'Bachelor of Technology - Artificial Intelligence (AI) & Data Science', 'UG', null, null),
  (30, 'SES', 'SES-BCA-CYBER', 'Bachelor of Computer Application - Cyber Security', 'UG', null, null),
  (31, 'SES', 'SES-BCA-DATA-ANALYTICS', 'Bachelor of Computer Application - Data Analytics', 'UG', null, null),
  (32, 'SES', 'SES-BCA-DATA-SCIENCE', 'Bachelor of Computer Application - Data Science', 'UG', null, null),
  (33, 'SES', 'SES-BCA-ML', 'Bachelor of Computer Application - Machine Learning', 'UG', null, null),
  (34, 'SES', 'SES-BTECH-AERO', 'Bachelor of Technology - Aerospace Engineering', 'UG', null, null),
  (35, 'SES', 'SES-BTECH-CIVIL-SI', 'Bachelor of Technology - Civil Engineering (Smart Infrastructures)', 'UG', null, null),
  (36, 'SES', 'SES-BTECH-ECE-BME', 'Bachelor of Technology - Electronics and Communication Engineering (Biomedical Engineering)', 'UG', null, null),
  (37, 'SES', 'SES-BTECH-ECE-IOT', 'Bachelor of Technology - Electronics and Communication Engineering (Internet of Things)', 'UG', null, null),
  (38, 'SES', 'SES-BTECH-ECE-VLSI', 'Bachelor of Technology - Electronics and Communication Engineering (VLSI Design and Technology)', 'UG', null, null),
  (39, 'SES', 'SES-BTECH-ENERGY', 'Bachelor of Technology - Energy Engineering', 'UG', null, null),
  (40, 'SES', 'SES-BTECH-FIRE-SAFETY', 'Bachelor of Technology - Fire and Safety Engineering', 'UG', null, null),
  (41, 'SES', 'SES-BTECH-MECH-POWER', 'Bachelor of Technology - Mechanical Engineering (Power Engineering)', 'UG', null, null),
  (42, 'SES', 'SES-BTECH-CSE-CYBER', 'Bachelor of Technology - Computer Science and Engineering (Cyber Security)', 'UG', null, null),
  (43, 'SES', 'SES-BTECH-CSE-DS', 'Bachelor of Technology - Computer Science and Engineering (Data Science)', 'UG', null, null),
  (44, 'SES', 'SES-BTECH-CSE-QUANTUM', 'B.Tech. in Computer Science and Engineering With Specialization in Quantum Computing', 'UG', null, null),
  (45, 'SES', 'SES-MCA', 'Master of Computer Application', 'PG', null, null),
  (46, 'SES', 'SES-MSC-BIOTECH', 'Master of Science - Biotechnology', 'PG', null, null),
  (47, 'SES', 'SES-MSC-FORENSIC', 'Master of Science - Forensic Science', 'PG', null, null),
  (48, 'SES', 'SES-MSC-MICRO', 'Master of Science - Microbiology', 'PG', null, null),
  (49, 'SES', 'SES-MCA-CYBER', 'MCA (Master of Computer Applications) Cybersecurity', 'PG', null, null),
  (50, 'SES', 'SES-MCA-DS-NVIDIA', 'MCA (Master of Computer Applications) Data Science - NVIDIA', 'PG', null, null),
  (51, 'SES', 'SES-MCA-GENAI-NVIDIA', 'MCA (Master of Computer Applications) Generative AI - NVIDIA', 'PG', null, null),
  (52, 'SES', 'SES-BTECH-ECE-QUANTUM', 'B.Tech. in Electronics and Communication Engineering with Specialization in Quantum Technology', 'UG', null, null)
) as p(seq, department_code, code, name, level, duration_years, intake)
join public.departments d on d.code = p.department_code
on conflict do nothing;

insert into public.batches (id, programme_id, academic_year_id, year, label)
select
  md5('batch:' || p.code || ':' || y.year::text)::uuid,
  p.id,
  ay.id,
  y.year,
  p.code || ' ' || y.year::text
from public.programmes p
cross join (values (2023), (2024), (2025)) as y(year)
join public.academic_years ay on ay.label = (y.year::text || '-' || right((y.year + 1)::text, 2))
on conflict do nothing;

insert into public.sections (id, batch_id, name)
select md5('section:' || b.id::text || ':' || section.name)::uuid, b.id, section.name
from public.batches b
cross join (values ('A'), ('B')) as section(name)
on conflict (batch_id, name) do nothing;

-- Student, faculty, user and operational records are added through the authenticated portal.
