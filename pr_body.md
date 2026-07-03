# feat(dashboard): scaffold layout, sidebar, api client, and unit tests

## Summary
Scaffolds the ICE dashboard frontend as a Pages Router Next.js application, including:
* Responsive navigation layout with Platform Owner and Vendor portal views.
* Strict kebab-case component file naming convention (`layout.tsx`, `sidebar.tsx`).
* Pino-based frontend logger supporting both client and server execution.
* Zod-validated environment config utility (`config.ts`).
* Refactored API client wrapper using `AppError` normalization and Zod response validation.

## Closes
Closes: ICE-192

## Scope
* **Feature Drift:** None. Focused strictly on S01 scaffold foundation.
* **Environment Variables:** Introduced `NEXT_PUBLIC_API_URL` (validated by Zod, defaults to `http://localhost:3000`).
* **Architectural Notes:** Moved process environment reads out of the API client and into the Zod config wrapper. Renamed component files to kebab-case. Incorporated logging in catch blocks.

## Test Plan
1. **Static Validation:**
   - Ran `npx tsc --noEmit` inside `/dashboard` — Typecheck passed cleanly (0 errors).
   - Ran `npm run lint` inside `/dashboard` — Linting passed cleanly (0 errors).
2. **Unit Tests:**
   - Created `/dashboard/tests/unit/api.test.ts` to test fetch headers, pathing, error throws, and schema parsing.
   - Ran `npx vitest run` — All 6 dashboard unit tests and 9 backend/integration tests passed successfully (15/15 total project tests).
3. **Security Audit:**
   - Ran `npm audit` on `/dashboard` dependencies. Identified 7 transitive vulnerabilities related to `esbuild` and `postcss` inherited from `next` and `vitest`. Confirmed these are standard build/dev warnings that do not affect the production runtime.

## Risk
**Low**. Structural scaffolding, configuration setup, and core client helpers only. The most critical files to review are the API wrapper (`dashboard/lib/api.ts`) and environment validation logic (`dashboard/lib/config.ts`).

