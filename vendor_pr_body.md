Summary:
This PR introduces the Vendor Onboarding endpoint and Nomba Dedicated Virtual Account (DVA) provisioning flow. It creates the vendor record and immediately invokes the Nomba Sandbox API to allocate a VA.

Closes:
Closes ICE-170

Scope:
- Created vendors.schema.ts, vendors.repo.ts, vendors.service.ts, vendors.controller.ts, and vendors.routes.ts.
- Integrated NombaClient for createVirtualAccount.
- Ensures zero orphan vendor records via DB rollback if Nomba fails.
- Adheres strictly to the layer architecture and factory patterns.

Test Plan:
- Added robust unit tests in tests/unit/vendors.service.test.ts.
- Mocked out DB (VendorsRepo) and NombaClient.
- Tested the exact success path, duplicate name path, and Nomba 502 failure path.
- Ran npm test, npm run lint, and npm run typecheck, yielding 100% success.

Risk:
Low. The code operates independently for vendor creation and correctly cleans up after itself upon failure.
