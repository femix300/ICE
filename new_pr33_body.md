## Summary
Implements vendor-scoped invoice creation and state machine transition validation.

## Closes
Closes ICE-203

## Scope
- Created Zod schemas for validation and parameters (`src/schemas/invoices.schema.ts`).
- Created invoices database repository with CRUD operations (`src/repositories/invoices.repo.ts`).
- Implemented state machine transition validator (`transition()`) and business logic in the service (`src/services/invoices.service.ts`).
- Exposed invoice routes (`src/routes/invoices.routes.ts`) and controller (`src/controllers/invoices.controller.ts`).

## Test Plan
Ran sequential unit tests covering:
- Valid transition sequences (draft -> issued -> paid -> refunded).
- Invalid transition sequences throwing `INVALID_TRANSITION` AppErrors.
- Vendor invoice listing and manual fetches.

Command: `pnpm test -- tests/unit/invoices.service.test.ts`

## Risk
Low risk. All files are brand-new and do not modify existing shared files.