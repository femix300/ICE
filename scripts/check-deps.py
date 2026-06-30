import os
#!/usr/bin/env python3
import json, urllib.request, time

API_KEY = os.environ.get("LINEAR_API_KEY")
ENDPOINT = "https://api.linear.app/graphql"

def gql(query, variables=None):
    payload = {"query": query}
    if variables:
        payload["variables"] = variables
    req = urllib.request.Request(ENDPOINT,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "Authorization": API_KEY})
    resp = urllib.request.urlopen(req, timeout=30)
    data = json.loads(resp.read())
    if "errors" in data and data["errors"]:
        raise Exception(data["errors"][0]["message"])
    return data["data"]

# Find issues ICE-30 (P02) and ICE-31 (P03)
query = '''
{
  issues(filter: { team: { key: { eq: "ICE" } } }, first: 50) {
    nodes {
      id
      identifier
      title
      relations {
        nodes {
          id
          type
          relatedIssue {
            identifier
          }
          issue {
            identifier
          }
        }
      }
    }
  }
}
'''
data = gql(query)
issues = data["issues"]["nodes"]

for issue in issues:
    if issue["identifier"] in ["ICE-30", "ICE-31"]:
        print(f"Issue {issue['identifier']} ({issue['title']}) Relations:")
        for rel in issue["relations"]["nodes"]:
            print(f"  - {rel['type']}: {rel['issue']['identifier']} <-> {rel['relatedIssue']['identifier']} (Rel ID: {rel['id']})")
