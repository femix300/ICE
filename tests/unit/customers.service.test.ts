import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCustomersService } from '../../src/services/customers.service.js';
import { AppError } from '../../src/lib/errors.js';
import type { CustomersRepo } from '../../src/repositories/customers.repo.js';
import type { VendorsRepo } from '../../src/repositories/vendors.repo.js';
import type { NombaClient } from '../../src/lib/nomba.js';

describe('Customers Service', () => {
  const mockCustomersRepo = {
    create: vi.fn(),
    byId: vi.fn(),
    byVendorAndId: vi.fn(),
    byEmailAndVendor: vi.fn(),
    updateVa: vi.fn(),
    delete: vi.fn(),
  };

  const mockVendorsRepo = {
    create: vi.fn(),
    delete: vi.fn(),
    updateVa: vi.fn(),
    byId: vi.fn(),
    byNameAndMerchant: vi.fn(),
    findByKeyPrefix: vi.fn(),
    updateApiKey: vi.fn(),
    list: vi.fn(),
    updateAccount: vi.fn(),
    updateStatus: vi.fn(),
  };

  const mockNombaClient = {
    authenticate: vi.fn(),
    close: vi.fn(),
    _setToken: vi.fn(),
    createVirtualAccount: vi.fn(),
    updateVirtualAccount: vi.fn(),
    deleteVirtualAccount: vi.fn(),
    transferToBank: vi.fn(),
  };

  const service = createCustomersService({
    customers: mockCustomersRepo as unknown as CustomersRepo,
    vendors: mockVendorsRepo as unknown as VendorsRepo,
    nomba: mockNombaClient as unknown as NombaClient,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCustomer', () => {
    it('creates a customer without a DVA when provisionDva is false', async () => {
      mockVendorsRepo.byId.mockResolvedValueOnce({ id: 'v123', merchant_id: 'm123', name: 'Vendor' });
      mockCustomersRepo.byEmailAndVendor.mockResolvedValueOnce(null);
      mockCustomersRepo.create.mockResolvedValueOnce({
        id: 'c123',
        vendor_id: 'v123',
        name: 'Alice',
        email: 'alice@example.com',
        nomba_va_number: null,
        nomba_bank_name: null,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await service.createCustomer('v123', {
        name: 'Alice',
        email: 'alice@example.com',
        provisionDva: false,
      });

      expect(result.nomba_va_number).toBeNull();
      expect(mockNombaClient.createVirtualAccount).not.toHaveBeenCalled();
      expect(mockCustomersRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ vendor_id: 'v123', name: 'Alice', email: 'alice@example.com' }),
      );
    });

    it('creates a customer and provisions a DVA when provisionDva is true', async () => {
      mockVendorsRepo.byId.mockResolvedValueOnce({ id: 'v123', merchant_id: 'm123', name: 'Vendor' });
      mockCustomersRepo.byEmailAndVendor.mockResolvedValueOnce(null);
      mockCustomersRepo.create.mockResolvedValueOnce({
        id: 'c123',
        vendor_id: 'v123',
        name: 'Bob',
        email: 'bob@example.com',
        nomba_va_number: null,
        nomba_bank_name: null,
      });
      mockNombaClient.createVirtualAccount.mockResolvedValueOnce({
        data: { bankAccountNumber: '9876543210', bankName: 'Nombank' },
      });
      mockCustomersRepo.updateVa.mockResolvedValueOnce({
        id: 'c123',
        vendor_id: 'v123',
        name: 'Bob',
        email: 'bob@example.com',
        nomba_va_number: '9876543210',
        nomba_bank_name: 'Nombank',
      });

      const result = await service.createCustomer('v123', {
        name: 'Bob',
        email: 'bob@example.com',
        provisionDva: true,
      });

      expect(result.nomba_va_number).toBe('9876543210');
      expect(mockNombaClient.createVirtualAccount).toHaveBeenCalledWith({
        accountRef: expect.stringMatching(/^v123_[a-f0-9-]+$/),
        accountName: 'Bob',
      });
      expect(mockCustomersRepo.updateVa).toHaveBeenCalledWith(
        expect.any(String),
        '9876543210',
        'Nombank',
      );
    });

    it('throws VENDOR_NOT_FOUND when vendor does not exist', async () => {
      mockVendorsRepo.byId.mockResolvedValueOnce(null);

      await expect(
        service.createCustomer('v999', { name: 'Alice', email: 'alice@example.com', provisionDva: false }),
      ).rejects.toThrow(/Vendor not found/);

      expect(mockCustomersRepo.create).not.toHaveBeenCalled();
    });

    it('throws CUSTOMER_EXISTS on duplicate email for the same vendor', async () => {
      mockVendorsRepo.byId.mockResolvedValueOnce({ id: 'v123' });
      mockCustomersRepo.byEmailAndVendor.mockResolvedValueOnce({ id: 'c-existing' });

      await expect(
        service.createCustomer('v123', { name: 'Alice', email: 'alice@example.com', provisionDva: false }),
      ).rejects.toThrow(/already exists/);

      expect(mockCustomersRepo.create).not.toHaveBeenCalled();
    });

    it('bubbles up Nomba errors when DVA provisioning fails and performs rollback', async () => {
      mockVendorsRepo.byId.mockResolvedValueOnce({ id: 'v123' });
      mockCustomersRepo.byEmailAndVendor.mockResolvedValueOnce(null);
      mockCustomersRepo.create.mockResolvedValueOnce({
        id: 'c123',
        vendor_id: 'v123',
        name: 'Bob',
        email: 'bob@example.com',
        nomba_va_number: null,
      });
      mockNombaClient.createVirtualAccount.mockRejectedValueOnce(
        new AppError(502, 'NOMBA_ERROR', 'Nomba is down'),
      );

      await expect(
        service.createCustomer('v123', { name: 'Bob', email: 'bob@example.com', provisionDva: true }),
      ).rejects.toThrow(AppError);

      expect(mockCustomersRepo.create).toHaveBeenCalled();
      expect(mockCustomersRepo.updateVa).not.toHaveBeenCalled();
      expect(mockCustomersRepo.delete).toHaveBeenCalledWith('c123');
    });
  });

  describe('getCustomer', () => {
    it('returns a customer scoped to the correct vendor', async () => {
      mockCustomersRepo.byVendorAndId.mockResolvedValueOnce({
        id: 'c123',
        vendor_id: 'v123',
        name: 'Alice',
        email: 'alice@example.com',
        nomba_va_number: null,
      });

      const result = await service.getCustomer('v123', 'c123');

      expect(result.id).toBe('c123');
      expect(mockCustomersRepo.byVendorAndId).toHaveBeenCalledWith('v123', 'c123');
    });

    it('throws CUSTOMER_NOT_FOUND when customer does not exist for the vendor', async () => {
      mockCustomersRepo.byVendorAndId.mockResolvedValueOnce(null);

      await expect(service.getCustomer('v123', 'c-missing')).rejects.toThrow(/Customer not found/);
    });
  });

  describe('provisionCustomerDva', () => {
    it('provisions a DVA for an existing customer without one', async () => {
      mockCustomersRepo.byVendorAndId.mockResolvedValueOnce({
        id: 'c123',
        vendor_id: 'v123',
        name: 'Alice',
        email: 'alice@example.com',
        nomba_va_number: null,
      });
      mockNombaClient.createVirtualAccount.mockResolvedValueOnce({
        data: { bankAccountNumber: '1111111111', bankName: 'Nombank' },
      });
      mockCustomersRepo.updateVa.mockResolvedValueOnce({
        id: 'c123',
        vendor_id: 'v123',
        name: 'Alice',
        email: 'alice@example.com',
        nomba_va_number: '1111111111',
        nomba_bank_name: 'Nombank',
      });

      const result = await service.provisionCustomerDva('v123', 'c123');

      expect(result.nomba_va_number).toBe('1111111111');
      expect(mockNombaClient.createVirtualAccount).toHaveBeenCalledWith({
        accountRef: 'v123_c123',
        accountName: 'Alice',
      });
    });

    it('throws DVA_ALREADY_EXISTS when customer already has a DVA', async () => {
      mockCustomersRepo.byVendorAndId.mockResolvedValueOnce({
        id: 'c123',
        vendor_id: 'v123',
        name: 'Alice',
        nomba_va_number: '0000000001',
      });

      await expect(service.provisionCustomerDva('v123', 'c123')).rejects.toThrow(
        /already has a DVA/,
      );

      expect(mockNombaClient.createVirtualAccount).not.toHaveBeenCalled();
    });

    it('throws CUSTOMER_NOT_FOUND when customer does not exist', async () => {
      mockCustomersRepo.byVendorAndId.mockResolvedValueOnce(null);

      await expect(service.provisionCustomerDva('v123', 'c-missing')).rejects.toThrow(
        /Customer not found/,
      );
    });
  });
});
