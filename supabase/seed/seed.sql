-- Development seed aligned with the in-app demo catalogue.
-- Run after 0001_init.sql. Auth users must be created separately in Supabase Auth
-- and their UUIDs substituted into public.profiles.

insert into public.institutions (id, name, short_name, type, established_year, naac_grade, nirf_rank, city, state, website)
values (
  '00000000-0000-0000-0000-000000000001',
  'Apex University',
  'Apex',
  'Private University',
  2009,
  'A+',
  86,
  'Jaipur',
  'Rajasthan',
  'https://apex.university'
)
on conflict (id) do update set
  name = excluded.name,
  short_name = excluded.short_name,
  type = excluded.type,
  established_year = excluded.established_year,
  naac_grade = excluded.naac_grade,
  nirf_rank = excluded.nirf_rank,
  city = excluded.city,
  state = excluded.state,
  website = excluded.website;

insert into public.campuses (id, institution_id, name, city, is_main) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Main Campus', 'Jaipur', true),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'NCR Campus', 'Noida', false)
on conflict (id) do update set
  institution_id = excluded.institution_id,
  name = excluded.name,
  city = excluded.city,
  is_main = excluded.is_main;

insert into public.academic_years (id, label, start_date, end_date, is_current) values
  ('00000000-0000-0000-0000-00000000aa01', '2023-24', '2023-07-01', '2024-06-30', false),
  ('00000000-0000-0000-0000-00000000aa02', '2024-25', '2024-07-01', '2025-06-30', false),
  ('00000000-0000-0000-0000-00000000aa03', '2025-26', '2025-07-01', '2026-06-30', true)
on conflict (id) do update set
  label = excluded.label,
  start_date = excluded.start_date,
  end_date = excluded.end_date,
  is_current = excluded.is_current;

insert into public.frameworks (code, name, description) values
  ('NAAC', 'NAAC', 'National Assessment and Accreditation Council'),
  ('NIRF', 'NIRF', 'National Institutional Ranking Framework'),
  ('NBA', 'NBA', 'National Board of Accreditation'),
  ('QS', 'QS', 'QS World University Rankings'),
  ('THE', 'THE', 'Times Higher Education Rankings'),
  ('SUS', 'Sustainability', 'Sustainability and green rankings')
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description;

insert into public.schools (id, institution_id, campus_id, code, name, dean_name)
select
  ('20000000-0000-0000-0000-' || lpad(s.seq::text, 12, '0'))::uuid,
  '00000000-0000-0000-0000-000000000001',
  ('10000000-0000-0000-0000-' || lpad(s.campus_seq::text, 12, '0'))::uuid,
  s.code,
  s.name,
  s.dean_name
from (values
  (1, 'SOE', 'School of Engineering', 'Prof. Meera Iyer', 1),
  (2, 'SOM', 'School of Management', 'Prof. Arvind Malhotra', 1),
  (3, 'SOS', 'School of Sciences', 'Prof. Kavita Rao', 1),
  (4, 'SOL', 'School of Law', 'Prof. Nidhi Bansal', 2),
  (5, 'SOH', 'School of Humanities', 'Prof. Farhan Qureshi', 1)
) as s(seq, code, name, dean_name, campus_seq)
on conflict (code) do update set
  institution_id = excluded.institution_id,
  campus_id = excluded.campus_id,
  name = excluded.name,
  dean_name = excluded.dean_name;

insert into public.departments (id, school_id, code, name, hod_name, established_year)
select
  ('30000000-0000-0000-0000-' || lpad(d.seq::text, 12, '0'))::uuid,
  s.id,
  d.code,
  d.name,
  d.hod_name,
  d.established_year
from (values
  (1, 'SOE', 'CSE', 'Computer Science & Engineering', 'Dr. Ankit Sharma', 2009),
  (2, 'SOE', 'ECE', 'Electronics & Communication', 'Dr. Priya Nair', 2010),
  (3, 'SOE', 'ME', 'Mechanical Engineering', 'Dr. Rajesh Gupta', 2009),
  (4, 'SOM', 'MBA', 'Business Administration', 'Dr. Sonal Kapoor', 2011),
  (5, 'SOM', 'COM', 'Commerce', 'Dr. Vivek Jain', 2012),
  (6, 'SOS', 'PHY', 'Physics', 'Dr. Leena Das', 2013),
  (7, 'SOS', 'BT', 'Biotechnology', 'Dr. Imran Khan', 2014),
  (8, 'SOL', 'LAW', 'Legal Studies', 'Dr. Aditi Menon', 2015),
  (9, 'SOH', 'ENG', 'English', 'Dr. Rohan Sethi', 2012),
  (10, 'SOH', 'PSY', 'Psychology', 'Dr. Neha Bhatt', 2016)
) as d(seq, school_code, code, name, hod_name, established_year)
join public.schools s on s.code = d.school_code
on conflict (code) do update set
  school_id = excluded.school_id,
  name = excluded.name,
  hod_name = excluded.hod_name,
  established_year = excluded.established_year;

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
  (1, 'CSE', 'BTECH-CSE', 'B.Tech Computer Science', 'UG', 4.0, 180),
  (2, 'CSE', 'BTECH-AI', 'B.Tech Artificial Intelligence', 'UG', 4.0, 60),
  (3, 'CSE', 'MTECH-CSE', 'M.Tech Computer Science', 'PG', 2.0, 30),
  (4, 'CSE', 'PHD-CSE', 'Ph.D Computer Science', 'Doctoral', 4.0, 12),
  (5, 'ECE', 'BTECH-ECE', 'B.Tech Electronics', 'UG', 4.0, 120),
  (6, 'ECE', 'MTECH-VLSI', 'M.Tech VLSI', 'PG', 2.0, 18),
  (7, 'ME', 'BTECH-ME', 'B.Tech Mechanical', 'UG', 4.0, 120),
  (8, 'ME', 'MTECH-ME', 'M.Tech Mechanical', 'PG', 2.0, 18),
  (9, 'MBA', 'MBA', 'Master of Business Administration', 'PG', 2.0, 120),
  (10, 'MBA', 'BBA', 'Bachelor of Business Administration', 'UG', 3.0, 90),
  (11, 'COM', 'BCOM', 'B.Com (Hons)', 'UG', 3.0, 120),
  (12, 'COM', 'MCOM', 'M.Com', 'PG', 2.0, 40),
  (13, 'PHY', 'BSC-PHY', 'B.Sc Physics', 'UG', 3.0, 60),
  (14, 'PHY', 'MSC-PHY', 'M.Sc Physics', 'PG', 2.0, 24),
  (15, 'BT', 'BSC-BT', 'B.Sc Biotechnology', 'UG', 3.0, 60),
  (16, 'BT', 'MSC-BT', 'M.Sc Biotechnology', 'PG', 2.0, 24),
  (17, 'LAW', 'BA-LLB', 'B.A. LL.B (Hons)', 'UG', 5.0, 120),
  (18, 'LAW', 'LLM', 'LL.M', 'PG', 1.0, 30),
  (19, 'ENG', 'BA-ENG', 'B.A. English', 'UG', 3.0, 60),
  (20, 'PSY', 'MA-PSY', 'M.A. Psychology', 'PG', 2.0, 30)
) as p(seq, department_code, code, name, level, duration_years, intake)
join public.departments d on d.code = p.department_code
on conflict (code) do update set
  department_id = excluded.department_id,
  name = excluded.name,
  level = excluded.level,
  duration_years = excluded.duration_years,
  intake = excluded.intake,
  is_active = excluded.is_active;

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
on conflict (programme_id, year) do update set
  academic_year_id = excluded.academic_year_id,
  label = excluded.label;

insert into public.sections (id, batch_id, name)
select md5('section:' || b.id::text || ':' || section.name)::uuid, b.id, section.name
from public.batches b
cross join (values ('A'), ('B')) as section(name)
on conflict (batch_id, name) do nothing;

insert into public.students (
  id, registration_id, application_number, university_roll_number, full_name,
  email, phone, gender, date_of_birth, nationality, programme_id, department_id,
  school_id, batch_id, section_id, academic_year_id, current_year, current_term,
  student_status, academic_status, admission_type, workflow, is_archived
)
select
  ('70000000-0000-0000-0000-' || lpad(g.n::text, 12, '0'))::uuid,
  'AU' || batch_year.year::text || lpad(g.n::text, 5, '0'),
  'APP' || batch_year.year::text || lpad(g.n::text, 5, '0'),
  batch_year.year::text || p.code || lpad(g.n::text, 4, '0'),
  first_name.name || ' ' || last_name.name,
  lower(first_name.name || '.' || last_name.name || g.n::text || '@apex.edu'),
  '98' || lpad((70000000 + g.n * 137)::text, 8, '0'),
  case when g.n % 2 = 0 then 'female'::public.gender_type else 'male'::public.gender_type end,
  make_date(2002 + (g.n % 3)::integer, ((g.n - 1) % 12 + 1)::integer, ((g.n - 1) % 27 + 1)::integer),
  case when g.n % 23 = 0 then 'Nepal' else 'India' end,
  p.id,
  d.id,
  d.school_id,
  b.id,
  section.id,
  ay.id,
  ((g.n - 1) % 4 + 1)::integer,
  case when g.n % 2 = 0 then 'Even' else 'Odd' end,
  case when g.n % 17 = 0 then 'graduated'::public.student_status
       when g.n % 29 = 0 then 'inactive'::public.student_status
       else 'active'::public.student_status end,
  case when g.n % 11 = 0 then 'lateral'::public.academic_status else 'regular'::public.academic_status end,
  case when g.n % 9 = 0 then 'Management' else 'Merit' end,
  case when g.n % 13 = 0 then 'submitted'::public.workflow_status else 'approved'::public.workflow_status end,
  false
from generate_series(1, 100) as g(n)
join (values
  (1, 'BTECH-CSE'), (2, 'BTECH-AI'), (3, 'MTECH-CSE'), (4, 'PHD-CSE'),
  (5, 'BTECH-ECE'), (6, 'MTECH-VLSI'), (7, 'BTECH-ME'), (8, 'MTECH-ME'),
  (9, 'MBA'), (10, 'BBA'), (11, 'BCOM'), (12, 'MCOM'), (13, 'BSC-PHY'),
  (14, 'MSC-PHY'), (15, 'BSC-BT'), (16, 'MSC-BT'), (17, 'BA-LLB'),
  (18, 'LLM'), (19, 'BA-ENG'), (20, 'MA-PSY')
) as p_order(seq, code) on p_order.seq = ((g.n - 1) % 20 + 1)
join public.programmes p on p.code = p_order.code
join public.departments d on d.id = p.department_id
cross join lateral (
  select case (g.n - 1) % 3 when 0 then 2023 when 1 then 2024 else 2025 end as year
) as batch_year
join public.batches b on b.programme_id = p.id and b.year = batch_year.year
join public.sections section on section.batch_id = b.id and section.name = 'A'
join public.academic_years ay on ay.label = '2025-26'
cross join lateral (
  select (array['Rahul', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Ananya', 'Rohit', 'Isha', 'Kunal', 'Meera',
                'Aditya', 'Pooja', 'Siddharth', 'Kavya', 'Arjun', 'Nisha', 'Harsh', 'Divya', 'Yash', 'Riya'])[((g.n - 1) % 20 + 1)::integer] as name
) as first_name
cross join lateral (
  select (array['Sharma', 'Patel', 'Singh', 'Reddy', 'Nair', 'Gupta', 'Khan', 'Iyer', 'Verma', 'Das',
                'Joshi', 'Mehta', 'Kapoor', 'Bose', 'Malhotra'])[((g.n - 1) % 15 + 1)::integer] as name
) as last_name
on conflict (registration_id) do update set
  application_number = excluded.application_number,
  university_roll_number = excluded.university_roll_number,
  full_name = excluded.full_name,
  email = excluded.email,
  phone = excluded.phone,
  gender = excluded.gender,
  date_of_birth = excluded.date_of_birth,
  nationality = excluded.nationality,
  programme_id = excluded.programme_id,
  department_id = excluded.department_id,
  school_id = excluded.school_id,
  batch_id = excluded.batch_id,
  section_id = excluded.section_id,
  academic_year_id = excluded.academic_year_id,
  current_year = excluded.current_year,
  current_term = excluded.current_term,
  student_status = excluded.student_status,
  academic_status = excluded.academic_status,
  admission_type = excluded.admission_type,
  workflow = excluded.workflow,
  is_archived = excluded.is_archived;

insert into public.student_personal (student_id, first_name, last_name, first_generation, differently_abled, ews, domicile_state, category)
select
  s.id,
  split_part(s.full_name, ' ', 1),
  split_part(s.full_name, ' ', 2),
  s.id::text like '%000000000008',
  s.id::text like '%000000000031',
  right(s.registration_id, 1)::integer % 5 = 0,
  case right(s.registration_id, 1)::integer % 4
    when 0 then 'Rajasthan' when 1 then 'Delhi' when 2 then 'Maharashtra' else 'Karnataka' end,
  (array['General', 'OBC', 'SC', 'ST', 'EWS'])[right(s.registration_id, 1)::integer % 5 + 1]
from public.students s
where s.id::text like '70000000-0000-0000-0000-%'
on conflict (student_id) do update set
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  first_generation = excluded.first_generation,
  differently_abled = excluded.differently_abled,
  ews = excluded.ews,
  domicile_state = excluded.domicile_state,
  category = excluded.category;

insert into public.student_academic (student_id, cgpa, percentage, backlogs, admission_date, expected_graduation)
select
  s.id,
  (6.4 + (right(s.registration_id, 5)::integer % 35) / 10.0)::numeric(4,2),
  (62 + right(s.registration_id, 5)::integer % 32)::numeric(5,2),
  case when right(s.registration_id, 5)::integer % 7 = 0 then 1 else 0 end,
  make_date(b.year, 7, 15),
  make_date(b.year + p.duration_years::integer, 6, 30)
from public.students s
join public.batches b on b.id = s.batch_id
join public.programmes p on p.id = s.programme_id
where s.id::text like '70000000-0000-0000-0000-%'
on conflict (student_id) do update set
  cgpa = excluded.cgpa,
  percentage = excluded.percentage,
  backlogs = excluded.backlogs,
  admission_date = excluded.admission_date,
  expected_graduation = excluded.expected_graduation;

insert into public.student_contact (student_id, personal_email, emergency_contact_name, emergency_contact_phone)
select s.id, 'student' || right(s.registration_id, 5) || '@gmail.com', 'Family Contact', s.phone
from public.students s
where s.id::text like '70000000-0000-0000-0000-%'
on conflict (student_id) do update set
  personal_email = excluded.personal_email,
  emergency_contact_name = excluded.emergency_contact_name,
  emergency_contact_phone = excluded.emergency_contact_phone;

insert into public.student_qualifications (id, student_id, level, board_university, institution_name, year_of_passing, percentage)
select
  md5('student-qualification:' || s.id::text || ':' || q.level)::uuid,
  s.id,
  q.level,
  'CBSE',
  'Apex Feeder School',
  b.year - q.years_before,
  (75 + right(s.registration_id, 5)::integer % 20)::numeric(5,2)
from public.students s
join public.batches b on b.id = s.batch_id
cross join (values ('10th', 6), ('12th', 4)) as q(level, years_before)
where s.id::text like '70000000-0000-0000-0000-%'
on conflict (id) do update set
  level = excluded.level,
  board_university = excluded.board_university,
  institution_name = excluded.institution_name,
  year_of_passing = excluded.year_of_passing,
  percentage = excluded.percentage;

insert into public.faculty (
  id, employee_id, full_name, email, phone, gender, date_of_birth, school_id,
  department_id, designation, employment_type, joining_date, highest_qualification,
  specialization, teaching_experience_years, research_experience_years, is_active, workflow
)
select
  ('80000000-0000-0000-0000-' || lpad(g.n::text, 12, '0'))::uuid,
  'EMP' || lpad((g.n + 200)::text, 4, '0'),
  'Dr. ' || (array['Rahul', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Ananya', 'Rohit', 'Isha', 'Kunal', 'Meera',
                   'Aditya', 'Pooja', 'Siddharth', 'Kavya', 'Arjun', 'Nisha', 'Harsh', 'Divya', 'Yash', 'Riya'])[g.n],
  'faculty' || g.n::text || '@apex.edu',
  '98111' || lpad((g.n + 20)::text, 5, '0'),
  case when g.n % 3 = 0 then 'female'::public.gender_type else 'male'::public.gender_type end,
  make_date(1974 + (g.n % 18)::integer, 5, (g.n % 27 + 1)::integer),
  d.school_id,
  d.id,
  case when g.n % 3 = 0 then 'Professor'
       when g.n % 3 = 1 then 'Assistant Professor'
       else 'Associate Professor' end,
  case when g.n % 9 = 0 then 'contract'::public.employment_type else 'permanent'::public.employment_type end,
  make_date(2012 + (g.n % 10)::integer, 7, 1),
  case when g.n % 4 = 0 then 'Post-Doc' else 'Ph.D' end,
  case d.code
    when 'CSE' then 'Machine Learning' when 'ECE' then 'VLSI' when 'ME' then 'Thermal Engineering'
    when 'MBA' then 'Finance' when 'COM' then 'Accounting' when 'PHY' then 'Condensed Matter'
    when 'BT' then 'Genetics' when 'LAW' then 'Constitutional Law' when 'ENG' then 'Linguistics'
    else 'Clinical Psychology' end,
  8 + (g.n % 14),
  4 + (g.n % 10),
  g.n <> 19,
  'approved'::public.workflow_status
from generate_series(1, 20) as g(n)
join (values
  (1, 'CSE'), (2, 'ECE'), (3, 'ME'), (4, 'MBA'), (5, 'COM'),
  (6, 'PHY'), (7, 'BT'), (8, 'LAW'), (9, 'ENG'), (10, 'PSY')
) as dept_order(seq, code) on dept_order.seq = ((g.n - 1) % 10 + 1)
join public.departments d on d.code = dept_order.code
on conflict (employee_id) do update set
  full_name = excluded.full_name,
  email = excluded.email,
  phone = excluded.phone,
  gender = excluded.gender,
  date_of_birth = excluded.date_of_birth,
  school_id = excluded.school_id,
  department_id = excluded.department_id,
  designation = excluded.designation,
  employment_type = excluded.employment_type,
  joining_date = excluded.joining_date,
  highest_qualification = excluded.highest_qualification,
  specialization = excluded.specialization,
  teaching_experience_years = excluded.teaching_experience_years,
  research_experience_years = excluded.research_experience_years,
  is_active = excluded.is_active,
  workflow = excluded.workflow;

insert into public.faculty_qualifications (id, faculty_id, degree, specialization, university, year)
select md5('faculty-qualification:' || f.id::text)::uuid, f.id, 'Ph.D', f.specialization, 'IIT Delhi', 2010
from public.faculty f
where f.employee_id between 'EMP0201' and 'EMP0220'
on conflict (id) do update set
  degree = excluded.degree,
  specialization = excluded.specialization,
  university = excluded.university,
  year = excluded.year;

insert into public.faculty_publications (id, faculty_id, title, journal, year, indexed_in)
select
  md5('faculty-publication:' || f.id::text)::uuid,
  f.id,
  'Institutional study by ' || f.full_name,
  'Apex Journal',
  2024,
  case when right(f.employee_id, 1)::integer % 2 = 0 then 'Scopus' else 'WoS' end
from public.faculty f
where f.employee_id between 'EMP0201' and 'EMP0220'
on conflict (id) do update set
  title = excluded.title,
  journal = excluded.journal,
  year = excluded.year,
  indexed_in = excluded.indexed_in;
