import React from 'react';
import { Link } from 'wouter';
import { ChevronRight } from 'lucide-react';
import { useListArticles } from '@workspace/api-client-react';
import { Layout, Header, Footer } from '@/components/layout';

function LeadSkeleton() {
  return (
    <div className="space-y-5">
      <div className="news-skeleton h-4 w-28 rounded-none" />
      <div className="news-skeleton h-14 w-full rounded-none" />
      <div className="news-skeleton h-10 w-4/5 rounded-none" />
      <div className="news-skeleton h-8 w-3/4 rounded-none" />
      <div className="news-skeleton aspect-video w-full rounded-none" />
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <>
      {Array(3).fill(0).map((_, i) => (
        <div key={i} className="space-y-2">
          {i > 0 && <div className="border-t border-news pt-4" />}
          <div className="news-skeleton h-3 w-16 rounded-none" />
          <div className="news-skeleton h-8 w-full rounded-none" />
          <div className="news-skeleton h-6 w-5/6 rounded-none" />
          <div className="news-skeleton h-3 w-24 rounded-none" />
        </div>
      ))}
    </>
  );
}

function BriefSkeleton() {
  return (
    <>
      {Array(4).fill(0).map((_, i) => (
        <div key={i} className="brief-card space-y-2">
          <div className="news-skeleton h-3 w-16 rounded-none" />
          <div className="news-skeleton h-6 w-full rounded-none" />
          <div className="news-skeleton h-4 w-4/5 rounded-none" />
        </div>
      ))}
    </>
  );
}

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
      <div className="border-b border-news py-2 px-6 md:px-12 flex justify-between items-center text-xs font-mono text-news-secondary uppercase tracking-wider animate-fade-in-up delay-100 overflow-x-auto">
        <div className="shrink-0">{today}</div>
        <div className="hidden md:flex gap-6 shrink-0">
          <Link href="/use-cases" className="hover-dim cursor-pointer text-accent font-bold transition-colors">Use Cases</Link>
          <Link href="/news" className="hover-dim cursor-pointer text-accent font-bold transition-colors">Industry News</Link>
          <Link href="/opinion" className="hover-dim cursor-pointer text-accent font-bold transition-colors">Opinion</Link>
          <Link href="/case-studies" className="hover-dim cursor-pointer text-accent font-bold transition-colors">
            Case Studies
          </Link>
        </div>
        <div className="shrink-0">Edition No. 143</div>
      </div>

      <main className="max-w-[1600px] mx-auto p-6 md:p-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-12">
          
          {/* ── Main Lead Story ── */}
          <div className="lg:col-span-8 animate-fade-in-up delay-200 mb-12 lg:mb-0">
            {isArticlesLoading ? (
              <LeadSkeleton />
            ) : leadStory ? (
              <Link
                href={`/articles/${leadStory.slug}`}
                className="block group article-card"
                data-testid={`link-article-${leadStory.slug}`}
              >
                <article>
                  {/* Eyebrow + rule */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className="card-category font-mono text-xs font-bold uppercase tracking-widest text-accent border border-accent px-2 py-1">
                      {leadStory.category}
                    </span>
                    <span className="font-mono text-xs text-news-secondary uppercase">
                      {leadStory.readingMinutes} min read
                    </span>
                  </div>

                  <hr className="hero-rule" />

                  <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] mb-5 tracking-tight">
                    <span className="card-headline">{leadStory.title}</span>
                  </h2>
                  
                  <p className="text-xl md:text-2xl text-news-secondary font-serif leading-relaxed mb-6 pr-0 md:pr-8">
                    {leadStory.dek}
                  </p>

                  {leadStory.heroImageUrl && (
                    <div className="card-image w-full aspect-video bg-[#e8e4de] mb-6 overflow-hidden">
                      <img 
                        src={leadStory.heroImageUrl} 
                        alt={leadStory.title} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="flex justify-between items-center border-t border-b border-news py-3 mt-4">
                    <div className="font-mono text-sm uppercase">
                      By <span className="font-bold text-news-primary">{leadStory.author}</span>
                    </div>
                    <span className="flex items-center gap-1 font-mono text-sm text-accent uppercase tracking-widest group-hover:gap-2 transition-all">
                      Read Article <ChevronRight size={16} />
                    </span>
                  </div>
                </article>
              </Link>
            ) : (
              <div className="border border-dashed border-news py-24 text-center">
                <p className="font-mono text-sm uppercase tracking-widest text-news-secondary mb-2">No Articles Found</p>
                <p className="font-serif text-news-secondary italic">Check back soon for the latest analysis.</p>
              </div>
            )}
          </div>

          {/* ── Divider on mobile ── */}
          <div className="lg:hidden border-t-4 border-news mb-8" />

          {/* ── Right Sidebar Stories ── */}
          <aside className="lg:col-span-4 flex flex-col gap-6 animate-fade-in-up delay-300 lg:border-l lg:border-news lg:pl-8">
            <div className="border-t-4 border-news pt-2">
              <h3 className="font-mono text-xs font-bold uppercase tracking-widest">Latest Analysis</h3>
            </div>

            {isArticlesLoading ? (
              <SidebarSkeleton />
            ) : (
              sidebarStories.map((story, i) => (
                <Link
                  key={story.id}
                  href={`/articles/${story.slug}`}
                  className="block group article-card sidebar-story"
                  data-testid={`link-sidebar-${story.slug}`}
                >
                  <article className={i > 0 ? "pt-6 border-t border-news" : ""}>
                    <div className="mb-2">
                      <span className="card-category font-mono text-xs font-bold text-accent uppercase tracking-wider border border-transparent px-1 py-0.5">
                        {story.category}
                      </span>
                    </div>
                    <div className={`flex gap-3 ${story.heroImageUrl ? 'items-start' : ''}`}>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-serif text-xl font-bold leading-tight mb-2">
                          <span className="card-headline">{story.title}</span>
                        </h4>
                        <p className="text-sm text-news-secondary mb-2 line-clamp-3 leading-relaxed">
                          {story.dek}
                        </p>
                        <div className="font-mono text-xs text-news-secondary uppercase">By {story.author}</div>
                      </div>
                      {story.heroImageUrl && (
                        <div className="card-image w-20 h-20 shrink-0 bg-[#e8e4de] overflow-hidden hidden sm:block">
                          <img
                            src={story.heroImageUrl}
                            alt={story.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </article>
                </Link>
              ))
            )}
          </aside>
        </div>

        {/* ── In Brief strip ── */}
        <section className="mt-16 border-t-2 border-black pt-8 animate-fade-in-up delay-400">
          <div className="mb-6">
            <h3 className="font-serif text-3xl font-bold">In Brief</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {isInBriefLoading ? (
              <BriefSkeleton />
            ) : inBrief.length > 0 ? (
              inBrief.map((item) => (
                <Link
                  key={item.id}
                  href={`/articles/${item.slug}`}
                  className="brief-card block"
                  data-testid={`link-brief-${item.slug}`}
                >
                  <div className="font-mono text-xs font-bold text-news-secondary uppercase mb-1">{item.category}</div>
                  <h4 className="brief-title font-serif text-lg leading-tight">{item.title}</h4>
                </Link>
              ))
            ) : (
              <div className="col-span-full py-8 text-center text-news-secondary font-mono text-xs uppercase tracking-widest">
                No items in brief
              </div>
            )}
          </div>
        </section>
      </main>
      
      <Footer />
    </Layout>
  );
}
