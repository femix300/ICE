# ICE

## **Infrastructure for Collections & Exchange**

_The icing on the cake for Nomba's Virtual Account ecosystem._

| | |
|---|---|
| **Hackathon** | Nomba Hackathon 2026 |
| **Track** | Infrastructure — Dedicated Virtual Account Systems |
| **Team** | Peter Ajimoti (Lead), Marvelous (Payments), Emmanuel (Async), Samkiel (Frontend) |
| **Version** | 1.2 — June 29, 2026 |
| **Deployment** | Render / Railway |
| **Primary DB** | PostgreSQL + Redis (BullMQ) |
| **Language** | TypeScript (strict mode) |
| **Frontend** | Next.js + Tailwind CSS |

> **Companion Doc:** See [ICE_ENGINEERING.md](./ICE_ENGINEERING.md) for Git Workflow, Coding Standards, and Definition of Done.

---

## **Table of Contents**

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Product Vision & Positioning](#3-product-vision--positioning)
4. [Target Users & Personas](#4-target-users--personas)
5. [System Architecture](#5-system-architecture)
   - 5.1 Two-Tier Merchant Model
   - 5.2 High-Level Architecture
   - 5.3 Technology Stack
6. [Core Features (MVP)](#6-core-features-mvp-scope)
   - 6.1 Account Provisioning Flow
   - 6.2 Inbound Transfer Reconciliation
   - 6.3 Customer-Level Statement & Reporting
   - 6.4 Handling of Misdirected Payments
   - 6.5 Clean Developer API
7. [Additional Infrastructure Features](#7-additional-infrastructure-features)
   - 7.1 Webhook Reliability Layer
   - 7.2 Overpayment & Auto-Refund Engine
   - 7.3 Payment Anomaly Detection
   - 7.4 Dormant Account Management
8. [Engineering Standards](#8-engineering-standards)
   - 8.1 Project Structure
   - 8.2 Layered Architecture
   - 8.3 Factory Pattern
   - 8.4 Response Envelope
   - 8.5 Input Validation
   - 8.6 Git Convention
   - 8.7 What We Deliberately Skipped
9. [Security Model](#9-security-model)
10. [Database Schema](#10-database-schema-core-tables)
11. [Team Structure & Build Timeline](#11-team-structure--build-timeline)
12. [Demo Day Narrative](#12-demo-day-narrative)
13. [Out of Scope](#13-out-of-scope-deliberate-cuts)
14. [Success Metrics](#14-success-metrics)

---

## **1. Executive Summary**

_Nomba gives you virtual accounts and a webhook. ICE gives you the infrastructure that makes them actually work for your business._

Nigerian SMEs and marketplace platforms today face a painful gap: payment infrastructure that stops at the webhook. When a customer pays, the fintech's job is done — but the merchant's nightmare is just beginning. Who paid? Did they pay the right amount? What if they overpaid? Why didn't the webhook arrive? These questions cost merchants time, money, and customers.

ICE is a production-grade middleware infrastructure layer built on top of Nomba's Dedicated Virtual Account (DVA) APIs. It abstracts Nomba's raw primitives into a multi-tenant, developer-friendly platform that marketplace operators and their vendors can integrate in minutes — not days.

ICE is not just an API wrapper. It is the operational intelligence layer that sits between Nomba and the real world: reconciling payments automatically, handling overpayments and underpayments, retrying failed webhooks with exponential backoff, detecting payment anomalies, and giving every stakeholder a clear, real-time view of their money.

---

## **2. Problem Statement**

### **The Gap in the Market**

Every major Nigerian fintech (Paystack, Flutterwave, SeerBit) offers dedicated virtual accounts. But they all share the same fundamental limitation: they give you the account and the webhook, then leave you to figure out the rest.

| **Pain Point** | **Current State** | **Impact** |
|---|---|---|
| Manual reconciliation | Merchants match payments to invoices by hand | Hours of admin work, frequent errors |
| Overpayment handling | Paystack explicitly says "no refunds on DVAs" | Customer money sits indefinitely |
| Webhook unreliability | No retry mechanism; missed webhooks = missed revenue | Orders not fulfilled |
| Misdirected payments | No system to detect or handle wrong-account payments | Merchant confusion |
| Zero visibility | No dashboard for account health or payment anomalies | Blind spots in cash flow |
| Integration complexity | SMEs must build reconciliation logic themselves | Weeks of engineering time |

### **Why the E-Commerce Marketplace is the Sharpest Lens**

A multi-vendor marketplace amplifies every one of these problems. The platform owner needs to route payments to the right vendor. Each vendor needs to track their own collections. Customers need confidence their payment landed correctly. ICE solves all three layers simultaneously — making it the ideal demo scenario and the most compelling infrastructure story.

---

## **3. Product Vision & Positioning**

| **Without ICE** | **With ICE** |
|---|---|
| Nomba gives you a VA and a webhook | ICE gives you reconciliation, reliability, and reporting |
| Overpayments stay unresolved indefinitely | ICE auto-detects and queues refunds in under 5 minutes |
| Missed webhooks = missed revenue | ICE retries 5x with exponential backoff + dead-letter alerts |
| Merchants build reconciliation logic themselves | ICE API integration takes under 10 minutes |
| No anomaly detection | ICE flags suspicious payment patterns before merchants notice |

---

## **4. Target Users & Personas**

### **Persona 1 — The Marketplace Platform Owner (Primary API Consumer)**

- Runs a multi-vendor e-commerce platform (think: Jumia, Konga, or a niche Nigerian marketplace)
- Needs to issue each vendor their own collection account
- Wants a unified view of all vendor payments and reconciliation status
- Integrates ICE via REST API using a master API key
- Pain: manually routing payments to vendors, no visibility into failed webhooks

### **Persona 2 — The Vendor (Secondary Consumer)**

- A seller on the marketplace — can be a small business, artisan, or individual
- Receives a dedicated VA through ICE, issued by the platform owner on their behalf
- Can log into ICE's vendor dashboard to see their own transactions and reconciliation status
- May optionally issue customer-level VAs for their own buyers
- Pain: doesn't know if a customer has paid; no automated receipt or order trigger

### **Persona 3 — The End Customer (Payer)**

- Pays into a vendor's VA via bank transfer from any Nigerian bank
- Expects instant confirmation and order processing
- Pain: pays wrong amount, or payment is never acknowledged

---

## **5. System Architecture**

### **5.1 Two-Tier Merchant Model**

ICE supports a nested hierarchy: Platform Owners sit at the top and manage Vendors beneath them. Each Vendor can operate independently with their own VA and optionally issue customer-level VAs.

| **Tier** | **Role** | **API Access** | **Dashboard** |
|---|---|---|---|
| Platform Owner | Registers on ICE, onboards vendors, views all activity | Master API key (full scope) | Full platform dashboard |
| Vendor | Collects payments via their own VA | Scoped vendor API key | Vendor-specific view |
| Customer | Pays into vendor or customer-level VA | None (payer only) | None |

### **5.2 High-Level Architecture**

ICE is a stateless Node.js + Express API (TypeScript) backed by PostgreSQL for persistence and Redis for caching and async job queues. All Nomba API calls happen server-side. Merchants never touch Nomba directly.

```
CLIENT LAYER
├── Platform Dashboard (Next.js)
├── Vendor Dashboard (Next.js)
└── Merchant REST API

API GATEWAY LAYER
├── Rate Limiting
├── API Key Auth (per tier)
└── Input Validation (Zod)

APPLICATION LAYER
├── Merchant & Vendor Mgmt
├── DVA Provisioning
├── Reconciliation Engine
├── Webhook Processor
├── Refund Engine
├── Anomaly Detection
├── Statement & Reporting
└── Dormant Cleanup (cron)

DATA & QUEUE LAYER
├── PostgreSQL (Primary DB)
└── Redis + BullMQ (Queues & Cache)

EXTERNAL INTEGRATIONS
├── Nomba VA API
├── Nomba Transfer API
└── Nomba Webhooks (Inbound)
```

### **5.3 Technology Stack**

| **Layer** | **Technology** | **Justification** |
|---|---|---|
| Language | TypeScript (strict mode) | Type safety for financial code; `noUncheckedIndexedAccess` prevents silent `undefined` on money fields; `z.infer` derives types from Zod schemas for free |
| API Server | Node.js + Express | Team comfort, great async support, rich fintech ecosystem |
| Database | PostgreSQL | ACID compliance, JSONB for raw payloads, mature and reliable |
| Cache & Queues | Redis + BullMQ | Fast caching for merchant configs; reliable async queues for webhooks & refunds |
| Frontend | Next.js + Tailwind CSS | Server-side rendering, file-based routing, responsive dashboard with minimal dev allocation |
| Logger | pino | Structured JSON logging with `createLogger(serviceName)` factory; pino-pretty for dev |
| Testing | vitest | Fast, TypeScript-native test runner; `npm test` / `npm run test:watch` |
| Formatting | Prettier | Zero-config code formatting; consistent style across all 4 devs |
| Linting | ESLint + typescript-eslint | Catches type errors and bad patterns that TypeScript alone misses |
| Dev Runner | tsx | Zero-config TypeScript execution; `tsx watch src/server.ts` for hot reload |
| Deployment | Render / Railway | Simple deploy, managed PostgreSQL & Redis, no DevOps overhead |
| Monitoring | Sentry + UptimeRobot | Error tracking + uptime alerts for demo-day reliability |
| API Docs | Swagger / OpenAPI 3.0 | Auto-generated interactive docs from route definitions |

---

## **6. Core Features (MVP Scope)**

The following features map directly to the Nomba hackathon's mandatory requirements for the DVA Infrastructure Track. All features are scoped to what Nomba's API actually supports.

### **6.1 Account Provisioning Flow**

_Covers hackathon requirement: Account provisioning flow._

#### **Platform Owner Onboarding**

| **Endpoint** | **Method** | **Description** |
|---|---|---|
| `POST /v1/merchants/register` | POST | Register a platform owner; returns master API key |
| `GET /v1/merchants/:id` | GET | Fetch merchant profile and settings |
| `PUT /v1/merchants/:id/webhook-url` | PUT | Configure the merchant's ICE webhook URL (HTTPS only) |
| `POST /v1/merchants/:id/api-keys/rotate` | POST | Rotate master API key (old key invalidated immediately) |

#### **Vendor Onboarding & DVA Provisioning**

| **Endpoint** | **Method** | **Description** |
|---|---|---|
| `POST /v1/vendors` | POST | Platform owner creates a vendor; ICE provisions a DVA via Nomba |
| `GET /v1/vendors/:id` | GET | Fetch vendor profile + their DVA details |
| `POST /v1/vendors/:id/api-keys` | POST | Generate a scoped vendor API key |
| `PUT /v1/vendors/:id/account` | PUT | Update vendor DVA name or callback URL |
| `POST /v1/vendors/:id/account/suspend` | POST | Suspend vendor DVA (calls Nomba suspend endpoint) |
| `GET /v1/vendors` | GET | List all vendors for a platform (paginated, filterable) |

#### **Customer-Level DVA (Optional — Vendor-Controlled)**

| **Endpoint** | **Method** | **Description** |
|---|---|---|
| `POST /v1/vendors/:id/customers` | POST | Vendor creates a customer; optionally provisions a customer-level DVA |
| `GET /v1/vendors/:id/customers/:cid` | GET | Fetch customer profile + DVA (if provisioned) |
| `POST /v1/vendors/:id/customers/:cid/account` | POST | Explicitly provision a customer-level DVA on demand |

_Key Design Decision: ICE intentionally does NOT set Nomba's `expectedAmount` on VAs. Nomba's exact-match restriction would reject any payment differing by even 1 kobo. ICE handles reconciliation logic in-house, giving merchants far more flexibility._

### **6.2 Inbound Transfer Reconciliation**

_Covers hackathon requirement: Inbound transfer reconciliation._

When a payment hits a Nomba virtual account, Nomba fires a `payment_success` webhook to ICE's inbound endpoint. ICE's Reconciliation Engine takes over from there.

| **Scenario** | **Condition** | **ICE Action** |
|---|---|---|
| Exact Match | `transactionAmount == expectedAmount` | Mark invoice PAID; trigger merchant webhook |
| Overpayment | `transactionAmount > expectedAmount` | Mark invoice OVERPAID; queue auto-refund for the difference |
| Underpayment | `transactionAmount < expectedAmount` | Mark PARTIALLY_PAID; log balance; notify merchant |
| Duplicate Payment | `transactionId` already seen | Reject idempotently; log duplicate; alert merchant |
| Unmatched Payment | No invoice/customer linked to VA | Flag as MISDIRECTED; alert platform owner; hold for review |

| **Endpoint** | **Method** | **Description** |
|---|---|---|
| `POST /v1/webhooks/nomba` | POST | ICE's inbound Nomba webhook receiver (HMAC-SHA256 verified) |
| `GET /v1/invoices/:id/reconciliation` | GET | Real-time reconciliation status for an invoice |
| `POST /v1/invoices/:id/mark-paid` | POST | Manual override (platform owner only; audit-logged) |
| `GET /v1/reconciliation/logs` | GET | Paginated reconciliation log (filterable by status) |

### **6.3 Customer-Level Statement & Reporting**

_Covers hackathon requirement: Customer-level statement and reporting._

Every transaction, reconciliation event, and webhook delivery is stored against the originating customer and vendor. ICE provides queryable statements at every level of the hierarchy.

| **Endpoint** | **Method** | **Description** |
|---|---|---|
| `GET /v1/vendors/:id/statement` | GET | Full transaction statement for a vendor (date range, status filter) |
| `GET /v1/vendors/:id/customers/:cid/statement` | GET | Per-customer statement for a vendor |
| `GET /v1/merchants/:id/summary` | GET | Platform-level summary: total collected, reconciliation rate, anomaly count |
| `GET /v1/transactions/:id` | GET | Single transaction detail including raw Nomba payload |
| `GET /v1/vendors/:id/transactions` | GET | Paginated transaction list for a vendor |

### **6.4 Handling of Misdirected Payments**

_Covers hackathon requirement: Handling of misdirected payments._

A misdirected payment is any inbound transfer ICE cannot match to a known customer, vendor, or invoice — due to closed accounts still receiving transfers, typos in account numbers, or test payments that slip through.

**Misdirected Payment Flow:**

1. ICE receives `payment_success` webhook from Nomba
2. Reconciliation engine looks up the VA's `accountRef` in the database
3. If no active customer, vendor, or invoice is found: payment is flagged as `MISDIRECTED`
4. Platform owner is immediately notified via their configured webhook URL
5. Payment is logged with full sender details (name, account, bank code)
6. Platform owner can manually match the payment or initiate a refund via ICE's Transfer Engine

| **Endpoint** | **Method** | **Description** |
|---|---|---|
| `GET /v1/payments/misdirected` | GET | List all misdirected payments for merchant (paginated) |
| `POST /v1/payments/:id/match` | POST | Manually match a misdirected payment to a customer/invoice |
| `POST /v1/payments/:id/refund` | POST | Initiate refund for a misdirected payment (Nomba Transfer API) |

### **6.5 Clean Developer API for Downstream Integration**

_Covers hackathon requirement: Clean developer API for downstream integration._

#### **Standard Response Envelope**

Every response from ICE follows the same JSON shape — success or failure:

```json
// Success
{ "ok": true, "data": { ... }, "requestId": "ice_01J..." }

// Error
{
  "ok": false,
  "error_code": "OVERPAYMENT_DETECTED",
  "message": "Payment exceeds invoice amount by N500",
  "docs_link": "https://docs.ice.dev/errors/OVERPAYMENT_DETECTED"
}
```

| **Feature** | **Description** |
|---|---|
| OpenAPI 3.0 Spec | Auto-generated interactive Swagger UI at `/docs` |
| API Versioning | All endpoints prefixed with `/v1/` for forward compatibility |
| Idempotency Keys | POST requests accept `X-Idempotency-Key` header to prevent duplicate operations |
| Sandbox Mode | Separate sandbox environment connected to Nomba's sandbox (max ₦150 per test VA) |
| Structured Errors | Every error includes `error_code`, human-readable message, and docs link |
| Health Check | `GET /healthz` returns API status, DB connectivity, Redis status, Nomba API reachability |

---

## **7. Additional Infrastructure Features**

### **7.1 Webhook Reliability Layer**

When ICE delivers webhooks to merchant endpoints, it guarantees reliability through a multi-stage retry system built on BullMQ.

| **Attempt** | **Delay** | **On Final Failure** |
|---|---|---|
| 1 | Immediate | |
| 2 | 30 seconds | |
| 3 | 2 minutes | |
| 4 | 10 minutes | |
| 5 | 30 minutes | Move to dead-letter queue; alert merchant |

Every delivery attempt is logged: HTTP status code, response body, latency, and timestamp. Merchants can view their full webhook delivery log in the dashboard and manually replay any failed event.

### **7.2 Overpayment & Auto-Refund Engine**

When ICE detects an overpayment, it does not leave the money sitting — it takes action automatically.

1. Overpayment detected by reconciliation engine
2. Refund job queued in BullMQ with: amount difference, sender account number, sender bank code (from Nomba webhook payload)
3. ICE calls Nomba's `POST /v2/transfers/bank` to initiate the refund transfer
4. Refund status tracked in `refunds` table with retry logic (max 3 attempts)
5. Merchant notified via webhook event: `payment.overpayment.refunded`

_Competitive Edge: Paystack explicitly states "no refunds on dedicated virtual accounts." ICE handles this automatically. This is one of the most tangible differentiators on demo day._

### **7.3 Payment Anomaly Detection**

ICE passively monitors payment patterns and flags suspicious activity before merchants notice.

| **Anomaly Type** | **Detection Rule** | **Action** |
|---|---|---|
| Velocity spike | More than 5 payments to same VA within 10 minutes | Flag + alert merchant |
| Round number flooding | 3+ consecutive round-number payments (e.g. ₦1,000 exactly) | Flag for review |
| Duplicate sender | Same sender account + same amount within 5 minutes | Hold second payment |
| Dormant account payment | Payment received on VA suspended for 30+ days | Flag as misdirected; alert |

### **7.4 Dormant Account Management**

ICE runs a background cron job (daily, off-peak hours) to identify and clean up dormant virtual accounts.

- A VA is considered dormant if it has received no payments in 90 days (configurable per merchant)
- ICE calls Nomba's suspend endpoint for dormant VAs
- Merchant is notified with a summary report of suspended accounts
- Suspended accounts can be reactivated via `PUT /v1/vendors/:id/account` (ICE creates a new Nomba VA since delete is unsupported)

---

## **8. Engineering Standards**

These are the engineering decisions adopted for ICE. Every developer on the team should read and follow this section. It ensures code is consistent and navigable regardless of who wrote it.

> **Full coding standards, git workflow, and Definition of Done** are in the companion document: [ICE_ENGINEERING.md](./ICE_ENGINEERING.md)

### **8.1 Project Structure**

ICE is a single Node.js repository. No monorepo setup — simple to bootstrap and easy for all 4 devs to work in simultaneously.

```
ice/
├── src/
│   ├── routes/            # Express routers — mount on /v1, no logic
│   ├── controllers/       # Parse with Zod, call service, respond
│   ├── services/          # Business rules — no Express, no DB
│   ├── repositories/      # Database queries — returns plain rows only
│   ├── schemas/           # Zod schemas for request bodies, params, queries
│   ├── jobs/              # BullMQ job definitions (webhook retry, refunds)
│   ├── workers/           # BullMQ worker processors
│   ├── lib/               # Shared utilities (nomba client, crypto, logger, respond)
│   ├── types/             # Shared TypeScript type definitions
│   ├── middleware/         # Auth, error handler, rate limiting
│   ├── db/                # Schema, migrations, client
│   ├── config.ts          # All env vars loaded and validated via Zod
│   ├── app.ts             # Express app — middleware wiring, composition root
│   └── server.ts          # Entry point — starts HTTP server + BullMQ workers
├── dashboard/             # Next.js frontend app
│   ├── pages/             # File-based routing
│   ├── components/        # Reusable UI components
│   └── lib/               # API client, utilities
├── tests/
│   ├── unit/              # Service tests with hand-rolled fakes
│   ├── integration/       # Supertest against real Express + test Postgres
│   └── helpers/           # Shared test setup, fixtures
├── .env.example
├── .prettierrc
├── tsconfig.json
├── eslint.config.js
└── package.json
```

### **8.2 Layered Architecture**

Every feature in ICE follows the same layered structure. This is non-negotiable — it makes the codebase navigable for all 4 devs regardless of who built what.

```
routes/merchants.routes.ts         # Express Router — mount on /v1, no logic here
controllers/merchants.controller.ts # Parse Zod, call service, respond
services/merchants.service.ts      # Business rules — no Express, no DB
repositories/merchants.repo.ts     # DB queries only — returns plain rows
schemas/merchants.schema.ts        # Zod schemas for this feature
```

Dependency direction is strict:

```
routes → controllers → services → repositories → DB
                                       ↓
                              nomba client, BullMQ jobs
```

_Services never import controllers. Repositories never import services. Schemas are imported by controllers for parsing and by services for their inferred types — never the other way around._

### **8.3 Factory Pattern**

All modules export a `createX(deps)` factory function — never a singleton, never a class with shared state. The composition root (`app.ts`) wires everything together. This makes every layer trivially testable with hand-rolled fakes.

```ts
// repositories/merchants.repo.ts
import type { Pool } from 'pg';

export function createMerchantsRepo(db: Pool) {
  return {
    byId: (id: string) => db.query('SELECT * FROM merchants WHERE id = $1', [id]),
    create: (data: NewMerchant) => db.query('INSERT INTO merchants ...', [data]),
  };
}

// services/merchants.service.ts
import type { MerchantsRepo } from '../repositories/merchants.repo.ts';
import type { NombaClient } from '../lib/nomba.ts';

export function createMerchantsService(deps: { merchants: MerchantsRepo; nomba: NombaClient }) {
  return {
    register: async (data: RegisterMerchantInput) => {
      // business rules here
      const merchant = await deps.merchants.create(data);
      return merchant;
    },
  };
}

// app.ts (composition root)
const merchantsRepo = createMerchantsRepo(db);
const merchantsService = createMerchantsService({ merchants: merchantsRepo, nomba });
const merchantsController = createMerchantsController(merchantsService);
v1.use('/merchants', createMerchantsRouter(merchantsController));
```

### **8.4 Standard Response Envelope**

Every JSON response from ICE uses the same shape. Never call `res.json()` directly from a controller — always use the respond helpers from `src/lib/respond.ts`.

```ts
// src/lib/respond.ts
import type { Response } from 'express';

export const ok = (res: Response, data: unknown, status = 200) =>
  res.status(status).json({ ok: true, data, requestId: res.locals.requestId });

export const created = (res: Response, data: unknown) => ok(res, data, 201);
export const noContent = (res: Response) => res.status(204).send();

// In a controller:
const merchant = await service.register(body);
return created(res, merchant); // never res.status(201).json(...)
```

For errors, throw an `AppError` — never call `res.status()` for failure cases. The error middleware handles all error-to-HTTP-status mapping.

### **8.5 Input Validation with Zod**

Zod validation is applied at the controller boundary on critical endpoints. Raw input never reaches a service. Types are derived from schemas using `z.infer` — never write the type separately.

| **Endpoint Category** | **Zod Applied?** | **Reason** |
|---|---|---|
| Webhook receiver (`POST /v1/webhooks/nomba`) | Yes — strict | Financial data; HMAC + payload shape must be verified |
| Merchant registration (`POST /v1/merchants/register`) | Yes — strict | Creates API keys; must validate all fields |
| Vendor creation (`POST /v1/vendors`) | Yes | Triggers Nomba API call; bad input = wasted external request |
| Invoice creation (`POST /v1/invoices`) | Yes | Financial record; amount must be a valid integer in kobo |
| Read/list endpoints (`GET`) | Partial — query params only | Pagination params validated; IDs trusted from auth middleware |

```ts
// schemas/merchants.schema.ts
import { z } from 'zod';

export const registerMerchantBody = z.object({
  businessName: z.string().min(2).max(100),
  email: z.string().email(),
  webhookUrl: z.string().url().startsWith('https://'),
});

// Derive the type — never write it manually
export type RegisterMerchantInput = z.infer<typeof registerMerchantBody>;
```

### **8.6 Git Convention**

All commits follow Conventional Commits format. PRs require self-review against the Definition of Done checklist, then Peter's approval before merge. Squash-merge into `main`.

```
feat(merchants): add vendor onboarding endpoint
fix(reconciliation): handle duplicate transactionId correctly
chore(deps): add bullmq and ioredis
docs(api): document webhook payload format
```

| **Type** | **When to Use** |
|---|---|
| `feat` | New endpoint, new feature, new business logic |
| `fix` | Bug fix in existing behaviour |
| `chore` | Dependency updates, config changes, tooling |
| `docs` | README, API docs, code comments |
| `test` | Adding or updating tests |
| `refactor` | Code restructure with no behaviour change |

**No AI co-author trailers.** Never add `Co-Authored-By: Claude ...`, `Co-Authored-By: GitHub Copilot ...`, or any other AI assistant as a co-author. The human who landed the change is the author and is accountable for it. Strip the trailer your tool may have inserted before committing.

### **8.7 What We Deliberately Skipped**

The following were considered and cut to keep the build achievable in 7 days. These are smart cuts, not lazy ones.

| **Skipped** | **Why** |
|---|---|
| Monorepo (pnpm workspaces + Turbo) | Setup cost too high; single repo is sufficient for 4 devs in 1 week |
| Husky + commitlint + lint-staged | Conventional commits by discipline is enough; hooks add setup friction |
| Request IDs / correlation IDs | Nice for production debugging; not needed for a 7-day demo build |
| Auth0 / JWT auth | API key auth is sufficient for the hackathon scope |
| Load balancers / read replicas | Render handles basic scaling; overkill for hackathon infrastructure |
| Circuit breaker pattern | Retry queues via BullMQ achieve equivalent resilience with less complexity |
| SDKs in multiple languages | Well-documented REST API is sufficient; SDKs are post-hackathon scope |

---

## **9. Security Model**

ICE handles financial data. Security is non-negotiable at every layer.

| **Area** | **Implementation** |
|---|---|
| API Authentication | API keys hashed with bcrypt; never returned after creation; stored only as hash |
| Webhook Verification | HMAC-SHA256 signature on all inbound Nomba webhooks; replay attack prevention via 5-minute timestamp window |
| Transport Security | TLS enforced on all endpoints; HTTP requests redirected to HTTPS |
| Rate Limiting | Per API key: 100 requests/minute default; configurable per merchant tier |
| Input Validation | Zod on critical endpoints at gateway layer before business logic |
| SQL Injection | Parameterized queries; no raw string interpolation in SQL |
| Audit Logging | All financial mutations logged with actor, timestamp, IP, old/new values |
| Secrets Management | All secrets in environment variables; never committed; Render secret management in production |
| Security Headers | `helmet()` sets HSTS, X-Frame-Options, X-Content-Type-Options on all responses |
| Frontend Security | Native escaping (no `dangerouslySetInnerHTML`), CSP enforcement, tokens stored in `HttpOnly` cookies (never `localStorage`) |
| Dependency Security | Strict vulnerability scanning prior to package adoption |

---

## **10. Database Schema (Core Tables)**

| **Table** | **Purpose** | **Key Fields** |
|---|---|---|
| `merchants` | Platform owners using ICE | id, business_name, api_key_hash, webhook_url, status |
| `vendors` | Vendors under a merchant | id, merchant_id, name, api_key_hash, nomba_va_number, va_status |
| `customers` | End customers (optional VA) | id, vendor_id, name, email, nomba_va_number (nullable) |
| `invoices` | Payment requests linked to a VA | id, vendor_id, customer_id, amount_kobo, status, paid_amount_kobo |
| `transactions` | Inbound payments from Nomba webhooks | id, transaction_id (unique), va_number, amount_kobo, sender_name, sender_account, sender_bank_code, raw_payload (JSONB) |
| `reconciliation_logs` | Outcome of each reconciliation attempt | id, transaction_id, invoice_id, status, expected_kobo, received_kobo, difference_kobo, action_taken |
| `refunds` | Outbound refunds via Nomba Transfer API | id, transaction_id, amount_kobo, recipient_account, recipient_bank_code, nomba_transfer_ref, status, retry_count |
| `webhook_deliveries` | Outbound webhook delivery log | id, merchant_id, event_type, payload (JSONB), status, http_status, retry_count, next_retry_at |
| `misdirected_payments` | Payments with no matching VA/invoice | id, merchant_id, va_number, amount_kobo, sender_name, raw_payload, status, resolution |
| `audit_logs` | Immutable log of all financial mutations | id, merchant_id, actor_id, action, resource_type, resource_id, old_values, new_values, ip_address |

_All monetary values stored in kobo (smallest NGN unit) as integers to avoid floating-point precision errors. Never store amounts as decimals._

---

## **11. Team Structure & Build Timeline**

### **11.1 Team Roles**

| **Dev** | **Name** | **Primary Role** | **Ownership** |
|---|---|---|---|
| 1 | **Peter Ajimoti** | Team Lead | Project setup, auth layer, merchant & vendor onboarding API, API key system, Nomba client module, `app.ts` composition root, deployment |
| 2 | **Marvelous** | Backend — Payments Core | DB schema, Nomba webhook receiver, reconciliation engine, invoice state machine, misdirected payment handling, audit logging |
| 3 | **Emmanuel** | Backend — Async & Reporting | Redis + BullMQ setup, webhook delivery worker, dead-letter handling, refund engine, statement & reporting API, anomaly detection, dormant cron, nightly reconciliation diff |
| 4 | **Samkiel** | Frontend Lead | Next.js dashboard (platform + vendor views), API client, reconciliation feed, webhook logs, statements UI, refund status indicators |

### **11.2 Build Timeline (7 Days)**

| **Day** | **Focus** | **Deliverable** |
|---|---|---|
| Day 1 | Foundation | Project scaffold (TypeScript + Express), DB schema, Redis + BullMQ setup, Next.js scaffold, env config, Nomba sandbox connected |
| Day 2 | Auth & Entities | Auth middleware, merchant registration, Nomba client module, merchant registration UI |
| Day 3 | DVA & Webhooks | Vendor onboarding + DVA provisioning, vendor management, Nomba webhook receiver, HMAC verification, invoice creation |
| Day 4 | Reconciliation | Reconciliation engine (all 5 scenarios), overpayment/underpayment handling, webhook delivery worker, dead-letter handling, reconciliation feed UI |
| Day 5 | Extended | Misdirected payments, auto-refund engine, statements API, platform summary, vendor dashboard UI |
| Day 6 | Polish | Swagger/OpenAPI docs, deep health check, anomaly detection, dormant cron, nightly reconciliation diff, platform owner dashboard, remaining UI pages |
| Day 7 | Deploy & Demo | Deployment to Render, E2E integration test, demo script rehearsal, bug fixes |

---

## **12. Demo Day Narrative**

_The scenario: A Nigerian fashion marketplace called "StyleHub" uses ICE. StyleHub has 3 vendors. A customer tries to pay for a dress but sends the wrong amount. Watch what happens._

### **The Story in 7 Steps**

**Step 1:** StyleHub (platform owner) is onboarded on ICE in 2 API calls. They receive a master API key.

**Step 2:** StyleHub registers Vendor A ("Adunola Fabrics"). ICE provisions a dedicated Nomba VA for Adunola — account number appears instantly.

**Step 3:** A customer is issued Invoice #001 for ₦15,000. They pay ₦16,000 by mistake.

**Step 4:** Nomba fires a `payment_success` webhook to ICE. ICE verifies the HMAC signature, logs the transaction, and runs the reconciliation engine.

**Step 5:** ICE detects OVERPAYMENT of ₦1,000. Invoice is marked OVERPAID. A refund job is queued. ICE calls Nomba's Transfer API and sends ₦1,000 back to the customer's bank.

**Step 6:** StyleHub's webhook receives a `payment.overpayment.refunded` event. Adunola's vendor dashboard shows the transaction, the reconciliation status, and the refund confirmation.

**Step 7:** The first webhook delivery to StyleHub fails (simulated). ICE retries automatically. The webhook logs show the retry attempts and eventual delivery — live in the dashboard.

_Total time from payment to fully reconciled + refunded: under 90 seconds. No manual intervention. No lost money. No confused customer._

### **The Closing Line**

_"Nomba gives you virtual accounts. ICE makes them actually work. We are not just building on top of Nomba's API — we are solving the operational gaps every Nigerian merchant faces after the payment hits. And if Nomba's CTO agrees, maybe ICE becomes part of Nomba itself."_

---

## **13. Out of Scope (Deliberate Cuts)**

| **Feature** | **Reason Excluded** |
|---|---|
| Multi-currency virtual accounts | Nomba VAs are NGN only — not supported at API level |
| Bulk VA creation | Nomba API is one-at-a-time; bulk would require unsupported batching |
| Multi-provider / bank fallback | Nomba only has one bank (Nombank MFB); no provider selection available |
| Load balancers / read replicas | Infrastructure overkill for hackathon scale; Render handles basic scaling |
| Circuit breaker pattern | Graceful degradation via retry queues achieves equivalent resilience |
| SDKs in multiple languages | Node.js + well-documented REST API is sufficient; SDKs are post-hackathon |
| Embedded JS checkout widget | Stretch goal only if MVP is complete by Day 6 |
| Delete virtual account | Nomba does not support deletion, only suspension |

---

## **14. Success Metrics**

ICE will be evaluated against the following on demo day:

| **Metric** | **Target** |
|---|---|
| All 5 hackathon requirements demonstrated live | 100% coverage |
| End-to-end demo flow (payment to reconciled + refunded) | Under 90 seconds |
| Webhook retry demonstrated on simulated failure | Yes, live in demo |
| Misdirected payment detected and flagged | Yes, live in demo |
| API docs accessible and readable | Swagger UI live at `/docs` |
| Deployed and accessible (not localhost) | Yes — Render deployment |
| Nomba sandbox integration (real API calls) | Yes — real credentials |
| Layered architecture (routes/controllers/services/repos) | Yes — consistent across all features |

---

_ICE — Infrastructure for Collections & Exchange_
_Built for the Nomba Hackathon 2026 — Infrastructure Track | v1.2_
