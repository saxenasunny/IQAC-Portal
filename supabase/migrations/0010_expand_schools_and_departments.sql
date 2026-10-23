-- Migration 0010: Add School and Department catalogue rows matching institutional Excel files

-- 1. Insert any missing schools
insert into public.schools (id, institution_id, campus_id, code, name, dean_name)
select
  ('20000000-0000-0000-0000-' || lpad(s.seq::text, 12, '0'))::uuid,
  '00000000-0000-0000-0000-000000000001',
  ('10000000-0000-0000-0000-' || lpad(s.campus_seq::text, 12, '0'))::uuid,
  s.code,
  s.name,
  ''
from (values
  (6, 'SHAS', 'School of Healthcare and Allied Sciences', 1),
  (7, 'SOAS', 'School of Agricultural Sciences', 1),
  (8, 'SOHT', 'School of Hospitality & Tourism', 1),
  (9, 'UID', 'United World Institute of Design (UID)', 1),
  (10, 'SOLA', 'School of Liberal Arts', 1),
  (11, 'SME', 'School of Media and Entertainment', 1),
  (12, 'COE', 'Centres of Excellence & Innovation', 1)
) as s(seq, code, name, campus_seq)
on conflict do nothing;

-- 2. Insert new departments matching exact Excel Department names
insert into public.departments (id, school_id, code, name, hod_name, established_year)
select
  ('30000000-0000-0000-0000-' || lpad(d.seq::text, 12, '0'))::uuid,
  s.id,
  d.code,
  d.name,
  '',
  2026
from (values
  (12, 'SOL', 'SOLAW', 'School of Law'),
  (13, 'SHAS', 'SHAS', 'School of Healthcare and Allied Sciences'),
  (14, 'SOAS', 'SOAS', 'School of Agricultural Sciences'),
  (15, 'COE', 'COE-ENV', 'Centre Of Excellence: Occupational Health, Safety, Fire & Environment'),
  (16, 'SOHT', 'SOHT', 'School of Hospitality & Tourism'),
  (17, 'UID', 'UID', 'United World Institute of Design (UID)'),
  (18, 'SOM', 'SOM', 'School of Management'),
  (19, 'SOLA', 'SOLA', 'School of Liberal Arts'),
  (20, 'COE', 'CAES', 'Centre of Aerospace and Energy Studies'),
  (21, 'COE', 'CIE', 'Centre for Innovation and Entrepreneurship'),
  (22, 'SME', 'SME', 'School of Media and Entertainment')
) as d(seq, school_code, code, name)
join public.schools s on s.code = d.school_code
on conflict do nothing;
