import os
#!/usr/bin/env python3
import json, urllib.request, time, sys

API_KEY = os.environ.get("LINEAR_API_KEY")
ENDPOINT = "https://api.linear.app/graphql"

def gql(query, variables=None, retries=5):
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
            time.sleep(attempt * 2)

# Team ID, Project ID, State ID from HANDOFF.md
TEAM_ID = "7b8e307b-5c79-4471-b8c1-30921c873672"
PROJECT_ID = "7943eafe-1ede-4d6c-b73f-3df82b8f27a0"
TODO_STATE_ID = "0d3e4f4f-d6bb-4533-a908-adc0c9fac10d"

# Milestone "Phase 4 — Extended (Day 5-6)" ID? We need to look it up or we can just skip milestone for a sec.
# Let's fetch the project milestones to find Phase 4.
query_milestones = """
{
  project(id: "7943eafe-1ede-4d6c-b73f-3df82b8f27a0") {
    projectMilestones { nodes { id name } }
  }
}
"""
ms_data = gql(query_milestones)
ph4_id = None
for ms in ms_data["project"]["projectMilestones"]["nodes"]:
    if "Phase 4" in ms["name"]:
        ph4_id = ms["id"]

# Labels for backend and async
query_labels = """
{
  issueLabels(filter: { team: { key: { eq: "ICE" } } }) { nodes { id name } }
}
"""
labels_data = gql(query_labels)
label_ids = []
for lbl in labels_data["issueLabels"]["nodes"]:
    if lbl["name"] in ["backend", "async", "phase-4-extended"]:
        label_ids.append(lbl["id"])

desc = """Order: E09 (Emmanuel, task 9 of 9)
Plan ID: ICE-309 | Assignee: Emmanuel | Estimate: 0.5 day
Depends on: M01 (ICE-201), P08 (ICE-108)
Blocks: Nothing downstream

**Goal:** Pull the `/transactions` endpoint nightly, diff against the local ledger using `merchantTxRef` as the anchor, and alert on any drift. Critical for catching silent Nomba data inconsistencies.

**Files to create/edit:**
- `src/jobs/nightly-reconciliation.ts`
- `tests/unit/nightly-reconciliation.test.ts`

**Implementation details:**
```ts
// src/jobs/nightly-reconciliation.ts
export const runNightlyDiff = async () => {
  const { data } = await nomba.get("/transactions", {
    params: { dateFrom: getYesterday(), dateTo: getToday(), status: "success" },
  });

  for (const tx of data.transactions) {
    const local = await db.query("SELECT * FROM transactions WHERE transaction_id = $1", [tx.merchantTxRef]);
    if (!local.rows[0]) await alertOps("Orphan transaction on Nomba", tx);
    else if (local.rows[0].amount_kobo !== tx.amount) await alertOps("Amount drift", { local, tx });
  }
};
```

> **Definition of Done:** Ensure compliance with [Engineering Standards](https://github.com/femix300/ICE/blob/main/ICE_ENGINEERING.md)

**Automated Tests:**
- Cron triggers successfully at midnight
- Missing local transactions raise Orphan Alert
- Amount mismatches raise Amount Drift alert

**Acceptance Criteria:**
- Diff uses merchantTxRef as anchor
- Logs discrepancies effectively

**PR Information:**
- Branch: `feat/nightly-diff`
- Commit: `feat(jobs): nightly reconciliation diff cron`"""

create_mut = """
mutation($input: IssueCreateInput!) {
  issueCreate(input: $input) { success issue { id identifier } }
}
"""

print("Creating E09...")
res = gql(create_mut, {
    "input": {
        "title": "E09. [ICE-309] Nightly Reconciliation Diff Cron",
        "description": desc,
        "teamId": TEAM_ID,
        "projectId": PROJECT_ID,
        "stateId": TODO_STATE_ID,
        "projectMilestoneId": ph4_id,
        "labelIds": label_ids,
        "estimate": 1
    }
})

e09_id = res["issueCreate"]["issue"]["id"]
print("Created E09! ID:", e09_id, res["issueCreate"]["issue"]["identifier"])

# Now fetch M01 and P08 to set dependencies
query_issues = """
{
  issues(filter: { team: { key: { eq: "ICE" } } }, first: 250) {
    nodes { id title }
  }
}
"""
issues_data = gql(query_issues)
m01_id = None
p08_id = None

for issue in issues_data["issues"]["nodes"]:
    if issue["title"].startswith("M01."):
        m01_id = issue["id"]
    if issue["title"].startswith("P08."):
        p08_id = issue["id"]

rel_mut = """
mutation($input: IssueRelationCreateInput!) {
  issueRelationCreate(input: $input) { success }
}
"""

print(f"Setting deps... M01 ID: {m01_id}, P08 ID: {p08_id}")
if m01_id:
    # M01 blocks E09 -> issueId: M01, relatedIssueId: E09
    gql(rel_mut, {"input": {"issueId": m01_id, "relatedIssueId": e09_id, "type": "blocks"}})
    print("Set M01 blocks E09")

if p08_id:
    gql(rel_mut, {"input": {"issueId": p08_id, "relatedIssueId": e09_id, "type": "blocks"}})
    print("Set P08 blocks E09")

print("Done creating and linking E09!")
