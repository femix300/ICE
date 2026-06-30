#!/usr/bin/env python3
import json, urllib.request, re, time
from collections import defaultdict, deque

API_KEY = "lin_api_FEzO08T6B8exsBs618DoskFIChEsHqBNX9ITInxE"
ENDPOINT = "https://api.linear.app/graphql"

def gql(query, variables=None):
    payload = {"query": query}
    if variables:
        payload["variables"] = variables
    for attempt in range(1, 6):
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
            if attempt == 5:
                raise
            time.sleep(attempt * 2)

print("Fetching all ICE issues...")
query = '''
{
  issues(filter: { team: { key: { eq: "ICE" } } }, first: 50) {
    nodes {
      id identifier title description
      relations {
        nodes {
          type
          issue { id }
          relatedIssue { id }
        }
      }
    }
  }
}
'''
data = gql(query)
issues = data["issues"]["nodes"]

# Graph: blocker_id -> list of blocked_ids
graph = defaultdict(list)
in_degree = defaultdict(int)

for issue in issues:
    in_degree[issue["id"]] = 0

for issue in issues:
    for rel in issue["relations"]["nodes"]:
        if rel["type"] == "blocks":
            blocker = rel["issue"]["id"]
            blocked = rel["relatedIssue"]["id"]
            graph[blocker].append(blocked)
            in_degree[blocked] += 1

# Topological sort
topo_order = []
queue = deque([k for k, v in in_degree.items() if v == 0])

while queue:
    curr = queue.popleft()
    topo_order.append(curr)
    for neighbor in graph[curr]:
        in_degree[neighbor] -= 1
        if in_degree[neighbor] == 0:
            queue.append(neighbor)

if len(topo_order) != len(issues):
    print("CYCLE DETECTED! Cannot topologically sort.")
    exit(1)

# Group topologically sorted IDs by Developer Series (P, M, E, S)
series_map = {"P": [], "M": [], "E": [], "S": []}

issue_dict = {i["id"]: i for i in issues}

for iid in topo_order:
    issue = issue_dict[iid]
    match = re.match(r"^([PMES])\d+\.", issue["title"])
    if match:
        series_map[match.group(1)].append(iid)

# Generate mapping of old prefix -> new prefix
old_to_new = {}

for prefix, iids in series_map.items():
    for idx, iid in enumerate(iids):
        issue = issue_dict[iid]
        old_tag = re.match(r"^([PMES]\d+)\.", issue["title"]).group(1)
        new_tag = f"{prefix}{(idx+1):02d}"
        old_to_new[old_tag] = new_tag

print("Mapping:")
for old, new in sorted(old_to_new.items()):
    if old != new:
        print(f"  {old} -> {new}")

# Function to safely replace all occurrences
def update_text(text):
    if not text: return text
    # Replace P01 with __P01__ temporarily to avoid double replacement
    temp_text = text
    for old, new in old_to_new.items():
        temp_text = re.sub(rf"\b{old}\b", f"__{new}__", temp_text)
    # Remove __
    temp_text = re.sub(r"__([PMES]\d+)__", r"\1", temp_text)
    return temp_text

update_mutation = '''
mutation($id: String!, $input: IssueUpdateInput!) {
  issueUpdate(id: $id, input: $input) { success }
}
'''

for issue in issues:
    old_title = issue["title"]
    old_desc = issue["description"]
    
    new_title = update_text(old_title)
    new_desc = update_text(old_desc)
    
    if new_title != old_title or new_desc != old_desc:
        print(f"Updating {issue['identifier']}: {old_title[:15]}... -> {new_title[:15]}...")
        gql(update_mutation, {
            "id": issue["id"],
            "input": {
                "title": new_title,
                "description": new_desc
            }
        })
        time.sleep(0.5)

print("All tasks reordered successfully!")
