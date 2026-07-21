import { useRoute, Link } from 'wouter';
import { Twitter, Linkedin } from 'lucide-react';
import { useGetAuthor, useListAuthorArticles, getListAuthorArticlesQueryKey } from '@workspace/api-client-react';
import { DetailHeader, Footer, NetworkError } from '@/components/layout';

function AuthorSkeleton() {
  return (
    <div className="broadsheet-theme min-h-screen">
      <header className="site-header border-b border-news px-6 md:px-12 flex items-center justify-between sticky top-0 bg-news/95 backdrop-blur z-50">
        <div className="w-1/3" />
        <div className="w-1/3 text-center">
          <span className="font-serif text-xl font-black tracking-tight text-news-primary">
            bluetr<span className="text-accent">AI</span>l
          </span>
        </div>
        <div className="w-1/3" />
      </header>
      <main className="max-w-[900px] mx-auto px-6 py-16 space-y-8 animate-fade-in-up">
        <div className="flex items-center gap-6">
          <div className="news-skeleton w-24 h-24 rounded-none" />
          <div className="space-y-3 flex-1">
            <div className="news-skeleton h-8 w-48 rounded-none" />
            <div className="news-skeleton h-4 w-full rounded-none" />
            <div className="news-skeleton h-4 w-3/4 rounded-none" />
          </div>
        </div>
        <div className="news-skeleton h-px w-full rounded-none" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="news-skeleton h-24 w-full rounded-none" />
        ))}
      </main>
    </div>
  );
}

export default function AuthorPage() {
  const [, params] = useRoute('/authors/:slug');
  const slug = params?.slug || '';

  const {
    data: author,
    isLoading: authorLoading,
    isError: authorError,
    refetch: refetchAuthor,
  } = useGetAuthor(slug, { query: { enabled: !!slug } });

  const {
    data: articlesPage,
    isLoading: articlesLoading,
    isError: articlesError,
    refetch: refetchArticles,
  } = useListAuthorArticles(slug, {
    query: { enabled: !!slug, queryKey: getListAuthorArticlesQueryKey(slug) },
  });
  const articles = articlesPage?.items ?? [];

  if (authorLoading) return <AuthorSkeleton />;

  if (authorError) {
    return (
      <NetworkError
        onRetry={() => refetchAuthor()}
        backHref="/"
        backLabel="Return to Front Page"
      />
    );
  }

  if (!author) {
    return (
      <div className="broadsheet-theme min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="font-mono text-xs uppercase tracking-widest text-news-secondary mb-4">Error 404</div>
        <hr className="border-t-4 border-news mb-6 w-16 mx-auto" />
        <h1 className="font-serif text-5xl font-bold mb-4">Author Not Found</h1>
        <Link href="/" className="font-mono text-sm uppercase tracking-widest text-accent border border-accent px-5 py-2.5 hover:bg-accent hover:text-white transition-colors duration-200">
          Return to Front Page
        </Link>
      </div>
    );
  }

  const twitterUrl = author.twitterHandle
    ? `https://twitter.com/${author.twitterHandle.replace(/^@/, '')}`
    : null;

  return (
    <div className="broadsheet-theme">
      <DetailHeader backHref="/" backLabel="Home" />

      <main className="max-w-[900px] mx-auto px-6 py-16 md:py-24">
        {/* Author header */}
        <header className="mb-16 animate-fade-in-up">
          <div className="flex items-start gap-8">
            {author.avatarUrl ? (
              <img
                src={author.avatarUrl}
                alt={author.name}
                className="w-24 h-24 object-cover border border-news shrink-0"
              />
            ) : (
              <div className="w-24 h-24 bg-[#1a1a1a] flex items-center justify-center shrink-0 border border-news">
                <span className="font-serif text-4xl font-bold text-white leading-none">
                  {author.name.charAt(0)}
                </span>
              </div>
            )}
            <div className="flex-1">
              <div className="font-mono text-xs uppercase tracking-widest text-news-secondary mb-2">
                {author.isStaff ? 'BlueTrail Staff' : 'Contributor'}
              </div>
              <h1 className="font-serif text-4xl md:text-5xl font-bold leading-tight mb-4">
                {author.name}
              </h1>
              {author.bio && (
                <p className="text-lg text-news-secondary font-serif leading-relaxed mb-5">
                  {author.bio}
                </p>
              )}
              <div className="flex items-center gap-4">
                {twitterUrl && (
                  <a
                    href={twitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 font-mono text-xs text-news-secondary hover:text-accent transition-colors uppercase tracking-wider"
                  >
                    <Twitter size={14} />
                    {author.twitterHandle}
                  </a>
                )}
                {author.linkedInUrl && (
                  <a
                    href={author.linkedInUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 font-mono text-xs text-news-secondary hover:text-accent transition-colors uppercase tracking-wider"
                  >
                    <Linkedin size={14} />
                    LinkedIn
                  </a>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Articles by author */}
        <section className="animate-fade-in-up delay-100">
          <div className="border-t-4 border-black pt-6 mb-10">
            <h2 className="font-serif text-2xl font-bold">
              {articlesLoading
                ? 'Loading articles…'
                : articlesError
                  ? 'Could not load articles'
                  : articles.length === 0
                    ? 'No published articles'
                    : `${articles.length} Published Article${articles.length !== 1 ? 's' : ''}`}
            </h2>
          </div>

          {articlesError && (
            <div className="border border-news py-8 px-6 text-center">
              <p className="font-mono text-xs uppercase tracking-widest text-news-secondary mb-4">Failed to load articles</p>
              <button
                onClick={() => refetchArticles()}
                className="font-mono text-xs uppercase tracking-widest text-accent border border-accent px-4 py-2 hover:bg-accent hover:text-white transition-colors duration-200"
              >
                Try Again
              </button>
            </div>
          )}

          {!articlesLoading && !articlesError && articles.length > 0 && (
            <div className="space-y-0 divide-y divide-news">
              {articles.map((article) => {
                const publishedDate = article.publishedAt
                  ? new Date(article.publishedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : '';
                const href = article.category === 'case-study'
                  ? `/case-studies/${article.slug}`
                  : `/articles/${article.slug}`;
                return (
                  <article key={article.id} className="py-8 group">
                    <Link href={href} className="block">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="font-mono text-xs font-bold uppercase text-accent tracking-widest border border-accent px-2 py-0.5">
                          {article.category}
                        </span>
                        {publishedDate && (
                          <span className="font-mono text-xs text-news-secondary uppercase">
                            {publishedDate}
                            {article.readingMinutes ? ` · ${article.readingMinutes} min read` : ''}
                          </span>
                        )}
                      </div>
                      <h3 className="font-serif text-2xl font-bold leading-tight mb-2 group-hover:text-accent transition-colors">
                        {article.title}
                      </h3>
                      {(article.dek || article.excerpt) && (
                        <p className="text-news-secondary font-serif leading-relaxed line-clamp-2">
                          {article.dek || article.excerpt}
                        </p>
                      )}
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
