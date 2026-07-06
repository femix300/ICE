### Summary
To restore financial integrity and ensure platform liquidity by providing a secure, audit-compliant mechanism for resolving unmatched transfers. This change prevents stagnant funds and eliminates reconciliation blind spots that arise when inbound payments cannot be automatically associated with a vendor or invoice.

### Closes
Closes ICE-207

### Scope
- Routes: `src/routes/payments.routes.ts`
- Controller: `src/controllers/misdirected.controller.ts`
- Service: `src/services/misdirected.service.ts`
- Enforces Master API Key for sensitive mutation operations (403 for vendors).
- Integrates `transfers/bank/lookup` to verify account ownership before outbound funds movement.
- Implements comprehensive audit logs capturing state transitions, actor context, and value diffs.

### Test Plan
- Unit tests cover edge cases including Nomba lookup failure, idempotency of resolution, and audit log generation.
- Verified manual match triggers downstream reconciliation event logic.
- Confirmed full pipeline pass: `npm run lint`, `npm run typecheck`, and `npm test`.

### Risk
High. This introduces outbound money movement via the Transfer API. Mitigation includes strict HMAC verification on webhooks, required account name lookup before transfers, and immutable audit logging for every resolution action.
