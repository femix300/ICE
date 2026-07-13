import { z } from 'zod';
import { config } from './config';
import { AppError } from './errors';
import { createLogger } from './logger';

const log = createLogger('api-client');

const REQUEST_TIMEOUT_MS = 10_000;

const BASE = config.NEXT_PUBLIC_API_URL.replace(/\/$/, '');

const apiResponseSchema = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
});

export type ApiResponse = z.infer<typeof apiResponseSchema>;

interface ApiRequestOptions<T> {
  schema?: z.Schema<T>;
  expectedShape?: Record<string, unknown>;
  shapeDescription?: string;
}

function buildHeaders<T>(options?: ApiRequestOptions<T>, includeJsonBody = false): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (includeJsonBody) {
    headers['Content-Type'] = 'application/json';
  }
  // FIX: Removed manual Bearer token injection. Secure HttpOnly cookies handle this now.
  return headers;
}

function validateResponseShape(
  data: unknown,
  path: string,
  expectedShape: Record<string, unknown> | undefined,
  shapeDescription: string | undefined,
): void {
  if (!expectedShape || !shapeDescription) return;
  const expectedKeys = Object.keys(expectedShape);
  if (expectedKeys.length === 0) return;

  const actual = data as Record<string, unknown>;
  const missing = expectedKeys.filter((key) => !(key in actual));
  if (missing.length > 0) {
    const message = `Unexpected response shape from ${path} — expected { ${shapeDescription} }, got missing keys: ${missing.join(', ')}`;
    log.error({ path, expectedKeys, missing, actual }, message);
    throw new AppError('INVALID_RESPONSE', message);
  }
}

function extractErrorMessage(response: Response, body: unknown): string {
  let errorMessage = `HTTP error! Status: ${response.status}`;
  if (body && typeof body === 'object') {
    const data = body as Record<string, unknown>;
    if ('message' in data && typeof data.message === 'string') {
      errorMessage = data.message;
    } else if ('error' in data && typeof data.error === 'string') {
      errorMessage = data.error;
    } else if (
      'data' in data &&
      data.data &&
      typeof data.data === 'object' &&
      'message' in (data.data as Record<string, unknown>) &&
      typeof (data.data as Record<string, unknown>).message === 'string'
    ) {
      errorMessage = (data.data as Record<string, unknown>).message as string;
    }
  }
  return errorMessage;
}

async function handleResponse<T>(
  response: Response,
  options?: ApiRequestOptions<T>,
  path?: string,
): Promise<T> {
  if (response.status === 401) {
    throw new AppError('UNAUTHORIZED', 'Unauthorized');
  }

  if (!response.ok) {
    let errorMessage = `HTTP error! Status: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = extractErrorMessage(response, errorData);
    } catch (err) {
      log.error({ err, status: response.status }, 'Failed to parse error response JSON');
    }
    throw new AppError('HTTP_ERROR', errorMessage);
  }

  const result = await response.json();

  const parsedEnvelope = apiResponseSchema.safeParse(result);
  if (parsedEnvelope.success) {
    if (!parsedEnvelope.data.ok) {
      throw new AppError('API_ERROR', parsedEnvelope.data.error || 'API returned ok=false');
    }
    const rawData = parsedEnvelope.data.data;
    validateResponseShape(rawData, path ?? 'unknown', options?.expectedShape, options?.shapeDescription);
    if (options?.schema) {
      return options.schema.parse(rawData);
    }
    return rawData as T;
  }

  validateResponseShape(result, path ?? 'unknown', options?.expectedShape, options?.shapeDescription);
  if (options?.schema) {
    return options.schema.parse(result);
  }
  return result as T;
}

async function request<T>(
  method: string,
  path: string,
  body: unknown,
  options?: ApiRequestOptions<T>,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  try {
    const response = await fetch(`${BASE}${cleanPath}`, {
      method,
      headers: buildHeaders(options, body !== undefined),
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    return await handleResponse<T>(response, options, cleanPath);
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  get: <T>(path: string, options?: ApiRequestOptions<T>): Promise<T> =>
    request<T>('GET', path, undefined, options),

  post: <T>(path: string, body: unknown, options?: ApiRequestOptions<T>): Promise<T> =>
    request<T>('POST', path, body, options),

  delete: <T>(path: string, options?: ApiRequestOptions<T>): Promise<T> =>
    request<T>('DELETE', path, undefined, options),
};
