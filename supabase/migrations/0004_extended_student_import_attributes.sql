alter table public.student_sensitive
  add column if not exists additional_identifiers jsonb not null default '{}'::jsonb;

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

  if jsonb_array_length(coalesce(p_sensitive_rows, '[]'::jsonb)) > 0 then
    select p.role into v_role
    from public.profiles p
    where p.id = auth.uid() and p.is_active;

    if v_role is null or v_role not in ('super_admin', 'iqac_admin') then
      raise exception 'Only super administrators and IQAC administrators can import protected identifiers.';
    end if;
  end if;

  v_result := public.commit_student_import(p_file_name, p_mapping, p_rows);

  for v_item in
    select item
    from jsonb_array_elements(coalesce(p_sensitive_rows, '[]'::jsonb)) as items(item)
  loop
    v_registration_id := nullif(btrim(v_item->>'registrationId'), '');
    v_identifiers := v_item->'identifiers';
    if v_registration_id is null or jsonb_typeof(v_identifiers) <> 'object' then
      raise exception 'Each protected import row must include a registration ID and an identifier object.';
    end if;
    if exists (
      select 1
      from jsonb_each(v_identifiers) as attributes(attribute_name, attribute_value)
      where jsonb_typeof(attribute_value) <> 'string'
    ) then
      raise exception 'Protected import attribute values must be text.';
    end if;
    if v_identifiers = '{}'::jsonb then
      continue;
    end if;

    select s.id into v_student_id
    from public.students s
    where lower(s.registration_id) = lower(v_registration_id);
    if v_student_id is null then
      raise exception 'No imported student matches registration ID %.', v_registration_id;
    end if;

    insert into public.student_sensitive as existing (student_id, additional_identifiers)
    values (v_student_id, v_identifiers)
    on conflict (student_id) do update
      set additional_identifiers = coalesce(existing.additional_identifiers, '{}'::jsonb) || excluded.additional_identifiers;
  end loop;

  return v_result;
end;
$$;

revoke all on function public.commit_student_import(text, jsonb, jsonb, jsonb) from public;
grant execute on function public.commit_student_import(text, jsonb, jsonb, jsonb) to authenticated;

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
            'aadhaar', ss.aadhaar,
            'pan', ss.pan,
            'bankAccount', ss.bank_account,
            'ifsc', ss.ifsc,
            'abcId', ss.abc_id,
            'additionalIdentifiers', nullif(ss.additional_identifiers, '{}'::jsonb)
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

revoke all on function public.list_portal_students() from public;
grant execute on function public.list_portal_students() to authenticated;
