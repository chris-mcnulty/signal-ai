import React from 'react';
import { useRoute, Link } from 'wouter';
import { ArrowLeft, Search, Menu, ExternalLink } from 'lucide-react';
import { useGetSpotlight, getGetSpotlightQueryKey } from '@workspace/api-client-react';
import { SearchOverlay, useSearch, NetworkError } from '@/components/layout';

function SpotlightDetailSkeleton() {
  return (
    <div className="broadsheet-theme min-h-screen">
      <header className="site-header border-b border-news px-6 md:px-12 flex items-center justify-between sticky top-0 bg-news/95 backdrop-blur z-50">
        <div className="w-1/3" />
        <div className="w-1/3 text-center">
          <span className="font-serif text-xl font-black tracking-tight text-news-primary">
            Signal<span className="text-accent">AI</span>
          </span>
        </div>
        <div className="w-1/3" />
      </header>
      <main className="max-w-[1000px] mx-auto px-6 py-12 md:py-20 space-y-8 animate-fade-in-up">
        <div className="news-skeleton h-4 w-32 rounded-none" />
        <div className="news-skeleton h-16 w-full rounded-none" />
        <div className="news-skeleton h-8 w-4/5 rounded-none" />
        <div className="news-skeleton h-32 w-full rounded-none" />
        <div className="space-y-3 pt-4">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className={`news-skeleton h-4 rounded-none ${i % 5 === 4 ? 'w-3/5' : 'w-full'}`} />
          ))}
        </div>
      </main>
    </div>
  );
}

export default function SpotlightDetail() {
  const [, params] = useRoute("/spotlights/:slug");
  const slug = params?.slug || "";
  const { searchOpen, openSearch, closeSearch } = useSearch();

  const { data: spotlight, isLoading, isError, refetch } = useGetSpotlight(slug, {
    query: {
      enabled: !!slug,
      queryKey: getGetSpotlightQueryKey(slug),
      retry: 1,
    }
  });

  if (isLoading) {
    return <SpotlightDetailSkeleton />;
  }

  if (isError) {
    return (
      <NetworkError
        onRetry={() => refetch()}
        backHref="/spotlights"
        backLabel="Return to Spotlights"
      />
    );
  }

  if (!spotlight) {
    return (
      <div className="broadsheet-theme min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="font-mono text-xs uppercase tracking-widest text-news-secondary mb-4">Error 404</div>
        <hr className="border-t-4 border-news mb-6 w-16 mx-auto" />
        <h1 className="font-serif text-5xl font-bold mb-4">Spotlight Not Found</h1>
        <p className="text-news-secondary font-serif text-lg mb-8">
          This profile may have been moved or archived.
        </p>
        <Link
          href="/spotlights"
          className="font-mono text-sm uppercase tracking-widest text-accent border border-accent px-5 py-2.5 hover:bg-accent hover:text-white transition-colors duration-200"
        >
          Return to Spotlights
        </Link>
      </div>
    );
  }

  const publishedDate = new Date(spotlight.publishedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const bodyParagraphs = spotlight.body.split('\n\n').filter(p => p.trim() !== '');

  return (
    <div className="broadsheet-theme">
      <header className="site-header border-b border-news px-6 md:px-12 flex items-center justify-between sticky top-0 bg-news/95 backdrop-blur z-50">
        <div className="flex items-center gap-3 w-1/3">
          <Link
            href="/spotlights"
            className="hover-dim text-news-primary flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider"
            data-testid="link-back-list"
          >
            <ArrowLeft size={14} /> Spotlights
          </Link>
        </div>
        <div className="w-1/3 text-center">
          <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
            <h1 className="font-serif text-xl font-black tracking-tight text-news-primary leading-none">
              Signal<span className="text-accent">AI</span>
            </h1>
          </Link>
        </div>
        <div className="w-1/3 flex justify-end gap-1">
          <button className="mobile-menu-btn hover-dim text-news-primary" onClick={openSearch} aria-label="Open search"><Search size={18} /></button>
          <button className="mobile-menu-btn hover-dim text-news-primary" aria-label="Open menu"><Menu size={18} /></button>
        </div>
      </header>
      <SearchOverlay open={searchOpen} onClose={closeSearch} />

      <main className="max-w-[1000px] mx-auto px-6 py-12 md:py-20">

        <header className="mb-16 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-6">
            <span className="font-mono text-xs font-bold uppercase text-accent tracking-widest border border-accent px-2 py-1">
              Spotlight
            </span>
            <span className="font-mono text-xs text-news-secondary uppercase">
              {publishedDate} · {spotlight.readingMinutes} min read
            </span>
          </div>

          <hr className="hero-rule" />

          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.04] tracking-tight mb-6">
            {spotlight.title}
          </h1>

          <p className="text-xl md:text-2xl text-news-secondary font-serif leading-relaxed mb-10">
            {spotlight.dek}
          </p>

          {spotlight.heroImageUrl && (
            <div className="w-full aspect-[21/9] overflow-hidden mb-10 border border-news">
              <img src={spotlight.heroImageUrl} alt={spotlight.title} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Company Metadata Header */}
          <div className="bg-white border border-news p-6 md:p-8">
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
              <div className="flex items-center gap-4">
                {spotlight.company.logoUrl ? (
                  <div className="w-14 h-14 border border-news overflow-hidden shrink-0 bg-white flex items-center justify-center">
                    <img
                      src={spotlight.company.logoUrl}
                      alt={spotlight.company.name}
                      className="w-full h-full object-contain p-1"
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 bg-[#1a1a1a] flex items-center justify-center shrink-0">
                    <span className="font-serif text-2xl font-bold text-white leading-none">
                      {spotlight.company.name.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <h2 className="font-serif text-2xl font-bold leading-none mb-1">
                    {spotlight.company.name}
                  </h2>
                  {spotlight.company.industry && (
                    <div className="font-mono text-xs text-news-secondary uppercase tracking-widest">
                      {spotlight.company.industry}
                    </div>
                  )}
                </div>
              </div>

              {spotlight.company.website && (
                <a
                  href={spotlight.company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-mono text-xs text-accent hover:underline uppercase tracking-widest font-bold shrink-0"
                >
                  Visit Website <ExternalLink size={12} />
                </a>
              )}
            </div>

            {spotlight.company.blurb && (
              <p className="mt-6 font-serif text-base text-news-secondary leading-relaxed border-t border-news pt-6">
                {spotlight.company.blurb}
              </p>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Article Body */}
          <div className="lg:col-span-8 article-body font-sans text-news-primary animate-fade-in-up delay-200 max-w-none">
            {bodyParagraphs.map((paragraph, index) => {
              if (index === 0) {
                return (
                  <p key={index} className="article-dropcap">
                    {paragraph}
                  </p>
                );
              }
              if (paragraph.startsWith('## ')) {
                return <h2 key={index}>{paragraph.replace('## ', '')}</h2>;
              }
              if (paragraph.startsWith('> ')) {
                return <blockquote key={index}>{paragraph.replace('> ', '')}</blockquote>;
              }
              return <p key={index}>{paragraph}</p>;
            })}
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-4 animate-fade-in-up delay-300 space-y-10">
            <div className="border-t-4 border-news pt-4">
              <div className="font-mono text-xs uppercase tracking-widest text-news-secondary mb-3">Byline</div>
              {spotlight.authorProfile ? (
                <div className="flex items-center gap-3">
                  {spotlight.authorProfile.avatarUrl ? (
                    <img
                      src={spotlight.authorProfile.avatarUrl}
                      alt={spotlight.author}
                      className="w-10 h-10 object-cover border border-news shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-[#1a1a1a] flex items-center justify-center shrink-0">
                      <span className="font-mono text-sm font-bold text-white leading-none">
                        {spotlight.author.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <Link
                      href={`/authors/${spotlight.authorProfile.slug}`}
                      className="font-sans font-bold text-base text-news-primary hover:text-accent transition-colors block"
                    >
                      {spotlight.author}
                    </Link>
                    {spotlight.authorProfile.bio && (
                      <p className="font-mono text-xs text-news-secondary mt-1 leading-relaxed">
                        {spotlight.authorProfile.bio.length > 120
                          ? spotlight.authorProfile.bio.slice(0, 120) + '…'
                          : spotlight.authorProfile.bio}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="font-sans font-bold text-base text-news-primary">{spotlight.author}</div>
                  <div className="font-mono text-xs text-news-secondary uppercase tracking-wider mt-1">Staff Writer</div>
                </>
              )}
            </div>

            {spotlight.sourceUrls && spotlight.sourceUrls.length > 0 && (
              <div className="border-t border-news pt-6">
                <div className="font-mono text-xs uppercase tracking-widest text-news-secondary mb-4">Sources</div>
                <ol className="space-y-2 list-decimal list-inside">
                  {spotlight.sourceUrls.map((url, i) => {
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

      <footer className="bg-black text-white py-10 px-6 md:px-12 text-center">
        <Link href="/" className="inline-block hover:opacity-80 transition-opacity mb-4">
          <h2 className="font-serif text-2xl font-black tracking-tight text-white/50">SignalAI</h2>
        </Link>
        <p className="font-mono text-xs text-gray-500 uppercase tracking-widest">
          © {new Date().getFullYear()} SignalAI Media. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
