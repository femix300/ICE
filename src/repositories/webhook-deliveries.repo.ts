export interface WebhookDeliveryLogInput {
  merchant_id: string;
  event_type: string;
  payload: unknown;
  status: 'DELIVERED' | 'FAILED' | 'DEAD_LETTER';
  http_status?: number;
  retry_count: number;
}

export function createWebhookDeliveriesRepo(db: unknown) {
  // DB is lightly typed until M01 / P01 lands with actual pg Pool types
  const pool = db as { query: (sql: string, params: unknown[]) => Promise<unknown> };

  return {
    log: async (data: WebhookDeliveryLogInput) => {
      const sql = \`
        INSERT INTO webhook_deliveries (merchant_id, event_type, payload, status, http_status, retry_count)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      \`;
      const values = [
        data.merchant_id,
        data.event_type,
        JSON.stringify(data.payload),
        data.status,
        data.http_status ?? null,
        data.retry_count,
      ];
      await pool.query(sql, values);
    },
    markDeadLetter: async (merchant_id: string, job_id: string) => {
      const sql = \`
        UPDATE webhook_deliveries 
        SET status = 'DEAD_LETTER' 
        WHERE merchant_id = $1 AND id = $2
      \`;
      await pool.query(sql, [merchant_id, job_id]);
    },
    byId: async (id: string) => {
      const sql = \`SELECT * FROM webhook_deliveries WHERE id = $1\`;
      const result = await pool.query(sql, [id]) as { rows: unknown[] };
      return result?.rows?.[0] as { merchant_id: string; event_type: string; payload: unknown } | null;
    }
  };
}
