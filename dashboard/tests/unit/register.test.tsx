import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Register from '../../pages/register';
import { api } from '../../lib/api';

// Mock Next router
vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock Layout
vi.mock('../../components/layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

// Mock API
vi.mock('../../lib/api', () => ({
  api: {
    post: vi.fn(),
  },
}));

// Mock auth so persistApiKey does not hit fetch during tests
vi.mock('../../lib/auth', () => ({
  setApiKey: vi.fn(),
  setMerchantId: vi.fn(),
}));

describe('Register Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const fillForm = (businessName: string, email: string, webhookUrl: string) => {
    fireEvent.change(screen.getByLabelText(/business name/i), { target: { value: businessName } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: email } });
    fireEvent.change(screen.getByLabelText(/webhook url/i), { target: { value: webhookUrl } });
  };

  it('shows inline validation errors on invalid input', async () => {
    render(<Register />);

    fillForm('ab', 'invalid-email', 'http://unsecure.com');
    fireEvent.click(screen.getByRole('button', { name: /register merchant/i }));

    expect(await screen.findByText(/business name must be at least 3 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
    expect(screen.getByText(/webhook url must be secure/i)).toBeInTheDocument();

    expect(api.post).not.toHaveBeenCalled();
  });

  it('submits registration form to correct endpoint on valid input', async () => {
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      api_key: 'sk_test_123',
      merchant: { id: 'merch_123' },
    });

    render(<Register />);

    fillForm('Valid Business', 'test@example.com', 'https://secure.com/webhook');
    fireEvent.click(screen.getByRole('button', { name: /register merchant/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/v1/merchants/register',
        {
          businessName: 'Valid Business',
          email: 'test@example.com',
          webhookUrl: 'https://secure.com/webhook',
        },
        expect.anything(),
      );
    });
  });

  it('displays API key screen once registration succeeds', async () => {
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      api_key: 'sk_test_success_123',
      merchant: { id: 'merch_123' },
    });

    render(<Register />);

    fillForm('Valid Business', 'test@example.com', 'https://secure.com/webhook');
    fireEvent.click(screen.getByRole('button', { name: /register merchant/i }));

    expect(await screen.findByText(/your merchant api key/i)).toBeInTheDocument();
    expect(screen.getByText(/sk_test_.*_123/i)).toBeInTheDocument();

    expect(screen.queryByLabelText(/business name/i)).not.toBeInTheDocument();
  });

  it('shows form error banner on API failure', async () => {
    (api.post as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    render(<Register />);

    fillForm('Valid Business', 'test@example.com', 'https://secure.com/webhook');
    fireEvent.click(screen.getByRole('button', { name: /register merchant/i }));

    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
  });
});
