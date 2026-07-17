import { SITE, escapeHtml } from "../lib/site";

const CSS = `
:root{--bg:#f7f5f2;--ink:#1a1a1a;--muted:#4a4a4a;--accent:#d94226;--line:#d1cdc7}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--ink);font-family:'Inter',sans-serif;line-height:1.6}
a{color:inherit}
h1,h2,h3,h4,h5{font-family:'Playfair Display',serif}
.mono{font-family:'Space Mono',monospace;letter-spacing:.08em;text-transform:uppercase}
header.masthead{border-bottom:1px solid var(--line);padding:14px 24px;display:flex;align-items:center;justify-content:space-between;background:rgba(247,245,242,.95)}
.brand{font-size:26px;font-weight:900;letter-spacing:-.02em;text-decoration:none}
.brand span{color:var(--accent)}
.tagline{font-size:11px;color:var(--muted)}
main{max-width:800px;margin:0 auto;padding:48px 24px 80px}
.kicker{display:inline-block;font-size:11px;font-weight:700;color:var(--accent);border:1px solid var(--accent);padding:3px 8px}
.meta{font-size:12px;color:var(--muted);margin-left:10px}
h1.headline{font-size:clamp(34px,6vw,54px);line-height:1.07;letter-spacing:-.01em;margin:20px 0 16px;font-weight:800}
.dek{font-size:21px;color:var(--muted);line-height:1.5;margin-bottom:28px}
.byline{font-size:13px;color:var(--muted);border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:10px 0;margin-bottom:36px}
.hero-rule{border:none;border-top:3px solid var(--ink);margin:0 0 20px}
.hero-image{margin:0 0 36px;overflow:hidden;border:1px solid var(--line)}
.hero-image img{width:100%;max-height:420px;object-fit:cover;display:block}
.sources{border-top:1px solid var(--line);margin-top:36px;padding-top:20px}
.sources h3{font-size:11px;color:var(--muted);margin-bottom:12px}
.sources ol{padding-left:20px;font-size:13px;color:var(--muted)}
.sources li{margin-bottom:6px}
.sources a{color:var(--muted);text-decoration:none}
.sources a:hover{color:var(--accent);text-decoration:underline}
.company-card{border:1px solid var(--line);background:#fffdf9;padding:24px;margin:0 0 36px}
.company-card h2{font-size:13px;margin-bottom:14px;color:var(--accent)}
.company-card .company-name{font-size:22px;font-weight:800;margin-bottom:6px}
.company-card p.summary{font-size:15px;color:var(--muted);margin-bottom:14px}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;font-size:13px}
.facts dt{font-size:10px;color:var(--muted)}
.facts dd{font-weight:700}
.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1px;background:var(--line);border:1px solid var(--line);margin:0 0 40px}
.metric{background:var(--bg);padding:20px}
.metric .value{font-size:34px;font-weight:900;color:var(--accent);line-height:1.1}
.metric .label{font-size:11px;font-weight:700;margin-top:6px}
.metric .context{font-size:12px;color:var(--muted);margin-top:4px}
.article-body p{margin-bottom:24px;font-size:18px;line-height:1.8}
.article-body p:first-child::first-letter{font-size:5.5rem;font-weight:900;float:left;line-height:0.82;margin-right:0.1em;margin-top:0.05em;color:var(--accent)}
.article-body h2{font-size:27px;margin:44px 0 14px;font-weight:800}
blockquote{border-left:4px solid var(--accent);padding-left:22px;margin:36px 0;font-style:italic;font-size:24px;line-height:1.45;color:var(--accent)}
blockquote footer{font-style:normal;font-size:13px;color:var(--muted);margin-top:10px}
.related{border-top:2px solid var(--ink);margin-top:56px;padding-top:24px}
.related h2{font-size:13px;margin-bottom:18px}
.related ul{list-style:none}
.related li{border-bottom:1px solid var(--line);padding:14px 0}
.related a{font-size:19px;font-weight:700;text-decoration:none}
.related a:hover{color:var(--accent)}
.related .rmeta{font-size:11px;color:var(--muted);display:block;margin-top:4px}
.cs-list{list-style:none}
.cs-list li{border-bottom:1px solid var(--line);padding:28px 0}
.cs-list a.cs-title{font-size:26px;font-weight:800;text-decoration:none;line-height:1.2;display:block;margin:8px 0}
.cs-list a.cs-title:hover{color:var(--accent)}
.cs-list .cs-dek{font-size:16px;color:var(--muted)}
.cs-list .cs-company{font-size:12px;color:var(--muted);margin-top:8px}
footer.site{border-top:1px solid var(--line);padding:24px;text-align:center;font-size:12px;color:var(--muted)}
`;

export type PageMeta = {
  title: string;
  description: string;
  canonicalUrl: string;
  ogImageUrl: string;
  ogType: "article" | "website";
  jsonLd: string[];
  publishedTime?: string;
  modifiedTime?: string;
};

/**
 * Search-engine site-verification meta tags, rendered on every SSR page when
 * the corresponding env vars are set (Search Console / Bing Webmaster
 * "HTML tag" verification method).
 */
export function verificationMetaTags(): string {
  const tags: string[] = [];
  const google = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  if (google) {
    tags.push(
      `<meta name="google-site-verification" content="${escapeHtml(google)}">`,
    );
  }
  const bing = process.env.BING_SITE_VERIFICATION?.trim();
  if (bing) {
    tags.push(`<meta name="msvalidate.01" content="${escapeHtml(bing)}">`);
  }
  return tags.join("\n");
}

export function renderPage(meta: PageMeta, bodyHtml: string): string {
  const articleMeta =
    meta.ogType === "article"
      ? `<meta property="article:published_time" content="${escapeHtml(meta.publishedTime ?? "")}">
<meta property="article:modified_time" content="${escapeHtml(meta.modifiedTime ?? "")}">
<meta property="article:section" content="Case Studies">`
      : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(meta.title)}</title>
<meta name="description" content="${escapeHtml(meta.description)}">
${verificationMetaTags()}
<link rel="canonical" href="${escapeHtml(meta.canonicalUrl)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Inter:wght@400;500;600&family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">
<link rel="icon" type="image/png" href="/case-studies/static/signalai-logo.png">
<meta property="og:site_name" content="${escapeHtml(SITE.name)}">
<meta property="og:type" content="${meta.ogType}">
<meta property="og:title" content="${escapeHtml(meta.title)}">
<meta property="og:description" content="${escapeHtml(meta.description)}">
<meta property="og:url" content="${escapeHtml(meta.canonicalUrl)}">
<meta property="og:image" content="${escapeHtml(meta.ogImageUrl)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(meta.title)}">
<meta name="twitter:description" content="${escapeHtml(meta.description)}">
<meta name="twitter:image" content="${escapeHtml(meta.ogImageUrl)}">
${articleMeta}
<style>${CSS}</style>
${meta.jsonLd.join("\n")}
</head>
<body>
<header class="masthead">
<a class="brand" href="/">Signal<span>AI</span></a>
<div class="tagline mono">${escapeHtml(SITE.tagline)}</div>
</header>
${bodyHtml}
<footer class="site">© ${new Date().getFullYear()} ${escapeHtml(SITE.name)} — ${escapeHtml(SITE.tagline)}</footer>
</body>
</html>`;
}

/**
 * Convert markdown inline elements (links, bold, italic) in a raw text segment
 * to HTML, escaping all plain-text portions.  Never double-escapes.
 */
function renderInline(raw: string): string {
  const parts: string[] = [];
  let lastIndex = 0;
  // Match links [text](url), **bold**, or *italic* — in that priority order
  const pattern = /\[([^\]]*)\]\((https?:\/\/[^\s)]*)\)|\*\*([^*]+)\*\*|\*([^*\n]+)\*/g;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(raw)) !== null) {
    parts.push(escapeHtml(raw.slice(lastIndex, m.index)));
    if (m[1] !== undefined) {
      // [text](url)
      parts.push(`<a href="${escapeHtml(m[2])}" target="_blank" rel="noopener noreferrer">${escapeHtml(m[1])}</a>`);
    } else if (m[3] !== undefined) {
      // **bold**
      parts.push(`<strong>${escapeHtml(m[3])}</strong>`);
    } else {
      // *italic*
      parts.push(`<em>${escapeHtml(m[4])}</em>`);
    }
    lastIndex = m.index + m[0].length;
  }
  parts.push(escapeHtml(raw.slice(lastIndex)));
  return parts.join("");
}

export function renderArticleBody(body: string): string {
  return body
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      if (block.startsWith("## ")) {
        return `<h2>${renderInline(block.slice(3))}</h2>`;
      }
      if (block.startsWith("# ")) {
        // Treat top-level heading as h2 to avoid duplicating the article <h1>
        return `<h2>${renderInline(block.slice(2))}</h2>`;
      }
      return `<p>${renderInline(block)}</p>`;
    })
    .join("\n");
}
