import { z } from 'zod';
import { config } from '../config.js';
import { AppError } from './errors.js';
import { createLogger } from './logger.js';

const log = createLogger('nomba-client');

const NOMBA_BASE_URL = 'https://sandbox.api.nomba.com/v1';

export function createNombaClient() {
  let accessToken: string | null = null;
  let refreshTimer: NodeJS.Timeout | null = null;

  const getHeaders = () => {
    if (!accessToken) {
      throw new AppError(
        500,
        'NOMBA_UNAUTHORIZED',
        'Nomba client is not authenticated. Call authenticate() first.',
      );
    }
    return {
      Authorization: `Bearer ${accessToken}`,
      accountId: config.NOMBA_ACCOUNT_ID ?? '',
      'Content-Type': 'application/json',
    };
  };

  const authenticate = async () => {
    try {
      const res = await fetch(`${NOMBA_BASE_URL}/auth/token/issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accountId: config.NOMBA_ACCOUNT_ID ?? '',
        },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: config.NOMBA_CLIENT_ID,
          client_secret: config.NOMBA_CLIENT_SECRET,
        }),
      });

      if (!res.ok) {
        throw new AppError(502, 'NOMBA_AUTH_ERROR', `Failed to fetch Nomba token: ${res.status}`);
      }

      const nombaAuthSchema = z.object({
        access_token: z.string().optional(),
        data: z
          .object({
            access_token: z.string().optional(),
          })
          .optional(),
      });

      const parsed = nombaAuthSchema.safeParse(await res.json());

      if (!parsed.success) {
        throw new AppError(502, 'NOMBA_AUTH_ERROR', 'Invalid token response format from Nomba');
      }

      if (parsed.data.data?.access_token) {
        accessToken = parsed.data.data.access_token;
      } else if (parsed.data.access_token) {
        accessToken = parsed.data.access_token;
      } else {
        throw new AppError(502, 'NOMBA_AUTH_ERROR', 'Missing access token in Nomba response');
      }

      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(
        () => {
          authenticate().catch((err: unknown) => {
            log.error({ err }, 'Failed to refresh Nomba token in background');
          });
        },
        55 * 60 * 1000,
      );
      refreshTimer.unref();

      log.info('Successfully authenticated with Nomba API');
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        502,
        'NOMBA_AUTH_ERROR',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  };

  const close = () => {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
  };

  return {
    authenticate,
    close,
    _setToken: (token: string) => {
      accessToken = token;
    },

    createVirtualAccount: async ({
      accountRef,
      accountName,
    }: {
      accountRef: string;
      accountName: string;
    }) => {
      try {
        const res = await fetch(`${NOMBA_BASE_URL}/accounts/virtual`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ accountRef, accountName, currency: 'NGN' }),
        });

        if (!res.ok) {
          throw new AppError(502, 'NOMBA_ERROR', 'Failed to provision virtual account');
        }
        return (await res.json()) as unknown;
      } catch (error: unknown) {
        if (error instanceof AppError) throw error;
        throw new AppError(
          502,
          'NOMBA_ERROR',
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
    },

    suspendVirtualAccount: async (accountId: string) => {
      try {
        const res = await fetch(`${NOMBA_BASE_URL}/accounts/virtual/${accountId}/suspend`, {
          method: 'POST',
          headers: getHeaders(),
        });

        if (!res.ok) {
          throw new AppError(502, 'NOMBA_ERROR', 'Failed to suspend virtual account');
        }
        return (await res.json()) as unknown;
      } catch (error: unknown) {
        if (error instanceof AppError) throw error;
        throw new AppError(
          502,
          'NOMBA_ERROR',
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
    },

    transferToBank: async ({
      amount,
      accountNumber,
      bankCode,
      narration,
    }: {
      amount: number;
      accountNumber: string;
      bankCode: string;
      narration?: string;
    }) => {
      try {
        // Rule 4: Always Lookup Before Transfers
        const lookupRes = await fetch(
          `${NOMBA_BASE_URL.replace('/v1', '')}/v2/transfers/bank/lookup`,
          {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ accountNumber, bankCode }),
          },
        );

        if (!lookupRes.ok) {
          throw new AppError(502, 'NOMBA_ERROR', 'Failed to lookup recipient account name');
        }

        // Rule 1: Always use Kobo (amount is already in Kobo, no conversion)
        const res = await fetch(`${NOMBA_BASE_URL.replace('/v1', '')}/v2/transfers/bank`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ amount, accountNumber, bankCode, narration }),
        });

        if (!res.ok) {
          throw new AppError(502, 'NOMBA_ERROR', `Nomba transfer failed: ${res.status}`);
        }
        return (await res.json()) as unknown;
      } catch (error: unknown) {
        if (error instanceof AppError) throw error;
        throw new AppError(
          502,
          'NOMBA_ERROR',
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
    },
  };
}

export type NombaClient = ReturnType<typeof createNombaClient>;
