# Handoff - M01 Database Schema

## What Was Built
Full PostgreSQL schema for ICE -- all 10 core tables, indexes, foreign keys, and constraints.

## Files Created
* `src/db/client.ts`, `src/db/index.ts`, `src/db/schema.sql`, `src/db/migrate.ts`

## Technical Decisions
* All monetary fields are `INTEGER` (kobo) to prevent floating-point precision issues.
* All tables use `CREATE TABLE IF NOT EXISTS` for idempotent migrations.

---

# Handoff - M02 Webhook Receiver

## What Was Built
Inbound Nomba webhook endpoint (`POST /v1/webhooks/nomba`) with HMAC-SHA256 signature verification and transaction-level idempotency.

## Files Created
* `src/lib/hmac.ts` -- HMAC-SHA256 verification using crypto.timingSafeEqual
* `src/schemas/webhooks.schema.ts` -- Zod schema for Nomba webhook payload
* `src/repositories/transactions.repo.ts` -- Transaction DB operations
* `src/services/webhook-inbound.service.ts` -- Webhook processing orchestration
* `src/controllers/webhooks.controller.ts` -- Request parsing and delegation
* `src/routes/webhooks.routes.ts` -- POST /v1/webhooks/nomba route
* `tests/unit/hmac.test.ts` -- 5 HMAC unit tests
* `tests/integration/webhook-receiver.test.ts` -- 5 integration tests

## Files Modified
* `src/app.ts` -- Modified express.json to capture req.rawBody
* `src/routes/v1.ts` -- Mounted webhooks router under v1Router
* `package.json` -- Added pg and @types/pg dependencies, added migrate script

## Technical Decisions
1. The webhook route uses `express.json()` with a `verify` callback in `app.ts` to capture the raw body as `req.rawBody`. This allows the HMAC signature verification to run against the exact payload buffer from Nomba while keeping JSON parsing active for other routes.
2. Idempotency checks `transaction_id` UNIQUE constraint in the database before storing the raw transaction.
3. Nomba's naira amount is converted to kobo (integer) via `Math.round(amount * 100)`.
4. Webhook status storage supports `payment_success`, `payment_failed`, and `payment_reversal`.

## Test Results
* 10/10 tests passing (5 unit, 5 integration)
