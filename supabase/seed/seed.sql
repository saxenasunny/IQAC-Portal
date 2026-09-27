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
);

insert into public.academic_years (id, label, start_date, end_date, is_current) values
  ('00000000-0000-0000-0000-00000000aa01', '2023-24', '2023-07-01', '2024-06-30', false),
  ('00000000-0000-0000-0000-00000000aa02', '2024-25', '2024-07-01', '2025-06-30', false),
  ('00000000-0000-0000-0000-00000000aa03', '2025-26', '2025-07-01', '2026-06-30', true);

insert into public.frameworks (code, name, description) values
  ('NAAC', 'NAAC', 'National Assessment and Accreditation Council'),
  ('NIRF', 'NIRF', 'National Institutional Ranking Framework'),
  ('NBA', 'NBA', 'National Board of Accreditation'),
  ('QS', 'QS', 'QS World University Rankings'),
  ('THE', 'THE', 'Times Higher Education Rankings'),
  ('SUS', 'Sustainability', 'Sustainability and green rankings');
