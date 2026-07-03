import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Layout from '../../components/layout';

// Mock the Sidebar component to isolate Layout testing
vi.mock('../../components/sidebar', () => ({
  default: ({ variant }: { variant: string }) => (
    <nav data-testid="sidebar" data-variant={variant} />
  ),
}));

describe('Layout Component', () => {
  it('renders children inside the main content area', () => {
    render(
      <Layout variant="owner">
        <p>Test Content</p>
      </Layout>,
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders "Platform Management" heading for owner variant', () => {
    render(
      <Layout variant="owner">
        <div />
      </Layout>,
    );
    expect(screen.getByText('Platform Management')).toBeInTheDocument();
  });

  it('renders "Vendor Terminal" heading for vendor variant', () => {
    render(
      <Layout variant="vendor">
        <div />
      </Layout>,
    );
    expect(screen.getByText('Vendor Terminal')).toBeInTheDocument();
  });

  it('renders the sidebar with the correct variant prop', () => {
    render(
      <Layout variant="vendor">
        <div />
      </Layout>,
    );
    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar).toHaveAttribute('data-variant', 'vendor');
  });

  it('shows "OP" avatar initials for owner variant', () => {
    render(
      <Layout variant="owner">
        <div />
      </Layout>,
    );
    expect(screen.getByText('OP')).toBeInTheDocument();
  });

  it('shows "VD" avatar initials for vendor variant', () => {
    render(
      <Layout variant="vendor">
        <div />
      </Layout>,
    );
    expect(screen.getByText('VD')).toBeInTheDocument();
  });
});
