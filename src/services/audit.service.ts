import type { AuditRepo, AuditLogInput } from '../repositories/audit.repo.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('audit-service');

type AuditServiceDeps = {
  audit: AuditRepo;
};

export function createAuditService(deps: AuditServiceDeps) {
  return {
    async logAction(input: AuditLogInput): Promise<void> {
      try {
        await deps.audit.create(input);
        log.info(
          { merchantId: input.merchant_id, action: input.action, resourceType: input.resource_type },
          'audit log entry created',
        );
      } catch (err) {
        log.error({ err, input }, 'failed to write audit log');
      }
    },
  };
}

export type AuditService = ReturnType<typeof createAuditService>;
