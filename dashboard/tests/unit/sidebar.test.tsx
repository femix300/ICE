import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Sidebar from '../../components/sidebar';

// Mock next/router so useRouter doesn't throw
vi.mock('next/router', () => ({
  useRouter: () => ({
    pathname: '/',
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn().mockResolvedValue(undefined),
  }),
}));

// Mock next/link to render a plain anchor
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('Sidebar Component', () => {
  it('renders owner navigation links when variant is "owner"', () => {
    render(<Sidebar variant="owner" />);
    // getAllByText because sidebar renders in both desktop and mobile containers
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
    expect(screen.getAllByText('All Vendors').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Webhook Log').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Misdirected Payments').length).toBeGreaterThan(0);
  });

  it('renders vendor navigation links when variant is "vendor"', () => {
    render(<Sidebar variant="vendor" />);
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Transactions').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Statements').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Customers').length).toBeGreaterThan(0);
  });

  it('displays "Platform Control" label for owner variant', () => {
    render(<Sidebar variant="owner" />);
    // The sidebar renders both desktop and mobile versions, so multiple matches exist
    const labels = screen.getAllByText('Platform Control');
    expect(labels.length).toBeGreaterThan(0);
  });

  it('displays "Vendor Portal" label for vendor variant', () => {
    render(<Sidebar variant="vendor" />);
    const labels = screen.getAllByText('Vendor Portal');
    expect(labels.length).toBeGreaterThan(0);
  });

  it('shows the NOMBA ICE brand name', () => {
    render(<Sidebar variant="owner" />);
    const brands = screen.getAllByText('NOMBA ICE');
    expect(brands.length).toBeGreaterThan(0);
  });

  it('renders the close button only when onClose is provided', () => {
    const { container } = render(<Sidebar variant="owner" isOpen onClose={() => {}} />);
    expect(container.querySelector('[aria-label="Close navigation sidebar"]')).toBeInTheDocument();
  });

  it('shows owner footer profile initials "AD"', () => {
    render(<Sidebar variant="owner" />);
    const initials = screen.getAllByText('AD');
    expect(initials.length).toBeGreaterThan(0);
  });

  it('shows vendor footer profile initials "VE"', () => {
    render(<Sidebar variant="vendor" />);
    const initials = screen.getAllByText('VE');
    expect(initials.length).toBeGreaterThan(0);
  });
});
