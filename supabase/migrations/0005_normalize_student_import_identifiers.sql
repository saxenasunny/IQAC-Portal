create or replace function public.normalize_student_optional_identifiers()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if lower(btrim(coalesce(new.application_number, ''))) ~ '^(-+|–+|—+|n/?a|null|undefined|none|not applicable)$' then
    new.application_number := null;
  elsif new.application_number is not null then
    new.application_number := btrim(new.application_number);
  end if;

  if lower(btrim(coalesce(new.university_roll_number, ''))) ~ '^(-+|–+|—+|n/?a|null|undefined|none|not applicable)$' then
    new.university_roll_number := null;
  elsif new.university_roll_number is not null then
    new.university_roll_number := btrim(new.university_roll_number);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_normalize_student_optional_identifiers on public.students;
create trigger trg_normalize_student_optional_identifiers
before insert or update of application_number, university_roll_number
on public.students
for each row execute function public.normalize_student_optional_identifiers();

update public.students
set application_number = null
where lower(btrim(coalesce(application_number, ''))) ~ '^(-+|–+|—+|n/?a|null|undefined|none|not applicable)$';

update public.students
set university_roll_number = null
where lower(btrim(coalesce(university_roll_number, ''))) ~ '^(-+|–+|—+|n/?a|null|undefined|none|not applicable)$';
