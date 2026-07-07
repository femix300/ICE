// Stub AppError until P01 is merged
class AppError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export interface StatementsRepoStub {
  getVendorStatement: (vendorId: string, filters: unknown, pagination: unknown) => Promise<unknown>;
  getCustomerStatement: (
    vendorId: string,
    customerId: string,
    filters: unknown,
    pagination: unknown,
  ) => Promise<unknown>;
  getTransactions: (vendorId: string, pagination: unknown) => Promise<unknown>;
}

export function createStatementsService(deps: { repo: StatementsRepoStub }) {
  const enforceScope = (authVendorId: string | null, requestedVendorId: string) => {
    // If the caller is authenticated as a specific vendor, they can't request another vendor's data
    if (authVendorId && authVendorId !== requestedVendorId) {
      throw new AppError('UNAUTHORIZED', 'Cannot access statements for a different vendor');
    }
  };

  return {
    getVendorStatement: async (
      authVendorId: string | null,
      vendorId: string,
      filters: unknown,
      pagination: unknown,
    ) => {
      enforceScope(authVendorId, vendorId);
      const data = await deps.repo.getVendorStatement(vendorId, filters, pagination);
      // DB handles kobo conversions natively
      return data;
    },
    getCustomerStatement: async (
      authVendorId: string | null,
      vendorId: string,
      customerId: string,
      filters: unknown,
      pagination: unknown,
    ) => {
      enforceScope(authVendorId, vendorId);
      return await deps.repo.getCustomerStatement(vendorId, customerId, filters, pagination);
    },
    getTransactions: async (authVendorId: string | null, vendorId: string, pagination: unknown) => {
      enforceScope(authVendorId, vendorId);
      return await deps.repo.getTransactions(vendorId, pagination);
    },
  };
}
