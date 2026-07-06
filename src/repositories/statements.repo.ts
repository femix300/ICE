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
  const pool = db as {
    query: <T = unknown>(sql: string, params: unknown[]) => Promise<{ rows: T[] }>;
  };

  const buildFilterQuery = (baseQuery: string, params: unknown[], filters: StatementFilter) => {
    let sql = baseQuery;
    if (filters.from) {
      sql += ` AND created_at >= $${params.length + 1}`;
      params.push(filters.from);
    }
    if (filters.to) {
      sql += ` AND created_at <= $${params.length + 1}`;
      params.push(filters.to);
    }
    if (filters.status) {
      sql += ` AND status = $${params.length + 1}`;
      params.push(filters.status);
    }
    return { sql, params };
  };

  return {
    getVendorStatement: async (
      vendorId: string,
      filters: StatementFilter,
      pagination: Pagination,
    ) => {
      const offset = (pagination.page - 1) * pagination.pageSize;
      const { sql: filterSql, params } = buildFilterQuery(
        `SELECT * FROM transactions WHERE vendor_id = $1`,
        [vendorId],
        filters,
      );

      const finalSql = `${filterSql} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(pagination.pageSize, offset);

      const result = await pool.query(finalSql, params);
      return result.rows || [];
    },
    getCustomerStatement: async (
      vendorId: string,
      customerId: string,
      filters: StatementFilter,
      pagination: Pagination,
    ) => {
      const offset = (pagination.page - 1) * pagination.pageSize;
      const { sql: filterSql, params } = buildFilterQuery(
        `SELECT * FROM transactions WHERE vendor_id = $1 AND customer_id = $2`,
        [vendorId, customerId],
        filters,
      );

      const finalSql = `${filterSql} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(pagination.pageSize, offset);

      const result = await pool.query(finalSql, params);
      return result.rows || [];
    },
    getTransactions: async (vendorId: string, pagination: Pagination) => {
      const offset = (pagination.page - 1) * pagination.pageSize;
      const sql = `
        SELECT * FROM transactions 
        WHERE vendor_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      const result = await pool.query(sql, [vendorId, pagination.pageSize, offset]);
      return result.rows || [];
    },
  };
}
