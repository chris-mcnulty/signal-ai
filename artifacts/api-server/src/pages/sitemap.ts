import { Router, type IRouter } from "express";
import { getBaseUrl, escapeXml } from "../lib/site";
import { listCaseStudiesWithArticles } from "../lib/content";

const router: IRouter = Router();

router.get("/sitemap.xml", async (req, res): Promise<void> => {
  const baseUrl = getBaseUrl(req);
  const entries = await listCaseStudiesWithArticles();

  const urls: string[] = [
    `<url><loc>${escapeXml(`${baseUrl}/case-studies`)}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`,
    ...entries.map(
      ({ article }) =>
        `<url><loc>${escapeXml(`${baseUrl}/case-studies/${article.slug}`)}</loc><lastmod>${article.updatedAt.toISOString()}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`,
    ),
  ];

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.send(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`,
  );
});

router.get("/robots.txt", (req, res): void => {
  const baseUrl = getBaseUrl(req);
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(`User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`);
});

export default router;
