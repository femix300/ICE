#!/usr/bin/env python3
"""
ICE — Replace inline DoD with reference to ICE_ENGINEERING.md
Uses urllib (not node fetch) to avoid DNS resolution issues.
"""
import json, urllib.request, time, sys

API_KEY = "lin_api_FEzO08T6B8exsBs618DoskFIChEsHqBNX9ITInxE"
ENDPOINT = "https://api.linear.app/graphql"

DOD_REFERENCE = "\n---\n\n> **Before opening a PR:** Complete all checks in the [Definition of Done](./ICE_ENGINEERING.md#3-definition-of-done) (`ICE_ENGINEERING.md` section 3). Self-review first, then request Peter's approval."

def gql(query, variables=None, retries=3):
    payload = {"query": query}
    if variables:
        payload["variables"] = variables
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(ENDPOINT,
                data=json.dumps(payload).encode(),
                headers={"Content-Type": "application/json", "Authorization": API_KEY})
            resp = urllib.request.urlopen(req, timeout=30)
            data = json.loads(resp.read())
            if "errors" in data and data["errors"]:
                raise Exception(data["errors"][0]["message"])
            return data["data"]
        except Exception as e:
            if attempt == retries:
                raise
            wait = attempt * 2
            print(f"   ⏳ Retry {attempt}/{retries} in {wait}s... ({e})")
            time.sleep(wait)

print("🧊 ICE — Replacing inline DoD with reference link")
print("═" * 47 + "\n")

# 1. Fetch all issues
data = gql('{ issues(filter: { team: { key: { eq: "ICE" } } }, first: 50) { nodes { id identifier title description } } }')
issues = sorted(
    [i for i in data["issues"]["nodes"] if int(i["identifier"].replace("ICE-", "")) >= 29],
    key=lambda x: int(x["identifier"].replace("ICE-", ""))
)
print(f"Found {len(issues)} issues\n")

updated = 0
skipped = 0

for issue in issues:
    desc = issue["description"] or ""
    ident = issue["identifier"]

    if "## Definition of Done" not in desc:
        print(f"   ⏭️  {ident} — no DoD found, skipping")
        skipped += 1
        continue

    # Find the DoD section
    dod_index = desc.index("## Definition of Done")

    # Find the --- separator before it (within 10 chars)
    before = desc[:dod_index]
    last_sep = before.rfind("---")

    if last_sep != -1 and (dod_index - last_sep) < 10:
        cut_point = last_sep
    else:
        cut_point = dod_index

    # Trim trailing newlines before cut point
    while cut_point > 0 and desc[cut_point - 1] == "\n":
        cut_point -= 1

    preserved = desc[:cut_point]

    # Safety checks
    if len(preserved) < 200:
        print(f"   ⚠️  {ident} — preserved too short ({len(preserved)} chars), SKIPPING")
        skipped += 1
        continue

    if "## Goal" not in preserved or "## PR" not in preserved:
        print(f"   ⚠️  {ident} — missing Goal or PR after trim, SKIPPING")
        skipped += 1
        continue

    new_desc = preserved + DOD_REFERENCE
    removed_lines = desc.count("\n") - new_desc.count("\n")

    # Update via GraphQL mutation
    mutation = """mutation($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) { success }
    }"""
    gql(mutation, {"id": issue["id"], "input": {"description": new_desc}})

    updated += 1
    short = (issue["title"].split("] ")[1] if "] " in issue["title"] else issue["title"])[:55]
    print(f"   ✅ {ident} — {short} (-{removed_lines} lines)")
    time.sleep(0.5)

print(f"\n{'═' * 47}")
print(f"🎉 Done! {updated} issues updated, {skipped} skipped")
print(f"\n📄 DoD now lives in: ICE_ENGINEERING.md (section 3)")
print(f"📎 Each task has a one-line reference pointing there")
