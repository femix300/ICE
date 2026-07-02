# Handoff - M01 Database Schema

## What Was Built
Full PostgreSQL schema for ICE -- all 10 core tables, indexes, foreign keys, and constraints.

## Files Created
* `package.json`, `tsconfig.json`, `pnpm-workspace.yaml`
* `src/config.ts`, `src/lib/logger.ts`
* `src/db/client.ts`, `src/db/schema.sql`, `src/db/migrate.ts`
* `.env.example`, `.env`

## Technical Decisions
* All monetary fields are `INTEGER` (kobo) to prevent floating-point precision issues.
* All tables use `CREATE TABLE IF NOT EXISTS` for idempotent migrations.

---

# Handoff - M02 Webhook Receiver

## What Was Built
Inbound Nomba webhook endpoint (`POST /v1/webhooks/nomba`) with HMAC-SHA256 signature verification and transaction-level idempotency.

## Files Created
* `src/lib/errors.ts` -- AppError class with error code to HTTP status mapping
* `src/lib/respond.ts` -- Response envelope helpers (ok, created, noContent)
* `src/lib/hmac.ts` -- HMAC-SHA256 verification using crypto.timingSafeEqual
* `src/middleware/error-handler.ts` -- Express error middleware
* `src/schemas/webhooks.schema.ts` -- Zod schema for Nomba webhook payload
* `src/repositories/transactions.repo.ts` -- Transaction DB operations
* `src/services/webhook-inbound.service.ts` -- Webhook processing orchestration
* `src/controllers/webhooks.controller.ts` -- Request parsing and delegation
* `src/routes/webhooks.routes.ts` -- POST /v1/webhooks/nomba route
* `src/app.ts` -- Express composition root
* `src/server.ts` -- HTTP server entry point
* `tests/unit/hmac.test.ts` -- 5 HMAC unit tests
* `tests/integration/webhook-receiver.test.ts` -- 5 integration tests

## Files Modified
* `src/config.ts` -- Added NOMBA_WEBHOOK_SECRET and PORT
* `.env.example` -- Added NOMBA_WEBHOOK_SECRET and PORT
* `package.json` -- Added express, helmet, vitest, supertest dependencies

## Technical Decisions
1. The webhook route uses `express.text()` instead of `express.json()` so the controller receives the raw body string for HMAC verification. This ensures the signature is verified against the exact bytes Nomba sent, not a re-serialized JSON object.
2. Idempotency uses the `transaction_id` UNIQUE constraint in the transactions table. The service checks for an existing row before inserting.
3. Nomba's amount (naira with decimals) is converted to kobo (integer) via `Math.round(amount * 100)` before storage.
4. The reconciliation engine dispatch is a placeholder log -- will be wired in M04.
5. Shared infrastructure files (AppError, respond, error-handler, app.ts, server.ts) are kept minimal so they merge cleanly with Peter's P01 scaffold.

## Test Results
* 10/10 tests passing (5 unit, 5 integration)
