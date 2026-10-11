delete from public.students
where id::text like '70000000-0000-0000-0000-%';

delete from public.faculty
where employee_id between 'EMP0201' and 'EMP0220';

alter table public.programmes
  alter column duration_years drop not null;

update public.programmes
set duration_years = null,
    intake = null
where code in (
  'BTECH-CSE', 'BTECH-AI', 'MTECH-CSE', 'PHD-CSE', 'BTECH-ECE', 'MTECH-VLSI',
  'BTECH-ME', 'MTECH-ME', 'MBA', 'BBA', 'BCOM', 'MCOM', 'BSC-PHY', 'MSC-PHY',
  'BSC-BT', 'MSC-BT', 'BA-LLB', 'LLM', 'BA-ENG', 'MA-PSY',
  'SES-BTECH-BIOTECH', 'SES-BTECH-CSE-AIML', 'SES-BTECH-CSE', 'SES-BCA-AIML',
  'SES-BTECH-MECH-EV', 'SES-BSC-BIOTECH-RES', 'SES-BSC-FORENSIC-RES',
  'SES-BSC-MICRO-RES', 'SES-BTECH-AI-DS', 'SES-BCA-CYBER', 'SES-BCA-DATA-ANALYTICS',
  'SES-BCA-DATA-SCIENCE', 'SES-BCA-ML', 'SES-BTECH-AERO', 'SES-BTECH-CIVIL-SI',
  'SES-BTECH-ECE-BME', 'SES-BTECH-ECE-IOT', 'SES-BTECH-ECE-VLSI', 'SES-BTECH-ENERGY',
  'SES-BTECH-FIRE-SAFETY', 'SES-BTECH-MECH-POWER', 'SES-BTECH-CSE-CYBER',
  'SES-BTECH-CSE-DS', 'SES-BTECH-CSE-QUANTUM', 'SES-MCA', 'SES-MSC-BIOTECH',
  'SES-MSC-FORENSIC', 'SES-MSC-MICRO', 'SES-MCA-CYBER', 'SES-MCA-DS-NVIDIA',
  'SES-MCA-GENAI-NVIDIA', 'SES-BTECH-ECE-QUANTUM'
);

update public.schools
set dean_name = ''
where code in ('SOE', 'SOM', 'SOS', 'SOL', 'SOH');

update public.departments
set hod_name = ''
where code in ('CSE', 'ECE', 'ME', 'MBA', 'COM', 'PHY', 'BT', 'LAW', 'ENG', 'PSY');
