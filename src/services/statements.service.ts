import { AppError } from '../lib/errors.js';

export type StatementFilters = {
  from?: string;
  to?: string;
  status?: string;
};

export type PaginationParams = {
  page: number;
  pageSize: number;
};



export interface StatementsRepoStub {
  getVendorStatement: (vendorId: string, filters: StatementFilters, pagination: PaginationParams) => Promise<unknown>;
  getCustomerStatement: (vendorId: string, customerId: string, filters: StatementFilters, pagination: PaginationParams) => Promise<unknown>;
  getTransactions: (vendorId: string, pagination: PaginationParams) => Promise<unknown>;
  getPlatformSummary: (merchantId: string) => Promise<unknown>;
  getTransactionById: (id: string) => Promise<unknown>;
}

export function createStatementsService(deps: { repo: StatementsRepoStub }) {
  const enforceScope = (authVendorId: string | null, requestedVendorId: string) => {
    // If the caller is authenticated as a specific vendor, they can't request another vendor's data
    if (authVendorId && authVendorId !== requestedVendorId) {
      throw new AppError(403, 'UNAUTHORIZED', 'Cannot access statements for a different vendor');
    }
  };

  return {
    getVendorStatement: async (authVendorId: string | null, vendorId: string, filters: StatementFilters, pagination: PaginationParams) => {
      enforceScope(authVendorId, vendorId);
      const data = await deps.repo.getVendorStatement(vendorId, filters, pagination);
      // DB handles kobo conversions natively
      return data;
    },
    getCustomerStatement: async (authVendorId: string | null, vendorId: string, customerId: string, filters: StatementFilters, pagination: PaginationParams) => {
      enforceScope(authVendorId, vendorId);
      return await deps.repo.getCustomerStatement(vendorId, customerId, filters, pagination);
    },
    getTransactions: async (authVendorId: string | null, vendorId: string, pagination: PaginationParams) => {
      enforceScope(authVendorId, vendorId);
      return await deps.repo.getTransactions(vendorId, pagination);
    },
    getPlatformSummary: async (isMasterKey: boolean, merchantId: string) => {
      // Summary endpoint is master key only
      if (!isMasterKey) {
        throw new AppError(403, 'UNAUTHORIZED', 'Platform summary requires master key access');
      }
      return await deps.repo.getPlatformSummary(merchantId);
    },
    getTransactionById: async (authVendorId: string | null, id: string) => {
      const transaction = await deps.repo.getTransactionById(id);
      if (!transaction) {
        throw new AppError(404, 'NOT_FOUND', 'Transaction not found');
      }
      // Vendor-scoped keys can only view their own transactions
      const txVendorId = (transaction as Record<string, unknown>).vendor_id;
      if (authVendorId && authVendorId !== txVendorId) {
        throw new AppError(403, 'UNAUTHORIZED', 'Cannot access this transaction');
      }
      return transaction;
    }
  };
}
export type StatementsService = ReturnType<typeof createStatementsService>;
