import os
#!/usr/bin/env python3
import json, urllib.request, re, time
from collections import defaultdict, deque

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

# 1. Fetch Linear issues
print("Fetching all issues from Linear...")
query = '''
{
  issues(filter: { team: { key: { eq: "ICE" } } }, first: 50) {
    nodes {
      id title description
      relations { nodes { id } }
    }
  }
}
'''
data = gql(query)
issues = data["issues"]["nodes"]

# 2. Delete ALL relations
print("Deleting ALL existing relations...")
delete_mutation = 'mutation($id: String!) { issueRelationDelete(id: $id) { success } }'
for issue in issues:
    for rel in issue["relations"]["nodes"]:
        gql(delete_mutation, {"id": rel["id"]})
        time.sleep(0.3)

# 3. Parse rebuild-linear-issues.mjs properly
print("Parsing true dependencies from PRD source...")
with open("/home/peter_ajimoti/nomba_hackathon/rebuild-linear-issues.mjs", "r") as f:
    content = f.read()

# Split by `    {` to get each task definition
blocks = content.split("    {\n      key: '")
true_tasks = {} # original_key -> data

for block in blocks[1:]:
    key = block[:3] # e.g. P01
    
    # title
    title_match = re.search(r"title:\s*'([^']+)'", block)
    if not title_match: continue
    title = title_match.group(1)
    
    # planId
    ice_match = re.search(r"\[(ICE-\d+)\]", title)
    planId = ice_match.group(1) if ice_match else None
    
    # dependencies
    deps_match = re.search(r"dependsOnKeys:\s*\[(.*?)\]", block)
    deps = []
    if deps_match:
        deps = re.findall(r"'([PMES]\d+)'", deps_match.group(1))
        deps = [d for d in deps if d != key] # no self loops
        
    # metadata fields for description
    assignee_match = re.search(r"assignee:\s*'([^']+)'", block)
    est_match = re.search(r"est:\s*'([^']+)'", block)
    assignee = assignee_match.group(1) if assignee_match else "Unknown"
    est = est_match.group(1) if est_match else "Unknown"
    
    true_tasks[key] = {
        "key": key,
        "title": title,
        "planId": planId,
        "deps": deps,
        "assignee": assignee,
        "est": est
    }

# 4. Topological Sort to generate new keys!
print("Performing topological sort to fix numbering...")
graph = defaultdict(list)
in_degree = {k: 0 for k in true_tasks}

for k, task in true_tasks.items():
    for dep in task["deps"]:
        graph[dep].append(k)
        in_degree[k] += 1

queue = deque([k for k, v in in_degree.items() if v == 0])
topo_order = []

while queue:
    curr = queue.popleft()
    topo_order.append(curr)
    for neighbor in graph[curr]:
        in_degree[neighbor] -= 1
        if in_degree[neighbor] == 0:
            queue.append(neighbor)

if len(topo_order) != len(true_tasks):
    print("CYCLE DETECTED IN PRD!")
    exit(1)

# Generate new numbering per track
track_counts = {"P": 0, "M": 0, "E": 0, "S": 0}
old_to_new = {}

for k in topo_order:
    track = k[0]
    track_counts[track] += 1
    new_key = f"{track}{track_counts[track]:02d}"
    old_to_new[k] = new_key

print("Renumbering Mapping:")
for old, new in sorted(old_to_new.items()):
    print(f"  {old} -> {new}")

# Build mapping of ICE-xxx -> Linear Issue ID
ice_to_issue = {}
for issue in issues:
    match = re.search(r"\[(ICE-\d+)\]", issue["title"])
    if match:
        ice_to_issue[match.group(1)] = {"id": issue["id"], "desc": issue["description"]}

# 5. Update ALL Linear Issues with clean text
print("Updating all Linear issues with clean titles and descriptions...")
update_mutation = 'mutation($id: String!, $input: IssueUpdateInput!) { issueUpdate(id: $id, input: $input) { success } }'

# Helper to swap old keys for new keys in text
def fix_text(text):
    temp = text
    for old, new in old_to_new.items():
        temp = re.sub(rf"\b{old}\b", f"__{new}__", temp)
    temp = re.sub(r"__([PMES]\d+)__", r"\1", temp)
    return temp

new_key_to_issue_id = {}

for old_key, task in true_tasks.items():
    planId = task["planId"]
    if planId not in ice_to_issue: continue
    
    issue_info = ice_to_issue[planId]
    issue_id = issue_info["id"]
    old_desc = issue_info["desc"]
    
    new_key = old_to_new[old_key]
    new_key_to_issue_id[new_key] = issue_id
    
    # 5a. Clean Title
    base_title = re.sub(r"^[PMES]\d+\.\s*", "", task["title"])
    new_title = fix_text(f"{new_key}. {base_title}")
    
    # 5b. Build Clean Metadata Block
    new_deps = [old_to_new[d] for d in task["deps"]]
    new_blocks = [old_to_new[b] for b in graph[old_key]]
    
    new_deps_str = ", ".join(sorted(new_deps)) if new_deps else "Nothing — this is the root task"
    new_blocks_str = ", ".join(sorted(new_blocks)) if new_blocks else "Nothing"
    
    # Find total tasks in this track
    total_in_track = sum(1 for k in old_to_new.values() if k[0] == new_key[0])
    task_num = int(new_key[1:])
    track_name = {"P": "Peter", "M": "Marvelous", "E": "Emmanuel", "S": "Samkiel"}[new_key[0]]
    
    metadata = [
        f"Order: {new_key} ({track_name}, task {task_num} of {total_in_track})",
        f"Plan ID: {planId} | Assignee: {task['assignee']} | Estimate: {task['est']}",
        f"Depends on: {new_deps_str}",
        f"Blocks: {new_blocks_str}"
    ]
    metadata_str = "\n".join(metadata)
    
    # 5c. Strip ALL old metadata from the description
    # We will split by lines, and skip any lines that match Order, Plan ID, Depends on, Blocks
    # or start with > Order, etc.
    clean_lines = []
    in_metadata = True # Assume metadata is at the top
    for line in old_desc.split("\n"):
        stripped = line.strip().lstrip(">").strip()
        if stripped.startswith("Order:") or stripped.startswith("Plan ID:") or stripped.startswith("Depends on:") or stripped.startswith("Blocks:"):
            continue
        # Also skip empty lines if we haven't seen real content yet
        if in_metadata and stripped == "":
            continue
        in_metadata = False
        clean_lines.append(line)
    
    # Put the clean metadata at the top!
    new_desc = metadata_str + "\n\n" + "\n".join(clean_lines)
    
    print(f"Updating {new_key} ({planId})")
    gql(update_mutation, {
        "id": issue_id,
        "input": {
            "title": new_title,
            "description": new_desc
        }
    })
    time.sleep(0.4)

# 6. Recreate relations correctly!
print("Recreating relations...")
create_mutation = 'mutation($input: IssueRelationCreateInput!) { issueRelationCreate(input: $input) { success } }'

for old_key, task in true_tasks.items():
    new_key = old_to_new[old_key]
    issue_id = new_key_to_issue_id.get(new_key)
    if not issue_id: continue
    
    for dep_old_key in task["deps"]:
        dep_new_key = old_to_new[dep_old_key]
        dep_id = new_key_to_issue_id.get(dep_new_key)
        if not dep_id: continue
        
        # dep blocks issue
        gql(create_mutation, {
            "input": {
                "issueId": dep_id,
                "relatedIssueId": issue_id,
                "type": "blocks"
            }
        })
        time.sleep(0.3)

print("PERFECT REBUILD COMPLETE!")
