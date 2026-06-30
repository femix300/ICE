import os
#!/usr/bin/env python3
"""Verify TypeScript migration didn't break anything."""
import json, re, sys, urllib.request

API_KEY = os.environ.get("LINEAR_API_KEY")
ENDPOINT = "https://api.linear.app/graphql"

query = '{ issues(filter: { team: { key: { eq: "ICE" } } }, first: 50) { nodes { identifier title description } } }'
req = urllib.request.Request(ENDPOINT, data=json.dumps({"query": query}).encode(),
    headers={"Content-Type": "application/json", "Authorization": API_KEY})
resp = urllib.request.urlopen(req, timeout=30)
data = json.loads(resp.read())

issues = sorted(
    [i for i in data['data']['issues']['nodes'] if int(i['identifier'].replace('ICE-','')) >= 29],
    key=lambda x: int(x['identifier'].replace('ICE-',''))
)

BT = chr(96)  # backtick
BS = chr(92)  # backslash

print(f"Checking {len(issues)} issues...\n")
problems = []

for i in issues:
    desc = i['description'] or ''
    ident = i['identifier']

    # CHECK 1: Residual .js file extensions in inline code
    # Pattern: something.js` (before closing backtick of inline code)
    js_files = re.findall(r'[\w/\-\.]+\.js' + BT, desc)
    bad_js = [f for f in js_files if not f.endswith('.json' + BT)]
    if bad_js:
        problems.append((ident, 'RESIDUAL_JS', f'Still has .js file refs: {bad_js[:3]}'))

    # CHECK 1b: Residual .jsx
    jsx_files = re.findall(r'[\w/\-\.]+\.jsx' + BT, desc)
    if jsx_files:
        problems.append((ident, 'RESIDUAL_JSX', f'Still has .jsx file refs: {jsx_files[:3]}'))

    # CHECK 2: Residual ```js code blocks
    js_blocks = re.findall(BT*3 + r'js\b', desc)
    if js_blocks:
        problems.append((ident, 'JS_CODE_BLOCK', f'{len(js_blocks)} code block(s) still marked as js'))

    # CHECK 3: Product names corrupted (Node.js → Node.ts, Next.js → Next.ts)
    if 'Node.ts' in desc:
        problems.append((ident, 'CORRUPTED_NAME', '"Node.ts" should be "Node.js"'))
    if 'Next.ts' in desc:
        problems.append((ident, 'CORRUPTED_NAME', '"Next.ts" should be "Next.js"'))

    # CHECK 4: .json corrupted to .tson
    if '.tson' in desc:
        problems.append((ident, 'CORRUPTED_JSON', '".tson" found — should be ".json"'))

    # CHECK 5: Old backslash escaping bugs
    if BS + BT in desc:
        problems.append((ident, 'OLD_FMT_BUG', 'Backslash+backtick escaping artifact'))
    if BS + '${' in desc:
        problems.append((ident, 'OLD_FMT_BUG', 'Backslash+dollar+brace escaping artifact'))

    # CHECK 6: Description not empty or suspiciously short
    if len(desc) < 200:
        problems.append((ident, 'TRUNCATED', f'Description only {len(desc)} chars — possibly truncated'))

    # CHECK 7: .ts files actually present (migration worked)
    ts_files = re.findall(r'[\w/\-]+\.ts' + BT, desc)
    tsx_files = re.findall(r'[\w/\-]+\.tsx' + BT, desc)
    has_files_section = '## Files' in desc or '## Implementation' in desc
    if has_files_section and len(ts_files) == 0 and len(tsx_files) == 0:
        problems.append((ident, 'NO_TS_FILES', 'Has Files/Implementation section but no .ts/.tsx references'))

# ═══ REPORT ═══
checks = [
    ('Residual .js/.jsx file extensions', 'RESIDUAL_JS', 'RESIDUAL_JSX'),
    ('Residual js code blocks', 'JS_CODE_BLOCK',),
    ('Product name corruption (Node.js/Next.js)', 'CORRUPTED_NAME',),
    ('.json corruption', 'CORRUPTED_JSON',),
    ('Old formatting bugs (backslash escaping)', 'OLD_FMT_BUG',),
    ('Description truncation', 'TRUNCATED',),
    ('TypeScript files present', 'NO_TS_FILES',),
]

all_good = True
for check_name, *types in checks:
    matching = [p for p in problems if p[1] in types]
    if matching:
        all_good = False
        print(f"  ❌ {check_name}: {len(matching)} issue(s)")
        for ident, _, detail in matching:
            print(f"     {ident}: {detail}")
    else:
        print(f"  ✅ {check_name}")

# CHECK 8: PRD endpoint coverage still intact
print(f"\n═══ PRD ENDPOINT COVERAGE (post-migration) ═══")
all_descs = ' '.join([i['description'] or '' for i in issues])
endpoints = [
    'POST /v1/merchants/register', 'GET /v1/merchants/:id',
    'PUT /v1/merchants/:id/webhook-url', 'POST /v1/merchants/:id/api-keys/rotate',
    'POST /v1/vendors', 'GET /v1/vendors/:id', 'POST /v1/vendors/:id/api-keys',
    'PUT /v1/vendors/:id/account', 'POST /v1/vendors/:id/account/suspend', 'GET /v1/vendors',
    'POST /v1/vendors/:id/customers', 'GET /v1/vendors/:id/customers/:cid',
    'POST /v1/vendors/:id/customers/:cid/account',
    'POST /v1/webhooks/nomba', 'GET /v1/invoices/:id/reconciliation',
    'POST /v1/invoices/:id/mark-paid', 'GET /v1/reconciliation/logs',
    'GET /v1/vendors/:id/statement', 'GET /v1/vendors/:id/customers/:cid/statement',
    'GET /v1/merchants/:id/summary', 'GET /v1/transactions/:id',
    'GET /v1/vendors/:id/transactions',
    'GET /v1/payments/misdirected', 'POST /v1/payments/:id/match', 'POST /v1/payments/:id/refund',
]
missing = [ep for ep in endpoints if ep not in all_descs]
if missing:
    all_good = False
    print(f"  ❌ {len(missing)} endpoints missing:")
    for ep in missing:
        print(f"     {ep}")
else:
    print(f"  ✅ All {len(endpoints)}/25 endpoints still present")

# CHECK 9: Verify .ts code blocks have valid-looking TypeScript
print(f"\n═══ CODE BLOCK LANGUAGE TAGS ═══")
ts_block_count = len(re.findall(BT*3 + r'ts\b', all_descs))
json_block_count = len(re.findall(BT*3 + r'json\b', all_descs))
bash_block_count = len(re.findall(BT*3 + r'bash\b', all_descs))
js_block_count = len(re.findall(BT*3 + r'js\b', all_descs))
print(f"  TypeScript blocks: {ts_block_count}")
print(f"  JSON blocks: {json_block_count}")
print(f"  Bash blocks: {bash_block_count}")
if js_block_count:
    print(f"  ❌ JavaScript blocks remaining: {js_block_count}")
    all_good = False
else:
    print(f"  ✅ No JavaScript blocks remaining")

# FINAL VERDICT
print(f"\n{'='*50}")
if all_good:
    print("🎉 ALL CHECKS PASSED — Migration is clean!")
else:
    print("⚠️  Issues found — see details above")
