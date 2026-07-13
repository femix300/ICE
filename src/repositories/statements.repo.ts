export interface StatementFilter {
  from?: string;
  to?: string;
  status?: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
}

const VA_MAP_CTE = `
  WITH va_map AS (
    SELECT id AS vendor_id, merchant_id, nomba_va_number AS va_number
    FROM vendors
    WHERE nomba_va_number IS NOT NULL
    UNION ALL
    SELECT c.vendor_id, v.merchant_id, c.nomba_va_number AS va_number
    FROM customers c
    JOIN vendors v ON v.id = c.vendor_id
    WHERE c.nomba_va_number IS NOT NULL
  )
`;

export function createStatementsRepo(db: unknown) {
  const pool = db as { query: (sql: string, params: unknown[]) => Promise<unknown> };

  return {
    getVendorStatement: async (vendorId: string, filters: StatementFilter, pagination: Pagination) => {
      const offset = (pagination.page - 1) * pagination.pageSize;
      const sql = `
        ${VA_MAP_CTE}
        SELECT t.* FROM transactions t
        JOIN va_map m ON m.va_number = t.va_number
        WHERE m.vendor_id = $1
        ORDER BY t.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      const result = (await pool.query(sql, [vendorId, pagination.pageSize, offset])) as {
        rows: unknown[];
      };
      return result?.rows || [];
    },

    getCustomerStatement: async (
      vendorId: string,
      customerId: string,
      filters: StatementFilter,
      pagination: Pagination,
    ) => {
      const offset = (pagination.page - 1) * pagination.pageSize;
      const sql = `
        SELECT t.* FROM transactions t
        JOIN customers c ON c.nomba_va_number = t.va_number
        WHERE c.vendor_id = $1 AND c.id = $2
        ORDER BY t.created_at DESC
        LIMIT $3 OFFSET $4
      `;
      const result = (await pool.query(sql, [
        vendorId,
        customerId,
        pagination.pageSize,
        offset,
      ])) as { rows: unknown[] };
      return result?.rows || [];
    },

    getTransactions: async (vendorId: string, pagination: Pagination) => {
      const offset = (pagination.page - 1) * pagination.pageSize;
      const sql = `
        ${VA_MAP_CTE}
        SELECT t.* FROM transactions t
        JOIN va_map m ON m.va_number = t.va_number
        WHERE m.vendor_id = $1
        ORDER BY t.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      const result = (await pool.query(sql, [vendorId, pagination.pageSize, offset])) as {
        rows: unknown[];
      };
      return result?.rows || [];
    },

    getPlatformSummary: async (merchantId: string) => {
      const sql = `
        ${VA_MAP_CTE}
        SELECT
          COALESCE(SUM(t.amount_kobo), 0)::bigint AS total_collected_kobo,
          COUNT(DISTINCT m.vendor_id) AS total_vendors,
          COUNT(DISTINCT CASE WHEN v.va_status = 'active' THEN m.vendor_id END) AS active_vendors,
          COUNT(CASE WHEN rl.status = 'UNMATCHED' THEN 1 END) AS misdirected_count,
          COUNT(CASE WHEN rl.status = 'OVERPAYMENT' THEN 1 END) AS overpayment_count,
          COUNT(CASE WHEN rl.status = 'UNDERPAYMENT' THEN 1 END) AS underpayment_count,
          COUNT(CASE WHEN rl.status = 'EXACT_MATCH' THEN 1 END) AS exact_match_count,
          COUNT(t.id) AS total_transactions,
          COALESCE(SUM(CASE WHEN r.status = 'COMPLETED' THEN r.amount_kobo ELSE 0 END), 0)::bigint AS refunds_issued_kobo
        FROM transactions t
        JOIN va_map m ON m.va_number = t.va_number
        LEFT JOIN vendors v ON v.id = m.vendor_id
        LEFT JOIN reconciliation_logs rl ON rl.transaction_id = t.transaction_id
        LEFT JOIN refunds r ON r.transaction_id = t.transaction_id
        WHERE m.merchant_id = $1
      `;
      const result = (await pool.query(sql, [merchantId])) as { rows: Record<string, unknown>[] };
      const row = result?.rows?.[0];
      const exact = Number(row?.exact_match_count || 0);
      const total = Number(row?.total_transactions || 0);
      const reconciliation_rate = total > 0 ? Math.round((exact / total) * 10000) / 100 : 0;
      
      return {
        total_collected_kobo: Number(row?.total_collected_kobo || 0),
        reconciliation_rate_percent: reconciliation_rate,
        active_vendors: Number(row?.active_vendors || 0),
        refunds_issued_kobo: Number(row?.refunds_issued_kobo || 0),
        pending_misdirected_count: Number(row?.misdirected_count || 0),
      };
    },

    getTransactionById: async (id: string) => {
      const sql = `
        ${VA_MAP_CTE}
        SELECT t.*, m.vendor_id, m.merchant_id
        FROM transactions t
        LEFT JOIN va_map m ON m.va_number = t.va_number
        WHERE t.id = $1
        LIMIT 1
      `;
      const result = (await pool.query(sql, [id])) as { rows: unknown[] };
      return result?.rows?.[0] || null;
    },
  };
}
