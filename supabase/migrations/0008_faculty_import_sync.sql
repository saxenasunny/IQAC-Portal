create or replace function public.commit_faculty_import(
  p_file_name text,
  p_mapping jsonb,
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role public.user_role;
  v_import_id uuid;
  v_row jsonb;
  v_employee_id text;
  v_faculty_id uuid;
  v_school_id uuid;
  v_department_id uuid;
  v_existing boolean;
  v_created integer := 0;
  v_updated integer := 0;
begin
  select p.role into v_role
  from public.profiles p
  where p.id = auth.uid() and p.is_active;

  if v_role is null then
    raise exception 'An active Supabase profile is required to import faculty data.';
  end if;
  if v_role not in ('super_admin', 'iqac_admin', 'registrar', 'data_entry') then
    raise exception 'Your role is not authorized to import faculty data.';
  end if;
  if jsonb_typeof(p_rows) is distinct from 'array' then
    raise exception 'The faculty import rows must be supplied as an array.';
  end if;
  if jsonb_array_length(p_rows) = 0 or jsonb_array_length(p_rows) > 25 then
    raise exception 'A faculty import batch must contain between 1 and 25 rows.';
  end if;

  insert into public.imports (
    entity, file_name, status, total_rows, valid_rows, mapping, uploaded_by, committed_at
  ) values (
    'faculty', p_file_name, 'committed', jsonb_array_length(p_rows),
    jsonb_array_length(p_rows), coalesce(p_mapping, '{}'::jsonb), auth.uid(), now()
  )
  returning id into v_import_id;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_employee_id := nullif(btrim(v_row->>'employeeId'), '');
    if v_employee_id is null or nullif(btrim(v_row->>'fullName'), '') is null
      or nullif(btrim(v_row->>'designation'), '') is null then
      raise exception 'Every imported faculty row must include an employee ID, full name, and designation.';
    end if;

    v_school_id := null;
    v_department_id := null;
    if nullif(btrim(v_row->>'departmentCode'), '') is not null then
      select d.id, s.id into v_department_id, v_school_id
      from public.departments d
      join public.schools s on s.id = d.school_id
      where d.code = v_row->>'departmentCode'
        and (nullif(btrim(v_row->>'schoolCode'), '') is null or s.code = v_row->>'schoolCode');

      if v_department_id is null then
        raise exception 'Department % or its selected school is not present in Supabase. Apply the latest catalogue seed data before importing.',
          v_row->>'departmentCode';
      end if;
    elsif nullif(btrim(v_row->>'schoolCode'), '') is not null then
      select s.id into v_school_id
      from public.schools s
      where s.code = v_row->>'schoolCode';

      if v_school_id is null then
        raise exception 'School % is not present in Supabase. Apply the latest catalogue seed data before importing.',
          v_row->>'schoolCode';
      end if;
    end if;

    perform pg_advisory_xact_lock(hashtextextended(lower(v_employee_id), 0));
    select f.id into v_faculty_id
    from public.faculty f
    where lower(f.employee_id) = lower(v_employee_id)
    for update;
    v_existing := found;

    if v_existing then
      update public.faculty
      set
        full_name = btrim(v_row->>'fullName'),
        email = nullif(btrim(v_row->>'email'), ''),
        phone = nullif(btrim(v_row->>'phone'), ''),
        gender = nullif(v_row->>'gender', '')::gender_type,
        date_of_birth = nullif(v_row->>'dateOfBirth', '')::date,
        school_id = v_school_id,
        department_id = v_department_id,
        designation = btrim(v_row->>'designation'),
        employment_type = coalesce(nullif(v_row->>'employmentType', '')::employment_type, 'permanent'::employment_type),
        joining_date = nullif(v_row->>'joiningDate', '')::date,
        highest_qualification = nullif(btrim(v_row->>'highestQualification'), ''),
        specialization = nullif(btrim(v_row->>'specialization'), ''),
        orcid = nullif(btrim(v_row->>'orcid'), ''),
        google_scholar = nullif(btrim(v_row->>'googleScholar'), ''),
        scopus_id = nullif(btrim(v_row->>'scopusId'), ''),
        teaching_experience_years = coalesce(nullif(v_row->>'teachingExperienceYears', '')::numeric, 0),
        research_experience_years = coalesce(nullif(v_row->>'researchExperienceYears', '')::numeric, 0),
        is_active = coalesce((v_row->>'isActive')::boolean, true),
        workflow = coalesce(nullif(v_row->>'workflow', '')::workflow_status, 'submitted'::workflow_status),
        updated_at = now()
      where id = v_faculty_id;
      v_updated := v_updated + 1;
    else
      insert into public.faculty (
        employee_id, full_name, email, phone, gender, date_of_birth, school_id,
        department_id, designation, employment_type, joining_date, highest_qualification,
        specialization, orcid, google_scholar, scopus_id, teaching_experience_years,
        research_experience_years, is_active, workflow
      ) values (
        v_employee_id, btrim(v_row->>'fullName'), nullif(btrim(v_row->>'email'), ''),
        nullif(btrim(v_row->>'phone'), ''), nullif(v_row->>'gender', '')::gender_type,
        nullif(v_row->>'dateOfBirth', '')::date, v_school_id, v_department_id,
        btrim(v_row->>'designation'),
        coalesce(nullif(v_row->>'employmentType', '')::employment_type, 'permanent'::employment_type),
        nullif(v_row->>'joiningDate', '')::date,
        nullif(btrim(v_row->>'highestQualification'), ''),
        nullif(btrim(v_row->>'specialization'), ''),
        nullif(btrim(v_row->>'orcid'), ''),
        nullif(btrim(v_row->>'googleScholar'), ''),
        nullif(btrim(v_row->>'scopusId'), ''),
        coalesce(nullif(v_row->>'teachingExperienceYears', '')::numeric, 0),
        coalesce(nullif(v_row->>'researchExperienceYears', '')::numeric, 0),
        coalesce((v_row->>'isActive')::boolean, true),
        coalesce(nullif(v_row->>'workflow', '')::workflow_status, 'submitted'::workflow_status)
      );
      v_created := v_created + 1;
    end if;
  end loop;

  update public.imports
  set new_count = v_created, updated_count = v_updated
  where id = v_import_id;

  return jsonb_build_object(
    'created', v_created,
    'updated', v_updated,
    'import_id', v_import_id
  );
end;
$$;

revoke all on function public.commit_faculty_import(text, jsonb, jsonb) from public;
grant execute on function public.commit_faculty_import(text, jsonb, jsonb) to authenticated;
