import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

import {
  createInvoiceSchema,
  invoiceIdParamSchema,
  vendorIdParamSchema,
} from '../schemas/invoices.schema.js';
import type { InvoicesService } from '../services/invoices.service.js';
import { AppError } from '../lib/errors.js';
import { ok, created } from '../lib/respond.js';

const reconciliationLogsQuerySchema = z.object({
  status: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export function createInvoicesController(service: InvoicesService) {
  return {
    async create(req: Request, res: Response, next: NextFunction) {
      try {
        const parsed = createInvoiceSchema.safeParse(req.body);
        if (!parsed.success) {
          throw new AppError(400, 'VALIDATION_ERROR', 'Invalid invoice data');
        }

        const invoice = await service.createInvoice(parsed.data);
        const issued = await service.issueInvoice(invoice.id);
        return created(res, issued);
      } catch (err) {
        next(err);
      }
    },

    async getById(req: Request, res: Response, next: NextFunction) {
      try {
        const params = invoiceIdParamSchema.safeParse(req.params);
        if (!params.success) {
          throw new AppError(400, 'VALIDATION_ERROR', 'Invalid invoice ID');
        }

        const invoice = await service.getInvoice(params.data.id);
        return ok(res, invoice);
      } catch (err) {
        next(err);
      }
    },

    async listByVendor(req: Request, res: Response, next: NextFunction) {
      try {
        const params = vendorIdParamSchema.safeParse(req.params);
        if (!params.success) {
          throw new AppError(400, 'VALIDATION_ERROR', 'Invalid vendor ID');
        }

        const invoices = await service.listByVendor(params.data.vendorId);
        return ok(res, invoices);
      } catch (err) {
        next(err);
      }
    },

    async issue(req: Request, res: Response, next: NextFunction) {
      try {
        const params = invoiceIdParamSchema.safeParse(req.params);
        if (!params.success) {
          throw new AppError(400, 'VALIDATION_ERROR', 'Invalid invoice ID');
        }

        const invoice = await service.issueInvoice(params.data.id);
        return ok(res, invoice);
      } catch (err) {
        next(err);
      }
    },

    async markPaid(req: Request, res: Response, next: NextFunction) {
      try {
        // Authorization: merchant (master) key only — vendor-scoped keys are rejected
        if (!req.principal || req.principal.tier !== 'merchant') {
          throw new AppError(403, 'FORBIDDEN', 'Platform master key required');
        }

        const params = invoiceIdParamSchema.safeParse(req.params);
        if (!params.success) {
          throw new AppError(400, 'VALIDATION_ERROR', 'Invalid invoice ID');
        }

        const actorId = req.principal.id;
        const ipAddress = req.ip ?? '127.0.0.1';

        const invoice = await service.markInvoiceAsPaid(params.data.id, actorId, ipAddress);
        return ok(res, invoice);
      } catch (err) {
        next(err);
      }
    },

    async getReconciliation(req: Request, res: Response, next: NextFunction) {
      try {
        const params = invoiceIdParamSchema.safeParse(req.params);
        if (!params.success) {
          throw new AppError(400, 'VALIDATION_ERROR', 'Invalid invoice ID');
        }

        const logs = await service.getReconciliation(params.data.id);
        return ok(res, logs);
      } catch (err) {
        next(err);
      }
    },

    async listReconciliationLogs(req: Request, res: Response, next: NextFunction) {
      try {
        const query = reconciliationLogsQuerySchema.safeParse(req.query);
        if (!query.success) {
          throw new AppError(400, 'VALIDATION_ERROR', 'Invalid query parameters');
        }

        const result = await service.listReconciliationLogs(
          query.data.status,
          query.data.page,
          query.data.limit,
        );
        return ok(res, result);
      } catch (err) {
        next(err);
      }
    },
  };
}

export type InvoicesController = ReturnType<typeof createInvoicesController>;
        return ok(res, invoice);
      } catch (err) {
        next(err);
      }
    },

    async listByVendor(req: Request, res: Response, next: NextFunction) {
      try {
        const params = vendorIdParamSchema.safeParse(req.params);
        if (!params.success) {
          throw new AppError(400, 'VALIDATION_ERROR', 'Invalid vendor ID');
        }

        const invoices = await service.listByVendor(params.data.vendorId);
        return ok(res, invoices);
      } catch (err) {
        next(err);
      }
    },

    async issue(req: Request, res: Response, next: NextFunction) {
      try {
        const params = invoiceIdParamSchema.safeParse(req.params);
        if (!params.success) {
          throw new AppError(400, 'VALIDATION_ERROR', 'Invalid invoice ID');
        }

        const invoice = await service.issueInvoice(params.data.id);
        return ok(res, invoice);
      } catch (err) {
        next(err);
      }
    },

    async markPaid(req: Request, res: Response, next: NextFunction) {
      try {
        const keyTier = req.headers['x-key-tier'];
        const actorId = req.headers['x-actor-id'] || 'system';
        const ipAddress = req.ip || '127.0.0.1';

        // Authorization: Platform owner only (master key required)
        if (keyTier !== 'platform') {
          throw new AppError(403, 'FORBIDDEN', 'Platform master key required');
        }

        const params = invoiceIdParamSchema.safeParse(req.params);
        if (!params.success) {
          throw new AppError(400, 'VALIDATION_ERROR', 'Invalid invoice ID');
        }

        const invoice = await service.markInvoiceAsPaid(
          params.data.id,
          typeof actorId === 'string' ? actorId : 'system',
          ipAddress,
        );

        return ok(res, invoice);
      } catch (err) {
        next(err);
      }
    },

    async getReconciliation(req: Request, res: Response, next: NextFunction) {
      try {
        const params = invoiceIdParamSchema.safeParse(req.params);
        if (!params.success) {
          throw new AppError(400, 'VALIDATION_ERROR', 'Invalid invoice ID');
        }

        const logs = await service.getReconciliation(params.data.id);
        return ok(res, logs);
      } catch (err) {
        next(err);
      }
    },
  };
}

export type InvoicesController = ReturnType<typeof createInvoicesController>;
