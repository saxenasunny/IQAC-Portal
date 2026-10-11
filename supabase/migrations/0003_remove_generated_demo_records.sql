delete from public.students
where id::text like '70000000-0000-0000-0000-%';

delete from public.faculty
where employee_id between 'EMP0201' and 'EMP0220';

alter table public.programmes
  alter column duration_years drop not null;

update public.programmes p
set duration_years = null,
    intake = null
from (values
  ('BTECH-CSE', 4.0, 180),
  ('BTECH-AI', 4.0, 60),
  ('MTECH-CSE', 2.0, 30),
  ('PHD-CSE', 4.0, 12),
  ('BTECH-ECE', 4.0, 120),
  ('MTECH-VLSI', 2.0, 18),
  ('BTECH-ME', 4.0, 120),
  ('MTECH-ME', 2.0, 18),
  ('MBA', 2.0, 120),
  ('BBA', 3.0, 90),
  ('BCOM', 3.0, 120),
  ('MCOM', 2.0, 40),
  ('BSC-PHY', 3.0, 60),
  ('MSC-PHY', 2.0, 24),
  ('BSC-BT', 3.0, 60),
  ('MSC-BT', 2.0, 24),
  ('BA-LLB', 5.0, 120),
  ('LLM', 1.0, 30),
  ('BA-ENG', 3.0, 60),
  ('MA-PSY', 2.0, 30)
) as seeded(code, duration_years, intake)
where p.code = seeded.code
  and p.duration_years = seeded.duration_years
  and p.intake = seeded.intake;

update public.schools
set dean_name = ''
where (code, dean_name) in (
  ('SOE', 'Prof. Meera Iyer'),
  ('SOM', 'Prof. Arvind Malhotra'),
  ('SOS', 'Prof. Kavita Rao'),
  ('SOL', 'Prof. Nidhi Bansal'),
  ('SOH', 'Prof. Farhan Qureshi')
);

update public.departments
set hod_name = ''
where (code, hod_name) in (
  ('CSE', 'Dr. Ankit Sharma'),
  ('ECE', 'Dr. Priya Nair'),
  ('ME', 'Dr. Rajesh Gupta'),
  ('MBA', 'Dr. Sonal Kapoor'),
  ('COM', 'Dr. Vivek Jain'),
  ('PHY', 'Dr. Leena Das'),
  ('BT', 'Dr. Imran Khan'),
  ('LAW', 'Dr. Aditi Menon'),
  ('ENG', 'Dr. Rohan Sethi'),
  ('PSY', 'Dr. Neha Bhatt')
);
