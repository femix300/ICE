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

print("Fetching ICE-29...")
data = gql('{ issues(filter: { team: { key: { eq: "ICE" } } }, first: 50) { nodes { id identifier description } } }')

issue = next((i for i in data["issues"]["nodes"] if i["identifier"] == "ICE-29"), None)
if not issue:
    print("Could not find ICE-29")
    exit(1)

desc = issue["description"] or ""

addon = """
## Webhook Tunneling Test
* **Goal**: Ensure the local environment can receive inbound webhooks from Nomba before we start building the reconciliation logic.
* **Steps**:
  1. Set up the local Express server.
  2. Create a dummy test endpoint `POST /v1/webhooks/test` that simply logs the payload and returns `200 OK`.
  3. Start the tunnel: `/snap/bin/ngrok http 3000` (or `npm install -g ngrok` and run `ngrok http 3000`).
  4. Fire a test webhook from Nomba sandbox to your ngrok URL (`https://<id>.ngrok-free.app/v1/webhooks/test`) and verify it appears in your console.
"""

dod_marker = "> **Before opening a PR:**"
if "Webhook Tunneling Test" in desc:
    print("Already updated.")
    exit(0)
    
if dod_marker in desc:
    new_desc = desc.replace(dod_marker, addon + "\n---\n\n" + dod_marker)
else:
    new_desc = desc + "\n" + addon

print("Updating ICE-29...")
mutation = """mutation($id: String!, $input: IssueUpdateInput!) {
    issueUpdate(id: $id, input: $input) { success }
}"""
gql(mutation, {"id": issue["id"], "input": {"description": new_desc}})

print("ICE-29 updated successfully!")
