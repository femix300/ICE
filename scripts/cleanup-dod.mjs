#!/usr/bin/env node
/**
 * ICE — Replace inline DoD with a short reference to ICE_ENGINEERING.md
 * Carefully removes only the "## Definition of Done" section from each task,
 * preserving everything else (including P01's Tooling Setup section).
 */

const API_KEY = "lin_api_FEzO08T6B8exsBs618DoskFIChEsHqBNX9ITInxE";
const ENDPOINT = "https://api.linear.app/graphql";

async function gql(query, variables = {}, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: API_KEY },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(30000),
      });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0].message);
      return json.data;
    } catch (err) {
      if (attempt === retries) throw err;
      console.log(`   ⏳ Retry ${attempt}/${retries}... (${err.message})`);
      await new Promise(r => setTimeout(r, attempt * 2000));
    }
  }
}

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// The short reference that replaces the full DoD
const DOD_REFERENCE = [
  '',
  '---',
  '',
  '> **Before opening a PR:** Complete all checks in the [Definition of Done](./ICE_ENGINEERING.md#3-definition-of-done) (`ICE_ENGINEERING.md` section 3). Self-review first, then request Peter\'s approval.',
].join('\n');

async function main() {
  console.log('🧊 ICE — Replacing inline DoD with reference link');
  console.log('═══════════════════════════════════════════════\n');

  // 1. Fetch all issues
  const data = await gql(`{
    issues(filter: { team: { key: { eq: "ICE" } } }, first: 50) {
      nodes { id identifier title description }
    }
  }`);

  const issues = data.issues.nodes
    .filter(i => parseInt(i.identifier.replace('ICE-', '')) >= 29)
    .sort((a, b) => parseInt(a.identifier.replace('ICE-', '')) - parseInt(b.identifier.replace('ICE-', '')));

  console.log(`Found ${issues.length} issues\n`);

  let updated = 0;
  let skipped = 0;

  for (const issue of issues) {
    const desc = issue.description || '';

    // Check if DoD is present
    if (!desc.includes('## Definition of Done')) {
      console.log(`   ⏭️  ${issue.identifier} — no DoD found, skipping`);
      skipped++;
      continue;
    }

    // Find the DoD section and the --- separator before it
    // Pattern: look for "\n---\n\n## Definition of Done" and remove everything from there
    const dodMarker = '## Definition of Done';
    const dodIndex = desc.indexOf(dodMarker);

    if (dodIndex === -1) {
      console.log(`   ⏭️  ${issue.identifier} — DoD marker not found`);
      skipped++;
      continue;
    }

    // Find the --- separator that precedes the DoD heading
    // Search backwards from dodIndex for "---"
    const beforeDod = desc.substring(0, dodIndex);
    const lastSepIndex = beforeDod.lastIndexOf('---');

    let cutPoint;
    if (lastSepIndex !== -1 && dodIndex - lastSepIndex < 10) {
      // The --- is close to the DoD heading (within ~10 chars, accounting for newlines)
      // Cut from the --- separator
      cutPoint = lastSepIndex;
    } else {
      // No nearby separator, cut from the DoD heading itself
      cutPoint = dodIndex;
    }

    // Also remove any trailing newlines before the cut point
    let cleanedEnd = cutPoint;
    while (cleanedEnd > 0 && desc[cleanedEnd - 1] === '\n') {
      cleanedEnd--;
    }

    const preservedContent = desc.substring(0, cleanedEnd);
    const newDesc = preservedContent + DOD_REFERENCE;

    // Safety check: make sure we didn't accidentally nuke the description
    const originalLines = desc.split('\n').length;
    const newLines = newDesc.split('\n').length;
    const removedLines = originalLines - newLines;

    if (preservedContent.length < 200) {
      console.log(`   ⚠️  ${issue.identifier} — preserved content too short (${preservedContent.length} chars), SKIPPING for safety`);
      skipped++;
      continue;
    }

    // Verify key sections are still present
    const hasGoal = newDesc.includes('## Goal');
    const hasPR = newDesc.includes('## PR');
    if (!hasGoal || !hasPR) {
      console.log(`   ⚠️  ${issue.identifier} — missing Goal or PR section after trim, SKIPPING for safety`);
      skipped++;
      continue;
    }

    // Update
    await gql(`
      mutation($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) { success }
      }
    `, { id: issue.id, input: { description: newDesc } });

    updated++;
    const shortTitle = (issue.title.split('] ')[1] || issue.title).slice(0, 55);
    console.log(`   ✅ ${issue.identifier} — ${shortTitle} (removed ${removedLines} lines)`);
    await delay(400);
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log(`🎉 Done! ${updated} issues updated, ${skipped} skipped`);
  console.log(`\n📄 DoD now lives in: ICE_ENGINEERING.md (section 3)`);
  console.log(`📎 Each task has a one-line reference pointing there`);
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
