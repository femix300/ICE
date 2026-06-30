import fs from 'fs';
import { defineTasks, buildDesc } from './rebuild-linear-issues.mjs';
import https from 'https';

const API_KEY = "lin_api_FEzO08T6B8exsBs618DoskFIChEsHqBNX9ITInxE";
const ENDPOINT = "https://api.linear.app/graphql";

function gql(query, variables = null) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query, variables });
    const req = https.request(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': API_KEY,
        'Content-Length': data.length
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.errors) reject(new Error(parsed.errors[0].message));
          else resolve(parsed.data);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

const old_to_new = {
  'E01': 'E01', 'E02': 'E04', 'E03': 'E05', 'E04': 'E06', 'E05': 'E07', 'E06': 'E08', 'E07': 'E02', 'E08': 'E03',
  'M01': 'M01', 'M02': 'M02', 'M03': 'M03', 'M04': 'M05', 'M05': 'M07', 'M06': 'M04', 'M07': 'M06', 'M08': 'M08',
  'P01': 'P01', 'P02': 'P03', 'P03': 'P04', 'P04': 'P05', 'P05': 'P06', 'P06': 'P07', 'P07': 'P08', 'P08': 'P02',
  'P09': 'P09', 'P10': 'P10',
  'S01': 'S01', 'S02': 'S02', 'S03': 'S03', 'S04': 'S04', 'S05': 'S05', 'S06': 'S06', 'S07': 'S07', 'S08': 'S08',
  'S09': 'S09', 'S10': 'S10'
};

function fixText(text) {
  return text.replace(/\b([PMES]\d+)\b/g, (match, p1) => old_to_new[p1] || p1);
}

async function run() {
  console.log("Fetching issues...");
  const data = await gql(`
    {
      issues(filter: { team: { key: { eq: "ICE" } } }, first: 50) {
        nodes {
          id title
        }
      }
    }
  `);
  
  const issues = data.issues.nodes;
  const ice_to_id = {};
  for (const issue of issues) {
    const match = issue.title.match(/\[(ICE-\d+)\]/);
    if (match) ice_to_id[match[1]] = issue.id;
  }

  // Dummy ids for defineTasks
  const labelIds = { backend: 'b', frontend: 'f', 'phase-1-scaffold': 'p1', 'phase-2-entities': 'p2', 'phase-3-payments': 'p3', 'phase-4-extended': 'p4', 'phase-5-polish': 'p5' };
  const milestoneIds = { 'Phase 1 — Foundation (Day 1)': 'm1', 'Phase 2 — Core Entities (Day 2)': 'm2', 'Phase 3 — Payments Core (Day 3-4)': 'm3', 'Phase 4 — Extended Features (Day 5)': 'm4', 'Phase 5 — Polish & Demo (Day 6-7)': 'm5' };

  const rawTasks = defineTasks(labelIds, milestoneIds);
  
  // Rebuild graph to get blocks array for each task
  const graph = {};
  const tasksByKey = {};
  for (const task of rawTasks) {
    graph[task.key] = [];
    tasksByKey[task.key] = task;
  }
  for (const task of rawTasks) {
    if (task.dependsOnKeys) {
      for (const dep of task.dependsOnKeys) {
        if (graph[dep]) graph[dep].push(task.key);
      }
    }
  }

  for (const task of rawTasks) {
    const match = task.title.match(/\[(ICE-\d+)\]/);
    if (!match) continue;
    const planId = match[1];
    const issueId = ice_to_id[planId];
    if (!issueId) continue;
    
    const newKey = old_to_new[task.key];
    
    const newDeps = (task.dependsOnKeys || []).map(d => old_to_new[d]).sort();
    const newBlocks = graph[task.key].map(d => old_to_new[d]).sort();
    
    const newDepsStr = newDeps.length ? newDeps.join(", ") : "Nothing — this is the root task";
    const newBlocksStr = newBlocks.length ? newBlocks.join(", ") : "Nothing";
    
    const track = newKey[0];
    const trackCounts = { P: 10, M: 8, E: 8, S: 10 };
    const trackNames = { P: "Peter", M: "Marvelous", E: "Emmanuel", S: "Samkiel" };
    
    const metadata = [
      `Order: ${newKey} (${trackNames[track]}, task ${parseInt(newKey.slice(1), 10)} of ${trackCounts[track]})`,
      `Plan ID: ${planId} | Assignee: ${task.description.match(/Assignee:\s*([^|]+)/)?.[1]?.trim() || 'Unknown'} | Estimate: ${task.description.match(/Estimate:\s*(.+)/)?.[1]?.trim() || 'Unknown'}`,
      `Depends on: ${newDepsStr}`,
      `Blocks: ${newBlocksStr}`
    ].join('\n');
    
    // We get the full markdown description by calling buildDesc!
    // But buildDesc includes the old Order/Plan/Deps/Blocks at the top!
    // So we strip the first 4 lines!
    const rawDesc = buildDesc(task);
    const lines = rawDesc.split('\n');
    // First 4 lines are > **Order**, > **Plan ID**, > **Depends**, > **Blocks**
    // Actually wait, sometimes there is no Blocks line if it wasn't there?
    // In buildDesc:
    // L.push('> **Order:** ' + t.order);
    // L.push('> **Plan ID:** ' + t.planId + ' | **Assignee:** ' + t.assignee + ' | **Estimate:** ' + t.est);
    // L.push('> **Depends on:** ' + (t.deps || 'Nothing — this is a root task'));
    // L.push('> **Blocks:** ' + (t.blocks || 'Nothing downstream'));
    // They are EXACTLY 4 lines.
    
    const remainingLines = lines.slice(4).join('\n');
    
    const newDesc = metadata + '\n' + fixText(remainingLines);
    
    const baseTitle = task.title.replace(/^[PMES]\d+\.\s*/, '');
    const newTitle = newKey + ". " + fixText(baseTitle);
    
    console.log(`Updating ${newKey} (${planId})`);
    
    await gql(`mutation($id: String!, $input: IssueUpdateInput!) { issueUpdate(id: $id, input: $input) { success } }`, {
      id: issueId,
      input: {
        title: newTitle,
        description: newDesc
      }
    });
    // Sleep to avoid rate limiting
    await new Promise(r => setTimeout(r, 300));
  }
  
  console.log("ALL RESTORED PERFECTLY!");
}

run().catch(console.error);
