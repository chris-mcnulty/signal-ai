import React from 'react';
import { Link } from 'wouter';
import { useListSpotlights } from '@workspace/api-client-react';
import { Layout, Header, Footer, NetworkError } from '@/components/layout';

function SpotlightSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="border border-news p-6 space-y-4">
          <div className="news-skeleton h-12 w-12 rounded-none" />
          <div className="news-skeleton h-3 w-20 rounded-none" />
          <div className="news-skeleton h-7 w-3/4 rounded-none" />
          <div className="news-skeleton h-5 w-full rounded-none" />
          <div className="news-skeleton h-5 w-5/6 rounded-none" />
        </div>
      ))}
    </div>
  );
}

export default function SpotlightsPage() {
  const { data: spotlights, isLoading, isError, refetch } = useListSpotlights({ query: { retry: 1 } });

  if (isError) {
    return (
      <NetworkError
        onRetry={() => refetch()}
        backHref="/"
        backLabel="Return to Front Page"
      />
    );
  }

  return (
    <Layout>
      <Header />

      <main className="max-w-[1200px] mx-auto p-6 md:p-12 min-h-[60vh]">
        <div className="mb-16 border-b-4 border-news pb-8 animate-fade-in-up">
          <div className="font-mono text-xs font-bold uppercase tracking-widest text-accent mb-4">
            Company Profiles
          </div>
          <h1 className="font-serif text-5xl md:text-7xl font-bold leading-[1.05] mb-4">
            Spotlights
          </h1>
          <p className="text-xl md:text-2xl text-news-secondary font-serif leading-relaxed max-w-3xl">
            In-depth profiles of the companies and products shaping the AI industry — who they are, what they build, and why it matters.
          </p>
        </div>

        {isLoading ? (
          <SpotlightSkeleton />
        ) : spotlights && spotlights.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {spotlights.map((spotlight, index) => (
              <Link
                key={spotlight.id}
                href={`/spotlights/${spotlight.slug}`}
                className="group article-card block border border-news hover:border-accent transition-colors animate-fade-in-up"
                style={{ animationDelay: `${index * 60}ms` }}
                data-testid={`link-spotlight-${spotlight.slug}`}
              >
                <article className="p-6 h-full flex flex-col">
                  {spotlight.company.logoUrl ? (
                    <div className="w-12 h-12 mb-4 overflow-hidden">
                      <img
                        src={spotlight.company.logoUrl}
                        alt={spotlight.company.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-[#1a1a1a] flex items-center justify-center mb-4 shrink-0">
                      <span className="font-serif text-lg font-bold text-white leading-none">
                        {spotlight.company.name.charAt(0)}
                      </span>
                    </div>
                  )}

                  <div className="font-mono text-xs font-bold uppercase text-accent tracking-widest mb-2">
                    {spotlight.company.industry || 'Spotlight'}
                  </div>

                  <h2 className="font-serif text-2xl font-bold leading-tight mb-2">
                    <span className="card-headline">{spotlight.title}</span>
                  </h2>

                  <p className="text-sm text-news-secondary font-serif leading-relaxed line-clamp-3 mb-4 flex-1">
                    {spotlight.dek}
                  </p>

                  <div className="flex items-center justify-between border-t border-news pt-4 mt-auto">
                    <div className="font-mono text-xs text-news-secondary uppercase">
                      {spotlight.company.name}
                    </div>
                    <span className="font-mono text-xs text-accent uppercase tracking-widest group-hover:tracking-[0.15em] transition-all">
                      Read &rarr;
                    </span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-news py-32 text-center">
            <p className="font-mono text-sm uppercase tracking-widest text-news-secondary mb-2">No Spotlights Available</p>
            <p className="font-serif text-news-secondary italic text-lg">Our editorial team is working on company profiles. Check back soon.</p>
          </div>
        )}
      </main>

      <Footer />
    </Layout>
  );
}
