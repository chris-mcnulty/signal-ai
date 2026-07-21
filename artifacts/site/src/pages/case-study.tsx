import { useRoute, Link } from 'wouter';
import { Building } from 'lucide-react';
import { useGetCaseStudy, getGetCaseStudyQueryKey } from '@workspace/api-client-react';
import { DetailHeader, Footer, NetworkError } from '@/components/layout';
import { displayAuthor } from '@/lib/utils';
import { ArticleBody } from '@/components/ArticleBody';
import { RelatedArticles } from '@/components/RelatedArticles';

function CaseStudyDetailSkeleton() {
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
      <main className="max-w-[1000px] mx-auto px-6 py-12 md:py-20 space-y-8 animate-fade-in-up">
        <div className="news-skeleton h-4 w-32 rounded-none" />
        <div className="news-skeleton h-16 w-full rounded-none" />
        <div className="news-skeleton h-8 w-4/5 rounded-none" />
        <div className="news-skeleton h-px w-full rounded-none bg-news" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-news">
          {[0,1,2].map(i => (
            <div key={i} className={`p-8 ${i < 2 ? 'border-b md:border-b-0 md:border-r border-news' : ''} space-y-2`}>
              <div className="news-skeleton h-12 w-20 rounded-none" />
              <div className="news-skeleton h-3 w-24 rounded-none" />
              <div className="news-skeleton h-3 w-32 rounded-none" />
            </div>
          ))}
        </div>
        <div className="space-y-3 pt-4">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className={`news-skeleton h-4 rounded-none ${i % 5 === 4 ? 'w-3/5' : 'w-full'}`} />
          ))}
        </div>
      </main>
    </div>
  );
}

export default function CaseStudyDetail() {
  const [, params] = useRoute("/case-studies/:slug");
  const slug = params?.slug || "";

  const { data: study, isLoading, isError, refetch } = useGetCaseStudy(slug, {
    query: { 
      enabled: !!slug, 
      queryKey: getGetCaseStudyQueryKey(slug),
      retry: 1,
    } 
  });

  if (isLoading) {
    return <CaseStudyDetailSkeleton />;
  }

  if (isError) {
    return (
      <NetworkError
        onRetry={() => refetch()}
        backHref="/case-studies"
        backLabel="Return to Case Studies"
      />
    );
  }

  if (!study) {
    return (
      <div className="broadsheet-theme min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="font-mono text-xs uppercase tracking-widest text-news-secondary mb-4">Error 404</div>
        <hr className="border-t-4 border-news mb-6 w-16 mx-auto" />
        <h1 className="font-serif text-5xl font-bold mb-4">Case Study Not Found</h1>
        <p className="text-news-secondary font-serif text-lg mb-8">
          This report may have been moved or archived.
        </p>
        <Link
          href="/case-studies"
          className="font-mono text-sm uppercase tracking-widest text-accent border border-accent px-5 py-2.5 hover:bg-accent hover:text-white transition-colors duration-200"
        >
          Return to Case Studies
        </Link>
      </div>
    );
  }

  const publishedDate = new Date(study.publishedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });


  return (
    <div className="broadsheet-theme">
      <DetailHeader backHref="/case-studies" backLabel="Case Studies" backTestId="link-back-list" />

      <main className="max-w-[1000px] mx-auto px-6 py-12 md:py-20">
        
        {/* Article Header */}
        <header className="mb-16 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-6">
            <span className="font-mono text-xs font-bold uppercase text-accent tracking-widest border border-accent px-2 py-1">
              Enterprise Case Study
            </span>
            <span className="font-mono text-xs text-news-secondary uppercase">
              {publishedDate} · {study.readingMinutes} min read
            </span>
          </div>

          <hr className="hero-rule" />
          
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.04] tracking-tight mb-6">
            {study.title}
          </h1>
          
          <p className="text-xl md:text-2xl text-news-secondary font-serif leading-relaxed mb-10">
            {study.dek}
          </p>

          {/* Hero Image */}
          {study.heroImageUrl && (
            <div className="w-full aspect-[21/9] overflow-hidden mb-10 border border-news">
              <img src={study.heroImageUrl} alt={study.title} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Company Context Bar */}
          <div className="bg-white border border-news p-6 md:p-8 flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#1a1a1a] flex items-center justify-center shrink-0">
                <Building size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold leading-none mb-1">{study.company.name}</h3>
                <div className="font-mono text-xs text-news-secondary uppercase tracking-widest">
                  {study.company.industry} · {study.company.size}
                </div>
              </div>
            </div>
            <a
              href={study.company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-accent hover:underline uppercase tracking-widest font-bold shrink-0"
            >
              Visit Website &rarr;
            </a>
          </div>
        </header>

        {/* ── Metrics Grid ── */}
        {study.metrics && study.metrics.length > 0 && (
          <section className="mb-16 animate-fade-in-up delay-100">
            <div className="border-t-4 border-black pt-6 mb-6">
              <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-news-secondary">Impact Metrics</h3>
            </div>
            <div
              className="border border-news"
              style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(study.metrics.length, 3)}, 1fr)` }}
            >
              {study.metrics.map((metric, i) => {
                const cols = Math.min(study.metrics.length, 3);
                const isLastRow = i >= study.metrics.length - (study.metrics.length % cols || cols);
                const isLastCol = (i + 1) % cols === 0;
                return (
                  <div
                    key={i}
                    className="metric-cell"
                    style={{
                      borderRight: isLastCol ? 'none' : '1px solid var(--border-color)',
                      borderBottom: isLastRow ? 'none' : '1px solid var(--border-color)',
                    }}
                  >
                    <span className="metric-value">{metric.value}</span>
                    <span className="metric-label">{metric.label}</span>
                    {metric.context && <span className="metric-context">{metric.context}</span>}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Article Body */}
          <div className="lg:col-span-8 animate-fade-in-up delay-200">
            <ArticleBody body={study.body} />
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-4 animate-fade-in-up delay-300 space-y-10">
            <div className="border-t-4 border-news pt-4">
              <div className="font-mono text-xs uppercase tracking-widest text-news-secondary mb-3">Byline</div>
              {study.authorProfile ? (
                <div className="flex items-center gap-3">
                  {study.authorProfile.avatarUrl ? (
                    <img
                      src={study.authorProfile.avatarUrl}
                      alt={study.author}
                      className="w-10 h-10 object-cover border border-news shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-[#1a1a1a] flex items-center justify-center shrink-0">
                      <span className="font-mono text-sm font-bold text-white leading-none">
                        {study.authorProfile.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <Link
                      href={`/authors/${study.authorProfile.slug}`}
                      className="font-sans font-bold text-base text-news-primary hover:text-accent transition-colors block"
                    >
                      {study.authorProfile.name}
                    </Link>
                    {study.authorProfile.bio && (
                      <p className="font-mono text-xs text-news-secondary mt-1 leading-relaxed">
                        {study.authorProfile.bio.length > 120
                          ? study.authorProfile.bio.slice(0, 120) + '…'
                          : study.authorProfile.bio}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="font-sans font-bold text-base text-news-primary">{displayAuthor(study.author)}</div>
                  <div className="font-mono text-xs text-news-secondary uppercase tracking-wider mt-1">Author</div>
                </>
              )}
            </div>

            {study.quotes && study.quotes.length > 0 && (
              <div className="space-y-6">
                {study.quotes.map((q, i) => (
                  <div key={i} className="bg-white border-l-4 border-accent p-5">
                    <p className="font-serif text-lg italic leading-relaxed mb-3 text-news-primary">"{q.quote}"</p>
                    <div className="font-sans font-semibold text-sm text-news-primary">{q.attribution}</div>
                    <div className="font-mono text-xs text-news-secondary uppercase tracking-wider mt-0.5">{q.role}</div>
                  </div>
                ))}
              </div>
            )}

            {study.sourceUrls && study.sourceUrls.length > 0 && (
              <div className="border-t border-news pt-6">
                <div className="font-mono text-xs uppercase tracking-widest text-news-secondary mb-4">Sources</div>
                <ol className="space-y-2 list-decimal list-inside">
                  {study.sourceUrls.map((url, i) => {
                    let label = url;
                    try { label = new URL(url).hostname.replace(/^www\./, ''); } catch {}
                    return (
                      <li key={i} className="font-mono text-xs text-news-secondary">
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-accent hover:underline break-all transition-colors"
                        >
                          {label}
                        </a>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </aside>
        </div>
      </main>

      {/* Related Reading */}
      {study.relatedArticles && study.relatedArticles.length > 0 && (
        <section className="bg-news border-t-4 border-black py-16 px-6 md:px-12 mt-12">
          <div className="max-w-[1200px] mx-auto">
            <div className="border-b-2 border-news pb-4 mb-10">
              <h3 className="font-serif text-3xl font-bold">Related Analysis</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
              {study.relatedArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/articles/${article.slug}`}
                  className="block group article-card"
                  data-testid={`link-related-${article.slug}`}
                >
                  <article>
                    <div className="card-image w-full aspect-[4/3] bg-[#e8e4de] mb-4 overflow-hidden">
                      {article.heroImageUrl ? (
                        <img
                          src={article.heroImageUrl}
                          alt={article.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="font-serif text-3xl font-bold text-news-secondary opacity-25">
                            {article.category}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="font-mono text-xs font-bold text-accent uppercase tracking-widest mb-2">{article.category}</div>
                    <h4 className="font-serif text-xl font-bold leading-tight mb-2">
                      <span className="card-headline">{article.title}</span>
                    </h4>
                    <p className="text-sm text-news-secondary line-clamp-2 leading-relaxed">{article.dek}</p>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <RelatedArticles category="case-study" excludeSlug={study.slug} />

      <Footer />
    </div>
  );
}
