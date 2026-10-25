-- Migration 0020: Restrict profile status and profile modifications exclusively to super_admin
-- Removes user status activation / deactivation permissions from IQAC admin and other roles.

drop policy if exists profiles_admin_write on public.profiles;

create policy profiles_admin_write on public.profiles
  for all
  using (public.has_role(array['super_admin']::user_role[]))
  with check (public.has_role(array['super_admin']::user_role[]));
