import React from 'react';
import { Link } from 'wouter';
import { useListArticles } from '@workspace/api-client-react';
import { displayAuthor, categoryHref } from '@/lib/utils';

interface RelatedArticlesProps {
  category: string;
  excludeSlug: string;
}

/**
 * Shows up to 3 most-recent published articles from the same category,
 * excluding the current article. Used at the bottom of article, case-study,
 * and spotlight detail pages.
 */
export function RelatedArticles({ category, excludeSlug }: RelatedArticlesProps) {
  const { data: articles } = useListArticles(
    { category },
    { query: { staleTime: 60_000 } },
  );

  const related = (articles ?? [])
    .filter(a => a.slug !== excludeSlug)
    .slice(0, 3);

  if (related.length === 0) return null;

  return (
    <section className="article-body mx-auto mt-16 pt-8 border-t-4 border-news animate-fade-in-up delay-300">
      <div className="font-mono text-xs font-bold uppercase tracking-widest text-news-secondary mb-8">
        More from this section
      </div>
      <div className="space-y-0 divide-y divide-news">
        {related.map((article) => {
          const href = article.category === 'case-study'
            ? `/case-studies/${article.slug}`
            : article.category === 'spotlight'
              ? `/spotlights/${article.slug}`
              : `/articles/${article.slug}`;

          const date = article.publishedAt
            ? new Date(article.publishedAt).toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric',
              })
            : '';

          return (
            <Link
              key={article.id}
              href={href}
              className="group block py-6 hover:bg-news/30 transition-colors -mx-2 px-2"
            >
              <article className="flex gap-4 items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-xs font-bold uppercase text-accent tracking-widest border border-accent px-1.5 py-0.5">
                      {article.category}
                    </span>
                    {date && (
                      <span className="font-mono text-xs text-news-secondary uppercase">{date}</span>
                    )}
                  </div>
                  <h3 className="font-serif text-xl font-bold leading-tight mb-1 group-hover:text-accent transition-colors">
                    {article.title}
                  </h3>
                  <p className="font-sans text-sm text-news-secondary leading-relaxed line-clamp-2 mb-2">
                    {article.dek}
                  </p>
                  <div className="font-mono text-xs text-news-secondary uppercase">
                    By {displayAuthor(article.author)}
                    {article.readingMinutes ? ` · ${article.readingMinutes} min read` : ''}
                  </div>
                </div>
                {article.heroImageUrl && (
                  <div className="w-24 h-24 shrink-0 bg-[#e8e4de] overflow-hidden hidden sm:block">
                    <img
                      src={article.heroImageUrl}
                      alt={article.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </article>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
