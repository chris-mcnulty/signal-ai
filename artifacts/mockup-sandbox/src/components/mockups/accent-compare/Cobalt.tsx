export function Cobalt() {
  const navy = "#0B2E59";
  const cobalt = "#0047AB";
  const silver = "#B8C2CC";
  const bg = "#FFFFFF";
  const textSecondary = "#4a5568";

  return (
    <div style={{ background: bg, color: navy, fontFamily: "'Inter', sans-serif", minHeight: "100vh" }}>

      {/* Top nav bar */}
      <div style={{ background: navy, padding: "0.5rem 2.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "0.16em", color: silver, fontWeight: 500 }}>BlueTrail Intelligence</span>
        <div style={{ display: "flex", gap: "1.5rem" }}>
          {["Analysis", "Enterprise", "Research", "Policy"].map(item => (
            <a key={item} style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "0.1em", color: silver, textDecoration: "none" }}>{item}</a>
          ))}
        </div>
      </div>

      {/* Hero — full-bleed image with masthead overlay */}
      <div style={{
        position: "relative",
        backgroundImage: "url(/__mockup/images/hero-trail.jpeg)",
        backgroundSize: "cover",
        backgroundPosition: "center 30%",
        minHeight: "340px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}>
        {/* Gradient overlay — dark navy at bottom for text legibility */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(11,46,89,0.15) 0%, rgba(11,46,89,0.55) 55%, rgba(11,46,89,0.92) 100%)"
        }} />

        {/* Masthead centered in hero */}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -60%)", textAlign: "center" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', serif", fontSize: "3.5rem", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1, color: "#fff", textShadow: "0 2px 12px rgba(11,46,89,0.5)" }}>
            <span>bluetr</span>
            <span style={{ color: "#5ba3ff" }}>AI</span>
            <span>l</span>
          </div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.32em", color: "rgba(255,255,255,0.75)", marginTop: "0.3rem", fontWeight: 500 }}>
            Intelligence Report
          </div>
        </div>

        {/* Bottom: tagline + issue date */}
        <div style={{ position: "relative", zIndex: 1, padding: "1.5rem 2.5rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <p style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', serif", fontSize: "1.1rem", fontStyle: "italic", color: "rgba(255,255,255,0.9)", margin: 0, letterSpacing: "0.01em" }}>
              Ahead of the frontier.
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.12em", color: silver }}>July 19, 2026 · Vol. I</span>
          </div>
        </div>
      </div>

      {/* Section rule */}
      <div style={{ borderTop: `3px solid ${navy}`, borderBottom: `1px solid ${silver}`, padding: "0.5rem 2.5rem", display: "flex", gap: "2rem", background: bg }}>
        {["Lead Analysis", "Research", "Policy", "Enterprise", "In Brief"].map((s, i) => (
          <span key={s} style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "0.12em", color: i === 0 ? cobalt : navy, fontWeight: i === 0 ? 700 : 500, cursor: "pointer" }}>{s}</span>
        ))}
      </div>

      {/* Story grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr 1px 1fr", padding: "0 2.5rem" }}>
        {/* Lead */}
        <div style={{ paddingRight: "1.75rem", paddingTop: "1.75rem", paddingBottom: "1.75rem" }}>
          <div style={{ background: cobalt, color: "#fff", fontFamily: "'Inter', sans-serif", fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "0.14em", padding: "0.2rem 0.55rem", display: "inline-block", marginBottom: "0.875rem", fontWeight: 600 }}>Analysis</div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', serif", fontSize: "1.85rem", fontWeight: 700, lineHeight: 1.1, marginBottom: "0.875rem", color: navy }}>
            Enterprise AI Adoption Reaches Inflection Point as Costs Collapse
          </h2>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", color: textSecondary, lineHeight: 1.65, marginBottom: "0.875rem" }}>
            Fortune 500 companies are deploying AI at scale across core workflows, driven by a 70% reduction in inference costs over eighteen months.
          </p>
          <div style={{ fontFamily: "'IBM Plex Sans', 'Inter', sans-serif", fontSize: "0.62rem", color: silver, letterSpacing: "0.04em" }}>BlueTrail Staff · Jul 19, 2026</div>
        </div>

        <div style={{ background: silver, width: 1 }} />

        {/* Mid column */}
        <div style={{ padding: "1.75rem" }}>
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

        {/* Brief */}
        <div style={{ paddingLeft: "1.75rem", paddingTop: "1.75rem", paddingBottom: "1.75rem" }}>
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

      {/* Subscribe bar */}
      <div style={{ background: navy, color: "#fff", padding: "1rem 2.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `3px solid ${cobalt}` }}>
        <div>
          <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', 'Playfair Display', serif", fontSize: "1rem", fontStyle: "italic", color: "rgba(255,255,255,0.9)" }}>Independent intelligence for leaders navigating the path to the next frontier.</p>
          <p style={{ margin: "0.2rem 0 0", fontFamily: "'Inter', sans-serif", fontSize: "0.6rem", letterSpacing: "0.08em", color: silver }}>bluetrAIl Intelligence Report · Weekly</p>
        </div>
        <button style={{ background: cobalt, color: "#fff", border: "none", fontFamily: "'Inter', sans-serif", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, padding: "0.6rem 1.6rem", cursor: "pointer" }}>Subscribe</button>
      </div>
    </div>
  );
}
