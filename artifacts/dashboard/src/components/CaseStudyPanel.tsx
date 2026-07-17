import { useEffect, useState } from "react";
import {
  useGetDraftCaseStudy,
  getGetDraftCaseStudyQueryKey,
  useUpsertDraftCaseStudy,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";

type Metric = { label: string; value: string; context: string };
type Quote = { quote: string; attribution: string; role: string };

type CompanyFields = {
  companyName: string;
  companyWebsite: string;
  industry: string;
  companySize: string;
  headquarters: string;
  companySummary: string;
};

const emptyCompany: CompanyFields = {
  companyName: "",
  companyWebsite: "",
  industry: "",
  companySize: "",
  headquarters: "",
  companySummary: "",
};

export function CaseStudyPanel({ draftId }: { draftId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useGetDraftCaseStudy(draftId, {
    query: { queryKey: getGetDraftCaseStudyQueryKey(draftId) },
  });
  const upsertMutation = useUpsertDraftCaseStudy();

  const [company, setCompany] = useState<CompanyFields>(emptyCompany);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loadedFor, setLoadedFor] = useState<number | null>(null);

  useEffect(() => {
    if (data && loadedFor !== draftId) {
      setLoadedFor(draftId);
      setCompany({
        companyName: data.companyName,
        companyWebsite: data.companyWebsite,
        industry: data.industry,
        companySize: data.companySize,
        headquarters: data.headquarters,
        companySummary: data.companySummary,
      });
      setMetrics(data.metrics);
      setQuotes(data.quotes);
    }
  }, [data, draftId, loadedFor]);

  const setCompanyField = (key: keyof CompanyFields, value: string) =>
    setCompany((c) => ({ ...c, [key]: value }));

  const updateMetric = (i: number, key: keyof Metric, value: string) =>
    setMetrics((list) => list.map((m, idx) => (idx === i ? { ...m, [key]: value } : m)));

  const updateQuote = (i: number, key: keyof Quote, value: string) =>
    setQuotes((list) => list.map((q, idx) => (idx === i ? { ...q, [key]: value } : q)));

  const handleSave = () => {
    upsertMutation.mutate(
      {
        id: draftId,
        data: {
          ...company,
          metrics: metrics.filter((m) => m.label.trim() || m.value.trim()),
          quotes: quotes.filter((q) => q.quote.trim()),
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Case study details saved" });
          queryClient.invalidateQueries({ queryKey: getGetDraftCaseStudyQueryKey(draftId) });
        },
        onError: () =>
          toast({ title: "Failed to save case study details", variant: "destructive" }),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading case study details…
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-lg border border-border p-4">
      <div>
        <h3 className="text-sm font-semibold">Case Study Details</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Company profile, proof points, and quotes shown on the public case-study page. A case
          study only appears in the Case Studies section once these details are saved.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium">Company name</label>
          <Input value={company.companyName} onChange={(e) => setCompanyField("companyName", e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium">Website</label>
          <Input value={company.companyWebsite} onChange={(e) => setCompanyField("companyWebsite", e.target.value)} placeholder="https://…" />
        </div>
        <div>
          <label className="text-xs font-medium">Industry</label>
          <Input value={company.industry} onChange={(e) => setCompanyField("industry", e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium">Company size</label>
          <Input value={company.companySize} onChange={(e) => setCompanyField("companySize", e.target.value)} placeholder="e.g. 10,000+ employees" />
        </div>
        <div>
          <label className="text-xs font-medium">Headquarters</label>
          <Input value={company.headquarters} onChange={(e) => setCompanyField("headquarters", e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-medium">Company summary</label>
          <Textarea rows={3} value={company.companySummary} onChange={(e) => setCompanyField("companySummary", e.target.value)} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Proof points</h4>
          <Button type="button" variant="outline" size="sm" onClick={() => setMetrics((m) => [...m, { label: "", value: "", context: "" }])}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add proof point
          </Button>
        </div>
        {metrics.length === 0 && (
          <p className="text-xs text-muted-foreground">No proof points yet.</p>
        )}
        {metrics.map((m, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_2fr_auto] gap-2 items-start">
            <Input placeholder="Value (e.g. $1M+)" value={m.value} onChange={(e) => updateMetric(i, "value", e.target.value)} />
            <Input placeholder="Label (e.g. EBITDA uplift)" value={m.label} onChange={(e) => updateMetric(i, "label", e.target.value)} />
            <Input placeholder="Context (one sentence)" value={m.context} onChange={(e) => updateMetric(i, "context", e.target.value)} />
            <Button type="button" variant="ghost" size="icon" onClick={() => setMetrics((list) => list.filter((_, idx) => idx !== i))} aria-label="Remove proof point">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quotes</h4>
          <Button type="button" variant="outline" size="sm" onClick={() => setQuotes((q) => [...q, { quote: "", attribution: "", role: "" }])}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add quote
          </Button>
        </div>
        {quotes.length === 0 && <p className="text-xs text-muted-foreground">No quotes yet.</p>}
        {quotes.map((q, i) => (
          <div key={i} className="space-y-2 rounded-md border border-border p-3">
            <Textarea rows={2} placeholder="Quote text" value={q.quote} onChange={(e) => updateQuote(i, "quote", e.target.value)} />
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
              <Input placeholder="Attribution (name)" value={q.attribution} onChange={(e) => updateQuote(i, "attribution", e.target.value)} />
              <Input placeholder="Role / title" value={q.role} onChange={(e) => updateQuote(i, "role", e.target.value)} />
              <Button type="button" variant="ghost" size="icon" onClick={() => setQuotes((list) => list.filter((_, idx) => idx !== i))} aria-label="Remove quote">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" onClick={handleSave} disabled={upsertMutation.isPending}>
        {upsertMutation.isPending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Save className="h-4 w-4 mr-2" />
        )}
        Save case study details
      </Button>
    </div>
  );
}
