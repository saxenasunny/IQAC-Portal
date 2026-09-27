# IQAC Accreditation & Ranking Data Management Portal

Institution-level portal for Apex University's Internal Quality Assurance Cell. Central student, faculty, programme and evidence data is stored once and consumed by NAAC, NIRF, NBA, QS, THE and sustainability modules.

## Features (Phase 1)

- Role-based access (Super Admin, IQAC, Registrar, Dean, HOD, Faculty, Data Entry, Verifier, Auditor)
- Normalized student and faculty databases (sensitive fields isolated and masked)
- Schools, departments, programmes, batches
- Excel/CSV import with column mapping, validation and preview
- Document repository with versioning and many-to-many evidence links
- Generic accreditation framework engine (not hard-coded to NAAC)
- Configurable metric formulas with data lineage
- Dashboards, reports, data quality, audit logs
- Demo mode that runs without a live Supabase project

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

Demo login (any listed account):

- Email: `iqac.admin@apex.edu`
- Password: `Portal@2026`

HOD CSE demo: `hod.cse@apex.edu` / `Portal@2026` (Computer Science records only).

## Environment Variables

Copy `.env.example` to `.env` when connecting a real Supabase project:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Do not commit `.env`. The UI runs on seeded local state if these are empty.

## Supabase Setup

1. Create a project.
2. Run `supabase/migrations/0001_init.sql`.
3. Load `supabase/seed/seed.sql`.
4. Create Auth users matching `profiles.email`.
5. Create a Storage bucket `evidence` (private) and issue signed URLs from the client.

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
