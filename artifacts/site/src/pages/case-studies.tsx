import React from 'react';
import { Link } from 'wouter';
import { useListCaseStudies } from '@workspace/api-client-react';
import { Layout, Header, Footer } from '@/components/layout';

export default function CaseStudiesPage() {
  const { data: caseStudies, isLoading } = useListCaseStudies();

  return (
    <Layout>
      <Header />
      
      <main className="max-w-[1200px] mx-auto p-6 md:p-12 min-h-[60vh]">
        <div className="mb-16 border-b-4 border-news pb-8 animate-fade-in-up">
          <h1 className="font-serif text-5xl md:text-7xl font-bold leading-[1.1] mb-4">
            Enterprise Case Studies
          </h1>
          <p className="text-xl md:text-2xl text-news-secondary font-serif leading-relaxed max-w-3xl">
            In-depth analysis of how Fortune 500 companies are deploying, scaling, and struggling with generative AI in production.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-12">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse border-b border-news pb-12 grid grid-cols-1 md:grid-cols-12 gap-8">
                <div className="col-span-4 h-32 bg-gray-200 rounded"></div>
                <div className="col-span-8 space-y-4">
                  <div className="h-8 w-3/4 bg-gray-200 rounded"></div>
                  <div className="h-20 w-full bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-16">
            {caseStudies?.map((study, index) => (
              <article key={study.id} className={`border-b border-news pb-16 animate-fade-in-up delay-${(index + 1) * 100}`}>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                  <div className="lg:col-span-4 flex flex-col justify-between">
                    <div>
                      <div className="font-mono text-xs font-bold uppercase text-accent tracking-widest mb-4">
                        {study.company.industry}
                      </div>
                      <h3 className="font-serif text-3xl font-bold mb-2">{study.company.name}</h3>
                      <p className="font-mono text-sm text-news-secondary mb-8">{study.company.summary}</p>
                    </div>
                    
                    <div className="space-y-4">
                      {study.metrics.slice(0, 3).map((metric, idx) => (
                        <div key={idx} className="border-l-4 border-accent pl-4">
                          <div className="font-serif text-2xl font-bold">{metric.value}</div>
                          <div className="font-mono text-xs text-news-secondary uppercase">{metric.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="lg:col-span-8 flex flex-col justify-center">
                    <Link href={`/case-studies/${study.slug}`} className="group cursor-pointer block" data-testid={`link-case-study-${study.slug}`}>
                      <h2 className="font-serif text-4xl md:text-5xl font-bold leading-[1.1] mb-6 group-hover:text-accent transition-colors duration-300">
                        {study.title}
                      </h2>
                      <p className="text-xl text-news-secondary font-serif leading-relaxed mb-8">
                        {study.dek}
                      </p>
                      <div className="inline-flex items-center gap-2 font-mono text-sm text-accent uppercase tracking-widest group-hover:gap-3 transition-all">
                        Read Case Study &rarr;
                      </div>
                    </Link>
                  </div>
                </div>
              </article>
            ))}
            
            {(!caseStudies || caseStudies.length === 0) && (
              <div className="py-20 text-center text-news-secondary font-mono uppercase tracking-widest">
                No case studies available
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </Layout>
  );
}
