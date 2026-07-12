import React from 'react';
import { CURRENT_MERCHANT_ID, CURRENT_VENDOR_ID } from './session';
import { createLogger } from './logger';
import { config } from './config';

const log = createLogger('auth-store');

const secureFlag = config.NODE_ENV === 'production' ? '; Secure' : '';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match && match[2] ? decodeURIComponent(match[2]) : null;
}

function getLocalStorageItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setLocalStorageItem(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch (err) {
    log.error({ err }, 'Failed to write to localStorage');
  }
}

export function getApiKey(): string | null {
  return getLocalStorageItem('ice_api_key');
}

export function useApiKey(): string | null {
  const [apiKey, setApiKeyState] = React.useState<string | null>(getApiKey());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setApiKeyState(getApiKey());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return apiKey;
}

export function setApiKey(key: string): void {
  setLocalStorageItem('ice_api_key', key);
  try {
    fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: key })
    }).catch(err => log.error({ err }, 'Failed to persist session securely'));
  } catch (err) {
    log.error({ err }, 'Synchronous failure initiating session persistence');
  }
}

export function clearApiKey(): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('ice_api_key');
    }
  } catch (err) {
    log.error({ err }, 'Failed to clear api key from localStorage');
  }
  try {
    fetch('/api/auth/session', { method: 'DELETE' })
      .catch(err => log.error({ err }, 'Failed to clear session securely'));
  } catch (err) {
    log.error({ err }, 'Synchronous failure clearing session');
  }
}

export function getMerchantId(): string {
  try {
    return getCookie('ice_merchant_id') ?? CURRENT_MERCHANT_ID;
  } catch (err) {
    log.error({ err }, 'Failed to read merchant id cookie');
    return CURRENT_MERCHANT_ID;
  }
}

export function setMerchantId(id: string): void {
  try {
    document.cookie = `ice_merchant_id=${encodeURIComponent(id)}; Path=/; SameSite=Lax; Max-Age=86400${secureFlag}`;
  } catch (err) {
    log.error({ err }, 'Failed to write merchant id cookie');
  }
}

export function getVendorId(): string {
  try {
    return getCookie('ice_vendor_id') ?? CURRENT_VENDOR_ID;
  } catch (err) {
    log.error({ err }, 'Failed to read vendor id cookie');
    return CURRENT_VENDOR_ID;
  }
}

export function setVendorId(id: string): void {
  try {
    document.cookie = `ice_vendor_id=${encodeURIComponent(id)}; Path=/; SameSite=Lax; Max-Age=86400${secureFlag}`;
  } catch (err) {
    log.error({ err }, 'Failed to write vendor id cookie');
  }
}
