import {
  db,
  articlesTable,
  caseStudiesTable,
  articleRelationsTable,
} from "@workspace/db";
import type { InsertArticle } from "@workspace/db";

type SeedCaseStudy = {
  article: Omit<InsertArticle, "category">;
  company: {
    companyName: string;
    companyWebsite: string;
    industry: string;
    companySize: string;
    headquarters: string;
    companySummary: string;
    metrics: { label: string; value: string; context: string }[];
    quotes: { quote: string; attribution: string; role: string }[];
  };
};

const caseStudies: SeedCaseStudy[] = [
  {
    article: {
      slug: "meridian-health-llm-claims-triage",
      title: "How Meridian Health Cut Claims Processing Time 63% With LLM Triage",
      dek: "The regional insurer replaced a rules engine built in 2011 with a fine-tuned language model that reads, classifies, and routes incoming claims — without adding headcount.",
      body: `When Meridian Health's claims backlog hit 40,000 in January 2025, the problem wasn't staffing. It was routing. Every claim, from a routine prescription refill to a disputed surgical bill, entered the same queue and waited for a human to decide where it should go.

## The problem: a rules engine past its limits

Meridian's legacy triage system relied on roughly 1,900 hand-written rules accumulated over more than a decade. Claims that matched no rule — about 31% of volume — fell into a manual review queue with a nine-day average wait.

## What they built

The team fine-tuned an open-weight language model on 1.2 million historically adjudicated claims, then deployed it as a triage layer in front of the existing adjudication workflow. The model does not approve or deny anything; it classifies, extracts key fields, and routes. Every routing decision includes a confidence score, and anything below the threshold still goes to a human.

## The rollout

Meridian ran the model in shadow mode for eleven weeks, comparing its routing decisions against human ones before letting it act. Disagreements were reviewed weekly by a joint team of adjusters and engineers, which surfaced eleven categories of claims where the training data itself was inconsistent.

## Results after six months

Median claim routing time fell from 9 days to 4 hours for previously unmatched claims. Overall processing time dropped 63%. The manual review queue shrank by 71%, and adjuster time shifted toward genuinely ambiguous, high-value cases.

## What they'd do differently

The team's main regret: not involving the adjusters sooner. The shadow-mode disagreement reviews that began as a validation step became the most valuable part of the project — and could have started on day one.`,
      readingMinutes: 8,
      publishedAt: new Date("2026-05-14T09:00:00Z"),
    },
    company: {
      companyName: "Meridian Health",
      companyWebsite: "https://www.meridianhealth.example.com",
      industry: "Health insurance",
      companySize: "4,200 employees",
      headquarters: "Columbus, Ohio",
      companySummary:
        "Meridian Health is a regional health insurer serving 2.1 million members across five Midwestern states, processing roughly 18 million claims per year.",
      metrics: [
        {
          label: "Faster processing",
          value: "63%",
          context: "Reduction in end-to-end claims processing time",
        },
        {
          label: "Routing time",
          value: "9d → 4h",
          context: "Median routing time for previously unmatched claims",
        },
        {
          label: "Manual queue",
          value: "-71%",
          context: "Shrinkage of the manual review backlog in six months",
        },
      ],
      quotes: [
        {
          quote:
            "We didn't ask the model to adjudicate anything. We asked it to do the one job our rules engine was failing at — figuring out where a claim should go — and to tell us when it wasn't sure.",
          attribution: "Priya Raman",
          role: "VP of Claims Operations",
        },
        {
          quote:
            "Shadow mode saved us. Eleven weeks of watching the model disagree with our own people taught us more about our data than the previous five years.",
          attribution: "Marcus Bell",
          role: "Director of Engineering",
        },
      ],
    },
  },
  {
    article: {
      slug: "vantage-logistics-dispatch-copilot",
      title: "Inside Vantage Logistics' Dispatch Copilot: 22% Fewer Empty Miles",
      dek: "The freight brokerage gave its 340 dispatchers an AI copilot that suggests load pairings in real time — and learned that adoption, not accuracy, was the hard part.",
      body: `Vantage Logistics moves 6,000 truckloads a week, and until last year, every load-to-truck pairing was made by a dispatcher working from spreadsheets, phone calls, and instinct. The result: trucks drove empty on 34% of their miles.

## The problem: good dispatchers don't scale

Vantage's best dispatchers kept mental maps of hundreds of carriers — who runs which lanes, who deadheads home on Fridays, who will take a cheap backhaul to Cincinnati. That knowledge left the building every time a senior dispatcher did.

## What they built

The copilot combines a conventional optimization engine with a language-model layer that explains each suggested pairing in plain English — why this truck, why this rate, what the downside is. Dispatchers accept, modify, or reject each suggestion, and every rejection is logged with a reason.

## The adoption problem

Three months in, acceptance rates sat at 19%. Interviews revealed the issue: the tool's early suggestions ignored soft constraints dispatchers knew by heart — driver preferences, dock quirks, carriers who won't haul certain freight. Engineering added a feedback loop that folds rejection reasons back into the ranking model weekly.

## Results after a year

Acceptance climbed to 64%. Empty miles fell 22% fleet-wide, worth roughly $11 million annually at current fuel prices. New dispatchers reach full productivity in five weeks instead of fourteen.

## What they'd do differently

Vantage now treats the rejection log as its most valuable dataset. The team says they would have designed for disagreement from the start rather than treating rejections as failures.`,
      readingMinutes: 7,
      publishedAt: new Date("2026-06-02T09:00:00Z"),
    },
    company: {
      companyName: "Vantage Logistics",
      companyWebsite: "https://www.vantagelogistics.example.com",
      industry: "Freight & logistics",
      companySize: "1,800 employees",
      headquarters: "Memphis, Tennessee",
      companySummary:
        "Vantage Logistics is a freight brokerage and 3PL coordinating roughly 6,000 truckloads per week across North America through a network of 14,000 carriers.",
      metrics: [
        {
          label: "Empty miles",
          value: "-22%",
          context: "Fleet-wide reduction in deadhead miles after one year",
        },
        {
          label: "Annual savings",
          value: "$11M",
          context: "Estimated yearly value of reduced empty mileage",
        },
        {
          label: "Ramp time",
          value: "14w → 5w",
          context: "Time for a new dispatcher to reach full productivity",
        },
      ],
      quotes: [
        {
          quote:
            "The model was right more often than our people from week one. That turned out to be almost irrelevant. The tool only started working when it learned to explain itself.",
          attribution: "Elena Vasquez",
          role: "Chief Operating Officer",
        },
      ],
    },
  },
  {
    article: {
      slug: "fernbrook-financial-kyc-automation",
      title: "How Fernbrook Financial Automated 78% of KYC Reviews Without a Single Regulatory Finding",
      dek: "The mid-market bank used document-understanding models to clear a compliance bottleneck — and built the audit trail first, before automating anything.",
      body: `Know-your-customer reviews were costing Fernbrook Financial 41 minutes of analyst time per case, and volume was growing 30% a year. The compliance team's answer was unusual: before automating any decisions, they spent five months building the system that would explain them.

## The problem: a bottleneck with regulatory teeth

Every new business account at Fernbrook triggered a KYC review: verifying formation documents, matching beneficial owners against sanctions lists, and assembling an evidence file. Analysts spent most of that time not deciding, but collecting.

## What they built — audit trail first

Fernbrook's engineering team built the evidence-assembly pipeline before any classification model. Document-understanding models extract entities from formation documents, registries are queried automatically, and every extracted fact links back to its source with a confidence score. Only after regulators-grade record keeping was in place did the team add a model that recommends clear/escalate decisions.

## The threshold decision

The bank set its automation threshold deliberately conservatively: the model only clears cases where every extracted fact exceeds 95% confidence and no watchlist entry scores above near-zero similarity. Everything else goes to an analyst — with the evidence file already assembled.

## Results after nine months

78% of routine reviews now clear automatically. Average analyst handling time on escalated cases fell from 41 to 12 minutes, because evidence collection is already done. Two regulatory examinations since launch produced zero findings related to the automated process.

## What they'd do differently

The team estimates the audit-trail-first approach added four months to the timeline — and considers it the reason the project survived its first examination. Their advice: in regulated industries, build the explanation machinery before the decision machinery.`,
      readingMinutes: 9,
      publishedAt: new Date("2026-06-24T09:00:00Z"),
    },
    company: {
      companyName: "Fernbrook Financial",
      companyWebsite: "https://www.fernbrookfinancial.example.com",
      industry: "Banking & financial services",
      companySize: "2,600 employees",
      headquarters: "Charlotte, North Carolina",
      companySummary:
        "Fernbrook Financial is a mid-market commercial bank with $38 billion in assets, serving business banking customers across the Southeastern United States.",
      metrics: [
        {
          label: "Automated clears",
          value: "78%",
          context: "Share of routine KYC reviews cleared without analyst touch",
        },
        {
          label: "Handling time",
          value: "41m → 12m",
          context: "Average analyst time per escalated case",
        },
        {
          label: "Regulatory findings",
          value: "0",
          context: "Findings across two examinations since launch",
        },
      ],
      quotes: [
        {
          quote:
            "Most teams automate the decision and bolt on an audit trail. We inverted that, and it's the only reason this system survived its first examination.",
          attribution: "James Liu",
          role: "Chief Compliance Officer",
        },
      ],
    },
  },
];

const supportingArticles: InsertArticle[] = [
  {
    slug: "enterprise-llm-deployments-stalling",
    title: "The $40M Illusion: Why Enterprise LLM Deployments Are Stalling",
    dek: "Fortune 500 companies poured billions into generative AI pilots this year. Now, as latency issues mount and the bills come due, the stark reality of productionizing language models is forcing a quiet retreat.",
    body: `Enterprise AI spending hit record highs in 2025, but conversion from pilot to production remains stubbornly low. Interviews with two dozen technology executives point to three recurring failure modes: unclear ownership, missing evaluation infrastructure, and costs that scale faster than value.

## The pattern behind the stalls

The projects that survive share a trait: they automate a bottleneck the business already measured, rather than searching for a use case to justify the technology.`,
    category: "opinion",
    readingMinutes: 8,
    publishedAt: new Date("2026-04-20T09:00:00Z"),
  },
  {
    slug: "shadow-mode-deployment-playbook",
    title: "The Shadow-Mode Playbook: How Careful Teams Ship AI Into Production",
    dek: "Running a model silently alongside humans before letting it act has become the de facto standard for high-stakes AI deployments. Here's how the best teams structure it.",
    body: `Shadow-mode deployment — running a model in parallel with human decision-makers without letting it act — has quietly become the standard playbook for AI in regulated and high-stakes settings.

## Why it works

Shadow mode converts deployment risk into training signal. Every disagreement between model and human is either a model error worth fixing or an inconsistency in the organization's own historical practice worth knowing about.`,
    category: "use-cases",
    readingMinutes: 6,
    publishedAt: new Date("2026-05-28T09:00:00Z"),
  },
  {
    slug: "regulators-warm-to-explainable-automation",
    title: "Regulators Are Warming to AI Automation — If You Can Show Your Work",
    dek: "Recent examination outcomes suggest financial regulators are less hostile to AI-driven compliance than banks feared. The dividing line is documentation.",
    body: `A pattern is emerging from recent regulatory examinations of banks using AI in compliance workflows: examiners are not objecting to automation itself. They are objecting to automation that cannot explain itself.

## The documentation dividing line

Institutions that maintain fact-level provenance — every automated conclusion linked to its source evidence — are clearing examinations. Those that log only final decisions are not.`,
    category: "news",
    readingMinutes: 5,
    publishedAt: new Date("2026-06-30T09:00:00Z"),
  },
];

async function main(): Promise<void> {
  const existing = await db.select({ id: articlesTable.id }).from(articlesTable).limit(1);
  if (existing.length > 0) {
    console.log("Articles already seeded, skipping.");
    return;
  }

  const idBySlug = new Map<string, number>();

  for (const seed of caseStudies) {
    const [article] = await db
      .insert(articlesTable)
      .values({ ...seed.article, category: "case-study", status: "published" })
      .returning();
    if (!article) throw new Error("Insert failed");
    idBySlug.set(article.slug, article.id);
    await db.insert(caseStudiesTable).values({
      articleId: article.id,
      ...seed.company,
    });
  }

  for (const articleSeed of supportingArticles) {
    const [article] = await db
      .insert(articlesTable)
      .values({ ...articleSeed, status: "published" })
      .returning();
    if (!article) throw new Error("Insert failed");
    idBySlug.set(article.slug, article.id);
  }

  const relations: [string, string][] = [
    // Case studies cross-link each other
    ["meridian-health-llm-claims-triage", "vantage-logistics-dispatch-copilot"],
    ["meridian-health-llm-claims-triage", "fernbrook-financial-kyc-automation"],
    ["vantage-logistics-dispatch-copilot", "meridian-health-llm-claims-triage"],
    ["vantage-logistics-dispatch-copilot", "fernbrook-financial-kyc-automation"],
    ["fernbrook-financial-kyc-automation", "meridian-health-llm-claims-triage"],
    ["fernbrook-financial-kyc-automation", "vantage-logistics-dispatch-copilot"],
    // Related editorial articles link to case studies (cross-linking source)
    ["shadow-mode-deployment-playbook", "meridian-health-llm-claims-triage"],
    ["regulators-warm-to-explainable-automation", "fernbrook-financial-kyc-automation"],
    ["enterprise-llm-deployments-stalling", "vantage-logistics-dispatch-copilot"],
    // And case studies reference the editorial pieces
    ["meridian-health-llm-claims-triage", "shadow-mode-deployment-playbook"],
    ["fernbrook-financial-kyc-automation", "regulators-warm-to-explainable-automation"],
  ];

  for (const [fromSlug, toSlug] of relations) {
    const fromId = idBySlug.get(fromSlug);
    const toId = idBySlug.get(toSlug);
    if (!fromId || !toId) throw new Error(`Unknown slug in relation: ${fromSlug} -> ${toSlug}`);
    await db
      .insert(articleRelationsTable)
      .values({ articleId: fromId, relatedArticleId: toId });
  }

  console.log(
    `Seeded ${caseStudies.length} case studies, ${supportingArticles.length} articles, ${relations.length} relations.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
