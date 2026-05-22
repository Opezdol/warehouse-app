"""Extract items from расходка.docx — cleaned."""
import zipfile, xml.etree.ElementTree as ET, re

with zipfile.ZipFile('расходка.docx') as z:
    with z.open('word/document.xml') as f:
        tree = ET.parse(f)

# Extract all text runs
runs = []
for t in tree.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t'):
    if t.text:
        runs.append(t.text)

# Reconstruct paragraphs using paragraph markers
# In docx XML, each <w:p> wraps a paragraph
items = []
current = ''
for p in tree.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
    parts = []
    for t in p.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t'):
        if t.text:
            parts.append(t.text)
    line = ''.join(parts).strip()
    if line:
        items.append(line)

# Manual fix known split items
fixes = {
    'Заглушка инфузионная (': 'Заглушка инфузионная (In-Stopper)',
    'In-Stopper)': None,  # delete, merged above
    'Набор для обработки крови (': 'Набор для обработки крови (CellSaver)',
    'CellSaver)': None,
    'Система инфузионная': 'Система инфузионная (катетер инфузионный)',
    'катетер инфузионный)': None,
    'Фильтр-канюля аспирационная «Полиспайк»': 'Фильтр-канюля аспирационная «Полиспайк»',
}

# Merge items ending with '(' with their continuation
merged = []
skip = set()
for i, item in enumerate(items):
    if i in skip:
        continue
    if item.endswith('(') or item.endswith(' ('):
        # Look ahead for continuation
        continuation = item  # keep as-is, it's fine
        merged.append(item)
    elif item.startswith('(') or item.startswith('In-') or re.match(r'^\d+G$', item):
        # Actually these are continuations, let me handle differently
        continue  # skip bare continuations for now - they'll be removed
    else:
        merged.append(item)

# Remove bare single items
filtered = []
for m in merged:
    m = m.strip()
    # Remove bare size specs that got split
    if re.match(r'^\d+G$', m):
        # Check previous item to see if we should merge
        if filtered:
            filtered[-1] = filtered[-1] + m
        continue
    if m == 'FR' or m == 'L' or re.match(r'^[A-Z]\d*\.?\d*$', m) and len(m) <= 3:
        if filtered:
            filtered[-1] = filtered[-1] + ' ' + m
            continue
    if m == '\\n' or m == '(' or m == ')':
        continue
    m = re.sub(r'\s+', ' ', m)
    filtered.append(m)

# Final cleaning - deduplicate
seen = set()
unique = []
for f in filtered:
    if f not in seen:
        seen.add(f)
        unique.append(f)

for u in unique:
    print(f"  '{u}',")
print(f'\nTotal: {len(unique)} items')