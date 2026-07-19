import { useState } from "react";
import { X, Rss, Mail, Check, ExternalLink } from "lucide-react";
const API_BASE = `${import.meta.env.BASE_URL}api`;

type Stage = "idle" | "submitting" | "success" | "error" | "already";

export function SubscribeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [rssCopied, setRssCopied] = useState(false);

  const rssUrl = "https://www.bluetrail.ai/rss.xml";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStage("submitting");
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json() as { ok?: boolean; alreadySubscribed?: boolean; resubscribed?: boolean; error?: string };
      if (!res.ok) {
        setStage("error");
        setErrorMsg(data.error ?? "Something went wrong. Please try again.");
      } else if (data.alreadySubscribed) {
        setStage("already");
      } else {
        setStage("success");
      }
    } catch {
      setStage("error");
      setErrorMsg("Network error — please check your connection and try again.");
    }
  }

  async function copyRss() {
    try {
      await navigator.clipboard.writeText(rssUrl);
      setRssCopied(true);
      setTimeout(() => setRssCopied(false), 2000);
    } catch {
      window.prompt("Copy this RSS URL:", rssUrl);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(11,46,89,0.72)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full sm:max-w-md bg-white"
        style={{ borderRadius: "2px 2px 0 0", boxShadow: "0 -4px 40px rgba(0,0,0,0.25)" }}
      >
        {/* Header */}
        <div style={{ background: "#0B2E59", padding: "28px 32px 20px" }}>
          <button
            onClick={onClose}
            style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)", padding: 4 }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.6rem", fontWeight: 700, color: "#fff", lineHeight: 1, letterSpacing: "-0.02em" }}>
            bluetr<span style={{ color: "#B8C2CC" }}>AI</span>l
          </div>
          <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "0.6rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginTop: 3 }}>
            Intelligence Report
          </div>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", color: "rgba(255,255,255,0.75)", marginTop: 12, fontStyle: "italic", lineHeight: 1.5 }}>
            Ahead of the frontier.
          </p>
        </div>

        <div style={{ padding: "24px 32px 32px" }}>
          {/* Email section */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Mail size={15} color="#0047AB" />
              <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 600, color: "#0B2E59" }}>
                Email Newsletter
              </span>
            </div>

            {stage === "success" && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: "#f0faf4", border: "1px solid #b7e4c7", borderRadius: 2 }}>
                <Check size={16} color="#2d6a4f" />
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.85rem", color: "#2d6a4f" }}>You're subscribed. Welcome aboard.</span>
              </div>
            )}

            {stage === "already" && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 2 }}>
                <Check size={16} color="#0047AB" />
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.85rem", color: "#0047AB" }}>You're already subscribed.</span>
              </div>
            )}

            {(stage === "idle" || stage === "submitting" || stage === "error") && (
              <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  disabled={stage === "submitting"}
                  style={{
                    flex: 1,
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.875rem",
                    padding: "10px 14px",
                    border: stage === "error" ? "1px solid #ef4444" : "1px solid #d1d5db",
                    borderRadius: 2,
                    outline: "none",
                    background: stage === "submitting" ? "#f9fafb" : "#fff",
                    color: "#111",
                  }}
                />
                <button
                  type="submit"
                  disabled={stage === "submitting"}
                  style={{
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    padding: "10px 18px",
                    background: stage === "submitting" ? "#6b7280" : "#0047AB",
                    color: "#fff",
                    border: "none",
                    borderRadius: 2,
                    cursor: stage === "submitting" ? "not-allowed" : "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {stage === "submitting" ? "…" : "Subscribe"}
                </button>
              </form>
            )}

            {stage === "error" && (
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.78rem", color: "#ef4444", marginTop: 6 }}>{errorMsg}</p>
            )}

            {(stage === "idle" || stage === "submitting" || stage === "error") && (
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.72rem", color: "#9ca3af", lineHeight: 1.55, marginTop: 10 }}>
                By subscribing, you agree to receive emails from BlueTrail Intelligence, including newsletters, research, events, podcasts, and related communications from BlueTrail and its affiliated organizations. Your information will not be sold or shared with third parties for marketing purposes. You may unsubscribe at any time.{" "}
                <a href="/privacy" style={{ color: "#6b7280", textDecoration: "underline" }}>View our Privacy Statement.</a>
              </p>
            )}
          </div>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
            <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "#9ca3af" }}>or follow via RSS</span>
            <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
          </div>

          {/* RSS section */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Rss size={15} color="#f26522" />
              <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 600, color: "#0B2E59" }}>
                RSS Feed
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button
                onClick={copyRss}
                style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: "0.72rem",
                  fontWeight: 500,
                  padding: "8px 14px",
                  border: "1px solid #d1d5db",
                  borderRadius: 2,
                  background: rssCopied ? "#f0faf4" : "#f9fafb",
                  color: rssCopied ? "#2d6a4f" : "#374151",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {rssCopied ? <Check size={13} /> : <Rss size={13} />}
                {rssCopied ? "Copied!" : "Copy RSS link"}
              </button>
              <a
                href={`https://feedly.com/i/subscription/feed/${encodeURIComponent(rssUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: "0.72rem",
                  fontWeight: 500,
                  padding: "8px 14px",
                  border: "1px solid #d1d5db",
                  borderRadius: 2,
                  background: "#f9fafb",
                  color: "#374151",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  textDecoration: "none",
                }}
              >
                <ExternalLink size={13} />
                Add to Feedly
              </a>
              <a
                href={`https://www.inoreader.com/?add_feed=${encodeURIComponent(rssUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: "0.72rem",
                  fontWeight: 500,
                  padding: "8px 14px",
                  border: "1px solid #d1d5db",
                  borderRadius: 2,
                  background: "#f9fafb",
                  color: "#374151",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  textDecoration: "none",
                }}
              >
                <ExternalLink size={13} />
                Add to Inoreader
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
