// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

// Mock next/router
const mockPush = vi.fn();
vi.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
    pathname: '/vendors',
    query: {},
    asPath: '/vendors',
  }),
}));

// Mock logger
vi.mock('../../lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Mock config
vi.mock('../../lib/config', () => ({
  config: {
    NEXT_PUBLIC_API_URL: 'https://api.test.com',
    NODE_ENV: 'test',
  },
}));

// Mock api module
const mockGet = vi.fn();
const mockPost = vi.fn();
vi.mock('../../lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

import VendorsIndex from '../../pages/vendors/index';

const sampleVendors = [
  {
    id: 'v-001',
    merchant_id: 'm-001',
    name: 'Acme Stores',
    nomba_va_number: '1234567890',
    nomba_bank_name: 'Nomba MFB',
    va_status: 'active' as const,
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
  },
  {
    id: 'v-002',
    merchant_id: 'm-001',
    name: 'Beta Corp',
    nomba_va_number: '0987654321',
    nomba_bank_name: 'Nomba MFB',
    va_status: 'suspended' as const,
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
  },
];

describe('VendorsIndex Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ rows: sampleVendors, total: 2 });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the Vendors heading', async () => {
    render(<VendorsIndex />);
    expect(screen.getByText('Marketplace Vendors')).toBeDefined();
  });

  it('renders the Add Vendor button', () => {
    render(<VendorsIndex />);
    expect(screen.getByText('Add New Vendor')).toBeDefined();
  });

  it('fetches vendor list on mount', async () => {
    render(<VendorsIndex />);
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/v1/vendors?limit=6&offset=0');
    });
  });

  it('renders vendor cards after data loads', async () => {
    render(<VendorsIndex />);
    await waitFor(() => {
      expect(screen.getByText('Acme Stores')).toBeDefined();
      expect(screen.getByText('Beta Corp')).toBeDefined();
    });
  });

  it('renders status filter buttons', async () => {
    render(<VendorsIndex />);
    expect(screen.getByText('all')).toBeDefined();
    expect(screen.getByText('active')).toBeDefined();
    expect(screen.getByText('suspended')).toBeDefined();
  });

  it('filters vendors by active status when Active filter is clicked', async () => {
    render(<VendorsIndex />);

    await waitFor(() => {
      expect(screen.getByText('Acme Stores')).toBeDefined();
    });

    const activeFilter = screen.getByRole('button', { name: 'active' });
    fireEvent.click(activeFilter);

    // Active vendor should still be visible, suspended should not
    expect(screen.getByText('Acme Stores')).toBeDefined();
    expect(screen.queryByText('Beta Corp')).toBeNull();
  });

  it('shows all vendors when All filter is clicked', async () => {
    render(<VendorsIndex />);

    await waitFor(() => {
      expect(screen.getByText('Acme Stores')).toBeDefined();
    });

    // First filter to Active
    fireEvent.click(screen.getByRole('button', { name: 'active' }));
    // Then go back to All
    fireEvent.click(screen.getByRole('button', { name: 'all' }));

    expect(screen.getByText('Acme Stores')).toBeDefined();
    expect(screen.getByText('Beta Corp')).toBeDefined();
  });

  it('displays error message on API failure', async () => {
    mockGet.mockRejectedValueOnce(new Error('Failed to load'));

    render(<VendorsIndex />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load')).toBeDefined();
    });
  });

  it('navigates to /vendors/new when Add Vendor is clicked', async () => {
    render(<VendorsIndex />);
    const addBtn = screen.getByText('Add New Vendor');
    fireEvent.click(addBtn);
    expect(mockPush).toHaveBeenCalledWith('/vendors/new');
  });

  it('opens suspend confirmation modal when suspend is clicked on active vendor', async () => {
    render(<VendorsIndex />);

    await waitFor(() => {
      expect(screen.getByText('Acme Stores')).toBeDefined();
    });

    // Find the Suspend button (only shows for active vendors)
    const suspendBtns = screen.getAllByText('Suspend');
    fireEvent.click(suspendBtns[0]!);

    // The confirmation modal text should appear
    await waitFor(() => {
      expect(screen.getByText('Suspend Vendor Account?')).toBeDefined();
    });
  });
});
