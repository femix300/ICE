export function createRefundsRepo(db: unknown) {
  const pool = db as { query: (sql: string, params: unknown[]) => Promise<unknown> };

  return {
    update: async (transaction_id: string, data: { status: 'COMPLETED' | 'FAILED'; nomba_transfer_ref?: string }) => {
      const sql = `
        UPDATE refunds
        SET status = $1, nomba_transfer_ref = $2
        WHERE transaction_id = $3
        RETURNING *
      `;
      const values = [data.status, data.nomba_transfer_ref ?? null, transaction_id];
      await pool.query(sql, values);
    },
  };
}
