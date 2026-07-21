import { CategoryPage } from '@/components/CategoryPage';

export default function OpinionPage() {
  return (
    <CategoryPage
      category="opinion"
      eyebrow="Perspective"
      title="Opinion"
      dek="Informed perspectives and commentary on the ideas, decisions, and forces shaping the future of AI."
      recentLabel="More Opinion"
      testidPrefix="opinion"
      emptyHeading="No Opinion Yet"
      emptyBody="No opinion pieces yet. Check back soon."
    />
  );
}
