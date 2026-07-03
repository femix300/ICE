import type { Pool } from 'pg';

export interface MerchantRow {
  id: string;
  business_name: string;
  email: string;
  api_key_hash: string;
  api_key_prefix: string;
  webhook_url: string;
  status: 'active' | 'suspended';
  created_at: Date;
  updated_at: Date;
}

export interface NewMerchant {
  id: string;
  business_name: string;
  email: string;
  api_key_hash: string;
  api_key_prefix: string;
  webhook_url: string;
}

export interface MerchantsRepo {
  create(data: NewMerchant): Promise<MerchantRow>;
  byId(id: string): Promise<MerchantRow | null>;
  byEmail(email: string): Promise<MerchantRow | null>;
  findByKeyPrefix(prefix: string): Promise<{ id: string; api_key_hash: string } | null>;
}

export function createMerchantsRepo(db: Pool): MerchantsRepo {
  return {
    create: async (data: NewMerchant): Promise<MerchantRow> => {
      const res = await db.query<MerchantRow>(
        `INSERT INTO merchants (id, business_name, email, api_key_hash, api_key_prefix, webhook_url, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active')
         RETURNING *`,
        [data.id, data.business_name, data.email, data.api_key_hash, data.api_key_prefix, data.webhook_url]
      );
      return res.rows[0] as MerchantRow;
    },
    byId: async (id: string): Promise<MerchantRow | null> => {
      const res = await db.query<MerchantRow>(
        'SELECT * FROM merchants WHERE id = $1',
        [id]
      );
      return res.rows[0] ?? null;
    },
    byEmail: async (email: string): Promise<MerchantRow | null> => {
      const res = await db.query<MerchantRow>(
        'SELECT * FROM merchants WHERE email = $1',
        [email]
      );
      return res.rows[0] ?? null;
    },
    findByKeyPrefix: async (prefix: string): Promise<{ id: string; api_key_hash: string } | null> => {
      const res = await db.query<{ id: string; api_key_hash: string }>(
        'SELECT id, api_key_hash FROM merchants WHERE api_key_prefix = $1 AND status = $2',
        [prefix, 'active']
      );
      return res.rows[0] ?? null;
    },
  };
}
