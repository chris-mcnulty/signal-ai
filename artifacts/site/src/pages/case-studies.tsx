import React from 'react';
import { Link } from 'wouter';
import { useListCaseStudies } from '@workspace/api-client-react';
import { Layout, Header, Footer, NetworkError } from '@/components/layout';

function CaseStudySkeleton() {
  return (
    <div className="space-y-16">
      {[1, 2, 3].map(i => (
        <div key={i} className="border-b border-news pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-4 space-y-4">
              <div className="news-skeleton h-3 w-24 rounded-none" />
              <div className="news-skeleton h-8 w-3/4 rounded-none" />
              <div className="news-skeleton h-14 w-full rounded-none" />
              <div className="space-y-6 pt-4">
                {[0,1,2].map(j => (
                  <div key={j} className="border-l-4 border-news pl-4 space-y-1">
                    <div className="news-skeleton h-8 w-20 rounded-none" />
                    <div className="news-skeleton h-3 w-28 rounded-none" />
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-8 space-y-4">
              <div className="news-skeleton h-12 w-4/5 rounded-none" />
              <div className="news-skeleton h-8 w-full rounded-none" />
              <div className="news-skeleton h-6 w-3/4 rounded-none" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CaseStudiesPage() {
  const { data: caseStudies, isLoading, isError, refetch } = useListCaseStudies({ query: { retry: 1 } });

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
            In-Depth Analysis
          </div>
          <h1 className="font-serif text-5xl md:text-7xl font-bold leading-[1.05] mb-4">
            Enterprise Case Studies
          </h1>
          <p className="text-xl md:text-2xl text-news-secondary font-serif leading-relaxed max-w-3xl">
            In-depth analysis of how Fortune 500 companies are deploying, scaling, and struggling with generative AI in production.
          </p>
        </div>

        {isLoading ? (
          <CaseStudySkeleton />
        ) : caseStudies && caseStudies.length > 0 ? (
          <div className="space-y-16">
            {caseStudies.map((study, index) => (
              <article key={study.id} className="border-b border-news pb-16 animate-fade-in-up" style={{ animationDelay: `${(index + 1) * 100}ms` }}>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                  <div className="lg:col-span-4 flex flex-col justify-between">
                    <div>
                      <div className="font-mono text-xs font-bold uppercase text-accent tracking-widest mb-4">
                        {study.company.industry}
                      </div>
                      <h3 className="font-serif text-3xl font-bold mb-2">{study.company.name}</h3>
                      <p className="font-mono text-sm text-news-secondary mb-8 leading-relaxed">{study.company.summary}</p>
                    </div>
                    
                    {/* Metrics preview */}
                    <div className="grid grid-cols-1 gap-0 border border-news">
                      {study.metrics.slice(0, 3).map((metric, idx) => (
                        <div key={idx} className={`px-4 py-3 ${idx < 2 ? 'border-b border-news' : ''}`}>
                          <span className="metric-value" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}>{metric.value}</span>
                          <span className="metric-label">{metric.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="lg:col-span-8 flex flex-col justify-center">
                    <Link
                      href={`/case-studies/${study.slug}`}
                      className="group article-card block"
                      data-testid={`link-case-study-${study.slug}`}
                    >
                      <h2 className="font-serif text-4xl md:text-5xl font-bold leading-[1.1] mb-6">
                        <span className="card-headline">{study.title}</span>
                      </h2>
                      <p className="text-xl text-news-secondary font-serif leading-relaxed mb-6">
                        {study.dek}
                      </p>
                      <div className="inline-flex items-center gap-2 font-mono text-sm text-accent uppercase tracking-widest group-hover:gap-3 transition-all duration-200">
                        Read Case Study &rarr;
                      </div>
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-news py-32 text-center">
            <p className="font-mono text-sm uppercase tracking-widest text-news-secondary mb-2">No Case Studies Available</p>
            <p className="font-serif text-news-secondary italic text-lg">Our analysts are investigating. Check back soon.</p>
          </div>
        )}
      </main>

      <Footer />
    </Layout>
  );
}
