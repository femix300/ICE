#!/usr/bin/env python3
import json, urllib.request, re, time
from collections import defaultdict, deque

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

# 1. Fetch Linear issues
print("Fetching all issues from Linear...")
query = '''
{
  issues(filter: { team: { key: { eq: "ICE" } } }, first: 50) {
    nodes {
      id title description
    }
  }
}
'''
data = gql(query)
issues = data["issues"]["nodes"]

# 2. Parse true dependencies from PRD source to reconstruct old_to_new mapping
print("Parsing PRD to reconstruct topological mapping...")
with open("/home/peter_ajimoti/nomba_hackathon/rebuild-linear-issues.mjs", "r") as f:
    content = f.read()

blocks = content.split("    {\n      key: '")
true_tasks = {}

for block in blocks[1:]:
    key = block[:3]
    
    title_match = re.search(r"title:\s*'([^']+)'", block)
    if not title_match: continue
    title = title_match.group(1)
    
    ice_match = re.search(r"\[(ICE-\d+)\]", title)
    planId = ice_match.group(1) if ice_match else None
    
    deps_match = re.search(r"dependsOnKeys:\s*\[(.*?)\]", block, re.DOTALL)
    deps = []
    if deps_match:
        deps = re.findall(r"'([PMES]\d+)'", deps_match.group(1))
        deps = [d for d in deps if d != key]
        
    assignee_match = re.search(r"assignee:\s*'([^']+)'", block)
    est_match = re.search(r"est:\s*'([^']+)'", block)
    assignee = assignee_match.group(1) if assignee_match else "Unknown"
    est = est_match.group(1) if est_match else "Unknown"
    
    # Extract the true raw description by looking at the description field
    # We will grab from `description: buildDesc({` up to `}),`
    desc_match = re.search(r"description:\s*buildDesc\(\{(.*?)\}\),", block, re.DOTALL)
    if desc_match:
        desc_content = desc_match.group(1)
        # Grab goal
        goal_match = re.search(r"goal:\s*'([^']+)'", desc_content)
        goal = goal_match.group(1) if goal_match else ""
        # Grab impl
        impl_match = re.search(r"impl:\s*\[(.*?)\]", desc_content, re.DOTALL)
        if impl_match:
            impl_lines = re.findall(r"'([^']*)'", impl_match.group(1))
            impl_text = "\n".join(impl_lines)
        else:
            impl_text = ""
        # Create files
        create_files_match = re.search(r"createFiles:\s*\[(.*?)\]", desc_content, re.DOTALL)
        if create_files_match:
            cf_lines = re.findall(r"'([^']+)'", create_files_match.group(1))
            create_files_text = "**Files to create:**\n" + "\n".join(f"- `{cf}`" for cf in cf_lines) + "\n\n"
        else:
            create_files_text = ""
            
        raw_desc = goal + "\n\n" + create_files_text + impl_text
    else:
        raw_desc = ""

    true_tasks[key] = {
        "key": key,
        "title": title,
        "planId": planId,
        "deps": deps,
        "assignee": assignee,
        "est": est,
        "raw_desc": raw_desc
    }

# 3. Topological Sort
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

track_counts = {"P": 0, "M": 0, "E": 0, "S": 0}
old_to_new = {}

for k in topo_order:
    track = k[0]
    track_counts[track] += 1
    new_key = f"{track}{track_counts[track]:02d}"
    old_to_new[k] = new_key

print("Correct Mapping:")
for old, new in sorted(old_to_new.items()):
    print(f"  {old} -> {new}")

# 4. FIX ALL TITLES AND DESCRIPTIONS
def fix_text(text):
    # SIMULTANEOUS REPLACE!
    return re.sub(r"\b([PMES]\d+)\b", lambda m: old_to_new.get(m.group(1), m.group(1)), text)

update_mutation = 'mutation($id: String!, $input: IssueUpdateInput!) { issueUpdate(id: $id, input: $input) { success } }'

ice_to_id = {}
for issue in issues:
    match = re.search(r"\[(ICE-\d+)\]", issue["title"])
    if match:
        ice_to_id[match.group(1)] = issue["id"]

print("Updating Linear issues with corrected text mapping...")

for old_key, task in true_tasks.items():
    planId = task["planId"]
    if planId not in ice_to_id: continue
    issue_id = ice_to_id[planId]
    
    new_key = old_to_new[old_key]
    
    # Title
    base_title = re.sub(r"^[PMES]\d+\.\s*", "", task["title"])
    # fix_text on base_title to update any mentions of other tasks
    new_title = f"{new_key}. {fix_text(base_title)}"
    
    # Metadata
    new_deps = [old_to_new[d] for d in task["deps"]]
    new_blocks = [old_to_new[b] for b in graph[old_key]]
    
    new_deps_str = ", ".join(sorted(new_deps)) if new_deps else "Nothing — this is the root task"
    new_blocks_str = ", ".join(sorted(new_blocks)) if new_blocks else "Nothing"
    
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
    
    # Description
    new_desc = metadata_str + "\n\n" + fix_text(task["raw_desc"])
    
    print(f"Applying fix to {new_key} ({planId})")
    gql(update_mutation, {
        "id": issue_id,
        "input": {
            "title": new_title,
            "description": new_desc
        }
    })
    time.sleep(0.3)

print("ALL TITLES AND DESCRIPTIONS FIXED!")
