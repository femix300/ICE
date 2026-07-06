// Shared types will go here

export interface VendorPublic {
  id: string;
  merchant_id: string;
  name: string;
  callback_url: string | null;
  nomba_va_number: string | null;
  nomba_bank_name: string | null;
  va_status: 'pending' | 'active' | 'suspended';
  created_at: Date;
  updated_at: Date;
}

export interface VendorsService {
  createVendor(merchantId: string, data: { name: string }): Promise<VendorPublic>;
  getVendor(id: string): Promise<VendorPublic>;
  generateApiKey(id: string, merchantId: string): Promise<{ api_key: string; message: string }>;
  suspendAccount(id: string, merchantId: string): Promise<VendorPublic>;
  listVendors(
    merchantId: string,
    page: number,
    pageSize: number,
    status?: string,
  ): Promise<{
    data: VendorPublic[];
    meta: { page: number; pageSize: number; total: number; totalPages: number };
  }>;
  updateAccount(
    id: string,
    merchantId: string,
    data: { name?: string; callbackUrl?: string },
  ): Promise<VendorPublic>;
}

export interface CustomerPublic {
  id: string;
  vendor_id: string;
  name: string;
  email: string;
  nomba_va_number: string | null;
  nomba_bank_name: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CustomersService {
  createCustomer(
    vendorId: string,
    data: { name: string; email: string; provisionDva: boolean },
  ): Promise<CustomerPublic>;
  getCustomer(vendorId: string, customerId: string): Promise<CustomerPublic>;
  provisionCustomerDva(vendorId: string, customerId: string): Promise<CustomerPublic>;
}
