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

Upload → auto/manual map → validate → preview new/updated/unchanged/errors → commit. Critical-error rows never land in `students`.
