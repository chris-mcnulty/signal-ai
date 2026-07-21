import { CategoryPage } from '@/components/CategoryPage';

export default function NewsPage() {
  return (
    <CategoryPage
      category="news"
      eyebrow="Industry Coverage"
      title="News"
      dek="Forward-looking coverage of commercial AI — the deals, deployments, and developments reshaping the industry."
      recentLabel="Recent News"
      testidPrefix="news"
      emptyHeading="No News Yet"
      emptyBody="No news yet. Check back soon."
    />
  );
}
