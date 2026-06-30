#!/usr/bin/env node
/**
 * ICE — Nomba Hackathon: Linear Tasks Rebuild
 * Deletes 24 old issues, creates 36 new issues with correct formatting + full PRD coverage.
 */

const API_KEY = "lin_api_FEzO08T6B8exsBs618DoskFIChEsHqBNX9ITInxE";
const ENDPOINT = "https://api.linear.app/graphql";
const TEAM_ID = "7b8e307b-5c79-4471-b8c1-30921c873672";
const TODO_STATE_ID = "0d3e4f4f-d6bb-4533-a908-adc0c9fac10d";
const PETER_ID = "6323f822-1a36-43d8-b624-5b2c5fd54653";
const PROJECT_ID = "7943eafe-1ede-4d6c-b73f-3df82b8f27a0";

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
      if (json.errors) {
        console.error("GQL Error:", JSON.stringify(json.errors, null, 2));
        throw new Error(json.errors[0].message);
      }
      return json.data;
    } catch (err) {
      if (attempt === retries) throw err;
      const wait = attempt * 2000;
      console.log(`   ⏳ Retry ${attempt}/${retries} in ${wait/1000}s... (${err.message})`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Description Builder ────────────────────────────────────────
export function buildDesc(t) {
  const L = [];
  L.push('> **Order:** ' + t.order);
  L.push('> **Plan ID:** ' + t.planId + ' | **Assignee:** ' + t.assignee + ' | **Estimate:** ' + t.est);
  L.push('> **Depends on:** ' + (t.deps || 'Nothing — this is a root task'));
  L.push('> **Blocks:** ' + (t.blocks || 'Nothing downstream'));
  L.push('', '## Goal', t.goal, '');
  if (t.createFiles && t.createFiles.length) {
    L.push('## Files', '', '### Create');
    t.createFiles.forEach(f => L.push('- `' + f + '`'));
  }
  if (t.editFiles && t.editFiles.length) {
    if (!t.createFiles || !t.createFiles.length) L.push('## Files');
    L.push('', '### Edit');
    t.editFiles.forEach(f => L.push('- `' + f + '`'));
  }
  if (t.impl && t.impl.length) { L.push('', '## Implementation', ''); t.impl.forEach(l => L.push(l)); }
  if (t.tests && t.tests.length) { L.push('', '## Tests'); t.tests.forEach(x => L.push('- [ ] ' + x)); }
  if (t.acceptance && t.acceptance.length) { L.push('', '## Acceptance Criteria'); t.acceptance.forEach(x => L.push('- [ ] ' + x)); }
  L.push('', '## PR', '- **Branch:** `' + t.branch + '`', '- **Commit:** `' + t.commit + '`');
  return L.join('\n');
}

// ─── Task Definitions ───────────────────────────────────────────
export function defineTasks(labelIds, milestoneIds) {
  const ph1 = milestoneIds['Phase 1 — Foundation (Day 1)'];
  const ph2 = milestoneIds['Phase 2 — Core Entities (Day 2)'];
  const ph3 = milestoneIds['Phase 3 — Payments Core (Day 3-4)'];
  const ph4 = milestoneIds['Phase 4 — Extended Features (Day 5)'];
  const ph5 = milestoneIds['Phase 5 — Polish & Demo (Day 6-7)'];
  const lb = labelIds;

  return [
    // ═══════════════════════════════════════════════════════════
    // PETER — Backend Lead (P01–P10)
    // ═══════════════════════════════════════════════════════════
    {
      key: 'P01',
      title: 'P01. [ICE-101] Project scaffold + Express app + middleware wiring',
      assigneeId: PETER_ID, estimate: 1, milestone: ph1,
      labels: [lb.backend, lb['phase-1-foundation']],
      dependsOnKeys: [],
      description: buildDesc({
        order: 'P01 (Peter, task 1 of 10)', planId: 'ICE-101', assignee: 'Peter Ajimoti', est: '0.5 day',
        deps: 'Nothing — this is the root task', blocks: 'All other backend tasks',
        goal: 'Bootstrap the ICE repository with the Express app, all foundational middleware, env config, and the standard response envelope helper. **Nobody writes feature code until this is merged.**',
        createFiles: ['src/app.js', 'src/server.js', 'src/config.js', 'src/lib/respond.js', '.env.example', 'package.json'],
        impl: [
          '```js',
          '// src/lib/respond.js',
          'export const ok = (res, data, status = 200) =>',
          '  res.status(status).json({ ok: true, data, requestId: res.locals.requestId });',
          '',
          'export const created = (res, data) => ok(res, data, 201);',
          'export const noContent = (res) => res.status(204).send();',
          '```',
          '',
          '```js',
          '// src/app.js — middleware order is fixed, do not deviate',
          'app.use(helmet());',
          "app.use(cors({ origin: env.CORS_ORIGIN }));",
          "app.use(express.json({ limit: '1mb' }));",
          'app.use(rateLimit({ windowMs: 60_000, max: 100 }));',
          "app.get('/healthz', (req, res) => res.json({ ok: true }));",
          "app.use('/v1', v1Router);",
          'app.use(notFoundHandler);',
          'app.use(errorHandler);',
          '```',
          '',
          'Config validates all env vars with Zod at startup. Process exits on bad config — never silently.',
        ],
        tests: [
          'GET /healthz returns `{ ok: true }` with status 200',
          'Missing required env var causes process to throw on startup',
          '`ok()` helper returns correct JSON shape with requestId',
        ],
        acceptance: [
          'App boots and /healthz returns 200',
          'All env vars documented in .env.example',
          '`node src/server.js` starts without errors',
        ],
        branch: 'feat/scaffold', commit: 'feat(app): express scaffold, middleware wiring, response envelope',
      }),
    },
    {
      key: 'P02',
      title: 'P02. [ICE-102] Auth middleware — API key hashing, verification, tier scoping',
      assigneeId: PETER_ID, estimate: 1, milestone: ph1,
      labels: [lb.backend, lb['phase-1-foundation']],
      dependsOnKeys: ['P01', 'M01'],
      description: buildDesc({
        order: 'P02 (Peter, task 2 of 10)', planId: 'ICE-102', assignee: 'Peter Ajimoti', est: '0.5 day',
        deps: 'P01 (ICE-101), M01 (ICE-201)', blocks: 'P03, P04, P05 — all authenticated endpoints',
        goal: 'Build the authentication middleware that reads `Authorization: Bearer <key>`, identifies the caller as either a platform owner (master key) or vendor (scoped key), and attaches the resolved principal to `req.principal`. API keys are hashed with bcrypt before storage.',
        createFiles: ['src/middleware/auth.js', 'src/lib/api-key.js', 'tests/unit/auth.test.js'],
        impl: [
          '```js',
          '// src/lib/api-key.js',
          "import crypto from 'crypto';",
          "import bcrypt from 'bcrypt';",
          '',
          "export const generate = () => `ice_${crypto.randomBytes(32).toString('hex')}`;",
          'export const hash = (key) => bcrypt.hash(key, 12);',
          'export const verify = (key, hash) => bcrypt.compare(key, hash);',
          '```',
          '',
          '```js',
          '// src/middleware/auth.js',
          'export function createAuthMiddleware({ merchants, vendors }) {',
          '  return async (req, res, next) => {',
          "    const key = req.headers.authorization?.replace('Bearer ', '');",
          '    if (!key) throw new AppError(401, "MISSING_API_KEY", "No API key provided");',
          '',
          '    // Try merchant (master) key first, then vendor (scoped) key',
          '    const merchant = await merchants.findByKeyPrefix(key.slice(0, 8));',
          '    if (merchant && await verify(key, merchant.api_key_hash)) {',
          "      req.principal = { type: 'merchant', id: merchant.id };",
          '      return next();',
          '    }',
          '    // ... similar for vendor keys',
          '  };',
          '}',
          '```',
        ],
        tests: [
          'Valid merchant key resolves principal with type "merchant"',
          'Valid vendor key resolves principal with type "vendor" and scoped vendor_id',
          'Missing Authorization header returns 401',
          'Invalid key returns 401',
          'Vendor key cannot access other vendor resources (scope enforcement)',
        ],
        acceptance: [
          'Auth middleware attached to all /v1 routes except /webhooks/nomba',
          'API key never stored in plaintext — only bcrypt hash',
          'Vendor scope enforced at middleware level',
        ],
        branch: 'feat/auth-middleware', commit: 'feat(auth): API key hashing, verification, tier scoping',
      }),
    },
    {
      key: 'P03',
      title: 'P03. [ICE-103] Merchant registration + profile endpoint',
      assigneeId: PETER_ID, estimate: 2, milestone: ph2,
      labels: [lb.backend, lb['phase-2-entities']],
      dependsOnKeys: ['P02'],
      description: buildDesc({
        order: 'P03 (Peter, task 3 of 10)', planId: 'ICE-103', assignee: 'Peter Ajimoti', est: '1 day',
        deps: 'P02 (ICE-102)', blocks: 'P04, P05, S02',
        goal: 'Platform owners can register on ICE and receive a master API key. The key is hashed with bcrypt before storage and **never returned again** after the initial response. Also provides the profile fetch endpoint.',
        createFiles: ['src/routes/merchants.routes.js', 'src/controllers/merchants.controller.js', 'src/services/merchants.service.js', 'src/repositories/merchants.repo.js', 'src/schemas/merchants.schema.js', 'tests/unit/merchants.service.test.js'],
        impl: [
          '**Endpoints:**',
          '- `POST /v1/merchants/register` — Register platform owner, returns raw API key once',
          '- `GET /v1/merchants/:id` — Fetch merchant profile and settings',
          '',
          '```js',
          '// POST /v1/merchants/register',
          'const rawKey = generate();',
          'const hashedKey = await hash(rawKey);',
          'await repo.create({ ...data, api_key_hash: hashedKey });',
          'return created(res, { merchant, api_key: rawKey });',
          '// Raw key returned ONCE — never again',
          '```',
          '',
          'Zod validation on all input fields:',
          '```js',
          "import { z } from 'zod';",
          'export const registerMerchantBody = z.object({',
          '  businessName: z.string().min(2).max(100),',
          '  email: z.string().email(),',
          "  webhookUrl: z.string().url().startsWith('https://'),",
          '});',
          '```',
        ],
        tests: [
          'Registering with valid data returns merchant + raw API key',
          'Raw key is not stored in the database (only hash)',
          'Duplicate email returns 409 CONFLICT',
          'Missing required fields returns 422',
          'GET /v1/merchants/:id returns merchant profile without api_key_hash',
        ],
        acceptance: [
          'API key never stored in plaintext',
          'Key returned only on registration response',
          'Zod validation on all input fields',
          'Profile endpoint strips sensitive fields',
        ],
        branch: 'feat/merchant-registration', commit: 'feat(merchants): registration + profile endpoint',
      }),
    },
    {
      key: 'P04',
      title: 'P04. [ICE-104] Merchant webhook URL config + API key rotation',
      assigneeId: PETER_ID, estimate: 1, milestone: ph2,
      labels: [lb.backend, lb['phase-2-entities']],
      dependsOnKeys: ['P03'],
      description: buildDesc({
        order: 'P04 (Peter, task 4 of 10)', planId: 'ICE-104', assignee: 'Peter Ajimoti', est: '0.5 day',
        deps: 'P03 (ICE-103)', blocks: 'E02',
        goal: 'Merchants can configure the webhook URL ICE delivers payment events to (HTTPS only), and rotate their API key when needed. Old key is invalidated immediately on rotation.',
        editFiles: ['src/routes/merchants.routes.js', 'src/controllers/merchants.controller.js', 'src/services/merchants.service.js'],
        impl: [
          '**Endpoints:**',
          '- `PUT /v1/merchants/:id/webhook-url` — Configure webhook URL (HTTPS enforced)',
          '- `POST /v1/merchants/:id/api-keys/rotate` — Rotate API key, old key invalidated immediately',
          '',
          '```js',
          '// PUT /v1/merchants/:id/webhook-url',
          "if (!url.startsWith('https://')) throw new AppError(400, 'INVALID_WEBHOOK_URL', 'Webhook URL must be HTTPS');",
          '',
          '// POST /v1/merchants/:id/api-keys/rotate',
          'const newRawKey = generate();',
          'const newHash = await hash(newRawKey);',
          'await repo.updateApiKey(id, newHash);',
          'return ok(res, { api_key: newRawKey });',
          '```',
        ],
        tests: [
          'HTTP webhook URLs are rejected with clear error',
          'HTTPS webhook URLs are accepted and saved',
          'Key rotation returns new key and invalidates old one',
          'Old key returns 401 after rotation',
        ],
        acceptance: [
          'HTTP webhook URLs rejected with INVALID_WEBHOOK_URL error code',
          'Old API key immediately invalid after rotation',
          'Rotation is audit-logged',
        ],
        branch: 'feat/merchant-config', commit: 'feat(merchants): webhook URL config + API key rotation',
      }),
    },
    {
      key: 'P05',
      title: 'P05. [ICE-105] Vendor onboarding + Nomba DVA provisioning',
      assigneeId: PETER_ID, estimate: 2, milestone: ph2,
      labels: [lb.backend, lb['phase-2-entities']],
      dependsOnKeys: ['P03', 'P08'],
      description: buildDesc({
        order: 'P05 (Peter, task 5 of 10)', planId: 'ICE-105', assignee: 'Peter Ajimoti', est: '1 day',
        deps: 'P03 (ICE-103), P08 (ICE-108)', blocks: 'P06, P07, M03, S03',
        goal: "Platform owners can create vendors under their account. ICE calls Nomba's `POST /v1/accounts/virtual` to provision a dedicated virtual account for each vendor and stores the returned VA number.",
        createFiles: ['src/routes/vendors.routes.js', 'src/controllers/vendors.controller.js', 'src/services/vendors.service.js', 'src/repositories/vendors.repo.js', 'src/schemas/vendors.schema.js', 'tests/unit/vendors.service.test.js'],
        impl: [
          '**Endpoints:**',
          '- `POST /v1/vendors` — Create vendor + provision Nomba DVA',
          '- `GET /v1/vendors/:id` — Fetch vendor profile + DVA details',
          '',
          'Flow:',
          '1. Create vendor record in DB',
          '2. Call `nomba.createVirtualAccount({ accountRef, accountName })` from shared Nomba client (P08)',
          '3. Update vendor with returned VA number and bank name',
          '',
          '> **Key Design Decision (PRD):** ICE intentionally does NOT set Nomba\'s `expectedAmount` on VAs. Nomba\'s exact-match restriction would reject any payment differing by even 1 kobo. ICE handles reconciliation logic in-house.',
        ],
        tests: [
          'Creating a vendor calls Nomba API (mocked) and stores VA number',
          'Nomba API failure returns 502 and does not create vendor record',
          'Duplicate vendor name under same merchant returns 409',
          'accountRef is globally unique (merchant_id + vendor_id composite)',
        ],
        acceptance: [
          'Vendor creation calls Nomba sandbox and stores VA number',
          'Nomba failure handled gracefully — no orphan vendor records',
          'accountRef is globally unique',
        ],
        branch: 'feat/vendor-onboarding', commit: 'feat(vendors): onboarding + Nomba DVA provisioning',
      }),
    },
    {
      key: 'P06',
      title: 'P06. [ICE-106] Vendor management — scoped keys, suspension, listing, update',
      assigneeId: PETER_ID, estimate: 1, milestone: ph2,
      labels: [lb.backend, lb['phase-2-entities']],
      dependsOnKeys: ['P05'],
      description: buildDesc({
        order: 'P06 (Peter, task 6 of 10)', planId: 'ICE-106', assignee: 'Peter Ajimoti', est: '0.5 day',
        deps: 'P05 (ICE-105)', blocks: 'S03',
        goal: 'Generate scoped API keys for vendors (limited to their own data), allow platform owners to suspend/update a vendor\'s VA via Nomba, and list all vendors with pagination.',
        editFiles: ['src/routes/vendors.routes.js', 'src/controllers/vendors.controller.js', 'src/services/vendors.service.js'],
        impl: [
          '**Endpoints:**',
          '- `POST /v1/vendors/:id/api-keys` — Generate scoped vendor API key',
          '- `POST /v1/vendors/:id/account/suspend` — Suspend vendor DVA via Nomba',
          '- `GET /v1/vendors` — List all vendors (paginated, filterable by status)',
          '- `PUT /v1/vendors/:id/account` — Update vendor DVA name or callback URL',
          '',
          'Vendor auth middleware checks scope before allowing access. Master key can access all vendors.',
        ],
        tests: [
          'Vendor API key can only access that vendor\'s data',
          'Master key can access all vendors',
          'Suspension calls Nomba suspend endpoint and updates status',
          'List endpoint returns paginated results with page + pageSize params',
          'PUT /v1/vendors/:id/account updates DVA callback URL',
        ],
        acceptance: [
          'Vendor key scope enforced in auth middleware',
          'Suspension reflected in both Nomba and local DB',
          'List endpoint supports page, pageSize, and status filter',
          'Vendor account update calls Nomba if needed',
        ],
        branch: 'feat/vendor-management', commit: 'feat(vendors): scoped API keys, suspension, listing, update',
      }),
    },
    {
      key: 'P07',
      title: 'P07. [ICE-107] Customer creation + optional DVA provisioning',
      assigneeId: PETER_ID, estimate: 2, milestone: ph3,
      labels: [lb.backend, lb['phase-3-payments']],
      dependsOnKeys: ['P05'],
      description: buildDesc({
        order: 'P07 (Peter, task 7 of 10)', planId: 'ICE-107', assignee: 'Peter Ajimoti', est: '1 day',
        deps: 'P05 (ICE-105)', blocks: 'E05',
        goal: 'Vendors can create customers under their account. Customer-level DVA provisioning is optional — vendors can choose to provision a dedicated VA for each customer or share the vendor-level VA. This is a vendor-controlled feature per PRD section 6.1.',
        createFiles: ['src/routes/customers.routes.js', 'src/controllers/customers.controller.js', 'src/services/customers.service.js', 'src/repositories/customers.repo.js', 'src/schemas/customers.schema.js', 'tests/unit/customers.service.test.js'],
        impl: [
          '**Endpoints (PRD Section 6.1 — Customer-Level DVA):**',
          '- `POST /v1/vendors/:id/customers` — Create customer; optionally provision a customer-level DVA',
          '- `GET /v1/vendors/:id/customers/:cid` — Fetch customer profile + DVA (if provisioned)',
          '- `POST /v1/vendors/:id/customers/:cid/account` — Explicitly provision a customer-level DVA on demand',
          '',
          'Customer creation stores: name, email, vendor_id. The `nomba_va_number` field is nullable — only populated if a DVA is provisioned.',
          '',
          'When provisioning a customer DVA, use the same Nomba client from P08 with a unique `accountRef` combining vendor_id + customer_id.',
        ],
        tests: [
          'Customer creation stores name, email, and links to correct vendor',
          'Optional DVA provisioning calls Nomba API and stores VA number',
          'Customer without DVA has null nomba_va_number',
          'On-demand DVA provisioning works for existing customer',
          'Vendor-scoped key can only access their own customers',
        ],
        acceptance: [
          'All 3 customer endpoints implemented per PRD section 6.1',
          'DVA provisioning is optional, not required on customer creation',
          'Customer scoped to the correct vendor',
        ],
        branch: 'feat/customer-creation', commit: 'feat(customers): creation + optional DVA provisioning',
      }),
    },
    {
      key: 'P08',
      title: 'P08. [ICE-108] Nomba API client module (shared lib)',
      assigneeId: PETER_ID, estimate: 1, milestone: ph2,
      labels: [lb.backend, lb['phase-2-entities']],
      dependsOnKeys: ['P01'],
      description: buildDesc({
        order: 'P08 (Peter, task 8 of 10)', planId: 'ICE-108', assignee: 'Peter Ajimoti', est: '0.5 day',
        deps: 'P01 (ICE-101)', blocks: 'P05, E04',
        goal: 'Create the shared Nomba API client module used by all features that interact with Nomba. This includes virtual account provisioning, suspension, and bank transfers. Centralises Nomba credentials, error handling, and request formatting.',
        createFiles: ['src/lib/nomba.js', 'tests/unit/nomba.test.js'],
        impl: [
          '```js',
          '// src/lib/nomba.js — thin wrapper around Nomba API',
          "import { env } from '../config.js';",
          '',
          'export function createNombaClient() {',
          '  const baseUrl = env.NOMBA_BASE_URL;',
          '  const headers = () => ({',
          '    Authorization: `Bearer ${env.NOMBA_ACCESS_TOKEN}`,',
          '    accountId: env.NOMBA_ACCOUNT_ID,',
          "    'Content-Type': 'application/json',",
          '  });',
          '',
          '  return {',
          '    createVirtualAccount: async ({ accountRef, accountName }) => {',
          "      const res = await fetch(`${baseUrl}/v1/accounts/virtual`, {",
          "        method: 'POST', headers: headers(),",
          '        body: JSON.stringify({ accountRef, accountName, currency: "NGN" }),',
          '      });',
          "      if (!res.ok) throw new AppError(502, 'NOMBA_ERROR', 'Failed to provision virtual account');",
          '      return res.json();',
          '    },',
          '',
          '    suspendVirtualAccount: async (accountRef) => { /* ... */ },',
          '',
          '    transferToBank: async ({ amount, accountNumber, bankCode, narration }) => {',
          "      const res = await fetch(`${baseUrl}/v2/transfers/bank`, {",
          "        method: 'POST', headers: headers(),",
          '        body: JSON.stringify({ amount, accountNumber, bankCode, narration }),',
          '      });',
          "      if (!res.ok) throw new Error(`Nomba transfer failed: ${res.status}`);",
          '      return res.json();',
          '    },',
          '  };',
          '}',
          '```',
          '',
          'Injected via factory pattern into services that need it (P05, P07, E04).',
        ],
        tests: [
          'createVirtualAccount sends correct payload to Nomba (mocked)',
          'Nomba API failure throws AppError with 502 status',
          'transferToBank converts kobo to naira correctly',
          'All requests include correct Authorization header',
        ],
        acceptance: [
          'Single shared Nomba client — no duplicate API calls across features',
          'Nomba sandbox credentials configured via env vars',
          'Error handling wraps all Nomba failures gracefully',
        ],
        branch: 'feat/nomba-client', commit: 'feat(lib): shared Nomba API client module',
      }),
    },
    {
      key: 'P09',
      title: 'P09. [ICE-109] Swagger/OpenAPI docs + deep health check',
      assigneeId: PETER_ID, estimate: 2, milestone: ph5,
      labels: [lb.backend, lb['phase-5-polish']],
      dependsOnKeys: ['P06', 'M08'],
      description: buildDesc({
        order: 'P09 (Peter, task 9 of 10)', planId: 'ICE-109', assignee: 'Peter Ajimoti', est: '1 day',
        deps: 'P06 (ICE-106), M08 (ICE-208)', blocks: 'P10',
        goal: 'Generate interactive Swagger UI at `/docs` from route definitions (OpenAPI 3.0 spec). Upgrade `/healthz` to a deep health check that reports DB, Redis, and Nomba API reachability. Per PRD section 6.5.',
        createFiles: ['src/docs/swagger.js'],
        editFiles: ['src/app.js'],
        impl: [
          '**Endpoints:**',
          '- `GET /docs` — Swagger UI (interactive API documentation)',
          '- `GET /healthz` — Deep health check returning DB, Redis, Nomba status',
          '',
          'Health check response:',
          '```json',
          '{',
          '  "ok": true,',
          '  "services": {',
          '    "postgres": "connected",',
          '    "redis": "connected",',
          '    "nomba": "reachable"',
          '  },',
          '  "uptime": 12345',
          '}',
          '```',
        ],
        tests: [
          'GET /docs returns HTML with Swagger UI',
          '/healthz returns status for all 3 services',
          '/healthz returns 503 if any service is down',
        ],
        acceptance: [
          'Swagger UI live and browsable at /docs',
          'All endpoints documented with request/response schemas',
          '/healthz checks DB, Redis, and Nomba connectivity',
        ],
        branch: 'feat/swagger-health', commit: 'feat(docs): Swagger UI + deep health check',
      }),
    },
    {
      key: 'P10',
      title: 'P10. [ICE-110] Deployment config (Render) + E2E integration test',
      assigneeId: PETER_ID, estimate: 2, milestone: ph5,
      labels: [lb.backend, lb['phase-5-polish']],
      dependsOnKeys: ['P09'],
      description: buildDesc({
        order: 'P10 (Peter, task 10 of 10)', planId: 'ICE-110', assignee: 'Peter Ajimoti', est: '1 day',
        deps: 'P09 (ICE-109)', blocks: 'Nothing downstream',
        goal: 'Configure deployment to Render/Railway with managed PostgreSQL and Redis. Write end-to-end integration test covering the full demo flow: register → create vendor → receive payment → reconcile → refund. Per PRD section 12 demo narrative.',
        createFiles: ['render.yaml', 'tests/integration/e2e.test.js'],
        impl: [
          '**Deployment:**',
          '- Render web service for Express API',
          '- Managed PostgreSQL + Redis add-ons',
          '- Environment variables configured via Render dashboard',
          '- Auto-deploy from main branch',
          '',
          '**E2E Test (mirrors PRD Demo Narrative):**',
          '1. Register "StyleHub" platform owner',
          '2. Create vendor "Adunola Fabrics" — get DVA number',
          '3. Create invoice for N15,000',
          '4. Simulate N16,000 payment via Nomba webhook',
          '5. Verify OVERPAYMENT detected, refund queued',
          '6. Verify merchant webhook received payment.overpayment.refunded',
          '7. Total time: under 90 seconds',
        ],
        tests: [
          'Full demo flow completes without errors on sandbox',
          'Deployment accessible at public URL (not localhost)',
          'Nomba sandbox integration works with real credentials',
        ],
        acceptance: [
          'App deployed and accessible via public URL',
          'E2E test passes on Nomba sandbox',
          'Demo script rehearsed and documented',
        ],
        branch: 'feat/deployment', commit: 'feat(deploy): Render config + E2E integration test',
      }),
    },

    // ═══════════════════════════════════════════════════════════
    // MARVELOUS — Payments Core (M01–M08)
    // ═══════════════════════════════════════════════════════════
    {
      key: 'M01',
      title: 'M01. [ICE-201] Full database schema — all 10 tables + migrations',
      assigneeId: null, estimate: 1, milestone: ph1,
      labels: [lb.backend, lb['phase-1-foundation']],
      dependsOnKeys: ['P01'],
      description: buildDesc({
        order: 'M01 (Marvelous, task 1 of 8)', planId: 'ICE-201', assignee: 'Marvelous', est: '0.5 day',
        deps: 'P01 (ICE-101)', blocks: 'P02, M02, M03 — all DB-dependent tasks',
        goal: 'Create all 10 PostgreSQL tables upfront in a single migration. Every other feature depends on this schema being stable before they start. **Marvelous prepares the SQL on Day 1 morning while Peter finishes P01; merges immediately after P01.**',
        createFiles: ['src/db/schema.sql', 'src/db/migrate.js', 'src/db/client.js'],
        impl: [
          'Tables to create in order (per PRD section 10):',
          '',
          '1. **merchants** — id, business_name, api_key_hash, webhook_url, status, created_at',
          '2. **vendors** — id, merchant_id (FK), name, api_key_hash, nomba_va_number, va_status',
          '3. **customers** — id, vendor_id (FK), name, email, nomba_va_number (nullable)',
          '4. **invoices** — id, vendor_id, customer_id, amount_kobo, status, paid_amount_kobo',
          '5. **transactions** — id, transaction_id (unique), va_number, amount_kobo, sender_name, sender_account, sender_bank_code, raw_payload (JSONB)',
          '6. **reconciliation_logs** — id, transaction_id, invoice_id, status, expected_kobo, received_kobo, difference_kobo, action_taken',
          '7. **refunds** — id, transaction_id, amount_kobo, recipient_account, recipient_bank_code, nomba_transfer_ref, status, retry_count',
          '8. **webhook_deliveries** — id, merchant_id, event_type, payload (JSONB), status, http_status, retry_count, next_retry_at',
          '9. **misdirected_payments** — id, merchant_id, va_number, amount_kobo, sender_name, raw_payload, status, resolution',
          '10. **audit_logs** — id, merchant_id, actor_id, action, resource_type, resource_id, old_values, new_values, ip_address, created_at',
          '',
          '> ⚠️ **All monetary columns are INTEGER (kobo). Never DECIMAL or FLOAT.** Per PRD: "All monetary values stored in kobo (smallest NGN unit) as integers to avoid floating-point precision errors."',
        ],
        tests: [
          'Migration runs cleanly on a fresh database',
          'All 10 tables exist with correct column types after migration',
          'Re-running migration is a no-op (idempotent)',
          'All amount columns are INTEGER, not DECIMAL or FLOAT',
        ],
        acceptance: [
          'All 10 tables created per PRD section 10',
          'All amount columns are INTEGER (kobo)',
          'Foreign keys and indexes in place',
          'Migration is idempotent',
        ],
        branch: 'feat/db-schema', commit: 'feat(db): full schema migration — all 10 tables',
      }),
    },
    {
      key: 'M02',
      title: 'M02. [ICE-202] Nomba webhook receiver + HMAC-SHA256 verification + idempotency',
      assigneeId: null, estimate: 2, milestone: ph3,
      labels: [lb.backend, lb.payments, lb['phase-3-payments']],
      dependsOnKeys: ['M01', 'P01'],
      description: buildDesc({
        order: 'M02 (Marvelous, task 2 of 8)', planId: 'ICE-202', assignee: 'Marvelous', est: '1 day',
        deps: 'M01 (ICE-201), P01 (ICE-101)', blocks: 'M04, M06, E07, E08',
        goal: "Build ICE's inbound webhook endpoint that receives all payment events from Nomba. Every incoming request must pass HMAC-SHA256 signature verification. Every transaction must be processed at most once using the transactionId as the natural idempotency key. Per PRD sections 6.2 and 9.",
        createFiles: ['src/routes/webhooks.routes.js', 'src/controllers/webhooks.controller.js', 'src/services/webhook-inbound.service.js', 'src/lib/hmac.js', 'tests/unit/hmac.test.js', 'tests/integration/webhook-receiver.test.js'],
        impl: [
          '```js',
          '// src/lib/hmac.js',
          "import crypto from 'crypto';",
          '',
          'export const verify = (payload, signature, secret) => {',
          "  const expected = crypto.createHmac('sha256', secret)",
          '    .update(JSON.stringify(payload))',
          "    .digest('hex');",
          '  return crypto.timingSafeEqual(',
          '    Buffer.from(signature),',
          '    Buffer.from(expected)',
          '  );',
          '};',
          '```',
          '',
          '**Endpoint:** `POST /v1/webhooks/nomba`',
          '',
          'Flow:',
          '1. Verify HMAC — reject with 401 if invalid',
          '2. Check transactions table for existing transactionId — return 200 if duplicate (idempotent)',
          '3. Store raw transaction with raw_payload JSONB',
          '4. Dispatch to reconciliation engine',
          '',
          'Handles: `payment_success`, `payment_failed`, `payment_reversal` event types.',
        ],
        tests: [
          'Valid signature + new transaction: processed and 200 returned',
          'Invalid signature: 401 returned, nothing stored',
          'Duplicate transactionId: 200 returned immediately, not processed twice',
          'payment_failed event: stored with correct status, not reconciled',
        ],
        acceptance: [
          'HMAC verification uses `crypto.timingSafeEqual` (not string equality)',
          'Duplicate transactions are no-ops (idempotent)',
          'Raw payload stored as JSONB in transactions table',
          'All 3 event types handled correctly',
        ],
        branch: 'feat/webhook-receiver', commit: 'feat(webhooks): inbound receiver, HMAC verification, idempotency',
      }),
    },
    {
      key: 'M03',
      title: 'M03. [ICE-203] Invoice creation + state machine',
      assigneeId: null, estimate: 2, milestone: ph3,
      labels: [lb.backend, lb.payments, lb['phase-3-payments']],
      dependsOnKeys: ['P05'],
      description: buildDesc({
        order: 'M03 (Marvelous, task 3 of 8)', planId: 'ICE-203', assignee: 'Marvelous', est: '1 day',
        deps: 'P05 (ICE-105)', blocks: 'M04',
        goal: 'Vendors can create invoices linked to a customer and an expected amount. The invoice follows a strict state machine: `draft → issued → partially_paid → paid → overpaid → refunded`. Per PRD section 6.2.',
        createFiles: ['src/routes/invoices.routes.js', 'src/controllers/invoices.controller.js', 'src/services/invoices.service.js', 'src/repositories/invoices.repo.js', 'src/schemas/invoices.schema.js', 'tests/unit/invoices.service.test.js'],
        impl: [
          '```js',
          '// State machine — only valid transitions allowed',
          'const TRANSITIONS = {',
          "  draft: ['issued'],",
          "  issued: ['partially_paid', 'paid', 'overpaid'],",
          "  partially_paid: ['paid', 'overpaid'],",
          "  paid: ['refunded'],",
          "  overpaid: ['refunded'],",
          '};',
          '',
          'export const transition = (current, next) => {',
          "  if (!TRANSITIONS[current]?.includes(next))",
          '    throw new AppError(400, "INVALID_TRANSITION",',
          '      `Cannot move from ${current} to ${next}`);',
          '};',
          '```',
          '',
          'All amounts validated as positive integers (kobo). Invoice amount must be greater than zero.',
        ],
        tests: [
          'Valid state transitions succeed',
          'Invalid transitions throw with INVALID_TRANSITION code',
          'Amount stored in kobo, not naira',
          'Invoice linked to correct vendor and customer',
        ],
        acceptance: [
          'State machine enforced — no direct DB updates bypass it',
          'All amounts in kobo (integers)',
          'Invoice links to vendor + customer correctly',
        ],
        branch: 'feat/invoices', commit: 'feat(invoices): creation + state machine',
      }),
    },
    {
      key: 'M04',
      title: 'M04. [ICE-204] Reconciliation engine — exact match + duplicate rejection',
      assigneeId: null, estimate: 2, milestone: ph3,
      labels: [lb.backend, lb.payments, lb['phase-3-payments']],
      dependsOnKeys: ['M02', 'M03'],
      description: buildDesc({
        order: 'M04 (Marvelous, task 4 of 8)', planId: 'ICE-204', assignee: 'Marvelous', est: '1 day',
        deps: 'M02 (ICE-202), M03 (ICE-203)', blocks: 'M05',
        goal: 'The core reconciliation engine receives a verified transaction and determines its outcome. This task covers exact match (closes the invoice) and duplicate detection (rejects idempotently). Per PRD section 6.2.',
        createFiles: ['src/services/reconciliation.service.js', 'src/repositories/reconciliation.repo.js', 'tests/unit/reconciliation.service.test.js'],
        impl: [
          '```js',
          'export const reconcile = async (transaction, deps) => {',
          '  // Duplicate check',
          '  const existing = await deps.reconciliation.findByTransactionId(transaction.transaction_id);',
          "  if (existing) return { status: 'DUPLICATE', action: 'rejected' };",
          '',
          '  const invoice = await deps.invoices.findByVaNumber(transaction.va_number);',
          "  if (!invoice) return { status: 'UNMATCHED', action: 'flagged' };",
          '',
          '  const received = transaction.amount_kobo;',
          '  const expected = invoice.amount_kobo;',
          '',
          '  if (received === expected) {',
          "    await deps.invoices.transition(invoice.id, 'paid');",
          '    await deps.reconciliation.log({',
          '      transaction_id: transaction.transaction_id,',
          '      invoice_id: invoice.id,',
          "      status: 'EXACT_MATCH',",
          '      expected_kobo: expected, received_kobo: received,',
          "      difference_kobo: 0, action_taken: 'invoice_closed'",
          '    });',
          "    return { status: 'EXACT_MATCH' };",
          '  }',
          '  // overpayment + underpayment handled in M05',
          '};',
          '```',
        ],
        tests: [
          'Exact match closes invoice and logs EXACT_MATCH',
          'Duplicate transaction ID returns DUPLICATE without re-processing',
          'Reconciliation log entry created for every outcome',
          'Unmatched payment returns UNMATCHED status',
        ],
        acceptance: [
          'Exact match transitions invoice to `paid`',
          'Duplicate rejected without any state change',
          '`reconciliation_logs` entry created for every call',
        ],
        branch: 'feat/reconciliation-core', commit: 'feat(reconciliation): exact match + duplicate rejection',
      }),
    },
    {
      key: 'M05',
      title: 'M05. [ICE-205] Reconciliation engine — overpayment + underpayment handling',
      assigneeId: null, estimate: 2, milestone: ph3,
      labels: [lb.backend, lb.payments, lb['phase-3-payments']],
      dependsOnKeys: ['M04'],
      description: buildDesc({
        order: 'M05 (Marvelous, task 5 of 8)', planId: 'ICE-205', assignee: 'Marvelous', est: '1 day',
        deps: 'M04 (ICE-204)', blocks: 'E04',
        goal: 'Extend the reconciliation engine to handle overpayments (flag invoice as overpaid, queue auto-refund job) and underpayments (mark as partially paid, track outstanding balance). Per PRD section 6.2.',
        editFiles: ['src/services/reconciliation.service.js'],
        createFiles: ['tests/unit/reconciliation-edge-cases.test.js'],
        impl: [
          '```js',
          'if (received > expected) {',
          '  const difference = received - expected;',
          "  await deps.invoices.transition(invoice.id, 'overpaid');",
          '  await deps.invoices.update(invoice.id, { paid_amount_kobo: received });',
          '  await deps.reconciliation.log({',
          "    ...logBase, status: 'OVERPAYMENT',",
          "    difference_kobo: difference, action_taken: 'refund_queued'",
          '  });',
          '  // Queue refund job — E04 builds the processor',
          '  await deps.queues.refund.add({',
          '    transaction_id: transaction.transaction_id,',
          '    amount_kobo: difference,',
          '    recipient_account: transaction.sender_account,',
          '    recipient_bank_code: transaction.sender_bank_code',
          '  });',
          "  return { status: 'OVERPAYMENT', refund_queued: true, difference_kobo: difference };",
          '}',
          '',
          'if (received < expected) {',
          '  const outstanding = expected - received;',
          "  await deps.invoices.transition(invoice.id, 'partially_paid');",
          '  await deps.invoices.update(invoice.id, { paid_amount_kobo: received });',
          '  await deps.reconciliation.log({',
          "    ...logBase, status: 'UNDERPAYMENT',",
          "    difference_kobo: outstanding, action_taken: 'partial_recorded'",
          '  });',
          "  return { status: 'UNDERPAYMENT', outstanding_kobo: outstanding };",
          '}',
          '```',
          '',
          '> **Competitive Edge (PRD section 7.2):** Paystack explicitly says "no refunds on dedicated virtual accounts." ICE handles this automatically.',
        ],
        tests: [
          'Overpayment: invoice moves to `overpaid`, refund job queued with correct amount',
          'Underpayment: invoice moves to `partially_paid`, outstanding balance tracked',
          'Overpayment of 0 kobo (exact match) does not trigger refund',
          'Refund job contains correct sender account + bank code',
        ],
        acceptance: [
          'Overpayment queues refund job with correct difference amount',
          'Underpayment tracks outstanding balance correctly',
          'Both outcomes written to `reconciliation_logs`',
        ],
        branch: 'feat/reconciliation-edge', commit: 'feat(reconciliation): overpayment + underpayment handling',
      }),
    },
    {
      key: 'M06',
      title: 'M06. [ICE-206] Misdirected payment detection + platform owner alert',
      assigneeId: null, estimate: 2, milestone: ph4,
      labels: [lb.backend, lb.payments, lb['phase-4-extended']],
      dependsOnKeys: ['M02', 'E02'],
      description: buildDesc({
        order: 'M06 (Marvelous, task 6 of 8)', planId: 'ICE-206', assignee: 'Marvelous', est: '1 day',
        deps: 'M02 (ICE-202), E02 (ICE-302)', blocks: 'M07, S08',
        goal: 'When a payment arrives on a VA with no matching invoice or customer, ICE flags it as misdirected, stores it in the misdirected_payments table, and immediately notifies the platform owner via their configured webhook URL. Per PRD section 6.4.',
        createFiles: ['src/services/misdirected.service.js', 'src/repositories/misdirected.repo.js', 'tests/unit/misdirected.service.test.js'],
        editFiles: ['src/routes/merchants.routes.js'],
        impl: [
          '**Misdirected Payment Flow (PRD section 6.4):**',
          '1. ICE receives `payment_success` webhook from Nomba',
          '2. Reconciliation engine looks up VA — no active customer, vendor, or invoice found',
          '3. Payment flagged as `MISDIRECTED` with full sender details',
          '4. Platform owner immediately notified via outbound webhook queue (E02)',
          '5. Payment logged for manual review',
          '',
          '**Endpoint:** `GET /v1/payments/misdirected` — List all misdirected payments for merchant (paginated)',
        ],
        tests: [
          'Unmatched payment stored in misdirected_payments with full sender details',
          'Merchant webhook delivery queued immediately with event `payment.misdirected`',
          'List endpoint returns only the requesting merchant\'s misdirected payments',
          'Misdirected payment status defaults to PENDING_REVIEW',
        ],
        acceptance: [
          'Misdirected payments stored with sender name, account, bank code, raw payload',
          'Merchant alerted via outbound webhook queue',
          'List endpoint paginated and scoped to merchant',
        ],
        branch: 'feat/misdirected', commit: 'feat(reconciliation): misdirected payment detection + alert',
      }),
    },
    {
      key: 'M07',
      title: 'M07. [ICE-207] Misdirected payment refund + manual match endpoint',
      assigneeId: null, estimate: 1, milestone: ph4,
      labels: [lb.backend, lb.payments, lb['phase-4-extended']],
      dependsOnKeys: ['M06'],
      description: buildDesc({
        order: 'M07 (Marvelous, task 7 of 8)', planId: 'ICE-207', assignee: 'Marvelous', est: '0.5 day',
        deps: 'M06 (ICE-206)', blocks: 'M08',
        goal: 'Platform owners can manually match a misdirected payment to an existing invoice, or initiate a refund to return the money to the sender. Both actions use the Nomba Transfer API. Per PRD section 6.4.',
        editFiles: ['src/routes/merchants.routes.js', 'src/services/misdirected.service.js'],
        impl: [
          '**Endpoints (PRD Section 6.4):**',
          '- `POST /v1/payments/:id/match` — Manually match a misdirected payment to a customer/invoice',
          '- `POST /v1/payments/:id/refund` — Initiate refund for a misdirected payment via Nomba Transfer API',
          '',
          'Manual match updates misdirected payment status to `RESOLVED` and triggers normal reconciliation.',
          'Refund calls the same Nomba Transfer API used by the auto-refund engine (E04).',
          '',
          'Both actions are audit-logged with actor_id, timestamp, old/new values.',
        ],
        tests: [
          'Manual match updates status to RESOLVED and triggers reconciliation',
          'Refund calls Nomba Transfer API with correct sender details',
          'Both actions create audit_logs entries',
          'Only master key (platform owner) can call these endpoints',
        ],
        acceptance: [
          'Both match and refund endpoints implemented per PRD section 6.4',
          'All actions audit-logged',
          'Master key required — vendor keys get 403',
        ],
        branch: 'feat/misdirected-actions', commit: 'feat(misdirected): refund + manual match endpoints',
      }),
    },
    {
      key: 'M08',
      title: 'M08. [ICE-208] Manual mark-paid override + reconciliation log API + audit logging',
      assigneeId: null, estimate: 1, milestone: ph4,
      labels: [lb.backend, lb.payments, lb['phase-4-extended']],
      dependsOnKeys: ['M07'],
      description: buildDesc({
        order: 'M08 (Marvelous, task 8 of 8)', planId: 'ICE-208', assignee: 'Marvelous', est: '0.5 day',
        deps: 'M07 (ICE-207)', blocks: 'P09, E05, E06, S04',
        goal: 'Platform owners can manually override reconciliation status (mark an invoice as paid) and query the full reconciliation log. All manual overrides are audit-logged. Implements the audit_logs table writer. Per PRD sections 6.2 and 9.',
        createFiles: ['src/services/audit.service.js', 'src/repositories/audit.repo.js', 'tests/integration/reconciliation-api.test.js'],
        editFiles: ['src/routes/invoices.routes.js', 'src/controllers/invoices.controller.js'],
        impl: [
          '**Endpoints (PRD Section 6.2):**',
          '- `POST /v1/invoices/:id/mark-paid` — Manual override (platform owner only; audit-logged)',
          '- `GET /v1/invoices/:id/reconciliation` — Real-time reconciliation status for an invoice',
          '- `GET /v1/reconciliation/logs` — Paginated reconciliation log (filterable by status)',
          '',
          '```js',
          '// POST /v1/invoices/:id/mark-paid — master key only',
          "await invoices.transition(id, 'paid');",
          'await audit.log({',
          '  actor_id: merchant.id,',
          "  action: 'invoice.mark_paid',",
          "  resource_type: 'invoice',",
          '  resource_id: id,',
          '  old_values: { status: invoice.status },',
          "  new_values: { status: 'paid' }",
          '});',
          '```',
          '',
          '**Audit Logging (PRD Section 9):** All financial mutations logged with actor, timestamp, IP, old/new values.',
        ],
        tests: [
          'mark-paid transitions invoice and creates audit log entry',
          'Vendor-scoped key cannot call mark-paid (403)',
          'Reconciliation logs filterable by EXACT_MATCH, OVERPAYMENT, UNDERPAYMENT, DUPLICATE, UNMATCHED',
          'Audit log captures actor_id, action, old_values, new_values',
        ],
        acceptance: [
          'mark-paid requires master key',
          'Every override written to `audit_logs`',
          'Reconciliation log API supports status filter and pagination',
        ],
        branch: 'feat/recon-api-audit', commit: 'feat(reconciliation): mark-paid override, log API, audit logging',
      }),
    },

    // ═══════════════════════════════════════════════════════════
    // EMMANUEL — Async & Reporting (E01–E08)
    // ═══════════════════════════════════════════════════════════
    {
      key: 'E01',
      title: 'E01. [ICE-301] Redis connection + BullMQ setup + base queue definitions',
      assigneeId: null, estimate: 1, milestone: ph1,
      labels: [lb.backend, lb.async, lb['phase-1-foundation']],
      dependsOnKeys: [],
      description: buildDesc({
        order: 'E01 (Emmanuel, task 1 of 8)', planId: 'ICE-301', assignee: 'Emmanuel', est: '0.5 day',
        deps: 'Nothing — starts in parallel on Day 1', blocks: 'E02, E03, E04, E07, E08',
        goal: 'Set up Redis connection and define all BullMQ queues and workers that the rest of the system depends on. Queue processors are empty at this stage — they get filled in by E02, E03, and E04. **Emmanuel starts this independently on Day 1.**',
        createFiles: ['src/lib/redis.js', 'src/queues/index.js', 'src/queues/webhook-delivery.queue.js', 'src/queues/refund.queue.js', 'src/workers/webhook-delivery.worker.js', 'src/workers/refund.worker.js'],
        impl: [
          '```js',
          '// src/queues/index.js',
          "import { Queue } from 'bullmq';",
          "import { redis } from '../lib/redis.js';",
          '',
          "export const webhookDeliveryQueue = new Queue('webhook-delivery', { connection: redis });",
          "export const refundQueue = new Queue('refund', { connection: redis });",
          '',
          '// Default job options — applied to all queues',
          'const defaultJobOptions = {',
          '  attempts: 5,',
          "  backoff: { type: 'exponential', delay: 30_000 },",
          '  removeOnComplete: 100,',
          '  removeOnFail: 500,',
          '};',
          '```',
        ],
        tests: [
          'Redis connection established successfully',
          'Both queues initialise without errors',
          '/healthz confirms Redis is reachable',
        ],
        acceptance: [
          'Redis connection in health check',
          'Both queues defined with correct default job options',
          'Workers boot without errors (even with empty processors)',
        ],
        branch: 'feat/queue-setup', commit: 'feat(queues): Redis + BullMQ setup, base queue definitions',
      }),
    },
    {
      key: 'E02',
      title: 'E02. [ICE-302] Outbound webhook delivery worker + exponential backoff retry',
      assigneeId: null, estimate: 2, milestone: ph3,
      labels: [lb.backend, lb.async, lb['phase-3-payments']],
      dependsOnKeys: ['E01', 'P04'],
      description: buildDesc({
        order: 'E02 (Emmanuel, task 2 of 8)', planId: 'ICE-302', assignee: 'Emmanuel', est: '1 day',
        deps: 'E01 (ICE-301), P04 (ICE-104)', blocks: 'E03, M06',
        goal: 'Build the BullMQ worker that delivers ICE webhook events to merchant-configured URLs. Failed deliveries are retried up to 5 times with exponential backoff. Every attempt is logged in webhook_deliveries. Per PRD section 7.1.',
        editFiles: ['src/workers/webhook-delivery.worker.js'],
        createFiles: ['src/repositories/webhook-deliveries.repo.js', 'tests/unit/webhook-delivery.worker.test.js'],
        impl: [
          '**Retry schedule (PRD Section 7.1):**',
          '',
          '| Attempt | Delay | On Final Failure |',
          '|---------|-------|-----------------|',
          '| 1 | Immediate | |',
          '| 2 | 30 seconds | |',
          '| 3 | 2 minutes | |',
          '| 4 | 10 minutes | |',
          '| 5 | 30 minutes | → Dead-letter queue; alert merchant |',
          '',
          '```js',
          'worker.process(async (job) => {',
          '  const { merchant_id, event_type, payload } = job.data;',
          '  const merchant = await merchants.byId(merchant_id);',
          '',
          '  const response = await fetch(merchant.webhook_url, {',
          "    method: 'POST',",
          "    headers: { 'Content-Type': 'application/json', 'X-ICE-Event': event_type },",
          '    body: JSON.stringify(payload),',
          '    signal: AbortSignal.timeout(10_000), // 10s timeout',
          '  });',
          '',
          '  await deliveries.log({',
          "    merchant_id, event_type, payload,",
          "    status: response.ok ? 'DELIVERED' : 'FAILED',",
          '    http_status: response.status,',
          '    retry_count: job.attemptsMade,',
          '  });',
          '',
          "  if (!response.ok) throw new Error(`Delivery failed: ${response.status}`);",
          '});',
          '```',
        ],
        tests: [
          'Successful delivery logged as DELIVERED',
          'Failed delivery retried — retry_count incremented each attempt',
          'Merchant with no webhook URL: job skipped gracefully',
          '10-second timeout enforced',
        ],
        acceptance: [
          'Every delivery attempt logged in `webhook_deliveries`',
          'Exponential backoff: 30s, 2m, 10m, 30m',
          'Timeout of 10 seconds per attempt',
        ],
        branch: 'feat/webhook-delivery', commit: 'feat(queues): outbound webhook delivery + exponential backoff retry',
      }),
    },
    {
      key: 'E03',
      title: 'E03. [ICE-303] Dead-letter handling + manual replay endpoint',
      assigneeId: null, estimate: 1, milestone: ph3,
      labels: [lb.backend, lb.async, lb['phase-3-payments']],
      dependsOnKeys: ['E02'],
      description: buildDesc({
        order: 'E03 (Emmanuel, task 3 of 8)', planId: 'ICE-303', assignee: 'Emmanuel', est: '0.5 day',
        deps: 'E02 (ICE-302)', blocks: 'S06',
        goal: 'Webhooks that exhaust all 5 retry attempts move to a dead-letter state. The merchant is alerted via a `system.webhook_dead_letter` event. Platform owners can manually replay any failed delivery from the API. Per PRD section 7.1.',
        editFiles: ['src/workers/webhook-delivery.worker.js', 'src/repositories/webhook-deliveries.repo.js'],
        createFiles: ['src/routes/webhook-deliveries.routes.js', 'src/controllers/webhook-deliveries.controller.js'],
        impl: [
          '```js',
          "worker.on('failed', async (job, err) => {",
          '  if (job.attemptsMade >= job.opts.attempts) {',
          '    await deliveries.markDeadLetter(job.data.merchant_id, job.id);',
          '    await webhookDeliveryQueue.add({',
          '      merchant_id: job.data.merchant_id,',
          "      event_type: 'system.webhook_dead_letter',",
          '      payload: { failed_event: job.data.event_type, attempts: job.attemptsMade },',
          '    });',
          '  }',
          '});',
          '```',
          '',
          '**Endpoint:** `POST /v1/webhook-deliveries/:id/replay` — Re-adds the job to the queue with fresh attempt counter.',
          '',
          '> ⚠️ Dead-letter loop prevention: `system.webhook_dead_letter` events must NOT trigger another dead-letter on failure.',
        ],
        tests: [
          'Job exhausting all 5 attempts marked as dead-letter',
          'Replay endpoint re-queues the delivery with reset attempt counter',
          'Dead-letter alert itself does not trigger another dead-letter loop',
        ],
        acceptance: [
          'Dead-letter status visible in `webhook_deliveries` table',
          'Replay endpoint accessible to master key only',
          'Dead-letter loop prevention in place',
        ],
        branch: 'feat/dead-letter', commit: 'feat(queues): dead-letter handling + manual replay endpoint',
      }),
    },
    {
      key: 'E04',
      title: 'E04. [ICE-304] Auto-refund engine — Nomba Transfer API integration',
      assigneeId: null, estimate: 2, milestone: ph4,
      labels: [lb.backend, lb.async, lb.payments, lb['phase-4-extended']],
      dependsOnKeys: ['E01', 'M05'],
      description: buildDesc({
        order: 'E04 (Emmanuel, task 4 of 8)', planId: 'ICE-304', assignee: 'Emmanuel', est: '1 day',
        deps: 'E01 (ICE-301), M05 (ICE-205)', blocks: 'S10',
        goal: "Build the BullMQ worker that processes refund jobs queued by the reconciliation engine. Each job calls Nomba's `POST /v2/transfers/bank` to return the overpayment difference to the sender's bank account. Uses the shared Nomba client from P08. Per PRD section 7.2.",
        editFiles: ['src/workers/refund.worker.js'],
        createFiles: ['src/repositories/refunds.repo.js', 'tests/unit/refund.worker.test.js'],
        impl: [
          '```js',
          '// Refund worker',
          'worker.process(async (job) => {',
          '  const { transaction_id, amount_kobo, recipient_account, recipient_bank_code } = job.data;',
          '  const amountNaira = amount_kobo / 100;',
          '',
          '  const result = await nomba.transferToBank({',
          '    amount: amountNaira,',
          '    accountNumber: recipient_account,',
          '    bankCode: recipient_bank_code,',
          '    narration: `ICE refund for transaction ${transaction_id}`,',
          '  });',
          '',
          '  await refunds.update(transaction_id, {',
          "    status: 'COMPLETED',",
          '    nomba_transfer_ref: result.data.id',
          '  });',
          '',
          '  // Notify merchant',
          "  await webhookDeliveryQueue.add({",
          "    event_type: 'payment.overpayment.refunded',",
          '    payload: { transaction_id, amount_kobo }',
          '  });',
          '});',
          '```',
          '',
          '> **Competitive Edge:** Paystack explicitly states "no refunds on dedicated virtual accounts." ICE handles this automatically.',
        ],
        tests: [
          'Successful Nomba transfer updates refund status to COMPLETED',
          'Nomba API failure retries up to 3 times',
          'Refund amount is correct difference (received minus expected)',
          'Merchant notified after successful refund via webhook',
        ],
        acceptance: [
          'Refund amount in naira (kobo / 100) when calling Nomba',
          'Nomba transfer ref stored in refunds table',
          'Merchant webhook fired after successful refund',
        ],
        branch: 'feat/refund-engine', commit: 'feat(refunds): auto-refund engine via Nomba Transfer API',
      }),
    },
    {
      key: 'E05',
      title: 'E05. [ICE-305] Vendor statement + customer statement API',
      assigneeId: null, estimate: 2, milestone: ph4,
      labels: [lb.backend, lb.async, lb['phase-4-extended']],
      dependsOnKeys: ['M08'],
      description: buildDesc({
        order: 'E05 (Emmanuel, task 5 of 8)', planId: 'ICE-305', assignee: 'Emmanuel', est: '1 day',
        deps: 'M08 (ICE-208)', blocks: 'S07, S09',
        goal: 'Build the statement endpoints that give vendors queryable visibility into their collections. All endpoints support date range filtering and pagination. Vendor-scoped keys can only access their own statements. Per PRD section 6.3.',
        createFiles: ['src/routes/statements.routes.js', 'src/controllers/statements.controller.js', 'src/services/statements.service.js', 'src/repositories/statements.repo.js', 'tests/integration/statements.test.js'],
        impl: [
          '**Endpoints (PRD Section 6.3):**',
          '- `GET /v1/vendors/:id/statement` — Full transaction history for a vendor (date range, status filter)',
          '- `GET /v1/vendors/:id/customers/:cid/statement` — Per-customer statement for a vendor',
          '- `GET /v1/vendors/:id/transactions` — Paginated transaction list for a vendor',
          '',
          'All endpoints support query params: `from`, `to` (date range), `page`, `pageSize`, `status`.',
          '',
          'Vendor-scoped keys can only access their own statements. Master key can access all.',
        ],
        tests: [
          'Vendor statement returns only that vendor\'s transactions',
          'Customer statement scoped to correct vendor + customer',
          'Date range filter works on all endpoints',
          'Vendor key cannot access other vendor\'s statements',
        ],
        acceptance: [
          'All 3 statement endpoints implemented per PRD section 6.3',
          'Vendor key scope enforced',
          'All monetary values returned in kobo',
          'Pagination and date range filtering working',
        ],
        branch: 'feat/statements', commit: 'feat(reporting): vendor + customer statement endpoints',
      }),
    },
    {
      key: 'E06',
      title: 'E06. [ICE-306] Platform summary endpoint + single transaction detail',
      assigneeId: null, estimate: 1, milestone: ph4,
      labels: [lb.backend, lb.async, lb['phase-4-extended']],
      dependsOnKeys: ['M08'],
      description: buildDesc({
        order: 'E06 (Emmanuel, task 6 of 8)', planId: 'ICE-306', assignee: 'Emmanuel', est: '0.5 day',
        deps: 'M08 (ICE-208)', blocks: 'S08',
        goal: 'Build the platform-level summary endpoint and single transaction detail view. The summary gives platform owners a bird\'s eye view of all vendor activity. Per PRD section 6.3.',
        createFiles: ['tests/integration/summary.test.js'],
        editFiles: ['src/routes/statements.routes.js', 'src/controllers/statements.controller.js', 'src/services/statements.service.js'],
        impl: [
          '**Endpoints (PRD Section 6.3):**',
          '- `GET /v1/merchants/:id/summary` — Platform-level summary',
          '- `GET /v1/transactions/:id` — Single transaction detail including raw Nomba payload',
          '',
          'Summary endpoint returns:',
          '```json',
          '{',
          '  "total_collected_kobo": 15000000,',
          '  "reconciliation_rate_percent": 94.5,',
          '  "total_vendors": 12,',
          '  "active_vendors": 10,',
          '  "misdirected_count": 3,',
          '  "overpayment_count": 7,',
          '  "refunds_issued_kobo": 250000',
          '}',
          '```',
          '',
          'Reconciliation rate = (exact matches / total transactions) × 100.',
        ],
        tests: [
          'Summary reconciliation rate calculated correctly',
          'Single transaction detail includes raw_payload',
          'Summary accessible to master key only',
          'Transaction detail scoped by merchant/vendor',
        ],
        acceptance: [
          'Summary metrics match actual data',
          'Reconciliation rate calculated correctly',
          'Both endpoints implemented per PRD section 6.3',
        ],
        branch: 'feat/summary', commit: 'feat(reporting): platform summary + transaction detail',
      }),
    },
    {
      key: 'E07',
      title: 'E07. [ICE-307] Dormant account cron job',
      assigneeId: null, estimate: 1, milestone: ph4,
      labels: [lb.backend, lb.async, lb['phase-4-extended']],
      dependsOnKeys: ['E01', 'M02'],
      description: buildDesc({
        order: 'E07 (Emmanuel, task 7 of 8)', planId: 'ICE-307', assignee: 'Emmanuel', est: '0.5 day',
        deps: 'E01 (ICE-301), M02 (ICE-202)', blocks: 'Nothing downstream',
        goal: 'A daily cron job (02:00) suspends VAs with no payments in 90 days. Merchant is notified with a summary report of suspended accounts. Suspended accounts can be reactivated. Per PRD section 7.4.',
        createFiles: ['src/jobs/dormant-account.cron.js', 'tests/unit/dormant-account.test.js'],
        impl: [
          '**Dormant Account Rules (PRD Section 7.4):**',
          '- VA is dormant if no payments received in 90 days (configurable per merchant)',
          '- ICE calls Nomba suspend endpoint for each dormant VA',
          '- Merchant notified with summary report',
          '- Suspended accounts reactivatable via `PUT /v1/vendors/:id/account` (creates new Nomba VA since delete is unsupported)',
          '',
          '> ⚠️ Cron gated by `SCHEDULER_ENABLED` env var. Each VA suspended at most once per cron run.',
        ],
        tests: [
          'VA with no payments in 91 days gets suspended',
          'VA with payment 89 days ago is not suspended',
          'Merchant notified with suspension summary',
          'Cron disabled when SCHEDULER_ENABLED=false',
        ],
        acceptance: [
          'Cron gated by `SCHEDULER_ENABLED` env var',
          'Each VA suspended at most once per cron run',
          'Merchant notified via webhook queue',
        ],
        branch: 'feat/dormant-cron', commit: 'feat(jobs): dormant account cron job',
      }),
    },
    {
      key: 'E08',
      title: 'E08. [ICE-308] Payment anomaly detection',
      assigneeId: null, estimate: 1, milestone: ph4,
      labels: [lb.backend, lb.async, lb['phase-4-extended']],
      dependsOnKeys: ['E01', 'M02'],
      description: buildDesc({
        order: 'E08 (Emmanuel, task 8 of 8)', planId: 'ICE-308', assignee: 'Emmanuel', est: '0.5 day',
        deps: 'E01 (ICE-301), M02 (ICE-202)', blocks: 'Nothing downstream',
        goal: 'Lightweight anomaly detector that runs on every inbound transaction and flags suspicious payment patterns. Alerts queued to merchant webhook. Per PRD section 7.3.',
        createFiles: ['src/services/anomaly.service.js', 'tests/unit/anomaly.service.test.js'],
        impl: [
          '**Anomaly Rules (PRD Section 7.3):**',
          '',
          '| Anomaly Type | Detection Rule | Action |',
          '|-------------|---------------|--------|',
          '| Velocity spike | >5 payments to same VA in 10 min | Flag + alert |',
          '| Round number flooding | 3+ consecutive round amounts | Flag for review |',
          '| Duplicate sender | Same account + amount in 5 min | Hold second payment |',
          '| Dormant account payment | Payment on VA suspended 30+ days | Flag as misdirected |',
          '',
          '```js',
          'const rules = [',
          "  { name: 'velocity_spike', check: async (tx) => await countRecentPayments(tx.va_number, 10) > 5 },",
          "  { name: 'duplicate_sender', check: async (tx) => await hasDuplicateSender(tx.sender_account, tx.amount_kobo, 5) },",
          "  { name: 'dormant_account_payment', check: async (tx) => await isVaSuspended(tx.va_number) },",
          '];',
          '```',
        ],
        tests: [
          'Velocity spike (6 payments in 10 min) triggers alert',
          'Duplicate sender within 5 min flagged',
          'Dormant account receiving payment triggers misdirected flag',
          'Normal payment patterns do not trigger false positives',
        ],
        acceptance: [
          'Anomaly detection runs on every inbound transaction',
          'Anomaly alerts queued to merchant webhook',
          'False positive rate manageable',
        ],
      }),
    },
    {
      key: 'E09',
      title: 'E09. [ICE-309] Nightly Reconciliation Diff Cron',
      assigneeId: null, estimate: 1, milestone: ph4,
      labels: [lb.backend, lb.async, lb['phase-4-extended']],
      dependsOnKeys: ['M01', 'P08'],
      description: buildDesc({
        order: 'E09 (Emmanuel, task 9 of 9)', planId: 'ICE-309', assignee: 'Emmanuel', est: '0.5 day',
        deps: 'M01 (ICE-201), P08 (ICE-108)', blocks: 'Nothing downstream',
        goal: 'Pull the /transactions endpoint nightly, diff against the local ledger using merchantTxRef as the anchor, and alert on any drift. Critical for catching silent Nomba data inconsistencies.',
        createFiles: ['src/jobs/nightly-reconciliation.ts', 'tests/unit/nightly-reconciliation.test.ts'],
        impl: [
          '```ts',
          '// src/jobs/nightly-reconciliation.ts',
          'export const runNightlyDiff = async () => {',
          '  const { data } = await nomba.get("/transactions", {',
          '    params: { dateFrom: getYesterday(), dateTo: getToday(), status: "success" },',
          '  });',
          '',
          '  for (const tx of data.transactions) {',
          '    const local = await db.query("SELECT * FROM transactions WHERE transaction_id = $1", [tx.merchantTxRef]);',
          '    if (!local.rows[0]) await alertOps("Orphan transaction on Nomba", tx);',
          '    else if (local.rows[0].amount_kobo !== tx.amount) await alertOps("Amount drift", { local, tx });',
          '  }',
          '};',
          '```',
          '',
          '> **Definition of Done:** Ensure compliance with [Engineering Standards](https://github.com/femix300/ICE/blob/main/ICE_ENGINEERING.md)',
        ],
        tests: [
          'Cron triggers successfully at midnight',
          'Missing local transactions raise Orphan Alert',
          'Amount mismatches raise Amount Drift alert',
        ],
        acceptance: [
          'Diff uses merchantTxRef as anchor',
          'Logs discrepancies effectively',
        ],
        branch: 'feat/nightly-diff', commit: 'feat(jobs): nightly reconciliation diff cron',
      }),
    },

    // ═══════════════════════════════════════════════════════════
    // SAMKIEL — Frontend / Next.js (S01–S10)
    // ═══════════════════════════════════════════════════════════
    {
      key: 'S01',
      title: 'S01. [ICE-401] Next.js scaffold + Tailwind + API client + base layout',
      assigneeId: null, estimate: 1, milestone: ph1,
      labels: [lb.frontend, lb['phase-1-foundation']],
      dependsOnKeys: [],
      description: buildDesc({
        order: 'S01 (Samkiel, task 1 of 10)', planId: 'ICE-401', assignee: 'Samkiel', est: '0.5 day',
        deps: 'Nothing — starts in parallel on Day 1', blocks: 'S02, S03, S04, S05, S06, S07, S08, S09, S10',
        goal: 'Bootstrap the Next.js dashboard app with Tailwind CSS, a typed API client utility that talks to ICE\'s backend, and a shared base layout with navigation for both platform owner and vendor views. **Samkiel starts this independently on Day 1.**',
        createFiles: ['dashboard/ (Next.js app root)', 'dashboard/lib/api.js', 'dashboard/components/Layout.jsx', 'dashboard/components/Sidebar.jsx', 'dashboard/pages/index.jsx'],
        impl: [
          '```js',
          '// dashboard/lib/api.js — API client',
          'const BASE = process.env.NEXT_PUBLIC_API_URL;',
          '',
          'export const api = {',
          '  get: (path, key) => fetch(`${BASE}${path}`, {',
          '    headers: { Authorization: `Bearer ${key}` }',
          '  }).then(r => r.json()),',
          '',
          '  post: (path, body, key) => fetch(`${BASE}${path}`, {',
          "    method: 'POST',",
          "    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },",
          '    body: JSON.stringify(body)',
          '  }).then(r => r.json()),',
          '};',
          '```',
          '',
          'Two sidebar variants:',
          '- **Platform owner:** sees all vendors, summary, misdirected payments',
          '- **Vendor:** sees own transactions, statements, customers',
        ],
        tests: [
          '`npm run dev` boots at localhost:3000',
          'API client handles 401 and redirects to login',
          'Both sidebar variants render without errors',
        ],
        acceptance: [
          'Next.js + Tailwind CSS project boots',
          'API client configured with env variable',
          'Base layout with responsive sidebar navigation',
        ],
        branch: 'feat/dashboard-scaffold', commit: 'feat(dashboard): Next.js scaffold, Tailwind, API client, base layout',
      }),
    },
    {
      key: 'S02',
      title: 'S02. [ICE-402] Merchant registration UI + API key display',
      assigneeId: null, estimate: 1, milestone: ph2,
      labels: [lb.frontend, lb['phase-2-entities']],
      dependsOnKeys: ['S01', 'P03'],
      description: buildDesc({
        order: 'S02 (Samkiel, task 2 of 10)', planId: 'ICE-402', assignee: 'Samkiel', est: '0.5 day',
        deps: 'S01 (ICE-401), P03 (ICE-103)', blocks: 'S03',
        goal: 'Platform owners can register on ICE through the dashboard. The API key is shown in a copy-to-clipboard component with a clear warning that it will never be shown again.',
        createFiles: ['dashboard/pages/register.jsx', 'dashboard/components/ApiKeyDisplay.jsx'],
        impl: [
          'Registration form calls `POST /v1/merchants/register` and displays the API key on success.',
          '',
          '**ApiKeyDisplay component:**',
          '- Shows key in a masked/revealed toggle',
          '- Copy-to-clipboard button',
          '- Red warning banner: "Save this key now. It will never be shown again."',
          '- Only visible once on registration success',
          '',
          'Form shows Zod validation errors inline (business name, email, webhook URL).',
        ],
        tests: [
          'Registration form submits to correct endpoint',
          'API key displayed once with copy button',
          'Validation errors shown inline',
        ],
        acceptance: [
          'API key shown once with copy button and "save this now" warning',
          'Form validates all fields before submission',
          'Successful registration redirects to dashboard home',
        ],
        branch: 'feat/registration-ui', commit: 'feat(dashboard): merchant registration + API key display',
      }),
    },
    {
      key: 'S03',
      title: 'S03. [ICE-403] Vendor creation + management UI',
      assigneeId: null, estimate: 2, milestone: ph2,
      labels: [lb.frontend, lb['phase-2-entities']],
      dependsOnKeys: ['S02', 'P06'],
      description: buildDesc({
        order: 'S03 (Samkiel, task 3 of 10)', planId: 'ICE-403', assignee: 'Samkiel', est: '1 day',
        deps: 'S02 (ICE-402), P06 (ICE-106)', blocks: 'S04',
        goal: 'Platform owners can create vendors and see the returned Nomba VA number immediately. Vendor list page with status badges and management actions (suspend, generate API key).',
        createFiles: ['dashboard/pages/vendors/index.jsx', 'dashboard/pages/vendors/new.jsx', 'dashboard/components/VendorCard.jsx'],
        impl: [
          '**Vendor creation form:**',
          '- Calls `POST /v1/vendors` and displays returned VA number (bank name + account number) on success',
          '- VA number displayed in a copyable component',
          '',
          '**Vendor list page:**',
          '- Paginated list from `GET /v1/vendors`',
          '- Status badges: ACTIVE (green), SUSPENDED (red), DORMANT (gray)',
          '- Actions: Suspend, Generate API Key',
        ],
        tests: [
          'Vendor creation shows VA number on success',
          'Vendor list renders with correct status badges',
          'Suspend action calls correct API endpoint',
        ],
        acceptance: [
          'VA number displayed and copyable after vendor creation',
          'Vendor list paginated with status filters',
          'Management actions (suspend, API key) work correctly',
        ],
        branch: 'feat/vendor-ui', commit: 'feat(dashboard): vendor creation + management UI',
      }),
    },
    {
      key: 'S04',
      title: 'S04. [ICE-404] Reconciliation feed — live transaction list + status badges',
      assigneeId: null, estimate: 2, milestone: ph3,
      labels: [lb.frontend, lb['phase-3-payments']],
      dependsOnKeys: ['S03', 'M08'],
      description: buildDesc({
        order: 'S04 (Samkiel, task 4 of 10)', planId: 'ICE-404', assignee: 'Samkiel', est: '1 day',
        deps: 'S03 (ICE-403), M08 (ICE-208)', blocks: 'S05, S06',
        goal: 'The main dashboard view shows a live feed of all incoming transactions with their reconciliation status. Each status has a distinct colour-coded badge. Platform owners see all vendors; vendors see only their own.',
        createFiles: ['dashboard/pages/transactions/index.jsx', 'dashboard/components/ReconciliationBadge.jsx', 'dashboard/components/TransactionTable.jsx'],
        impl: [
          '**Status badge colours:**',
          '- **EXACT_MATCH** — green',
          '- **OVERPAYMENT** — amber',
          '- **UNDERPAYMENT** — orange',
          '- **MISDIRECTED** — red',
          '- **DUPLICATE** — gray',
          '- **REFUNDED** — blue',
          '',
          'Table polls `GET /v1/vendors/:id/transactions` every 10 seconds.',
          'Clicking a row navigates to full transaction detail (S05).',
        ],
        tests: [
          'All 6 reconciliation statuses have distinct visual badges',
          'Table auto-refreshes every 10 seconds',
          'Row click navigates to transaction detail',
        ],
        acceptance: [
          'All 6 reconciliation statuses rendered with distinct colours',
          'Table auto-refreshes every 10 seconds',
          'Row click shows full transaction detail',
        ],
        branch: 'feat/recon-feed', commit: 'feat(dashboard): reconciliation feed + status badges',
      }),
    },
    {
      key: 'S05',
      title: 'S05. [ICE-405] Transaction detail view + reconciliation status',
      assigneeId: null, estimate: 1, milestone: ph3,
      labels: [lb.frontend, lb['phase-3-payments']],
      dependsOnKeys: ['S04'],
      description: buildDesc({
        order: 'S05 (Samkiel, task 5 of 10)', planId: 'ICE-405', assignee: 'Samkiel', est: '0.5 day',
        deps: 'S04 (ICE-404)', blocks: 'Nothing downstream',
        goal: 'Full transaction detail view showing sender info, amount, reconciliation outcome, and timeline of events. Links to the reconciliation log entry.',
        createFiles: ['dashboard/pages/transactions/[id].jsx', 'dashboard/components/TransactionDetail.jsx'],
        impl: [
          'Calls `GET /v1/transactions/:id` for full details including raw Nomba payload.',
          'Calls `GET /v1/invoices/:id/reconciliation` for reconciliation status.',
          '',
          '**Shows:**',
          '- Sender name, account number, bank',
          '- Amount (kobo → naira display)',
          '- Reconciliation status badge',
          '- Matched invoice details (if any)',
          '- Timeline of events (received → reconciled → refunded)',
        ],
        tests: [
          'Transaction detail loads and displays all fields',
          'Kobo amounts displayed as naira (with kobo subdivision)',
          'Reconciliation timeline shows correct event sequence',
        ],
        acceptance: [
          'All transaction fields displayed correctly',
          'Kobo → naira conversion displayed',
          'Reconciliation log entry linked',
        ],
        branch: 'feat/tx-detail', commit: 'feat(dashboard): transaction detail view',
      }),
    },
    {
      key: 'S06',
      title: 'S06. [ICE-406] Webhook delivery log UI + dead-letter replay',
      assigneeId: null, estimate: 2, milestone: ph3,
      labels: [lb.frontend, lb['phase-3-payments']],
      dependsOnKeys: ['S04', 'E03'],
      description: buildDesc({
        order: 'S06 (Samkiel, task 6 of 10)', planId: 'ICE-406', assignee: 'Samkiel', est: '1 day',
        deps: 'S04 (ICE-404), E03 (ICE-303)', blocks: 'S07',
        goal: 'Merchants can see the full history of outbound webhook deliveries — every attempt, HTTP status code, and latency. Dead-letter events are highlighted and can be replayed with a single button. Per PRD section 7.1.',
        createFiles: ['dashboard/pages/webhooks/index.jsx', 'dashboard/components/WebhookDeliveryLog.jsx', 'dashboard/components/DeadLetterAlert.jsx'],
        impl: [
          '**Table columns:** event type, attempt number, HTTP status, latency (ms), timestamp, delivery status.',
          '',
          '**Dead-letter handling:**',
          '- Dead-letter rows highlighted in red with a "Replay" button',
          '- Replay calls `POST /v1/webhook-deliveries/:id/replay`',
          '- Success shows toast notification',
          '- Banner at top shows count of pending dead-letter events',
          '',
          'Failed-but-retrying events shown in amber (distinct from dead-letter red).',
        ],
        tests: [
          'Dead-letter events visually distinct from failed-but-retrying events',
          'Replay button triggers re-queue and shows success toast',
          'Latency shown in milliseconds',
        ],
        acceptance: [
          'Full delivery history visible with all attempts',
          'Dead-letter replay works with visual feedback',
          'Dead-letter count banner visible when pending events exist',
        ],
        branch: 'feat/webhook-log-ui', commit: 'feat(dashboard): webhook delivery log + dead-letter replay UI',
      }),
    },
    {
      key: 'S07',
      title: 'S07. [ICE-407] Vendor dashboard — VA details, stats, customer list',
      assigneeId: null, estimate: 2, milestone: ph4,
      labels: [lb.frontend, lb['phase-4-extended']],
      dependsOnKeys: ['S06', 'E05'],
      description: buildDesc({
        order: 'S07 (Samkiel, task 7 of 10)', planId: 'ICE-407', assignee: 'Samkiel', est: '1 day',
        deps: 'S06 (ICE-406), E05 (ICE-305)', blocks: 'S08, S09, S10',
        goal: 'The vendor-scoped dashboard gives vendors full visibility into their own collections: VA details, transaction history, customer statements, and outstanding balances.',
        createFiles: ['dashboard/pages/vendor/index.jsx', 'dashboard/pages/vendor/customers/index.jsx', 'dashboard/pages/vendor/customers/[id].jsx', 'dashboard/components/StatCard.jsx'],
        impl: [
          '**Vendor home shows:**',
          '- VA number (copyable)',
          '- Total collected this month',
          '- Reconciliation rate (percentage)',
          '- Outstanding balance',
          '',
          '**Customer list:**',
          '- Each customer with last payment date and total paid',
          '- Click customer → full statement with all transactions',
          '',
          'Uses `GET /v1/vendors/:id/statement` and `GET /v1/vendors/:id/customers/:cid/statement`.',
        ],
        tests: [
          'VA number displayed and copyable',
          'Reconciliation rate displayed as percentage',
          'Customer statement shows all transactions in date order',
        ],
        acceptance: [
          'Vendor home page shows all key stats',
          'Customer list navigable to individual statements',
          'All data scoped to the authenticated vendor',
        ],
        branch: 'feat/vendor-dashboard', commit: 'feat(dashboard): vendor view — VA, stats, customer list',
      }),
    },
    {
      key: 'S08',
      title: 'S08. [ICE-408] Platform owner dashboard — summary metrics + misdirected panel',
      assigneeId: null, estimate: 2, milestone: ph4,
      labels: [lb.frontend, lb['phase-4-extended']],
      dependsOnKeys: ['S07', 'E06', 'M06'],
      description: buildDesc({
        order: 'S08 (Samkiel, task 8 of 10)', planId: 'ICE-408', assignee: 'Samkiel', est: '1 day',
        deps: 'S07 (ICE-407), E06 (ICE-306), M06 (ICE-206)', blocks: 'Nothing downstream',
        goal: "The platform owner dashboard gives a bird's eye view of the entire operation: summary metrics across all vendors, misdirected payments pending review, refund status tracking, and anomaly alerts.",
        createFiles: ['dashboard/pages/owner/index.jsx', 'dashboard/pages/owner/misdirected.jsx', 'dashboard/components/MisdirectedPaymentCard.jsx', 'dashboard/components/SummaryMetrics.jsx'],
        impl: [
          '**Summary section** (from `GET /v1/merchants/:id/summary`):',
          '- Total collected across all vendors',
          '- Overall reconciliation rate',
          '- Number of active vendors',
          '- Total refunds issued',
          '- Pending misdirected payments count',
          '',
          '**Misdirected payments panel:**',
          '- Lists each flagged payment with sender name, amount, VA number',
          '- Two action buttons: "Match to Invoice" and "Initiate Refund"',
          '- Calls `POST /v1/payments/:id/match` and `POST /v1/payments/:id/refund`',
          '- List refreshes on success',
        ],
        tests: [
          'Summary metrics pulled from correct API endpoint',
          'Misdirected payments show full sender details',
          'Match and Refund actions call correct endpoints and refresh list',
        ],
        acceptance: [
          'Summary metrics match `GET /v1/merchants/:id/summary` response',
          'Misdirected payment actions work correctly',
          'List refreshes automatically after actions',
        ],
        branch: 'feat/owner-dashboard', commit: 'feat(dashboard): platform owner summary + misdirected panel',
      }),
    },
    {
      key: 'S09',
      title: 'S09. [ICE-409] Statements page — vendor + customer statements',
      assigneeId: null, estimate: 1, milestone: ph4,
      labels: [lb.frontend, lb['phase-4-extended']],
      dependsOnKeys: ['S07', 'E05'],
      description: buildDesc({
        order: 'S09 (Samkiel, task 9 of 10)', planId: 'ICE-409', assignee: 'Samkiel', est: '0.5 day',
        deps: 'S07 (ICE-407), E05 (ICE-305)', blocks: 'Nothing downstream',
        goal: 'Dedicated statements page for both vendor and customer levels. Date range picker for filtering. Exportable statement views.',
        createFiles: ['dashboard/pages/statements/index.jsx', 'dashboard/components/StatementTable.jsx', 'dashboard/components/DateRangePicker.jsx'],
        impl: [
          '**Uses:**',
          '- `GET /v1/vendors/:id/statement` (vendor-level)',
          '- `GET /v1/vendors/:id/customers/:cid/statement` (customer-level)',
          '',
          '**Features:**',
          '- Date range picker (from/to)',
          '- Status filter dropdown',
          '- Transaction table with running balance',
          '- Exportable (print-friendly CSS)',
        ],
        tests: [
          'Date range filter returns correct transactions',
          'Customer-level statement scoped correctly',
          'Running balance calculated accurately',
        ],
        acceptance: [
          'Both vendor and customer statements viewable',
          'Date range filtering works',
          'Print-friendly layout',
        ],
        branch: 'feat/statements-ui', commit: 'feat(dashboard): statements page — vendor + customer',
      }),
    },
    {
      key: 'S10',
      title: 'S10. [ICE-410] Refund status indicators + anomaly alerts UI',
      assigneeId: null, estimate: 1, milestone: ph4,
      labels: [lb.frontend, lb['phase-4-extended']],
      dependsOnKeys: ['S07', 'E04'],
      description: buildDesc({
        order: 'S10 (Samkiel, task 10 of 10)', planId: 'ICE-410', assignee: 'Samkiel', est: '0.5 day',
        deps: 'S07 (ICE-407), E04 (ICE-304)', blocks: 'Nothing downstream',
        goal: 'Visual indicators for refund status across the dashboard, and anomaly alert display panel showing flagged suspicious payment patterns.',
        createFiles: ['dashboard/components/RefundStatusBadge.jsx', 'dashboard/components/AnomalyAlertPanel.jsx'],
        editFiles: ['dashboard/pages/owner/index.jsx'],
        impl: [
          '**Refund status badges:**',
          '- PENDING — yellow',
          '- PROCESSING — blue spinner',
          '- COMPLETED — green',
          '- FAILED — red',
          '',
          '**Anomaly alerts panel (on platform owner dashboard):**',
          '- Shows flagged transactions with rule name (velocity_spike, duplicate_sender, etc.)',
          '- Severity colour coding',
          '- Dismiss / investigate actions',
        ],
        tests: [
          'All refund statuses have distinct visual indicators',
          'Anomaly alerts display with correct severity',
          'Dismiss action removes alert from panel',
        ],
        acceptance: [
          'Refund status visible on transaction detail and dashboard',
          'Anomaly alerts panel functional',
          'Visual indicators consistent across dashboard',
        ],
        branch: 'feat/refund-anomaly-ui', commit: 'feat(dashboard): refund status indicators + anomaly alerts',
      }),
    },
  ];
}

// ─── Main ───────────────────────────────────────────────────────
async function main() {
  console.log('🧊 ICE — Linear Tasks Rebuild');
  console.log('═══════════════════════════════════════════════\n');

  // Step 1: Query milestones and labels
  console.log('📌 Querying existing milestones and labels...');
  const projData = await gql(`{
    project(id: "${PROJECT_ID}") {
      projectMilestones { nodes { id name } }
    }
    team(id: "${TEAM_ID}") {
      labels { nodes { id name } }
    }
  }`);

  const milestoneIds = {};
  projData.project.projectMilestones.nodes.forEach(m => { milestoneIds[m.name] = m.id; });
  console.log('   Milestones:', Object.keys(milestoneIds).length);

  const labelIds = {};
  projData.team.labels.nodes.forEach(l => { labelIds[l.name] = l.id; });
  console.log('   Labels:', Object.keys(labelIds).length);

  // Step 2: Delete old issues (ICE-5 through ICE-28)
  console.log('\n🗑️  Deleting old issues (ICE-5 to ICE-28)...');
  const oldData = await gql(`{
    issues(filter: { team: { key: { eq: "ICE" } } }, first: 250) {
      nodes { id identifier title }
    }
  }`);

  const oldIssues = oldData.issues.nodes.filter(i => {
    const num = parseInt(i.identifier.replace('ICE-', ''));
    return num >= 5;
  });

  for (const issue of oldIssues) {
    await gql(`mutation { issueDelete(id: "${issue.id}") { success } }`);
    console.log('   🗑️  Deleted ' + issue.identifier);
    await delay(400);
  }
  console.log('   ✅ ' + oldIssues.length + ' old issues deleted');

  // Step 3: Create all 36 new issues
  const tasks = defineTasks(labelIds, milestoneIds);
  console.log('\n📝 Creating ' + tasks.length + ' new issues...');

  const issueMap = {};
  for (const task of tasks) {
    const input = {
      title: task.title,
      description: task.description,
      teamId: TEAM_ID,
      stateId: TODO_STATE_ID,
      estimate: task.estimate,
      labelIds: task.labels.filter(Boolean),
      projectId: PROJECT_ID,
      priority: 2,
    };
    if (task.milestone) input.projectMilestoneId = task.milestone;
    if (task.assigneeId) input.assigneeId = task.assigneeId;

    const data = await gql(`
      mutation($input: IssueCreateInput!) {
        issueCreate(input: $input) { success issue { id identifier title } }
      }
    `, { input });

    const issue = data.issueCreate.issue;
    issueMap[task.key] = { id: issue.id, identifier: issue.identifier };
    const shortTitle = task.title.split('] ')[1] || task.title;
    console.log('   ✅ ' + issue.identifier + ' — ' + task.key + '. ' + shortTitle);
    await delay(500);
  }

  // Step 4: Create dependencies
  console.log('\n🔗 Setting up dependencies...');
  let depCount = 0;
  for (const task of tasks) {
    if (!task.dependsOnKeys || task.dependsOnKeys.length === 0) continue;
    for (const depKey of task.dependsOnKeys) {
      if (!issueMap[depKey] || !issueMap[task.key]) continue;
      try {
        await gql(`
          mutation($input: IssueRelationCreateInput!) {
            issueRelationCreate(input: $input) { success issueRelation { id type } }
          }
        `, {
          input: {
            issueId: issueMap[task.key].id,
            relatedIssueId: issueMap[depKey].id,
            type: 'blocks',
          }
        });
        depCount++;
        console.log('   🔗 ' + issueMap[depKey].identifier + ' blocks ' + issueMap[task.key].identifier);
        await delay(400);
      } catch (err) {
        console.error('   ❌ Failed: ' + depKey + ' → ' + task.key + ': ' + err.message);
      }
    }
  }
  console.log('   ✅ ' + depCount + ' dependencies created');

  // Summary
  console.log('\n═══════════════════════════════════════════════');
  console.log('🎉 DONE! ' + tasks.length + ' issues created in Linear.\n');
  console.log('📋 Issue Map:');
  for (const [key, val] of Object.entries(issueMap)) {
    console.log('   ' + key + ' → ' + val.identifier);
  }
  console.log('\n👥 Team:');
  console.log('   Peter (P01-P10) — assigned ✅');
  console.log('   Marvelous (M01-M08) — invite to Linear, then assign');
  console.log('   Emmanuel (E01-E08) — invite to Linear, then assign');
  console.log('   Samkiel (S01-S10) — invite to Linear, then assign');
  console.log('\n🔗 Open Linear: https://linear.app');
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
