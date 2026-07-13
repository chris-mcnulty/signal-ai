import { useState } from "react";
import { Link } from "wouter";
import { format, formatDistanceToNow, isFuture } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListDrafts,
  getListDraftsQueryKey,
  useGetDraftsSummary,
  getGetDraftsSummaryQueryKey,
  usePublishDraft,
  useApproveDraft,
} from "@workspace/api-client-react";
import { ArticleStatus } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { DraftStatusBadge } from "@/components/DraftStatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Clock,
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  LayoutGrid,
  Bot,
  User,
  Send,
  CalendarDays,
  Pencil,
  ChevronRight,
  Plus,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TabValue = "all" | "scheduled" | ArticleStatus;

const STATUS_BORDER: Record<string, string> = {
  pending: "bg-orange-400",
  approved: "bg-blue-400",
  published: "bg-green-400",
  rejected: "bg-red-400",
};

export default function Queue({ initialTab = "all" }: { initialTab?: TabValue }) {
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [rescheduleTarget, setRescheduleTarget] = useState<{ id: number; title: string } | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>();

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: summary } = useGetDraftsSummary({
    query: { queryKey: getGetDraftsSummaryQueryKey() },
  });

  const statusFilter = activeTab === "all" || activeTab === "scheduled" ? undefined : activeTab;
  const { data: drafts, isLoading, isError } = useListDrafts(
    statusFilter ? { status: statusFilter } : undefined,
    {
      query: {
        queryKey: getListDraftsQueryKey(statusFilter ? { status: statusFilter } : undefined),
      },
    }
  );

  const publishMutation = usePublishDraft();
  const approveMutation = useApproveDraft();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListDraftsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDraftsSummaryQueryKey() });
  };

  const handlePublishNow = (id: number) => {
    publishMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Article published" });
        invalidate();
      },
      onError: () => toast({ title: "Failed to publish", variant: "destructive" }),
    });
  };

  const handleReschedule = () => {
    if (!rescheduleTarget || !rescheduleDate) return;
    const iso = new Date(rescheduleDate.setHours(9, 0, 0, 0)).toISOString();
    approveMutation.mutate({ id: rescheduleTarget.id, data: { scheduledFor: iso } }, {
      onSuccess: () => {
        toast({ title: "Article rescheduled" });
        invalidate();
        setRescheduleTarget(null);
        setRescheduleDate(undefined);
      },
      onError: () => toast({ title: "Failed to reschedule", variant: "destructive" }),
    });
  };

  const allDrafts = drafts || [];

  const scheduledDrafts = allDrafts
    .filter((d) => d.status === "approved" && d.scheduledFor && isFuture(new Date(d.scheduledFor)))
    .sort((a, b) => new Date(a.scheduledFor!).getTime() - new Date(b.scheduledFor!).getTime());

  const scheduledCount = scheduledDrafts.length;

  const filteredDrafts =
    activeTab === "scheduled"
      ? scheduledDrafts.filter(
          (d) =>
            d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.category.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : allDrafts.filter(
          (d) =>
            d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.category.toLowerCase().includes(searchQuery.toLowerCase())
        );

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Editorial Queue</h1>
          <p className="text-muted-foreground">Review, approve, and schedule articles for publishing.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search drafts..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <StatusTab
          label="All"
          value="all"
          count={summary?.total}
          active={activeTab === "all"}
          onClick={() => setActiveTab("all")}
        />
        <StatusTab
          label="Scheduled"
          value="scheduled"
          count={scheduledCount}
          icon={<CalendarDays className="w-3.5 h-3.5" />}
          accentColor="text-purple-500"
          active={activeTab === "scheduled"}
          onClick={() => setActiveTab("scheduled")}
        />
        <StatusTab
          label="Pending"
          value="pending"
          count={summary?.pending}
          icon={<Clock className="w-3.5 h-3.5" />}
          accentColor="text-orange-500"
          active={activeTab === "pending"}
          onClick={() => setActiveTab("pending")}
        />
        <StatusTab
          label="Approved"
          value="approved"
          count={summary?.approved}
          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
          accentColor="text-blue-500"
          active={activeTab === "approved"}
          onClick={() => setActiveTab("approved")}
        />
        <StatusTab
          label="Published"
          value="published"
          count={summary?.published}
          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
          accentColor="text-green-500"
          active={activeTab === "published"}
          onClick={() => setActiveTab("published")}
        />
        <StatusTab
          label="Rejected"
          value="rejected"
          count={summary?.rejected}
          icon={<XCircle className="w-3.5 h-3.5" />}
          accentColor="text-red-500"
          active={activeTab === "rejected"}
          onClick={() => setActiveTab("rejected")}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-5 h-24 animate-pulse bg-muted/50 border-0" />
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-20 border-2 border-dashed border-destructive/30 rounded-xl">
          <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <XCircle className="w-5 h-5 text-destructive" />
          </div>
          <h3 className="text-base font-semibold mb-1">Couldn't load the queue</h3>
          <p className="text-sm text-muted-foreground mb-4">There was a problem fetching drafts. Your session may have expired.</p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: getListDraftsQueryKey() })}
            className="text-sm text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      ) : activeTab === "scheduled" ? (
        <ScheduledView
          drafts={filteredDrafts}
          onPublishNow={handlePublishNow}
          isPublishing={publishMutation.isPending}
          onReschedule={(id, title) => {
            setRescheduleTarget({ id, title });
            setRescheduleDate(undefined);
          }}
        />
      ) : filteredDrafts.length === 0 ? (
        <QueueEmptyState tab={activeTab} searchQuery={searchQuery} />
      ) : (
        <div className="space-y-2">
          {filteredDrafts.map((draft, i) => (
            <Link key={draft.id} href={`/drafts/${draft.id}`}>
              <Card
                className="group relative overflow-hidden transition-all hover:shadow-md hover:border-primary/40 cursor-pointer p-0 animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${i * 40}ms`, animationFillMode: "both" }}
              >
                {/* Status accent bar */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1.5 ${STATUS_BORDER[draft.status] ?? "bg-muted-foreground"}`}
                />

                <div className="pl-5 pr-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  {draft.imageUrl && (
                    <div className="w-full sm:w-20 h-14 bg-muted rounded-md overflow-hidden shrink-0 hidden sm:block">
                      <img src={draft.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    {/* Status + meta row */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <DraftStatusBadge status={draft.status} />
                      <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {draft.category}
                      </span>
                      {draft.source === "api" ? (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Bot className="w-3 h-3" /> API
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="w-3 h-3" /> Manual
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-semibold tracking-tight truncate group-hover:text-primary transition-colors">
                      {draft.title}
                    </h3>
                    {draft.excerpt && (
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{draft.excerpt}</p>
                    )}
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end gap-2 text-xs text-muted-foreground shrink-0 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-border">
                    <div className="flex items-center gap-1" title={format(new Date(draft.updatedAt), "PPPp")}>
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(draft.updatedAt), { addSuffix: true })}
                    </div>
                    {draft.scheduledFor && draft.status === "approved" && (
                      <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium">
                        <CalendarDays className="w-3 h-3" />
                        {format(new Date(draft.scheduledFor), "MMM d")}
                      </div>
                    )}
                    {draft.status === "rejected" && draft.rejectionReason && (
                      <div
                        className="text-red-500 text-xs max-w-[140px] truncate italic"
                        title={draft.rejectionReason}
                      >
                        "{draft.rejectionReason}"
                      </div>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity sm:block hidden" />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Reschedule Dialog */}
      <Dialog open={!!rescheduleTarget} onOpenChange={(open) => { if (!open) setRescheduleTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Article</DialogTitle>
            <DialogDescription>
              Pick a new go-live date for "{rescheduleTarget?.title}". It will be scheduled for 9:00 AM on that day.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 flex flex-col gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !rescheduleDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {rescheduleDate ? format(rescheduleDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={rescheduleDate}
                  onSelect={setRescheduleDate}
                  disabled={(date) => date <= new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {rescheduleDate && (
              <p className="text-xs text-muted-foreground">
                Will go live on {format(rescheduleDate, "MMMM d, yyyy")} at 9:00 AM.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={!rescheduleDate || approveMutation.isPending}
              onClick={handleReschedule}
            >
              Confirm Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function QueueEmptyState({ tab, searchQuery }: { tab: TabValue; searchQuery: string }) {
  if (searchQuery) {
    return (
      <div className="text-center py-20 border-2 border-dashed border-border rounded-xl">
        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
          <Search className="w-5 h-5 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold mb-1">No matches for "{searchQuery}"</h3>
        <p className="text-sm text-muted-foreground">Try a different search term or clear the filter.</p>
      </div>
    );
  }

  const emptyConfig: Record<TabValue, { icon: React.ReactNode; title: string; body: React.ReactNode }> = {
    all: {
      icon: <LayoutGrid className="w-5 h-5 text-primary" />,
      title: "Queue is empty",
      body: (
        <>
          No drafts yet.{" "}
          <Link href="/drafts/new" className="text-primary font-medium hover:underline inline-flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Write a new draft
          </Link>{" "}
          or{" "}
          <Link href="/engine" className="text-primary font-medium hover:underline inline-flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> generate ideas in the Engine
          </Link>.
        </>
      ),
    },
    scheduled: {
      icon: <CalendarDays className="w-5 h-5 text-purple-500" />,
      title: "Nothing scheduled",
      body: "Approve an article with a future date to see it here.",
    },
    pending: {
      icon: <Clock className="w-5 h-5 text-orange-500" />,
      title: "No pending drafts",
      body: (
        <>
          All caught up.{" "}
          <Link href="/drafts/new" className="text-primary font-medium hover:underline">Write a new draft</Link>{" "}
          to add to the review queue.
        </>
      ),
    },
    approved: {
      icon: <CheckCircle2 className="w-5 h-5 text-blue-500" />,
      title: "No approved drafts",
      body: "Approve a pending draft to move it into this view.",
    },
    published: {
      icon: <Send className="w-5 h-5 text-green-500" />,
      title: "Nothing published yet",
      body: "Approved articles will appear here once published.",
    },
    rejected: {
      icon: <XCircle className="w-5 h-5 text-red-500" />,
      title: "No rejected drafts",
      body: "Drafts marked as rejected will appear here.",
    },
  };

  const config = emptyConfig[tab] ?? emptyConfig.all;

  return (
    <div className="text-center py-20 border-2 border-dashed border-border rounded-xl">
      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
        {config.icon}
      </div>
      <h3 className="text-base font-semibold mb-1">{config.title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">{config.body}</p>
    </div>
  );
}

type ScheduledDraft = {
  id: number;
  title: string;
  category: string;
  scheduledFor?: string | null;
  imageUrl?: string | null;
  excerpt?: string | null;
};

function ScheduledView({
  drafts,
  onPublishNow,
  isPublishing,
  onReschedule,
}: {
  drafts: ScheduledDraft[];
  onPublishNow: (id: number) => void;
  isPublishing: boolean;
  onReschedule: (id: number, title: string) => void;
}) {
  if (drafts.length === 0) {
    return (
      <div className="text-center py-20 border-2 border-dashed border-border rounded-xl">
        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
          <CalendarDays className="w-5 h-5 text-purple-500" />
        </div>
        <h3 className="text-base font-semibold mb-1">Nothing scheduled</h3>
        <p className="text-sm text-muted-foreground">
          Approve an article with a future date to see it here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {drafts.map((draft, i) => {
        const goLive = new Date(draft.scheduledFor!);
        const timeUntil = formatDistanceToNow(goLive, { addSuffix: true });

        return (
          <Card
            key={draft.id}
            className="relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 p-0"
            style={{ animationDelay: `${i * 40}ms`, animationFillMode: "both" }}
          >
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-purple-400" />

            <div className="pl-5 pr-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
              {draft.imageUrl && (
                <div className="w-full sm:w-20 h-14 bg-muted rounded-md overflow-hidden shrink-0 hidden sm:block">
                  <img src={draft.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-900 px-2 py-0.5 rounded-md">
                    <CalendarDays className="w-3 h-3" />
                    Scheduled
                  </span>
                  <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {draft.category}
                  </span>
                </div>
                <h3 className="text-base font-semibold tracking-tight truncate">
                  {draft.title}
                </h3>
                {draft.excerpt && (
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{draft.excerpt}</p>
                )}
                <div className="flex items-center gap-4 mt-1.5 text-xs">
                  <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium">
                    <CalendarIcon className="w-3 h-3" />
                    {format(goLive, "EEE, MMM d · h:mm a")}
                  </span>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeUntil}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-muted-foreground"
                  onClick={() => onReschedule(draft.id, draft.title)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Reschedule
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 bg-green-600 hover:bg-green-700 text-white border-0"
                  disabled={isPublishing}
                  onClick={() => onPublishNow(draft.id)}
                >
                  <Send className="w-3.5 h-3.5" />
                  Publish Now
                </Button>
                <Link href={`/drafts/${draft.id}`}>
                  <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground px-2">
                    Edit
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function StatusTab({
  label,
  value,
  count,
  icon,
  accentColor,
  active,
  onClick,
}: {
  label: string;
  value: string;
  count?: number;
  icon?: React.ReactNode;
  accentColor?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
        active
          ? "bg-foreground text-background shadow-sm"
          : `bg-background border border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground`
      }`}
    >
      {icon && (
        <span className={active ? "text-background/70" : (accentColor ?? "")}>
          {icon}
        </span>
      )}
      {label}
      {count !== undefined && (
        <span className={`px-1.5 py-0.5 rounded-full text-xs leading-none ${active ? "bg-background/20 text-background" : "bg-muted text-muted-foreground"}`}>
          {count}
        </span>
      )}
    </button>
  );
}
