import { z } from 'zod';
import { config } from './config';
import { AppError } from './errors';
import { createLogger } from './logger';

const log = createLogger('api-client');

const BASE = config.NEXT_PUBLIC_API_URL.replace(/\/$/, '');

const apiResponseSchema = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
});

export type ApiResponse = z.infer<typeof apiResponseSchema>;

interface ApiRequestOptions<T> {
  schema: z.Schema<T>;
}

export const api = {
  get: async <T>(path: string, options?: ApiRequestOptions<T>): Promise<T> => {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (options?.key) {
      headers['Authorization'] = `Bearer ${options.key}`;
    }

    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const response = await fetch(`${BASE}${cleanPath}`, {
      method: 'GET',
      headers,
    });

    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new AppError('UNAUTHORIZED', 'Unauthorized');
    }

    if (!response.ok) {
      let errorMessage = `HTTP error! Status: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData && typeof errorData === 'object') {
          if ('message' in errorData && typeof errorData.message === 'string') {
            errorMessage = errorData.message;
          } else if ('error' in errorData && typeof errorData.error === 'string') {
            errorMessage = errorData.error;
          } else if (
            'data' in errorData &&
            errorData.data &&
            typeof errorData.data === 'object' &&
            'message' in errorData.data &&
            typeof errorData.data.message === 'string'
          ) {
            errorMessage = errorData.data.message;
          }
        }
      } catch (err) {
        // Intentionally swallowed: the error response body may not be valid JSON
        // (e.g. HTML error pages from a gateway). We log the failure and fall
        // through to throw a generic HTTP_ERROR with the status code instead.
        log.error({ err, status: response.status }, 'Failed to parse GET error response JSON');
      }
      throw new AppError('HTTP_ERROR', errorMessage);
    }

    const result = await response.json();

    // Validate the response envelope
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

    // Fallback if envelope does not match standard backend structure
    if (options?.schema) {
      return options.schema.parse(result);
    }
    return result as T;
  },

  post: async <T>(path: string, body: unknown, options?: ApiRequestOptions<T>): Promise<T> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (options?.key) {
      headers['Authorization'] = `Bearer ${options.key}`;
    }

    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const response = await fetch(`${BASE}${cleanPath}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new AppError('UNAUTHORIZED', 'Unauthorized');
    }

    if (!response.ok) {
      let errorMessage = `HTTP error! Status: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData && typeof errorData === 'object') {
          if ('message' in errorData && typeof errorData.message === 'string') {
            errorMessage = errorData.message;
          } else if ('error' in errorData && typeof errorData.error === 'string') {
            errorMessage = errorData.error;
          } else if (
            'data' in errorData &&
            errorData.data &&
            typeof errorData.data === 'object' &&
            'message' in errorData.data &&
            typeof errorData.data.message === 'string'
          ) {
            errorMessage = errorData.data.message;
          }
        }
      } catch (err) {
        // Intentionally swallowed: the error response body may not be valid JSON
        // (e.g. HTML error pages from a gateway). We log the failure and fall
        // through to throw a generic HTTP_ERROR with the status code instead.
        log.error({ err, status: response.status }, 'Failed to parse POST error response JSON');
      }
      throw new AppError('HTTP_ERROR', errorMessage);
    }

    const result = await response.json();

    // Validate the response envelope
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

    // Fallback if envelope does not match standard backend structure
    if (options?.schema) {
      return options.schema.parse(result);
    }
    return result as T;
  },
};
