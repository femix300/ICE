1. **Summary:** Implements the `POST /v1/merchants/register` and `GET /v1/merchants/:id` endpoints for ICE. This includes the required Zod validation schemas, service logic with secure API key generation, and a PostgreSQL repository interface that is ready to be wired into the application.

2. **Closes:** Closes ICE-168

3. **Scope:**
   - No feature drift.
   - No new environment variables added.
   - Installed `pg` and `@types/pg` ahead of M01 merging to ensure the repository logic is fully implemented and strictly typed. (Audited via npm audit - 0 vulnerabilities found in these dependencies).
   - Implemented `api_key_prefix` to optimize API key lookup during authentication.

4. **Test Plan:**
   - Ran unit tests with vitest on the mocked service layer (passing).
   - Ran `npm run typecheck`, `npm run lint`, and `npm test` (all passing).

5. **Risk:** Low. This code is isolated and mostly introduces new endpoints and schemas. The PostgreSQL database pool will not actually connect until M01 merges and provides the global pool instance.
