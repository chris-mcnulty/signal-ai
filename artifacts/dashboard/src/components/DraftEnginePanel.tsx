import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListSocialVariants,
  getListSocialVariantsQueryKey,
  useRepurposeDraft,
  exportSocialVariantsCsv,
  useSeoOptimizeDraft,
  SocialVariantPlatform,
  type SeoOptimization,
} from "@workspace/api-client-react";
import {
  Share2,
  Search,
  Loader2,
  Download,
  Copy,
  Check,
} from "lucide-react";

const PLATFORM_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  twitter: "X / Twitter",
  instagram: "Instagram",
  facebook: "Facebook",
};

export function DraftEnginePanel({
  draftId,
  onApplySeo,
}: {
  draftId: number;
  onApplySeo?: (proposal: SeoOptimization) => void;
}) {
  return (
    <div className="bg-muted/30 border border-border rounded-xl p-5 space-y-6">
      <SocialVariantsSection draftId={draftId} />
      <SeoSection draftId={draftId} onApplySeo={onApplySeo} />
    </div>
  );
}

function SocialVariantsSection({ draftId }: { draftId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [platforms, setPlatforms] = useState<SocialVariantPlatform[]>(["linkedin", "twitter"]);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const { data: variants, isLoading } = useListSocialVariants(draftId, {
    query: { queryKey: getListSocialVariantsQueryKey(draftId) },
  });

  const repurpose = useRepurposeDraft({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSocialVariantsQueryKey(draftId) });
        toast({ title: "Social variants generated" });
      },
      onError: () =>
        toast({ title: "Failed to generate variants", variant: "destructive" }),
    },
  });

  const togglePlatform = (p: SocialVariantPlatform) =>
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );

  const handleCopy = async (id: number, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleExport = async () => {
    try {
      const csv = await exportSocialVariantsCsv(draftId);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `social-variants-${draftId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Share2 className="w-3.5 h-3.5" /> Social variants
        </h3>
        {variants && variants.length > 0 && (
          <Button variant="ghost" size="sm" className="gap-1 h-7" onClick={handleExport}>
            <Download className="w-3.5 h-3.5" /> CSV
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-3">
        {(Object.keys(PLATFORM_LABELS) as SocialVariantPlatform[]).map((p) => (
          <label key={p} className="flex items-center gap-1.5 text-sm cursor-pointer">
            <Checkbox checked={platforms.includes(p)} onCheckedChange={() => togglePlatform(p)} />
            {PLATFORM_LABELS[p]}
          </label>
        ))}
      </div>

      <Button
        size="sm"
        variant="outline"
        className="w-full gap-2"
        disabled={platforms.length === 0 || repurpose.isPending}
        onClick={() => repurpose.mutate({ id: draftId, data: { platforms, perPlatform: 1 } })}
      >
        {repurpose.isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Generating...
          </>
        ) : variants && variants.length > 0 ? (
          "Regenerate variants"
        ) : (
          "Generate social posts"
        )}
      </Button>

      {isLoading ? (
        <div className="h-16 animate-pulse bg-muted rounded-md mt-3" />
      ) : variants && variants.length > 0 ? (
        <div className="space-y-2 mt-3">
          {variants.map((v) => (
            <div key={v.id} className="border border-border rounded-lg p-3 bg-background">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">
                  {PLATFORM_LABELS[v.platform] ?? v.platform}
                  {v.angle ? ` · ${v.angle}` : ""} · {v.charCount} chars
                </span>
                <button
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => handleCopy(v.id, v.content)}
                  title="Copy"
                >
                  {copiedId === v.id ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-sm whitespace-pre-wrap">{v.content}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SeoSection({
  draftId,
  onApplySeo,
}: {
  draftId: number;
  onApplySeo?: (proposal: SeoOptimization) => void;
}) {
  const { toast } = useToast();
  const [proposal, setProposal] = useState<SeoOptimization | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const optimize = useSeoOptimizeDraft({
    mutation: {
      onSuccess: (result) => {
        setProposal(result);
        setIsOpen(true);
      },
      onError: () =>
        toast({ title: "SEO analysis failed", variant: "destructive" }),
    },
  });

  return (
    <div className="pt-4 border-t border-border">
      <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
        <Search className="w-3.5 h-3.5" /> SEO / AEO
      </h3>
      <Button
        size="sm"
        variant="outline"
        className="w-full gap-2"
        disabled={optimize.isPending}
        onClick={() => optimize.mutate({ id: draftId })}
      >
        {optimize.isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Analyzing...
          </>
        ) : (
          "Analyze & propose SEO"
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>SEO optimization proposal</DialogTitle>
            <DialogDescription>
              Review the suggestions below. Nothing is applied automatically.
            </DialogDescription>
          </DialogHeader>
          {proposal && (
            <div className="space-y-4 text-sm">
              {proposal.seoTitle && (
                <ProposalRow label="SEO title" value={proposal.seoTitle} />
              )}
              {proposal.metaDescription && (
                <ProposalRow label="Meta description" value={proposal.metaDescription} />
              )}
              {proposal.slug && <ProposalRow label="Slug" value={proposal.slug} />}
              {proposal.targetKeyword && (
                <ProposalRow label="Target keyword" value={proposal.targetKeyword} />
              )}
              {proposal.keywords.length > 0 && (
                <ProposalRow label="Keywords" value={proposal.keywords.join(", ")} />
              )}
              {proposal.faq.length > 0 && (
                <div>
                  <p className="font-medium mb-1">FAQ (for AEO)</p>
                  <div className="space-y-2">
                    {proposal.faq.map((qa, i) => (
                      <div key={i} className="border border-border rounded-md p-2">
                        <p className="font-medium">{qa.question}</p>
                        <p className="text-muted-foreground">{qa.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {proposal.internalLinks.length > 0 && (
                <div>
                  <p className="font-medium mb-1">Internal link suggestions</p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    {proposal.internalLinks.map((link, i) => (
                      <li key={i}>
                        Link "{link.anchorText}" → <span className="font-mono">/{link.targetSlug}</span>
                        {link.reason ? ` — ${link.reason}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {proposal.contentGaps.length > 0 && (
                <div>
                  <p className="font-medium mb-1">Content gaps</p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    {proposal.contentGaps.map((gap, i) => (
                      <li key={i}>{gap}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Close
            </Button>
            {onApplySeo && proposal && (
              <Button
                onClick={() => {
                  onApplySeo(proposal);
                  setIsOpen(false);
                  toast({
                    title: "Suggestions applied to editor",
                    description: "Review and save the draft to keep them.",
                  });
                }}
              >
                Apply title to editor
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProposalRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">{value}</p>
    </div>
  );
}
