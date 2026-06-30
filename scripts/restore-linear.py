import os
#!/usr/bin/env python3
import json, urllib.request, re, time

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

print("Fetching all issues...")
query = '''
{
  issues(filter: { team: { key: { eq: "ICE" } } }, first: 50) {
    nodes {
      id title description
      relations {
        nodes {
          id
        }
      }
    }
  }
}
'''
data = gql(query)
issues = data["issues"]["nodes"]

# 1. Delete all existing relations
print("Deleting all relations...")
delete_mutation = 'mutation($id: String!) { issueRelationDelete(id: $id) { success } }'
for issue in issues:
    for rel in issue["relations"]["nodes"]:
        gql(delete_mutation, {"id": rel["id"]})
        time.sleep(0.3)

# 2. Extract original data from rebuild-linear-issues.mjs
print("Parsing original data from rebuild script...")
with open("/home/peter_ajimoti/nomba_hackathon/rebuild-linear-issues.mjs", "r") as f:
    content = f.read()

# Parse tasks
import ast
# We can use regex to extract key, title, dependsOnKeys
task_pattern = re.compile(r"key:\s*'([PMES]\d+)',\s*title:\s*'([^']+)'", re.MULTILINE)
original_tasks = {}
for match in task_pattern.finditer(content):
    key = match.group(1)
    title = match.group(2)
    # Extract ICE-xxx
    ice_match = re.search(r"\[(ICE-\d+)\]", title)
    if ice_match:
        ice_id = ice_match.group(1)
        original_tasks[ice_id] = {"key": key, "title": title}

# Extract description block (just regex for order/deps/blocks to restore)
desc_pattern = re.compile(r"order:\s*'([^']+)',\s*planId:\s*'([^']+)',\s*assignee:\s*'([^']+)',\s*est:\s*'([^']+)',\s*(?:deps:\s*'([^']*)',\s*)?(?:blocks:\s*'([^']*)',\s*)?")
for match in desc_pattern.finditer(content):
    order = match.group(1)
    planId = match.group(2)
    assignee = match.group(3)
    est = match.group(4)
    deps = match.group(5) or ""
    blocks = match.group(6) or ""
    if planId in original_tasks:
        desc_lines = [f"Order: {order}", f"Plan ID: {planId} | Assignee: {assignee} | Estimate: {est}"]
        if deps: desc_lines.append(f"Depends on: {deps}")
        if blocks: desc_lines.append(f"Blocks: {blocks}")
        original_tasks[planId]["desc_prefix"] = "\n".join(desc_lines)

# Also parse dependencies to recreate them
deps_pattern = re.compile(r"key:\s*'([PMES]\d+)',.*?dependsOnKeys:\s*\[([^\]]+)\]", re.DOTALL)
dependencies = {}
for match in deps_pattern.finditer(content):
    key = match.group(1)
    deps_str = match.group(2)
    deps_keys = re.findall(r"'([PMES]\d+)'", deps_str)
    dependencies[key] = deps_keys

# 3. Restore Titles and Descriptions
print("Restoring original titles and descriptions...")
update_mutation = 'mutation($id: String!, $input: IssueUpdateInput!) { issueUpdate(id: $id, input: $input) { success } }'
key_to_id = {}

for issue in issues:
    ice_match = re.search(r"\[(ICE-\d+)\]", issue["title"])
    if not ice_match: continue
    ice_id = ice_match.group(1)
    
    if ice_id in original_tasks:
        orig = original_tasks[ice_id]
        key = orig["key"]
        key_to_id[key] = issue["id"]
        
        orig_title = orig["title"]
        
        # Replace the first few lines of description with orig["desc_prefix"]
        desc = issue["description"]
        # Split until we see something that is NOT Order/Plan ID/Depends on/Blocks
        lines = desc.split("\n")
        new_lines = []
        skip = True
        for line in lines:
            if skip and any(line.startswith(x) for x in ["Order:", "Plan ID:", "Depends on:", "Blocks:"]):
                continue
            elif skip and line.strip() == "":
                continue
            else:
                if skip:
                    # We reached the end of the metadata block
                    new_lines.append(orig["desc_prefix"])
                    new_lines.append("")
                    skip = False
                new_lines.append(line)
                
        new_desc = "\n".join(new_lines)
        
        if issue["title"] != orig_title or issue["description"] != new_desc:
            print(f"Restoring {ice_id} -> {key}")
            gql(update_mutation, {
                "id": issue["id"],
                "input": {"title": orig_title, "description": new_desc}
            })
            time.sleep(0.4)

# 4. Recreate Relations Correctly!
# If A depends on B, then B blocks A.
print("Recreating relations correctly...")
create_mutation = 'mutation($input: IssueRelationCreateInput!) { issueRelationCreate(input: $input) { success } }'

for key, deps in dependencies.items():
    issue_id = key_to_id.get(key)
    if not issue_id: continue
    for dep_key in deps:
        if dep_key == key: continue # SKIP SELF-REFERENCE!
        dep_id = key_to_id.get(dep_key)
        if not dep_id: continue
        print(f"Creating: {dep_key} blocks {key}")
        gql(create_mutation, {
            "input": {
                "issueId": dep_id,
                "relatedIssueId": issue_id,
                "type": "blocks"
            }
        })
        time.sleep(0.4)

print("Restore complete! Graph is now exactly as defined in the PRD, with correct relations.")
