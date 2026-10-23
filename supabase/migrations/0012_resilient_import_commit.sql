-- Migration 0012: Clean and resilient commit_student_import function
-- 1. Ensure student_personal table has all personal attributes
alter table public.student_personal
  add column if not exists title text;

alter table public.student_sensitive
  add column if not exists additional_identifiers jsonb not null default '{}'::jsonb;

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

  insert into public.imports (
    file_name,
    file_type,
    total_rows,
    valid_rows,
    error_rows,
    status,
    field_mapping,
    created_by
  ) values (
    p_file_name,
    'students',
    coalesce(jsonb_array_length(p_rows), 0),
    0,
    0,
    'processing',
    coalesce(p_mapping, '{}'::jsonb),
    auth.uid()
  )
  returning id into v_import_id;

  for v_row in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb))
  loop
    v_school_id := null;
    v_department_id := null;
    v_programme_id := null;
    v_batch_id := null;

    v_prog_code := nullif(btrim(v_row->>'programmeCode'), '');
    v_dept_code := nullif(btrim(v_row->>'departmentCode'), '');
    v_sch_code := nullif(btrim(v_row->>'schoolCode'), '');

    -- 1. Precise 3-level match
    if v_prog_code is not null then
      select p.id, d.id, sc.id
      into v_programme_id, v_department_id, v_school_id
      from public.programmes p
      join public.departments d on d.id = p.department_id
      join public.schools sc on sc.id = d.school_id
      where (lower(p.code) = lower(v_prog_code) or lower(p.name) = lower(v_prog_code))
        and (v_dept_code is null or lower(d.code) = lower(v_dept_code) or lower(d.name) = lower(v_dept_code))
        and (v_sch_code is null or lower(sc.code) = lower(v_sch_code) or lower(sc.name) = lower(v_sch_code))
      limit 1;
    end if;

    -- 2. Try programme match alone
    if v_programme_id is null and v_prog_code is not null then
      select p.id, d.id, sc.id
      into v_programme_id, v_department_id, v_school_id
      from public.programmes p
      join public.departments d on d.id = p.department_id
      join public.schools sc on sc.id = d.school_id
      where lower(p.code) = lower(v_prog_code) or lower(p.name) = lower(v_prog_code)
      limit 1;
    end if;

    -- 2b. Try matching without special characters
    if v_programme_id is null and v_prog_code is not null then
      select p.id, d.id, sc.id
      into v_programme_id, v_department_id, v_school_id
      from public.programmes p
      join public.departments d on d.id = p.department_id
      join public.schools sc on sc.id = d.school_id
      where lower(regexp_replace(p.name, '[^a-zA-Z0-9]+', '', 'g')) = lower(regexp_replace(v_prog_code, '[^a-zA-Z0-9]+', '', 'g'))
         or lower(regexp_replace(p.code, '[^a-zA-Z0-9]+', '', 'g')) = lower(regexp_replace(v_prog_code, '[^a-zA-Z0-9]+', '', 'g'))
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

    -- 5. Safe Fallbacks
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

    if v_batch_id is null then
      v_batch_id := gen_random_uuid();
      select ay.id into v_academic_year_id from public.academic_years ay order by ay.start_date desc limit 1;
      insert into public.batches (id, programme_id, academic_year_id, year, label)
      values (v_batch_id, v_programme_id, v_academic_year_id, coalesce(v_batch_year, 2024), coalesce(v_prog_code, 'Batch') || ' ' || coalesce(v_batch_year::text, '2024'))
      on conflict (programme_id, year) do update set label = excluded.label
      returning id into v_batch_id;
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
    v_existing := (v_student_id is not null);
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
      student_id, first_name, middle_name, last_name, title, religion,
      blood_group, mother_tongue, first_generation, differently_abled, ews,
      domicile_state, category
    ) values (
      v_student_id,
      coalesce(v_personal->>'firstName', split_part(btrim(v_row->>'fullName'), ' ', 1)),
      nullif(v_personal->>'middleName', ''),
      coalesce(nullif(v_personal->>'lastName', ''), ''),
      nullif(v_personal->>'title', ''),
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
      first_name = coalesce(excluded.first_name, public.student_personal.first_name),
      middle_name = coalesce(excluded.middle_name, public.student_personal.middle_name),
      last_name = coalesce(excluded.last_name, public.student_personal.last_name),
      title = coalesce(excluded.title, public.student_personal.title),
      religion = coalesce(excluded.religion, public.student_personal.religion),
      blood_group = coalesce(excluded.blood_group, public.student_personal.blood_group),
      mother_tongue = coalesce(excluded.mother_tongue, public.student_personal.mother_tongue),
      first_generation = excluded.first_generation,
      differently_abled = excluded.differently_abled,
      ews = excluded.ews,
      domicile_state = coalesce(excluded.domicile_state, public.student_personal.domicile_state),
      category = coalesce(excluded.category, public.student_personal.category);

    v_academic := coalesce(v_row->'academic', '{}'::jsonb);
    insert into public.student_academic (
      student_id, cgpa, percentage, backlogs, admission_date, expected_graduation
    ) values (
      v_student_id,
      nullif(v_academic->>'cgpa', '')::numeric,
      nullif(v_academic->>'percentage', '')::numeric,
      coalesce(nullif(v_academic->>'backlogs', '')::integer, 0),
      nullif(v_academic->>'admissionDate', '')::date,
      nullif(v_academic->>'expectedGraduation', '')::date
    )
    on conflict (student_id) do update set
      cgpa = coalesce(excluded.cgpa, public.student_academic.cgpa),
      percentage = coalesce(excluded.percentage, public.student_academic.percentage),
      backlogs = excluded.backlogs,
      admission_date = coalesce(excluded.admission_date, public.student_academic.admission_date),
      expected_graduation = coalesce(excluded.expected_graduation, public.student_academic.expected_graduation);

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
      personal_email = coalesce(excluded.personal_email, public.student_contact.personal_email),
      alternate_phone = coalesce(excluded.alternate_phone, public.student_contact.alternate_phone),
      emergency_contact_name = coalesce(excluded.emergency_contact_name, public.student_contact.emergency_contact_name),
      emergency_contact_phone = coalesce(excluded.emergency_contact_phone, public.student_contact.emergency_contact_phone);

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
      father_name = coalesce(excluded.father_name, public.student_family.father_name),
      father_occupation = coalesce(excluded.father_occupation, public.student_family.father_occupation),
      mother_name = coalesce(excluded.mother_name, public.student_family.mother_name),
      mother_occupation = coalesce(excluded.mother_occupation, public.student_family.mother_occupation),
      annual_income = coalesce(excluded.annual_income, public.student_family.annual_income);

    v_sensitive := coalesce(v_row->'sensitive', '{}'::jsonb);
    insert into public.student_sensitive (
      student_id, aadhaar, pan, bank_account, ifsc, abc_id, additional_identifiers
    ) values (
      v_student_id,
      nullif(v_sensitive->>'aadhaar', ''),
      nullif(v_sensitive->>'pan', ''),
      nullif(v_sensitive->>'bankAccount', ''),
      nullif(v_sensitive->>'ifsc', ''),
      nullif(v_sensitive->>'abcId', ''),
      coalesce(v_sensitive->'additionalIdentifiers', '{}'::jsonb)
    )
    on conflict (student_id) do update set
      aadhaar = coalesce(excluded.aadhaar, public.student_sensitive.aadhaar),
      pan = coalesce(excluded.pan, public.student_sensitive.pan),
      bank_account = coalesce(excluded.bank_account, public.student_sensitive.bank_account),
      ifsc = coalesce(excluded.ifsc, public.student_sensitive.ifsc),
      abc_id = coalesce(excluded.abc_id, public.student_sensitive.abc_id),
      additional_identifiers = coalesce(public.student_sensitive.additional_identifiers, '{}'::jsonb) || coalesce(excluded.additional_identifiers, '{}'::jsonb);

    v_portal_data := v_row - 'sensitive' - 'programmeCode' - 'departmentCode' - 'schoolCode' - 'batchYear' - 'academicYearLabel';
    insert into public.student_portal_data (student_id, data, updated_at)
    values (v_student_id, v_portal_data, now())
    on conflict (student_id) do update set
      data = excluded.data,
      updated_at = now();
  end loop;

  update public.imports
  set status = 'committed'
  where id = v_import_id;

  return jsonb_build_object(
    'created', v_created,
    'updated', v_updated,
    'import_id', v_import_id,
    'importId', v_import_id
  );
end;
$$;

revoke all on function public.commit_student_import(text, jsonb, jsonb) from public;
grant execute on function public.commit_student_import(text, jsonb, jsonb) to authenticated;

-- 4. Overload with 4 parameters (for sensitive / protected identifier batches)
create or replace function public.commit_student_import(
  p_file_name text,
  p_mapping jsonb,
  p_rows jsonb,
  p_sensitive_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role public.user_role;
  v_item jsonb;
  v_identifiers jsonb;
  v_registration_id text;
  v_student_id uuid;
  v_result jsonb;
begin
  if jsonb_typeof(coalesce(p_sensitive_rows, '[]'::jsonb)) <> 'array' then
    raise exception 'Protected import attributes must be an array.';
  end if;

  select p.role into v_role
  from public.profiles p
  where p.id = auth.uid() and p.is_active;

  if v_role is null or v_role not in ('super_admin', 'iqac_admin', 'registrar', 'data_entry', 'verifier') then
    raise exception 'Your role is not authorized to import student data.';
  end if;

  -- 1. Run core import via 3-param overload
  v_result := public.commit_student_import(p_file_name, p_mapping, p_rows);

  -- 2. Process sensitive / protected identifiers
  for v_item in
    select item
    from jsonb_array_elements(coalesce(p_sensitive_rows, '[]'::jsonb)) as items(item)
  loop
    v_registration_id := nullif(btrim(v_item->>'registrationId'), '');
    v_identifiers := v_item->'identifiers';
    if v_registration_id is null or jsonb_typeof(v_identifiers) <> 'object' then
      continue;
    end if;
    if v_identifiers = '{}'::jsonb then
      continue;
    end if;

    select s.id into v_student_id
    from public.students s
    where lower(s.registration_id) = lower(v_registration_id);
    
    if v_student_id is not null then
      insert into public.student_sensitive as existing (student_id, additional_identifiers)
      values (v_student_id, v_identifiers)
      on conflict (student_id) do update
        set additional_identifiers = coalesce(existing.additional_identifiers, '{}'::jsonb) || excluded.additional_identifiers;
    end if;
  end loop;

  return jsonb_build_object(
    'created', coalesce((v_result->>'created')::integer, 0),
    'updated', coalesce((v_result->>'updated')::integer, 0),
    'import_id', coalesce(v_result->>'import_id', v_result->>'importId'),
    'importId', coalesce(v_result->>'importId', v_result->>'import_id')
  );
end;
$$;

revoke all on function public.commit_student_import(text, jsonb, jsonb, jsonb) from public;
grant execute on function public.commit_student_import(text, jsonb, jsonb, jsonb) to authenticated;
