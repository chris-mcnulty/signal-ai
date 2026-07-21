import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  useGetSeoAudit,
  getGetSeoAuditQueryKey,
  useAutofillSeoAudit,
  useSubmitSeoUrls,
  useListSeoSubmissions,
  getListSeoSubmissionsQueryKey,
  useGetSeoCoverage,
  getGetSeoCoverageQueryKey,
  useListSeoCoverageUrls,
  getListSeoCoverageUrlsQueryKey,
  useRunSeoCoverageScan,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Globe,
  Send,
  Wand2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  ExternalLink,
  Pencil,
} from "lucide-react";

export default function Seo() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [coverageKind, setCoverageKind] = useState<string | undefined>();

  const { data: audit, isLoading: auditLoading } = useGetSeoAudit({
    query: { queryKey: getGetSeoAuditQueryKey() },
  });

  const { data: submissions } = useListSeoSubmissions({
    query: { queryKey: getListSeoSubmissionsQueryKey() },
  });

  const { data: coverage } = useGetSeoCoverage({
    query: { queryKey: getGetSeoCoverageQueryKey(), refetchInterval: 30_000 },
  });

  const { data: coverageUrls } = useListSeoCoverageUrls(
    coverageKind ? { kind: coverageKind } : undefined,
    {
      query: {
        queryKey: getListSeoCoverageUrlsQueryKey(
          coverageKind ? { kind: coverageKind } : undefined,
        ),
      },
    },
  );

  const autofill = useAutofillSeoAudit({
    mutation: {
      onSuccess: (result) => {
        toast({
          title: "Autofill complete",
          description: `${result.updated} article(s) updated, ${result.skipped} skipped.`,
        });
        queryClient.invalidateQueries({ queryKey: getGetSeoAuditQueryKey() });
      },
      onError: () =>
        toast({ title: "Autofill failed", variant: "destructive" }),
    },
  });

  const submit = useSubmitSeoUrls({
    mutation: {
      onSuccess: (bundle) => {
        const ok = bundle.results.filter((r) => r.ok).length;
        toast({
          title: "Submission finished",
          description: `${bundle.urls.length} URL(s) sent — ${ok}/${bundle.results.length} channel(s) succeeded.`,
        });
        queryClient.invalidateQueries({
          queryKey: getListSeoSubmissionsQueryKey(),
        });
      },
      onError: () =>
        toast({ title: "Submission failed", variant: "destructive" }),
    },
  });

  const scan = useRunSeoCoverageScan({
    mutation: {
      onSuccess: (result) => {
        toast({
          title: result.skipped ? "Scan already running" : "Scan complete",
          description: result.skipped
            ? "A coverage scan is already in progress."
            : `${result.urlCount} URL(s) checked (Google: ${result.googleChecked}, Bing: ${result.bingChecked}).`,
        });
        queryClient.invalidateQueries({
          queryKey: getGetSeoCoverageQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getListSeoCoverageUrlsQueryKey(
            coverageKind ? { kind: coverageKind } : undefined,
          ),
        });
      },
      onError: () => toast({ title: "Scan failed", variant: "destructive" }),
    },
  });

  const totalMissing = audit
    ? Object.values(audit.totals).reduce((acc, t) => acc + (t?.missing ?? 0), 0)
    : 0;

  // Sort findings so most critical (most missing fields) appear first
  const sortedFindings = audit
    ? [...audit.findings].sort((a, b) => b.missing.length - a.missing.length)
    : [];

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">SEO</h1>
          <p className="text-muted-foreground">
            Search-engine visibility: audits, submissions, and index coverage.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={scan.isPending || coverage?.scanRunning}
            onClick={() => scan.mutate()}
          >
            <RefreshCw
              className={`w-4 h-4 ${scan.isPending || coverage?.scanRunning ? "animate-spin" : ""}`}
            />
            {coverage?.scanRunning ? "Scan running…" : "Rescan coverage"}
          </Button>
          <Button
            size="sm"
            className="gap-2"
            disabled={submit.isPending}
            onClick={() => submit.mutate({ data: { mode: "publish" } })}
          >
            <Send className="w-4 h-4" />
            Submit all URLs
          </Button>
        </div>
      </div>

      {/* Channel status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <ChannelCard
          name="Google Index Coverage"
          configured={coverage?.googleConfigured ?? false}
          warning={coverage?.googleAuthWarning ? (coverage?.googleLastError ?? "Auth problem on last scan") : undefined}
        />
        <ChannelCard
          name="Bing Coverage Probe"
          configured={coverage?.bingConfigured ?? false}
        />
        <Card className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Search className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium">Last coverage scan</div>
            <div className="text-xs text-muted-foreground truncate">
              {coverage?.lastRun
                ? `${format(new Date(coverage.lastRun.startedAt), "MMM d, HH:mm")} — ${coverage.lastRun.urlCount} URLs`
                : "Never run"}
            </div>
          </div>
        </Card>
      </div>

      {/* Index coverage */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          Index coverage
        </h2>
        {coverage && coverage.byKind.length > 0 ? (
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="px-4 py-2.5 font-medium">Page kind</th>
                  <th className="px-4 py-2.5 font-medium">Total</th>
                  <th className="px-4 py-2.5 font-medium text-green-700 dark:text-green-400">Indexed</th>
                  <th className="px-4 py-2.5 font-medium text-orange-600 dark:text-orange-400">Discovered</th>
                  <th className="px-4 py-2.5 font-medium text-red-600 dark:text-red-400">Crawl error</th>
                  <th className="px-4 py-2.5 font-medium text-red-500 dark:text-red-400">Soft 404</th>
                  <th className="px-4 py-2.5 font-medium text-muted-foreground">Unknown</th>
                </tr>
              </thead>
              <tbody>
                {coverage.byKind.map((row) => {
                  const hasErrors = (row.crawlError ?? 0) > 0 || (row.soft404 ?? 0) > 0;
                  return (
                    <tr
                      key={row.kind}
                      className={`relative border-b border-border last:border-0 cursor-pointer transition-colors hover:bg-muted/30 ${coverageKind === row.kind ? "bg-muted/40" : ""}`}
                      onClick={() =>
                        setCoverageKind(
                          coverageKind === row.kind ? undefined : row.kind,
                        )
                      }
                    >
                      <td className="px-4 py-2.5 font-medium flex items-center gap-2">
                        {hasErrors && (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                        )}
                        {row.kind}
                      </td>
                      <td className="px-4 py-2.5">{row.total}</td>
                      <td className="px-4 py-2.5 text-green-600 font-medium">{row.indexed}</td>
                      <td className="px-4 py-2.5 text-orange-500">{row.discoveredNotIndexed}</td>
                      <td className="px-4 py-2.5">
                        <span className={row.crawlError > 0 ? "text-red-600 font-semibold" : "text-muted-foreground"}>
                          {row.crawlError}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={row.soft404 > 0 ? "text-red-500 font-semibold" : "text-muted-foreground"}>
                          {row.soft404}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{row.unknown}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyNote>
            No coverage data yet. Coverage rows appear after the first scan —
            configure Google/Bing credentials or trigger a rescan.
          </EmptyNote>
        )}

        {coverageKind && coverageUrls && coverageUrls.length > 0 && (
          <div className="mt-3 overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="px-4 py-2.5 font-medium">Path</th>
                  <th className="px-4 py-2.5 font-medium">Google</th>
                  <th className="px-4 py-2.5 font-medium">Bing</th>
                  <th className="px-4 py-2.5 font-medium">Checked</th>
                </tr>
              </thead>
              <tbody>
                {coverageUrls.map((row) => (
                  <tr key={row.url} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 font-mono text-xs">{row.path}</td>
                    <td className="px-4 py-2.5">
                      {row.googleBucket ?? row.googleCoverageState ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {row.bingBucket ?? (row.bingHttpStatus != null ? `HTTP ${row.bingHttpStatus}` : "—")}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">
                      {row.lastCheckedAt
                        ? format(new Date(row.lastCheckedAt), "MMM d, HH:mm")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Audit */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-primary" />
            Metadata audit
            {audit && (
              <Badge variant={totalMissing > 0 ? "destructive" : "secondary"} className="ml-1">
                {totalMissing > 0 ? `${totalMissing} with gaps` : "All clear"}
              </Badge>
            )}
          </h2>
          {/* Autofill is the key action — make it primary when there's work to do */}
          <Button
            variant={totalMissing > 0 ? "default" : "outline"}
            size="sm"
            className="gap-2"
            disabled={autofill.isPending || totalMissing === 0}
            onClick={() => autofill.mutate({ data: {} })}
          >
            <Wand2 className="w-4 h-4" />
            {autofill.isPending ? "Autofilling…" : "Autofill suggestions"}
          </Button>
        </div>
        {auditLoading ? (
          <Card className="p-6 h-24 animate-pulse bg-muted/50 border-0" />
        ) : sortedFindings.length > 0 ? (
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="px-4 py-2.5 font-medium">Page</th>
                  <th className="px-4 py-2.5 font-medium">Kind</th>
                  <th className="px-4 py-2.5 font-medium text-red-600 dark:text-red-400">Missing</th>
                  <th className="px-4 py-2.5 font-medium">Suggested description</th>
                  <th className="px-4 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {sortedFindings.map((f) => {
                  const isCritical = f.missing.length >= 2;
                  return (
                    <tr
                      key={`${f.kind}-${f.id}`}
                      className={`relative border-b border-border last:border-0 ${isCritical ? "bg-red-50/60 dark:bg-red-950/20" : ""}`}
                    >
                      {isCritical && (
                        <td className="absolute left-0 top-0 bottom-0 w-1 bg-red-400 rounded-l" />
                      )}
                      <td className="px-4 py-2.5 pl-5">
                        <div className="font-medium truncate max-w-[200px]">{f.title}</div>
                        <div className="font-mono text-xs text-muted-foreground">{f.path}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="secondary">{f.kind}</Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {f.missing.map((m) => (
                            <Badge key={m} variant="outline" className="text-red-600 border-red-200 dark:border-red-900 dark:text-red-400">{m}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs max-w-[240px]">
                        <span className="line-clamp-2">
                          {f.suggested.seoDescription ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 gap-1 text-xs"
                            onClick={() => navigate(`/drafts/${f.id}`)}
                            title="Edit in dashboard"
                          >
                            <Pencil className="w-3 h-3" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 gap-1 text-xs text-muted-foreground"
                            onClick={() => window.open(`https://www.bluetrail.ai${f.path}`, "_blank")}
                            title="View live page"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-sm border-2 border-dashed border-green-200 dark:border-green-900 rounded-lg px-6 py-8 text-center bg-green-50/50 dark:bg-green-950/20">
            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
            <p className="font-medium text-green-700 dark:text-green-400">All clear</p>
            <p className="text-muted-foreground mt-0.5">Every published page has an SEO title and description.</p>
          </div>
        )}
      </section>

      {/* Submissions ledger */}
      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Send className="w-4 h-4 text-primary" />
          Recent submissions
        </h2>
        {submissions && submissions.length > 0 ? (
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="px-4 py-2.5 font-medium">When</th>
                  <th className="px-4 py-2.5 font-medium">Channel</th>
                  <th className="px-4 py-2.5 font-medium">Mode</th>
                  <th className="px-4 py-2.5 font-medium">Trigger</th>
                  <th className="px-4 py-2.5 font-medium">URLs</th>
                  <th className="px-4 py-2.5 font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">
                      {format(new Date(s.createdAt), "MMM d, HH:mm")}
                    </td>
                    <td className="px-4 py-2.5">{s.target}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant={s.mode === "delete" ? "destructive" : "secondary"}>
                        {s.mode}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{s.trigger}</td>
                    <td className="px-4 py-2.5">{s.submitted}</td>
                    <td className="px-4 py-2.5">
                      {s.ok ? (
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {s.httpStatus ?? "OK"}
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-red-500"
                          title={s.error ?? undefined}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          {s.httpStatus ?? "failed"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyNote>
            No submissions yet. URLs are pushed automatically on publish and
            unpublish, or manually with "Submit all URLs".
          </EmptyNote>
        )}
      </section>
    </AppLayout>
  );
}

function ChannelCard({
  name,
  configured,
  warning,
}: {
  name: string;
  configured: boolean;
  warning?: string;
}) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div
        className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${
          warning
            ? "bg-orange-500/10 text-orange-500"
            : configured
              ? "bg-green-500/10 text-green-600"
              : "bg-muted text-muted-foreground"
        }`}
      >
        {warning ? (
          <AlertTriangle className="w-4 h-4" />
        ) : configured ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : (
          <XCircle className="w-4 h-4" />
        )}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium">{name}</div>
        <div className="text-xs text-muted-foreground truncate" title={warning}>
          {warning ?? (configured ? "Configured" : "Not configured")}
        </div>
      </div>
    </Card>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm text-muted-foreground border-2 border-dashed border-border rounded-lg px-6 py-8 text-center">
      {children}
    </div>
  );
}
