#!/usr/bin/env node

/**
 * ICE — Nomba Hackathon: Linear Issue Creator
 * Creates 24 tasks across 4 dev series with dependencies.
 *
 * Usage: node create-linear-issues.mjs
 */

const API_KEY = "lin_api_FEzO08T6B8exsBs618DoskFIChEsHqBNX9ITInxE";
const ENDPOINT = "https://api.linear.app/graphql";
const TEAM_ID = "7b8e307b-5c79-4471-b8c1-30921c873672";
const TODO_STATE_ID = "0d3e4f4f-d6bb-4533-a908-adc0c9fac10d";

// Peter is the only current member — others assigned later
const PETER_ID = "6323f822-1a36-43d8-b624-5b2c5fd54653";

// ─── GraphQL helper ──────────────────────────────────────────────
async function gql(query, variables = {}) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: API_KEY,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) {
    console.error("GraphQL errors:", JSON.stringify(json.errors, null, 2));
    throw new Error(json.errors[0].message);
  }
  return json.data;
}

// ─── Step 1: Create Project ─────────────────────────────────────
async function createProject() {
  console.log("\n🏗️  Creating project...");
  const data = await gql(`
    mutation($input: ProjectCreateInput!) {
      projectCreate(input: $input) {
        success
        project { id name }
      }
    }
  `, {
    input: {
      name: "ICE — Nomba Hackathon Build",
      teamIds: [TEAM_ID],
      description: "Payment reconciliation engine for the Nomba Hackathon. 24 tasks across 4 developers, phased sequentially.",
      state: "planned",
    }
  });
  const project = data.projectCreate.project;
  console.log(`   ✅ Project created: ${project.name} (${project.id})`);
  return project.id;
}

// ─── Step 2: Create Labels ──────────────────────────────────────
async function createLabels() {
  console.log("\n🏷️  Creating labels...");
  const labels = [
    { name: "backend", color: "#4EA7FC" },
    { name: "frontend", color: "#BB87FC" },
    { name: "payments", color: "#F2C94C" },
    { name: "async", color: "#27AE60" },
    { name: "phase-1-foundation", color: "#828282" },
    { name: "phase-2-entities", color: "#F2994A" },
    { name: "phase-3-payments", color: "#EB5757" },
    { name: "phase-4-extended", color: "#56CCF2" },
    { name: "phase-5-polish", color: "#6FCF97" },
  ];

  const labelIds = {};
  for (const label of labels) {
    const data = await gql(`
      mutation($input: IssueLabelCreateInput!) {
        issueLabelCreate(input: $input) {
          success
          issueLabel { id name }
        }
      }
    `, {
      input: { name: label.name, color: label.color, teamId: TEAM_ID }
    });
    labelIds[label.name] = data.issueLabelCreate.issueLabel.id;
    console.log(`   ✅ Label: ${label.name}`);
  }
  return labelIds;
}

// ─── Step 3: Create Project Milestones ──────────────────────────
async function createMilestones(projectId) {
  console.log("\n📌 Creating milestones...");
  const milestones = [
    "Phase 1 — Foundation (Day 1)",
    "Phase 2 — Core Entities (Day 2)",
    "Phase 3 — Payments Core (Day 3-4)",
    "Phase 4 — Extended Features (Day 5)",
    "Phase 5 — Polish & Demo (Day 6-7)",
  ];

  const milestoneIds = {};
  for (const name of milestones) {
    const data = await gql(`
      mutation($input: ProjectMilestoneCreateInput!) {
        projectMilestoneCreate(input: $input) {
          success
          projectMilestone { id name }
        }
      }
    `, {
      input: { name, projectId }
    });
    milestoneIds[name] = data.projectMilestoneCreate.projectMilestone.id;
    console.log(`   ✅ Milestone: ${name}`);
  }
  return milestoneIds;
}

// ─── Step 4: Define all 24 tasks ────────────────────────────────
function defineAllTasks(labelIds, milestoneIds, projectId) {

  const phase1 = milestoneIds["Phase 1 — Foundation (Day 1)"];
  const phase2 = milestoneIds["Phase 2 — Core Entities (Day 2)"];
  const phase3 = milestoneIds["Phase 3 — Payments Core (Day 3-4)"];
  const phase4 = milestoneIds["Phase 4 — Extended Features (Day 5)"];
  const phase5 = milestoneIds["Phase 5 — Polish & Demo (Day 6-7)"];

  return [
    // ═══════════════════════════════════════════════════════════════
    // DEV 1 — PETER (Backend Lead) — E Series
    // ═══════════════════════════════════════════════════════════════
    {
      key: "E01",
      title: "E01. [ICE-101] Project scaffold + Express app + middleware wiring",
      assigneeId: PETER_ID,
      estimate: 1, // 0.5 day → 1 point
      labelIds: [labelIds["backend"], labelIds["phase-1-foundation"]],
      projectMilestoneId: phase1,
      projectId,
      dependsOn: [],
      description: `> **Order:** E01 (Peter, task 1 of 6)
> **Plan ID:** ICE-101 | **Assignee:** Peter Ajimoti | **Estimate:** 0.5 day
> **Depends on:** Nothing — this is the root
> **Blocks:** All other tasks

## Goal
Bootstrap the ICE repository with the Express app, all foundational middleware, env config, and the standard response envelope helper. **Nobody writes feature code until this is merged.**

## Files

### Create
- \`src/app.js\`
- \`src/server.js\`
- \`src/config.js\`
- \`src/lib/respond.js\`
- \`.env.example\`
- \`package.json\`

## Implementation

\`\`\`js
// src/lib/respond.js
export const ok = (res, data, status = 200) =>
  res.status(status).json({ ok: true, data });

export const created = (res, data) => ok(res, data, 201);
export const noContent = (res) => res.status(204).send();

// src/app.js — middleware order is fixed, do not deviate
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 60_000, max: 100 }));
app.get('/healthz', (req, res) => res.json({ ok: true }));
app.use('/v1', v1Router);
app.use(notFoundHandler);
app.use(errorHandler);
\`\`\`

Config validates all env vars with Zod at startup. Process exits on bad config — never silently.

## Tests
- [ ] GET /healthz returns \`{ ok: true }\` with status 200
- [ ] Missing required env var causes process to throw on startup
- [ ] \`ok()\` helper returns correct JSON shape

## Acceptance Criteria
- [ ] App boots and /healthz returns 200
- [ ] All env vars documented in .env.example
- [ ] \`node src/server.js\` starts without errors

## PR
- **Branch:** \`feat/scaffold\`
- **Commit:** \`feat(app): express scaffold, middleware wiring, response envelope\``
    },
    {
      key: "E02",
      title: "E02. [ICE-102] Full database schema — all tables + migrations",
      assigneeId: PETER_ID,
      estimate: 1,
      labelIds: [labelIds["backend"], labelIds["phase-1-foundation"]],
      projectMilestoneId: phase1,
      projectId,
      dependsOn: ["E01"],
      description: `> **Order:** E02 (Peter, task 2 of 6)
> **Plan ID:** ICE-102 | **Assignee:** Peter Ajimoti | **Estimate:** 0.5 day
> **Depends on:** E01 (ICE-101)
> **Blocks:** E03, R01, A01, F01

## Goal
Create all 10 PostgreSQL tables upfront in a single migration. Every other feature depends on this schema being stable before they start.

## Files

### Create
- \`src/db/schema.sql\`
- \`src/db/migrate.js\`
- \`src/db/client.js\`

## Implementation
Tables to create in order:

1. **merchants** — id, business_name, api_key_hash, webhook_url, status, created_at
2. **vendors** — id, merchant_id (FK), name, api_key_hash, nomba_va_number, va_status
3. **customers** — id, vendor_id (FK), name, email, nomba_va_number (nullable)
4. **invoices** — id, vendor_id, customer_id, amount_kobo, status, paid_amount_kobo
5. **transactions** — id, transaction_id (unique), va_number, amount_kobo, sender_name, sender_account, sender_bank_code, raw_payload (JSONB)
6. **reconciliation_logs** — id, transaction_id, invoice_id, status, expected_kobo, received_kobo, difference_kobo, action_taken
7. **refunds** — id, transaction_id, amount_kobo, recipient_account, recipient_bank_code, nomba_transfer_ref, status, retry_count
8. **webhook_deliveries** — id, merchant_id, event_type, payload (JSONB), status, http_status, retry_count, next_retry_at
9. **misdirected_payments** — id, merchant_id, va_number, amount_kobo, sender_name, raw_payload, status, resolution
10. **audit_logs** — id, merchant_id, actor_id, action, resource_type, resource_id, old_values, new_values, ip_address, created_at

> ⚠️ All monetary columns are INTEGER (kobo). Never DECIMAL or FLOAT.

## Tests
- [ ] Migration runs cleanly on a fresh database
- [ ] All 10 tables exist with correct column types after migration
- [ ] Re-running migration is a no-op (idempotent)

## Acceptance Criteria
- [ ] All 10 tables created
- [ ] All amount columns are INTEGER
- [ ] Foreign keys and indexes in place
- [ ] Migration is idempotent

## PR
- **Branch:** \`feat/db-schema\`
- **Commit:** \`feat(db): full schema migration — all 10 tables\``
    },
    {
      key: "E03",
      title: "E03. [ICE-103] Merchant registration + API key generation",
      assigneeId: PETER_ID,
      estimate: 2,
      labelIds: [labelIds["backend"], labelIds["phase-2-entities"]],
      projectMilestoneId: phase2,
      projectId,
      dependsOn: ["E01", "E02"],
      description: `> **Order:** E03 (Peter, task 3 of 6)
> **Plan ID:** ICE-103 | **Assignee:** Peter Ajimoti | **Estimate:** 1 day
> **Depends on:** E01 (ICE-101), E02 (ICE-102)
> **Blocks:** E04, E05, F02

## Goal
Platform owners can register on ICE and receive a master API key. The key is hashed with bcrypt before storage and never returned again after the initial response.

## Files

### Create
- \`src/routes/merchants.routes.js\`
- \`src/controllers/merchants.controller.js\`
- \`src/services/merchants.service.js\`
- \`src/repositories/merchants.repo.js\`
- \`src/schemas/merchants.schema.js\`
- \`src/lib/api-key.js\`
- \`tests/unit/merchants.service.test.js\`

## Implementation

\`\`\`js
// src/lib/api-key.js
import crypto from 'crypto';
import bcrypt from 'bcrypt';

export const generate = () => \\\`ice_\\\${crypto.randomBytes(32).toString('hex')}\\\`;
export const hash = (key) => bcrypt.hash(key, 12);
export const verify = (key, hash) => bcrypt.compare(key, hash);

// POST /v1/merchants/register
// Returns the raw key ONCE — never again
const rawKey = generate();
const hashedKey = await hash(rawKey);
await repo.create({ ...data, api_key_hash: hashedKey });
return created(res, { merchant, api_key: rawKey });
\`\`\`

Auth middleware reads \`Authorization: Bearer <key>\`, finds the merchant by key prefix, and verifies with bcrypt.

## Tests
- [ ] Registering with valid data returns merchant + raw API key
- [ ] Raw key is not stored in the database (only hash)
- [ ] Duplicate email returns 409 CONFLICT
- [ ] Missing required fields returns 422

## Acceptance Criteria
- [ ] API key never stored in plaintext
- [ ] Key returned only on registration response
- [ ] Zod validation on all input fields
- [ ] Auth middleware verifies key correctly

## PR
- **Branch:** \`feat/merchant-registration\`
- **Commit:** \`feat(merchants): registration + bcrypt API key generation\``
    },
    {
      key: "E04",
      title: "E04. [ICE-104] Merchant webhook URL config + API key rotation",
      assigneeId: PETER_ID,
      estimate: 1,
      labelIds: [labelIds["backend"], labelIds["phase-2-entities"]],
      projectMilestoneId: phase2,
      projectId,
      dependsOn: ["E03"],
      description: `> **Order:** E04 (Peter, task 4 of 6)
> **Plan ID:** ICE-104 | **Assignee:** Peter Ajimoti | **Estimate:** 0.5 day
> **Depends on:** E03 (ICE-103)
> **Blocks:** A02

## Goal
Merchants can configure the webhook URL ICE delivers payment events to, and rotate their API key when needed. Old key is invalidated immediately on rotation.

## Files

### Create
- \`src/middleware/auth.js\`
- \`tests/unit/auth.test.js\`

### Edit
- \`src/routes/merchants.routes.js\`
- \`src/controllers/merchants.controller.js\`
- \`src/services/merchants.service.js\`

## Implementation

\`\`\`js
// PUT /v1/merchants/:id/webhook-url
// Validates URL is HTTPS before saving
if (!url.startsWith('https://')) throw new AppError(400, 'INVALID_WEBHOOK_URL', 'Webhook URL must be HTTPS');

// POST /v1/merchants/:id/api-keys/rotate
const newRawKey = generate();
const newHash = await hash(newRawKey);
await repo.updateApiKey(id, newHash); // old hash overwritten immediately
return ok(res, { api_key: newRawKey });
\`\`\`

## Tests
- [ ] HTTP webhook URLs are rejected
- [ ] HTTPS webhook URLs are accepted and saved
- [ ] Key rotation returns new key and invalidates old one
- [ ] Old key returns 401 after rotation

## Acceptance Criteria
- [ ] HTTP webhook URLs rejected with clear error
- [ ] Old API key immediately invalid after rotation
- [ ] Rotation is audit-logged

## PR
- **Branch:** \`feat/merchant-config\`
- **Commit:** \`feat(merchants): webhook URL config + API key rotation\``
    },
    {
      key: "E05",
      title: "E05. [ICE-105] Vendor onboarding + Nomba DVA provisioning",
      assigneeId: PETER_ID,
      estimate: 2,
      labelIds: [labelIds["backend"], labelIds["phase-2-entities"]],
      projectMilestoneId: phase2,
      projectId,
      dependsOn: ["E03", "E02"],
      description: `> **Order:** E05 (Peter, task 5 of 6)
> **Plan ID:** ICE-105 | **Assignee:** Peter Ajimoti | **Estimate:** 1 day
> **Depends on:** E03 (ICE-103), E02 (ICE-102)
> **Blocks:** E06, R01, F02

## Goal
Platform owners can create vendors under their account. ICE calls Nomba's \`POST /v1/accounts/virtual\` to provision a dedicated virtual account for each vendor and stores the returned VA number.

## Files

### Create
- \`src/routes/vendors.routes.js\`
- \`src/controllers/vendors.controller.js\`
- \`src/services/vendors.service.js\`
- \`src/repositories/vendors.repo.js\`
- \`src/lib/nomba.js\`
- \`src/schemas/vendors.schema.js\`
- \`tests/unit/vendors.service.test.js\`

## Implementation

\`\`\`js
// src/lib/nomba.js — thin wrapper around Nomba API
export const createVirtualAccount = async ({ accountRef, accountName }) => {
  const res = await fetch('https://api.nomba.com/v1/accounts/virtual', {
    method: 'POST',
    headers: {
      Authorization: \\\`Bearer \\\${env.NOMBA_ACCESS_TOKEN}\\\`,
      accountId: env.NOMBA_ACCOUNT_ID,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ accountRef, accountName, currency: 'NGN' }),
  });
  if (!res.ok) throw new AppError(502, 'NOMBA_ERROR', 'Failed to provision virtual account');
  return res.json();
};

// POST /v1/vendors
// 1. Create vendor record
// 2. Call Nomba to provision DVA
// 3. Update vendor with returned VA number
\`\`\`

## Tests
- [ ] Creating a vendor calls Nomba API (mocked) and stores VA number
- [ ] Nomba API failure returns 502 and does not create vendor record
- [ ] Duplicate vendor name under same merchant returns 409

## Acceptance Criteria
- [ ] Vendor creation calls Nomba sandbox and stores VA number
- [ ] Nomba failure is handled gracefully
- [ ] accountRef is globally unique (merchant_id + vendor_id composite)

## PR
- **Branch:** \`feat/vendor-onboarding\`
- **Commit:** \`feat(vendors): onboarding + Nomba DVA provisioning\``
    },
    {
      key: "E06",
      title: "E06. [ICE-106] Vendor API key scoping + suspension + list endpoint",
      assigneeId: PETER_ID,
      estimate: 1,
      labelIds: [labelIds["backend"], labelIds["phase-2-entities"]],
      projectMilestoneId: phase2,
      projectId,
      dependsOn: ["E05"],
      description: `> **Order:** E06 (Peter, task 6 of 6)
> **Plan ID:** ICE-106 | **Assignee:** Peter Ajimoti | **Estimate:** 0.5 day
> **Depends on:** E05 (ICE-105)
> **Blocks:** F02

## Goal
Generate scoped API keys for vendors (limited to their own data only), allow platform owners to suspend a vendor's VA via Nomba's suspend endpoint, and list all vendors with pagination.

## Files

### Edit
- \`src/routes/vendors.routes.js\`
- \`src/controllers/vendors.controller.js\`
- \`src/services/vendors.service.js\`

## Implementation

\`\`\`js
// POST /v1/vendors/:id/api-keys — scoped key, stored with vendor_id scope
// Vendor auth middleware checks scope before allowing access

// POST /v1/vendors/:id/account/suspend
await nomba.suspendVirtualAccount(vendor.nomba_va_number);
await repo.updateStatus(id, 'SUSPENDED');

// GET /v1/vendors — paginated, filterable by status
\`\`\`

## Tests
- [ ] Vendor API key can only access that vendor's data
- [ ] Master key can access all vendors
- [ ] Suspension calls Nomba suspend endpoint and updates status
- [ ] List endpoint returns paginated results

## Acceptance Criteria
- [ ] Vendor key scope enforced in auth middleware
- [ ] Suspension reflected in Nomba and local DB
- [ ] List endpoint supports page and pageSize query params

## PR
- **Branch:** \`feat/vendor-management\`
- **Commit:** \`feat(vendors): scoped API keys, suspension, list endpoint\``
    },

    // ═══════════════════════════════════════════════════════════════
    // DEV 2 — MARVELOUS (Payments Core) — R Series
    // ═══════════════════════════════════════════════════════════════
    {
      key: "R01",
      title: "R01. [ICE-201] Nomba webhook receiver + HMAC verification + idempotency",
      assigneeId: null, // Marvelous — assign after invite
      estimate: 2,
      labelIds: [labelIds["backend"], labelIds["payments"], labelIds["phase-3-payments"]],
      projectMilestoneId: phase3,
      projectId,
      dependsOn: ["E01", "E02"],
      description: `> **Order:** R01 (Marvelous, task 1 of 6)
> **Plan ID:** ICE-201 | **Assignee:** Marvelous | **Estimate:** 1 day
> **Depends on:** E01 (ICE-101), E02 (ICE-102)
> **Blocks:** R02, R03, R04, R05

## Goal
Build ICE's inbound webhook endpoint that receives all payment events from Nomba. Every incoming request must pass HMAC-SHA256 signature verification. Every transaction must be processed at most once using the transactionId as the natural idempotency key.

## Files

### Create
- \`src/routes/webhooks.routes.js\`
- \`src/controllers/webhooks.controller.js\`
- \`src/services/webhook-inbound.service.js\`
- \`src/lib/hmac.js\`
- \`tests/unit/hmac.test.js\`
- \`tests/integration/webhook-receiver.test.js\`

## Implementation

\`\`\`js
// src/lib/hmac.js
import crypto from 'crypto';

export const verify = (payload, signature, secret) => {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
};

// POST /v1/webhooks/nomba
// 1. Verify HMAC — reject with 401 if invalid
// 2. Check transactions table for existing transactionId — return 200 if duplicate (idempotent)
// 3. Store raw transaction with raw_payload JSONB
// 4. Dispatch to reconciliation engine
\`\`\`

## Tests
- [ ] Valid signature + new transaction: processed and 200 returned
- [ ] Invalid signature: 401 returned, nothing stored
- [ ] Duplicate transactionId: 200 returned immediately, not processed twice
- [ ] payment_failed event: stored with correct status, not reconciled

## Acceptance Criteria
- [ ] HMAC verification uses \`crypto.timingSafeEqual\` (not string equality)
- [ ] Duplicate transactions are no-ops
- [ ] Raw payload stored as JSONB
- [ ] payment_success, payment_failed, payment_reversal all handled

## PR
- **Branch:** \`feat/webhook-receiver\`
- **Commit:** \`feat(webhooks): inbound receiver, HMAC verification, idempotency\``
    },
    {
      key: "R02",
      title: "R02. [ICE-202] Invoice creation + state machine",
      assigneeId: null,
      estimate: 2,
      labelIds: [labelIds["backend"], labelIds["payments"], labelIds["phase-3-payments"]],
      projectMilestoneId: phase3,
      projectId,
      dependsOn: ["E05"],
      description: `> **Order:** R02 (Marvelous, task 2 of 6)
> **Plan ID:** ICE-202 | **Assignee:** Marvelous | **Estimate:** 1 day
> **Depends on:** E05 (ICE-105)
> **Blocks:** R03

## Goal
Vendors can create invoices linked to a customer and an expected amount. The invoice follows a strict state machine: draft → issued → partially_paid → paid → overpaid → refunded.

## Files

### Create
- \`src/routes/invoices.routes.js\`
- \`src/controllers/invoices.controller.js\`
- \`src/services/invoices.service.js\`
- \`src/repositories/invoices.repo.js\`
- \`src/schemas/invoices.schema.js\`
- \`tests/unit/invoices.service.test.js\`

## Implementation

\`\`\`js
// State machine — only valid transitions allowed
const TRANSITIONS = {
  draft: ['issued'],
  issued: ['partially_paid', 'paid', 'overpaid'],
  partially_paid: ['paid', 'overpaid'],
  paid: ['refunded'],
  overpaid: ['refunded'],
};

export const transition = (current, next) => {
  if (!TRANSITIONS[current]?.includes(next))
    throw new AppError(400, 'INVALID_TRANSITION', \\\`Cannot move from \\\${current} to \\\${next}\\\`);
};
\`\`\`

All amounts validated as positive integers (kobo). Invoice amount must be greater than zero.

## Tests
- [ ] Valid state transitions succeed
- [ ] Invalid transitions throw with INVALID_TRANSITION code
- [ ] Amount stored in kobo, not naira
- [ ] Invoice linked to correct vendor and customer

## Acceptance Criteria
- [ ] State machine enforced — no direct DB updates bypass it
- [ ] All amounts in kobo
- [ ] Invoice links to vendor + customer correctly

## PR
- **Branch:** \`feat/invoices\`
- **Commit:** \`feat(invoices): creation + state machine\``
    },
    {
      key: "R03",
      title: "R03. [ICE-203] Reconciliation engine — exact match + duplicate rejection",
      assigneeId: null,
      estimate: 2,
      labelIds: [labelIds["backend"], labelIds["payments"], labelIds["phase-3-payments"]],
      projectMilestoneId: phase3,
      projectId,
      dependsOn: ["R01", "R02"],
      description: `> **Order:** R03 (Marvelous, task 3 of 6)
> **Plan ID:** ICE-203 | **Assignee:** Marvelous | **Estimate:** 1 day
> **Depends on:** R01 (ICE-201), R02 (ICE-202)
> **Blocks:** R04, R05

## Goal
The core reconciliation engine receives a verified transaction and determines its outcome. This task covers the two cleanest scenarios: exact match (closes the invoice) and duplicate detection (rejects idempotently).

## Files

### Create
- \`src/services/reconciliation.service.js\`
- \`src/repositories/reconciliation.repo.js\`
- \`tests/unit/reconciliation.service.test.js\`

## Implementation

\`\`\`js
export const reconcile = async (transaction, deps) => {
  const invoice = await deps.invoices.findByVaNumber(transaction.va_number);

  // Duplicate check
  const existing = await deps.reconciliation.findByTransactionId(transaction.transaction_id);
  if (existing) return { status: 'DUPLICATE', action: 'rejected' };

  if (!invoice) return { status: 'UNMATCHED', action: 'flagged' };

  const received = transaction.amount_kobo;
  const expected = invoice.amount_kobo;

  if (received === expected) {
    await deps.invoices.transition(invoice.id, 'paid');
    await deps.reconciliation.log({
      transaction_id: transaction.transaction_id,
      invoice_id: invoice.id,
      status: 'EXACT_MATCH',
      expected_kobo: expected,
      received_kobo: received,
      difference_kobo: 0,
      action_taken: 'invoice_closed'
    });
    return { status: 'EXACT_MATCH' };
  }
  // overpayment + underpayment handled in R04
};
\`\`\`

## Tests
- [ ] Exact match closes invoice and logs EXACT_MATCH
- [ ] Duplicate transaction ID returns DUPLICATE without re-processing
- [ ] Reconciliation log entry created for every outcome

## Acceptance Criteria
- [ ] Exact match transitions invoice to \`paid\`
- [ ] Duplicate rejected without any state change
- [ ] \`reconciliation_logs\` entry created for every call

## PR
- **Branch:** \`feat/reconciliation-core\`
- **Commit:** \`feat(reconciliation): exact match + duplicate rejection\``
    },
    {
      key: "R04",
      title: "R04. [ICE-204] Reconciliation engine — overpayment + underpayment",
      assigneeId: null,
      estimate: 2,
      labelIds: [labelIds["backend"], labelIds["payments"], labelIds["phase-3-payments"]],
      projectMilestoneId: phase3,
      projectId,
      dependsOn: ["R03"],
      description: `> **Order:** R04 (Marvelous, task 4 of 6)
> **Plan ID:** ICE-204 | **Assignee:** Marvelous | **Estimate:** 1 day
> **Depends on:** R03 (ICE-203)
> **Blocks:** A04

## Goal
Extend the reconciliation engine to handle overpayments (flag invoice as overpaid, queue refund job) and underpayments (mark as partially paid, track outstanding balance).

## Files

### Edit
- \`src/services/reconciliation.service.js\`

### Create
- \`tests/unit/reconciliation-edge-cases.test.js\`

## Implementation

\`\`\`js
if (received > expected) {
  const difference = received - expected;
  await deps.invoices.transition(invoice.id, 'overpaid');
  await deps.invoices.update(invoice.id, { paid_amount_kobo: received });
  await deps.reconciliation.log({
    ...logBase, status: 'OVERPAYMENT', difference_kobo: difference, action_taken: 'refund_queued'
  });
  await deps.queues.refund.add({
    transaction_id: transaction.transaction_id,
    amount_kobo: difference,
    recipient_account: transaction.sender_account,
    recipient_bank_code: transaction.sender_bank_code
  });
  return { status: 'OVERPAYMENT', refund_queued: true, difference_kobo: difference };
}

if (received < expected) {
  const outstanding = expected - received;
  await deps.invoices.transition(invoice.id, 'partially_paid');
  await deps.invoices.update(invoice.id, { paid_amount_kobo: received });
  await deps.reconciliation.log({
    ...logBase, status: 'UNDERPAYMENT', difference_kobo: outstanding, action_taken: 'partial_recorded'
  });
  return { status: 'UNDERPAYMENT', outstanding_kobo: outstanding };
}
\`\`\`

## Tests
- [ ] Overpayment: invoice moves to \`overpaid\`, refund job queued with correct amount
- [ ] Underpayment: invoice moves to \`partially_paid\`, outstanding balance tracked
- [ ] Overpayment of 0 kobo (exact match) does not trigger refund

## Acceptance Criteria
- [ ] Overpayment queues refund job with correct difference amount
- [ ] Underpayment tracks outstanding balance correctly
- [ ] Both outcomes written to \`reconciliation_logs\`

## PR
- **Branch:** \`feat/reconciliation-edge-cases\`
- **Commit:** \`feat(reconciliation): overpayment + underpayment handling\``
    },
    {
      key: "R05",
      title: "R05. [ICE-205] Misdirected payment detection + platform owner alert",
      assigneeId: null,
      estimate: 2,
      labelIds: [labelIds["backend"], labelIds["payments"], labelIds["phase-4-extended"]],
      projectMilestoneId: phase4,
      projectId,
      dependsOn: ["R03", "A02"],
      description: `> **Order:** R05 (Marvelous, task 5 of 6)
> **Plan ID:** ICE-205 | **Assignee:** Marvelous | **Estimate:** 1 day
> **Depends on:** R03 (ICE-203), A02 (ICE-302)
> **Blocks:** R06

## Goal
When a payment arrives on a VA with no matching invoice or customer, ICE flags it as misdirected, stores it in the misdirected_payments table, and immediately notifies the platform owner via their configured webhook URL.

## Files

### Create
- \`src/services/misdirected.service.js\`
- \`src/repositories/misdirected.repo.js\`
- \`tests/unit/misdirected.service.test.js\`

### Edit
- \`src/routes/merchants.routes.js\` (add misdirected endpoints)

## Implementation

\`\`\`js
// When reconcile() returns status: 'UNMATCHED'
await deps.misdirected.create({
  merchant_id,
  va_number: transaction.va_number,
  amount_kobo: transaction.amount_kobo,
  sender_name: transaction.sender_name,
  raw_payload: transaction.raw_payload,
  status: 'PENDING_REVIEW',
});

// Queue outbound alert to merchant webhook
await deps.queues.webhookDelivery.add({
  merchant_id,
  event_type: 'payment.misdirected',
  payload: { va_number, amount_kobo, sender_name },
});

// GET /v1/payments/misdirected — paginated list
// POST /v1/payments/:id/match — manual match to invoice
\`\`\`

## Tests
- [ ] Unmatched payment stored in misdirected_payments
- [ ] Merchant webhook delivery queued immediately
- [ ] Manual match updates status to RESOLVED
- [ ] List endpoint returns only merchant's own misdirected payments

## Acceptance Criteria
- [ ] Misdirected payments stored with full sender details
- [ ] Merchant alerted via outbound webhook queue
- [ ] Manual match endpoint is audit-logged

## PR
- **Branch:** \`feat/misdirected-payments\`
- **Commit:** \`feat(reconciliation): misdirected payment detection + merchant alert\``
    },
    {
      key: "R06",
      title: "R06. [ICE-206] Manual payment match + mark-paid override + reconciliation log API",
      assigneeId: null,
      estimate: 1,
      labelIds: [labelIds["backend"], labelIds["payments"], labelIds["phase-4-extended"]],
      projectMilestoneId: phase4,
      projectId,
      dependsOn: ["R05"],
      description: `> **Order:** R06 (Marvelous, task 6 of 6)
> **Plan ID:** ICE-206 | **Assignee:** Marvelous | **Estimate:** 0.5 day
> **Depends on:** R05 (ICE-205)
> **Blocks:** F03

## Goal
Platform owners can manually override reconciliation status (mark an invoice as paid) and query the full reconciliation log. All manual overrides are audit-logged.

## Files

### Create
- \`tests/integration/reconciliation-api.test.js\`

### Edit
- \`src/routes/invoices.routes.js\`
- \`src/controllers/invoices.controller.js\`

## Implementation

\`\`\`js
// POST /v1/invoices/:id/mark-paid — master key only
await invoices.transition(id, 'paid');
await audit.log({
  actor_id: merchant.id,
  action: 'invoice.mark_paid',
  resource_type: 'invoice',
  resource_id: id,
  old_values: { status: invoice.status },
  new_values: { status: 'paid' }
});

// GET /v1/reconciliation/logs — paginated, filterable by status
// GET /v1/invoices/:id/reconciliation — single invoice reconciliation status
\`\`\`

## Tests
- [ ] mark-paid transitions invoice and creates audit log entry
- [ ] Vendor-scoped key cannot call mark-paid (403)
- [ ] Reconciliation logs filterable by EXACT_MATCH, OVERPAYMENT, UNDERPAYMENT, DUPLICATE, UNMATCHED

## Acceptance Criteria
- [ ] mark-paid requires master key
- [ ] Every override written to \`audit_logs\`
- [ ] Reconciliation log API supports status filter and pagination

## PR
- **Branch:** \`feat/reconciliation-api\`
- **Commit:** \`feat(reconciliation): manual override + log query API\``
    },

    // ═══════════════════════════════════════════════════════════════
    // DEV 3 — EMMANUEL (Async & Reporting) — A Series
    // ═══════════════════════════════════════════════════════════════
    {
      key: "A01",
      title: "A01. [ICE-301] Redis + BullMQ setup + base queue definitions",
      assigneeId: null,
      estimate: 1,
      labelIds: [labelIds["backend"], labelIds["async"], labelIds["phase-1-foundation"]],
      projectMilestoneId: phase1,
      projectId,
      dependsOn: ["E01"],
      description: `> **Order:** A01 (Emmanuel, task 1 of 6)
> **Plan ID:** ICE-301 | **Assignee:** Emmanuel | **Estimate:** 0.5 day
> **Depends on:** E01 (ICE-101)
> **Blocks:** A02, A03, A04

## Goal
Set up Redis connection and define all BullMQ queues and workers that the rest of the system depends on. Queue processors are empty at this stage — they get filled in by A02, A03, and A04.

## Files

### Create
- \`src/queues/index.js\`
- \`src/queues/webhook-delivery.queue.js\`
- \`src/queues/refund.queue.js\`
- \`src/workers/webhook-delivery.worker.js\`
- \`src/workers/refund.worker.js\`

## Implementation

\`\`\`js
// src/queues/index.js
import { Queue } from 'bullmq';
import { redis } from '../lib/redis.js';

export const webhookDeliveryQueue = new Queue('webhook-delivery', { connection: redis });
export const refundQueue = new Queue('refund', { connection: redis });

// Default job options — applied to all queues
const defaultJobOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 30_000 },
  removeOnComplete: 100,
  removeOnFail: 500,
};
\`\`\`

## Tests
- [ ] Redis connection established successfully
- [ ] Both queues initialise without errors
- [ ] /healthz confirms Redis is reachable (add to health check)

## Acceptance Criteria
- [ ] Redis connection in health check
- [ ] Both queues defined with correct default job options
- [ ] Workers boot without errors (even with empty processors)

## PR
- **Branch:** \`feat/queue-setup\`
- **Commit:** \`feat(queues): Redis + BullMQ setup, base queue definitions\``
    },
    {
      key: "A02",
      title: "A02. [ICE-302] Outbound webhook delivery queue + retry with exponential backoff",
      assigneeId: null,
      estimate: 2,
      labelIds: [labelIds["backend"], labelIds["async"], labelIds["phase-3-payments"]],
      projectMilestoneId: phase3,
      projectId,
      dependsOn: ["A01", "E04"],
      description: `> **Order:** A02 (Emmanuel, task 2 of 6)
> **Plan ID:** ICE-302 | **Assignee:** Emmanuel | **Estimate:** 1 day
> **Depends on:** A01 (ICE-301), E04 (ICE-104)
> **Blocks:** A03, R05

## Goal
Build the BullMQ worker that delivers ICE webhook events to merchant-configured URLs. Failed deliveries are retried up to 5 times with exponential backoff. Every attempt is logged in webhook_deliveries.

## Files

### Edit
- \`src/workers/webhook-delivery.worker.js\`

### Create
- \`src/repositories/webhook-deliveries.repo.js\`
- \`tests/unit/webhook-delivery.worker.test.js\`

## Implementation

\`\`\`js
// Retry schedule: 30s → 2min → 10min → 30min → dead-letter
worker.process(async (job) => {
  const { merchant_id, event_type, payload } = job.data;
  const merchant = await merchants.byId(merchant_id);

  const start = Date.now();
  const response = await fetch(merchant.webhook_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-ICE-Event': event_type },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000), // 10s timeout
  });

  await deliveries.log({
    merchant_id,
    event_type,
    payload,
    status: response.ok ? 'DELIVERED' : 'FAILED',
    http_status: response.status,
    retry_count: job.attemptsMade,
  });

  if (!response.ok) throw new Error(\\\`Delivery failed: \\\${response.status}\\\`);
});
\`\`\`

## Tests
- [ ] Successful delivery logged as DELIVERED
- [ ] Failed delivery retried — retry_count incremented each attempt
- [ ] Merchant with no webhook URL: job skipped gracefully
- [ ] 10-second timeout enforced

## Acceptance Criteria
- [ ] Every delivery attempt logged in \`webhook_deliveries\`
- [ ] Exponential backoff: 30s, 2m, 10m, 30m
- [ ] Timeout of 10 seconds per attempt

## PR
- **Branch:** \`feat/webhook-delivery-queue\`
- **Commit:** \`feat(queues): outbound webhook delivery + exponential backoff retry\``
    },
    {
      key: "A03",
      title: "A03. [ICE-303] Dead-letter handling + manual replay endpoint",
      assigneeId: null,
      estimate: 1,
      labelIds: [labelIds["backend"], labelIds["async"], labelIds["phase-3-payments"]],
      projectMilestoneId: phase3,
      projectId,
      dependsOn: ["A02"],
      description: `> **Order:** A03 (Emmanuel, task 3 of 6)
> **Plan ID:** ICE-303 | **Assignee:** Emmanuel | **Estimate:** 0.5 day
> **Depends on:** A02 (ICE-302)
> **Blocks:** F04

## Goal
Webhooks that exhaust all 5 retry attempts move to a dead-letter state. The merchant is alerted. Platform owners can manually replay any failed delivery from the API.

## Files

### Edit
- \`src/workers/webhook-delivery.worker.js\`
- \`src/repositories/webhook-deliveries.repo.js\`

### Create
- \`src/routes/webhook-deliveries.routes.js\`
- \`src/controllers/webhook-deliveries.controller.js\`

## Implementation

\`\`\`js
// BullMQ failed event handler
worker.on('failed', async (job, err) => {
  if (job.attemptsMade >= job.opts.attempts) {
    await deliveries.markDeadLetter(job.data.merchant_id, job.id);
    await webhookDeliveryQueue.add({
      merchant_id: job.data.merchant_id,
      event_type: 'system.webhook_dead_letter',
      payload: { failed_event: job.data.event_type, attempts: job.attemptsMade },
    });
  }
});

// POST /v1/webhook-deliveries/:id/replay
// Re-adds the job to the queue with fresh attempt counter
\`\`\`

## Tests
- [ ] Job exhausting all attempts marked as dead-letter
- [ ] Replay endpoint re-queues the delivery
- [ ] Dead-letter alert itself does not trigger another dead-letter loop

## Acceptance Criteria
- [ ] Dead-letter status visible in \`webhook_deliveries\` table
- [ ] Replay endpoint accessible to master key only
- [ ] Dead-letter loop prevention in place

## PR
- **Branch:** \`feat/dead-letter\`
- **Commit:** \`feat(queues): dead-letter handling + manual replay endpoint\``
    },
    {
      key: "A04",
      title: "A04. [ICE-304] Auto-refund engine — Nomba Transfer API integration",
      assigneeId: null,
      estimate: 2,
      labelIds: [labelIds["backend"], labelIds["async"], labelIds["payments"], labelIds["phase-4-extended"]],
      projectMilestoneId: phase4,
      projectId,
      dependsOn: ["A01", "R04"],
      description: `> **Order:** A04 (Emmanuel, task 4 of 6)
> **Plan ID:** ICE-304 | **Assignee:** Emmanuel | **Estimate:** 1 day
> **Depends on:** A01 (ICE-301), R04 (ICE-204)
> **Blocks:** F05

## Goal
Build the BullMQ worker that processes refund jobs queued by the reconciliation engine. Each job calls Nomba's \`POST /v2/transfers/bank\` to return the overpayment difference to the sender's bank account.

## Files

### Edit
- \`src/workers/refund.worker.js\`

### Create
- \`src/repositories/refunds.repo.js\`
- \`src/lib/nomba.js\` (add transfer function)
- \`tests/unit/refund.worker.test.js\`

## Implementation

\`\`\`js
// src/lib/nomba.js
export const transferToBank = async ({ amount, accountNumber, bankCode, narration }) => {
  const res = await fetch('https://api.nomba.com/v2/transfers/bank', {
    method: 'POST',
    headers: {
      Authorization: \\\`Bearer \\\${env.NOMBA_ACCESS_TOKEN}\\\`,
      accountId: env.NOMBA_ACCOUNT_ID
    },
    body: JSON.stringify({ amount, accountNumber, bankCode, narration }),
  });
  if (!res.ok) throw new Error(\\\`Nomba transfer failed: \\\${res.status}\\\`);
  return res.json();
};

// Refund worker
worker.process(async (job) => {
  const { transaction_id, amount_kobo, recipient_account, recipient_bank_code } = job.data;
  const amountNaira = amount_kobo / 100;
  const result = await nomba.transferToBank({
    amount: amountNaira,
    accountNumber: recipient_account,
    bankCode: recipient_bank_code,
    narration: \\\`ICE refund for transaction \\\${transaction_id}\\\`,
  });
  await refunds.update(transaction_id, { status: 'COMPLETED', nomba_transfer_ref: result.data.id });
  await webhookDeliveryQueue.add({ event_type: 'payment.overpayment.refunded', payload: { transaction_id, amount_kobo } });
});
\`\`\`

## Tests
- [ ] Successful Nomba transfer updates refund status to COMPLETED
- [ ] Nomba API failure retries up to 3 times
- [ ] Refund amount is correct difference (received minus expected)
- [ ] Merchant notified after successful refund

## Acceptance Criteria
- [ ] Refund amount in naira (kobo / 100) when calling Nomba
- [ ] Nomba transfer ref stored in refunds table
- [ ] Merchant webhook fired after successful refund

## PR
- **Branch:** \`feat/refund-engine\`
- **Commit:** \`feat(refunds): auto-refund engine via Nomba Transfer API\``
    },
    {
      key: "A05",
      title: "A05. [ICE-305] Statement + reporting API",
      assigneeId: null,
      estimate: 2,
      labelIds: [labelIds["backend"], labelIds["async"], labelIds["phase-4-extended"]],
      projectMilestoneId: phase4,
      projectId,
      dependsOn: ["R06"],
      description: `> **Order:** A05 (Emmanuel, task 5 of 6)
> **Plan ID:** ICE-305 | **Assignee:** Emmanuel | **Estimate:** 1 day
> **Depends on:** R06 (ICE-206)
> **Blocks:** F05

## Goal
Build the statement and reporting endpoints that give platform owners and vendors queryable visibility into their collections. All endpoints support date range filtering and pagination.

## Files

### Create
- \`src/routes/statements.routes.js\`
- \`src/controllers/statements.controller.js\`
- \`src/services/statements.service.js\`
- \`src/repositories/statements.repo.js\`
- \`tests/integration/statements.test.js\`

## Implementation

\`\`\`js
// GET /v1/vendors/:id/statement — full transaction history for a vendor
// GET /v1/vendors/:id/customers/:cid/statement — per-customer statement
// GET /v1/merchants/:id/summary — platform overview
// GET /v1/vendors/:id/transactions — paginated transaction list

// Summary endpoint returns:
{
  total_collected_kobo,
  reconciliation_rate_percent,   // exact matches / total transactions * 100
  total_vendors,
  active_vendors,
  misdirected_count,
  overpayment_count,
  refunds_issued_kobo,
}
\`\`\`

Vendor-scoped keys can only access their own statements. Master key can access all.

## Tests
- [ ] Vendor statement returns only that vendor's transactions
- [ ] Customer statement scoped to correct vendor + customer
- [ ] Summary reconciliation rate calculated correctly
- [ ] Date range filter works on all endpoints

## Acceptance Criteria
- [ ] Vendor key cannot access other vendor's statements
- [ ] All monetary values returned in kobo
- [ ] Reconciliation rate calculated correctly

## PR
- **Branch:** \`feat/statements\`
- **Commit:** \`feat(reporting): statement and summary endpoints\``
    },
    {
      key: "A06",
      title: "A06. [ICE-306] Dormant account cron + payment anomaly detection",
      assigneeId: null,
      estimate: 2,
      labelIds: [labelIds["backend"], labelIds["async"], labelIds["phase-4-extended"]],
      projectMilestoneId: phase4,
      projectId,
      dependsOn: ["A01", "R01"],
      description: `> **Order:** A06 (Emmanuel, task 6 of 6)
> **Plan ID:** ICE-306 | **Assignee:** Emmanuel | **Estimate:** 1 day
> **Depends on:** A01 (ICE-301), R01 (ICE-201)
> **Blocks:** Nothing downstream

## Goal
A daily cron suspends VAs with no payments in 90 days. A lightweight anomaly detector flags suspicious payment patterns and alerts the merchant.

## Files

### Create
- \`src/jobs/dormant-account.cron.js\`
- \`src/services/anomaly.service.js\`
- \`tests/unit/anomaly.service.test.js\`

## Implementation

\`\`\`js
// Dormant cron — runs daily at 02:00
// Fetches all VAs with last_transaction_at < 90 days ago
// Calls Nomba suspend for each, updates va_status = 'DORMANT'

// Anomaly detection — runs on every inbound transaction
const rules = [
  { name: 'velocity_spike', check: async (tx) => await countRecentPayments(tx.va_number, 10) > 5 },
  { name: 'duplicate_sender', check: async (tx) => await hasDuplicateSender(tx.sender_account, tx.amount_kobo, 5) },
  { name: 'dormant_account_payment', check: async (tx) => await isVaSuspended(tx.va_number) },
];
\`\`\`

## Tests
- [ ] VA with no payments in 91 days gets suspended
- [ ] VA with payment 89 days ago is not suspended
- [ ] Velocity spike (6 payments in 10 min) triggers alert
- [ ] Dormant account receiving payment triggers misdirected flag

## Acceptance Criteria
- [ ] Cron gated by \`SCHEDULER_ENABLED\` env var
- [ ] Each VA suspended at most once per cron run
- [ ] Anomaly alerts queued to merchant webhook

## PR
- **Branch:** \`feat/cron-anomaly\`
- **Commit:** \`feat(jobs): dormant account cron + anomaly detection\``
    },

    // ═══════════════════════════════════════════════════════════════
    // DEV 4 — SAMKIEL (Frontend) — F Series
    // ═══════════════════════════════════════════════════════════════
    {
      key: "F01",
      title: "F01. [ICE-401] Next.js scaffold + Tailwind + API client + base layout",
      assigneeId: null,
      estimate: 1,
      labelIds: [labelIds["frontend"], labelIds["phase-1-foundation"]],
      projectMilestoneId: phase1,
      projectId,
      dependsOn: ["E01"],
      description: `> **Order:** F01 (Samkiel, task 1 of 6)
> **Plan ID:** ICE-401 | **Assignee:** Samkiel | **Estimate:** 0.5 day
> **Depends on:** E01 (ICE-101)
> **Blocks:** F02, F03, F04, F05, F06

## Goal
Bootstrap the Next.js dashboard app with Tailwind CSS, a typed API client utility that talks to ICE's backend, and a shared base layout with navigation for both platform owner and vendor views.

## Files

### Create
- \`dashboard/\` (Next.js app root)
- \`dashboard/lib/api.js\`
- \`dashboard/components/Layout.jsx\`
- \`dashboard/components/Sidebar.jsx\`
- \`dashboard/pages/index.jsx\`

## Implementation

\`\`\`js
// dashboard/lib/api.js — typed API client
const BASE = process.env.NEXT_PUBLIC_API_URL;

export const api = {
  get: (path, key) => fetch(\\\`\\\${BASE}\\\${path}\\\`, {
    headers: { Authorization: \\\`Bearer \\\${key}\\\` }
  }).then(r => r.json()),
  post: (path, body, key) => fetch(\\\`\\\${BASE}\\\${path}\\\`, {
    method: 'POST',
    headers: { Authorization: \\\`Bearer \\\${key}\\\`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(r => r.json()),
};
\`\`\`

Two sidebar variants: platform owner (sees all vendors, summary, misdirected) and vendor (sees own transactions, statements).

## Acceptance Criteria
- [ ] \`npm run dev\` boots at localhost:3000
- [ ] API client handles 401 and redirects to login
- [ ] Both sidebar variants render without errors

## PR
- **Branch:** \`feat/dashboard-scaffold\`
- **Commit:** \`feat(dashboard): Next.js scaffold, Tailwind, API client, base layout\``
    },
    {
      key: "F02",
      title: "F02. [ICE-402] Merchant onboarding UI + vendor creation UI",
      assigneeId: null,
      estimate: 2,
      labelIds: [labelIds["frontend"], labelIds["phase-2-entities"]],
      projectMilestoneId: phase2,
      projectId,
      dependsOn: ["F01", "E03", "E05", "E06"],
      description: `> **Order:** F02 (Samkiel, task 2 of 6)
> **Plan ID:** ICE-402 | **Assignee:** Samkiel | **Estimate:** 1 day
> **Depends on:** F01 (ICE-401), E03 (ICE-103), E05 (ICE-105), E06 (ICE-106)
> **Blocks:** F03

## Goal
Platform owners can register on ICE, receive and store their API key, and create vendors. The returned VA number is displayed immediately after vendor creation.

## Files

### Create
- \`dashboard/pages/register.jsx\`
- \`dashboard/pages/vendors/index.jsx\`
- \`dashboard/pages/vendors/new.jsx\`
- \`dashboard/components/ApiKeyDisplay.jsx\`

## Implementation
Registration page calls \`POST /v1/merchants/register\` and shows the API key in a copy-to-clipboard component with a clear warning that it will never be shown again. Vendor creation form calls \`POST /v1/vendors\` and displays the returned Nomba VA number (bank name + account number) immediately on success.

## Acceptance Criteria
- [ ] API key shown once with copy button and "save this now" warning
- [ ] Vendor creation shows VA number on success
- [ ] Forms show validation errors inline

## PR
- **Branch:** \`feat/onboarding-ui\`
- **Commit:** \`feat(dashboard): merchant registration + vendor creation UI\``
    },
    {
      key: "F03",
      title: "F03. [ICE-403] Reconciliation feed — live transaction list + status badges",
      assigneeId: null,
      estimate: 2,
      labelIds: [labelIds["frontend"], labelIds["phase-3-payments"]],
      projectMilestoneId: phase3,
      projectId,
      dependsOn: ["F02", "R06"],
      description: `> **Order:** F03 (Samkiel, task 3 of 6)
> **Plan ID:** ICE-403 | **Assignee:** Samkiel | **Estimate:** 1 day
> **Depends on:** F02 (ICE-402), R06 (ICE-206)
> **Blocks:** F04

## Goal
The main dashboard view shows a live feed of all incoming transactions with their reconciliation status. Each status has a distinct colour-coded badge. Platform owners see all vendors; vendors see only their own.

## Files

### Create
- \`dashboard/pages/transactions/index.jsx\`
- \`dashboard/components/ReconciliationBadge.jsx\`
- \`dashboard/components/TransactionTable.jsx\`

## Implementation
Status badge colours:
- **EXACT_MATCH** — green
- **OVERPAYMENT** — amber
- **UNDERPAYMENT** — orange
- **MISDIRECTED** — red
- **DUPLICATE** — gray
- **REFUNDED** — blue

Table polls \`GET /v1/vendors/:id/transactions\` every 10 seconds. Clicking a row shows full transaction detail including raw sender info and reconciliation log entry.

## Acceptance Criteria
- [ ] All 6 reconciliation statuses have distinct badges
- [ ] Table auto-refreshes every 10 seconds
- [ ] Row click shows full transaction detail

## PR
- **Branch:** \`feat/reconciliation-feed\`
- **Commit:** \`feat(dashboard): reconciliation feed + status badges\``
    },
    {
      key: "F04",
      title: "F04. [ICE-404] Webhook delivery log UI + manual replay button",
      assigneeId: null,
      estimate: 2,
      labelIds: [labelIds["frontend"], labelIds["phase-3-payments"]],
      projectMilestoneId: phase3,
      projectId,
      dependsOn: ["F03", "A03"],
      description: `> **Order:** F04 (Samkiel, task 4 of 6)
> **Plan ID:** ICE-404 | **Assignee:** Samkiel | **Estimate:** 1 day
> **Depends on:** F03 (ICE-403), A03 (ICE-303)
> **Blocks:** F05

## Goal
Merchants can see the full history of outbound webhook deliveries — every attempt, its HTTP status code, and latency. Dead-letter events are highlighted and can be replayed with a single button.

## Files

### Create
- \`dashboard/pages/webhooks/index.jsx\`
- \`dashboard/components/WebhookDeliveryLog.jsx\`
- \`dashboard/components/DeadLetterAlert.jsx\`

## Implementation
Table shows: event type, attempt number, HTTP status, latency, timestamp, delivery status. Dead-letter rows highlighted in red with a Replay button that calls \`POST /v1/webhook-deliveries/:id/replay\`. A banner at the top of the page shows the count of pending dead-letter events if any exist.

## Acceptance Criteria
- [ ] Dead-letter events visually distinct from failed-but-retrying events
- [ ] Replay button triggers re-queue and shows success toast
- [ ] Latency shown in milliseconds

## PR
- **Branch:** \`feat/webhook-log-ui\`
- **Commit:** \`feat(dashboard): webhook delivery log + dead-letter replay UI\``
    },
    {
      key: "F05",
      title: "F05. [ICE-405] Vendor dashboard — transactions, statements, customer view",
      assigneeId: null,
      estimate: 2,
      labelIds: [labelIds["frontend"], labelIds["phase-4-extended"]],
      projectMilestoneId: phase4,
      projectId,
      dependsOn: ["F04", "A05"],
      description: `> **Order:** F05 (Samkiel, task 5 of 6)
> **Plan ID:** ICE-405 | **Assignee:** Samkiel | **Estimate:** 1 day
> **Depends on:** F04 (ICE-404), A05 (ICE-305)
> **Blocks:** F06

## Goal
The vendor-scoped dashboard gives vendors full visibility into their own collections: their VA details, transaction history, customer statements, and outstanding balances.

## Files

### Create
- \`dashboard/pages/vendor/index.jsx\`
- \`dashboard/pages/vendor/customers/index.jsx\`
- \`dashboard/pages/vendor/customers/[id].jsx\`
- \`dashboard/components/StatCard.jsx\`

## Implementation
Vendor home shows: VA number (copyable), total collected this month, reconciliation rate, outstanding balance. Customer list shows each customer with their last payment date and total paid. Clicking a customer shows their full statement with all transactions and reconciliation outcomes.

## Acceptance Criteria
- [ ] VA number displayed and copyable
- [ ] Reconciliation rate displayed as percentage
- [ ] Customer statement shows all transactions in date order

## PR
- **Branch:** \`feat/vendor-dashboard\`
- **Commit:** \`feat(dashboard): vendor view — transactions, statements, customer detail\``
    },
    {
      key: "F06",
      title: "F06. [ICE-406] Platform owner dashboard — summary metrics + misdirected payments panel",
      assigneeId: null,
      estimate: 2,
      labelIds: [labelIds["frontend"], labelIds["phase-4-extended"]],
      projectMilestoneId: phase4,
      projectId,
      dependsOn: ["F05", "R05", "A05"],
      description: `> **Order:** F06 (Samkiel, task 6 of 6)
> **Plan ID:** ICE-406 | **Assignee:** Samkiel | **Estimate:** 1 day
> **Depends on:** F05 (ICE-405), R05 (ICE-205), A05 (ICE-305)
> **Blocks:** Nothing downstream

## Goal
The platform owner dashboard gives a bird's eye view of the entire operation: summary metrics across all vendors, misdirected payments pending review, refund status tracking, and anomaly alerts.

## Files

### Create
- \`dashboard/pages/owner/index.jsx\`
- \`dashboard/pages/owner/misdirected.jsx\`
- \`dashboard/components/MisdirectedPaymentCard.jsx\`
- \`dashboard/components/SummaryMetrics.jsx\`

## Implementation
Summary section shows: total collected across all vendors, overall reconciliation rate, number of active vendors, total refunds issued, pending misdirected payments count. Misdirected payments panel lists each flagged payment with sender name, amount, VA number, and two action buttons: Match to Invoice and Initiate Refund.

## Acceptance Criteria
- [ ] Summary metrics pulled from \`GET /v1/merchants/:id/summary\`
- [ ] Misdirected payments show full sender details
- [ ] Match and Refund actions call correct API endpoints and refresh the list on success

## PR
- **Branch:** \`feat/owner-dashboard\`
- **Commit:** \`feat(dashboard): platform owner summary + misdirected payments panel\``
    },
  ];
}

// ─── Step 5: Create all issues ──────────────────────────────────
async function createIssues(tasks) {
  console.log("\n📝 Creating 24 issues...");
  const issueMap = {}; // key -> { id, identifier }

  for (const task of tasks) {
    const input = {
      title: task.title,
      description: task.description,
      teamId: TEAM_ID,
      stateId: TODO_STATE_ID,
      estimate: task.estimate,
      labelIds: task.labelIds,
      projectId: task.projectId,
      projectMilestoneId: task.projectMilestoneId,
      priority: 2, // High
    };

    if (task.assigneeId) {
      input.assigneeId = task.assigneeId;
    }

    const data = await gql(`
      mutation($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue { id identifier title }
        }
      }
    `, { input });

    const issue = data.issueCreate.issue;
    issueMap[task.key] = { id: issue.id, identifier: issue.identifier };
    console.log(`   ✅ ${issue.identifier} — ${task.key}. ${task.title.split('] ')[1] || task.title}`);

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 200));
  }

  return issueMap;
}

// ─── Step 6: Create dependency relations ────────────────────────
async function createDependencies(tasks, issueMap) {
  console.log("\n🔗 Setting up dependencies...");
  let count = 0;

  for (const task of tasks) {
    if (!task.dependsOn || task.dependsOn.length === 0) continue;

    for (const depKey of task.dependsOn) {
      if (!issueMap[depKey] || !issueMap[task.key]) continue;

      try {
        await gql(`
          mutation($input: IssueRelationCreateInput!) {
            issueRelationCreate(input: $input) {
              success
              issueRelation { id type }
            }
          }
        `, {
          input: {
            issueId: issueMap[task.key].id,
            relatedIssueId: issueMap[depKey].id,
            type: "blocks",
          }
        });
        count++;
        console.log(`   🔗 ${issueMap[depKey].identifier} blocks ${issueMap[task.key].identifier}`);
        await new Promise(r => setTimeout(r, 150));
      } catch (err) {
        console.error(`   ❌ Failed: ${depKey} → ${task.key}: ${err.message}`);
      }
    }
  }
  console.log(`   ✅ ${count} dependencies created`);
}

// ─── Main ───────────────────────────────────────────────────────
async function main() {
  console.log("🧊 ICE — Nomba Hackathon: Linear Issue Creator");
  console.log("═══════════════════════════════════════════════");

  // Step 1: Create project
  const projectId = await createProject();

  // Step 2: Create labels
  const labelIds = await createLabels();

  // Step 3: Create milestones
  const milestoneIds = await createMilestones(projectId);

  // Step 4: Define tasks
  const tasks = defineAllTasks(labelIds, milestoneIds, projectId);

  // Step 5: Create all issues
  const issueMap = await createIssues(tasks);

  // Step 6: Create dependencies
  await createDependencies(tasks, issueMap);

  // Summary
  console.log("\n═══════════════════════════════════════════════");
  console.log("🎉 DONE! All 24 issues created in Linear.");
  console.log("");
  console.log("📋 Issue Map:");
  for (const [key, val] of Object.entries(issueMap)) {
    console.log(`   ${key} → ${val.identifier}`);
  }
  console.log("");
  console.log("⚠️  Marvelous, Emmanuel, and Samkiel need to be invited to the");
  console.log("   Linear workspace, then their issues can be assigned to them.");
  console.log("");
  console.log("🔗 Open Linear: https://linear.app");
}

main().catch(err => {
  console.error("\n💥 Fatal error:", err.message);
  process.exit(1);
});
