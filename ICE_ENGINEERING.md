# ICE — Engineering Guide

> **Companion to:** [ICE_PRD.md](./ICE_PRD.md)
> **Last Updated:** June 29, 2026

This document covers the operational standards every developer and AI agent must follow when building ICE. The PRD covers _what_ to build; this covers _how_ to build it.

---


## 1. Git Workflow

### 1.1 Branching

Trunk-based development with short-lived feature branches, utilizing a dual-branch structure during the hackathon.

```
main                 production-ready, always green
├── dev              active integration branch (acts as 'main' during dev)
    ├── feat/<scope> one branch per feature (e.g. feat/scaffold)
    ├── fix/<scope>  bug fix
    └── chore/<scope> tooling, deps, docs
```

**Workflow:**
- All feature branches branch off `dev`.
- All feature PRs merge into `dev`.
- At the end of the day, if `dev` is stable and tested, it is merged into `main`.
- Branches live no more than a few days. Rebase on `dev` daily if open longer.

### 1.2 Commits

Conventional Commits format. Imperative mood. Explain the _why_, not the _what_.

```
feat(merchants): add vendor onboarding endpoint
fix(reconciliation): handle duplicate transactionId correctly
chore(deps): add bullmq and ioredis
docs(api): document webhook payload format
test(invoices): add state machine transition tests
refactor(auth): extract key verification into shared module
```

| Type | When to Use |
|------|-------------|
| `feat` | New endpoint, new feature, new business logic |
| `fix` | Bug fix in existing behaviour |
| `chore` | Dependency updates, config changes, tooling |
| `docs` | README, API docs, code comments |
| `test` | Adding or updating tests |
| `refactor` | Code restructure with no behaviour change |

### 1.3 No AI Co-Author Trailers

Never add `Co-Authored-By: Claude ...`, `Co-Authored-By: GitHub Copilot ...`, or any other AI assistant as a co-author on a commit, PR description, or squash-merge message.

The author is the human who decided to land the change and is accountable for it. AI assistance is a tool, not a contributor. Strip the trailer your tool may have inserted before you commit.

### 1.4 Pull Requests

A PR must follow this exact template and structure:

1. **Summary:** A clear explanation of what the PR accomplishes and what it changes.
2. **Closes:** Link directly to the Linear issue when applicable (e.g., `Closes ICE-101`); otherwise `Closes: N/A`.
3. **Scope:** Confirm no feature drift, list any new environment variables, and highlight deliberate architectural choices or structure notes.
4. **Test Plan:** List what was tested/verified; if not applicable (e.g., docs-only), state why, and note lint/typecheck/tests status as applicable.
5. **Risk:** Assess the risk level (Low/Medium/High) and point the reviewer to the most critical parts of the code.

Additionally:
- A short title in the same style as a commit message.
- All checks passing locally: `npm run typecheck && npm run lint && npm test`.
- Self-review against the [Definition of Done](#3-definition-of-done) checklist.
- **Peter's review and approval** before merging.
- **Auto-Review:** You MUST leave a follow-up comment on your PR tagging `@copilot` to trigger an automated AI code review immediately after opening it.

Squash-merge into `main`. The squash message becomes the commit on trunk — edit it to read well.

### 1.5 Branch Protection

- Never push directly to `main`
- Never force-push `main`
- All changes via PR

---

## 2. Coding Standards

### 2.1 TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true` — already set in `tsconfig.json`. Don't relax.
- ESM only (`"type": "module"`)
- **Never use `any`**. Use `unknown` and narrow. If you genuinely need `any`, add a one-line comment explaining why.
- **No non-null assertions (`!`)** on values that came from outside the process. Parse with Zod and trust the parsed type.
- Prefer `type` aliases over `interface` unless you need declaration merging.
- Use `as const` and union helpers for enums; do not export TypeScript `enum`s:

```ts
export const InvoiceStatus = {
  DRAFT: 'draft',
  ISSUED: 'issued',
  PARTIALLY_PAID: 'partially_paid',
  PAID: 'paid',
  OVERPAID: 'overpaid',
  REFUNDED: 'refunded',
} as const;

export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];
```

- Use `z.infer<typeof schema>` to derive types from Zod schemas — never write the type separately.

### 2.2 File and Module Layout

- One concept per file
- Filenames are **kebab-case**: `merchants.service.ts`, `api-key.ts`, `webhook-delivery.worker.ts`
- Exported symbols: PascalCase for types, `createX` for factories
- Tests live under `tests/unit/` and `tests/integration/`

### 2.3 Naming Conventions

| Layer | Pattern | Example Methods |
|-------|---------|-----------------|
| Repositories | `createXRepo` | `byId`, `bySlug`, `listAll`, `create`, `update` |
| Services | `createXService` | `register`, `reconcile`, `processRefund` |
| Controllers | `createXController` | `create`, `list`, `getById`, `update`, `remove` |
| Zod Schemas | Descriptive names | `createMerchantBody`, `updateVendorBody`, `invoiceListQuery`, `idParam` |

### 2.4 Comments

Default to **no comments**. Names and types are the documentation.

Comment only when:
- The _why_ is non-obvious (a hidden constraint, an external bug, a workaround)
- The code looks wrong at a glance but is correct
- A regex, bit fiddle, or algorithm is dense enough that the next reader needs a hand

Do not comment what the code already says. Do not reference issue numbers or PRs — that's what git history is for.

### 2.5 Imports

- Sort by source: node built-ins → third-party → internal → relative
- Use named imports
- Type-only imports use `import type { ... }`

```ts
import crypto from 'node:crypto';

import { Queue } from 'bullmq';
import { z } from 'zod';

import type { NombaClient } from '../lib/nomba.ts';
import { createLogger } from '../lib/logger.ts';
import { AppError } from '../lib/errors.ts';
```

### 2.6 Errors

- Throw `AppError(code, message)` from services and controllers. The error middleware maps it to the correct HTTP status and response envelope.
- Never `try { ... } catch {}` to silence an error. If you genuinely want to ignore a failure, add a one-line comment explaining why and log it.

### 2.7 Logging

Use the pino logger created from `createLogger(serviceName)`:

```ts
import { createLogger } from '../lib/logger.ts';

const log = createLogger('reconciliation');

// First arg is fields object, second is message string
log.info({ transactionId, status: 'EXACT_MATCH' }, 'invoice reconciled');
log.error({ err, transactionId }, 'reconciliation failed');
```

**Rules:**
- Never use `console.log` — always use `createLogger`
- First argument is always a fields object, second is the message string
- Never interpolate values into the message string
- Never log sensitive fields (passwords, tokens, API keys, full request bodies)

### 2.8 Environment Access

- Read env exclusively through `config.ts` (validated by Zod at startup)
- No direct `process.env.*` access anywhere else in the codebase
- New env vars must be added to `.env.example`

### 2.9 Formatting

Prettier owns formatting. Run `npm run format` before pushing. Don't argue with the formatter — if you don't like the output, change the rule, not the file.

### 2.10 No Emojis

Never use emojis in the codebase, commit messages, documentation, or anywhere in the repository. Stick strictly to plain text and ASCII characters.

### 2.11 Frontend Security Standards

- Enforce native auto-escaping for React/Next.js.
- Strictly prohibit `dangerouslySetInnerHTML` unless explicitly approved and sanitized via `DOMPurify`.
- Mandate that authentication tokens (like JWTs or Session IDs) must be stored in `HttpOnly`, `Secure`, `SameSite=Lax` or `SameSite=Strict` cookies, and **never** in `localStorage` or `sessionStorage`.

### 2.12 Dependency Security

- Mandate that all new npm packages must be vetted/scanned for vulnerabilities before being added to `package.json` (e.g. `npm audit`, OSV Scanner, and/or reviewing GitHub Dependabot alerts).

---

## 3. Definition of Done

Before opening a PR, the developer (or their AI agent) must verify **ALL** of the following. Then request **Peter's review and approval** — PRs require two-layer verification before merging.

### 3.1 Task Completeness

- [ ] All endpoints / features described in the Linear task are implemented
- [ ] All files listed in the task's "Files" section have been created or modified
- [ ] Implementation matches the code patterns shown in the task description

### 3.2 Type Safety

- [ ] No `any` types — use `unknown` and narrow, or define proper types
- [ ] No non-null assertions (`!`) on external data — parse with Zod instead
- [ ] `z.infer<typeof schema>` used to derive types from Zod schemas — never write types twice
- [ ] `as const` used for enum-like objects (invoice states, roles, error codes)
- [ ] Array/object index access handles `undefined` (`noUncheckedIndexedAccess` is enabled)

### 3.3 Tests

- [ ] Unit tests written in `tests/unit/<name>.test.ts`
- [ ] Integration tests (if applicable) written in `tests/integration/<name>.test.ts`
- [ ] All tests pass: `npm test`
- [ ] TypeScript compiles cleanly: `npm run typecheck`
- [ ] Linting passes: `npm run lint`

### 3.4 Coding Standards

- [ ] Filenames are kebab-case (`merchants.service.ts`, not `MerchantsService.ts`)
- [ ] Factory pattern: `createXRepo`, `createXService`, `createXController`
- [ ] Zod schemas named: `createXBody`, `updateXBody`, `xListQuery`, `idParam`
- [ ] Errors thrown as `AppError(code, message)` — never raw `throw new Error()`
- [ ] Logging uses `createLogger(serviceName)` (pino) — never `console.log`
- [ ] No comments unless explaining a non-obvious _why_
- [ ] Imports sorted: node built-ins → third-party → internal → relative
- [ ] `import type` used for type-only imports
- [ ] No `process.env` access outside `config.ts`
- [ ] No silenced errors (`catch {}`) without a comment explaining why
- [ ] No emojis anywhere (code, comments, documentation, commit messages)
- [ ] Prettier formatting applied (run `npm run format`)

### 3.5 Git & PR

- [ ] Branch named: `feat/<scope>`, `fix/<scope>`, or `chore/<scope>`
- [ ] Commit message: `feat(scope): imperative description` (Conventional Commits)
- [ ] Commit explains the _why_, not the _what_ — the diff shows the what
- [ ] **No `Co-Authored-By` trailers for AI assistants** (strip before committing)
- [ ] PR title matches commit message format
- [ ] PR description includes: problem statement, approach taken, any trade-offs
- [ ] PR includes a `## Test Plan` section listing what was verified
- [ ] Squash-merge into `main` — one clean commit per task

### 3.6 Integration Safety

- [ ] Pulled latest `dev` and rebased your branch on `dev` — no merge conflicts
- [ ] Existing tests still pass after rebase: `npm test`
- [ ] App starts without errors: `npm run dev`
- [ ] `/healthz` still returns 200 (if app is bootable at this stage)
- [ ] No regressions in previously working features
- [ ] PR targets `dev` (not `main`) during active development

### 3.7 Security

- [ ] No hardcoded secrets, API keys, or tokens in source code
- [ ] All secrets read from environment variables via `config.ts`
- [ ] `.env` is in `.gitignore` — only `.env.example` is committed
- [ ] API key hashing uses bcrypt (never plaintext storage)
- [ ] Webhook verification uses `crypto.timingSafeEqual` (never `===`)
- [ ] No sensitive data logged (passwords, tokens, full request bodies)
- [ ] New env vars added to `.env.example`
- [ ] **Frontend**: Native escaping used, no `dangerouslySetInnerHTML` bypasses, tokens stored in secure cookies (not `localStorage`).
- [ ] **Dependencies**: No new packages added without explicit vulnerability scanning.

### 3.8 Handoff

- [ ] Updated your personal handoff file in your **local scratch directory** (e.g., `handoffs/` folder inside your `.gemini/antigravity-ide/brain/<chat-id>/scratch/` directory) with: what was built, files changed, decisions made.
- [ ] If you are working on the main documentation, append your updates to the master `HANDOFF.md` in the shared local scratch directory.
- [ ] **NEVER** push any `handoffs/` files or `HANDOFF.md` to GitHub. They must remain strictly in local scratch directories to prevent repo clutter.
- [ ] If any task requirements changed during implementation, noted in your personal handoff file.

> **Review flow:** Self-review with this checklist → Open PR → Request Peter's review → Merge after approval.

---

## 4. Task Breakdown

All 37 tasks are tracked in Linear under the ICE project. Each task has a unique ID, assignee, dependencies, and the full DoD checklist.

### 4.1 Task Assignment

| Dev | Task Series | Linear Issues | Count |
|-----|-------------|---------------|-------|
| **Peter Ajimoti** (Lead) | P01–P10 | ICE-166 to ICE-175 | 10 |
| **Marvelous** (Payments) | M01–M08 | ICE-176 to ICE-183 | 8 |
| **Emmanuel** (Async) | E01–E09 | ICE-184 to ICE-191, ICE-202 | 9 |
| **Samkiel** (Frontend) | S01–S10 | ICE-192 to ICE-201 | 10 |

### 4.2 Day 1 Parallelism

All 4 devs start Day 1 independently — nobody waits:

| Dev | Day 1 Task | Dependencies |
|-----|-----------|--------------|
| Peter | P01 — Express scaffold | None |
| Marvelous | M01 — DB schema (prepares SQL, merges after P01) | P01 |
| Emmanuel | E01 — Redis + BullMQ setup | None |
| Samkiel | S01 — Next.js scaffold | None |

### 4.3 Phase Timeline

| Phase | Milestone | Tasks |
|-------|-----------|-------|
| **Phase 1 — Foundation** (Day 1) | Scaffold, DB, Redis, Auth | P01, M01, E01, S01 |
| **Phase 2 — Core Entities** (Day 2-3) | Merchants, Vendors, Customers | P02–P08, S02, S03 |
| **Phase 3 — Payments Core** (Day 3-4) | Webhooks, Reconciliation, Invoices | M02–M05, E02, E03, S04–S06 |
| **Phase 4 — Extended** (Day 5-6) | Misdirected, Refunds, Statements | M06–M08, E04–E09, S07–S10 |
| **Phase 5 — Polish & Demo** (Day 6-7) | Swagger, Deploy, E2E Test | P09, P10 |

### 4.4 Dependency Map

```
Day 1 (Foundation — all parallel):
  P01 ─────────────────────────────────────┐
  M01 (needs P01) ─────────────────────────┤
  E01 (independent) ───────────────────────┤
  S01 (independent) ───────────────────────┘

Day 2-3 (Entities + Auth):
  P01 → P02 → P03 → P04 → P05 → P06 → P07
  P01 → P08 (Nomba client, parallel with P02-P04)
  M01 → M02 (webhook receiver)
  P05 → M03 (invoices need vendors)
  S01 → S02 → S03

Day 3-4 (Payments Core):
  M02 + M03 → M04 (reconciliation exact match)
  M04 → M05 (overpayment/underpayment)
  E01 + P04 → E02 (webhook delivery)
  E02 → E03 (dead-letter)
  S03 + M08 → S04 (reconciliation feed)

Day 5-6 (Extended):
  M02 + E02 → M06 (misdirected detection)
  M06 → M07 → M08 (misdirected actions + audit)
  E01 + M05 → E04 (auto-refund engine)
  M08 → E05, E06 (statements, summary)
  E06 → E09 (nightly reconciliation diff)
  S04 → S05, S06, S07, S08, S09, S10

Day 6-7 (Polish):
  P06 + M08 → P09 (Swagger + health check)
  P09 → P10 (deployment + E2E)
```

---

## 5. Nomba Developer Cheat Sheet (Certification Golden Rules)

To ensure our integration meets the standard required by the hackathon judges (matching the Nomba Certification), strictly follow these rules:

### Core Environment
- **Sandbox Base URL:** `https://sandbox.api.nomba.com/v1` (Use this for all hackathon work)
- **Production Base URL:** `https://api.nomba.com/v1` (Do not use until post-hackathon KYC)
- **Secrets Management:** `clientSecret` and webhook secrets must **never** be committed to source code. Always load from environment variables (e.g., `process.env.NOMBA_CLIENT_SECRET`).

### Test Instruments
- **Test Card (Success):** `5060 6666 6666 6666 666` (Any future expiry, any CVV)
- **Test Card (Insufficient Funds):** `5060 6666 6666 6666 674`
- **Test Bank (Virtual Account Inbound):** Wema Bank, account `0000000000` (Use this to simulate inbound transfers to Virtual Accounts for webhook testing)

### The 4 Golden Rules
1. **Always use Kobo:** All monetary amounts MUST be sent and stored in Kobo (e.g., ₦1,500 = `150000`). Never use floats or decimals.
2. **The 55-Minute Token Cache:** Do **not** request a new token per API call. Server-to-server OAuth `client_credentials` tokens last 60 minutes. Cache them in memory/Redis and refresh automatically [...]
3. **Webhook Verification & Idempotency:** Webhook signatures MUST be verified using HMAC-SHA256 (`nomba-signature` header). Furthermore, Nomba may send the same event twice; you must use `event.reque[...]
4. **Always Lookup Before Transfers:** Never blindly hit `/transfers/bank`. You MUST call `/transfers/bank/lookup` to verify the recipient `accountName` first to prevent irreversible loss.

---

_ICE Engineering Guide — v1.0 | June 29, 2026_
