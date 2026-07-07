import crypto from 'node:crypto';

import type { Pool } from 'pg';

import { AppError } from '../lib/errors.js';

export type AuditLogRow = {
  id: string;
  merchant_id: string;
  actor_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  old_values: unknown;
  new_values: unknown;
  ip_address: string;
  created_at: Date;
};

export type CreateAuditLogInput = {
  merchant_id: string;
  actor_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  old_values: unknown;
  new_values: unknown;
  ip_address: string;
};

export function createAuditRepo(db: Pool) {
  return {
    async create(input: CreateAuditLogInput): Promise<AuditLogRow> {
      const id = crypto.randomUUID();

      const result = await db.query<AuditLogRow>(
        `INSERT INTO audit_logs
           (id, merchant_id, actor_id, action, resource_type, resource_id, old_values, new_values, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          id,
          input.merchant_id,
          input.actor_id,
          input.action,
          input.resource_type,
          input.resource_id,
          JSON.stringify(input.old_values),
          JSON.stringify(input.new_values),
          input.ip_address,
        ],
      );

      const row = result.rows[0];
      if (!row) {
        throw new AppError(500, 'DATABASE_ERROR', 'Failed to insert audit log');
      }
      return row;
    },

    async findByMerchantId(merchantId: string): Promise<AuditLogRow[]> {
      const result = await db.query<AuditLogRow>(
        'SELECT * FROM audit_logs WHERE merchant_id = $1 ORDER BY created_at DESC',
        [merchantId],
      );
      return result.rows;
    },
  };
}

export type AuditRepo = ReturnType<typeof createAuditRepo>;
