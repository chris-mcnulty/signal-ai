import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('wouter', () => ({
  useRoute: vi.fn().mockReturnValue([true, { slug: 'test-case-study' }]),
  useLocation: vi.fn().mockReturnValue(['/case-studies/test-case-study', vi.fn()]),
  Link: ({ href, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock('@workspace/api-client-react', () => ({
  useGetCaseStudy: vi.fn(),
  useListArticles: vi.fn().mockReturnValue({ data: [], isLoading: false }),
  getGetCaseStudyQueryKey: vi.fn().mockReturnValue(['case-study', 'test-case-study']),
}));

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetClose: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { useGetCaseStudy } from '@workspace/api-client-react';
import CaseStudyDetail from '../pages/case-study';

const MOCK_CASE_STUDY = {
  id: 1,
  slug: 'test-case-study',
  title: 'Test Case Study Title',
  dek: 'A test case study dek',
  body: 'First paragraph.\n\nSecond paragraph.',
  author: 'John Doe',
  readingMinutes: 8,
  publishedAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  company: {
    name: 'Acme Corp',
    industry: 'Technology',
    size: '500-1000',
    website: 'https://acme.example.com',
    summary: 'A test company',
  },
  metrics: [{ value: '40%', label: 'Cost Reduction', context: 'Year over year' }],
  quotes: [],
  heroImageUrl: null,
  sourceUrls: null,
  relatedArticles: [],
};

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('CaseStudyDetail — network error state', () => {
  const mockRefetch = vi.fn().mockResolvedValue({});

  beforeEach(() => {
    vi.mocked(useGetCaseStudy).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mockRefetch,
    } as ReturnType<typeof useGetCaseStudy>);
    mockRefetch.mockClear();
  });

  it('shows the Connection Error heading when the API fails', () => {
    render(<CaseStudyDetail />, { wrapper });

    expect(screen.getByText('Connection Error')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /unable to load/i })).toBeInTheDocument();
  });

  it('shows the Try Again retry button — not a skeleton or 404', () => {
    const { container } = render(<CaseStudyDetail />, { wrapper });

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.queryByText('Error 404')).not.toBeInTheDocument();
    expect(container.querySelector('.news-skeleton')).toBeNull();
  });

  it('calls refetch when the retry button is clicked', async () => {
    const user = userEvent.setup();
    render(<CaseStudyDetail />, { wrapper });

    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(mockRefetch).toHaveBeenCalledOnce();
  });

  it('renders case study content after retry resolves with data', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<CaseStudyDetail />, { wrapper });

    expect(screen.getByText('Connection Error')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(mockRefetch).toHaveBeenCalledOnce();

    vi.mocked(useGetCaseStudy).mockReturnValue({
      data: MOCK_CASE_STUDY,
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    } as ReturnType<typeof useGetCaseStudy>);

    rerender(<CaseStudyDetail />);

    await waitFor(() => {
      expect(screen.getByText('Test Case Study Title')).toBeInTheDocument();
    });
    expect(screen.queryByText('Connection Error')).not.toBeInTheDocument();
  });
});
