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

export type AuditRepo = {
  create(input: AuditLogInput): Promise<void>;
};

export function createAuditRepo(): AuditRepo {
  return {
    async create() {
      // Placeholder for M07 before M08 database implementation
    },
  };
}
