#!/usr/bin/env python3
import json, urllib.request, time

API_KEY = "lin_api_FEzO08T6B8exsBs618DoskFIChEsHqBNX9ITInxE"
ENDPOINT = "https://api.linear.app/graphql"

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
            time.sleep(attempt * 2)

print("Fixing DoD links in Linear...")
data = gql('{ issues(filter: { team: { key: { eq: "ICE" } } }, first: 50) { nodes { id identifier title description } } }')
issues = [i for i in data["issues"]["nodes"] if int(i["identifier"].replace("ICE-", "")) >= 29]

updated = 0
for issue in issues:
    desc = issue["description"] or ""
    # Notice the `<` and `>` that Linear added to the URL
    old_text = "[Definition of Done](<./ICE_ENGINEERING.md#3-definition-of-done>) (`ICE_ENGINEERING.md` section 3)"
    new_text = "the **Definition of Done** (see section 3 of `ICE_ENGINEERING.md` in the repository root)"
    
    if old_text in desc:
        new_desc = desc.replace(old_text, new_text)
        mutation = """mutation($id: String!, $input: IssueUpdateInput!) {
            issueUpdate(id: $id, input: $input) { success }
        }"""
        gql(mutation, {"id": issue["id"], "input": {"description": new_desc}})
        updated += 1
        print(f"Fixed {issue['identifier']}")
        time.sleep(0.5)

print(f"\nDone! Updated {updated} issues.")
