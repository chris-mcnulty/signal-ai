export function Cobalt() {
  const accent = "#2563eb";
  const bg = "#f7f5f2";
  const textPrimary = "#1a1a1a";
  const textSecondary = "#4a4a4a";
  const border = "#d1cdc7";

  return (
    <div style={{ background: bg, color: textPrimary, fontFamily: "'Inter', sans-serif", minHeight: "100vh" }}>
      {/* Header */}
      <header style={{ borderBottom: `4px solid ${textPrimary}`, padding: "1rem 2rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.5rem", fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1 }}>
          <span>bluetr</span>
          <span style={{ color: accent }}>AI</span>
          <span>l</span>
        </div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.25em", color: textSecondary }}>
          Intelligence Report
        </div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.12em", color: textSecondary, marginTop: "0.15rem" }}>
          Blazing the AI trail ahead of the frontier
        </div>
        <nav style={{ display: "flex", gap: "2rem", marginTop: "0.75rem" }}>
          {["Analysis", "Enterprise", "Research", "Policy", "About"].map(item => (
            <a key={item} style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: textPrimary, textDecoration: "none" }}>{item}</a>
          ))}
        </nav>
      </header>

      {/* Hero */}
      <div style={{ borderBottom: `1px solid ${border}`, padding: "1.5rem 2rem 0" }}>
        <hr style={{ border: "none", borderTop: `3px solid ${textPrimary}`, marginBottom: "1rem" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr 1px 1fr", gap: 0 }}>
          {/* Lead story */}
          <div style={{ paddingRight: "1.5rem", paddingBottom: "1.5rem" }}>
            <div style={{ background: accent, color: "#fff", fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.12em", padding: "0.2rem 0.5rem", display: "inline-block", marginBottom: "0.75rem" }}>Analysis</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", fontWeight: 900, lineHeight: 1.15, marginBottom: "0.75rem", letterSpacing: "-0.01em" }}>
              Enterprise AI Adoption Reaches Inflection Point as Costs Collapse
            </h2>
            <p style={{ fontSize: "0.875rem", color: textSecondary, lineHeight: 1.6, marginBottom: "0.75rem" }}>
              Fortune 500 companies are deploying AI at scale across core workflows, driven by a 70% reduction in inference costs over eighteen months.
            </p>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", color: textSecondary }}>BlueTrail Staff · Jul 19, 2026</div>
          </div>
          <div style={{ background: border, width: 1 }} />
          {/* Column 2 */}
          <div style={{ padding: "0 1.5rem 1.5rem" }}>
            <div style={{ marginBottom: "1.25rem", paddingBottom: "1.25rem", borderBottom: `1px solid ${border}` }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.1em", color: accent, marginBottom: "0.4rem" }}>Research</div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 800, lineHeight: 1.25, marginBottom: "0.4rem" }}>Reasoning Models Hit Wall on Novel Mathematical Proofs</h3>
              <p style={{ fontSize: "0.8rem", color: textSecondary, lineHeight: 1.5 }}>New benchmarks reveal sharp capability ceiling for chain-of-thought systems on unseen problem classes.</p>
            </div>
            <div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.1em", color: accent, marginBottom: "0.4rem" }}>Policy</div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 800, lineHeight: 1.25, marginBottom: "0.4rem" }}>EU AI Act Compliance Deadline Sparks Vendor Scramble</h3>
              <p style={{ fontSize: "0.8rem", color: textSecondary, lineHeight: 1.5 }}>Technology suppliers race to document training data and establish governance frameworks before August deadlines.</p>
            </div>
          </div>
          <div style={{ background: border, width: 1 }} />
          {/* Column 3 */}
          <div style={{ paddingLeft: "1.5rem", paddingBottom: "1.5rem" }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700, color: textPrimary, borderBottom: `2px solid ${textPrimary}`, paddingBottom: "0.5rem", marginBottom: "0.75rem" }}>In Brief</div>
            {[
              "OpenAI closes $6B Series E at $150B valuation amid GPT-5 launch speculation",
              "Anthropic releases Claude 4 with 1M context window and tool use improvements",
              "Microsoft Azure AI revenue tops $10B quarterly run rate for first time",
            ].map((item, i) => (
              <div key={i} style={{ borderLeft: `2px solid ${border}`, paddingLeft: "0.75rem", marginBottom: "0.85rem" }}>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.875rem", fontWeight: 700, lineHeight: 1.35, color: textPrimary }}>{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Subscribe bar */}
      <div style={{ background: textPrimary, color: bg, padding: "0.875rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.7rem", letterSpacing: "0.08em" }}>The BlueTrail Intelligence Report — delivered weekly</span>
        <button style={{ background: accent, color: "#fff", border: "none", fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, padding: "0.45rem 1.25rem", cursor: "pointer" }}>Subscribe</button>
      </div>

      {/* Label */}
      <div style={{ padding: "0.5rem 2rem", background: "#ede9e3", fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", color: textSecondary, textAlign: "center", letterSpacing: "0.1em" }}>
        OPTION — Cobalt accent <span style={{ color: accent }}>■</span> #2563eb
      </div>
    </div>
  );
}
