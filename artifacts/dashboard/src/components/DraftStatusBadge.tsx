import { Badge } from "@/components/ui/badge";
import { ArticleStatus } from "@workspace/api-client-react";

export function DraftStatusBadge({ status }: { status: ArticleStatus }) {
  switch (status) {
    case "pending":
      return <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-900">Pending</Badge>;
    case "approved":
      return <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900">Approved</Badge>;
    case "published":
      return <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-900">Published</Badge>;
    case "rejected":
      return <Badge variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900">Rejected</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
