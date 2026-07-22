import { useEffect, useRef, useState } from "react";
import {
  useGetDraftSpotlight,
  getGetDraftSpotlightQueryKey,
  useUpsertDraftSpotlight,
  useImportSpotlightUrl,
  useUpdateDraft,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Globe, Download, Upload } from "lucide-react";

function toDatetimeLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type SpotlightFields = {
  companyName: string;
  companyWebsite: string;
  industry: string;
  companyLogoUrl: string;
  companyBlurb: string;
};

const emptySpotlight: SpotlightFields = {
  companyName: "",
  companyWebsite: "",
  industry: "",
  companyLogoUrl: "",
  companyBlurb: "",
};

export function SpotlightPanel({
  draftId,
  status,
  publishedAt,
}: {
  draftId: number;
  status?: string;
  publishedAt?: string | null;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useGetDraftSpotlight(draftId, {
    query: { queryKey: getGetDraftSpotlightQueryKey(draftId) },
  });
  const upsertMutation = useUpsertDraftSpotlight();
  const importMutation = useImportSpotlightUrl();
  const updateDraftMutation = useUpdateDraft();

  const [fields, setFields] = useState<SpotlightFields>(emptySpotlight);
  const [loadedFor, setLoadedFor] = useState<number | null>(null);
  const [importUrl, setImportUrl] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const [publishedAtLocal, setPublishedAtLocal] = useState(() =>
    publishedAt ? toDatetimeLocalInput(publishedAt) : ""
  );

  useEffect(() => {
    setPublishedAtLocal(publishedAt ? toDatetimeLocalInput(publishedAt) : "");
  }, [publishedAt]);

  useEffect(() => {
    if (data && loadedFor !== draftId) {
      setLoadedFor(draftId);
      setFields({
        companyName: data.companyName,
        companyWebsite: data.companyWebsite,
        industry: data.industry,
        companyLogoUrl: data.companyLogoUrl ?? "",
        companyBlurb: data.companyBlurb,
      });
    }
  }, [data, draftId, loadedFor]);

  const setField = (key: keyof SpotlightFields, value: string) =>
    setFields((f) => ({ ...f, [key]: value }));

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sessionKey = sessionStorage.getItem("dashboard_api_key");
    if (!sessionKey) {
      toast({ title: "Not authenticated", variant: "destructive" });
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", "General");
    formData.append("label", file.name);
    setLogoUploading(true);
    try {
      const res = await fetch("/api/library/images", {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionKey}` },
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { path: string };
      setField("companyLogoUrl", data.path);
      toast({ title: "Logo uploaded — save to apply" });
    } catch (err) {
      toast({ title: `Upload failed: ${String(err)}`, variant: "destructive" });
    } finally {
      setLogoUploading(false);
      if (logoFileRef.current) logoFileRef.current.value = "";
    }
  };

  const handleImport = () => {
    if (!importUrl.trim()) return;
    importMutation.mutate(
      { data: { url: importUrl.trim() } },
      {
        onSuccess: (result) => {
          setFields({
            companyName: result.companyName || fields.companyName,
            companyWebsite: result.companyWebsite || fields.companyWebsite,
            industry: result.industry || fields.industry,
            companyLogoUrl: result.companyLogoUrl ?? fields.companyLogoUrl,
            companyBlurb: result.companyBlurb || fields.companyBlurb,
          });
          toast({ title: "Company info imported from URL — review and save" });
        },
        onError: () =>
          toast({ title: "Could not fetch the URL. Try a different address.", variant: "destructive" }),
      },
    );
  };

  const isPublishedOrApproved = status === "published" || status === "approved";

  const handleSave = () => {
    if (isPublishedOrApproved) {
      updateDraftMutation.mutate(
        {
          id: draftId,
          data: { publishedAt: publishedAtLocal ? new Date(publishedAtLocal).toISOString() : null },
        },
        { onError: () => toast({ title: "Failed to update published date", variant: "destructive" }) },
      );
    }
    upsertMutation.mutate(
      {
        id: draftId,
        data: {
          companyName: fields.companyName,
          companyWebsite: fields.companyWebsite,
          industry: fields.industry,
          companyLogoUrl: fields.companyLogoUrl || null,
          companyBlurb: fields.companyBlurb,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Spotlight details saved" });
          queryClient.invalidateQueries({ queryKey: getGetDraftSpotlightQueryKey(draftId) });
        },
        onError: () =>
          toast({ title: "Failed to save spotlight details", variant: "destructive" }),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading spotlight details…
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-lg border border-border p-4">
      <div>
        <h3 className="text-sm font-semibold">Spotlight Details</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Company profile shown alongside the article body. Paste the company's URL to pre-fill these fields automatically.
        </p>
      </div>

      {/* URL Import */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Import from URL
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Globe className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder="https://company.com"
              className="pl-8 text-sm"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleImport(); } }}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleImport}
            disabled={importMutation.isPending || !importUrl.trim()}
            className="gap-1.5 shrink-0"
          >
            {importMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Import
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Fetches the page title, description, and logo to pre-fill the fields below.
        </p>
      </div>

      {/* Company Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium">Company name</label>
          <Input
            value={fields.companyName}
            onChange={(e) => setField("companyName", e.target.value)}
            placeholder="Acme Corp"
          />
        </div>
        <div>
          <label className="text-xs font-medium">Website</label>
          <Input
            value={fields.companyWebsite}
            onChange={(e) => setField("companyWebsite", e.target.value)}
            placeholder="https://…"
          />
        </div>
        <div>
          <label className="text-xs font-medium">Industry</label>
          <Input
            value={fields.industry}
            onChange={(e) => setField("industry", e.target.value)}
            placeholder="e.g. Enterprise AI"
          />
        </div>
        <div>
          <label className="text-xs font-medium">Logo</label>
          <div className="flex gap-1.5 mt-1">
            <Input
              value={fields.companyLogoUrl}
              onChange={(e) => setField("companyLogoUrl", e.target.value)}
              placeholder="https://…/logo.png or upload →"
              className="text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5 px-2.5"
              disabled={logoUploading}
              onClick={() => logoFileRef.current?.click()}
              title="Upload logo file"
            >
              {logoUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
            </Button>
            <input
              ref={logoFileRef}
              type="file"
              accept=".svg,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg"
              className="hidden"
              onChange={handleLogoUpload}
            />
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-medium">Company blurb</label>
          <Textarea
            rows={3}
            value={fields.companyBlurb}
            onChange={(e) => setField("companyBlurb", e.target.value)}
            placeholder="A short description of what the company does…"
          />
        </div>
      </div>

      {fields.companyLogoUrl && (
        <div className="flex items-center gap-3 p-3 border border-border rounded-md">
          <img
            src={fields.companyLogoUrl}
            alt="Logo preview"
            className="w-10 h-10 object-contain border border-border bg-white"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <span className="text-xs text-muted-foreground">Logo preview</span>
        </div>
      )}

      {/* Published date — only for published/approved articles */}
      {isPublishedOrApproved && (
        <div className="space-y-1 border-t border-border pt-4">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Published date
          </label>
          <input
            type="datetime-local"
            value={publishedAtLocal}
            onChange={(e) => setPublishedAtLocal(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-green-600 dark:text-green-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <p className="text-xs text-muted-foreground">
            Backdate this article to move it to the correct position in the feed. Saved with spotlight details below.
          </p>
        </div>
      )}

      <Button type="button" onClick={handleSave} disabled={upsertMutation.isPending}>
        {upsertMutation.isPending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Save className="h-4 w-4 mr-2" />
        )}
        Save spotlight details
      </Button>
    </div>
  );
}
