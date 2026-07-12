import React from 'react';
import { Link } from 'wouter';
import { ChevronRight } from 'lucide-react';
import { useListArticles } from '@workspace/api-client-react';
import { Layout, Header, Footer, NetworkError } from '@/components/layout';

function NewsSkeleton() {
  return (
    <div className="space-y-0">
      <div className="border-b-4 border-news pb-12 mb-12">
        <div className="news-skeleton h-3 w-20 mb-4 rounded-none" />
        <div className="news-skeleton h-16 w-3/4 mb-4 rounded-none" />
        <div className="news-skeleton h-8 w-full mb-2 rounded-none" />
        <div className="news-skeleton h-8 w-5/6 mb-6 rounded-none" />
        <div className="news-skeleton aspect-video w-full rounded-none" />
      </div>
      <div className="space-y-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="border-b border-news pb-8 flex gap-6">
            <div className="flex-1 space-y-3">
              <div className="news-skeleton h-3 w-16 rounded-none" />
              <div className="news-skeleton h-7 w-3/4 rounded-none" />
              <div className="news-skeleton h-5 w-full rounded-none" />
              <div className="news-skeleton h-3 w-24 rounded-none" />
            </div>
            <div className="news-skeleton w-28 h-28 rounded-none shrink-0 hidden sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NewsPage() {
  const { data: articles, isLoading, isError, refetch } = useListArticles(
    { category: 'news' },
    { query: { retry: 1 } }
  );

  if (isError) {
    return (
      <NetworkError
        onRetry={() => refetch()}
        backHref="/"
        backLabel="Return to Front Page"
      />
    );
  }

  const featured = articles?.[0];
  const rest = articles?.slice(1) ?? [];

  return (
    <Layout>
      <Header />

      <main className="max-w-[1200px] mx-auto p-6 md:p-12 min-h-[60vh]">
        <div className="mb-12 border-b-4 border-news pb-8 animate-fade-in-up">
          <div className="font-mono text-xs font-bold uppercase tracking-widest text-accent mb-4">
            Industry Coverage
          </div>
          <h1 className="font-serif text-5xl md:text-7xl font-bold leading-[1.05] mb-4">
            News
          </h1>
          <p className="text-xl md:text-2xl text-news-secondary font-serif leading-relaxed max-w-3xl">
            Forward-looking coverage of commercial AI — the deals, deployments, and developments reshaping the industry.
          </p>
        </div>

        {isLoading ? (
          <NewsSkeleton />
        ) : articles && articles.length > 0 ? (
          <>
            {featured && (
              <Link
                href={`/articles/${featured.slug}`}
                className="block group article-card border-b-4 border-news pb-12 mb-12 animate-fade-in-up"
                data-testid={`link-news-featured-${featured.slug}`}
              >
                <article>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="card-category font-mono text-xs font-bold uppercase tracking-widest text-accent border border-accent px-2 py-1">
                      Featured
                    </span>
                    <span className="font-mono text-xs text-news-secondary uppercase">
                      {featured.readingMinutes} min read
                    </span>
                  </div>
                  <hr className="hero-rule" />
                  <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.05] mb-5 tracking-tight">
                    <span className="card-headline">{featured.title}</span>
                  </h2>
                  <p className="text-xl md:text-2xl text-news-secondary font-serif leading-relaxed mb-6">
                    {featured.dek}
                  </p>
                  {featured.heroImageUrl && (
                    <div className="card-image w-full aspect-video bg-[#e8e4de] mb-6 overflow-hidden">
                      <img
                        src={featured.heroImageUrl}
                        alt={featured.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex justify-between items-center border-t border-b border-news py-3 mt-4">
                    <div className="font-mono text-sm uppercase">
                      By <span className="font-bold text-news-primary">{featured.author}</span>
                    </div>
                    <span className="flex items-center gap-1 font-mono text-sm text-accent uppercase tracking-widest group-hover:gap-2 transition-all">
                      Read Article <ChevronRight size={16} />
                    </span>
                  </div>
                </article>
              </Link>
            )}

            {rest.length > 0 && (
              <section className="animate-fade-in-up">
                <div className="border-t-4 border-news pt-2 mb-8">
                  <h3 className="font-mono text-xs font-bold uppercase tracking-widest">Recent News</h3>
                </div>
                <div className="space-y-0">
                  {rest.map((article, index) => (
                    <Link
                      key={article.id}
                      href={`/articles/${article.slug}`}
                      className="block group article-card border-b border-news py-8"
                      style={{ animationDelay: `${(index + 1) * 80}ms` }}
                      data-testid={`link-news-${article.slug}`}
                    >
                      <article className="flex gap-6 items-start">
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-xs font-bold text-accent uppercase tracking-wider mb-2">
                            {article.category}
                          </div>
                          <h3 className="font-serif text-2xl md:text-3xl font-bold leading-tight mb-3">
                            <span className="card-headline">{article.title}</span>
                          </h3>
                          <p className="text-news-secondary font-serif leading-relaxed mb-3 line-clamp-2">
                            {article.dek}
                          </p>
                          <div className="flex items-center gap-4 font-mono text-xs text-news-secondary uppercase">
                            <span>By {article.author}</span>
                            <span>{article.readingMinutes} min read</span>
                          </div>
                        </div>
                        {article.heroImageUrl && (
                          <div className="card-image w-28 h-28 md:w-36 md:h-36 shrink-0 bg-[#e8e4de] overflow-hidden hidden sm:block">
                            <img
                              src={article.heroImageUrl}
                              alt={article.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </article>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <div className="border border-dashed border-news py-32 text-center animate-fade-in-up">
            <p className="font-mono text-sm uppercase tracking-widest text-news-secondary mb-2">No News Yet</p>
            <p className="font-serif text-news-secondary italic text-lg">No news yet. Check back soon.</p>
          </div>
        )}
      </main>

      <Footer />
    </Layout>
  );
}
