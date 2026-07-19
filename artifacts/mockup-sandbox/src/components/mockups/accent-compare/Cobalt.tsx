export function Cobalt() {
  const navy = "#0B2E59";
  const cobalt = "#0047AB";
  const silver = "#B8C2CC";
  const bg = "#FFFFFF";
  const textPrimary = navy;
  const textSecondary = "#4a5568";
  const border = silver;

  return (
    <div style={{ background: bg, color: textPrimary, fontFamily: "'Inter', sans-serif", minHeight: "100vh" }}>
      {/* Header */}
      <header style={{ borderBottom: `4px solid ${navy}`, padding: "1.25rem 2.5rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', serif", fontSize: "2.75rem", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1, color: navy }}>
          <span>bluetr</span>
          <span style={{ color: cobalt }}>AI</span>
          <span>l</span>
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.3em", color: textSecondary, fontWeight: 500 }}>
          Intelligence Report
        </div>
        <div style={{ fontFamily: "'IBM Plex Sans', 'Inter', monospace", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.12em", color: silver, marginTop: "0.2rem" }}>
          Ahead of the frontier.
        </div>
        <nav style={{ display: "flex", gap: "2rem", marginTop: "0.75rem" }}>
          {["Analysis", "Enterprise", "Research", "Policy", "About"].map(item => (
            <a key={item} style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: navy, textDecoration: "none", fontWeight: 500 }}>{item}</a>
          ))}
        </nav>
      </header>

      {/* Hero */}
      <div style={{ borderBottom: `1px solid ${silver}`, padding: "2rem 2.5rem 0" }}>
        <hr style={{ border: "none", borderTop: `3px solid ${navy}`, marginBottom: "1.25rem" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr 1px 1fr", gap: 0 }}>
          {/* Lead story */}
          <div style={{ paddingRight: "1.75rem", paddingBottom: "2rem" }}>
            <div style={{ background: cobalt, color: "#fff", fontFamily: "'Inter', sans-serif", fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "0.14em", padding: "0.2rem 0.55rem", display: "inline-block", marginBottom: "0.875rem", fontWeight: 600 }}>Analysis</div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', serif", fontSize: "2rem", fontWeight: 700, lineHeight: 1.1, marginBottom: "0.875rem", letterSpacing: "-0.01em", color: navy }}>
              Enterprise AI Adoption Reaches Inflection Point as Costs Collapse
            </h2>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", color: textSecondary, lineHeight: 1.65, marginBottom: "0.875rem" }}>
              Fortune 500 companies are deploying AI at scale across core workflows, driven by a 70% reduction in inference costs over eighteen months.
            </p>
            <div style={{ fontFamily: "'IBM Plex Sans', 'Inter', sans-serif", fontSize: "0.65rem", color: silver, letterSpacing: "0.04em" }}>BlueTrail Staff · Jul 19, 2026</div>
          </div>
          <div style={{ background: silver, width: 1 }} />
          {/* Column 2 */}
          <div style={{ padding: "0 1.75rem 2rem" }}>
            <div style={{ marginBottom: "1.5rem", paddingBottom: "1.5rem", borderBottom: `1px solid ${silver}` }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "0.12em", color: cobalt, marginBottom: "0.45rem", fontWeight: 600 }}>Research</div>
              <h3 style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', serif", fontSize: "1.15rem", fontWeight: 700, lineHeight: 1.2, marginBottom: "0.45rem", color: navy }}>Reasoning Models Hit Wall on Novel Mathematical Proofs</h3>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", color: textSecondary, lineHeight: 1.55 }}>New benchmarks reveal sharp capability ceiling for chain-of-thought systems on unseen problem classes.</p>
            </div>
            <div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "0.12em", color: cobalt, marginBottom: "0.45rem", fontWeight: 600 }}>Policy</div>
              <h3 style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', serif", fontSize: "1.15rem", fontWeight: 700, lineHeight: 1.2, marginBottom: "0.45rem", color: navy }}>EU AI Act Compliance Deadline Sparks Vendor Scramble</h3>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", color: textSecondary, lineHeight: 1.55 }}>Technology suppliers race to document training data and establish governance frameworks before August deadlines.</p>
            </div>
          </div>
          <div style={{ background: silver, width: 1 }} />
          {/* Column 3 */}
          <div style={{ paddingLeft: "1.75rem", paddingBottom: "2rem" }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.16em", fontWeight: 700, color: navy, borderBottom: `2px solid ${navy}`, paddingBottom: "0.5rem", marginBottom: "0.875rem" }}>In Brief</div>
            {[
              "OpenAI closes $6B Series E at $150B valuation amid GPT-5 launch speculation",
              "Anthropic releases Claude 4 with 1M context window and tool use improvements",
              "Microsoft Azure AI revenue tops $10B quarterly run rate for first time",
            ].map((item, i) => (
              <div key={i} style={{ borderLeft: `2px solid ${silver}`, paddingLeft: "0.875rem", marginBottom: "1rem" }}>
                <p style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', serif", fontSize: "0.95rem", fontWeight: 700, lineHeight: 1.3, color: navy }}>{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Subscribe bar */}
      <div style={{ background: navy, color: "#fff", padding: "1rem 2.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.7rem", letterSpacing: "0.06em", fontWeight: 500 }}>BlueTrail Intelligence Report — Independent intelligence for leaders navigating the path to the next frontier.</span>
        <button style={{ background: cobalt, color: "#fff", border: "none", fontFamily: "'Inter', sans-serif", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, padding: "0.5rem 1.4rem", cursor: "pointer" }}>Subscribe</button>
      </div>

      {/* Brand spec label */}
      <div style={{ padding: "0.5rem 2.5rem", background: "#f0f4f8", fontFamily: "'IBM Plex Sans', 'Inter', monospace", fontSize: "0.62rem", color: textSecondary, textAlign: "center", letterSpacing: "0.08em" }}>
        BRAND GUIDE SPEC — Navy <span style={{ color: navy, fontWeight: 700 }}>■</span> #0B2E59 · Cobalt <span style={{ color: cobalt, fontWeight: 700 }}>■</span> #0047AB · White bg · Cormorant Garamond
      </div>
    </div>
  );
}
