import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ApiKeyDisplay from '../../components/api-key-display';

// Mock clipboard
const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

describe('ApiKeyDisplay Component', () => {
  const mockApiKey = 'sk_test_1234567890abcdef';
  const mockOnContinue = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays the masked API key by default', () => {
    render(<ApiKeyDisplay apiKey={mockApiKey} onContinue={mockOnContinue} />);
    expect(screen.getByText('sk_test_••••••••cdef')).toBeInTheDocument();
  });

  it('toggles API key visibility when reveal button is clicked', () => {
    render(<ApiKeyDisplay apiKey={mockApiKey} onContinue={mockOnContinue} />);
    
    const toggleButton = screen.getByTitle('Show API key');
    fireEvent.click(toggleButton);
    expect(screen.getByText(mockApiKey)).toBeInTheDocument();
    
    const hideButton = screen.getByTitle('Hide API key');
    fireEvent.click(hideButton);
    expect(screen.getByText('sk_test_••••••••cdef')).toBeInTheDocument();
  });

  it('copies API key to clipboard when copy button is clicked', async () => {
    render(<ApiKeyDisplay apiKey={mockApiKey} onContinue={mockOnContinue} />);
    
    const copyButton = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyButton);
    
    expect(mockWriteText).toHaveBeenCalledWith(mockApiKey);
    expect(await screen.findByText(/copied!/i)).toBeInTheDocument();
  });

  it('enables the continue button only after the checkbox is checked', () => {
    render(<ApiKeyDisplay apiKey={mockApiKey} onContinue={mockOnContinue} />);
    
    const continueButton = screen.getByRole('button', { name: /continue to dashboard/i });
    const checkbox = screen.getByRole('checkbox');

    expect(continueButton).toBeDisabled();
    
    fireEvent.click(checkbox);
    expect(continueButton).toBeEnabled();
    
    fireEvent.click(checkbox);
    expect(continueButton).toBeDisabled();
  });

  it('calls onContinue when continue button is clicked', () => {
    render(<ApiKeyDisplay apiKey={mockApiKey} onContinue={mockOnContinue} />);
    
    const continueButton = screen.getByRole('button', { name: /continue to dashboard/i });
    const checkbox = screen.getByRole('checkbox');

    fireEvent.click(checkbox);
    fireEvent.click(continueButton);
    
    expect(mockOnContinue).toHaveBeenCalledTimes(1);
  });
});
