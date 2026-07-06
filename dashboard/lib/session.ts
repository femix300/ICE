// The ICE API is key-authenticated; the active identity is resolved from the
// authenticated session. Until the session layer lands, the current vendor and
// merchant are supplied here as single sources of truth so data stays scoped to
// the right tenant on each dashboard.
export const CURRENT_VENDOR_ID = '11111111-1111-1111-1111-111111111111';
export const CURRENT_MERCHANT_ID = '22222222-2222-2222-2222-222222222222';
