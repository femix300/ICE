import { defineTasks, buildDesc } from './rebuild-linear-issues.mjs';
import fs from 'fs';

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

// 1. Read rebuild-linear-issues.mjs
let code = fs.readFileSync('./rebuild-linear-issues.mjs', 'utf-8');

// 2. We want to completely override defineTasks
const overrideCode = `
export function defineTasks(labelIds, milestoneIds) {
  const old_to_new = ${JSON.stringify(old_to_new)};
  function fixText(text) {
    if (!text) return text;
    return text.replace(/\\b([PMES]\\d+)\\b/g, (match, p1) => old_to_new[p1] || p1);
  }
  
  const rawTasks = originalDefineTasks(labelIds, milestoneIds);
  
  // Rebuild graph to get blocks array for each task
  const graph = {};
  for (const task of rawTasks) graph[task.key] = [];
  for (const task of rawTasks) {
    if (task.dependsOnKeys) {
      for (const dep of task.dependsOnKeys) {
        if (graph[dep]) graph[dep].push(task.key);
      }
    }
  }
  
  const newTasks = [];
  for (const task of rawTasks) {
    const newKey = old_to_new[task.key];
    const newDeps = (task.dependsOnKeys || []).map(d => old_to_new[d]).sort();
    const newBlocks = graph[task.key].map(d => old_to_new[d]).sort();
    
    const newDepsStr = newDeps.length ? newDeps.join(", ") : "Nothing — this is the root task";
    const newBlocksStr = newBlocks.length ? newBlocks.join(", ") : "Nothing downstream";
    
    const track = newKey[0];
    const trackCounts = { P: 10, M: 8, E: 8, S: 10 };
    const trackNames = { P: "Peter", M: "Marvelous", E: "Emmanuel", S: "Samkiel" };
    const taskNum = parseInt(newKey.slice(1), 10);
    
    // Create new task object
    const newTask = { ...task };
    newTask.key = newKey;
    
    // Fix title
    const baseTitle = task.title.replace(/^[PMES]\\d+\\.\\s*/, '');
    newTask.title = newKey + ". " + fixText(baseTitle);
    
    // Fix all string fields
    newTask.order = newKey + " (" + trackNames[track] + ", task " + taskNum + " of " + trackCounts[track] + ")";
    newTask.deps = newDepsStr;
    newTask.blocks = newBlocksStr;
    newTask.goal = fixText(task.goal);
    
    if (newTask.impl) newTask.impl = newTask.impl.map(fixText);
    if (newTask.tests) newTask.tests = newTask.tests.map(fixText);
    if (newTask.acceptance) newTask.acceptance = newTask.acceptance.map(fixText);
    
    // Update dependencies
    newTask.dependsOnKeys = newDeps;
    
    // We update description by calling buildDesc!
    newTask.description = buildDesc(newTask);
    
    newTasks.push(newTask);
  }
  return newTasks;
}
`;

// Rename original defineTasks
code = code.replace(/export function defineTasks/g, 'function originalDefineTasks');
code = code.replace(/function defineTasks/g, 'function originalDefineTasks');

// Insert our override
code = code.replace(/export function buildDesc/g, overrideCode + '\\nexport function buildDesc');
code = code.replace(/function buildDesc/g, overrideCode + '\\nfunction buildDesc');

fs.writeFileSync('./rebuild-linear-issues-perfect.mjs', code);
console.log("Wrote rebuild-linear-issues-perfect.mjs");
