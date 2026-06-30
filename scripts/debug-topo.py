import re
from collections import defaultdict, deque

with open("/home/peter_ajimoti/nomba_hackathon/rebuild-linear-issues.mjs", "r") as f:
    content = f.read()

blocks = content.split("    {\n      key: '")
true_tasks = {}
for block in blocks[1:]:
    key = block[:3]
    title_match = re.search(r"title:\s*'([^']+)'", block)
    title = title_match.group(1) if title_match else ""
    deps_match = re.search(r"dependsOnKeys:\s*\[(.*?)\]", block, re.DOTALL)
    deps = []
    if deps_match:
        deps = re.findall(r"'([PMES]\d+)'", deps_match.group(1))
        deps = [d for d in deps if d != key]
    
    true_tasks[key] = {
        "title": title,
        "deps": deps
    }

for k, task in true_tasks.items():
    print(f"{k}: {task['title']}")
    print(f"  Deps: {task['deps']}")

print("---")
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

print("Topo order:", topo_order)
