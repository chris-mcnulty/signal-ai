import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('wouter', () => ({
  useRoute: vi.fn().mockReturnValue([true, { slug: 'test-article' }]),
  useLocation: vi.fn().mockReturnValue(['/articles/test-article', vi.fn()]),
  Link: ({ href, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock('@workspace/api-client-react', () => ({
  useGetArticle: vi.fn(),
  useListArticles: vi.fn().mockReturnValue({ data: [], isLoading: false }),
  getGetArticleQueryKey: vi.fn().mockReturnValue(['article', 'test-article']),
  getListArticlesQueryKey: vi.fn().mockReturnValue(['articles']),
}));

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetClose: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { useGetArticle } from '@workspace/api-client-react';
import ArticlePage from '../pages/article';

const MOCK_ARTICLE = {
  id: 1,
  slug: 'test-article',
  title: 'Test Article Title',
  dek: 'A test article dek',
  body: 'First paragraph.\n\nSecond paragraph.',
  category: 'Technology',
  author: 'Jane Doe',
  readingMinutes: 5,
  publishedAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  heroImageUrl: null,
  sourceUrls: null,
};

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('ArticlePage — network error state', () => {
  const mockRefetch = vi.fn().mockResolvedValue({});

  beforeEach(() => {
    vi.mocked(useGetArticle).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mockRefetch,
    } as ReturnType<typeof useGetArticle>);
    mockRefetch.mockClear();
  });

  it('shows the Connection Error heading when the API fails', () => {
    render(<ArticlePage />, { wrapper });

    expect(screen.getByText('Connection Error')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /unable to load/i })).toBeInTheDocument();
  });

  it('shows the Try Again retry button — not a skeleton or 404', () => {
    const { container } = render(<ArticlePage />, { wrapper });

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.queryByText('Error 404')).not.toBeInTheDocument();
    expect(container.querySelector('.news-skeleton')).toBeNull();
  });

  it('calls refetch when the retry button is clicked', async () => {
    const user = userEvent.setup();
    render(<ArticlePage />, { wrapper });

    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(mockRefetch).toHaveBeenCalledOnce();
  });

  it('renders article content after retry resolves with data', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ArticlePage />, { wrapper });

    expect(screen.getByText('Connection Error')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(mockRefetch).toHaveBeenCalledOnce();

    vi.mocked(useGetArticle).mockReturnValue({
      data: MOCK_ARTICLE,
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    } as ReturnType<typeof useGetArticle>);

    rerender(<ArticlePage />);

    await waitFor(() => {
      expect(screen.getByText('Test Article Title')).toBeInTheDocument();
    });
    expect(screen.queryByText('Connection Error')).not.toBeInTheDocument();
  });
});
