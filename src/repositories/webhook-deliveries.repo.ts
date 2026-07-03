export interface WebhookDeliveryLogInput {
  merchant_id: string;
  event_type: string;
  payload: unknown;
  status: 'DELIVERED' | 'FAILED';
  http_status?: number;
  retry_count: number;
}

export function createWebhookDeliveriesRepo(db: unknown) {
  // DB is lightly typed until M01 / P01 lands with actual pg Pool types
  const pool = db as { query: (sql: string, params: unknown[]) => Promise<unknown> };

  return {
    log: async (data: WebhookDeliveryLogInput) => {
      const sql = `
        INSERT INTO webhook_deliveries (merchant_id, event_type, payload, status, http_status, retry_count)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
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
    markDeadLetter: async (merchant_id: string, event_type: string, payload: unknown) => {
      // Dummy implementation for now, will log dead letter
      const sql = `
        INSERT INTO webhook_deliveries (merchant_id, event_type, payload, status, retry_count)
        VALUES ($1, $2, $3, 'DEAD_LETTER', 0)
      `;
      await pool.query(sql, [merchant_id, event_type, JSON.stringify(payload)]);
    },
  };
}
