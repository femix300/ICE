// The ICE API is key-authenticated; the active vendor identity is resolved from
// the authenticated session. Until the session layer lands, the current vendor
// is supplied here as a single source of truth for the vendor dashboard so all
// data remains scoped to one vendor.
export const CURRENT_VENDOR_ID = '11111111-1111-1111-1111-111111111111';
