-- Script to clean and reset all student records and import logs for a fresh upload
-- All child tables (student_personal, student_academic, student_contact, student_family,
-- student_sensitive, student_portal_data, qualifications, entrance exams, etc.)
-- will automatically cascade delete.

delete from public.students;
delete from public.imports where entity = 'students';
