-- Migration 0017: Comprehensive Fix for Portal User Roles, RLS Security Definer, and Fast Student Sync

-- 1. Redefine has_role and is_admin with SECURITY DEFINER
-- This prevents infinite recursion (42P17) or permission denial when non-admin users query profiles, faculty, or students.
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

-- 2. Fast single-roundtrip portal student fetch
create or replace function public.list_portal_students_bundle()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role public.user_role;
  v_result jsonb;
begin
  select p.role into v_role
  from public.profiles p
  where p.id = auth.uid() and p.is_active;

  if v_role is null then
    raise exception 'An active Supabase profile is required to view student data.';
  end if;

  select coalesce(jsonb_agg(sub.item), '[]'::jsonb)
  into v_result
  from (
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
        when v_role in ('super_admin', 'iqac_admin', 'registrar', 'data_entry', 'verifier') then
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
      end as item
    from public.students s
    left join public.programmes p on p.id = s.programme_id
    left join public.departments d on d.id = s.department_id
    left join public.schools sc on sc.id = d.school_id
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
    order by s.registration_id
  ) sub;

  return v_result;
end;
$$;

revoke all on function public.list_portal_students_bundle() from public;
grant execute on function public.list_portal_students_bundle() to authenticated;

-- 3. Repair existing users in auth.users and auth.identities
do $$
declare
  v_col text;
  v_cols text[] := array[
    'confirmation_token',
    'recovery_token',
    'email_change_token_new',
    'email_change',
    'email_change_token_current',
    'phone_change',
    'phone_change_token',
    'reauthentication_token'
  ];
begin
  foreach v_col in array v_cols loop
    if exists (
      select 1 
      from information_schema.columns 
      where table_schema = 'auth' 
        and table_name = 'users' 
        and column_name = v_col
        and is_generated = 'NEVER'
        and is_updatable = 'YES'
    ) then
      execute format('update auth.users set %I = '''' where %I is null', v_col, v_col);
    end if;
  end loop;

  update auth.users 
  set email_confirmed_at = coalesce(email_confirmed_at, now()) 
  where email_confirmed_at is null;

  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'auth' and table_name = 'users' and column_name = 'is_sso_user'
      and is_generated = 'NEVER' and is_updatable = 'YES'
  ) then
    execute 'update auth.users set is_sso_user = false where is_sso_user is null';
  end if;
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'auth' and table_name = 'users' and column_name = 'is_anonymous'
      and is_generated = 'NEVER' and is_updatable = 'YES'
  ) then
    execute 'update auth.users set is_anonymous = false where is_anonymous is null';
  end if;

  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'auth' and table_name = 'identities' and column_name = 'provider_id'
  ) then
    insert into auth.identities (
      id,
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    select
      gen_random_uuid(),
      u.id::text,
      u.id,
      jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
      'email',
      now(),
      now(),
      now()
    from auth.users u
    where not exists (
      select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email'
    );
  else
    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    select
      u.id::text,
      u.id,
      jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
      'email',
      now(),
      now(),
      now()
    from auth.users u
    where not exists (
      select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email'
    );
  end if;
end;
$$;

-- 4. Update admin_create_portal_user procedure
create or replace function public.admin_create_portal_user(
  p_email text,
  p_full_name text,
  p_password text,
  p_role text,
  p_school_code text default null,
  p_department_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  v_caller_role public.user_role;
  v_user_id uuid;
  v_encrypted_pw text;
  v_school_id uuid := null;
  v_department_id uuid := null;
  v_role_enum public.user_role;
begin
  select p.role into v_caller_role
  from public.profiles p
  where p.id = auth.uid() and p.is_active;

  if v_caller_role is null or v_caller_role not in ('super_admin', 'iqac_admin') then
    raise exception 'Only an active super administrator or IQAC administrator can create users.';
  end if;

  if p_role = 'super_admin' and v_caller_role <> 'super_admin' then
    raise exception 'Only a super administrator can assign the super administrator role.';
  end if;

  begin
    v_role_enum := p_role::public.user_role;
  exception when others then
    raise exception 'Invalid portal role: %', p_role;
  end;

  if p_email is null or btrim(p_email) = '' or p_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then
    raise exception 'Enter a valid email address.';
  end if;
  if p_full_name is null or btrim(p_full_name) = '' then
    raise exception 'Enter a full name.';
  end if;
  if p_password is null or length(p_password) < 6 then
    raise exception 'Password must be at least 6 characters.';
  end if;

  if exists (select 1 from auth.users where lower(email) = lower(btrim(p_email))) then
    raise exception 'A user with email % already exists.', p_email;
  end if;

  if p_department_code is not null and btrim(p_department_code) <> '' then
    select d.id, d.school_id into v_department_id, v_school_id
    from public.departments d
    where lower(d.code) = lower(btrim(p_department_code)) or lower(d.name) = lower(btrim(p_department_code))
    limit 1;
  elsif p_school_code is not null and btrim(p_school_code) <> '' then
    select s.id into v_school_id
    from public.schools s
    where lower(s.code) = lower(btrim(p_school_code)) or lower(s.name) = lower(btrim(p_school_code))
    limit 1;
  end if;

  v_user_id := gen_random_uuid();
  begin
    v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));
  exception when others then
    v_encrypted_pw := crypt(p_password, gen_salt('bf'));
  end;

  insert into auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at
  ) values (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    lower(btrim(p_email)),
    v_encrypted_pw,
    now(),
    '',
    '',
    '',
    '',
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('full_name', btrim(p_full_name)),
    'authenticated',
    'authenticated',
    now(),
    now()
  );

  begin
    insert into auth.identities (
      id,
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      gen_random_uuid(),
      v_user_id::text,
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', lower(btrim(p_email)), 'email_verified', true),
      'email',
      now(),
      now(),
      now()
    )
    on conflict do nothing;
  exception when others then
    begin
      insert into auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
      ) values (
        v_user_id::text,
        v_user_id,
        jsonb_build_object('sub', v_user_id::text, 'email', lower(btrim(p_email)), 'email_verified', true),
        'email',
        now(),
        now(),
        now()
      )
      on conflict do nothing;
    exception when others then
      null;
    end;
  end;

  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    school_id,
    department_id,
    is_active,
    created_at,
    updated_at
  ) values (
    v_user_id,
    lower(btrim(p_email)),
    btrim(p_full_name),
    v_role_enum,
    v_school_id,
    v_department_id,
    true,
    now(),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role,
    school_id = excluded.school_id,
    department_id = excluded.department_id,
    is_active = true,
    updated_at = now();

  insert into public.audit_logs (
    actor_id,
    actor_name,
    action,
    entity,
    entity_id,
    new_value
  ) values (
    auth.uid(),
    coalesce((select full_name from public.profiles where id = auth.uid()), 'Administrator'),
    'Created portal user',
    'Profile',
    v_user_id,
    jsonb_build_object('email', p_email, 'role', p_role, 'school_id', v_school_id, 'department_id', v_department_id)
  );

  return jsonb_build_object('success', true, 'userId', v_user_id);
end;
$$;

revoke all on function public.admin_create_portal_user(text, text, text, text, text, text) from public;
grant execute on function public.admin_create_portal_user(text, text, text, text, text, text) to authenticated;
