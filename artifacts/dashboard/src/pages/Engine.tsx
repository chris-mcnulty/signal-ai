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
      <div className="grid lg:grid-cols-2 gap-8 items-start mb-10">
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
        <FlaskConical className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Research</h2>
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
          className="gap-2"
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
              {poller.job?.status === "running" ? "Researching..." : "Starting..."}
            </>
          ) : (
            "Start research"
          )}
        </Button>
      </div>

      <div className="pt-4 border-t border-border">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Briefings
        </h3>
        {isLoading ? (
          <div className="h-24 animate-pulse bg-muted rounded-md" />
        ) : !briefings || briefings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No briefings yet.</p>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {briefings.map((b) => (
              <AccordionItem key={b.id} value={`b-${b.id}`}>
                <AccordionTrigger className="text-left">
                  <div className="flex-1 min-w-0 pr-2">
                    <span className="font-medium">{b.topic}</span>
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
                      <Button variant="ghost" size="sm" className="gap-1 text-destructive hover:text-destructive">
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
        <Lightbulb className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Ideation</h2>
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
          className="gap-2"
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
              {poller.job?.status === "running" ? "Generating briefs..." : "Starting..."}
            </>
          ) : (
            "Generate concept briefs"
          )}
        </Button>
      </div>
    </Card>
  );
}

const BRIEF_STATUS_STYLES: Record<string, string> = {
  proposed: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  accepted: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  drafted: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
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
      <div className="flex items-center gap-2 mb-4">
        <PenSquare className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Concept briefs</h2>
      </div>

      {isLoading ? (
        <div className="h-32 animate-pulse bg-muted rounded-md" />
      ) : !briefs || briefs.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
          <p className="text-muted-foreground">
            No concept briefs yet. Run ideation above to generate some.
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
  return (
    <Card className="p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${BRIEF_STATUS_STYLES[brief.status] ?? "bg-muted"}`}>
              {brief.status}
            </span>
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {brief.category}
            </span>
            {fit && (
              <span
                className="text-xs text-muted-foreground"
                title={fit.rationale}
              >
                voice: {fit.voiceFit} · topic: {fit.topicFit} ·{" "}
                {fit.recommendation === "keep" ? "recommended" : "not recommended"}
              </span>
            )}
          </div>
          <h3 className="font-semibold tracking-tight">{brief.title}</h3>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{brief.summary}</p>
      <p className="text-sm"><span className="font-medium">Angle:</span> {brief.angle}</p>
      {brief.keyPoints && brief.keyPoints.length > 0 && (
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-0.5">
          {brief.keyPoints.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2 mt-auto pt-2 flex-wrap">
        {brief.status === "proposed" && (
          <>
            <Button size="sm" variant="outline" className="gap-1" onClick={onAccept}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Accept
            </Button>
            <Button size="sm" variant="outline" className="gap-1 text-destructive hover:text-destructive" onClick={onReject}>
              <XCircle className="w-3.5 h-3.5" /> Reject
            </Button>
          </>
        )}
        {(brief.status === "proposed" || brief.status === "accepted") && (
          <Button size="sm" className="gap-1" disabled={anyDrafting} onClick={onDraft}>
            {isDrafting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Writing draft...
              </>
            ) : (
              <>
                <PenSquare className="w-3.5 h-3.5" /> Generate draft
              </>
            )}
          </Button>
        )}
        {brief.status === "drafted" && brief.articleId && (
          <Button size="sm" variant="secondary" asChild className="gap-1">
            <Link href={`/drafts/${brief.articleId}`}>
              <ExternalLink className="w-3.5 h-3.5" /> Open draft
            </Link>
          </Button>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive ml-auto">
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
