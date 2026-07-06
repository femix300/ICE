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
        bankAccountNumber: '1234567890',
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

  it('generates an api key for a vendor', async () => {
    mockVendorsRepo.byId.mockResolvedValueOnce({ id: 'v123', merchant_id: 'm123', name: 'Test' });
    mockVendorsRepo.updateApiKey.mockResolvedValueOnce(undefined);

    const res = await service.generateApiKey('v123', 'm123');

    expect(res.api_key.startsWith('ice_')).toBe(true);
    expect(mockVendorsRepo.updateApiKey).toHaveBeenCalledWith('v123', expect.any(String), expect.any(String));
  });

  it('suspends an active vendor account', async () => {
    mockVendorsRepo.byId.mockResolvedValueOnce({ id: 'v123', merchant_id: 'm123', va_status: 'active' });
    mockNombaClient.deleteVirtualAccount.mockResolvedValueOnce(undefined);
    mockVendorsRepo.updateStatus.mockResolvedValueOnce({ id: 'v123', merchant_id: 'm123', va_status: 'suspended' });

    const res = await service.suspendAccount('v123', 'm123');

    expect(res.va_status).toBe('suspended');
    expect(mockNombaClient.deleteVirtualAccount).toHaveBeenCalledWith('m123_v123');
    expect(mockVendorsRepo.updateStatus).toHaveBeenCalledWith('v123', 'suspended');
  });

  it('lists vendors for a merchant', async () => {
    mockVendorsRepo.list.mockResolvedValueOnce({
      data: [{ id: 'v123', merchant_id: 'm123', api_key_hash: 'hash', api_key_prefix: 'pref' }],
      total: 1,
    });

    const res = await service.listVendors('m123', 1, 20);

    expect(res.meta.total).toBe(1);
    expect(res.data[0]).not.toHaveProperty('api_key_hash');
    expect(res.data[0]).not.toHaveProperty('api_key_prefix');
    expect(mockVendorsRepo.list).toHaveBeenCalledWith('m123', 20, 0, undefined);
  });

  it('updates vendor account in DB and Nomba', async () => {
    mockVendorsRepo.byId.mockResolvedValueOnce({ id: 'v123', merchant_id: 'm123' });
    mockNombaClient.updateVirtualAccount.mockResolvedValueOnce(undefined);
    mockVendorsRepo.updateAccount.mockResolvedValueOnce({ id: 'v123', merchant_id: 'm123', name: 'New Name' });

    const res = await service.updateAccount('v123', 'm123', { name: 'New Name', callbackUrl: 'https://new.url' });

    expect(res.name).toBe('New Name');
    expect(mockNombaClient.updateVirtualAccount).toHaveBeenCalledWith('m123_v123', { accountName: 'New Name' });
    expect(mockVendorsRepo.updateAccount).toHaveBeenCalledWith('v123', 'New Name', 'https://new.url');
  });

  // Scope enforcement: vendor keys can only access their own data
  it('rejects generateApiKey when vendor belongs to a different merchant', async () => {
    // Vendor 'v123' belongs to merchant 'm123', not to 'm999'
    mockVendorsRepo.byId.mockResolvedValueOnce({ id: 'v123', merchant_id: 'm123' });

    await expect(service.generateApiKey('v123', 'm999')).rejects.toThrow(/Vendor not found/);

    expect(mockVendorsRepo.updateApiKey).not.toHaveBeenCalled();
  });

  it('rejects suspendAccount when vendor belongs to a different merchant', async () => {
    mockVendorsRepo.byId.mockResolvedValueOnce({ id: 'v123', merchant_id: 'm123', va_status: 'active' });

    await expect(service.suspendAccount('v123', 'm999')).rejects.toThrow(/Vendor not found/);

    expect(mockNombaClient.deleteVirtualAccount).not.toHaveBeenCalled();
    expect(mockVendorsRepo.updateStatus).not.toHaveBeenCalled();
  });

  it('rejects updateAccount when vendor belongs to a different merchant', async () => {
    mockVendorsRepo.byId.mockResolvedValueOnce({ id: 'v123', merchant_id: 'm123' });

    await expect(
      service.updateAccount('v123', 'm999', { name: 'Hijacked Name' }),
    ).rejects.toThrow(/Vendor not found/);

    expect(mockNombaClient.updateVirtualAccount).not.toHaveBeenCalled();
    expect(mockVendorsRepo.updateAccount).not.toHaveBeenCalled();
  });

  it('listVendors only returns vendors for the requesting merchant', async () => {
    // Only m123 vendors are returned; m999 gets an empty list
    mockVendorsRepo.list.mockResolvedValueOnce({ data: [], total: 0 });

    const res = await service.listVendors('m999', 1, 20);

    expect(res.data).toHaveLength(0);
    expect(res.meta.total).toBe(0);
    // The repo must have been queried with m999, not m123
    expect(mockVendorsRepo.list).toHaveBeenCalledWith('m999', 20, 0, undefined);
  });
});
