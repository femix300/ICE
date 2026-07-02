import crypto from 'node:crypto';
import type { Pool } from 'pg';

export type AuditLogInput = {
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
    async create(input: AuditLogInput): Promise<void> {
      const id = crypto.randomUUID();
      await db.query(
        `INSERT INTO audit_logs (id, merchant_id, actor_id, action, resource_type, resource_id, old_values, new_values, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
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
    },
  };
}

export type AuditRepo = ReturnType<typeof createAuditRepo>;
