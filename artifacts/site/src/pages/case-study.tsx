import React from 'react';
import { useRoute, Link } from 'wouter';
import { ArrowLeft, Search, Menu, Building } from 'lucide-react';
import { useGetCaseStudy, getGetCaseStudyQueryKey } from '@workspace/api-client-react';

export default function CaseStudyDetail() {
  const [, params] = useRoute("/case-studies/:slug");
  const slug = params?.slug || "";

  const { data: study, isLoading } = useGetCaseStudy(slug, { 
    query: { 
      enabled: !!slug, 
      queryKey: getGetCaseStudyQueryKey(slug) 
    } 
  });

  if (isLoading) {
    return (
      <div className="broadsheet-theme min-h-screen flex items-center justify-center">
        <div className="animate-pulse space-y-8 max-w-[1000px] w-full px-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 rounded w-full"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!study) {
    return (
      <div className="broadsheet-theme min-h-screen flex flex-col items-center justify-center">
        <h1 className="font-serif text-4xl font-bold mb-4">Case Study Not Found</h1>
        <Link href="/case-studies" className="font-mono uppercase text-accent tracking-widest hover:underline">Return to Case Studies</Link>
      </div>
    );
  }

  const publishedDate = new Date(study.publishedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const bodyParagraphs = study.body.split('\n\n').filter(p => p.trim() !== '');

  return (
    <div className="broadsheet-theme">
      {/* Header */}
      <header className="border-b border-news py-3 px-6 md:px-12 flex items-center justify-between sticky top-0 bg-news/95 backdrop-blur z-50">
        <div className="flex items-center gap-4 w-1/3">
          <Link href="/case-studies" className="hover-dim text-news-primary flex items-center gap-2 font-mono text-xs uppercase tracking-wider" data-testid="link-back-list">
            <ArrowLeft size={16} /> Case Studies
          </Link>
        </div>
        <div className="w-1/3 text-center">
          <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
            <h1 className="font-serif text-2xl font-black tracking-tight text-news-primary">
              Signal<span className="text-accent">AI</span>
            </h1>
          </Link>
        </div>
        <div className="w-1/3 flex justify-end gap-4">
          <button className="hover-dim text-news-primary"><Search size={20} /></button>
          <button className="hover-dim text-news-primary"><Menu size={20} /></button>
        </div>
      </header>

      <main className="max-w-[1000px] mx-auto px-6 py-12 md:py-20">
        
        {/* Header */}
        <header className="mb-16 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-8">
            <span className="font-mono text-xs font-bold uppercase text-accent tracking-widest border border-accent px-2 py-1">Enterprise Case Study</span>
            <span className="font-mono text-xs text-news-secondary uppercase">{publishedDate} • {study.readingMinutes} min read</span>
          </div>
          
          <h1 className="font-serif text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight mb-6">
            {study.title}
          </h1>
          
          <p className="text-xl md:text-3xl text-news-secondary font-serif leading-relaxed mb-12">
            {study.dek}
          </p>

          {/* Hero Image */}
          {study.heroImageUrl && (
            <div className="w-full aspect-[21/9] overflow-hidden mb-12 border border-news">
              <img src={study.heroImageUrl} alt={study.title} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Company Context Bar */}
          <div className="bg-white border border-news p-6 md:p-8 flex flex-col md:flex-row gap-8 justify-between items-start md:items-center">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-news rounded-full text-news-primary border border-border-color">
                 <Building size={24} />
               </div>
               <div>
                 <h3 className="font-serif text-2xl font-bold leading-none mb-1">{study.company.name}</h3>
                 <div className="font-mono text-xs text-news-secondary uppercase tracking-widest">
                   {study.company.industry} • {study.company.size}
                 </div>
               </div>
            </div>
            <a href={study.company.website} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-accent hover:underline uppercase tracking-widest font-bold">
              Visit Website &rarr;
            </a>
          </div>
        </header>

        {/* Metrics Grid */}
        {study.metrics && study.metrics.length > 0 && (
          <section className="mb-16 border-t border-b border-black py-10 animate-fade-in-up delay-100">
            <h3 className="font-mono text-sm font-bold uppercase tracking-widest mb-8 text-center">Impact Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              {study.metrics.map((metric, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="font-serif text-5xl font-bold text-accent mb-2">{metric.value}</div>
                  <div className="font-mono text-sm font-bold uppercase mb-1">{metric.label}</div>
                  <div className="font-sans text-sm text-news-secondary">{metric.context}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Article Body */}
          <div className="lg:col-span-8 article-body font-sans text-news-primary animate-fade-in-up delay-200">
            {bodyParagraphs.map((paragraph, index) => {
              if (index === 0) {
                 return (
                   <p key={index} className="first-letter:font-serif first-letter:text-7xl first-letter:font-bold first-letter:float-left first-letter:mr-3 first-letter:mt-[-0.1em] first-letter:text-accent">
                     {paragraph}
                   </p>
                 )
              }
              if (paragraph.startsWith('## ')) {
                 return <h2 key={index}>{paragraph.replace('## ', '')}</h2>
              }
              if (paragraph.startsWith('> ')) {
                 return <blockquote key={index}>{paragraph.replace('> ', '')}</blockquote>
              }
              return <p key={index}>{paragraph}</p>
            })}
          </div>

          {/* Sidebar / Quotes */}
          <aside className="lg:col-span-4 animate-fade-in-up delay-300 space-y-12">
            <div className="border-t-4 border-news pt-4">
              <div className="font-mono text-sm uppercase tracking-widest text-news-secondary mb-4">Byline</div>
              <div className="font-sans font-bold text-lg">{study.author}</div>
              <div className="font-mono text-xs text-news-secondary uppercase">Enterprise Analyst</div>
            </div>

            {study.quotes && study.quotes.length > 0 && (
              <div className="space-y-8">
                {study.quotes.map((q, i) => (
                  <div key={i} className="bg-news p-6 border-l-4 border-accent">
                    <p className="font-serif text-xl italic leading-relaxed mb-4 text-news-primary">"{q.quote}"</p>
                    <div className="font-sans font-bold text-sm">{q.attribution}</div>
                    <div className="font-mono text-xs text-news-secondary uppercase">{q.role}</div>
                  </div>
                ))}
              </div>
            )}

            {study.sourceUrls && study.sourceUrls.length > 0 && (
              <div className="border-t-4 border-news pt-4">
                <div className="font-mono text-sm uppercase tracking-widest text-news-secondary mb-4">Sources</div>
                <ol className="space-y-3 list-decimal list-inside">
                  {study.sourceUrls.map((url, i) => {
                    let label = url;
                    try { label = new URL(url).hostname.replace(/^www\./, ''); } catch {}
                    return (
                      <li key={i} className="font-mono text-xs text-news-secondary">
                        <a href={url} target="_blank" rel="noopener noreferrer" className="hover:text-accent hover:underline break-all">
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
            <h3 className="font-serif text-3xl font-bold mb-10 text-center">Related Analysis</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {study.relatedArticles.map((article) => (
                <Link key={article.id} href={`/articles/${article.slug}`} className="block group cursor-pointer" data-testid={`link-related-${article.slug}`}>
                  <article>
                    {article.heroImageUrl ? (
                       <div className="w-full aspect-[4/3] bg-gray-200 mb-4 overflow-hidden">
                         <img src={article.heroImageUrl} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                       </div>
                    ) : (
                      <div className="w-full aspect-[4/3] bg-gray-200 mb-4 overflow-hidden border border-news flex items-center justify-center bg-[#f0eee9]">
                        <span className="font-serif text-4xl font-bold text-news-secondary opacity-30">{article.category}</span>
                      </div>
                    )}
                    <div className="font-mono text-xs font-bold text-accent uppercase tracking-widest mb-2">{article.category}</div>
                    <h4 className="font-serif text-xl font-bold leading-tight mb-2 group-hover:text-accent transition-colors">
                      {article.title}
                    </h4>
                    <p className="text-sm text-news-secondary line-clamp-2">{article.dek}</p>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-black text-white py-8 px-6 md:px-12 text-center">
        <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
          <h2 className="font-serif text-2xl font-black tracking-tight mb-4 opacity-50 cursor-pointer">SignalAI</h2>
        </Link>
        <p className="font-mono text-xs text-gray-500 uppercase tracking-widest">© {new Date().getFullYear()} SignalAI Media. All rights reserved.</p>
      </footer>

    </div>
  );
}
