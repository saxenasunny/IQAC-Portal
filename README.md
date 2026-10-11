# IQAC Accreditation & Ranking Data Management Portal

Institution-level portal for Apex University's Internal Quality Assurance Cell. Central student, faculty, programme and evidence data is stored once and consumed by NAAC, NIRF, NBA, QS, THE and sustainability modules.

## Features (Phase 1)

- Role-based access (Super Admin, IQAC, Registrar, Dean, HOD, Faculty, Data Entry, Verifier, Auditor)
- Normalized student and faculty databases (sensitive fields isolated and masked)
- Schools, departments, programmes, batches, including the School of Engineering & Sciences department and its offered programme catalogue
- Excel/CSV student import with mapping for core, academic, personal and contact fields, validation, preview, and retained custom attributes
- Document repository with versioning and many-to-many evidence links
- Generic accreditation framework engine (not hard-coded to NAAC)
- Configurable metric formulas with data lineage
- Dashboards, reports, data quality, audit logs
- Supabase-backed authentication, role-scoped access, and institutional data persistence

## Technology Stack

React 18, Vite, TypeScript, Tailwind CSS, React Router, TanStack Query, React Hook Form-ready, Zod-ready, Recharts, Zustand, Supabase client.

## Architecture

```
User → React/Vite (Vercel) → Supabase Auth / PostgreSQL / Storage
```

Institutional data is the source of truth. Frameworks map to it; they do not duplicate people records.

## Database Architecture

See `supabase/migrations/0001_init.sql` for:

- Identity (`profiles`, roles, permissions)
- Institution tree (schools → departments → programmes → batches)
- Normalized student and faculty tables, including `student_sensitive`
- Framework engine (frameworks → versions → categories → requirements → tasks → snapshots)
- Documents and versions
- Imports, audit logs, notifications
- Row Level Security policies (department/school scoping, sensitive-data restriction)

## Local Development

```bash
npm install
npm run dev
```

Open http://localhost:5173

Demo users and demo student/faculty records are not included. Configure Supabase and bootstrap the first administrator before signing in.

## Environment Variables

Copy `.env.example` to `.env` when connecting a real Supabase project:

```
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

These are public browser settings: the Supabase project URL and anon/publishable key are included in the client bundle by design. They are not secrets; access must be protected by Supabase Row Level Security and policies. Vite explicitly injects only these two unprefixed variables into the frontend. Never use the `service_role` or secret key in either variable or in frontend code. Do not commit `.env`. Supabase is required for sign-in, user management, and saving institutional records. Without it, the app shows setup guidance instead of seeded demo data.

## Supabase Setup

1. Create a Supabase project.
2. Run `supabase/migrations/0001_init.sql`, `0002_student_import_sync.sql`, `0003_remove_generated_demo_records.sql`, `0004_extended_student_import_attributes.sql`, `0005_normalize_student_import_identifiers.sql`, then `0006_optimize_student_import_lookup.sql`. These scripts are safe to rerun: existing schema objects are retained, the named policies are refreshed, and the cleanup only removes known generated rows or values that still exactly match the old generated seed.
3. Run `supabase/seed/seed.sql` to add missing reference catalogue rows. Existing rows are left unchanged; it does not create student, faculty, or user records. Unverified programme durations, intakes, dean names, and HOD names are left blank.
4. Create the first administrator in Supabase Auth. Insert a matching active row into `public.profiles` using that Auth user UUID and role `super_admin`. This one-time bootstrap is required because no account exists yet to authorize user creation.
5. Deploy the secure account-provisioning function with the Supabase CLI: `supabase functions deploy create-portal-user`. Only active super/IQAC administrators can create users from **Administration → Users**. Passwords are set by the administrator and are never stored or logged by the portal.
6. Configure the frontend environment variables and create a private Storage bucket named `evidence` if document storage is enabled.

Confirmed student imports are sent to Supabase in batches of 10 rows to stay within request timeouts. Each batch uses the `commit_student_import` database function to save the student record and mapped academic, personal, contact, family, address, qualification, entrance-exam, mentor and custom attributes in one transaction. If a later batch fails, earlier batches remain saved and the error reports that partial progress; retrying is safe because rows are matched by Registration ID. Other supplied Excel columns are retained as named custom attributes in `student_portal_data`. Sensitive identifiers remain in the restricted `student_sensitive` table; extended identifiers are accepted only for super/IQAC administrators. The portal loads records through `list_portal_students`, which enforces role-based visibility.

## Deployment

- Frontend: Vercel (`vercel.json` SPA rewrite is included).
- Database/Auth/Storage: Supabase.
- Set production environment variables on Vercel.

## GitHub Workflow

`main` ← `develop` ← `feature/*`

## Future Roadmap

- Full NAAC/NIRF indicator packs as configuration
- Submission snapshots that freeze historical rankings
- SSO
- AI assistants for evidence classification (not in Phase 1)

## Troubleshooting

- Blank app after login: clear localStorage key `iqac-portal-v1`.
- Import blocked: download/fix error rows; required fields are Registration ID and Name.
- HOD sees fewer students: expected; RLS/app scoping is by department.
