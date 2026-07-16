import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Shield, ShieldOff, UserX, UserCheck, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Redirect } from "wouter";

const API_BASE = "/api";

interface EditorRow {
  id: number;
  email: string;
  isActive: boolean;
  isAdmin: boolean;
  invitedAt: string;
  activatedAt: string | null;
}

const PERMANENT_ADMINS = ["chris.mcnulty@synozur.com", "admin@synozur.com"];

function isPermanentAdmin(email: string) {
  return PERMANENT_ADMINS.includes(email.toLowerCase());
}

export default function Team() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const sessionKey = sessionStorage.getItem("dashboard_api_key");

  const [editors, setEditors] = useState<EditorRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const [pendingToggle, setPendingToggle] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${sessionKey}`, "Content-Type": "application/json" };

  const fetchEditors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/editors`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setEditors(await res.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isAdmin) fetchEditors();
  }, [isAdmin, fetchEditors]);

  if (!isAdmin) {
    return <Redirect to="/queue" />;
  }

  const handleToggle = async (email: string, field: "isActive" | "isAdmin", value: boolean) => {
    setPendingToggle(`${email}:${field}`);
    try {
      const res = await fetch(`${API_BASE}/admin/editors/${encodeURIComponent(email)}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const updated: EditorRow = await res.json();
      setEditors((prev) => prev?.map((e) => (e.email === email ? { ...e, ...updated } : e)) ?? null);
      toast({ title: field === "isActive" ? (value ? "Editor reactivated" : "Editor deactivated") : (value ? "Promoted to admin" : "Admin access removed") });
    } catch (e) {
      toast({ title: String(e), variant: "destructive" });
    } finally {
      setPendingToggle(null);
    }
  };

  const handleRemove = async (email: string) => {
    setRemoving(email);
    setConfirmRemove(null);
    try {
      const res = await fetch(`${API_BASE}/admin/editors/${encodeURIComponent(email)}`, {
        method: "DELETE",
        headers,
      });
      if (res.status === 204) {
        setEditors((prev) => prev?.filter((e) => e.email !== email) ?? null);
        toast({ title: "Editor removed" });
      } else {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      }
    } catch (e) {
      toast({ title: String(e), variant: "destructive" });
    } finally {
      setRemoving(null);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch(`${API_BASE}/admin/editors`, {
        method: "POST",
        headers,
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const created: EditorRow = await res.json();
      setEditors((prev) => prev ? [...prev, created] : [created]);
      toast({ title: `${created.email} added to the team` });
      setInviteEmail("");
      setShowInvite(false);
    } catch (e) {
      toast({ title: String(e), variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Team</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage editors and admin access. Invited editors can sign in via Microsoft SSO immediately.
            </p>
          </div>
          <Button onClick={() => setShowInvite(true)} className="gap-2 shrink-0">
            <UserPlus className="w-4 h-4" />
            Invite editor
          </Button>
        </div>

        {/* Invite modal */}
        {showInvite && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="bg-background border border-border rounded-xl shadow-lg w-full max-w-sm mx-4 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Invite editor</h2>
                <button
                  onClick={() => { setShowInvite(false); setInviteEmail(""); }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground">
                Enter the editor's work email. They can sign in with Microsoft SSO straight away — no separate invite email is sent.
              </p>
              <form onSubmit={handleInvite} className="space-y-3">
                <Input
                  type="email"
                  placeholder="editor@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setShowInvite(false); setInviteEmail(""); }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={inviting || !inviteEmail.trim()} className="gap-2">
                    {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    Add editor
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Editors table */}
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 bg-muted/40 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Editors</h2>
            {editors && <span className="text-xs text-muted-foreground">{editors.length} member{editors.length !== 1 ? "s" : ""}</span>}
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-12 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading…
            </div>
          )}

          {error && (
            <div className="px-5 py-4 text-destructive text-sm">{error}</div>
          )}

          {editors && editors.length === 0 && (
            <div className="px-5 py-12 text-center text-muted-foreground text-sm">
              No editors yet.
            </div>
          )}

          {editors && editors.length > 0 && (
            <div className="divide-y divide-border">
              {editors.map((editor) => {
                const permanent = isPermanentAdmin(editor.email);
                const isActiveToggling = pendingToggle === `${editor.email}:isActive`;
                const isAdminToggling = pendingToggle === `${editor.email}:isAdmin`;

                return (
                  <div key={editor.email} className="px-5 py-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">{editor.email}</span>
                        {editor.isAdmin && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                            <Shield className="w-3 h-3" />
                            Admin
                          </span>
                        )}
                        {permanent && (
                          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                            Permanent
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Added {new Date(editor.invitedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {" · "}
                        <span className={editor.isActive ? "text-emerald-600" : "text-muted-foreground"}>
                          {editor.isActive ? "Active" : "Inactive"}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Toggle admin */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs h-8"
                        disabled={isAdminToggling || permanent}
                        title={permanent ? "Permanent admin — cannot be changed" : (editor.isAdmin ? "Remove admin access" : "Promote to admin")}
                        onClick={() => handleToggle(editor.email, "isAdmin", !editor.isAdmin)}
                      >
                        {isAdminToggling ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : editor.isAdmin ? (
                          <ShieldOff className="w-3.5 h-3.5" />
                        ) : (
                          <Shield className="w-3.5 h-3.5" />
                        )}
                        {editor.isAdmin ? "Demote" : "Make admin"}
                      </Button>

                      {/* Toggle active */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs h-8"
                        disabled={isActiveToggling || permanent}
                        title={permanent ? "Permanent admin — cannot be deactivated" : (editor.isActive ? "Revoke access" : "Restore access")}
                        onClick={() => handleToggle(editor.email, "isActive", !editor.isActive)}
                      >
                        {isActiveToggling ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : editor.isActive ? (
                          <UserX className="w-3.5 h-3.5" />
                        ) : (
                          <UserCheck className="w-3.5 h-3.5" />
                        )}
                        {editor.isActive ? "Revoke" : "Restore"}
                      </Button>

                      {/* Remove */}
                      {!permanent && (
                        confirmRemove === editor.email ? (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8 px-2 text-xs"
                              disabled={removing === editor.email}
                              onClick={() => handleRemove(editor.email)}
                            >
                              {removing === editor.email ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirm remove"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 text-xs"
                              onClick={() => setConfirmRemove(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Remove editor"
                            onClick={() => setConfirmRemove(editor.email)}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
