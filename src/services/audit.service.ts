import type { AuditRepo, CreateAuditLogInput } from '../repositories/audit.repo.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('audit-service');

export function createAuditService(deps: { audit: AuditRepo }) {
  return {
    async logAction(input: CreateAuditLogInput): Promise<void> {
      await deps.audit.create(input);
      log.info(
        {
          merchantId: input.merchant_id,
          actorId: input.actor_id,
          action: input.action,
          resourceType: input.resource_type,
          resourceId: input.resource_id,
        },
        'audit log written',
      );
    },
  };
}

export type AuditService = ReturnType<typeof createAuditService>;
