import React from 'react';
import { useRoute, Link } from 'wouter';
import { Search, Menu, ArrowLeft, Share2, Bookmark, Twitter, Linkedin } from 'lucide-react';
import { useGetArticle, getGetArticleQueryKey } from '@workspace/api-client-react';
import { SearchOverlay, useSearch, NetworkError } from '@/components/layout';

function ArticleSkeleton() {
  return (
    <div className="broadsheet-theme min-h-screen">
      <header className="border-b border-news py-3 px-6 md:px-12 flex items-center justify-between sticky top-0 bg-news/95 backdrop-blur z-50">
        <div className="w-1/3" />
        <div className="w-1/3 text-center">
          <span className="font-serif text-2xl font-black tracking-tight text-news-primary">
            bluetr<span className="text-accent">AI</span>l
          </span>
        </div>
        <div className="w-1/3" />
      </header>
      <main className="max-w-[800px] mx-auto px-6 py-12 md:py-20">
        <div className="space-y-5 animate-fade-in-up">
          <div className="news-skeleton h-4 w-28 rounded-none" />
          <div className="news-skeleton h-16 w-full rounded-none" />
          <div className="news-skeleton h-10 w-4/5 rounded-none" />
          <div className="news-skeleton h-6 w-2/3 rounded-none" />
          <div className="news-skeleton aspect-video w-full rounded-none" />
          <div className="space-y-3 pt-4">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className={`news-skeleton h-4 rounded-none ${i % 5 === 4 ? 'w-3/5' : 'w-full'}`} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

/** Extract a readable label from a URL: hostname without www. */
function sourceDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Returns true when the body string is HTML (produced by the rich-text editor). */
function isHtmlBody(body: string): boolean {
  return /^\s*<[a-zA-Z]/.test(body);
}

/** Minimal HTML sanitizer for article bodies — strips unknown tags and unsafe URLs. */
function sanitizeArticleHtml(html: string): string {
  if (!html || typeof window === 'undefined') return html;
  const ALLOWED = new Set(['P','BR','STRONG','B','EM','I','U','SPAN','UL','OL','LI','H1','H2','H3','H4','A','IMG','BLOCKQUOTE','HR','TABLE','THEAD','TBODY','TR','TH','TD','PRE','CODE']);
  const ALLOWED_ATTRS: Record<string, Set<string>> = {
    A: new Set(['href','title','rel','target']),
    IMG: new Set(['src','alt','width','height']),
    TD: new Set(['colspan','rowspan']), TH: new Set(['colspan','rowspan']),
  };
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  function walk(node: Node, out: Document): ChildNode | null {
    if (node.nodeType === Node.TEXT_NODE) return out.createTextNode(node.textContent ?? '');
    if (node.nodeType !== Node.ELEMENT_NODE) return null;
    const el = node as Element;
    const tag = el.tagName.toUpperCase();
    if (!ALLOWED.has(tag)) {
      const frag = out.createDocumentFragment();
      el.childNodes.forEach(c => { const n = walk(c, out); if (n) frag.appendChild(n); });
      return frag as unknown as ChildNode;
    }
    const clean = out.createElement(el.tagName.toLowerCase());
    const allowed = ALLOWED_ATTRS[tag] ?? new Set<string>();
    for (const attr of Array.from(el.attributes)) {
      if (!allowed.has(attr.name.toLowerCase())) continue;
      const v = attr.value;
      if ((attr.name === 'href' || attr.name === 'src') && /^javascript:/i.test(v.trim())) continue;
      clean.setAttribute(attr.name, v);
    }
    if (tag === 'A') {
      const href = clean.getAttribute('href') ?? '';
      if (/^https?:\/\//i.test(href)) { clean.setAttribute('target','_blank'); clean.setAttribute('rel','noopener noreferrer'); }
    }
    el.childNodes.forEach(c => { const n = walk(c, out); if (n) clean.appendChild(n); });
    return clean;
  }
  const wrapper = doc.body.firstElementChild;
  if (!wrapper) return '';
  const result = doc.createElement('div');
  wrapper.childNodes.forEach(c => { const n = walk(c, doc); if (n) result.appendChild(n); });
  return result.innerHTML;
}

/** Render a paragraph string, converting **bold**, *italic*, and [text](url) markdown. */
function renderInlineLinks(text: string, paraIndex: number): React.ReactNode[] {
  // Match **bold**, *italic*, or [text](url) in one pass
  const tokenRegex = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)]+)\)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyCount = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    if (match[1] !== undefined) {
      nodes.push(<strong key={`md-${paraIndex}-${keyCount++}`}>{match[1]}</strong>);
    } else if (match[2] !== undefined) {
      nodes.push(<em key={`md-${paraIndex}-${keyCount++}`}>{match[2]}</em>);
    } else {
      nodes.push(
        <a
          key={`md-${paraIndex}-${keyCount++}`}
          href={match[4]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          {match[3]}
        </a>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

export default function ArticlePage() {
  const [, params] = useRoute("/articles/:slug");
  const slug = params?.slug || "";
  const { searchOpen, openSearch, closeSearch } = useSearch();

  const { data: article, isLoading, isError, refetch } = useGetArticle(slug, { 
    query: { 
      enabled: !!slug, 
      queryKey: getGetArticleQueryKey(slug),
      retry: 1,
    } 
  });

  if (isLoading) {
    return <ArticleSkeleton />;
  }

  if (isError) {
    return (
      <NetworkError
        onRetry={() => refetch()}
        backHref="/"
        backLabel="Return to Front Page"
      />
    );
  }

  if (!article) {
    return (
      <div className="broadsheet-theme min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="font-mono text-xs uppercase tracking-widest text-news-secondary mb-4">Error 404</div>
        <hr className="border-t-4 border-news mb-6 w-16 mx-auto" />
        <h1 className="font-serif text-5xl font-bold mb-4">Article Not Found</h1>
        <p className="text-news-secondary font-serif text-lg mb-8">
          This story may have been moved or archived.
        </p>
        <Link href="/" className="font-mono text-sm uppercase tracking-widest text-accent border border-accent px-5 py-2.5 hover:bg-accent hover:text-white transition-colors duration-200">
          Return to Front Page
        </Link>
      </div>
    );
  }

  const publishedDate = new Date(article.publishedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const heroImage = article.heroImageUrl || article.imageUrl;

  return (
    <div className="broadsheet-theme">
      {/* Header (slim article header) */}
      <header className="site-header border-b border-news px-6 md:px-12 flex items-center justify-between sticky top-0 bg-news/95 backdrop-blur z-50">
        <div className="flex items-center gap-3 w-1/3">
          <Link
            href="/"
            className="hover-dim text-news-primary flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider"
            data-testid="link-back-home"
          >
            <ArrowLeft size={14} /> Home
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

      <main className="px-6 py-12 md:py-20">
        {/* Article Header — full width, then body constrained */}
        <header className="max-w-[800px] mx-auto mb-10 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-5">
            <span className="font-mono text-xs font-bold uppercase text-accent tracking-widest border border-accent px-2 py-1">
              {article.category}
            </span>
            <span className="font-mono text-xs text-news-secondary uppercase">
              {publishedDate} · {article.readingMinutes} min read
            </span>
          </div>

          <hr className="hero-rule" />
          
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.04] tracking-tight mb-6">
            {article.title}
          </h1>
          
          <p className="text-xl md:text-2xl text-news-secondary font-serif leading-relaxed mb-8">
            {article.dek}
          </p>

          <div className="flex items-center justify-between border-t border-b border-news py-3">
            <div className="flex items-center gap-3">
              {article.authorProfile?.avatarUrl ? (
                <img
                  src={article.authorProfile.avatarUrl}
                  alt={article.author}
                  className="w-10 h-10 object-cover border border-news shrink-0"
                />
              ) : (
                <div className="w-10 h-10 bg-[#1a1a1a] flex items-center justify-center shrink-0">
                  <span className="font-mono text-base font-bold text-white leading-none">
                    {article.author.charAt(0)}
                  </span>
                </div>
              )}
              <div>
                {article.authorProfile ? (
                  <Link href={`/authors/${article.authorProfile.slug}`} className="font-sans font-semibold text-sm text-news-primary hover:text-accent transition-colors">
                    {article.author}
                  </Link>
                ) : (
                  <div className="font-sans font-semibold text-sm text-news-primary">{article.author}</div>
                )}
                <div className="font-mono text-xs text-news-secondary uppercase tracking-wider">Author</div>
              </div>
            </div>
            
            <div className="flex gap-1 text-news-secondary">
              <button className="action-btn" data-testid="btn-share-twitter" aria-label="Share on Twitter"><Twitter size={16} /></button>
              <button className="action-btn" data-testid="btn-share-linkedin" aria-label="Share on LinkedIn"><Linkedin size={16} /></button>
              <button className="action-btn" data-testid="btn-bookmark" aria-label="Bookmark"><Bookmark size={16} /></button>
              <button className="action-btn" data-testid="btn-share" aria-label="Share"><Share2 size={16} /></button>
            </div>
          </div>
        </header>

        {/* Hero Image */}
        {heroImage && (
          <figure className="max-w-[900px] mx-auto mb-12 animate-fade-in-up delay-100">
            <div className="aspect-[16/9] w-full bg-[#e8e4de] overflow-hidden">
              <img 
                src={heroImage}
                alt={article.title} 
                className="w-full h-full object-cover"
              />
            </div>
            <figcaption className="font-mono text-xs text-news-secondary text-right mt-2">
              bluetrAIl Intelligence Report
            </figcaption>
          </figure>
        )}

        {/* Article Body — constrained to ~68ch */}
        {isHtmlBody(article.body) ? (
          <div
            className="article-body prose prose-neutral max-w-none font-sans text-news-primary animate-fade-in-up delay-200 mx-auto"
            dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(article.body) }}
          />
        ) : (
          <div className="article-body font-sans text-news-primary animate-fade-in-up delay-200 mx-auto">
            {article.body.split('\n\n').filter(p => p.trim() !== '').map((paragraph, index) => {
              if (paragraph.startsWith('## ')) {
                return <h2 key={index}>{paragraph.replace('## ', '')}</h2>;
              }
              if (paragraph.startsWith('> ')) {
                return <blockquote key={index}>{renderInlineLinks(paragraph.replace('> ', ''), index)}</blockquote>;
              }
              if (index === 0) {
                return (
                  <p key={index} className="article-dropcap">
                    {renderInlineLinks(paragraph, index)}
                  </p>
                );
              }
              return <p key={index}>{renderInlineLinks(paragraph, index)}</p>;
            })}
          </div>
        )}
        
        {/* Source Links — numbered references with readable domain labels */}
        {article.sourceUrls && article.sourceUrls.length > 0 && (
          <div className="article-body mx-auto mt-12 pt-6 border-t border-news animate-fade-in-up delay-300">
            <h3 className="font-mono text-xs font-bold uppercase tracking-widest mb-4 text-news-secondary">Sources</h3>
            <ol className="space-y-2 list-none">
              {article.sourceUrls.map((url, i) => (
                <li key={i} className="flex items-baseline gap-2">
                  <span className="font-mono text-xs text-news-secondary shrink-0">[{i + 1}]</span>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-accent hover:underline"
                  >
                    {sourceDomain(url)}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Author bio card */}
        {article.authorProfile?.bio && (
          <div className="article-body mx-auto mt-12 pt-8 border-t border-news animate-fade-in-up delay-300">
            <div className="flex items-start gap-5 bg-white border border-news p-6">
              {article.authorProfile.avatarUrl ? (
                <img
                  src={article.authorProfile.avatarUrl}
                  alt={article.author}
                  className="w-16 h-16 object-cover border border-news shrink-0"
                />
              ) : (
                <div className="w-16 h-16 bg-[#1a1a1a] flex items-center justify-center shrink-0">
                  <span className="font-serif text-2xl font-bold text-white leading-none">
                    {article.author.charAt(0)}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-mono text-xs uppercase tracking-widest text-news-secondary mb-1">About the Author</div>
                <Link
                  href={`/authors/${article.authorProfile.slug}`}
                  className="font-serif text-lg font-bold text-news-primary hover:text-accent transition-colors block mb-2"
                >
                  {article.author}
                </Link>
                <p className="text-sm text-news-secondary font-sans leading-relaxed">{article.authorProfile.bio}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tags */}
        <div className="article-body mx-auto mt-8 pt-6 border-t border-news flex flex-wrap gap-2 animate-fade-in-up delay-300">
          {[article.category, 'AI Industry', 'Analysis'].map(tag => (
            <span
              key={tag}
              className="font-mono text-xs uppercase border border-news px-3 py-1.5 hover:bg-[#1a1a1a] hover:text-white cursor-pointer transition-colors duration-200"
            >
              {tag}
            </span>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black text-white py-10 px-6 md:px-12 text-center mt-16">
        <Link href="/" className="inline-block hover:opacity-80 transition-opacity mb-4">
          <h2 className="font-serif text-2xl font-black tracking-tight text-white/50">bluetr<span className="text-accent">AI</span>l</h2>
        </Link>
        <p className="font-mono text-xs text-gray-500 uppercase tracking-widest">
          © {new Date().getFullYear()} BlueTrail Intelligence Ltd. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
