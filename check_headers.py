import json

with open('user_headers.json', encoding='utf-8') as f:
    headers = json.load(f)

with open('src/pages/ImportPage.tsx', encoding='utf-8') as f:
    content = f.read()

found = 0
missing = []
for h in headers:
    if f"'{h}'" in content or f'"{h}"' in content:
        found += 1
    else:
        missing.append(h)

print(f"Matched {found}/{len(headers)}")
print(f"Missing count: {len(missing)}")
if missing:
    print("Sample missing:", missing[:15])
