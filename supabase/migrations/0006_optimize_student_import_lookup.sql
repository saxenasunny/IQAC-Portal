create index if not exists idx_students_registration_id_lower
  on public.students (lower(registration_id));
