# System architecture

## Principle

Store institutional facts once. Ranking modules consume mapped, filtered, formula-driven views. Historical submissions are snapshots and are never rewritten when live data changes.

## Access

| Role | Scope |
|---|---|
| Super Admin / IQAC Admin / Registrar | Institution |
| Dean | School |
| HOD / Faculty | Department |
| Verifier / Data Entry / Viewer / Auditor | Institution read (write limited) |

Sensitive columns (Aadhaar, PAN, bank) live in `student_sensitive` and are masked in the UI.

## Metric lineage

Every dashboard number should answer: source table, filters, calculation, last updated, verifier.

## Import

Upload → auto/manual map → validate → preview new/updated/unchanged/errors → commit. Core student fields are mapped to the student model; the programme validator uses the institution catalogue, including the School of Engineering & Sciences offerings. The student importer offers the supplied student-data headers as mapping choices, and unrecognized source columns are retained as named custom attributes. Critical-error rows never land in `students`.

In Supabase mode, the import confirmation calls the role-checked `commit_student_import` function. The function writes the student and its mapped details in one transaction, records the import, and keeps sensitive identifiers in the restricted sensitive-data table. Extended identifiers require super/IQAC administrator privileges. The `list_portal_students` function returns records scoped to the authenticated profile; the app hydrates the shared student store from that result so the student list, dashboard, computed requirements, and reports use the imported records. Synthetic student, faculty, operational, and demo-user records have been removed. Without Supabase configuration, the portal displays setup guidance and does not provide demo authentication.

Portal accounts are provisioned through a Supabase Edge Function that checks the caller's active database role before using the Auth Admin API. Bootstrap the first super administrator directly in Supabase Auth and `public.profiles`; all later accounts are created in the portal with a role, optional school/department scope, and administrator-set initial password.
