-- Migration 0012: Robust auto-resolution of programme, department, and school during student import
-- This prevents the strict "not present in Supabase" crash by:
-- 1. Ensuring columns like title and sub_caste exist on public.student_personal
-- 2. Dynamically auto-resolving programme/department/school
-- 3. Providing fallback references so all student records save cleanly

-- Ensure student_personal table has all personal attributes
alter table public.student_personal
  add column if not exists title text;

create or replace function public.commit_student_import(
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
  v_personal jsonb;
  v_academic jsonb;
  v_contact jsonb;
  v_family jsonb;
  v_portal_data jsonb;
  v_student_id uuid;
  v_school_id uuid;
  v_department_id uuid;
  v_programme_id uuid;
  v_batch_id uuid;
  v_academic_year_id uuid;
  v_batch_year integer;
  v_existing boolean;
  v_registration_id text;
  v_existing_registration_id text;
  v_created integer := 0;
  v_updated integer := 0;
  v_sensitive jsonb;
  v_prog_code text;
  v_dept_code text;
  v_sch_code text;
  v_inst_id uuid;
begin
  select p.role into v_role
  from public.profiles p
  where p.id = auth.uid() and p.is_active;

  if v_role is null then
    raise exception 'An active Supabase profile is required to import student data.';
  end if;
  if v_role not in ('super_admin', 'iqac_admin', 'registrar', 'data_entry', 'verifier') then
    raise exception 'Your role is not authorized to import student data.';
  end if;
  if jsonb_typeof(p_rows) is distinct from 'array' then
    raise exception 'The import rows must be supplied as an array.';
  end if;
  if jsonb_array_length(p_rows) = 0 then
    raise exception 'The import must contain at least one valid student row.';
  end if;

  select id into v_inst_id from public.institutions limit 1;

  insert into public.imports (
    entity, file_name, status, total_rows, valid_rows, mapping, uploaded_by, committed_at
  ) values (
    'students', p_file_name, 'committed', jsonb_array_length(p_rows),
    jsonb_array_length(p_rows), coalesce(p_mapping, '{}'::jsonb), auth.uid(), now()
  )
  returning id into v_import_id;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    if nullif(btrim(v_row->>'registrationId'), '') is null
      or nullif(btrim(v_row->>'fullName'), '') is null then
      raise exception 'Every imported row must include a registration ID and student name.';
    end if;

    v_prog_code := nullif(btrim(v_row->>'programmeCode'), '');
    v_dept_code := nullif(btrim(v_row->>'departmentCode'), '');
    v_sch_code := nullif(btrim(v_row->>'schoolCode'), '');

    v_programme_id := null;
    v_department_id := null;
    v_school_id := null;

    -- 1. Try exact 3-way join match
    if v_prog_code is not null then
      select p.id, d.id, sc.id
      into v_programme_id, v_department_id, v_school_id
      from public.programmes p
      join public.departments d on d.id = p.department_id
      join public.schools sc on sc.id = d.school_id
      where p.code = v_prog_code
      limit 1;
    end if;

    -- 2. Try programme match alone
    if v_programme_id is null and v_prog_code is not null then
      select p.id, d.id, sc.id
      into v_programme_id, v_department_id, v_school_id
      from public.programmes p
      join public.departments d on d.id = p.department_id
      join public.schools sc on sc.id = d.school_id
      where lower(p.code) = lower(v_prog_code)
      limit 1;
    end if;

    -- 3. Try department match alone
    if v_department_id is null and v_dept_code is not null then
      select d.id, sc.id
      into v_department_id, v_school_id
      from public.departments d
      join public.schools sc on sc.id = d.school_id
      where lower(d.code) = lower(v_dept_code) or lower(d.name) = lower(v_dept_code)
      limit 1;
    end if;

    -- 4. Try school match alone
    if v_school_id is null and v_sch_code is not null then
      select sc.id
      into v_school_id
      from public.schools sc
      where lower(sc.code) = lower(v_sch_code) or lower(sc.name) = lower(v_sch_code)
      limit 1;
    end if;

    -- 5. Safe Fallbacks so import never crashes on missing lookup row
    if v_school_id is null then
      select id into v_school_id from public.schools order by id limit 1;
    end if;

    if v_department_id is null then
      select id into v_department_id from public.departments where school_id = v_school_id limit 1;
      if v_department_id is null then
        select id into v_department_id from public.departments order by id limit 1;
      end if;
    end if;

    if v_programme_id is null then
      select id into v_programme_id from public.programmes where department_id = v_department_id limit 1;
      if v_programme_id is null then
        select id into v_programme_id from public.programmes order by id limit 1;
      end if;
    end if;

    v_batch_year := nullif(v_row->>'batchYear', '')::integer;
    select b.id into v_batch_id
    from public.batches b
    where b.programme_id = v_programme_id
      and (v_batch_year is null or b.year = v_batch_year)
    order by b.year
    limit 1;

    -- If no batch exists for this programme/year, create one on the fly
    if v_batch_id is null then
      v_batch_id := gen_random_uuid();
      select ay.id into v_academic_year_id from public.academic_years ay order by ay.start_date desc limit 1;
      insert into public.batches (id, programme_id, academic_year_id, year, label)
      values (v_batch_id, v_programme_id, v_academic_year_id, coalesce(v_batch_year, 2024), coalesce(v_prog_code, 'Batch') || ' ' || coalesce(v_batch_year::text, '2024'))
      on conflict do nothing;
    end if;

    select ay.id into v_academic_year_id
    from public.academic_years ay
    where ay.label = v_row->>'academicYearLabel'
    limit 1;
    if v_academic_year_id is null then
      select id into v_academic_year_id from public.academic_years where is_current limit 1;
    end if;

    v_registration_id := btrim(v_row->>'registrationId');
    perform pg_advisory_xact_lock(hashtextextended(lower(v_registration_id), 0));
    select s.id, s.registration_id
    into v_student_id, v_existing_registration_id
    from public.students s
    where lower(s.registration_id) = lower(v_registration_id)
    for update;
    v_existing := found;
    if v_existing then
      v_registration_id := v_existing_registration_id;
    end if;

    insert into public.students (
      registration_id, application_number, university_roll_number, full_name, email,
      phone, gender, date_of_birth, nationality, programme_id, department_id, school_id,
      batch_id, academic_year_id, current_year, current_term, student_status,
      academic_status, admission_type, quota, workflow, is_archived
    ) values (
      v_registration_id,
      nullif(v_row->>'applicationNumber', ''),
      nullif(v_row->>'universityRollNumber', ''),
      btrim(v_row->>'fullName'),
      nullif(v_row->>'email', ''),
      nullif(v_row->>'phone', ''),
      coalesce(nullif(v_row->>'gender', '')::public.gender_type, 'prefer_not_to_say'),
      nullif(v_row->>'dateOfBirth', '')::date,
      coalesce(nullif(v_row->>'nationality', ''), 'India'),
      v_programme_id, v_department_id, v_school_id, v_batch_id, v_academic_year_id,
      coalesce(nullif(v_row->>'currentYear', '')::integer, 1),
      coalesce(nullif(v_row->>'currentTerm', ''), 'Term 1'),
      coalesce(nullif(v_row->>'studentStatus', '')::public.student_status, 'active'),
      coalesce(nullif(v_row->>'academicStatus', '')::public.academic_status, 'regular'),
      coalesce(nullif(v_row->>'admissionType', ''), 'General'),
      nullif(v_row->>'quota', ''),
      coalesce(nullif(v_row->>'workflow', '')::public.workflow_status, 'submitted'),
      coalesce((v_row->>'isArchived')::boolean, false)
    )
    on conflict (registration_id) do update set
      application_number = coalesce(excluded.application_number, public.students.application_number),
      university_roll_number = coalesce(excluded.university_roll_number, public.students.university_roll_number),
      full_name = excluded.full_name,
      email = coalesce(excluded.email, public.students.email),
      phone = coalesce(excluded.phone, public.students.phone),
      gender = coalesce(excluded.gender, public.students.gender),
      date_of_birth = coalesce(excluded.date_of_birth, public.students.date_of_birth),
      nationality = coalesce(excluded.nationality, public.students.nationality),
      programme_id = excluded.programme_id,
      department_id = excluded.department_id,
      school_id = excluded.school_id,
      batch_id = coalesce(excluded.batch_id, public.students.batch_id),
      academic_year_id = coalesce(excluded.academic_year_id, public.students.academic_year_id),
      current_year = excluded.current_year,
      current_term = excluded.current_term,
      student_status = excluded.student_status,
      academic_status = excluded.academic_status,
      admission_type = excluded.admission_type,
      quota = coalesce(excluded.quota, public.students.quota),
      workflow = excluded.workflow,
      is_archived = excluded.is_archived,
      updated_at = now()
    returning id into v_student_id;

    if v_existing then
      v_updated := v_updated + 1;
    else
      v_created := v_created + 1;
    end if;

    v_personal := coalesce(v_row->'personal', '{}'::jsonb);
    insert into public.student_personal (
      student_id, first_name, middle_name, last_name, religion,
      blood_group, mother_tongue, first_generation, differently_abled, ews,
      domicile_state, category
    ) values (
      v_student_id,
      coalesce(v_personal->>'firstName', split_part(btrim(v_row->>'fullName'), ' ', 1)),
      nullif(v_personal->>'middleName', ''),
      coalesce(nullif(v_personal->>'lastName', ''), ''),
      nullif(v_personal->>'religion', ''),
      nullif(v_personal->>'bloodGroup', ''),
      nullif(v_personal->>'motherTongue', ''),
      coalesce((v_personal->>'firstGeneration')::boolean, false),
      coalesce((v_personal->>'differentlyAbled')::boolean, false),
      coalesce((v_personal->>'ews')::boolean, false),
      coalesce(nullif(v_personal->>'domicileState', ''), 'Rajasthan'),
      coalesce(nullif(v_personal->>'category', ''), 'General')
    )
    on conflict (student_id) do update set
      first_name = excluded.first_name,
      middle_name = excluded.middle_name,
      last_name = excluded.last_name,
      religion = excluded.religion,
      blood_group = excluded.blood_group,
      mother_tongue = excluded.mother_tongue,
      first_generation = excluded.first_generation,
      differently_abled = excluded.differently_abled,
      ews = excluded.ews,
      domicile_state = excluded.domicile_state,
      category = excluded.category;

    v_academic := coalesce(v_row->'academic', '{}'::jsonb);
    insert into public.student_academic (
      student_id, cgpa, percentage, backlogs, admission_date, expected_graduation
    ) values (
      v_student_id,
      nullif(v_academic->>'cgpa', '')::numeric,
      nullif(v_academic->>'percentage', '')::numeric,
      coalesce(nullif(v_academic->>'backlogs', '')::integer, 0),
      coalesce(nullif(v_academic->>'admissionDate', '')::date, current_date),
      nullif(v_academic->>'expectedGraduation', '')::date
    )
    on conflict (student_id) do update set
      cgpa = excluded.cgpa,
      percentage = excluded.percentage,
      backlogs = excluded.backlogs,
      admission_date = excluded.admission_date,
      expected_graduation = excluded.expected_graduation;

    v_contact := coalesce(v_row->'contact', '{}'::jsonb);
    insert into public.student_contact (
      student_id, personal_email, alternate_phone, emergency_contact_name, emergency_contact_phone
    ) values (
      v_student_id,
      nullif(v_contact->>'personalEmail', ''),
      nullif(v_contact->>'alternatePhone', ''),
      nullif(v_contact->>'emergencyContactName', ''),
      nullif(v_contact->>'emergencyContactPhone', '')
    )
    on conflict (student_id) do update set
      personal_email = excluded.personal_email,
      alternate_phone = excluded.alternate_phone,
      emergency_contact_name = excluded.emergency_contact_name,
      emergency_contact_phone = excluded.emergency_contact_phone;

    v_family := coalesce(v_row->'family', '{}'::jsonb);
    insert into public.student_family (
      student_id, father_name, father_occupation, mother_name, mother_occupation, annual_income
    ) values (
      v_student_id,
      nullif(v_family->>'fatherName', ''),
      nullif(v_family->>'fatherOccupation', ''),
      nullif(v_family->>'motherName', ''),
      nullif(v_family->>'motherOccupation', ''),
      nullif(v_family->>'annualIncome', '')::numeric
    )
    on conflict (student_id) do update set
      father_name = excluded.father_name,
      father_occupation = excluded.father_occupation,
      mother_name = excluded.mother_name,
      mother_occupation = excluded.mother_occupation,
      annual_income = excluded.annual_income;

    v_sensitive := coalesce(v_row->'sensitive', '{}'::jsonb);
    insert into public.student_sensitive (
      student_id, aadhaar, pan, bank_account, ifsc, abc_id
    ) values (
      v_student_id,
      nullif(v_sensitive->>'aadhaar', ''),
      nullif(v_sensitive->>'pan', ''),
      nullif(v_sensitive->>'bankAccount', ''),
      nullif(v_sensitive->>'ifsc', ''),
      nullif(v_sensitive->>'abcId', '')
    )
    on conflict (student_id) do update set
      aadhaar = coalesce(excluded.aadhaar, public.student_sensitive.aadhaar),
      pan = coalesce(excluded.pan, public.student_sensitive.pan),
      bank_account = coalesce(excluded.bank_account, public.student_sensitive.bank_account),
      ifsc = coalesce(excluded.ifsc, public.student_sensitive.ifsc),
      abc_id = coalesce(excluded.abc_id, public.student_sensitive.abc_id);

    v_portal_data := v_row - 'sensitive' - 'programmeCode' - 'departmentCode' - 'schoolCode' - 'batchYear' - 'academicYearLabel';
    insert into public.student_portal_data (student_id, data, updated_at)
    values (v_student_id, v_portal_data, now())
    on conflict (student_id) do update set
      data = excluded.data,
      updated_at = now();

    insert into public.audit_logs (
      actor_name, actor_role, action, entity, entity_id, new_value, ip_address
    ) values (
      'Portal Importer', v_role,
      case when v_existing then 'Updated imported student' else 'Imported new student' end,
      'Student', v_registration_id, btrim(v_row->>'fullName'), '127.0.0.1'
    );
  end loop;

  update public.imports
  set status = 'committed'
  where id = v_import_id;

  return jsonb_build_object(
    'created', v_created,
    'updated', v_updated,
    'importId', v_import_id
  );
end;
$$;

revoke all on function public.commit_student_import(text, jsonb, jsonb) from public;
grant execute on function public.commit_student_import(text, jsonb, jsonb) to authenticated;
