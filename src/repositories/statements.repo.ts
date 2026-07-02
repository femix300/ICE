export interface StatementFilter {
  from?: string;
  to?: string;
  status?: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
}

export function createStatementsRepo(db: unknown) {
  const pool = db as { query: (sql: string, params: unknown[]) => Promise<unknown> };

  return {
    getVendorStatement: async (vendorId: string, filters: StatementFilter, pagination: Pagination) => {
      // Base SQL assuming a generic transactions structure
      const offset = (pagination.page - 1) * pagination.pageSize;
      const sql = `
        SELECT * FROM transactions 
        WHERE vendor_id = $1 
        -- AND created_at >= filters.from AND created_at <= filters.to AND status = filters.status
        LIMIT $2 OFFSET $3
      `;
      const result = await pool.query(sql, [vendorId, pagination.pageSize, offset]) as { rows: unknown[] };
      return result?.rows || [];
    },
    getCustomerStatement: async (vendorId: string, customerId: string, filters: StatementFilter, pagination: Pagination) => {
      const offset = (pagination.page - 1) * pagination.pageSize;
      const sql = `
        SELECT * FROM transactions 
        WHERE vendor_id = $1 AND customer_id = $2
        LIMIT $3 OFFSET $4
      `;
      const result = await pool.query(sql, [vendorId, customerId, pagination.pageSize, offset]) as { rows: unknown[] };
      return result?.rows || [];
    },
    getTransactions: async (vendorId: string, pagination: Pagination) => {
      const offset = (pagination.page - 1) * pagination.pageSize;
      const sql = `
        SELECT * FROM transactions 
        WHERE vendor_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      const result = await pool.query(sql, [vendorId, pagination.pageSize, offset]) as { rows: unknown[] };
      return result?.rows || [];
    },
    getPlatformSummary: async (merchantId: string) => {
      const sql = `
        SELECT
          COALESCE(SUM(amount_kobo), 0)::bigint AS total_collected_kobo,
          COUNT(DISTINCT vendor_id) AS total_vendors,
          COUNT(DISTINCT CASE WHEN status = 'ACTIVE' THEN vendor_id END) AS active_vendors,
          COUNT(CASE WHEN reconciliation_status = 'MISDIRECTED' THEN 1 END) AS misdirected_count,
          COUNT(CASE WHEN reconciliation_status = 'OVERPAID' THEN 1 END) AS overpayment_count,
          COUNT(CASE WHEN reconciliation_status = 'EXACT' THEN 1 END) AS exact_match_count,
          COUNT(*) AS total_transactions,
          COALESCE(SUM(CASE WHEN r.status = 'COMPLETED' THEN r.amount_kobo ELSE 0 END), 0)::bigint AS refunds_issued_kobo
        FROM transactions t
        LEFT JOIN refunds r ON r.transaction_id = t.id
        WHERE t.merchant_id = $1
      `;
      const result = await pool.query(sql, [merchantId]) as { rows: Record<string, unknown>[] };
      const row = result?.rows?.[0];
      const exact = Number(row?.exact_match_count || 0);
      const total = Number(row?.total_transactions || 0);
      const reconciliation_rate_percent = total > 0 ? Math.round((exact / total) * 10000) / 100 : 0;
      return { ...row, reconciliation_rate_percent };
    },
    getTransactionById: async (id: string) => {
      const sql = `SELECT * FROM transactions WHERE id = $1`;
      const result = await pool.query(sql, [id]) as { rows: unknown[] };
      return result?.rows?.[0] || null;
    }
  };
}
