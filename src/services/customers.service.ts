import crypto from 'node:crypto';
import { z } from 'zod';
import type { CustomersRepo } from '../repositories/customers.repo.js';
import type { VendorsRepo } from '../repositories/vendors.repo.js';
import type { NombaClient } from '../lib/nomba.js';
import type { CreateCustomerInput } from '../schemas/customers.schema.js';
import { AppError } from '../lib/errors.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('customers-service');

export function createCustomersService(deps: {
  customers: CustomersRepo;
  vendors: VendorsRepo;
  nomba: NombaClient;
}) {
  const provisionDva = async (customerId: string, vendorId: string, customerName: string) => {
    const nombaRes = await deps.nomba.createVirtualAccount({
      accountRef: `${vendorId}_${customerId}`,
      accountName: customerName,
    });

    const nombaSchema = z.object({
      data: z.object({
        bankAccountNumber: z.string(),
        bankName: z.string().optional(),
      }),
    });

    const parsed = nombaSchema.safeParse(nombaRes);
    if (!parsed.success) {
      throw new AppError(502, 'NOMBA_ERROR', 'Invalid response format from Nomba');
    }

    const { bankAccountNumber, bankName } = parsed.data.data;
    return { accountNumber: bankAccountNumber, bankName: bankName ?? 'Nombank' };
  };

  return {
    createCustomer: async (vendorId: string, data: CreateCustomerInput) => {
      const vendor = await deps.vendors.byId(vendorId);
      if (!vendor) {
        throw new AppError(404, 'VENDOR_NOT_FOUND', 'Vendor not found');
      }

      const existing = await deps.customers.byEmailAndVendor(data.email, vendorId);
      if (existing) {
        throw new AppError(
          409,
          'CUSTOMER_EXISTS',
          'A customer with this email already exists for this vendor',
        );
      }

      let customer = await deps.customers.create({
        id: crypto.randomUUID(),
        vendor_id: vendorId,
        name: data.name,
        email: data.email,
      });

      if (data.provisionDva) {
        try {
          const { accountNumber, bankName } = await provisionDva(customer.id, vendorId, data.name);
          customer = await deps.customers.updateVa(customer.id, accountNumber, bankName);
        } catch (err) {
          log.error({ err, customerId: customer.id, vendorId }, 'Nomba DVA provisioning failed for customer');
          await deps.customers.delete(customer.id);
          throw err;
        }
      }

      return customer;
    },

    getCustomer: async (vendorId: string, customerId: string) => {
      const customer = await deps.customers.byVendorAndId(vendorId, customerId);
      if (!customer) {
        throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
      }
      return customer;
    },

    provisionCustomerDva: async (vendorId: string, customerId: string) => {
      const customer = await deps.customers.byVendorAndId(vendorId, customerId);
      if (!customer) {
        throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
      }

      if (customer.nomba_va_number) {
        throw new AppError(409, 'DVA_ALREADY_EXISTS', 'Customer already has a DVA provisioned');
      }

      try {
        const { accountNumber, bankName } = await provisionDva(customerId, vendorId, customer.name);
        return await deps.customers.updateVa(customerId, accountNumber, bankName);
      } catch (err) {
        log.error({ err, customerId, vendorId }, 'On-demand DVA provisioning failed for customer');
        throw err;
      }
    },
  };
}
