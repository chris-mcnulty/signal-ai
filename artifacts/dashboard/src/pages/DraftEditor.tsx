import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DraftStatusBadge } from "@/components/DraftStatusBadge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Trash2, CheckCircle, XCircle, Send, Globe, CalendarIcon, ChevronDown, Wand2, Loader2, ImagePlus, RefreshCw, Check, PlusCircle, X } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  useGetDraft,
  getGetDraftQueryKey,
  useCreateDraft,
  useUpdateDraft,
  useDeleteDraft,
  useApproveDraft,
  useRejectDraft,
  usePublishDraft,
  useUnpublishDraft,
  useExpandBrief,
  useFindDraftCitations,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListDraftsQueryKey, getGetDraftsSummaryQueryKey } from "@workspace/api-client-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DraftEnginePanel } from "@/components/DraftEnginePanel";
import { ImagePicker } from "@workspace/image-library";

const API_BASE = "/api";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.string().min(1, "Category is required"),
  author: z.string().optional().default("SignalAI Staff"),
  excerpt: z.string().optional(),
  imageUrl: z.string().optional().default(""),
  body: z.string().min(1, "Body is required"),
  sourceUrls: z.array(z.string()).optional().default([]),
});

export default function DraftEditor() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const isNew = !params.id || params.id === "new";
  const draftId = isNew ? null : parseInt(params.id!);

  const { data: draft, isLoading: isDraftLoading } = useGetDraft(
    draftId!, 
    { query: { enabled: !!draftId, queryKey: getGetDraftQueryKey(draftId!) } }
  );

  const createMutation = useCreateDraft();
  const updateMutation = useUpdateDraft();
  const deleteMutation = useDeleteDraft();
  const approveMutation = useApproveDraft();
  const rejectMutation = useRejectDraft();
  const publishMutation = usePublishDraft();
  const unpublishMutation = useUnpublishDraft();
  const expandBriefMutation = useExpandBrief();
  const findCitationsMutation = useFindDraftCitations();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      category: "",
      author: "SignalAI Staff",
      excerpt: "",
      imageUrl: "",
      body: "",
      sourceUrls: [],
    },
  });

  const initializedForId = useRef<number | null>(null);

  useEffect(() => {
    if (draft && initializedForId.current !== draft.id) {
      initializedForId.current = draft.id;
      form.reset({
        title: draft.title,
        category: draft.category,
        author: draft.author || "SignalAI Staff",
        excerpt: draft.excerpt || "",
        imageUrl: draft.imageUrl || "",
        body: draft.body,
        sourceUrls: draft.sourceUrls ?? [],
      });
    }
  }, [draft, form]);

  const onSave = async (values: z.infer<typeof formSchema>) => {
    try {
      const cleanUrls = (values.sourceUrls ?? []).map((u) => u.trim()).filter(Boolean);
      const data = {
        title: values.title,
        category: values.category,
        author: values.author || undefined,
        excerpt: values.excerpt || undefined,
        imageUrl: values.imageUrl || undefined,
        body: values.body,
        sourceUrls: cleanUrls.length ? cleanUrls : null,
      };

      if (isNew) {
        createMutation.mutate(
          { data },
          {
            onSuccess: (newDraft) => {
              toast({ title: "Draft created successfully" });
              queryClient.invalidateQueries({ queryKey: getListDraftsQueryKey() });
              queryClient.invalidateQueries({ queryKey: getGetDraftsSummaryQueryKey() });
              setLocation(`/drafts/${newDraft.id}`);
            },
            onError: () => toast({ title: "Failed to create draft", variant: "destructive" }),
          }
        );
      } else {
        updateMutation.mutate(
          { id: draftId!, data },
          {
            onSuccess: () => {
              toast({ title: "Draft saved" });
              queryClient.invalidateQueries({ queryKey: getListDraftsQueryKey() });
              queryClient.invalidateQueries({ queryKey: getGetDraftQueryKey(draftId!) });
            },
            onError: () => toast({ title: "Failed to save draft", variant: "destructive" }),
          }
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const invalidateAndRefresh = () => {
    queryClient.invalidateQueries({ queryKey: getListDraftsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDraftsSummaryQueryKey() });
    if (draftId) queryClient.invalidateQueries({ queryKey: getGetDraftQueryKey(draftId) });
  };

  const handleDelete = () => {
    if (!draftId) return;
    deleteMutation.mutate({ id: draftId }, {
      onSuccess: () => {
        toast({ title: "Draft deleted" });
        invalidateAndRefresh();
        setLocation("/queue");
      }
    });
  };

  const handleApprove = (scheduledFor?: string | null) => {
    if (!draftId) return;
    approveMutation.mutate({ id: draftId, data: { scheduledFor } }, {
      onSuccess: () => {
        toast({ title: scheduledFor ? "Draft scheduled" : "Draft approved & published" });
        invalidateAndRefresh();
      }
    });
  };

  const handleReject = (reason?: string) => {
    if (!draftId) return;
    rejectMutation.mutate({ id: draftId, data: { reason } }, {
      onSuccess: () => {
        toast({ title: "Draft rejected" });
        invalidateAndRefresh();
      }
    });
  };

  const handlePublish = () => {
    if (!draftId) return;
    publishMutation.mutate({ id: draftId }, {
      onSuccess: () => {
        toast({ title: "Draft published" });
        invalidateAndRefresh();
      }
    });
  };

  const handleUnpublish = () => {
    if (!draftId) return;
    unpublishMutation.mutate({ id: draftId }, {
      onSuccess: () => {
        toast({ title: "Draft unpublished and moved to pending" });
        invalidateAndRefresh();
      }
    });
  };

  const handleExpandBrief = () => {
    const brief = form.getValues("body");
    const category = form.getValues("category") || undefined;
    if (!brief.trim()) {
      toast({ title: "Paste your story notes into the Content field first", variant: "destructive" });
      return;
    }
    expandBriefMutation.mutate(
      { data: { brief, category } },
      {
        onSuccess: (result) => {
          form.setValue("title", result.title, { shouldDirty: true });
          form.setValue("body", result.body, { shouldDirty: true });
          if (!form.getValues("category")) {
            form.setValue("category", result.category, { shouldDirty: true });
          }
          if (result.dek) {
            form.setValue("excerpt", result.dek, { shouldDirty: true });
          }
          if (result.sourceUrls?.length) {
            const existing = new Set(form.getValues("sourceUrls") ?? []);
            const merged = [
              ...(form.getValues("sourceUrls") ?? []),
              ...result.sourceUrls.filter((u) => !existing.has(u)),
            ];
            form.setValue("sourceUrls", merged, { shouldDirty: true });
          }
          toast({ title: "Brief expanded — review the article, then save" });
        },
        onError: () => toast({ title: "AI expansion failed. Try again.", variant: "destructive" }),
      },
    );
  };

  const [scheduleDate, setScheduleDate] = useState<Date>();
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [seoOpen, setSeoOpen] = useState(false);

  const [genOpen, setGenOpen] = useState(false);
  const [genPrompt, setGenPrompt] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [genPreview, setGenPreview] = useState<string | null>(null);
  const [libraryRefreshKey, setLibraryRefreshKey] = useState(0);

  const openGenerator = () => {
    const title = form.getValues("title");
    const category = form.getValues("category");
    const parts: string[] = [];
    if (title) parts.push(`titled '${title}'`);
    if (category) parts.push(`in the '${category}' category`);
    const defaultPrompt = parts.length
      ? `Editorial cover image for an article ${parts.join(" ")}. Professional, high-quality photograph.`
      : "Editorial cover image. Professional, high-quality photograph.";
    setGenPrompt(defaultPrompt);
    setGenPreview(null);
    setGenOpen(true);
  };

  const handleGenerate = async () => {
    if (!genPrompt.trim()) return;
    setGenLoading(true);
    setGenPreview(null);
    try {
      const apiKey = sessionStorage.getItem("dashboard_api_key") ?? "";
      const res = await fetch(`${API_BASE}/images/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify({ prompt: genPrompt.trim() }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const { path } = await res.json() as { path: string };
      setGenPreview(path);
    } catch {
      toast({ title: "Image generation failed. Try again.", variant: "destructive" });
    } finally {
      setGenLoading(false);
    }
  };

  const handleAcceptGenerated = async () => {
    if (!genPreview) return;
    const pathToAssign = genPreview;
    if (draftId) {
      const apiKey = sessionStorage.getItem("dashboard_api_key") ?? "";
      try {
        const res = await fetch(`${API_BASE}/images/assign`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": apiKey },
          body: JSON.stringify({ path: pathToAssign, articleId: draftId }),
        });
        if (!res.ok) {
          toast({ title: "Failed to save image to article. Try again.", variant: "destructive" });
          return;
        }
      } catch {
        toast({ title: "Failed to save image to article. Try again.", variant: "destructive" });
        return;
      }
      form.setValue("imageUrl", pathToAssign, { shouldDirty: false });
      setGenOpen(false);
      setGenPreview(null);
      setLibraryRefreshKey((k) => k + 1);
      invalidateAndRefresh();
      if (draft?.status !== "published") {
        const currentValues = form.getValues();
        updateMutation.mutate(
          { id: draftId, data: { ...currentValues, imageUrl: pathToAssign } },
          {
            onSuccess: () => {
              toast({ title: "Cover image saved" });
              queryClient.invalidateQueries({ queryKey: getGetDraftQueryKey(draftId) });
            },
            onError: () => toast({ title: "Cover image assigned — save failed, try saving manually.", variant: "destructive" }),
          }
        );
      } else {
        toast({ title: "Cover image updated" });
      }
    } else {
      form.setValue("imageUrl", pathToAssign, { shouldDirty: true });
      setGenOpen(false);
      setGenPreview(null);
      toast({ title: "Image set — save the draft to persist it" });
    }
  };

  if (!isNew && isDraftLoading) {
    return <AppLayout><div className="animate-pulse h-96 bg-muted rounded-xl"></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/queue")} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight truncate">
              {isNew ? "New Draft" : draft?.title || "Untitled"}
            </h1>
            {!isNew && draft && <DraftStatusBadge status={draft.status} />}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button 
            onClick={form.handleSubmit(onSave)}
            disabled={createMutation.isPending || updateMutation.isPending}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {draft?.status === "published" ? "Save Changes" : "Save Draft"}
          </Button>
        </div>
      </div>

      {/* Two-column layout: wide editor, narrow sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6">
        
        {/* Editor — primary focus area */}
        <div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSave)} className="space-y-5">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input className="text-lg font-medium h-12" placeholder="Article Title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. AI Models" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="author"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Author</FormLabel>
                      <FormControl>
                        <Input placeholder="SignalAI Staff" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Cover Image <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                      <button
                        type="button"
                        onClick={openGenerator}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        <ImagePlus className="w-3.5 h-3.5" />
                        Generate image
                      </button>
                    </div>
                    <FormControl>
                      <ImagePicker
                        value={field.value || null}
                        onChange={(path) => field.onChange(path)}
                        apiBase={API_BASE}
                        refreshKey={libraryRefreshKey}
                      />
                    </FormControl>

                    {/* Inline generator panel */}
                    {genOpen && (
                      <div className="mt-3 border border-border rounded-xl overflow-hidden">
                        <div className="px-4 py-3 bg-muted/40 border-b border-border flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Image Generator</span>
                          <button
                            type="button"
                            onClick={() => { setGenOpen(false); setGenPreview(null); }}
                            className="text-muted-foreground hover:text-foreground transition-colors text-xs"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="p-4 space-y-3">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Prompt</label>
                            <Textarea
                              value={genPrompt}
                              onChange={(e) => setGenPrompt(e.target.value)}
                              placeholder="Describe the image you want…"
                              className="resize-none h-20 text-sm"
                            />
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleGenerate}
                            disabled={genLoading || !genPrompt.trim()}
                            className="gap-2"
                          >
                            {genLoading ? (
                              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
                            ) : (
                              <><Wand2 className="w-3.5 h-3.5" /> Generate</>
                            )}
                          </Button>

                          {genPreview && (
                            <div className="space-y-3">
                              <div className="rounded-lg overflow-hidden border border-border aspect-video bg-muted">
                                <img
                                  src={genPreview}
                                  alt="Generated preview"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={handleAcceptGenerated}
                                  className="gap-2 flex-1"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Accept
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={handleGenerate}
                                  disabled={genLoading}
                                  className="gap-2 flex-1"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  Try again
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="excerpt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Excerpt</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="A short summary of the article..." 
                        className="resize-none h-16" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sourceUrls"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>References / Sources</FormLabel>
                      <button
                        type="button"
                        disabled={!draft?.id || findCitationsMutation.isPending}
                        onClick={() => {
                          if (!draft?.id) return;
                          findCitationsMutation.mutate(
                            { id: draft.id },
                            {
                              onSuccess: (result) => {
                                const existing = new Set(form.getValues("sourceUrls") ?? []);
                                const next = [
                                  ...(form.getValues("sourceUrls") ?? []),
                                  ...result.citations.filter((u) => !existing.has(u)),
                                ];
                                form.setValue("sourceUrls", next, { shouldDirty: true });
                                toast({ title: `${result.citations.length} citation${result.citations.length === 1 ? "" : "s"} added` });
                              },
                              onError: () => toast({ title: "Could not generate citations", variant: "destructive" }),
                            },
                          );
                        }}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                      >
                        {findCitationsMutation.isPending ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Finding…</>
                        ) : (
                          <><Wand2 className="w-3.5 h-3.5" /> Generate</>
                        )}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(field.value ?? []).map((url, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Input
                            value={url}
                            onChange={(e) => {
                              const next = [...(field.value ?? [])];
                              next[i] = e.target.value;
                              field.onChange(next);
                            }}
                            placeholder="https://example.com/source"
                            className="text-sm font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const next = (field.value ?? []).filter((_, j) => j !== i);
                              field.onChange(next);
                            }}
                            className="text-muted-foreground hover:text-destructive shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => field.onChange([...(field.value ?? []), ""])}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        <PlusCircle className="w-3.5 h-3.5" /> Add source URL
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Content <span className="text-muted-foreground font-normal text-xs ml-1">Markdown</span></FormLabel>
                      <button
                        type="button"
                        onClick={handleExpandBrief}
                        disabled={expandBriefMutation.isPending}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {expandBriefMutation.isPending ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Expanding…</>
                        ) : (
                          <><Wand2 className="w-3.5 h-3.5" /> Expand from brief</>
                        )}
                      </button>
                    </div>
                    <FormControl>
                      <Textarea 
                        placeholder="Paste your story notes, bullet points, or brief here — then click 'Expand from brief' above to turn them into a full article." 
                        className="min-h-[480px] font-mono text-sm leading-relaxed p-4 resize-y" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        {/* Sidebar — clearly secondary */}
        <div>
          <div className="sticky top-20 space-y-4">

            {/* Workflow info */}
            {!isNew && draft && (
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-muted/40 border-b border-border">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workflow</h3>
                </div>
                <div className="divide-y divide-border/60">
                  <div className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-muted-foreground">Source</span>
                    <span className="font-medium capitalize">{draft.source}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-muted-foreground">Created</span>
                    <span className="font-medium">{format(new Date(draft.createdAt), "MMM d, h:mm a")}</span>
                  </div>
                  {draft.scheduledFor && (
                    <div className="flex justify-between px-4 py-2.5 text-sm">
                      <span className="text-muted-foreground">Scheduled</span>
                      <span className="font-medium text-purple-600 dark:text-purple-400">{format(new Date(draft.scheduledFor), "MMM d, h:mm a")}</span>
                    </div>
                  )}
                  {draft.publishedAt && (
                    <div className="flex justify-between px-4 py-2.5 text-sm">
                      <span className="text-muted-foreground">Published</span>
                      <span className="font-medium text-green-600">{format(new Date(draft.publishedAt), "MMM d, h:mm a")}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sources / citations */}

            {/* Primary workflow actions */}
            {!isNew && draft && (
              <div className="space-y-2">
                {/* Primary actions */}
                {draft.status === "pending" && (
                  <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Approve Article…
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Approve Article</DialogTitle>
                        <DialogDescription>
                          Publish immediately or schedule for a future date.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4 space-y-4">
                        <div className="flex flex-col space-y-2">
                          <label className="text-sm font-medium">Schedule for later (optional)</label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !scheduleDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {scheduleDate ? format(scheduleDate, "PPP") : <span>Pick a date</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={scheduleDate}
                                onSelect={setScheduleDate}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          {scheduleDate && (
                            <p className="text-xs text-muted-foreground">Will schedule for 9:00 AM on the selected date.</p>
                          )}
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsApproveOpen(false)}>Cancel</Button>
                        <Button onClick={() => {
                          const isoStr = scheduleDate ? new Date(scheduleDate.setHours(9, 0, 0, 0)).toISOString() : null;
                          handleApprove(isoStr);
                          setIsApproveOpen(false);
                        }}>
                          {scheduleDate ? "Schedule Article" : "Approve & Publish Now"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}

                {draft.status === "approved" && (
                  <Button className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white border-0" onClick={handlePublish}>
                    <Send className="w-4 h-4" />
                    Publish Now
                  </Button>
                )}

                {draft.status === "published" && (
                  <Button variant="secondary" className="w-full gap-2" onClick={() => window.open(`/articles/${draft.slug}`, '_blank')}>
                    <Globe className="w-4 h-4" />
                    View Live Article
                  </Button>
                )}

                {(draft.status === "approved" || draft.status === "published" || draft.status === "rejected") && (
                  <Button variant="outline" className="w-full gap-2 text-sm" onClick={handleUnpublish}>
                    Move back to Pending
                  </Button>
                )}

                {/* Divider before destructive actions */}
                <div className="pt-2 border-t border-border space-y-2">
                  {draft.status === "pending" && (
                    <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30">
                          <XCircle className="w-4 h-4" />
                          Reject Article…
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Reject Article</DialogTitle>
                          <DialogDescription>
                            Provide a reason for rejecting this article. The author will see this.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                          <Textarea 
                            value={rejectionReason} 
                            onChange={e => setRejectionReason(e.target.value)} 
                            placeholder="Reason for rejection (optional)"
                          />
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsRejectOpen(false)}>Cancel</Button>
                          <Button variant="destructive" onClick={() => {
                            handleReject(rejectionReason);
                            setIsRejectOpen(false);
                          }}>Confirm Rejection</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 text-sm">
                        <Trash2 className="w-4 h-4" />
                        Delete Draft
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this draft permanently?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This cannot be undone. The draft and all its data will be removed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-white" onClick={handleDelete}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )}

            {/* AI SEO Panel — collapsible */}
            {!isNew && draft && draftId && (
              <div className="border border-border rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
                  onClick={() => setSeoOpen((v) => !v)}
                >
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI SEO Assist</span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${seoOpen ? "rotate-180" : ""}`} />
                </button>
                {seoOpen && (
                  <div className="p-4">
                    <DraftEnginePanel
                      draftId={draftId}
                      onApplySeo={(proposal) => {
                        if (proposal.seoTitle) {
                          form.setValue("title", proposal.seoTitle, { shouldDirty: true });
                        }
                        if (proposal.metaDescription) {
                          form.setValue("excerpt", proposal.metaDescription, { shouldDirty: true });
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {isNew && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <h3 className="font-semibold text-primary mb-1 text-sm">Save to enable workflow</h3>
                <p className="text-sm text-muted-foreground">
                  Once saved, you'll be able to approve, schedule, or publish this draft.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
