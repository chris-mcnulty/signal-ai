import React from 'react';

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

interface ArticleBodyProps {
  body: string;
  /** Extra Tailwind classes merged onto the wrapper div (e.g. animation, margin). */
  className?: string;
}

/**
 * Shared article body renderer used by article, case-study, and spotlight pages.
 * Handles both HTML bodies (from the rich-text editor) and markdown bodies.
 */
export function ArticleBody({ body, className = '' }: ArticleBodyProps) {
  const base = 'article-body prose prose-neutral max-w-none font-sans text-news-primary';
  const classes = [base, className].filter(Boolean).join(' ');

  if (isHtmlBody(body)) {
    return (
      <div
        className={classes}
        dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(body) }}
      />
    );
  }

  let firstParaSeen = false;

  const blocks = body.split('\n\n').filter(b => b.trim() !== '').map((block, index) => {
    const trimmed = block.trim();

    if (trimmed.startsWith('# ')) {
      return <h2 key={index}>{renderInlineLinks(trimmed.slice(2), index)}</h2>;
    }
    if (trimmed.startsWith('## ')) {
      return <h2 key={index}>{renderInlineLinks(trimmed.slice(3), index)}</h2>;
    }
    if (trimmed.startsWith('### ')) {
      return <h3 key={index}>{renderInlineLinks(trimmed.slice(4), index)}</h3>;
    }
    if (trimmed.startsWith('> ')) {
      return <blockquote key={index}>{renderInlineLinks(trimmed.slice(2), index)}</blockquote>;
    }

    const lines = trimmed.split('\n').filter(l => l.trim() !== '');
    if (lines.length > 1 && lines.every(l => /^[-*] /.test(l.trim()))) {
      return (
        <ul key={index}>
          {lines.map((line, li) => (
            <li key={li}>{renderInlineLinks(line.trim().replace(/^[-*] /, ''), index * 1000 + li)}</li>
          ))}
        </ul>
      );
    }

    if (lines.length > 1 && lines.every(l => /^\d+\.\s/.test(l.trim()))) {
      return (
        <ol key={index}>
          {lines.map((line, li) => (
            <li key={li}>{renderInlineLinks(line.trim().replace(/^\d+\.\s+/, ''), index * 1000 + li)}</li>
          ))}
        </ol>
      );
    }

    const isFirst = !firstParaSeen;
    firstParaSeen = true;
    if (isFirst) {
      return (
        <p key={index} className="article-dropcap">
          {renderInlineLinks(trimmed, index)}
        </p>
      );
    }
    return <p key={index}>{renderInlineLinks(trimmed, index)}</p>;
  });

  return <div className={classes}>{blocks}</div>;
}
