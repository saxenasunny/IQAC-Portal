-- IQAC Accreditation & Ranking Data Management Portal
-- Phase 1 schema: institutional data, people, evidence, framework engine, ops.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------------
create type user_role as enum (
  'super_admin',
  'iqac_admin',
  'iqac_viewer',
  'registrar',
  'dean',
  'hod',
  'faculty',
  'data_entry',
  'verifier',
  'auditor'
);

create type workflow_status as enum (
  'draft',
  'submitted',
  'under_review',
  'verified',
  'approved',
  'rejected',
  'needs_revision',
  'change_requested',
  'revised',
  're_verified'
);

create type student_status as enum ('active', 'inactive', 'graduated', 'alumni', 'withdrawn', 'suspended');
create type academic_status as enum ('regular', 'lateral', 're_admitted', 'detained');
create type gender_type as enum ('male', 'female', 'other', 'prefer_not_to_say');
create type employment_type as enum ('permanent', 'contract', 'visiting', 'adjunct');
create type document_status as enum ('draft', 'submitted', 'verified', 'approved', 'expired', 'superseded');
create type import_status as enum ('uploaded', 'mapped', 'validated', 'previewed', 'committed', 'failed', 'cancelled');
create type requirement_status as enum (
  'not_started',
  'data_collection',
  'submitted',
  'under_review',
  'verified',
  'approved',
  'rejected',
  'needs_revision'
);

-- ---------------------------------------------------------------------------
-- Identity & access
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null,
  phone text,
  role user_role not null default 'iqac_viewer',
  school_id uuid,
  department_id uuid,
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  module text not null
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  primary key (user_id, role_id)
);

create table public.user_departments (
  user_id uuid not null references public.profiles(id) on delete cascade,
  department_id uuid not null,
  primary key (user_id, department_id)
);

-- ---------------------------------------------------------------------------
-- Institution structure
-- ---------------------------------------------------------------------------
create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text not null,
  type text,
  established_year integer,
  naac_grade text,
  nirf_rank integer,
  address text,
  city text,
  state text,
  pincode text,
  website text,
  logo_url text,
  created_at timestamptz not null default now()
);

create table public.campuses (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id),
  name text not null,
  city text,
  is_main boolean not null default false
);

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id),
  campus_id uuid references public.campuses(id),
  code text unique not null,
  name text not null,
  dean_name text,
  created_at timestamptz not null default now()
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id),
  code text unique not null,
  name text not null,
  hod_name text,
  established_year integer,
  created_at timestamptz not null default now()
);

create table public.academic_years (
  id uuid primary key default gen_random_uuid(),
  label text unique not null,
  start_date date not null,
  end_date date not null,
  is_current boolean not null default false
);

create table public.programmes (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id),
  code text unique not null,
  name text not null,
  level text not null,
  duration_years numeric(3,1) not null,
  intake integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.programme_versions (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.programmes(id),
  version_label text not null,
  effective_from date,
  unique (programme_id, version_label)
);

create table public.batches (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.programmes(id),
  academic_year_id uuid references public.academic_years(id),
  year integer not null,
  label text not null,
  unique (programme_id, year)
);

create table public.sections (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches(id),
  name text not null,
  unique (batch_id, name)
);

alter table public.profiles
  add constraint profiles_school_fk foreign key (school_id) references public.schools(id),
  add constraint profiles_department_fk foreign key (department_id) references public.departments(id);

alter table public.user_departments
  add constraint user_departments_dept_fk foreign key (department_id) references public.departments(id);

-- ---------------------------------------------------------------------------
-- Students (normalized, sensitive data isolated)
-- ---------------------------------------------------------------------------
create table public.students (
  id uuid primary key default gen_random_uuid(),
  registration_id text unique not null,
  application_number text unique,
  university_roll_number text unique,
  full_name text not null,
  email text,
  phone text,
  gender gender_type,
  date_of_birth date,
  nationality text default 'India',
  programme_id uuid references public.programmes(id),
  department_id uuid references public.departments(id),
  school_id uuid references public.schools(id),
  batch_id uuid references public.batches(id),
  section_id uuid references public.sections(id),
  academic_year_id uuid references public.academic_years(id),
  current_year integer,
  current_term text,
  student_status student_status not null default 'active',
  academic_status academic_status not null default 'regular',
  admission_type text,
  workflow workflow_status not null default 'approved',
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.student_personal (
  student_id uuid primary key references public.students(id) on delete cascade,
  first_name text,
  middle_name text,
  last_name text,
  religion text,
  blood_group text,
  mother_tongue text,
  marital_status text,
  first_generation boolean default false,
  differently_abled boolean default false,
  disability_type text,
  ews boolean default false,
  domicile_state text,
  category text,
  sub_caste text
);

create table public.student_academic (
  student_id uuid primary key references public.students(id) on delete cascade,
  cgpa numeric(4,2),
  percentage numeric(5,2),
  backlogs integer default 0,
  credits_earned numeric(6,2),
  medium_of_instruction text,
  admission_date date,
  expected_graduation date,
  graduation_date date
);

create table public.student_contact (
  student_id uuid primary key references public.students(id) on delete cascade,
  personal_email text,
  alternate_phone text,
  emergency_contact_name text,
  emergency_contact_phone text
);

create table public.student_addresses (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  address_type text not null,
  line1 text,
  line2 text,
  city text,
  state text,
  pincode text,
  country text default 'India'
);

create table public.student_family (
  student_id uuid primary key references public.students(id) on delete cascade,
  father_name text,
  father_occupation text,
  father_phone text,
  mother_name text,
  mother_occupation text,
  mother_phone text,
  annual_income numeric(12,2)
);

create table public.student_guardians (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  name text not null,
  relation text,
  phone text,
  email text
);

create table public.student_qualifications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  level text not null,
  board_university text,
  institution_name text,
  year_of_passing integer,
  percentage numeric(5,2),
  subjects text
);

create table public.student_entrance_exams (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  exam_name text not null,
  roll_number text,
  score numeric(8,2),
  rank integer,
  year integer
);

create table public.student_experience (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  organisation text,
  industry text,
  designation text,
  start_date date,
  end_date date,
  salary numeric(12,2)
);

create table public.student_mentor_mapping (
  student_id uuid primary key references public.students(id) on delete cascade,
  mentor_name text,
  mentor_email text,
  mentor_phone text
);

create table public.student_sensitive (
  student_id uuid primary key references public.students(id) on delete cascade,
  aadhaar text,
  pan text,
  bank_account text,
  ifsc text,
  bank_name text,
  bank_branch text,
  abc_id text
);

create table public.student_status_history (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  old_status text,
  new_status text,
  reason text,
  changed_by uuid references public.profiles(id),
  changed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Faculty
-- ---------------------------------------------------------------------------
create table public.faculty (
  id uuid primary key default gen_random_uuid(),
  employee_id text unique not null,
  full_name text not null,
  email text unique,
  phone text,
  gender gender_type,
  date_of_birth date,
  school_id uuid references public.schools(id),
  department_id uuid references public.departments(id),
  designation text not null,
  employment_type employment_type not null default 'permanent',
  joining_date date,
  highest_qualification text,
  specialization text,
  orcid text,
  google_scholar text,
  scopus_id text,
  wos_id text,
  researchgate text,
  teaching_experience_years numeric(4,1) default 0,
  research_experience_years numeric(4,1) default 0,
  is_active boolean not null default true,
  workflow workflow_status not null default 'approved',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.faculty_qualifications (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references public.faculty(id) on delete cascade,
  degree text not null,
  specialization text,
  university text,
  year integer
);

create table public.faculty_experience (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references public.faculty(id) on delete cascade,
  organisation text,
  designation text,
  start_date date,
  end_date date
);

create table public.faculty_publications (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references public.faculty(id) on delete cascade,
  title text not null,
  journal text,
  year integer,
  indexed_in text
);

create table public.faculty_projects (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references public.faculty(id) on delete cascade,
  title text not null,
  funding_agency text,
  amount numeric(14,2),
  year integer,
  status text
);

create table public.faculty_patents (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references public.faculty(id) on delete cascade,
  title text not null,
  patent_number text,
  year integer,
  status text
);

create table public.faculty_awards (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references public.faculty(id) on delete cascade,
  title text not null,
  awarded_by text,
  year integer
);

create table public.faculty_department_history (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references public.faculty(id) on delete cascade,
  department_id uuid references public.departments(id),
  from_date date,
  to_date date
);

create table public.faculty_designation_history (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references public.faculty(id) on delete cascade,
  designation text not null,
  from_date date,
  to_date date
);

-- ---------------------------------------------------------------------------
-- Documents & evidence
-- ---------------------------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  document_type text not null,
  department_id uuid references public.departments(id),
  owner_id uuid references public.profiles(id),
  academic_year_id uuid references public.academic_years(id),
  document_date date,
  expiry_date date,
  status document_status not null default 'submitted',
  description text,
  tags text[] default '{}',
  current_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  version integer not null,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  file_size integer,
  uploaded_by uuid references public.profiles(id),
  uploaded_at timestamptz not null default now(),
  change_reason text,
  unique (document_id, version)
);

create table public.student_documents (
  student_id uuid not null references public.students(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  primary key (student_id, document_id)
);

create table public.faculty_documents (
  faculty_id uuid not null references public.faculty(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  primary key (faculty_id, document_id)
);

-- ---------------------------------------------------------------------------
-- Framework engine
-- ---------------------------------------------------------------------------
create table public.frameworks (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text,
  is_active boolean not null default true
);

create table public.framework_versions (
  id uuid primary key default gen_random_uuid(),
  framework_id uuid not null references public.frameworks(id),
  version_label text not null,
  academic_year_id uuid references public.academic_years(id),
  is_current boolean not null default false,
  unique (framework_id, version_label)
);

create table public.framework_categories (
  id uuid primary key default gen_random_uuid(),
  framework_version_id uuid not null references public.framework_versions(id),
  code text not null,
  name text not null,
  weight numeric(5,2),
  sort_order integer default 0
);

create table public.framework_indicators (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.framework_categories(id),
  code text not null,
  name text not null,
  description text
);

create table public.framework_requirements (
  id uuid primary key default gen_random_uuid(),
  indicator_id uuid references public.framework_indicators(id),
  framework_version_id uuid not null references public.framework_versions(id),
  title text not null,
  requirement_type text not null default 'data',
  source_table text,
  filters jsonb default '{}'::jsonb,
  formula text,
  responsible_department_id uuid references public.departments(id),
  data_owner_id uuid references public.profiles(id),
  due_date date,
  status requirement_status not null default 'not_started',
  last_updated_at timestamptz,
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  comments text,
  computed_value text
);

create table public.framework_tasks (
  id uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references public.framework_requirements(id) on delete cascade,
  title text not null,
  assigned_to uuid references public.profiles(id),
  department_id uuid references public.departments(id),
  due_date date,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table public.framework_submissions (
  id uuid primary key default gen_random_uuid(),
  framework_version_id uuid not null references public.framework_versions(id),
  submitted_at timestamptz,
  submitted_by uuid references public.profiles(id),
  status text not null default 'draft',
  snapshot jsonb,
  snapshot_at timestamptz
);

create table public.document_requirement_links (
  document_id uuid not null references public.documents(id) on delete cascade,
  requirement_id uuid not null references public.framework_requirements(id) on delete cascade,
  primary key (document_id, requirement_id)
);

-- ---------------------------------------------------------------------------
-- Imports, audit, notifications
-- ---------------------------------------------------------------------------
create table public.imports (
  id uuid primary key default gen_random_uuid(),
  entity text not null,
  file_name text not null,
  status import_status not null default 'uploaded',
  total_rows integer default 0,
  valid_rows integer default 0,
  warning_rows integer default 0,
  error_rows integer default 0,
  new_count integer default 0,
  updated_count integer default 0,
  unchanged_count integer default 0,
  mapping jsonb default '{}'::jsonb,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  committed_at timestamptz
);

create table public.import_errors (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.imports(id) on delete cascade,
  row_number integer,
  severity text not null,
  field text,
  message text not null
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  actor_name text,
  action text not null,
  entity text not null,
  entity_id text,
  old_value jsonb,
  new_value jsonb,
  reason text,
  ip_address text,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  title text not null,
  body text,
  is_read boolean not null default false,
  link text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index idx_students_name on public.students (full_name);
create index idx_students_programme on public.students (programme_id);
create index idx_students_department on public.students (department_id);
create index idx_students_status on public.students (student_status);
create index idx_students_batch on public.students (batch_id);
create index idx_faculty_department on public.faculty (department_id);
create index idx_faculty_name on public.faculty (full_name);
create index idx_documents_type on public.documents (document_type);
create index idx_audit_entity on public.audit_logs (entity, entity_id);
create index idx_requirements_status on public.framework_requirements (status);

-- ---------------------------------------------------------------------------
-- Updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_students_updated before update on public.students
  for each row execute function public.set_updated_at();
create trigger trg_faculty_updated before update on public.faculty
  for each row execute function public.set_updated_at();
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_documents_updated before update on public.documents
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helper: current profile
-- ---------------------------------------------------------------------------
create or replace function public.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from public.profiles where id = auth.uid();
$$;

create or replace function public.has_role(roles user_role[])
returns boolean
language sql
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
stable
as $$
  select public.has_role(array['super_admin','iqac_admin','registrar']::user_role[]);
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.student_personal enable row level security;
alter table public.student_academic enable row level security;
alter table public.student_contact enable row level security;
alter table public.student_addresses enable row level security;
alter table public.student_family enable row level security;
alter table public.student_guardians enable row level security;
alter table public.student_qualifications enable row level security;
alter table public.student_entrance_exams enable row level security;
alter table public.student_experience enable row level security;
alter table public.student_mentor_mapping enable row level security;
alter table public.student_sensitive enable row level security;
alter table public.faculty enable row level security;
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.frameworks enable row level security;
alter table public.framework_requirements enable row level security;
alter table public.audit_logs enable row level security;
alter table public.imports enable row level security;
alter table public.notifications enable row level security;
alter table public.schools enable row level security;
alter table public.departments enable row level security;
alter table public.programmes enable row level security;

-- Profiles: users see themselves; admins see all
create policy profiles_self on public.profiles
  for select using (id = auth.uid() or public.is_admin());

create policy profiles_admin_write on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- Institution reference data: authenticated read
create policy schools_read on public.schools for select using (auth.uid() is not null);
create policy departments_read on public.departments for select using (auth.uid() is not null);
create policy programmes_read on public.programmes for select using (auth.uid() is not null);
create policy schools_write on public.schools for all using (public.is_admin()) with check (public.is_admin());
create policy departments_write on public.departments for all using (public.is_admin()) with check (public.is_admin());
create policy programmes_write on public.programmes for all using (public.is_admin()) with check (public.is_admin());

-- Students: admin/IQAC/registrar full; dean by school; HOD/faculty by department
create policy students_select on public.students
  for select using (
    public.is_admin()
    or public.has_role(array['iqac_viewer','auditor','verifier','data_entry']::user_role[])
    or (
      public.has_role(array['dean']::user_role[])
      and school_id = (select school_id from public.profiles where id = auth.uid())
    )
    or (
      public.has_role(array['hod','faculty']::user_role[])
      and department_id = (select department_id from public.profiles where id = auth.uid())
    )
  );

create policy students_write on public.students
  for all using (
    public.is_admin()
    or public.has_role(array['data_entry','verifier']::user_role[])
  ) with check (
    public.is_admin()
    or public.has_role(array['data_entry','verifier']::user_role[])
  );

-- Sensitive student fields: super admin, IQAC admin, registrar only
create policy student_sensitive_select on public.student_sensitive
  for select using (public.has_role(array['super_admin','iqac_admin','registrar']::user_role[]));

create policy student_sensitive_write on public.student_sensitive
  for all using (public.has_role(array['super_admin','iqac_admin']::user_role[]))
  with check (public.has_role(array['super_admin','iqac_admin']::user_role[]));

-- Related student tables inherit via student visibility
create policy student_personal_select on public.student_personal
  for select using (exists (select 1 from public.students s where s.id = student_id));

create policy faculty_select on public.faculty
  for select using (
    public.is_admin()
    or public.has_role(array['iqac_viewer','auditor','verifier','data_entry']::user_role[])
    or (
      public.has_role(array['dean']::user_role[])
      and school_id = (select school_id from public.profiles where id = auth.uid())
    )
    or (
      public.has_role(array['hod','faculty']::user_role[])
      and department_id = (select department_id from public.profiles where id = auth.uid())
    )
  );

create policy faculty_write on public.faculty
  for all using (public.is_admin() or public.has_role(array['data_entry','verifier']::user_role[]))
  with check (public.is_admin() or public.has_role(array['data_entry','verifier']::user_role[]));

create policy documents_select on public.documents
  for select using (auth.uid() is not null);

create policy documents_write on public.documents
  for all using (public.is_admin() or public.has_role(array['data_entry','hod','dean']::user_role[]))
  with check (public.is_admin() or public.has_role(array['data_entry','hod','dean']::user_role[]));

create policy document_versions_select on public.document_versions
  for select using (auth.uid() is not null);

create policy frameworks_read on public.frameworks for select using (auth.uid() is not null);
create policy frameworks_write on public.frameworks for all using (public.is_admin()) with check (public.is_admin());

create policy requirements_read on public.framework_requirements for select using (auth.uid() is not null);
create policy requirements_write on public.framework_requirements
  for all using (public.is_admin() or public.has_role(array['hod','dean','verifier']::user_role[]))
  with check (public.is_admin() or public.has_role(array['hod','dean','verifier']::user_role[]));

create policy audit_admin on public.audit_logs
  for select using (public.has_role(array['super_admin','iqac_admin','auditor','registrar']::user_role[]));

create policy audit_insert on public.audit_logs
  for insert with check (auth.uid() is not null);

create policy imports_admin on public.imports
  for all using (public.is_admin() or public.has_role(array['data_entry']::user_role[]))
  with check (public.is_admin() or public.has_role(array['data_entry']::user_role[]));

create policy notifications_own on public.notifications
  for select using (user_id = auth.uid() or public.is_admin());
