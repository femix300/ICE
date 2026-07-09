// Client-side store for the active ICE API key and resolved identity. The
// dashboard does not have a full session layer yet, so the key + merchant id
// minted by merchant registration (or vendor key generation) are persisted here
// and used to scope api.* calls. This lets the UI move from graceful mock
// fallback to live backend data as soon as a merchant registers.
import { CURRENT_MERCHANT_ID, CURRENT_VENDOR_ID } from './session';

const API_KEY_STORAGE = 'ice_api_key';
const MERCHANT_ID_STORAGE = 'ice_merchant_id';
const VENDOR_ID_STORAGE = 'ice_vendor_id';

export function getApiKey(): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    return window.localStorage.getItem(API_KEY_STORAGE);
  } catch {
    return null;
  }
}

export function setApiKey(key: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(API_KEY_STORAGE, key);
  } catch {
    // Ignore (private mode / storage disabled) — the UI still works via mock fallback.
  }
}

export function clearApiKey(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(API_KEY_STORAGE);
  } catch {
    // Ignore
  }
}

// The backend scopes every lookup by the id in the URL path, so we must use
// the real merchant/vendor id returned at registration — not the placeholder
// constants. These fall back to the placeholders when nothing is stored yet.
export function getMerchantId(): string {
  if (typeof window === 'undefined' || !window.localStorage) return CURRENT_MERCHANT_ID;
  try {
    return window.localStorage.getItem(MERCHANT_ID_STORAGE) ?? CURRENT_MERCHANT_ID;
  } catch {
    return CURRENT_MERCHANT_ID;
  }
}

export function setMerchantId(id: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(MERCHANT_ID_STORAGE, id);
  } catch {
    // Ignore
  }
}

export function getVendorId(): string {
  if (typeof window === 'undefined' || !window.localStorage) return CURRENT_VENDOR_ID;
  try {
    return window.localStorage.getItem(VENDOR_ID_STORAGE) ?? CURRENT_VENDOR_ID;
  } catch {
    return CURRENT_VENDOR_ID;
  }
}

export function setVendorId(id: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(VENDOR_ID_STORAGE, id);
  } catch {
    // Ignore
  }
}
