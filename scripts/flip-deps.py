#!/usr/bin/env python3
import json, urllib.request, time

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

# 1. Fetch all issues and their relations
query = '''
{
  issues(filter: { team: { key: { eq: "ICE" } } }, first: 250) {
    nodes {
      id
      identifier
      relations {
        nodes {
          id
          type
          issue { id identifier }
          relatedIssue { id identifier }
        }
      }
    }
  }
}
'''

data = gql(query)
issues = data["issues"]["nodes"]

# We only want to delete and recreate relations once.
# Since relationships show up on both sides (A blocks B, B blocked_by A),
# we need to be careful to only flip the unique 'blocks' relations.
relations_to_flip = []
seen_rel_ids = set()

for issue in issues:
    for rel in issue["relations"]["nodes"]:
        if rel["type"] == "blocks" and rel["id"] not in seen_rel_ids:
            seen_rel_ids.add(rel["id"])
            relations_to_flip.append(rel)

print(f"Found {len(relations_to_flip)} 'blocks' relations to flip.")

# 2. Delete and recreate flipped
delete_mutation = '''
mutation($id: String!) {
  issueRelationDelete(id: $id) { success }
}
'''
create_mutation = '''
mutation($input: IssueRelationCreateInput!) {
  issueRelationCreate(input: $input) { success }
}
'''

for rel in relations_to_flip:
    print(f"Flipping relation: {rel['issue']['identifier']} blocks {rel['relatedIssue']['identifier']} ...")
    
    # delete
    gql(delete_mutation, {"id": rel["id"]})
    
    # recreate flipped
    gql(create_mutation, {
        "input": {
            "issueId": rel["relatedIssue"]["id"],
            "relatedIssueId": rel["issue"]["id"],
            "type": "blocks"
        }
    })
    time.sleep(0.5)

print("Done flipping dependencies!")
