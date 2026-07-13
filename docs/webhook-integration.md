# Webhook Integration & Testing Strategy

## Implementation

ICE implements a dedicated inbound webhook endpoint (`POST /v1/webhooks/nomba`) to receive real-time payment notifications from Nomba. The implementation includes:

- **Signature verification**: HMAC-SHA256 verification using the `nomba-signature` and `nomba-timestamp` headers, compared using `crypto.timingSafeEqual` to prevent timing attacks.
- **Payload validation**: Strict Zod schema validation of the webhook body, matching Nomba's documented `event_type` / `requestId` / `data.merchant` / `data.transaction` / `data.customer` structure.
- **Idempotency**: Deduplication on `transaction.transactionId`, since Nomba's own documentation states webhooks may be delivered more than once.
- **Downstream processing**: Verified webhook events feed directly into ICE's reconciliation engine, triggering exact-match reconciliation, misdirected payment detection, and refund workflows.

## Known Limitation: Live Delivery Not Verified

Despite submitting our webhook URL to Nomba's hackathon onboarding form twice, and following up directly with the Nomba team, no webhook subscription was ever registered against our sub-account. This was confirmed programmatically, not assumed: querying Nomba's own `/v1/webhooks/events` and `/v1/webhooks/event-logs` endpoints for our sub-account returns an empty result set across the full duration of the hackathon — meaning Nomba's system shows zero registered subscriptions and zero delivery attempts, not a failed or misdirected one.

This is an infrastructure/account provisioning issue on Nomba's side, not a defect in ICE's webhook handling.

## Mitigation: Simulated Webhook Testing

To validate correctness in the absence of live delivery, we built a test harness that constructs Nomba-shaped webhook payloads, signs them using the documented HMAC-SHA256 algorithm, and sends them to our real, deployed endpoint — exercising the full pipeline exactly as a genuine Nomba webhook would: signature verification, payload parsing, reconciliation matching, misdirected payment detection, and refund handling. All of these features were verified working end-to-end using this method.

This approach validates ICE's own logic thoroughly, though it does not eliminate all risk of subtle divergence from Nomba's real signature generation (field ordering, encoding edge cases) that only a genuine Nomba-signed payload could fully confirm.
