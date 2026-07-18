import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useGetAnalyticsOverview,
  useGetAnalyticsArticle,
} from "@workspace/api-client-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { BarChart3, Eye, FileText, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--foreground))",
  fontSize: 12,
};

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: typeof Eye;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            {label}
          </div>
          <div className="text-3xl font-semibold mt-1">{value}</div>
        </div>
        <Icon className="h-8 w-8 text-muted-foreground/40" />
      </div>
    </Card>
  );
}

function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function OverviewPanel({
  days,
  onSelectArticle,
}: {
  days: number;
  onSelectArticle: (id: number, title: string) => void;
}) {
  const { data, isLoading } = useGetAnalyticsOverview({ days });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-8">Loading…</p>;
  }
  if (!data) {
    return <p className="text-sm text-muted-foreground py-8">No data.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Total views" value={fmt(data.totals.views)} icon={Eye} />
        <StatCard label="Articles with views" value={data.totals.uniqueArticles} icon={FileText} />
      </div>

      <Card className="p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          Views over time
        </h3>
        {data.series.length === 0 ? (
          <p className="text-sm text-muted-foreground">No views recorded yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.series} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => v.slice(5)}
                stroke="hsl(var(--border))"
              />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--border))" allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(v) => `Date: ${v}`} />
              <Area
                type="monotone"
                dataKey="views"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#viewsGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          Top articles
        </h3>
        {data.topArticles.length === 0 ? (
          <p className="text-sm text-muted-foreground">No views recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left py-2 font-medium">Article</th>
                <th className="text-right py-2 font-medium pr-3">Period</th>
                <th className="text-right py-2 font-medium">All time</th>
              </tr>
            </thead>
            <tbody>
              {data.topArticles.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-border/50 last:border-0 hover:bg-muted/40 cursor-pointer transition-colors"
                  onClick={() => onSelectArticle(a.id, a.title)}
                >
                  <td className="py-2.5 pr-3 font-medium leading-snug line-clamp-1">
                    {a.title}
                  </td>
                  <td className="py-2.5 text-right pr-3 tabular-nums">{fmt(a.views)}</td>
                  <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                    {fmt(a.allTimeViews)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function ArticlePanel({ articleId, title, days, onBack }: { articleId: number; title: string; days: number; onBack: () => void }) {
  const { data, isLoading } = useGetAnalyticsArticle(articleId, { days });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" /> Overview
        </Button>
        <span className="text-sm font-semibold truncate">{title}</span>
      </div>

      {isLoading || !data ? (
        <p className="text-sm text-muted-foreground py-8">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label={`Views (${days}d)`} value={fmt(data.totals.views)} icon={Eye} />
            <StatCard label="All-time views" value={fmt(data.totals.viewsAllTime)} icon={BarChart3} />
          </div>

          <Card className="p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
              Daily views
            </h3>
            {data.series.length === 0 ? (
              <p className="text-sm text-muted-foreground">No views in this period.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data.series} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="articleGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} stroke="hsl(var(--border))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--border))" allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(v) => `Date: ${v}`} />
                  <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#articleGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>

          {data.referrers.length > 0 && (
            <Card className="p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
                Top referrers
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border">
                    <th className="text-left py-2 font-medium">Source</th>
                    <th className="text-right py-2 font-medium">Views</th>
                  </tr>
                </thead>
                <tbody>
                  {data.referrers.map((r) => (
                    <tr key={r.host} className="border-b border-border/50 last:border-0">
                      <td className="py-2.5 font-mono text-xs">{r.host}</td>
                      <td className="py-2.5 text-right tabular-nums">{fmt(r.views)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export default function Analytics() {
  const [days, setDays] = useState(30);
  const [selectedArticle, setSelectedArticle] = useState<{ id: number; title: string } | null>(null);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-muted-foreground" />
            <h1 className="text-xl font-semibold">Analytics</h1>
          </div>
          <Select value={String(days)} onValueChange={(v) => { setDays(Number(v)); setSelectedArticle(null); }}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last 365 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedArticle ? (
          <ArticlePanel
            articleId={selectedArticle.id}
            title={selectedArticle.title}
            days={days}
            onBack={() => setSelectedArticle(null)}
          />
        ) : (
          <OverviewPanel
            days={days}
            onSelectArticle={(id, title) => setSelectedArticle({ id, title })}
          />
        )}
      </div>
    </AppLayout>
  );
}
