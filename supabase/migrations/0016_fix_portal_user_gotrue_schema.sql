-- Migration 0016: Fix GoTrue Auth Schema Compatibility for Portal Users
-- Resolves "Database error querying schema" (Go driver converting NULL to string failure)
-- by initializing required token string columns to '' instead of NULL,
-- and guaranteeing linked auth.identities records for email login.

-- 1. Repair existing users in auth.users and auth.identities
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
  -- Fix all token string columns so GoTrue scanner doesn't crash on NULL
  foreach v_col in array v_cols loop
    if exists (
      select 1 
      from information_schema.columns 
      where table_schema = 'auth' and table_name = 'users' and column_name = v_col
    ) then
      execute format('update auth.users set %I = '''' where %I is null', v_col, v_col);
    end if;
  end loop;

  -- Ensure email_confirmed_at is set for all portal accounts
  update auth.users 
  set email_confirmed_at = coalesce(email_confirmed_at, now()) 
  where email_confirmed_at is null;

  -- Ensure confirmed_at is set if column exists
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'auth' and table_name = 'users' and column_name = 'confirmed_at'
  ) then
    execute 'update auth.users set confirmed_at = coalesce(confirmed_at, email_confirmed_at, now()) where confirmed_at is null';
  end if;

  -- Ensure is_sso_user and is_anonymous are false if columns exist
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'auth' and table_name = 'users' and column_name = 'is_sso_user'
  ) then
    execute 'update auth.users set is_sso_user = false where is_sso_user is null';
  end if;
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'auth' and table_name = 'users' and column_name = 'is_anonymous'
  ) then
    execute 'update auth.users set is_anonymous = false where is_anonymous is null';
  end if;

  -- Link identities in auth.identities for any user missing an identity
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

-- 2. Update admin_create_portal_user to always insert GoTrue-compliant records
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
  -- 1. Authorization check: caller must be super_admin or iqac_admin
  select p.role into v_caller_role
  from public.profiles p
  where p.id = auth.uid() and p.is_active;

  if v_caller_role is null or v_caller_role not in ('super_admin', 'iqac_admin') then
    raise exception 'Only an active super administrator or IQAC administrator can create users.';
  end if;

  if p_role = 'super_admin' and v_caller_role <> 'super_admin' then
    raise exception 'Only a super administrator can assign the super administrator role.';
  end if;

  -- 2. Validate role
  begin
    v_role_enum := p_role::public.user_role;
  exception when others then
    raise exception 'Invalid portal role: %', p_role;
  end;

  -- 3. Validate input
  if p_email is null or btrim(p_email) = '' or p_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then
    raise exception 'Enter a valid email address.';
  end if;
  if p_full_name is null or btrim(p_full_name) = '' then
    raise exception 'Enter a full name.';
  end if;
  if p_password is null or length(p_password) < 6 then
    raise exception 'Password must be at least 6 characters.';
  end if;

  -- Check if user already exists
  if exists (select 1 from auth.users where lower(email) = lower(btrim(p_email))) then
    raise exception 'A user with email % already exists.', p_email;
  end if;

  -- 4. Resolve school/department if applicable
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

  -- 5. Create user in auth.users
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

  -- 5a. Ensure optional GoTrue token columns are empty strings if present
  begin
    update auth.users
    set
      confirmation_token = coalesce(confirmation_token, ''),
      recovery_token = coalesce(recovery_token, ''),
      email_change = coalesce(email_change, ''),
      email_change_token_new = coalesce(email_change_token_new, ''),
      email_change_token_current = coalesce(email_change_token_current, ''),
      phone_change = coalesce(phone_change, ''),
      phone_change_token = coalesce(phone_change_token, ''),
      reauthentication_token = coalesce(reauthentication_token, '')
    where id = v_user_id;
  exception when others then
    null;
  end;

  -- 5b. Set confirmed_at if column exists
  begin
    update auth.users
    set confirmed_at = now()
    where id = v_user_id and confirmed_at is null;
  exception when others then
    null;
  end;

  -- 5c. Create entry in auth.identities
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

  -- 6. Create profile in public.profiles
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

  -- 7. Insert audit log
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
