import json

with open("generated_programmes.json", "r", encoding="utf-8") as f:
    programmes = json.load(f)

# Map our internal dept ids to postgres table codes
dept_code_map = {
    'dep_cse': 'CSE',
    'dep_ece': 'ECE',
    'dep_mech': 'ME',
    'dep_mba': 'MBA',
    'dep_com': 'COM',
    'dep_phy': 'PHY',
    'dep_bt': 'BT',
    'dep_law': 'LAW',
    'dep_eng': 'ENG',
    'dep_psy': 'PSY',
    'dep_ses': 'SES',
    'dep_sol_full': 'SOLAW',
    'dep_shas': 'SHAS',
    'dep_soas': 'SOAS',
    'dep_coe_env': 'COE-ENV',
    'dep_soht': 'SOHT',
    'dep_uid': 'UID',
    'dep_som_full': 'SOM',
    'dep_sola_full': 'SOLA',
    'dep_caes': 'CAES',
    'dep_cie': 'CIE',
    'dep_sme': 'SME',
}

sql_lines = [
    "-- Migration 0011: Add all 171 institutional programmes",
    "insert into public.programmes (id, department_id, code, name, level, duration_years, intake, is_active)",
    "select",
    "  ('40000000-0000-0000-0001-' || lpad(p.seq::text, 12, '0'))::uuid,",
    "  d.id,",
    "  p.code,",
    "  p.name,",
    "  p.level,",
    "  null::numeric,",
    "  null::integer,",
    "  true",
    "from (values"
]

val_rows = []
for idx, p in enumerate(programmes, start=1):
    d_code = dept_code_map.get(p['departmentId'], 'CSE')
    name_escaped = p['name'].replace("'", "''")
    val_rows.append(f"  ({idx}, '{d_code}', '{p['code']}', '{name_escaped}', '{p['level']}')")

sql_lines.append(",\n".join(val_rows))
sql_lines.extend([
    ") as p(seq, department_code, code, name, level)",
    "join public.departments d on d.code = p.department_code",
    "on conflict (code) do update set name = excluded.name;",
    "",
    "-- Create default batches for these programmes for 2023, 2024, 2025",
    "insert into public.batches (id, programme_id, academic_year_id, year, label)",
    "select",
    "  md5('batch:' || p.code || ':' || y.year::text)::uuid,",
    "  p.id,",
    "  ay.id,",
    "  y.year,",
    "  p.code || ' ' || y.year::text",
    "from public.programmes p",
    "cross join (values (2023), (2024), (2025)) as y(year)",
    "join public.academic_years ay on ay.label = (y.year::text || '-' || right((y.year + 1)::text, 2))",
    "on conflict do nothing;"
])

sql_content = "\n".join(sql_lines)
with open("supabase/migrations/0011_expand_all_programmes.sql", "w", encoding="utf-8") as f:
    f.write(sql_content)

print("Saved migration to supabase/migrations/0011_expand_all_programmes.sql")
