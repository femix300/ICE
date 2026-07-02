// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

// Mock next/router before importing components
vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    pathname: '/vendors/new',
    query: {},
    asPath: '/vendors/new',
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
const mockPost = vi.fn();
vi.mock('../../lib/api', () => ({
  api: {
    post: (...args: unknown[]) => mockPost(...args),
    get: vi.fn(),
  },
}));

import NewVendor from '../../pages/vendors/new';

describe('NewVendor Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the Create New Vendor heading', () => {
    render(<NewVendor />);
    expect(screen.getByText('Create New Vendor')).toBeDefined();
  });

  it('renders the vendor name input field', () => {
    render(<NewVendor />);
    const input = screen.getByPlaceholderText('e.g. Acme Stores Nigeria');
    expect(input).toBeDefined();
  });

  it('renders Create Vendor submit button', () => {
    render(<NewVendor />);
    expect(screen.getByText('Create Vendor')).toBeDefined();
  });

  it('renders Cancel button', () => {
    render(<NewVendor />);
    expect(screen.getByText('Cancel')).toBeDefined();
  });

  it('shows validation error for empty name on submit', async () => {
    render(<NewVendor />);
    const submitBtn = screen.getByText('Create Vendor');
    fireEvent.click(submitBtn);
    // After clicking submit, touched is set to true and validation runs
    await waitFor(() => {
      expect(screen.getByText(/Vendor name must be at least 2 characters/)).toBeDefined();
    });
  });

  it('shows validation error for single-character name on blur', async () => {
    render(<NewVendor />);
    const input = screen.getByPlaceholderText('e.g. Acme Stores Nigeria');
    fireEvent.change(input, { target: { value: 'A' } });
    fireEvent.blur(input);
    await waitFor(() => {
      expect(screen.getByText(/Vendor name must be at least 2 characters/)).toBeDefined();
    });
  });

  it('does not show validation error for valid name', () => {
    render(<NewVendor />);
    const input = screen.getByPlaceholderText('e.g. Acme Stores Nigeria');
    fireEvent.change(input, { target: { value: 'Acme Stores' } });
    fireEvent.blur(input);
    expect(screen.queryByText(/Vendor name must be at least 2 characters/)).toBeNull();
  });

  it('shows success screen with VA number after successful creation', async () => {
    mockPost.mockResolvedValueOnce({
      name: 'Acme Stores',
      nomba_va_number: '1234567890',
      nomba_bank_name: 'Nomba MFB',
    });

    render(<NewVendor />);
    const input = screen.getByPlaceholderText('e.g. Acme Stores Nigeria');
    fireEvent.change(input, { target: { value: 'Acme Stores' } });

    const submitBtn = screen.getByText('Create Vendor');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('1234567890')).toBeDefined();
      expect(screen.getByText('Nomba MFB')).toBeDefined();
    });
  });

  it('shows error message on API failure', async () => {
    mockPost.mockRejectedValueOnce(new Error('Network error'));

    render(<NewVendor />);
    const input = screen.getByPlaceholderText('e.g. Acme Stores Nigeria');
    fireEvent.change(input, { target: { value: 'Acme Stores' } });

    const submitBtn = screen.getByText('Create Vendor');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeDefined();
    });
  });

  it('calls POST /v1/vendors with vendor name', async () => {
    mockPost.mockResolvedValueOnce({
      name: 'Test Vendor',
      nomba_va_number: '9999999999',
      nomba_bank_name: 'Test Bank',
    });

    render(<NewVendor />);
    const input = screen.getByPlaceholderText('e.g. Acme Stores Nigeria');
    fireEvent.change(input, { target: { value: 'Test Vendor' } });

    const submitBtn = screen.getByText('Create Vendor');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/v1/vendors', { name: 'Test Vendor' });
    });
  });
});
