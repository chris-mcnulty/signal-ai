import { useState } from "react";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  useStartResearch,
  useListBriefings,
  getListBriefingsQueryKey,
  useDeleteBriefing,
  useStartIdeation,
  useListBriefs,
  getListBriefsQueryKey,
  useUpdateBrief,
  useDeleteBrief,
  useDraftFromBrief,
  useGetEngineJob,
  getGetEngineJobQueryKey,
  getListDraftsQueryKey,
  getGetDraftsSummaryQueryKey,
  type ContentBrief,
  type EngineJob,
} from "@workspace/api-client-react";
import {
  FlaskConical,
  Lightbulb,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  PenSquare,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";

function useJobPoller(onDone: (job: EngineJob) => void) {
  const [jobId, setJobId] = useState<number | null>(null);
  const [handled, setHandled] = useState(false);

  const { data: job } = useGetEngineJob(jobId!, {
    query: {
      queryKey: getGetEngineJobQueryKey(jobId!),
      enabled: jobId !== null,
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return status === "queued" || status === "running" ? 2000 : false;
      },
    },
  });

  if (job && jobId !== null && !handled && (job.status === "completed" || job.status === "failed")) {
    setHandled(true);
    onDone(job);
  }

  const start = (id: number) => {
    setHandled(false);
    setJobId(id);
  };
  const reset = () => {
    setJobId(null);
    setHandled(false);
  };

  const isActive =
    jobId !== null && (!job || job.status === "queued" || job.status === "running");

  return { job, jobId, start, reset, isActive };
}

export default function Engine() {
  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-1">Content Engine</h1>
        <p className="text-muted-foreground">
          Research topics, generate concept briefs, and turn them into drafts for the review queue.
        </p>
      </div>
      <div className="grid lg:grid-cols-2 gap-6 items-start mb-10">
        <ResearchPanel />
        <IdeationPanel />
      </div>
      <BriefsPanel />
    </AppLayout>
  );
}

function ResearchPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [topic, setTopic] = useState("");
  const [url, setUrl] = useState("");

  const poller = useJobPoller((job) => {
    if (job.status === "completed") {
      queryClient.invalidateQueries({ queryKey: getListBriefingsQueryKey() });
      toast({ title: "Research complete", description: "A new briefing is ready." });
    } else {
      toast({
        title: "Research failed",
        description: job.error ?? "Unknown error",
        variant: "destructive",
      });
    }
  });

  const startResearch = useStartResearch({
    mutation: {
      onSuccess: (job) => {
        poller.start(job.id);
        setTopic("");
        setUrl("");
      },
      onError: (err: unknown) => {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: unknown }).message)
            : "Could not start research";
        toast({ title: "Research failed to start", description: message, variant: "destructive" });
      },
    },
  });

  const { data: briefings, isLoading } = useListBriefings({
    query: { queryKey: getListBriefingsQueryKey() },
  });

  const deleteBriefing = useDeleteBriefing({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBriefingsQueryKey() });
        toast({ title: "Briefing deleted" });
      },
    },
  });

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
          <FlaskConical className="w-4 h-4 text-primary" />
        </div>
        <h2 className="text-base font-semibold">Research</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Scans recent news and optionally crawls a seed site, then writes an intelligence briefing.
      </p>
      <div className="space-y-3">
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Topic to research (e.g. AI inference pricing)"
        />
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Optional seed URL to crawl"
        />
        <Button
          className="w-full gap-2"
          disabled={!topic.trim() || startResearch.isPending || poller.isActive}
          onClick={() =>
            startResearch.mutate({
              data: { topic: topic.trim(), ...(url.trim() ? { url: url.trim() } : {}) },
            })
          }
        >
          {poller.isActive || startResearch.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {poller.job?.status === "running" ? "Researching…" : "Starting…"}
            </>
          ) : (
            "Start Research"
          )}
        </Button>
      </div>

      <div className="pt-4 border-t border-border">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Briefings
        </h3>
        {isLoading ? (
          <div className="h-24 animate-pulse bg-muted rounded-md" />
        ) : !briefings || briefings.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center mx-auto mb-2">
              <FlaskConical className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground font-medium mb-0.5">No briefings yet</p>
            <p className="text-xs text-muted-foreground">Run a research scan above to generate one.</p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {briefings.map((b) => (
              <AccordionItem key={b.id} value={`b-${b.id}`}>
                <AccordionTrigger className="text-left">
                  <div className="flex-1 min-w-0 pr-2">
                    <span className="font-medium text-sm">{b.topic}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {format(new Date(b.createdAt), "MMM d, h:mm a")}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="text-sm whitespace-pre-wrap text-muted-foreground max-h-64 overflow-y-auto mb-3">
                    {b.briefing}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-3.5 h-3.5" /> Delete briefing
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this briefing?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Ideation will no longer be able to use it for grounding.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-white"
                          onClick={() => deleteBriefing.mutate({ id: b.id })}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </Card>
  );
}

function IdeationPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [goal, setGoal] = useState("");
  const [themes, setThemes] = useState("");
  const [audience, setAudience] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedBriefings, setSelectedBriefings] = useState<number[]>([]);

  const { data: briefings } = useListBriefings({
    query: { queryKey: getListBriefingsQueryKey() },
  });

  const poller = useJobPoller((job) => {
    if (job.status === "completed") {
      queryClient.invalidateQueries({ queryKey: getListBriefsQueryKey() });
      toast({ title: "Ideation complete", description: "New concept briefs are ready below." });
    } else {
      toast({
        title: "Ideation failed",
        description: job.error ?? "Unknown error",
        variant: "destructive",
      });
    }
  });

  const startIdeation = useStartIdeation({
    mutation: {
      onSuccess: (job) => poller.start(job.id),
      onError: () =>
        toast({ title: "Ideation failed to start", variant: "destructive" }),
    },
  });

  const toggleBriefing = (id: number) =>
    setSelectedBriefings((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
          <Lightbulb className="w-4 h-4 text-primary" />
        </div>
        <h2 className="text-base font-semibold">Ideation</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Answers a short interview, then proposes 5–10 concept briefs judged against your brand voice.
      </p>
      <div className="space-y-3">
        <Textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Goal — what should this content push achieve?"
          rows={2}
        />
        <Input
          value={themes}
          onChange={(e) => setThemes(e.target.value)}
          placeholder="Themes to push (comma-separated, optional)"
        />
        <Input
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          placeholder="Audience override (optional)"
        />
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes (optional)"
          rows={2}
        />
        {briefings && briefings.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Ground in research briefings:</p>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {briefings.map((b) => (
                <label key={b.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={selectedBriefings.includes(b.id)}
                    onCheckedChange={() => toggleBriefing(b.id)}
                  />
                  <span className="truncate">{b.topic}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        <Button
          className="w-full gap-2"
          disabled={!goal.trim() || startIdeation.isPending || poller.isActive}
          onClick={() =>
            startIdeation.mutate({
              data: {
                goal: goal.trim(),
                themes: themes.split(",").map((t) => t.trim()).filter(Boolean),
                ...(audience.trim() ? { audience: audience.trim() } : {}),
                ...(notes.trim() ? { notes: notes.trim() } : {}),
                ...(selectedBriefings.length ? { briefingIds: selectedBriefings } : {}),
              },
            })
          }
        >
          {poller.isActive || startIdeation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {poller.job?.status === "running" ? "Generating briefs…" : "Starting…"}
            </>
          ) : (
            "Generate Concept Briefs"
          )}
        </Button>
      </div>
    </Card>
  );
}

const BRIEF_STATUS_CONFIG: Record<string, { className: string; label: string }> = {
  proposed: {
    className: "bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-900",
    label: "Proposed",
  },
  accepted: {
    className: "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900",
    label: "Accepted",
  },
  rejected: {
    className: "bg-red-100 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
    label: "Rejected",
  },
  drafted: {
    className: "bg-green-100 text-green-700 border border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-900",
    label: "Draft Ready",
  },
};

function BriefsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [draftingBriefId, setDraftingBriefId] = useState<number | null>(null);

  const { data: briefs, isLoading } = useListBriefs(undefined, {
    query: { queryKey: getListBriefsQueryKey(undefined) },
  });

  const poller = useJobPoller((job) => {
    setDraftingBriefId(null);
    if (job.status === "completed") {
      queryClient.invalidateQueries({ queryKey: getListBriefsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListDraftsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDraftsSummaryQueryKey() });
      const articleId = (job.result as { articleId?: number } | null)?.articleId;
      toast({
        title: "Draft generated",
        description: articleId
          ? "The draft is waiting in the review queue."
          : "Draft complete.",
      });
    } else {
      toast({
        title: "Draft generation failed",
        description: job.error ?? "Unknown error",
        variant: "destructive",
      });
    }
  });

  const updateBrief = useUpdateBrief({
    mutation: {
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: getListBriefsQueryKey() }),
      onError: () => toast({ title: "Failed to update brief", variant: "destructive" }),
    },
  });

  const deleteBrief = useDeleteBrief({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBriefsQueryKey() });
        toast({ title: "Brief deleted" });
      },
    },
  });

  const draftFromBrief = useDraftFromBrief({
    mutation: {
      onSuccess: (job, vars) => {
        setDraftingBriefId(vars.id);
        poller.start(job.id);
      },
      onError: () => {
        setDraftingBriefId(null);
        toast({ title: "Failed to start draft generation", variant: "destructive" });
      },
    },
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
          <PenSquare className="w-4 h-4 text-primary" />
        </div>
        <h2 className="text-lg font-semibold">Concept Briefs</h2>
        {briefs && briefs.length > 0 && (
          <span className="ml-1 text-xs font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
            {briefs.length}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="h-32 animate-pulse bg-muted rounded-xl" />
      ) : !briefs || briefs.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-base font-semibold mb-1">No concept briefs yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Run <strong>Ideation</strong> above to generate a batch of content ideas tailored to your brand voice.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {briefs.map((brief) => (
            <BriefCard
              key={brief.id}
              brief={brief}
              isDrafting={draftingBriefId === brief.id && poller.isActive}
              anyDrafting={poller.isActive}
              onAccept={() => updateBrief.mutate({ id: brief.id, data: { status: "accepted" } })}
              onReject={() => updateBrief.mutate({ id: brief.id, data: { status: "rejected" } })}
              onDelete={() => deleteBrief.mutate({ id: brief.id })}
              onDraft={() => draftFromBrief.mutate({ id: brief.id })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BriefCard({
  brief,
  isDrafting,
  anyDrafting,
  onAccept,
  onReject,
  onDelete,
  onDraft,
}: {
  brief: ContentBrief;
  isDrafting: boolean;
  anyDrafting: boolean;
  onAccept: () => void;
  onReject: () => void;
  onDelete: () => void;
  onDraft: () => void;
}) {
  const fit = brief.fitAssessment;
  const statusConfig = BRIEF_STATUS_CONFIG[brief.status];

  return (
    <Card className="p-5 flex flex-col gap-3 hover:border-primary/30 transition-colors">
      {/* Header: status + category */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs px-2 py-0.5 rounded-md font-semibold ${statusConfig?.className ?? "bg-muted text-muted-foreground"}`}>
          {statusConfig?.label ?? brief.status}
        </span>
        <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          {brief.category}
        </span>
        {fit && (
          <span
            className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-md border ${
              fit.recommendation === "keep"
                ? "text-green-700 bg-green-50 border-green-200 dark:text-green-300 dark:bg-green-950 dark:border-green-900"
                : "text-muted-foreground bg-muted border-border"
            }`}
            title={fit.rationale}
          >
            {fit.recommendation === "keep" ? "✓ Recommended" : "~ Not recommended"}
          </span>
        )}
      </div>

      {/* Idea title — largest element */}
      <h3 className="text-base font-bold tracking-tight leading-snug">{brief.title}</h3>

      {/* Summary + angle */}
      <p className="text-sm text-muted-foreground leading-relaxed">{brief.summary}</p>
      <p className="text-sm"><span className="font-medium text-foreground">Angle:</span> {brief.angle}</p>

      {brief.keyPoints && brief.keyPoints.length > 0 && (
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-0.5">
          {brief.keyPoints.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      )}

      {/* Actions — Accept/Reject prominent, delete secondary */}
      <div className="flex items-center gap-2 mt-auto pt-3 border-t border-border flex-wrap">
        {brief.status === "proposed" && (
          <>
            <Button size="sm" className="gap-1.5" onClick={onAccept}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Accept
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30" onClick={onReject}>
              <XCircle className="w-3.5 h-3.5" />
              Reject
            </Button>
          </>
        )}
        {(brief.status === "proposed" || brief.status === "accepted") && (
          <Button
            size="sm"
            variant={brief.status === "accepted" ? "default" : "outline"}
            className="gap-1.5"
            disabled={anyDrafting}
            onClick={onDraft}
          >
            {isDrafting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Writing…
              </>
            ) : (
              <>
                <PenSquare className="w-3.5 h-3.5" /> Generate Draft
              </>
            )}
          </Button>
        )}
        {brief.status === "drafted" && brief.articleId && (
          <Button size="sm" variant="secondary" asChild className="gap-1.5">
            <Link href={`/drafts/${brief.articleId}`}>
              <ExternalLink className="w-3.5 h-3.5" /> Open Draft
            </Link>
          </Button>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 ml-auto">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this brief?</AlertDialogTitle>
              <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-white" onClick={onDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Card>
  );
}
