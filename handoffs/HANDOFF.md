# Peter's Handoff Notes

## Task P08: Nomba API client module

**What was built:**
- A shared Nomba API client (`src/lib/nomba.ts`) that manages `client_credentials` OAuth token fetching and caching.
- It refreshes automatically at the 55-minute mark to meet Nomba Certification Rules.
- Implementation of `createVirtualAccount`, `suspendVirtualAccount`, and `transferToBank`.
- Added a lookup request to `/v2/transfers/bank/lookup` before any bank transfer is dispatched to satisfy Rule 4.
- Ensured all outgoing money amounts are formatted strictly as Kobo.
- Generic `AppError` class in `src/lib/errors.ts` for standardized errors.

**Files Changed:**
- `src/lib/nomba.ts` (new)
- `src/lib/errors.ts` (new)
- `tests/unit/nomba.test.ts` (new)

**Decisions Made:**
- In-memory variable with a `setTimeout` used for caching the 60-minute token (refreshed every 55 mins). Simple and doesn't require Redis dependency for this particular client level.
- Re-architected Kobo conversion logic to simply forward Kobo payloads as-is, following the new engineering mandate that all values remain in Kobo format.
