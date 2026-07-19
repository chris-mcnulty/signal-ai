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
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { BarChart3, Eye, FileText, ArrowLeft, Globe, Bot, Monitor } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const BRAND_NAVY = "#0B2E59";
const BRAND_COBALT = "#0047AB";
const BRAND_SILVER = "#B8C2CC";

const DEVICE_COLORS: Record<string, string> = {
  desktop: BRAND_NAVY,
  mobile: BRAND_COBALT,
  tablet: BRAND_SILVER,
  unknown: "#e5e7eb",
};

const CHART_PALETTE = [
  BRAND_NAVY,
  BRAND_COBALT,
  "#1E6BC5",
  "#4A90D9",
  BRAND_SILVER,
  "#8BA3B8",
  "#5A7A96",
  "#D1DCE8",
];

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
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
      {children}
    </h3>
  );
}

function BreakdownTable({
  rows,
  total,
}: {
  rows: { label: string; views: number }[];
  total: number;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-muted-foreground border-b border-border">
          <th className="text-left py-2 font-medium">Name</th>
          <th className="text-right py-2 font-medium pr-3">Views</th>
          <th className="text-right py-2 font-medium w-14">%</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className="border-b border-border/50 last:border-0">
            <td className="py-2 pr-3 capitalize">{r.label}</td>
            <td className="py-2 text-right pr-3 tabular-nums">{fmt(r.views)}</td>
            <td className="py-2 text-right tabular-nums text-muted-foreground text-xs">
              {total > 0 ? `${Math.round((r.views / total) * 100)}%` : "—"}
            </td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={3} className="py-4 text-center text-muted-foreground text-xs">
              No data yet
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function DevicePie({ rows }: { rows: { label: string; views: number }[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">No data yet</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={rows}
          dataKey="views"
          nameKey="label"
          cx="50%"
          cy="50%"
          outerRadius={70}
          innerRadius={36}
          paddingAngle={2}
          label={({ label, percent }) =>
            percent > 0.04 ? `${Math.round(percent * 100)}%` : ""
          }
          labelLine={false}
        >
          {rows.map((r, i) => (
            <Cell
              key={r.label}
              fill={DEVICE_COLORS[r.label.toLowerCase()] ?? CHART_PALETTE[i % CHART_PALETTE.length]}
            />
          ))}
        </Pie>
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span className="capitalize text-xs">{value}</span>
          )}
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [fmt(v), "views"]} />
      </PieChart>
    </ResponsiveContainer>
  );
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

  const humanViews = data.totals.views;
  const botTotal = data.botTraffic.reduce((s, b) => s + b.views, 0);
  const deviceTotal = data.deviceBreakdown.reduce((s, d) => s + d.views, 0);
  const browserTotal = data.browserBreakdown.reduce((s, b) => s + b.views, 0);
  const osTotal = data.osBreakdown.reduce((s, o) => s + o.views, 0);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Total views" value={fmt(humanViews)} icon={Eye} />
        <StatCard label="Articles reached" value={data.totals.uniqueArticles} icon={FileText} />
      </div>

      {/* Views over time */}
      <Card className="p-5">
        <SectionTitle>Views over time</SectionTitle>
        {data.series.length === 0 ? (
          <p className="text-sm text-muted-foreground">No views recorded yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.series} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BRAND_COBALT} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={BRAND_COBALT} stopOpacity={0} />
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
                stroke={BRAND_COBALT}
                strokeWidth={2}
                fill="url(#viewsGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Top articles + Top referrers side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="p-5">
          <SectionTitle>Top articles</SectionTitle>
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
                    <td className="py-2.5 pr-3 font-medium leading-snug line-clamp-1">{a.title}</td>
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

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-3.5 h-3.5 text-muted-foreground" />
            <SectionTitle>Traffic sources</SectionTitle>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left py-2 font-medium">Referrer</th>
                <th className="text-right py-2 font-medium">Views</th>
              </tr>
            </thead>
            <tbody>
              {data.referrers.map((r) => (
                <tr key={r.host} className="border-b border-border/50 last:border-0">
                  <td className="py-2.5 font-mono text-xs pr-3">{r.host}</td>
                  <td className="py-2.5 text-right tabular-nums">{fmt(r.views)}</td>
                </tr>
              ))}
              {data.referrers.length === 0 && (
                <tr>
                  <td colSpan={2} className="py-4 text-center text-muted-foreground text-xs">
                    No referrer data yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Device distribution + Browser breakdown */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
            <SectionTitle>Device distribution</SectionTitle>
          </div>
          <DevicePie rows={data.deviceBreakdown} />
        </Card>

        <Card className="p-5">
          <SectionTitle>Browsers & OS</SectionTitle>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-2">
                Browser
              </p>
              <BreakdownTable rows={data.browserBreakdown} total={browserTotal} />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-2">
                Operating system
              </p>
              <BreakdownTable rows={data.osBreakdown} total={osTotal} />
            </div>
          </div>
        </Card>
      </div>

      {/* AI & search crawlers */}
      {(data.botTraffic.length > 0 || botTotal === 0) && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bot className="w-3.5 h-3.5 text-muted-foreground" />
              <SectionTitle>AI &amp; search crawlers</SectionTitle>
            </div>
            {botTotal > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {fmt(botTotal)} total crawler views
              </span>
            )}
          </div>
          {data.botTraffic.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bot traffic recorded in this period.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left py-2 font-medium">Bot</th>
                  <th className="text-left py-2 font-medium">Kind</th>
                  <th className="text-right py-2 font-medium">Views</th>
                  <th className="text-right py-2 font-medium w-14">%</th>
                </tr>
              </thead>
              <tbody>
                {data.botTraffic.map((b) => (
                  <tr key={`${b.name}:${b.kind}`} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 pr-3 font-mono text-xs font-medium">{b.name}</td>
                    <td className="py-2.5 pr-3">
                      <span
                        className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide ${
                          b.kind === "ai"
                            ? "bg-blue-100 text-blue-700"
                            : b.kind === "search"
                              ? "bg-green-100 text-green-700"
                              : b.kind === "social"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {b.kind}
                      </span>
                    </td>
                    <td className="py-2.5 text-right tabular-nums">{fmt(b.views)}</td>
                    <td className="py-2.5 text-right tabular-nums text-muted-foreground text-xs">
                      {botTotal > 0 ? `${Math.round((b.views / botTotal) * 100)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  );
}

function ArticlePanel({
  articleId,
  title,
  days,
  onBack,
}: {
  articleId: number;
  title: string;
  days: number;
  onBack: () => void;
}) {
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
            <SectionTitle>Daily views</SectionTitle>
            {data.series.length === 0 ? (
              <p className="text-sm text-muted-foreground">No views in this period.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data.series} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="articleGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={BRAND_COBALT} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={BRAND_COBALT} stopOpacity={0} />
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
                    stroke={BRAND_COBALT}
                    strokeWidth={2}
                    fill="url(#articleGrad)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>

          {data.referrers.length > 0 && (
            <Card className="p-5">
              <SectionTitle>Top referrers</SectionTitle>
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
  const [selectedArticle, setSelectedArticle] = useState<{ id: number; title: string } | null>(
    null,
  );

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-muted-foreground" />
            <h1 className="text-xl font-semibold">Analytics</h1>
          </div>
          <Select
            value={String(days)}
            onValueChange={(v) => {
              setDays(Number(v));
              setSelectedArticle(null);
            }}
          >
            <SelectTrigger className="w-36 h-8 text-xs">
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
