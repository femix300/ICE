import type { AuditRepo, CreateAuditLogInput } from '../repositories/audit.repo.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('audit-service');

type AuditServiceDeps = {
  audit: AuditRepo;
};

export function createAuditService(deps: AuditServiceDeps) {
  return {
    async logAction(input: CreateAuditLogInput) {
      const entry = await deps.audit.create(input);
      log.info(
        { action: input.action, resourceType: input.resource_type, resourceId: input.resource_id },
        'audit log entry created',
      );
      return entry;
    },
  };
}

export type AuditService = ReturnType<typeof createAuditService>;
