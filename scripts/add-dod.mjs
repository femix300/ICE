#!/usr/bin/env node
/**
 * ICE — Append Definition of Done to all 36 Linear issues
 * Also updates P01 with: noUncheckedIndexedAccess, Prettier, ESLint, pino logger
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

// ─── Definition of Done ─────────────────────────────────────────
const DOD = [
  '',
  '---',
  '',
  '## Definition of Done',
  '',
  'Before opening a PR, the developer (or their AI agent) must verify **ALL** of the following.',
  'Then request **Peter\'s review and approval** — PRs require two-layer verification before merging.',
  '',
  '### 1. Task Completeness',
  '- [ ] All endpoints / features described in this task are implemented',
  '- [ ] All files listed in the "Files" section have been created or modified',
  '- [ ] Implementation matches the code patterns shown in this task description',
  '',
  '### 2. Type Safety',
  '- [ ] No `any` types — use `unknown` and narrow, or define proper types',
  '- [ ] No non-null assertions (`!`) on external data — parse with Zod instead',
  '- [ ] `z.infer<typeof schema>` used to derive types from Zod schemas — never write types twice',
  '- [ ] `as const` used for enum-like objects (invoice states, roles, error codes)',
  '- [ ] Array/object index access handles `undefined` (`noUncheckedIndexedAccess` is enabled)',
  '',
  '### 3. Tests',
  '- [ ] Unit tests written in `tests/unit/<name>.test.ts`',
  '- [ ] Integration tests (if applicable) written in `tests/integration/<name>.test.ts`',
  '- [ ] All tests pass: `npm test`',
  '- [ ] TypeScript compiles cleanly: `npm run typecheck`',
  '- [ ] Linting passes: `npm run lint`',
  '',
  '### 4. Coding Standards',
  '- [ ] Filenames are kebab-case (`merchants.service.ts`, not `MerchantsService.ts`)',
  '- [ ] Factory pattern: `createXRepo`, `createXService`, `createXController`',
  '- [ ] Zod schemas named: `createXBody`, `updateXBody`, `xListQuery`, `idParam`',
  '- [ ] Errors thrown as `AppError(code, message)` — never raw `throw new Error()`',
  '- [ ] Logging uses `createLogger(serviceName)` (pino) — never `console.log`',
  '- [ ] No comments unless explaining a non-obvious *why*',
  '- [ ] Imports sorted: node built-ins → third-party → internal → relative',
  '- [ ] `import type` used for type-only imports',
  '- [ ] No `process.env` access outside `config.ts`',
  '- [ ] No silenced errors (`catch {}`) without a comment explaining why',
  '- [ ] Prettier formatting applied (run `npm run format`)',
  '',
  '### 5. Git & PR',
  '- [ ] Branch named: `feat/<scope>`, `fix/<scope>`, or `chore/<scope>`',
  '- [ ] Commit message: `feat(scope): imperative description` (Conventional Commits)',
  '- [ ] Commit explains the *why*, not the *what* — the diff shows the what',
  '- [ ] **No `Co-Authored-By` trailers for AI assistants** (strip before committing)',
  '- [ ] PR title matches commit message format',
  '- [ ] PR description includes: problem statement, approach taken, any trade-offs',
  '- [ ] PR includes a `## Test Plan` section listing what was verified',
  '- [ ] Squash-merge into `main` — one clean commit per task',
  '',
  '### 6. Integration Safety',
  '- [ ] Pulled latest `main` and rebased — no merge conflicts',
  '- [ ] Existing tests still pass after rebase: `npm test`',
  '- [ ] App starts without errors: `npm run dev`',
  '- [ ] `/healthz` still returns 200 (if app is bootable at this stage)',
  '- [ ] No regressions in previously working features',
  '',
  '### 7. Security',
  '- [ ] No hardcoded secrets, API keys, or tokens in source code',
  '- [ ] All secrets read from environment variables via `config.ts`',
  '- [ ] `.env` is in `.gitignore` — only `.env.example` is committed',
  '- [ ] API key hashing uses bcrypt (never plaintext storage)',
  '- [ ] Webhook verification uses `crypto.timingSafeEqual` (never `===`)',
  '- [ ] No sensitive data logged (passwords, tokens, full request bodies)',
  '- [ ] New env vars added to `.env.example`',
  '',
  '### 8. Handoff',
  '- [ ] Updated `HANDOFF.md` with: what was built, files changed, decisions made',
  '- [ ] If any task requirements changed during implementation, noted in HANDOFF.md',
  '',
  '> **Review flow:** Self-review with this checklist → Open PR → Request Peter\'s review → Merge after approval.',
].join('\n');

// ─── P01 Additions (Prettier + ESLint + pino + noUncheckedIndexedAccess) ───
const P01_ADDITIONS = [
  '',
  '---',
  '',
  '### Tooling Setup (Prettier + ESLint + pino)',
  '',
  'P01 must set up these tools so every subsequent task benefits:',
  '',
  '#### Prettier (zero-config formatting)',
  '```bash',
  'npm install -D prettier',
  '```',
  '',
  '```json',
  '// .prettierrc',
  '{',
  '  "semi": true,',
  '  "singleQuote": true,',
  '  "trailingComma": "all",',
  '  "printWidth": 100',
  '}',
  '```',
  '',
  '#### ESLint (basic TypeScript rules)',
  '```bash',
  'npm install -D eslint @eslint/js typescript-eslint',
  '```',
  '',
  '#### pino (structured logger)',
  '```bash',
  'npm install pino',
  'npm install -D pino-pretty  # dev-only pretty printing',
  '```',
  '',
  '```ts',
  '// src/lib/logger.ts',
  "import pino from 'pino';",
  "import { env } from '../config.ts';",
  '',
  'export const createLogger = (name: string) =>',
  '  pino({',
  "    name,",
  "    level: env.LOG_LEVEL || 'info',",
  "    transport: env.NODE_ENV === 'development'",
  "      ? { target: 'pino-pretty', options: { colorize: true } }",
  '      : undefined,',
  '  });',
  '```',
  '',
  'Usage in services:',
  '```ts',
  "const log = createLogger('reconciliation');",
  "log.info({ transactionId, status: 'EXACT_MATCH' }, 'invoice reconciled');",
  "log.error({ err, transactionId }, 'reconciliation failed');",
  '```',
  '',
  '> **Rule:** First argument is always a fields object, second is the message string.',
  '> Never interpolate values into the message. Never log sensitive fields (tokens, passwords).',
  '',
  '#### Updated tsconfig.json',
  '```json',
  '{',
  '  "compilerOptions": {',
  '    "target": "ES2022",',
  '    "module": "Node16",',
  '    "moduleResolution": "Node16",',
  '    "strict": true,',
  '    "noUncheckedIndexedAccess": true,',
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
  '#### package.json scripts',
  '```json',
  '{',
  '  "scripts": {',
  '    "dev": "tsx watch src/server.ts",',
  '    "start": "tsx src/server.ts",',
  '    "build": "tsc",',
  '    "test": "vitest run",',
  '    "test:watch": "vitest",',
  '    "typecheck": "tsc --noEmit",',
  '    "lint": "eslint src/",',
  '    "format": "prettier --write src/ tests/",',
  '    "format:check": "prettier --check src/ tests/"',
  '  }',
  '}',
  '```',
].join('\n');


// ─── Main ───────────────────────────────────────────────────────
async function main() {
  console.log('🧊 ICE — Appending Definition of Done to all tasks');
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
  let skipped = 0;

  for (const issue of issues) {
    let desc = issue.description || '';

    // Skip if DoD already added
    if (desc.includes('## Definition of Done')) {
      console.log(`   ⏭️  ${issue.identifier} — DoD already present`);
      skipped++;
      continue;
    }

    // Add P01-specific tooling section before DoD
    if (issue.title.includes('P01')) {
      desc += P01_ADDITIONS;
      console.log(`   🔧 ${issue.identifier} — Added Prettier/ESLint/pino/tsconfig additions`);
    }

    // Append DoD
    desc += DOD;

    await gql(`
      mutation($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) { success }
      }
    `, { id: issue.id, input: { description: desc } });

    updated++;
    const shortTitle = (issue.title.split('] ')[1] || issue.title).slice(0, 55);
    console.log(`   ✅ ${issue.identifier} — ${shortTitle}`);
    await delay(400);
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log(`🎉 Done! ${updated} issues updated, ${skipped} skipped (already had DoD)`);
  console.log('\n📋 DoD includes:');
  console.log('   1. Task completeness check');
  console.log('   2. Type safety (no any, Zod, as const, noUncheckedIndexedAccess)');
  console.log('   3. Tests (unit + integration, npm test, typecheck, lint)');
  console.log('   4. Coding standards (kebab-case, factory pattern, pino logger)');
  console.log('   5. Git & PR (conventional commits, no AI trailers, squash-merge)');
  console.log('   6. Integration safety (rebase, no conflicts, app boots)');
  console.log('   7. Security (no hardcoded secrets, bcrypt, timingSafeEqual)');
  console.log('   8. Handoff (HANDOFF.md updated)');
  console.log('\n🔒 Review flow: Self-review → PR → Peter approves → Merge');
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
