-- Add custom student status values required for institutional student imports:
-- 'ng_alumni', 'nep_exit', 'repeat'

alter type public.student_status add value if not exists 'ng_alumni';
alter type public.student_status add value if not exists 'nep_exit';
alter type public.student_status add value if not exists 'repeat';
