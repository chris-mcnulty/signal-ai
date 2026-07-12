import { Clock, CheckCircle2, Send, XCircle, ThumbsUp } from "lucide-react";
import { ArticleStatus } from "@workspace/api-client-react";

const STATUS_CONFIG: Record<ArticleStatus, {
  label: string;
  icon: React.ReactNode;
  className: string;
}> = {
  pending: {
    label: "Pending Review",
    icon: <Clock className="w-3 h-3" />,
    className: "bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-900",
  },
  approved: {
    label: "Approved",
    icon: <ThumbsUp className="w-3 h-3" />,
    className: "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900",
  },
  published: {
    label: "Published",
    icon: <CheckCircle2 className="w-3 h-3" />,
    className: "bg-green-100 text-green-700 border border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-900",
  },
  rejected: {
    label: "Rejected",
    icon: <XCircle className="w-3 h-3" />,
    className: "bg-red-100 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
  },
};

export function DraftStatusBadge({ status }: { status: ArticleStatus }) {
  const config = STATUS_CONFIG[status];
  if (!config) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md border border-border bg-muted text-muted-foreground">
        {status}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md ${config.className}`}>
      {config.icon}
      {config.label}
    </span>
  );
}
