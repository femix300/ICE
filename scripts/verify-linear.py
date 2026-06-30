#!/usr/bin/env python3
import json, urllib.request, re

API_KEY = "lin_api_FEzO08T6B8exsBs618DoskFIChEsHqBNX9ITInxE"
ENDPOINT = "https://api.linear.app/graphql"

def gql(query):
    req = urllib.request.Request(ENDPOINT,
        data=json.dumps({"query": query}).encode(),
        headers={"Content-Type": "application/json", "Authorization": API_KEY})
    resp = urllib.request.urlopen(req, timeout=30)
    return json.loads(resp.read())["data"]

query = '''
{
  issues(filter: { team: { key: { eq: "ICE" } } }, first: 50) {
    nodes {
      identifier
      title
      relations {
        nodes {
          type
          relatedIssue { title }
        }
      }
    }
  }
}
'''
data = gql(query)
issues = data["issues"]["nodes"]

issues.sort(key=lambda x: x["title"])

for prefix in ["P", "M", "E", "S"]:
    print(f"\n--- Series {prefix} ---")
    for issue in issues:
        if issue["title"].startswith(prefix):
            deps = []
            blocks = []
            for rel in issue["relations"]["nodes"]:
                rel_title = rel["relatedIssue"]["title"].split(".")[0]
                if rel["type"] == "blocks":
                    blocks.append(rel_title)
                elif rel["type"] == "blocked_by":
                    deps.append(rel_title)
            print(f"{issue['title']}")
            if deps: print(f"   Deps: {', '.join(sorted(deps))}")
            if blocks: print(f"   Blocks: {', '.join(sorted(blocks))}")
