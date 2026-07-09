import { z } from 'zod';
import { config } from './config';
import { AppError } from './errors';
import { createLogger } from './logger';

const log = createLogger('api-client');

// Give up on a backend request after this long so the UI can fall back to demo
// data instead of hanging on a spinner forever.
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
  key?: string;
}

function buildHeaders(options?: ApiRequestOptions<unknown>, includeJsonBody = false): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (includeJsonBody) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
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

async function handleResponse<T>(response: Response, options?: ApiRequestOptions<T>): Promise<T> {
  if (response.status === 401) {
    throw new AppError('UNAUTHORIZED', 'Unauthorized');
  }

  if (!response.ok) {
    let errorMessage = `HTTP error! Status: ${response.status}`;
    try {
      const errorData = await response.json();
      // Intentionally swallowed if the body is not valid JSON (e.g. an HTML
      // gateway error page) — we fall through to a generic status error.
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
    if (options?.schema) {
      return options.schema.parse(rawData);
    }
    return rawData as T;
  }

  // Fallback if the envelope does not match the standard backend structure
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
    return await handleResponse<T>(response, options);
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
