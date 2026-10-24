-- Migration 0018: Fast student listing RPC (SECURITY DEFINER, bypasses per-row RLS)
--
-- Problem:
--   1. Direct .from('students').select() goes through RLS policies which call
--      has_role() / is_admin() PER ROW, causing statement_timeout for non-super_admin users.
--   2. Supabase PostgREST caps results at 1000 rows (max_rows default), so PAGE_SIZE > 1000
--      causes pagination to break, returning only the first 1000 rows.
--
-- Solution:
--   A lightweight SECURITY DEFINER function that checks the caller's role ONCE,
--   applies role-based WHERE filtering, and returns a set of rows.
--   PostgREST supports .range() pagination on `returns setof` functions.

-- Ensure has_role and is_admin are SECURITY DEFINER (idempotent, safe to re-run)
create or replace function public.has_role(roles user_role[])
returns boolean
language sql
security definer
set search_path = public, auth, pg_temp
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = any(roles)
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public, auth, pg_temp
stable
as $$
  select public.has_role(array['super_admin','iqac_admin','registrar']::user_role[]);
$$;

-- Drop old versions if they exist
drop function if exists public.list_students_fast();

-- Create the fast student listing function
create or replace function public.list_students_fast()
returns table (
  id uuid,
  registration_id text,
  application_number text,
  university_roll_number text,
  full_name text,
  email text,
  phone text,
  gender text,
  date_of_birth text,
  nationality text,
  school_id uuid,
  department_id uuid,
  programme_id uuid,
  batch_id uuid,
  academic_year_id uuid,
  current_year integer,
  current_term text,
  student_status text,
  academic_status text,
  admission_type text,
  quota text,
  workflow text,
  is_archived boolean,
  created_at text,
  updated_at text
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
stable
as $$
declare
  v_role public.user_role;
  v_school_id uuid;
  v_department_id uuid;
begin
  -- Check caller role ONCE (not per row)
  select p.role, p.school_id, p.department_id
  into v_role, v_school_id, v_department_id
  from public.profiles p
  where p.id = auth.uid() and p.is_active;

  if v_role is null then
    raise exception 'An active portal profile is required to view student data.';
  end if;

  -- Return rows based on the caller's role
  if v_role in ('super_admin', 'iqac_admin', 'registrar', 'iqac_viewer', 'auditor', 'verifier', 'data_entry') then
    -- Full access: return all students
    return query
      select
        s.id,
        s.registration_id,
        coalesce(s.application_number, '')   as application_number,
        coalesce(s.university_roll_number, '') as university_roll_number,
        s.full_name,
        coalesce(s.email, '')                as email,
        coalesce(s.phone, '')                as phone,
        coalesce(s.gender::text, 'prefer_not_to_say') as gender,
        coalesce(s.date_of_birth::text, '')  as date_of_birth,
        coalesce(s.nationality, 'India')     as nationality,
        s.school_id,
        s.department_id,
        s.programme_id,
        s.batch_id,
        s.academic_year_id,
        coalesce(s.current_year, 1)          as current_year,
        coalesce(s.current_term, '')         as current_term,
        s.student_status::text               as student_status,
        s.academic_status::text              as academic_status,
        coalesce(s.admission_type, '')       as admission_type,
        coalesce(s.quota, '')                as quota,
        s.workflow::text                     as workflow,
        s.is_archived,
        s.created_at::text                   as created_at,
        s.updated_at::text                   as updated_at
      from public.students s
      order by s.registration_id;

  elsif v_role = 'dean' then
    -- Dean: filter by school
    return query
      select
        s.id,
        s.registration_id,
        coalesce(s.application_number, '')   as application_number,
        coalesce(s.university_roll_number, '') as university_roll_number,
        s.full_name,
        coalesce(s.email, '')                as email,
        coalesce(s.phone, '')                as phone,
        coalesce(s.gender::text, 'prefer_not_to_say') as gender,
        coalesce(s.date_of_birth::text, '')  as date_of_birth,
        coalesce(s.nationality, 'India')     as nationality,
        s.school_id,
        s.department_id,
        s.programme_id,
        s.batch_id,
        s.academic_year_id,
        coalesce(s.current_year, 1)          as current_year,
        coalesce(s.current_term, '')         as current_term,
        s.student_status::text               as student_status,
        s.academic_status::text              as academic_status,
        coalesce(s.admission_type, '')       as admission_type,
        coalesce(s.quota, '')                as quota,
        s.workflow::text                     as workflow,
        s.is_archived,
        s.created_at::text                   as created_at,
        s.updated_at::text                   as updated_at
      from public.students s
      where s.school_id = v_school_id
      order by s.registration_id;

  elsif v_role in ('hod', 'faculty') then
    -- HOD/Faculty: filter by department
    return query
      select
        s.id,
        s.registration_id,
        coalesce(s.application_number, '')   as application_number,
        coalesce(s.university_roll_number, '') as university_roll_number,
        s.full_name,
        coalesce(s.email, '')                as email,
        coalesce(s.phone, '')                as phone,
        coalesce(s.gender::text, 'prefer_not_to_say') as gender,
        coalesce(s.date_of_birth::text, '')  as date_of_birth,
        coalesce(s.nationality, 'India')     as nationality,
        s.school_id,
        s.department_id,
        s.programme_id,
        s.batch_id,
        s.academic_year_id,
        coalesce(s.current_year, 1)          as current_year,
        coalesce(s.current_term, '')         as current_term,
        s.student_status::text               as student_status,
        s.academic_status::text              as academic_status,
        coalesce(s.admission_type, '')       as admission_type,
        coalesce(s.quota, '')                as quota,
        s.workflow::text                     as workflow,
        s.is_archived,
        s.created_at::text                   as created_at,
        s.updated_at::text                   as updated_at
      from public.students s
      where s.department_id = v_department_id
      order by s.registration_id;

  else
    raise exception 'Your role (%) does not have permission to list students.', v_role;
  end if;
end;
$$;

-- Permissions
revoke all on function public.list_students_fast() from public;
grant execute on function public.list_students_fast() to authenticated;

-- Add index on registration_id for ORDER BY performance (idempotent)
create index if not exists idx_students_registration_id on public.students (registration_id);
