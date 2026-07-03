**Summary:** 
This PR implements the core Authentication Middleware layer (Task P03). It introduces the API key management utilities (hashing and verifying with bcrypt) and provides a secure, robust middleware factory `createAuthMiddleware` that intercepts requests, checks the `Authorization` header, and verifies the key prefix against either the `merchants` or `vendors` datastore.

**Closes:** 
Closes ICE-102

**Scope:**
- Fully scoped to ICE-102 feature requirements. No feature drift.
- Installs `bcrypt` and `@types/bcrypt`. (Audited via npm audit - 0 vulnerabilities found)
- Since M01 is not merged, TypeScript interfaces for `MerchantsRepo` and `VendorsRepo` are declared strictly within `auth.ts` to allow testing, avoiding coupling to an unmerged database structure.
- Modifies `Express.Request` to include a globally typed `principal` object.
- No new environment variables introduced.

**Test Plan:**
- Added `tests/unit/auth.test.ts` checking all 5 core scenarios: missing keys, invalid format, successful merchant lookup, successful vendor lookup, and mismatched/bad keys.
- Tested type augmentation with unit test overrides using explicit casting `(req as Request)`.
- Verified `npm run typecheck && npm run lint && npm test` all pass.

**Risk:**
Low. The logic is self-contained and heavily unit-tested. Reviewers should focus on the logic flow inside `createAuthMiddleware` to ensure edge cases for API key string splitting (`Bearer <key>`) and DB lookups behave as expected.


