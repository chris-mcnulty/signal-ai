import { useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { 
  useListDrafts, 
  getListDraftsQueryKey, 
  useGetDraftsSummary,
  getGetDraftsSummaryQueryKey
} from "@workspace/api-client-react";
import { ArticleStatus } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { DraftStatusBadge } from "@/components/DraftStatusBadge";
import { Input } from "@/components/ui/input";
import { Search, Clock, Calendar, CheckCircle2, XCircle, LayoutGrid, List as ListIcon, Bot, User } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card } from "@/components/ui/card";

type TabValue = "all" | ArticleStatus;

export default function Queue() {
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: summary } = useGetDraftsSummary({
    query: {
      queryKey: getGetDraftsSummaryQueryKey()
    }
  });

  const { data: drafts, isLoading } = useListDrafts(
    activeTab !== "all" ? { status: activeTab } : undefined,
    {
      query: {
        queryKey: getListDraftsQueryKey(activeTab !== "all" ? { status: activeTab } : undefined)
      }
    }
  );

  const filteredDrafts = drafts?.filter(draft => 
    draft.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    draft.category.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Editorial Queue</h1>
          <p className="text-muted-foreground">Manage and review articles before publishing.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Search drafts..." 
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <StatusTab 
          label="All" 
          value="all" 
          count={summary?.total} 
          active={activeTab === "all"} 
          onClick={() => setActiveTab("all")} 
        />
        <StatusTab 
          label="Pending" 
          value="pending" 
          count={summary?.pending} 
          icon={<Clock className="w-4 h-4 text-orange-500" />}
          active={activeTab === "pending"} 
          onClick={() => setActiveTab("pending")} 
        />
        <StatusTab 
          label="Approved" 
          value="approved" 
          count={summary?.approved} 
          icon={<CheckCircle2 className="w-4 h-4 text-blue-500" />}
          active={activeTab === "approved"} 
          onClick={() => setActiveTab("approved")} 
        />
        <StatusTab 
          label="Published" 
          value="published" 
          count={summary?.published} 
          icon={<CheckCircle2 className="w-4 h-4 text-green-500" />}
          active={activeTab === "published"} 
          onClick={() => setActiveTab("published")} 
        />
        <StatusTab 
          label="Rejected" 
          value="rejected" 
          count={summary?.rejected} 
          icon={<XCircle className="w-4 h-4 text-red-500" />}
          active={activeTab === "rejected"} 
          onClick={() => setActiveTab("rejected")} 
        />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-6 h-32 animate-pulse bg-muted/50 border-0" />
          ))}
        </div>
      ) : filteredDrafts.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-border rounded-xl">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <LayoutGrid className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">No drafts found</h3>
          <p className="text-muted-foreground">
            {searchQuery ? "Try a different search term." : "The queue is currently empty."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDrafts.map((draft, i) => (
            <Link key={draft.id} href={`/drafts/${draft.id}`}>
              <Card className="group relative overflow-hidden transition-all hover:shadow-md hover:border-primary/50 cursor-pointer p-0 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}>
                <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  
                  {draft.imageUrl && (
                    <div className="w-full sm:w-24 h-16 bg-muted rounded-md overflow-hidden shrink-0 hidden sm:block">
                      <img src={draft.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <DraftStatusBadge status={draft.status} />
                      <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {draft.category}
                      </span>
                      {draft.source === "api" ? (
                         <span className="text-xs text-muted-foreground flex items-center gap-1" title="Received from API"><Bot className="w-3 h-3"/> API</span>
                      ) : (
                         <span className="text-xs text-muted-foreground flex items-center gap-1" title="Written manually"><User className="w-3 h-3"/> Manual</span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold tracking-tight truncate group-hover:text-primary transition-colors">
                      {draft.title}
                    </h3>
                    {draft.excerpt && (
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                        {draft.excerpt}
                      </p>
                    )}
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end gap-3 text-sm text-muted-foreground shrink-0 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-border">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {format(new Date(draft.updatedAt), "MMM d, h:mm a")}
                    </div>
                    {draft.scheduledFor && draft.status === "approved" && (
                      <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        Sched: {format(new Date(draft.scheduledFor), "MMM d, h:mm a")}
                      </div>
                    )}
                    {draft.status === "rejected" && draft.rejectionReason && (
                      <div className="text-red-600 dark:text-red-400 text-xs max-w-[150px] truncate" title={draft.rejectionReason}>
                        "{draft.rejectionReason}"
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Side accent line based on status */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                  draft.status === 'pending' ? 'bg-orange-400' :
                  draft.status === 'approved' ? 'bg-blue-400' :
                  draft.status === 'published' ? 'bg-green-400' :
                  'bg-red-400'
                }`} />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppLayout>
  );
}

function StatusTab({ 
  label, 
  value, 
  count, 
  icon,
  active, 
  onClick 
}: { 
  label: string; 
  value: string; 
  count?: number; 
  icon?: React.ReactNode;
  active: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
        active 
          ? "bg-foreground text-background shadow-md" 
          : "bg-background border border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
      }`}
    >
      {icon}
      {label}
      {count !== undefined && (
        <span className={`px-1.5 py-0.5 rounded-full text-xs ${active ? "bg-background/20" : "bg-muted"}`}>
          {count}
        </span>
      )}
    </button>
  );
}
