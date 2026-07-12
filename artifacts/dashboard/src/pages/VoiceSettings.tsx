import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetBrandVoice,
  getGetBrandVoiceQueryKey,
  useUpdateBrandVoice,
  useListGroundingDocuments,
  getListGroundingDocumentsQueryKey,
  useCreateGroundingDocument,
  useDeleteGroundingDocument,
  GroundingDocumentInputContextTag,
  type GroundingDocumentInput,
} from "@workspace/api-client-react";
import { Mic2, FileText, Trash2, Plus, Save } from "lucide-react";
import { format } from "date-fns";

const CONTEXT_TAG_LABELS: Record<string, string> = {
  general: "General",
  messaging_framework: "Messaging framework",
  style_guide: "Style guide",
  product: "Product",
};

export default function VoiceSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: voice, isLoading: isVoiceLoading } = useGetBrandVoice({
    query: { queryKey: getGetBrandVoiceQueryKey() },
  });

  const [form, setForm] = useState({
    brandName: "",
    description: "",
    audience: "",
    tone: "",
    styleGuidelines: "",
    positioning: "",
    preferredPhrases: "",
    forbiddenPhrases: "",
  });

  useEffect(() => {
    if (voice) {
      setForm({
        brandName: voice.brandName ?? "",
        description: voice.description ?? "",
        audience: voice.audience ?? "",
        tone: voice.tone ?? "",
        styleGuidelines: voice.styleGuidelines ?? "",
        positioning: voice.positioning ?? "",
        preferredPhrases: (voice.preferredPhrases ?? []).join(", "),
        forbiddenPhrases: (voice.forbiddenPhrases ?? []).join(", "),
      });
    }
  }, [voice]);

  const updateVoice = useUpdateBrandVoice({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBrandVoiceQueryKey() });
        toast({ title: "Brand voice saved" });
      },
      onError: () =>
        toast({ title: "Failed to save brand voice", variant: "destructive" }),
    },
  });

  const handleSaveVoice = () => {
    const splitList = (s: string) =>
      s.split(",").map((x) => x.trim()).filter(Boolean);
    updateVoice.mutate({
      data: {
        brandName: form.brandName,
        description: form.description,
        audience: form.audience,
        tone: form.tone,
        styleGuidelines: form.styleGuidelines,
        positioning: form.positioning,
        preferredPhrases: splitList(form.preferredPhrases),
        forbiddenPhrases: splitList(form.forbiddenPhrases),
      },
    });
  };

  const { data: docs, isLoading: isDocsLoading } = useListGroundingDocuments({
    query: { queryKey: getListGroundingDocumentsQueryKey() },
  });

  const [newDoc, setNewDoc] = useState<GroundingDocumentInput>({
    name: "",
    content: "",
    contextTag: GroundingDocumentInputContextTag.general,
  });
  const [isAdding, setIsAdding] = useState(false);

  const createDoc = useCreateGroundingDocument({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGroundingDocumentsQueryKey() });
        setNewDoc({ name: "", content: "", contextTag: GroundingDocumentInputContextTag.general });
        setIsAdding(false);
        toast({ title: "Grounding document added" });
      },
      onError: () =>
        toast({ title: "Failed to add document", variant: "destructive" }),
    },
  });

  const deleteDoc = useDeleteGroundingDocument({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGroundingDocumentsQueryKey() });
        toast({ title: "Document deleted" });
      },
      onError: () =>
        toast({ title: "Failed to delete document", variant: "destructive" }),
    },
  });

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-1">Voice &amp; Grounding</h1>
        <p className="text-muted-foreground">
          Define your brand voice and upload grounding documents. The content engine uses these on every AI generation.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        {/* Brand voice */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Mic2 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Brand voice</h2>
          </div>

          {isVoiceLoading ? (
            <div className="h-64 animate-pulse bg-muted rounded-md" />
          ) : (
            <>
              <Field label="Brand name">
                <Input
                  value={form.brandName}
                  onChange={(e) => setForm({ ...form, brandName: e.target.value })}
                  placeholder="SignalAI"
                />
              </Field>
              <Field label="Description">
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What the publication is about..."
                  rows={3}
                />
              </Field>
              <Field label="Audience">
                <Textarea
                  value={form.audience}
                  onChange={(e) => setForm({ ...form, audience: e.target.value })}
                  placeholder="Who reads this publication..."
                  rows={2}
                />
              </Field>
              <Field label="Tone">
                <Textarea
                  value={form.tone}
                  onChange={(e) => setForm({ ...form, tone: e.target.value })}
                  placeholder="Confident, analytical, no hype..."
                  rows={2}
                />
              </Field>
              <Field label="Style guidelines">
                <Textarea
                  value={form.styleGuidelines}
                  onChange={(e) => setForm({ ...form, styleGuidelines: e.target.value })}
                  placeholder="Sentence case headlines, short paragraphs..."
                  rows={3}
                />
              </Field>
              <Field label="Positioning">
                <Textarea
                  value={form.positioning}
                  onChange={(e) => setForm({ ...form, positioning: e.target.value })}
                  placeholder="How this publication is different..."
                  rows={2}
                />
              </Field>
              <Field label="Preferred phrases" hint="Comma-separated">
                <Input
                  value={form.preferredPhrases}
                  onChange={(e) => setForm({ ...form, preferredPhrases: e.target.value })}
                  placeholder="signal over noise, applied AI"
                />
              </Field>
              <Field label="Forbidden phrases" hint="Comma-separated">
                <Input
                  value={form.forbiddenPhrases}
                  onChange={(e) => setForm({ ...form, forbiddenPhrases: e.target.value })}
                  placeholder="game-changer, revolutionize"
                />
              </Field>
              <Button
                onClick={handleSaveVoice}
                disabled={updateVoice.isPending}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                {updateVoice.isPending ? "Saving..." : "Save voice"}
              </Button>
            </>
          )}
        </Card>

        {/* Grounding documents */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Grounding documents</h2>
            </div>
            {!isAdding && (
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setIsAdding(true)}>
                <Plus className="w-4 h-4" /> Add
              </Button>
            )}
          </div>

          {isAdding && (
            <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
              <Field label="Name">
                <Input
                  value={newDoc.name}
                  onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
                  placeholder="Q3 messaging framework"
                />
              </Field>
              <Field label="Context tag">
                <Select
                  value={newDoc.contextTag}
                  onValueChange={(v) =>
                    setNewDoc({ ...newDoc, contextTag: v as GroundingDocumentInput["contextTag"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONTEXT_TAG_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Content">
                <Textarea
                  value={newDoc.content}
                  onChange={(e) => setNewDoc({ ...newDoc, content: e.target.value })}
                  placeholder="Paste the document content..."
                  rows={6}
                />
              </Field>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={!newDoc.name.trim() || !newDoc.content.trim() || createDoc.isPending}
                  onClick={() => createDoc.mutate({ data: newDoc })}
                >
                  {createDoc.isPending ? "Adding..." : "Add document"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {isDocsLoading ? (
            <div className="h-32 animate-pulse bg-muted rounded-md" />
          ) : !docs || docs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No grounding documents yet. Add messaging frameworks, style guides, or product docs to steer the engine.
            </p>
          ) : (
            <div className="space-y-2">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-start justify-between gap-3 border border-border rounded-lg p-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{doc.name}</span>
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded uppercase tracking-wide text-muted-foreground">
                        {CONTEXT_TAG_LABELS[doc.contextTag] ?? doc.contextTag}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{doc.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Added {format(new Date(doc.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{doc.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                          The engine will stop using this document for grounding. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-white"
                          onClick={() => deleteDoc.mutate({ id: doc.id })}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">
        {label}
        {hint && <span className="text-xs text-muted-foreground font-normal ml-2">{hint}</span>}
      </label>
      {children}
    </div>
  );
}
