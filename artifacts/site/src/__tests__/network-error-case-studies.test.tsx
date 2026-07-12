import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('wouter', () => ({
  useRoute: vi.fn().mockReturnValue([false, null]),
  useLocation: vi.fn().mockReturnValue(['/case-studies', vi.fn()]),
  Link: ({ href, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock('@workspace/api-client-react', () => ({
  useListCaseStudies: vi.fn(),
  useListArticles: vi.fn().mockReturnValue({ data: [], isLoading: false }),
}));

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetClose: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { useListCaseStudies } from '@workspace/api-client-react';
import CaseStudiesPage from '../pages/case-studies';

const MOCK_CASE_STUDIES = [
  {
    id: 1,
    slug: 'acme-ai-deployment',
    title: 'How Acme Deployed AI at Scale',
    dek: 'A look at their journey.',
    author: 'Jane Doe',
    readingMinutes: 6,
    publishedAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    company: {
      name: 'Acme Corp',
      industry: 'Technology',
      size: '500-1000',
      website: 'https://acme.example.com',
      summary: 'A leading tech company',
    },
    metrics: [{ value: '40%', label: 'Cost Reduction', context: '' }],
    heroImageUrl: null,
    sourceUrls: null,
  },
];

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('CaseStudiesPage — network error state', () => {
  const mockRefetch = vi.fn().mockResolvedValue({});

  beforeEach(() => {
    vi.mocked(useListCaseStudies).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mockRefetch,
    } as ReturnType<typeof useListCaseStudies>);
    mockRefetch.mockClear();
  });

  it('shows the Connection Error heading when the API fails', () => {
    render(<CaseStudiesPage />, { wrapper });

    expect(screen.getByText('Connection Error')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /unable to load/i })).toBeInTheDocument();
  });

  it('shows the Try Again retry button — not a skeleton or the page content', () => {
    const { container } = render(<CaseStudiesPage />, { wrapper });

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.queryByText('Enterprise Case Studies')).not.toBeInTheDocument();
    expect(container.querySelector('.news-skeleton')).toBeNull();
  });

  it('calls refetch when the retry button is clicked', async () => {
    const user = userEvent.setup();
    render(<CaseStudiesPage />, { wrapper });

    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(mockRefetch).toHaveBeenCalledOnce();
  });

  it('renders case studies list after retry resolves with data', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<CaseStudiesPage />, { wrapper });

    expect(screen.getByText('Connection Error')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(mockRefetch).toHaveBeenCalledOnce();

    vi.mocked(useListCaseStudies).mockReturnValue({
      data: MOCK_CASE_STUDIES,
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    } as ReturnType<typeof useListCaseStudies>);

    rerender(<CaseStudiesPage />);

    await waitFor(() => {
      expect(screen.getByText('Enterprise Case Studies')).toBeInTheDocument();
    });
    expect(screen.queryByText('Connection Error')).not.toBeInTheDocument();
  });
});
