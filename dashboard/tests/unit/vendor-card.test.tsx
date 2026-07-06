// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import VendorCard, { type Vendor } from '../../components/vendor-card';

// Mock the logger to avoid pino initialization in test
vi.mock('../../lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

const activeVendor: Vendor = {
  id: 'v-001',
  merchant_id: 'm-001',
  name: 'Acme Stores',
  nomba_va_number: '1234567890',
  nomba_bank_name: 'Nomba MFB',
  va_status: 'active',
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
};

const suspendedVendor: Vendor = {
  ...activeVendor,
  id: 'v-002',
  va_status: 'suspended',
};

const pendingVendor: Vendor = {
  ...activeVendor,
  id: 'v-003',
  va_status: 'pending',
  nomba_va_number: null,
  nomba_bank_name: null,
};

describe('VendorCard', () => {
  afterEach(() => {
    cleanup();
  });
  it('renders vendor name and id', () => {
    render(<VendorCard vendor={activeVendor} onSuspend={vi.fn()} onGenerateKey={vi.fn()} />);
    expect(screen.getByText('Acme Stores')).toBeDefined();
    expect(screen.getByText('v-001')).toBeDefined();
  });

  it('displays the correct status badge text', () => {
    render(<VendorCard vendor={activeVendor} onSuspend={vi.fn()} onGenerateKey={vi.fn()} />);
    expect(screen.getByText('active')).toBeDefined();
  });

  it('renders active status badge with emerald styling', () => {
    render(<VendorCard vendor={activeVendor} onSuspend={vi.fn()} onGenerateKey={vi.fn()} />);
    const badge = screen.getByText('active');
    expect(badge.className).toContain('text-emerald-400');
  });

  it('renders suspended status badge with red styling', () => {
    render(<VendorCard vendor={suspendedVendor} onSuspend={vi.fn()} onGenerateKey={vi.fn()} />);
    const badge = screen.getByText('suspended');
    expect(badge.className).toContain('text-red-400');
  });

  it('renders pending status badge with amber styling', () => {
    render(<VendorCard vendor={pendingVendor} onSuspend={vi.fn()} onGenerateKey={vi.fn()} />);
    const badge = screen.getByText('pending');
    expect(badge.className).toContain('text-amber-400');
  });

  it('displays VA number and bank name when available', () => {
    render(<VendorCard vendor={activeVendor} onSuspend={vi.fn()} onGenerateKey={vi.fn()} />);
    expect(screen.getByText('1234567890')).toBeDefined();
    expect(screen.getByText('Nomba MFB')).toBeDefined();
  });

  it('shows pending message when VA number is null', () => {
    render(<VendorCard vendor={pendingVendor} onSuspend={vi.fn()} onGenerateKey={vi.fn()} />);
    expect(screen.getByText('Account provisioning pending...')).toBeDefined();
  });

  it('shows Suspend and API Key buttons for active vendors', () => {
    render(<VendorCard vendor={activeVendor} onSuspend={vi.fn()} onGenerateKey={vi.fn()} />);
    expect(screen.getByText('Suspend')).toBeDefined();
    expect(screen.getByText('API Key')).toBeDefined();
  });

  it('hides action buttons for suspended vendors', () => {
    render(<VendorCard vendor={suspendedVendor} onSuspend={vi.fn()} onGenerateKey={vi.fn()} />);
    expect(screen.queryByText('Suspend')).toBeNull();
    expect(screen.queryByText('API Key')).toBeNull();
  });

  it('calls onSuspend with vendor id when Suspend is clicked', () => {
    const onSuspend = vi.fn();
    render(<VendorCard vendor={activeVendor} onSuspend={onSuspend} onGenerateKey={vi.fn()} />);
    fireEvent.click(screen.getByText('Suspend'));
    expect(onSuspend).toHaveBeenCalledWith('v-001');
  });

  it('calls onGenerateKey with vendor id when API Key is clicked', () => {
    const onGenerateKey = vi.fn();
    render(<VendorCard vendor={activeVendor} onSuspend={vi.fn()} onGenerateKey={onGenerateKey} />);
    fireEvent.click(screen.getByText('API Key'));
    expect(onGenerateKey).toHaveBeenCalledWith('v-001');
  });

  it('shows copy button with correct aria-label when VA number exists', () => {
    render(<VendorCard vendor={activeVendor} onSuspend={vi.fn()} onGenerateKey={vi.fn()} />);
    expect(screen.getByLabelText('Copy VA account number')).toBeDefined();
  });

  it('displays registration date', () => {
    render(<VendorCard vendor={activeVendor} onSuspend={vi.fn()} onGenerateKey={vi.fn()} />);
    // The date format depends on locale, but the text "Registered:" label should be present
    expect(screen.getByText('Registered:')).toBeDefined();
  });
});
