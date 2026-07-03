import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createVendorsService } from '../../src/services/vendors.service.js';
import { AppError } from '../../src/lib/errors.js';
import type { VendorsRepo } from '../../src/repositories/vendors.repo.js';
import type { NombaClient } from '../../src/lib/nomba.js';

describe('Vendors Service', () => {
  const mockVendorsRepo = {
    create: vi.fn(),
    delete: vi.fn(),
    updateVa: vi.fn(),
    byId: vi.fn(),
    byNameAndMerchant: vi.fn(),
    findByKeyPrefix: vi.fn(),
  };

  const mockNombaClient = {
    authenticate: vi.fn(),
    close: vi.fn(),
    _setToken: vi.fn(),
    createVirtualAccount: vi.fn(),
    deleteVirtualAccount: vi.fn(),
    transferToBank: vi.fn(),
  };

  const service = createVendorsService({
    vendors: mockVendorsRepo as unknown as VendorsRepo,
    nomba: mockNombaClient as unknown as NombaClient,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a vendor, calls Nomba, and stores VA', async () => {
    mockVendorsRepo.byNameAndMerchant.mockResolvedValueOnce(null);
    mockVendorsRepo.create.mockResolvedValueOnce({ id: 'v123', merchant_id: 'm123', name: 'Test Vendor' });
    mockNombaClient.createVirtualAccount.mockResolvedValueOnce({
      data: {
        accountNumber: '1234567890',
        bankName: 'Test Bank',
      },
    });
    mockVendorsRepo.updateVa.mockResolvedValueOnce({
      id: 'v123',
      merchant_id: 'm123',
      name: 'Test Vendor',
      nomba_va_number: '1234567890',
      nomba_bank_name: 'Test Bank',
      va_status: 'active',
    });

    const res = await service.createVendor('m123', { name: 'Test Vendor' });

    expect(res.nomba_va_number).toBe('1234567890');
    expect(res.nomba_bank_name).toBe('Test Bank');
    expect(mockVendorsRepo.create).toHaveBeenCalled();
    expect(mockNombaClient.createVirtualAccount).toHaveBeenCalledWith({
      accountRef: expect.stringMatching(/^m123_[a-f0-9\-]+$/),
      accountName: 'Test Vendor',
    });
    expect(mockVendorsRepo.updateVa).toHaveBeenCalledWith(expect.any(String), '1234567890', 'Test Bank');
  });

  it('fails cleanly on Nomba error and deletes orphan record', async () => {
    mockVendorsRepo.byNameAndMerchant.mockResolvedValueOnce(null);
    mockVendorsRepo.create.mockResolvedValueOnce({ id: 'v123', merchant_id: 'm123', name: 'Test Vendor' });
    mockNombaClient.createVirtualAccount.mockRejectedValueOnce(new AppError(502, 'NOMBA_ERROR', 'Failed'));

    await expect(service.createVendor('m123', { name: 'Test Vendor' })).rejects.toThrow(AppError);

    expect(mockVendorsRepo.create).toHaveBeenCalled();
    expect(mockNombaClient.createVirtualAccount).toHaveBeenCalled();
    expect(mockVendorsRepo.delete).toHaveBeenCalled();
    expect(mockVendorsRepo.updateVa).not.toHaveBeenCalled();
  });

  it('fails if duplicate vendor name exists', async () => {
    mockVendorsRepo.byNameAndMerchant.mockResolvedValueOnce({ id: 'v123' });

    await expect(service.createVendor('m123', { name: 'Test Vendor' })).rejects.toThrow(/Vendor name already exists/);

    expect(mockVendorsRepo.create).not.toHaveBeenCalled();
    expect(mockNombaClient.createVirtualAccount).not.toHaveBeenCalled();
  });
});
