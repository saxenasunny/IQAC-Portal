import json
import re

with open("user_programmes.json", "r", encoding="utf-8") as f:
    programmes = json.load(f)

def clean_code(name):
    # remove special characters, spaces to dashes
    c = re.sub(r'[\(\)\[\]\.,&\–\-/\:]', ' ', name)
    c = re.sub(r'\s+', '-', c.strip().upper())
    # truncate if overly long
    words = c.split('-')
    if len(words) > 6:
        c = '-'.join(words[:6])
    return c[:32]

def get_level(name):
    upper = name.upper()
    if 'DOCTOR' in upper or 'PH.D' in upper or 'PHD' in upper:
        return 'Doctoral'
    if any(k in upper for k in ['MASTER', 'M.SC', 'M.TECH', 'MBA', 'MCA', 'LL.M', 'M.DES', 'MPT', 'M.PHARM', 'POST GRADUATE', 'M.A']):
        return 'PG'
    if any(k in upper for k in ['DIPLOMA', 'PROGRAM']):
        return 'Diploma'
    return 'UG'

def assign_dept(name):
    upper = name.upper()
    if any(k in upper for k in ['LAW', 'LL.B', 'LL.M', 'LEGAL', 'SOL (']):
        return 'dep_law'
    if any(k in upper for k in ['PHARMACY', 'PHYSIOTHERAPY', 'OPTOMETRY', 'RADIOLOGY', 'NURSING', 'EMBRYOLOGY', 'HEALTH', 'CLINICAL', 'MEDICAL', 'SOMAS']):
        return 'dep_shas'
    if any(k in upper for k in ['AGRICULTURE', 'HORTICULTURE', 'SOAS']):
        return 'dep_soas'
    if any(k in upper for k in ['DESIGN', 'FASHION', 'INTERIOR', 'PRODUCT', 'ANIMATION', 'GAME', 'VISUAL', 'B.DES', 'M.DES', 'SOFD', 'UID']):
        return 'dep_uid'
    if any(k in upper for k in ['HOSPITALITY', 'TOURISM', 'CULINARY', 'PASTRY', 'SOH (', 'SOHT']):
        return 'dep_soht'
    if any(k in upper for k in ['MANAGEMENT', 'BUSINESS', 'BBA', 'MBA', 'COMMERCE', 'B.COM', 'M.COM', 'CVS', 'SOM (']):
        return 'dep_mba'
    if any(k in upper for k in ['PSYCHOLOGY', 'LIBERAL', 'POLITICAL', 'ECONOMICS', 'EDUCATION', 'ENGLISH', 'SOHSS', 'SOC (', 'SOEDU']):
        return 'dep_sola_full'
    if any(k in upper for k in ['MEDIA', 'BAJMC', 'FILM']):
        return 'dep_sme'
    if any(k in upper for k in ['SAFETY', 'FIRE', 'ENVIRONMENT', 'OCCUPATIONAL', 'ESG']):
        return 'dep_coe_env'
    if any(k in upper for k in ['AEROSPACE', 'AVIATION', 'ENERGY', 'NUCLEAR']):
        return 'dep_caes'
    if any(k in upper for k in ['BIOTECHNOLOGY', 'FORENSIC', 'MICROBIOLOGY', 'PHYSICS', 'SOBAS']):
        return 'dep_bt'
    return 'dep_cse'

seen_codes = set()
prog_objects = []

for idx, name in enumerate(programmes, start=1):
    base_code = clean_code(name)
    code = base_code
    seq = 1
    while code in seen_codes:
        code = f"{base_code[:28]}-{seq}"
        seq += 1
    seen_codes.add(code)
    
    prog_id = f"prg_custom_{idx:03d}"
    dept_id = assign_dept(name)
    level = get_level(name)
    
    prog_objects.append({
        "id": prog_id,
        "departmentId": dept_id,
        "code": code,
        "name": name,
        "level": level,
        "isActive": True
    })

print(f"Generated {len(prog_objects)} programme objects.")
with open("generated_programmes.json", "w", encoding="utf-8") as f:
    json.dump(prog_objects, f, indent=2)

# Generate TypeScript code snippet
with open("programmes_seed.ts", "w", encoding="utf-8") as f:
    f.write("export const userProgrammes: Programme[] = [\n")
    for p in prog_objects:
        f.write(f"  {{ id: '{p['id']}', departmentId: '{p['departmentId']}', code: '{p['code']}', name: {json.dumps(p['name'])}, level: '{p['level']}', isActive: true }},\n")
    f.write("]\n")

print("TypeScript seed written to programmes_seed.ts")
