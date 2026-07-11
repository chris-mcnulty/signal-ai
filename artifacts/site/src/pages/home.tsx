import React from 'react';
import { Link } from 'wouter';
import { ChevronRight } from 'lucide-react';
import { useListArticles } from '@workspace/api-client-react';
import { Layout, Header, Footer } from '@/components/layout';

export default function Home() {
  const { data: articles, isLoading: isArticlesLoading } = useListArticles();
  const { data: inBriefArticles, isLoading: isInBriefLoading } = useListArticles({ category: "news" });

  const leadStory = articles?.[0];
  const sidebarStories = articles?.slice(1, 4) || [];
  const inBrief = inBriefArticles?.slice(0, 4) || [];

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <Layout>
      <Header />
      
      {/* Ticker / Dateline */}
      <div className="border-b border-news py-2 px-6 md:px-12 flex justify-between items-center text-xs font-mono text-news-secondary uppercase tracking-wider animate-fade-in-up delay-100">
        <div>{today}</div>
        <div className="hidden md:flex gap-6">
          <span className="hover-dim cursor-pointer">Use Cases</span>
          <span className="hover-dim cursor-pointer">Industry News</span>
          <span className="hover-dim cursor-pointer">Opinion</span>
          <Link href="/case-studies" className="hover-dim cursor-pointer text-accent hover:text-accent font-bold transition-colors">Case Studies</Link>
        </div>
        <div>Edition No. 143</div>
      </div>

      <main className="max-w-[1600px] mx-auto p-6 md:p-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Main Lead Story */}
          <div className="lg:col-span-8 animate-fade-in-up delay-200">
            {isArticlesLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-6 w-32 bg-gray-200 rounded"></div>
                <div className="h-20 bg-gray-200 rounded w-full"></div>
                <div className="h-16 bg-gray-200 rounded w-5/6"></div>
                <div className="aspect-video bg-gray-200 rounded w-full"></div>
              </div>
            ) : leadStory ? (
              <Link href={`/articles/${leadStory.slug}`} className="block group cursor-pointer" data-testid={`link-article-${leadStory.slug}`}>
                <article>
                  <div className="mb-4 flex items-center gap-3">
                    <span className="font-mono text-xs font-bold uppercase text-accent tracking-widest border border-accent px-2 py-1">{leadStory.category}</span>
                    <span className="font-mono text-xs text-news-secondary uppercase">{leadStory.readingMinutes} min read</span>
                  </div>
                  
                  <h2 className="font-serif text-5xl md:text-7xl font-bold leading-[1.1] mb-6 group-hover:text-accent transition-colors duration-300">
                    {leadStory.title}
                  </h2>
                  
                  <p className="text-xl md:text-2xl text-news-secondary font-serif leading-relaxed mb-8 pr-0 md:pr-12">
                    {leadStory.dek}
                  </p>

                  {leadStory.heroImageUrl && (
                    <div className="w-full aspect-video bg-gray-200 mb-6 overflow-hidden">
                      <img 
                        src={leadStory.heroImageUrl} 
                        alt={leadStory.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    </div>
                  )}

                  <div className="flex justify-between items-center border-t border-b border-news py-3 mt-6">
                    <div className="font-mono text-sm uppercase">By <span className="font-bold text-news-primary">{leadStory.author}</span></div>
                    <span className="flex items-center gap-1 font-mono text-sm text-accent uppercase tracking-widest group-hover:gap-2 transition-all">
                      Read Article <ChevronRight size={16} />
                    </span>
                  </div>
                </article>
              </Link>
            ) : (
              <div className="py-20 text-center text-news-secondary font-mono uppercase tracking-widest">No articles found</div>
            )}
          </div>

          {/* Right Sidebar Stories */}
          <aside className="lg:col-span-4 flex flex-col gap-8 animate-fade-in-up delay-300">
            <div className="border-t-4 border-news pt-2 mb-4">
              <h3 className="font-mono text-sm font-bold uppercase tracking-widest">Latest Analysis</h3>
            </div>

            {isArticlesLoading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="animate-pulse space-y-2">
                  <div className="h-4 w-20 bg-gray-200 rounded"></div>
                  <div className="h-12 bg-gray-200 rounded w-full"></div>
                  <div className="h-10 bg-gray-200 rounded w-full"></div>
                  <hr className="border-news my-4" />
                </div>
              ))
            ) : (
              sidebarStories.map((story, i) => (
                <React.Fragment key={story.id}>
                  {i > 0 && <hr className="border-news" />}
                  <Link href={`/articles/${story.slug}`} className="block group cursor-pointer" data-testid={`link-sidebar-${story.slug}`}>
                    <article>
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-accent font-bold text-xs uppercase tracking-wider">{story.category}</span>
                      </div>
                      <div className={`flex gap-4 ${story.heroImageUrl ? 'items-start' : ''}`}>
                        <div className="flex-1">
                          <h4 className="font-serif text-2xl font-bold leading-tight mb-2 group-hover:text-accent transition-colors">
                            {story.title}
                          </h4>
                          <p className="text-sm text-news-secondary mb-3 line-clamp-3">
                            {story.dek}
                          </p>
                          <div className="font-mono text-xs text-news-secondary uppercase">By {story.author}</div>
                        </div>
                        {story.heroImageUrl && (
                          <div className="w-24 h-24 flex-shrink-0 bg-gray-200 overflow-hidden hidden sm:block">
                            <img src={story.heroImageUrl} alt={story.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          </div>
                        )}
                      </div>
                    </article>
                  </Link>
                </React.Fragment>
              ))
            )}
          </aside>
        </div>

        {/* Bottom Strip */}
        <section className="mt-16 border-t-2 border-black pt-8 animate-fade-in-up delay-400">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-4 mb-4">
              <h3 className="font-serif text-3xl font-bold">In Brief</h3>
            </div>
            
            {isInBriefLoading ? (
               Array(4).fill(0).map((_, i) => (
                <div key={i} className="animate-pulse space-y-2 border-l-2 border-news pl-4">
                  <div className="h-4 w-16 bg-gray-200 rounded"></div>
                  <div className="h-10 bg-gray-200 rounded w-full"></div>
                </div>
               ))
            ) : (
              inBrief.map((item) => (
                <Link key={item.id} href={`/articles/${item.slug}`} className="block group cursor-pointer border-l-2 border-news pl-4 hover:border-accent transition-colors" data-testid={`link-brief-${item.slug}`}>
                  <div className="font-mono text-xs font-bold text-news-secondary uppercase mb-2">{item.category}</div>
                  <h4 className="font-serif text-lg leading-tight group-hover:text-accent transition-colors">{item.title}</h4>
                </Link>
              ))
            )}
          </div>
        </section>

      </main>
      
      <Footer />
    </Layout>
  );
}
