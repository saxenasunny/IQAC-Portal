alter table public.students
  add column if not exists quota text;

create table if not exists public.student_portal_data (
  student_id uuid primary key references public.students(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.student_portal_data enable row level security;

drop policy if exists student_portal_data_select on public.student_portal_data;
create policy student_portal_data_select on public.student_portal_data
  for select using (
    exists (
      select 1 from public.students s
      where s.id = student_id
    )
  );

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

    select p.id, d.id, sc.id
    into v_programme_id, v_department_id, v_school_id
    from public.programmes p
    join public.departments d on d.id = p.department_id
    join public.schools sc on sc.id = d.school_id
    where p.code = v_row->>'programmeCode'
      and d.code = v_row->>'departmentCode'
      and sc.code = v_row->>'schoolCode';

    if v_programme_id is null or v_department_id is null or v_school_id is null then
      raise exception 'The programme, department, or school for student % is not present in Supabase. Apply the latest seed data before importing.',
        v_row->>'registrationId';
    end if;

    v_batch_year := nullif(v_row->>'batchYear', '')::integer;
    select b.id into v_batch_id
    from public.batches b
    where b.programme_id = v_programme_id
      and (v_batch_year is null or b.year = v_batch_year)
    order by b.year
    limit 1;

    select ay.id into v_academic_year_id
    from public.academic_years ay
    where ay.label = v_row->>'academicYearLabel'
    limit 1;

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
      nullif(v_row->>'gender', '')::public.gender_type,
      nullif(v_row->>'dateOfBirth', '')::date,
      coalesce(nullif(v_row->>'nationality', ''), 'India'),
      v_programme_id, v_department_id, v_school_id, v_batch_id, v_academic_year_id,
      nullif(v_row->>'currentYear', '')::integer,
      nullif(v_row->>'currentTerm', ''),
      coalesce(nullif(v_row->>'studentStatus', '')::public.student_status, 'active'),
      coalesce(nullif(v_row->>'academicStatus', '')::public.academic_status, 'regular'),
      nullif(v_row->>'admissionType', ''),
      nullif(v_row->>'quota', ''),
      coalesce(nullif(v_row->>'workflow', '')::public.workflow_status, 'submitted'),
      coalesce((v_row->>'isArchived')::boolean, false)
    )
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
      academic_year_id = excluded.academic_year_id,
      current_year = excluded.current_year,
      current_term = excluded.current_term,
      student_status = excluded.student_status,
      academic_status = excluded.academic_status,
      admission_type = excluded.admission_type,
      quota = excluded.quota,
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
    v_academic := coalesce(v_row->'academic', '{}'::jsonb);
    v_contact := coalesce(v_row->'contact', '{}'::jsonb);
    v_family := coalesce(v_row->'family', '{}'::jsonb);
    v_sensitive := coalesce(v_row->'sensitive', '{}'::jsonb);
    if exists (
      select 1
      from jsonb_each_text(coalesce(v_row->'customFields', '{}'::jsonb)) as custom(field_name, field_value)
      where regexp_replace(lower(custom.field_name), '[^a-z0-9]', '', 'g') = any(array[
        'aadhaar', 'aadhar', 'aadhaarnumber', 'aadharnumber', 'pan', 'pannumber',
        'bankaccount', 'bankaccountnumber', 'ifsc', 'ifsccode', 'abcid',
        'academicbankofcreditsid'
      ])
        and nullif(btrim(custom.field_value), '') is not null
    ) then
      raise exception 'Sensitive identifiers must use the protected attribute mappings, not custom fields.';
    end if;
    v_portal_data := v_row - array[
      'id', 'programmeId', 'departmentId', 'schoolId', 'batchId', 'academicYearId',
      'programmeCode', 'departmentCode', 'schoolCode', 'batchYear', 'academicYearLabel',
      'sensitive'
    ]::text[];
    v_portal_data := jsonb_set(
      v_portal_data,
      '{family}',
      v_family - 'annualIncome',
      true
    );

    insert into public.student_portal_data (student_id, data, updated_at)
    values (v_student_id, v_portal_data, now())
    on conflict (student_id) do update set data = excluded.data, updated_at = now();

    insert into public.student_personal (
      student_id, first_name, middle_name, last_name, religion, blood_group,
      mother_tongue, first_generation, differently_abled, ews, domicile_state, category
    ) values (
      v_student_id, nullif(v_personal->>'firstName', ''), nullif(v_personal->>'middleName', ''),
      nullif(v_personal->>'lastName', ''), nullif(v_personal->>'religion', ''),
      nullif(v_personal->>'bloodGroup', ''),
      nullif(v_personal->>'motherTongue', ''),
      coalesce((v_personal->>'firstGeneration')::boolean, false),
      coalesce((v_personal->>'differentlyAbled')::boolean, false),
      coalesce((v_personal->>'ews')::boolean, false),
      nullif(v_personal->>'domicileState', ''), nullif(v_personal->>'category', '')
    )
    on conflict (student_id) do update set
      first_name = excluded.first_name, middle_name = excluded.middle_name,
      last_name = excluded.last_name, religion = excluded.religion,
      blood_group = excluded.blood_group, mother_tongue = excluded.mother_tongue,
      first_generation = excluded.first_generation, differently_abled = excluded.differently_abled,
      ews = excluded.ews, domicile_state = excluded.domicile_state, category = excluded.category;

    insert into public.student_academic (
      student_id, cgpa, percentage, backlogs, admission_date, expected_graduation
    ) values (
      v_student_id, nullif(v_academic->>'cgpa', '')::numeric,
      nullif(v_academic->>'percentage', '')::numeric,
      coalesce(nullif(v_academic->>'backlogs', '')::integer, 0),
      nullif(v_academic->>'admissionDate', '')::date,
      nullif(v_academic->>'expectedGraduation', '')::date
    )
    on conflict (student_id) do update set
      cgpa = excluded.cgpa, percentage = excluded.percentage, backlogs = excluded.backlogs,
      admission_date = excluded.admission_date, expected_graduation = excluded.expected_graduation;

    insert into public.student_contact (
      student_id, personal_email, alternate_phone, emergency_contact_name, emergency_contact_phone
    ) values (
      v_student_id, nullif(v_contact->>'personalEmail', ''),
      nullif(v_contact->>'alternatePhone', ''), nullif(v_contact->>'emergencyContactName', ''),
      nullif(v_contact->>'emergencyContactPhone', '')
    )
    on conflict (student_id) do update set
      personal_email = excluded.personal_email, alternate_phone = excluded.alternate_phone,
      emergency_contact_name = excluded.emergency_contact_name,
      emergency_contact_phone = excluded.emergency_contact_phone;

    insert into public.student_family (
      student_id, father_name, father_occupation, mother_name, mother_occupation, annual_income
    ) values (
      v_student_id, nullif(v_family->>'fatherName', ''), nullif(v_family->>'fatherOccupation', ''),
      nullif(v_family->>'motherName', ''), nullif(v_family->>'motherOccupation', ''),
      nullif(v_family->>'annualIncome', '')::numeric
    )
    on conflict (student_id) do update set
      father_name = excluded.father_name, father_occupation = excluded.father_occupation,
      mother_name = excluded.mother_name, mother_occupation = excluded.mother_occupation,
      annual_income = excluded.annual_income;

    delete from public.student_addresses where student_id = v_student_id;
    insert into public.student_addresses (
      student_id, address_type, line1, line2, city, state, pincode, country
    )
    select
      v_student_id, address->>'type', nullif(address->>'line1', ''), nullif(address->>'line2', ''),
      nullif(address->>'city', ''), nullif(address->>'state', ''),
      nullif(address->>'pincode', ''), coalesce(nullif(address->>'country', ''), 'India')
    from jsonb_array_elements(coalesce(v_row->'addresses', '[]'::jsonb)) as items(address);

    delete from public.student_qualifications where student_id = v_student_id;
    insert into public.student_qualifications (
      student_id, level, board_university, year_of_passing, percentage
    )
    select
      v_student_id, coalesce(nullif(item->>'level', ''), 'Unspecified'),
      nullif(item->>'boardUniversity', ''), nullif(item->>'yearOfPassing', '')::integer,
      nullif(item->>'percentage', '')::numeric
    from jsonb_array_elements(coalesce(v_row->'qualifications', '[]'::jsonb)) as items(item);

    delete from public.student_entrance_exams where student_id = v_student_id;
    insert into public.student_entrance_exams (student_id, exam_name, score, rank, year)
    select
      v_student_id, exam->>'examName', nullif(exam->>'score', '')::numeric,
      nullif(exam->>'rank', '')::integer, nullif(exam->>'year', '')::integer
    from jsonb_array_elements(coalesce(v_row->'entranceExams', '[]'::jsonb)) as items(exam)
    where nullif(exam->>'examName', '') is not null;

    if jsonb_typeof(v_row->'mentor') = 'object' then
      insert into public.student_mentor_mapping (student_id, mentor_name, mentor_email, mentor_phone)
      values (
        v_student_id, nullif(v_row->'mentor'->>'name', ''),
        nullif(v_row->'mentor'->>'email', ''), nullif(v_row->'mentor'->>'phone', '')
      )
      on conflict (student_id) do update set
        mentor_name = excluded.mentor_name, mentor_email = excluded.mentor_email,
        mentor_phone = excluded.mentor_phone;
    end if;

    if jsonb_typeof(v_row->'sensitive') = 'object'
      and (v_sensitive - array['aadhaar', 'pan', 'bankAccount', 'ifsc', 'abcId']) <> '{}'::jsonb then
      raise exception 'Sensitive fields are restricted to IQAC and super administrators.';
    end if;
    if nullif(v_sensitive->>'aadhaar', '') is not null
      or nullif(v_sensitive->>'pan', '') is not null
      or nullif(v_sensitive->>'bankAccount', '') is not null
      or nullif(v_sensitive->>'ifsc', '') is not null
      or nullif(v_sensitive->>'abcId', '') is not null then
      if v_role not in ('super_admin', 'iqac_admin') then
        raise exception 'Your role cannot import Aadhaar, PAN, bank, or ABC ID fields.';
      end if;
      insert into public.student_sensitive (
        student_id, aadhaar, pan, bank_account, ifsc, abc_id
      ) values (
        v_student_id, nullif(v_sensitive->>'aadhaar', ''), nullif(v_sensitive->>'pan', ''),
        nullif(v_sensitive->>'bankAccount', ''), nullif(v_sensitive->>'ifsc', ''),
        nullif(v_sensitive->>'abcId', '')
      )
      on conflict (student_id) do update set
        aadhaar = excluded.aadhaar, pan = excluded.pan, bank_account = excluded.bank_account,
        ifsc = excluded.ifsc, abc_id = excluded.abc_id;
    end if;
  end loop;

  update public.imports
  set new_count = v_created, updated_count = v_updated, valid_rows = v_created + v_updated
  where id = v_import_id;

  return jsonb_build_object('import_id', v_import_id, 'created', v_created, 'updated', v_updated);
end;
$$;

create or replace function public.list_portal_students()
returns setof jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role public.user_role;
begin
  select p.role into v_role
  from public.profiles p
  where p.id = auth.uid() and p.is_active;

  if v_role is null then
    raise exception 'An active Supabase profile is required to view student data.';
  end if;

  return query
  select
    coalesce(pd.data, '{}'::jsonb) ||
    jsonb_build_object(
      'id', s.id::text,
      'registrationId', s.registration_id,
      'applicationNumber', coalesce(s.application_number, ''),
      'universityRollNumber', coalesce(s.university_roll_number, ''),
      'fullName', s.full_name,
      'email', coalesce(s.email, ''),
      'phone', coalesce(s.phone, ''),
      'gender', coalesce(s.gender::text, 'prefer_not_to_say'),
      'dateOfBirth', coalesce(s.date_of_birth::text, ''),
      'nationality', coalesce(s.nationality, 'India'),
      'programmeCode', p.code,
      'departmentCode', d.code,
      'schoolCode', sc.code,
      'batchYear', b.year,
      'academicYearLabel', ay.label,
      'currentYear', coalesce(s.current_year, 1),
      'currentTerm', coalesce(s.current_term, ''),
      'studentStatus', s.student_status::text,
      'academicStatus', s.academic_status::text,
      'admissionType', coalesce(s.admission_type, ''),
      'quota', coalesce(s.quota, ''),
      'workflow', s.workflow::text,
      'isArchived', s.is_archived,
      'createdAt', s.created_at::text,
      'updatedAt', s.updated_at::text
    ) ||
    case
      when v_role in ('super_admin', 'iqac_admin', 'registrar') then
        jsonb_build_object(
          'sensitive',
          jsonb_strip_nulls(jsonb_build_object(
            'aadhaar', ss.aadhaar, 'pan', ss.pan, 'bankAccount', ss.bank_account,
            'ifsc', ss.ifsc, 'abcId', ss.abc_id
          ))
        ) ||
        jsonb_build_object(
          'family',
          coalesce(pd.data->'family', '{}'::jsonb) ||
          jsonb_build_object('annualIncome', sf.annual_income)
        )
      else '{}'::jsonb
    end
  from public.students s
  left join public.programmes p on p.id = s.programme_id
  left join public.departments d on d.id = s.department_id
  left join public.schools sc on sc.id = s.school_id
  left join public.batches b on b.id = s.batch_id
  left join public.academic_years ay on ay.id = s.academic_year_id
  left join public.student_portal_data pd on pd.student_id = s.id
  left join public.student_sensitive ss on ss.student_id = s.id
  left join public.student_family sf on sf.student_id = s.id
  where
    v_role in ('super_admin', 'iqac_admin', 'registrar', 'iqac_viewer', 'auditor', 'verifier', 'data_entry')
    or (
      v_role = 'dean'
      and s.school_id = (select profile.school_id from public.profiles profile where profile.id = auth.uid())
    )
    or (
      v_role in ('hod', 'faculty')
      and s.department_id = (select profile.department_id from public.profiles profile where profile.id = auth.uid())
    )
  order by s.full_name;
end;
$$;

revoke all on function public.commit_student_import(text, jsonb, jsonb) from public;
revoke all on function public.list_portal_students() from public;
grant execute on function public.commit_student_import(text, jsonb, jsonb) to authenticated;
grant execute on function public.list_portal_students() to authenticated;
