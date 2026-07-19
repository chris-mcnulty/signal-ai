import React from 'react';
import { Link } from 'wouter';
import { ChevronRight } from 'lucide-react';
import { useListArticles } from '@workspace/api-client-react';
import { Layout, Footer, NavDrawer, SearchOverlay, useSearch } from '@/components/layout';
import { Search, Menu } from 'lucide-react';
import { useState } from 'react';

function articleHref(article: { slug: string; category: string }) {
  if (article.category === 'spotlight') return `/spotlights/${article.slug}`;
  if (article.category === 'case-study') return `/case-studies/${article.slug}`;
  return `/articles/${article.slug}`;
}

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
  const [menuOpen, setMenuOpen] = useState(false);
  const { searchOpen, openSearch, closeSearch } = useSearch();

  const leadStory = articles?.[0];
  const sidebarStories = articles?.slice(1, 4) || [];
  const inBrief = inBriefArticles?.slice(0, 4) || [];

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <Layout>
      {/* ── Unified masthead: nav controls + mountain backdrop in one header ── */}
      <header style={{
        position: "relative",
        backgroundImage: "url(/hero-trail.jpeg)",
        backgroundSize: "cover",
        backgroundPosition: "center 30%",
        minHeight: "220px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}>
        {/* gradient overlay */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(11,46,89,0.45) 0%, rgba(11,46,89,0.55) 55%, rgba(11,46,89,0.92) 100%)"
        }} />

        {/* Nav controls row — sits at the top of the hero */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, padding: "0.75rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", padding: "0.35rem", opacity: 0.9 }}
              data-testid="btn-menu"
            >
              <Menu size={22} />
            </button>
            <button
              onClick={openSearch}
              aria-label="Open search"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", padding: "0.35rem", opacity: 0.9 }}
              data-testid="btn-search"
            >
              <Search size={22} />
            </button>
          </div>
          <button className="subscribe-cta" data-testid="btn-subscribe">Subscribe</button>
        </div>

        {/* Masthead branding — centred in the hero */}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", zIndex: 1 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1, color: "#fff", textShadow: "0 2px 12px rgba(11,46,89,0.4)" }}>
            bluetr<span style={{ color: "#F0CA45" }}>AI</span>l
          </div>
          <div style={{ fontFamily: "'IBM Plex Sans', 'Inter', sans-serif", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.32em", color: "rgba(255,255,255,0.75)", marginTop: "0.3rem", fontWeight: 500 }}>
            Intelligence Report
          </div>
        </div>

        {/* Tagline + date at the bottom of the hero */}
        <div style={{ position: "relative", zIndex: 1, padding: "1rem 1.5rem 0.875rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1rem", fontStyle: "italic", color: "rgba(255,255,255,0.9)", margin: 0, letterSpacing: "0.01em" }}>
            Ahead of the frontier.
          </p>
          <span style={{ fontFamily: "'IBM Plex Sans', 'Inter', sans-serif", fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(184,194,204,0.9)" }}>
            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </header>

      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
      <SearchOverlay open={searchOpen} onClose={closeSearch} />

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
          <Link href="/spotlights" className="hover-dim cursor-pointer text-accent font-bold transition-colors">
            Spotlights
          </Link>
        </div>
        <div className="shrink-0 flex items-center gap-4">
          <a
            href="/rss.xml"
            className="hover-dim flex items-center gap-1 text-news-secondary hover:text-accent transition-colors"
            title="Subscribe via RSS"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19.01 7.38 20 6.18 20 4.98 20 4 19.01 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1z"/>
            </svg>
            RSS
          </a>
          <span>Edition No. 143</span>
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto p-6 md:p-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-12">
          
          {/* ── Main Lead Story ── */}
          <div className="lg:col-span-8 animate-fade-in-up delay-200 mb-12 lg:mb-0">
            {isArticlesLoading ? (
              <LeadSkeleton />
            ) : leadStory ? (
              <Link
                href={articleHref(leadStory)}
                className="block group article-card"
                data-testid={`link-article-${leadStory.slug}`}
              >
                <article>
                  {/* Eyebrow + rule */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className="card-category font-mono text-xs font-bold uppercase tracking-widest text-accent border border-accent px-2 py-1">
                      {leadStory.category === 'spotlight' ? 'Spotlight' : leadStory.category}
                    </span>
                    <span className="font-mono text-xs text-news-secondary uppercase">
                      {leadStory.readingMinutes} min read
                    </span>
                    {leadStory.category === 'spotlight' && leadStory.spotlightLogoUrl && (
                      <div className="ml-auto w-10 h-10 overflow-hidden shrink-0 bg-white border border-news flex items-center justify-center">
                        <img
                          src={leadStory.spotlightLogoUrl}
                          alt=""
                          className="w-full h-full object-contain p-0.5"
                        />
                      </div>
                    )}
                  </div>

                  <hr className="hero-rule" />

                  <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] mb-5 tracking-tight">
                    <span className="card-headline">{leadStory.title}</span>
                  </h2>
                  
                  <p className="text-xl md:text-2xl text-news-secondary font-serif leading-relaxed mb-6 pr-0 md:pr-8">
                    {leadStory.dek}
                  </p>

                  {(leadStory.heroImageUrl || leadStory.imageUrl) && (
                    <div className="card-image w-full aspect-video bg-[#e8e4de] mb-6 overflow-hidden">
                      <img 
                        src={leadStory.heroImageUrl ?? leadStory.imageUrl ?? undefined} 
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
                  href={articleHref(story)}
                  className="block group article-card sidebar-story"
                  data-testid={`link-sidebar-${story.slug}`}
                >
                  <article className={i > 0 ? "pt-6 border-t border-news" : ""}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="card-category font-mono text-xs font-bold text-accent uppercase tracking-wider border border-transparent px-1 py-0.5">
                        {story.category === 'spotlight' ? 'Spotlight' : story.category}
                      </span>
                      {story.category === 'spotlight' && story.spotlightLogoUrl && (
                        <div className="ml-auto w-8 h-8 overflow-hidden shrink-0 bg-white border border-news flex items-center justify-center">
                          <img
                            src={story.spotlightLogoUrl}
                            alt=""
                            className="w-full h-full object-contain p-0.5"
                          />
                        </div>
                      )}
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
                      {story.category !== 'spotlight' && (story.heroImageUrl || story.imageUrl) && (
                        <div className="card-image w-20 h-20 shrink-0 bg-[#e8e4de] overflow-hidden hidden sm:block">
                          <img
                            src={story.heroImageUrl ?? story.imageUrl ?? undefined}
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
