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
    }
  };
}
