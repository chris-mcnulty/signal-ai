import { CategoryPage } from '@/components/CategoryPage';

export default function UseCasesPage() {
  return (
    <CategoryPage
      category="use-cases"
      eyebrow="Applied AI"
      title="Use Cases"
      dek="Real-world deployments and applied AI stories — how organizations are putting artificial intelligence to work."
      recentLabel="More Use Cases"
      testidPrefix="use-cases"
      emptyHeading="No Use Cases Yet"
      emptyBody="No use cases yet. Check back soon."
    />
  );
}
