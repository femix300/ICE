#!/usr/bin/env python3
import json, urllib.request, time, sys

API_KEY = "lin_api_FEzO08T6B8exsBs618DoskFIChEsHqBNX9ITInxE"
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

# 1. Fetch all active issues to find P08, E04, M07
query = '''
{
  issues(filter: { team: { key: { eq: "ICE" } } }, first: 250) {
    nodes {
      id
      identifier
      title
      description
    }
  }
}
'''

data = gql(query)
issues = data["issues"]["nodes"]

update_mutation = '''
mutation($id: String!, $input: IssueUpdateInput!) {
  issueUpdate(id: $id, input: $input) { success }
}
'''

for issue in issues:
    title = issue["title"]
    desc = issue["description"]
    
    # 2. Identify the tasks and append
    append_text = ""
    
    if title.startswith("P08."):
        if "55-minute cache" in desc:
            print("P08 already updated.")
            continue
        append_text = "\n\n> ⚠️ **Nomba Certification Requirement:** Do **not** request a new token per API call. Server-to-server OAuth `client_credentials` tokens last 60 minutes. Cache them in memory or Redis and refresh automatically at the 55-minute mark."
    
    elif title.startswith("E04.") or title.startswith("M07."):
        if "transfers/bank/lookup" in desc:
            print(f"{title} already updated.")
            continue
        append_text = "\n\n> ⚠️ **Nomba Certification Requirement:** Before executing `POST /transfers/bank`, you MUST call `POST /transfers/bank/lookup` to verify the recipient `accountName` and display/log it to prevent irreversible loss."
    
    if append_text:
        print(f"Updating {title}...")
        new_desc = desc + append_text
        gql(update_mutation, {"id": issue["id"], "input": {"description": new_desc}})
        time.sleep(0.5)

print("Done updating existing tasks!")
