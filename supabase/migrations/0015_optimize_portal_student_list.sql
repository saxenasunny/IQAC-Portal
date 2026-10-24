-- Migration 0015: Fast single-roundtrip portal student fetch
-- Aggregates student records into a single jsonb array so Supabase PostgREST
-- streams all portal records in a single fast gzip payload (~1s) instead of
-- 9 sequential 1,000-row paginated roundtrips (~25s).

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
