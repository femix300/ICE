#!/usr/bin/env node
/**
 * ICE — Switch all Linear tasks from JavaScript to TypeScript
 * Updates file extensions, code block hints, and adds TS setup to P01.
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

// ─── TypeScript Replacements ────────────────────────────────────
function applyTsReplacements(desc) {
  // 1. Code block language hints: ```js → ```ts
  desc = desc.replace(/```js\b/g, '```ts');

  // 2. File paths starting with known directories (src/, tests/, dashboard/)
  desc = desc.replace(/((?:src|tests|dashboard)\/[\w\-\/\.]+)\.js\b/g, '$1.ts');
  desc = desc.replace(/((?:src|tests|dashboard)\/[\w\-\/\.]+)\.jsx\b/g, '$1.tsx');

  // 3. Standalone file names in backtick inline code
  desc = desc.replace(/\.js`/g, '.ts`');
  desc = desc.replace(/\.jsx`/g, '.tsx`');

  // 4. Import paths in code (before quote)
  desc = desc.replace(/\.js'/g, ".ts'");
  desc = desc.replace(/\.js"/g, '.ts"');

  // 5. Restore false positives
  desc = desc.replace(/\.tson/g, '.json');
  desc = desc.replace(/Node\.ts/g, 'Node.js');
  desc = desc.replace(/Next\.ts/g, 'Next.js');

  return desc;
}

// ─── P01 TypeScript Additions ───────────────────────────────────
function addP01TypeScript(desc) {
  const tsSection = [
    '',
    '---',
    '',
    '### TypeScript Setup',
    '',
    'This project uses **TypeScript** with **tsx** for zero-config dev execution.',
    '',
    '#### Additional Files',
    '- `tsconfig.json` — strict mode, ES2022 target, Node16 module resolution',
    '- `src/types/index.ts` — shared type definitions',
    '',
    '#### tsconfig.json',
    '```json',
    '{',
    '  "compilerOptions": {',
    '    "target": "ES2022",',
    '    "module": "Node16",',
    '    "moduleResolution": "Node16",',
    '    "strict": true,',
    '    "esModuleInterop": true,',
    '    "outDir": "dist",',
    '    "rootDir": "src",',
    '    "skipLibCheck": true,',
    '    "forceConsistentCasingInFileNames": true,',
    '    "resolveJsonModule": true',
    '  },',
    '  "include": ["src/**/*"],',
    '  "exclude": ["node_modules", "dist"]',
    '}',
    '```',
    '',
    '#### Dev Runner',
    '```bash',
    '# Install tsx (TypeScript Execute) — fast, zero-config',
    'npm install -D tsx typescript @types/node',
    '',
    '# package.json scripts:',
    '#   "dev": "tsx watch src/server.ts"',
    '#   "start": "tsx src/server.ts"',
    '#   "build": "tsc"',
    '```',
    '',
    '#### Type Patterns for the Team',
    '- Use `z.infer<typeof schema>` to derive types from Zod schemas — never write types twice',
    '- Define shared interfaces in `src/types/index.ts`',
    '- All factory functions (`createXService(deps)`) should have explicit parameter + return types',
    '- Use `as const` for the invoice state machine transitions',
  ].join('\n');

  return desc + tsSection;
}

// ─── Main ───────────────────────────────────────────────────────
async function main() {
  console.log('🧊 ICE — Switching all tasks to TypeScript');
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

  console.log(`Found ${issues.length} issues to update\n`);

  let updated = 0;
  let changes = { files: 0, codeBlocks: 0 };

  for (const issue of issues) {
    const original = issue.description || '';
    let desc = applyTsReplacements(original);

    // Count changes
    const fileChanges = (original.match(/\.js[`'"]/g) || []).length + (original.match(/\.jsx[`'"]/g) || []).length;
    const codeBlockChanges = (original.match(/```js\b/g) || []).length;

    // P01 gets extra TypeScript setup section
    if (issue.title.includes('P01')) {
      desc = addP01TypeScript(desc);
    }

    // Only update if something changed
    if (desc !== original) {
      await gql(`
        mutation($id: String!, $input: IssueUpdateInput!) {
          issueUpdate(id: $id, input: $input) { success }
        }
      `, { id: issue.id, input: { description: desc } });

      updated++;
      changes.files += fileChanges;
      changes.codeBlocks += codeBlockChanges;
      console.log(`   ✅ ${issue.identifier} — ${issue.title.split('] ')[1]?.slice(0, 50) || issue.title.slice(0, 50)}`);
      await delay(400);
    } else {
      console.log(`   ⏭️  ${issue.identifier} — no changes needed`);
    }
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log(`🎉 Done! ${updated}/${issues.length} issues updated to TypeScript`);
  console.log(`   📁 ~${changes.files} file extensions changed (.js → .ts, .jsx → .tsx)`);
  console.log(`   📝 ~${changes.codeBlocks} code blocks changed (js → ts)`);
  console.log('\n🔗 Open Linear: https://linear.app');
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
