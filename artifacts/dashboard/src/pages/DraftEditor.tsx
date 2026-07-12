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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DraftStatusBadge } from "@/components/DraftStatusBadge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Trash2, CheckCircle, XCircle, Send, Globe, CalendarIcon } from "lucide-react";
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

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.string().min(1, "Category is required"),
  excerpt: z.string().optional(),
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  body: z.string().min(1, "Body is required"),
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      category: "",
      excerpt: "",
      imageUrl: "",
      body: "",
    },
  });

  const initializedForId = useRef<number | null>(null);

  useEffect(() => {
    if (draft && initializedForId.current !== draft.id) {
      initializedForId.current = draft.id;
      form.reset({
        title: draft.title,
        category: draft.category,
        excerpt: draft.excerpt || "",
        imageUrl: draft.imageUrl || "",
        body: draft.body,
      });
    }
  }, [draft, form]);

  const onSave = async (values: z.infer<typeof formSchema>) => {
    try {
      const data = {
        title: values.title,
        category: values.category,
        excerpt: values.excerpt || undefined,
        imageUrl: values.imageUrl || undefined,
        body: values.body,
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

  // Approval/Scheduling state
  const [scheduleDate, setScheduleDate] = useState<Date>();
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);

  if (!isNew && isDraftLoading) {
    return <AppLayout><div className="animate-pulse h-96 bg-muted rounded-xl"></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/queue")} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight truncate">
              {isNew ? "New Draft" : draft?.title || "Untitled"}
            </h1>
            {!isNew && draft && <DraftStatusBadge status={draft.status} />}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button 
            variant="outline" 
            onClick={form.handleSubmit(onSave)}
            disabled={createMutation.isPending || updateMutation.isPending}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Editor Form */}
        <div className="lg:col-span-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSave)} className="space-y-6">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cover Image URL (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="excerpt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Excerpt</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="A short summary of the article..." 
                        className="resize-none h-20" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Content (Markdown)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Write your article here..." 
                        className="min-h-[400px] font-mono text-sm leading-relaxed p-4" 
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

        {/* Sidebar Actions */}
        <div>
          <div className="sticky top-20 space-y-6">
            {!isNew && draft && (
              <div className="bg-muted/30 border border-border rounded-xl p-5 space-y-6">
                <div>
                  <h3 className="font-semibold mb-1 text-sm uppercase tracking-wider text-muted-foreground">Workflow</h3>
                  <div className="text-sm">
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground">Source</span>
                      <span className="font-medium capitalize">{draft.source}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground">Created</span>
                      <span className="font-medium">{format(new Date(draft.createdAt), "MMM d, h:mm a")}</span>
                    </div>
                    {draft.scheduledFor && (
                      <div className="flex justify-between py-2 border-b border-border/50">
                        <span className="text-muted-foreground">Scheduled</span>
                        <span className="font-medium text-blue-600">{format(new Date(draft.scheduledFor), "MMM d, h:mm a")}</span>
                      </div>
                    )}
                    {draft.publishedAt && (
                      <div className="flex justify-between py-2 border-b border-border/50">
                        <span className="text-muted-foreground">Published</span>
                        <span className="font-medium text-green-600">{format(new Date(draft.publishedAt), "MMM d, h:mm a")}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {draft.status === "pending" && (
                    <>
                      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
                        <DialogTrigger asChild>
                          <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                            <CheckCircle className="w-4 h-4" />
                            Approve...
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Approve Article</DialogTitle>
                            <DialogDescription>
                              You can publish this article immediately or schedule it for the future.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4 space-y-4">
                            <div className="flex flex-col space-y-2">
                              <label className="text-sm font-medium">Schedule for later (optional)</label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant={"outline"}
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

                      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20">
                            <XCircle className="w-4 h-4" />
                            Reject...
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
                    </>
                  )}

                  {draft.status === "approved" && (
                    <Button className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white" onClick={handlePublish}>
                      <Send className="w-4 h-4" />
                      Publish Now
                    </Button>
                  )}

                  {(draft.status === "approved" || draft.status === "published" || draft.status === "rejected") && (
                    <Button variant="outline" className="w-full gap-2" onClick={handleUnpublish}>
                      Move back to Pending
                    </Button>
                  )}

                  {draft.status === "published" && (
                    <Button variant="secondary" className="w-full gap-2" onClick={() => window.open(`/articles/${draft.slug}`, '_blank')}>
                      <Globe className="w-4 h-4" />
                      View Live Article
                    </Button>
                  )}

                  <div className="pt-6 border-t border-border mt-6">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4" />
                          Delete Draft
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this draft and remove the data from our servers.
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
              </div>
            )}

            {!isNew && draft && draftId && (
              <DraftEnginePanel
                draftId={draftId}
                onApplySeo={(proposal) => {
                  if (proposal.seoTitle) {
                    form.setValue("title", proposal.seoTitle, { shouldDirty: true });
                  }
                }}
              />
            )}

            {isNew && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
                <h3 className="font-semibold text-primary mb-2">Save to enable workflow</h3>
                <p className="text-sm text-muted-foreground">
                  Once you save this draft for the first time, you'll be able to approve, schedule, or publish it.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
