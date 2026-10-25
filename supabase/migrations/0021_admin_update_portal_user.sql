-- Migration 0021: Admin function to update portal user profiles
-- Allows super_admin to edit user's full name, email, password, role, and academic scopes.

create or replace function public.admin_update_portal_user(
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_password text default null,
  p_role text default null,
  p_school_code text default null,
  p_department_code text default null,
  p_phone text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  v_caller_role public.user_role;
  v_encrypted_pw text;
  v_school_id uuid := null;
  v_department_id uuid := null;
  v_role_enum public.user_role;
  v_target_profile public.profiles%rowtype;
begin
  -- 1. Strictly verify caller is an active super administrator
  select p.role into v_caller_role
  from public.profiles p
  where p.id = auth.uid() and p.is_active;

  if v_caller_role is null or v_caller_role <> 'super_admin' then
    raise exception 'Only an active super administrator can edit user profiles.';
  end if;

  -- 2. Verify target user exists
  select * into v_target_profile
  from public.profiles
  where id = p_user_id;

  if v_target_profile.id is null then
    raise exception 'Target user profile not found.';
  end if;

  -- 3. Validate email
  if p_email is null or btrim(p_email) = '' or p_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then
    raise exception 'Enter a valid email address.';
  end if;

  -- Check email conflict with other users
  if exists (
    select 1 from auth.users
    where lower(email) = lower(btrim(p_email)) and id <> p_user_id
  ) then
    raise exception 'A user with email % already exists.', p_email;
  end if;

  -- 4. Validate name
  if p_full_name is null or btrim(p_full_name) = '' then
    raise exception 'Enter a full name.';
  end if;

  -- 5. Role resolution
  if p_role is not null and btrim(p_role) <> '' then
    begin
      v_role_enum := p_role::public.user_role;
    exception when others then
      raise exception 'Invalid portal role: %', p_role;
    end;
  else
    v_role_enum := v_target_profile.role;
  end if;

  -- Prevent demoting oneself from super_admin to avoid lockout
  if p_user_id = auth.uid() and v_role_enum <> 'super_admin' then
    raise exception 'You cannot revoke your own super administrator role.';
  end if;

  -- 6. Scope resolution
  if v_role_enum in ('hod', 'faculty') and p_department_code is not null and btrim(p_department_code) <> '' then
    select d.id, d.school_id into v_department_id, v_school_id
    from public.departments d
    where lower(d.code) = lower(btrim(p_department_code)) or lower(d.name) = lower(btrim(p_department_code))
    limit 1;
  elsif v_role_enum = 'dean' and p_school_code is not null and btrim(p_school_code) <> '' then
    select s.id into v_school_id
    from public.schools s
    where lower(s.code) = lower(btrim(p_school_code)) or lower(s.name) = lower(btrim(p_school_code))
    limit 1;
  else
    v_school_id := null;
    v_department_id := null;
  end if;

  -- 7. Update auth.users (email, metadata, and optional password)
  if p_password is not null and btrim(p_password) <> '' then
    if length(p_password) < 6 then
      raise exception 'New password must be at least 6 characters.';
    end if;

    begin
      v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));
    exception when others then
      v_encrypted_pw := crypt(p_password, gen_salt('bf'));
    end;

    update auth.users
    set
      email = lower(btrim(p_email)),
      encrypted_password = v_encrypted_pw,
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('full_name', btrim(p_full_name)),
      updated_at = now()
    where id = p_user_id;
  else
    update auth.users
    set
      email = lower(btrim(p_email)),
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('full_name', btrim(p_full_name)),
      updated_at = now()
    where id = p_user_id;
  end if;

  -- 8. Update auth.identities email for password sign in
  update auth.identities
  set
    identity_data = coalesce(identity_data, '{}'::jsonb) || jsonb_build_object('email', lower(btrim(p_email))),
    updated_at = now()
  where user_id = p_user_id and provider = 'email';

  -- 9. Update public.profiles
  update public.profiles
  set
    email = lower(btrim(p_email)),
    full_name = btrim(p_full_name),
    role = v_role_enum,
    school_id = v_school_id,
    department_id = v_department_id,
    phone = coalesce(p_phone, phone),
    updated_at = now()
  where id = p_user_id;

  -- 10. Audit log
  insert into public.audit_logs (
    actor_id,
    actor_name,
    action,
    entity,
    entity_id,
    old_value,
    new_value
  ) values (
    auth.uid(),
    coalesce((select full_name from public.profiles where id = auth.uid()), 'Administrator'),
    'Updated user profile',
    'Profile',
    p_user_id,
    jsonb_build_object(
      'email', v_target_profile.email,
      'full_name', v_target_profile.full_name,
      'role', v_target_profile.role,
      'school_id', v_target_profile.school_id,
      'department_id', v_target_profile.department_id
    ),
    jsonb_build_object(
      'email', lower(btrim(p_email)),
      'full_name', btrim(p_full_name),
      'role', v_role_enum,
      'school_id', v_school_id,
      'department_id', v_department_id,
      'password_changed', (p_password is not null and btrim(p_password) <> '')
    )
  );

  return jsonb_build_object('success', true, 'userId', p_user_id);
end;
$$;

revoke all on function public.admin_update_portal_user(uuid, text, text, text, text, text, text, text) from public;
grant execute on function public.admin_update_portal_user(uuid, text, text, text, text, text, text, text) to authenticated;
