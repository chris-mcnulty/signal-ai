import { db, articlesTable } from "@workspace/db";
import type { InsertArticle } from "@workspace/db";

const IMG = "/case-studies/static/news";

// All stories below are grounded in real, publicly reported events from
// January-July 2026, verified against vendor announcements and press coverage
// at the time of writing.
const newsArticles: InsertArticle[] = [
  // ── Microsoft 365 Copilot ────────────────────────────────────────────────
  {
    slug: "m365-copilot-agent-mode-excel-desktop",
    title:
      "Agent Mode Lands in Excel on the Desktop, and Copilot Starts Doing the Work Itself",
    dek: "Microsoft's January Copilot release moved Agent mode from the web into desktop Excel — the clearest signal yet that Copilot is shifting from answering questions to actively editing files.",
    body: `Microsoft's January update to Microsoft 365 Copilot rolled out Agent mode in Excel to desktop and Mac users with a Copilot license, extending a capability that had previously been limited to the web.

## What changed

Agent mode is a different interaction model from the chat sidebar most users know. Instead of answering questions about a spreadsheet, Copilot works alongside the user — making changes to the file directly and reasoning through those changes step by step as it goes. Microsoft rolled out the same treatment for Word in November and brought PowerPoint into the fold in February.

## Why it matters

The distinction sounds subtle but isn't. A chat assistant that explains how to build a pivot table saves a user minutes; an agent that builds the workbook itself changes who is doing the work. February's follow-up release extended Agent mode in the web versions of Word, Excel, and PowerPoint to Copilot Chat users without a paid Copilot license — putting agentic document editing in front of a dramatically larger audience.

## The fine print

Admins still control availability, and Microsoft's release notes are candid that Agent mode's output quality depends heavily on how much structure the underlying document already has. Early enterprise feedback suggests the feature performs best on well-formed financial models and struggles with the messy, hand-built spreadsheets that dominate real workplaces — which is precisely the gap Microsoft will need to close.`,
    category: "news",
    sourceUrls: [
      "https://techcommunity.microsoft.com/blog/microsoft365copilotblog/what%E2%80%99s-new-in-microsoft-365-copilot--january-2026/4488916",
      "https://techcommunity.microsoft.com/blog/microsoft365copilotblog/what%e2%80%99s-new-in-microsoft-365-copilot--february-2026/4496489",
    ],
    heroImageUrl: `${IMG}/m365-copilot-agent-mode-excel.png`,
    readingMinutes: 4,
    publishedAt: new Date("2026-01-29T09:00:00Z"),
  },
  {
    slug: "microsoft-365-copilot-wave-3-agents",
    title:
      "Copilot Wave 3: Microsoft Embeds Agents Into Every Office App — With Anthropic Inside",
    dek: "Wave 3 puts full document-building agents into Word, Excel, and PowerPoint and introduces Cowork for long-running tasks. The quiet headline: some of it runs on Anthropic's Claude, not OpenAI's models.",
    body: `Microsoft introduced Wave 3 of Microsoft 365 Copilot in March, embedding agentic capabilities directly into Word, Excel, PowerPoint, Outlook, and Copilot Chat — and confirming that its new long-running Cowork experience draws on Anthropic's Claude models alongside OpenAI's.

## Three agents that build entire documents

The release introduced dedicated PowerPoint, Excel, and Word agents capable of producing complete decks, spreadsheets, and documents from a conversation. Notably, Microsoft made the agents available to Microsoft 365 users with or without a paid Copilot license, provided an admin enables them — licensed users get priority access and work grounding, unlicensed users get standard access with web grounding.

## The multi-model moment

For years, Microsoft 365 Copilot was synonymous with OpenAI models. Wave 3 formalized a multi-model architecture: Microsoft said Cowork's long-running, multi-step work is powered in part by Anthropic's Claude, with the system routing tasks to whichever model fits best. For enterprise buyers, that reframes the Copilot purchase — you are no longer betting on a single lab's roadmap.

## What to watch

April's follow-up added a Planner agent, eight new third-party connectors, and the "Hey Copilot" wake word on Windows. The direction of travel is unambiguous: Microsoft is converting Copilot from a feature into a workforce, and pricing it accordingly.`,
    category: "news",
    sourceUrls: [
      "https://techcommunity.microsoft.com/blog/microsoft365copilotblog/what%E2%80%99s-new-in-microsoft-365-copilot--march-2026/4506322",
      "https://learn.microsoft.com/en-us/microsoft-365/copilot/release-notes",
    ],
    heroImageUrl: `${IMG}/m365-copilot-wave-3.png`,
    readingMinutes: 5,
    publishedAt: new Date("2026-03-19T09:00:00Z"),
  },
  {
    slug: "hey-copilot-wake-word-planner-agent",
    title:
      "\u201CHey Copilot\u201D Arrives on Windows as Microsoft Pushes Voice Into the Workday",
    dek: "April's Copilot release added a wake word, a redesigned mobile app, and video recaps of meetings — small features that add up to a bigger bet: that talking to your office suite becomes normal.",
    body: `Microsoft's April update to Microsoft 365 Copilot introduced a wake word — say "Hey Copilot" and the Windows app opens a real-time voice conversation — alongside a chat-first mobile redesign and a new Planner agent.

## Voice, but with compliance settings

The wake word activates only when called and respects organizational compliance policies, a detail Microsoft emphasized heavily. The company is threading a needle: consumer assistants normalized always-listening devices at home, but enterprises have spent a decade writing policies that assume nobody is recording the office.

## Meetings get a video recap

The subtler April feature may prove the stickier one. When users ask Copilot Chat to summarize a meeting, they now receive a narrated video recap alongside the written summary. For employees drowning in recorded meetings they never watch, a two-minute generated recap is a genuinely different product than a wall of bullet points.

## The Planner agent

April also brought a Planner agent and eight new third-party Copilot connectors, continuing the Wave 3 pattern of converting each Office surface into something that can be delegated to rather than merely operated. Adoption data will lag the announcements, as it always does — but the surface area Microsoft is giving these agents is expanding monthly.`,
    category: "news",
    sourceUrls: [
      "https://techcommunity.microsoft.com/blog/microsoft365copilotblog/what%E2%80%99s-new-in-microsoft-365-copilot--april-2026/4510935",
      "https://supersimple365.com/whats-new-in-microsoft-365-and-copilot-april-2026/",
    ],
    heroImageUrl: `${IMG}/hey-copilot-voice.png`,
    readingMinutes: 4,
    publishedAt: new Date("2026-04-23T09:00:00Z"),
  },
  {
    slug: "copilot-cowork-general-availability-build-2026",
    title:
      "Copilot Cowork Goes GA at Build 2026 — and Microsoft Starts Charging by the Task",
    dek: "Cowork executes multi-step work end-to-end in the cloud and returns a finished deliverable. The pricing model — a cent per Copilot Credit, metered by model, context, tools, and runtime — may matter more than the feature.",
    body: `At Build 2026 in June, Microsoft made Copilot Cowork generally available worldwide — an agentic system that plans, executes, and delivers completed work rather than drafts — and unveiled Microsoft Scout, its first "Autopilot" agent, in preview.

## What Cowork actually does

Where Copilot Chat answers questions, Cowork takes a defined task and executes it start to finish across multiple apps, running in a secure cloud-hosted environment that keeps working even when the user's laptop is off. It ships with 13 built-in skills spanning Word, Excel, PowerPoint, PDF, email, scheduling, meetings, and enterprise search, and is grounded in a company's own systems through what Microsoft calls Work IQ.

## The pricing story

Cowork is off by default; an admin enables it, decides who gets it, and sets spending limits at the tenant, group, and user level. Billing is consumption-based at $0.01 per Copilot Credit, with each task's cost derived from four inputs: the model used, the context pulled in, the tools called, and how long the task runs. This is the clearest example yet of AI software abandoning per-seat pricing for per-work pricing — a shift with real consequences for how IT budgets are built.

## Multi-model by design

Cowork selects models per task: OpenAI's GPT-5.5 Thinking for deep research with citations, Anthropic models for visual work like PowerPoint. New plugins announced at GA include Harvey, Miro, monday.com, Moody's, Morningstar, and S&P Global.

## The bigger picture

Between Cowork's GA and Scout's preview, Build 2026 marked the moment Microsoft stopped positioning agents as an experiment. The question enterprises now face is not whether to pilot agentic AI, but how to govern spend on software that bills like a contractor.`,
    category: "news",
    sourceUrls: [
      "https://techcommunity.microsoft.com/blog/microsoft365copilotblog/what%E2%80%99s-new-in-microsoft-365-copilot--june-2026/4529572",
      "https://espc.tech/learning-hub/blog/microsoft-build-2026-announcements/",
      "https://www.aguidetocloud.com/blog/microsoft-365-copilot-june-2026-updates/",
    ],
    heroImageUrl: `${IMG}/copilot-cowork-ga.png`,
    readingMinutes: 6,
    publishedAt: new Date("2026-06-18T09:00:00Z"),
  },

  // ── Anthropic ────────────────────────────────────────────────────────────
  {
    slug: "anthropic-claude-cowork-govuk-january",
    title:
      "Anthropic's January Sprint: Claude Cowork Preview, a GOV.UK Assistant, and a Healthcare Push",
    dek: "In a single month, Anthropic shipped a file-system agent for professionals, won a UK government pilot, launched HIPAA-ready healthcare tools, and stood up a consumer product lab under Mike Krieger.",
    body: `Anthropic opened 2026 at a pace that set the tone for its year: by the end of January the company had launched Claude Cowork in research preview, been selected to build an AI assistant for GOV.UK, released Claude for Healthcare, and spun up an experimental product arm.

## Claude Cowork: an agent with a file system

Cowork gives Claude access to a sandboxed shell and user-selected local folders — reading, writing, and editing files, executing code, and chaining multi-step tasks in a single conversation. The initial release targeted professional use cases like legal and financial analysis, with plugin support included from day one. It is the clearest expression yet of Anthropic's thesis that the next competitive frontier is not chat quality but delegated work.

## The GOV.UK win

On January 27, Anthropic announced it had been selected to develop and pilot an AI assistant for GOV.UK in partnership with the UK's Department for Science, Innovation and Technology. Government deployments are slow, unglamorous, and enormously validating — a sovereign customer choosing Claude for citizen-facing services is a reference sale money cannot buy.

## Healthcare and the ServiceNow default

Claude for Healthcare launched with HIPAA-ready tooling, and ServiceNow announced Claude as the default build-agent model inside its Action Fabric platform. Add Anthropic Labs — the consumer-product group co-led by Instagram co-founder Mike Krieger, launched January 11 — and January read less like a month of releases than a declaration of scope.`,
    category: "news",
    sourceUrls: [
      "https://www.anthropic.com/news",
      "https://releasebot.io/updates/anthropic",
    ],
    heroImageUrl: `${IMG}/claude-cowork-govuk.png`,
    readingMinutes: 5,
    publishedAt: new Date("2026-01-30T09:00:00Z"),
  },
  {
    slug: "anthropic-series-g-380b-valuation",
    title:
      "Anthropic Raises $30 Billion at a $380 Billion Valuation as Revenue Run-Rate Hits $14B",
    dek: "The Series G more than doubled Anthropic's September valuation in five months. The enterprise API business — not the chatbot — is what investors are paying for.",
    body: `Anthropic closed a $30 billion Series G in February at a $380 billion valuation — up from $183 billion in September 2025 — as the company's annualized revenue crossed $14 billion.

## The velocity problem for skeptics

The numbers that matter are the deltas. Anthropic ended 2025 at roughly $9 billion in run-rate revenue; by February it was $14 billion and climbing at a pace that would make the Series G valuation look conservative within a quarter. Skeptics of AI-lab valuations have spent two years arguing the revenue was pilot-driven and would churn. Anthropic's enterprise-heavy mix — API contracts, Claude Code seats, and regulated-industry deployments — is the counter-evidence investors keep citing.

## Where the money goes

Anthropic's stated priorities for the round were familiar: compute, compute, and compute, alongside international expansion and safety research. The company shipped a major Claude release roughly every two weeks through early 2026, a cadence that is itself a capital expenditure story — training and serving frontier models at that tempo is what $30 billion buys.

## The context

February's round made Anthropic, briefly, the most highly valued private AI company besides OpenAI. That footnote would not survive the spring — but the Series G established the trajectory that made May's far larger round possible.`,
    category: "news",
    sourceUrls: [
      "https://sacra.com/c/anthropic/",
      "https://tracxn.com/d/companies/anthropic/__SzoxXDMin-NK5tKB7ks8yHr6S9Mz68pjVCzFEcGFZ08/funding-and-investors",
    ],
    heroImageUrl: `${IMG}/anthropic-series-g.png`,
    readingMinutes: 5,
    publishedAt: new Date("2026-02-26T09:00:00Z"),
  },
  {
    slug: "anthropic-series-h-965b-valuation",
    title:
      "Anthropic's $65 Billion Series H Values the Company at $965 Billion — On $47B Run-Rate Revenue",
    dek: "Fifteen-fold valuation growth in fourteen months, a revenue curve that quadrupled since December, and an investor list that reads like the index. The IPO question is now 'when,' not 'if.'",
    body: `Anthropic announced a $65 billion Series H in May at a $965 billion post-money valuation — the largest private funding round on record and a fifteen-fold increase over its valuation of just fourteen months earlier.

## The round

Altimeter Capital, Dragoneer, Greenoaks, and Sequoia led, joined by Capital Group, Coatue, D1, Baillie Gifford, Blackstone, Brookfield, DST Global, and Fidelity, among others. Strategic infrastructure partners Samsung, SK Hynix, and Micron participated, and roughly $15 billion of the total comprised previously committed hyperscaler investment, including $5 billion from Amazon. Total capital raised across 18 rounds now stands at $132 billion.

## The revenue curve behind it

The valuation only parses against Anthropic's 2026 revenue trajectory: roughly $14 billion annualized in February, $19 billion in early March, $30 billion by April, and $47 billion by May — up from $9 billion at the end of 2025. On reported run-rate, Anthropic has pulled ahead of OpenAI, a sentence that would have seemed implausible eighteen months ago.

## What it means

Days after the round, Anthropic confidentially filed a draft S-1 with the SEC. A near-trillion-dollar private valuation leaves exactly one exit large enough to matter, and the company is visibly preparing for it. For enterprise customers, the practical takeaway is simpler: the vendor risk question about Anthropic is no longer viability — it is concentration.`,
    category: "news",
    sourceUrls: [
      "https://www.anthropic.com/news/series-h",
      "https://techcrunch.com/2026/05/28/anthropic-raises-65-billion-nears-1t-valuation-ahead-of-ipo/",
      "https://www.forbes.com/sites/jonmarkman/2026/05/04/anthropics-900b-funding-round-set-to-surpass-openai/",
    ],
    heroImageUrl: `${IMG}/anthropic-series-h.png`,
    readingMinutes: 6,
    publishedAt: new Date("2026-05-29T09:00:00Z"),
  },
  {
    slug: "claude-opus-4-8-honesty-release",
    title:
      "Claude Opus 4.8 Ships With an Unusual Headline Feature: Admitting Its Own Mistakes",
    dek: "Anthropic says its new flagship is four times less likely to let flaws in its own code pass unremarked — a bet that reliability, not raw capability, is what enterprises will pay for.",
    body: `Anthropic released Claude Opus 4.8 on May 28, positioning honesty and reliability — not benchmark gains — as the flagship improvements, alongside a new fast mode and dynamic workflows that let Claude Code coordinate hundreds of parallel subagents.

## The honesty pitch

The most quoted line from the launch: Opus 4.8 is roughly four times less likely than its predecessor to let flaws in code it has written pass unremarked. For teams deploying AI agents on production codebases, silent failure is the failure mode that matters — an agent that flags its own uncertainty is worth more than one that scores higher while hiding its mistakes.

## Fast mode and the pricing menu

Opus 4.8 keeps its predecessor's pricing at $5 per million input tokens and $25 per million output, with a 1 million token context window. The new fast mode — up to 2.5x faster — costs double. Anthropic is effectively letting customers price their own latency tolerance, a small design choice that says a lot about how mature the API business has become.

## Dynamic workflows

The headline capability for engineering organizations: a single Claude Code session can now plan and run hundreds of subagents in parallel, enabling codebase-scale migrations across hundreds of thousands of lines. Available on the Claude API, Amazon Bedrock, Google Vertex AI, Microsoft Foundry, GitHub Copilot, and GitLab from day one — distribution breadth that has quietly become one of Anthropic's structural advantages.`,
    category: "news",
    sourceUrls: [
      "https://hidekazu-konishi.com/entry/anthropic_claude_model_release_timeline.html",
      "https://releasebot.io/updates/anthropic",
    ],
    heroImageUrl: `${IMG}/claude-opus-4-8.png`,
    readingMinutes: 5,
    publishedAt: new Date("2026-06-02T09:00:00Z"),
  },
  {
    slug: "anthropic-s1-filing-sonnet-5",
    title:
      "Anthropic Files Confidential S-1, Then Ships Sonnet 5 a Month Later — the IPO Run Has Begun",
    dek: "A draft S-1 on June 1, a California state government partnership on June 29, and Claude Sonnet 5 on June 30. Anthropic's June looked exactly like a company building its public-market story.",
    body: `Anthropic confidentially submitted a draft S-1 registration statement to the SEC on June 1 — days after closing its $65 billion Series H — then closed the month by launching Claude Sonnet 5 and a first-of-its-kind partnership putting Claude tools into California state agencies.

## The filing

A confidential S-1 submission starts a clock without committing to a date, and Anthropic said nothing about timing. But the sequencing is legible: raise at $965 billion, file, then spend the following quarters printing revenue milestones that justify a public valuation north of the round. At a $47 billion run-rate growing the way 2026's numbers have grown, the S-1's eventual financials may be the most-read disclosure document in tech history.

## Sonnet 5

Launched June 30, Sonnet 5 delivers what Anthropic called frontier performance across coding, agents, and professional work at scale — the workhorse-tier model that carries most production API traffic. Frontier capability at mid-tier pricing is the actual competitive weapon in the enterprise market; flagship models make headlines, Sonnet-class models make revenue.

## Sacramento signs up

On June 29, California Governor Gavin Newsom announced a partnership providing Anthropic tools to state agencies. Following January's GOV.UK selection, it extends a pattern: Anthropic is systematically collecting sovereign and public-sector references — the hardest procurement processes in the world to pass, and the most durable customers once passed.`,
    category: "news",
    sourceUrls: [
      "https://www.gov.ca.gov/2026/06/29/governor-newsom-announces-a-first-of-its-kind-partnership-providing-anthropic-tools-to-state-agencies-and-improving-services-for-californians/",
      "https://www.anthropic.com/news",
      "https://techcrunch.com/2026/05/28/anthropic-raises-65-billion-nears-1t-valuation-ahead-of-ipo/",
    ],
    heroImageUrl: `${IMG}/anthropic-s1-sonnet-5.png`,
    readingMinutes: 5,
    publishedAt: new Date("2026-07-02T09:00:00Z"),
  },

  // ── OpenAI ───────────────────────────────────────────────────────────────
  {
    slug: "openai-frontier-platform-alliances",
    title:
      "OpenAI Answers Anthropic With 'Frontier' — and Recruits the Consulting Giants to Sell It",
    dek: "February brought an agentic platform for support and IT operations, then a partnership program embedding consultancies into OpenAI's enterprise motion. The AI labs are now competing on distribution, not just models.",
    body: `OpenAI launched Frontier, an agentic platform for automated workflows in areas like customer support and IT operations, on February 5 — a direct response to Anthropic's open-source plugin push — then followed on February 26 with Frontier Alliances, a program partnering with major consulting firms to drive enterprise deployment.

## The platform

Frontier packages OpenAI's models into deployable automation for the two enterprise workflows with the clearest AI ROI story: support ticket resolution and IT operations. The strategic logic is straightforward — as model capabilities converge at the frontier, the labs are racing to own the layer where work actually gets automated, because that is where switching costs live.

## The consultants

Frontier Alliances is the more telling move. Enterprise AI deployments stall in the last mile — integration, change management, governance — and that last mile is precisely what consultancies sell. By formalizing partnerships with large consulting firms, OpenAI is buying implementation capacity it cannot build fast enough internally, and putting its models at the front of the recommendation queue when Fortune 500 boards ask their advisors what to deploy.

## The subtext

February also saw OpenAI hire Peter Steinberger, creator of the viral OpenClaw assistant, to lead what Sam Altman described as the next generation of personal agents. Platform, distribution, talent: the through-line of OpenAI's February was that the model is no longer the product. The deployment is.`,
    category: "news",
    sourceUrls: [
      "https://www.computerworld.com/article/4015023/openai-latest-news-and-insights.html",
      "https://openai.com/news/",
    ],
    heroImageUrl: `${IMG}/openai-frontier.png`,
    readingMinutes: 5,
    publishedAt: new Date("2026-02-27T09:00:00Z"),
  },
  {
    slug: "openai-gpt-5-4-computer-use",
    title:
      "GPT-5.4 Is OpenAI's First Mainline Model That Can Operate a Computer",
    dek: "Released March 5, GPT-5.4 folds Codex-grade coding and native computer use into a single frontier model with a million-token context — aimed squarely at the enterprise agent market Anthropic had claimed.",
    body: `OpenAI released GPT-5.4 on March 5, its most capable system to date for professional work — and the first general-purpose model in its lineup with native, state-of-the-art computer-use capabilities, letting agents operate software and carry out workflows across applications.

## One model instead of three

GPT-5.4 consolidates what had been spread across separate models: the coding strength of GPT-5.3-Codex, improved mainline reasoning, and agentic computer use, in a single model rolling out across ChatGPT, the API, and Codex. It supports up to one million tokens of context. For developers, the simplification matters as much as the capability — model selection had become its own engineering problem.

## The competitive frame

Coverage of the launch consistently framed it as an assault on enterprise territory where Anthropic had built a stronghold, particularly agentic coding and professional document work. GPT-5.4's spreadsheet, presentation, and document capabilities target exactly the workflows Microsoft is simultaneously wiring into Copilot — and the workflows Anthropic's Claude Code owns among developers.

## What followed

The spring cadence did not slow: GPT-5.5 arrived within weeks as OpenAI's smartest model yet, followed by GPT-5.5 Instant as ChatGPT's default, with reduced hallucinations and improved personalization. The mainline-model release cycle across the industry now runs in weeks. Enterprises building on these APIs should assume the model underneath them changes quarterly — and architect for it.`,
    category: "news",
    sourceUrls: [
      "https://fortune.com/2026/03/05/openai-new-model-gpt5-4-enterprise-agentic-anthropic/",
      "https://openai.com/index/introducing-gpt-5-4/",
      "https://openai.com/index/introducing-gpt-5-5/",
    ],
    heroImageUrl: `${IMG}/openai-gpt-5-4.png`,
    readingMinutes: 5,
    publishedAt: new Date("2026-03-06T09:00:00Z"),
  },
  {
    slug: "openai-gpt-5-6-government-review",
    title:
      "GPT-5.6 Launches Under Government Watch: Washington Now Reviews Frontier Models Before Release",
    dek: "OpenAI's newest family — Sol, Terra, and Luna — arrived with a limited rollout at the U.S. government's request, a first for the industry and a preview of how frontier AI will ship from now on.",
    body: `OpenAI introduced the GPT-5.6 family in July — Sol, its most powerful model; Terra, balancing efficiency and power; and Luna, built for speed and affordability — with a rollout deliberately limited at the behest of the U.S. government, marking the first time Washington has treated a commercial AI model as a product requiring review before wide release.

## The models

GPT-5.6 promises more intelligence per token and stronger performance per dollar, with Sol previewed in late June carrying OpenAI's most advanced safety stack and stronger capabilities in coding, science, and cybersecurity. The three-tier naming — Sol, Terra, Luna — mirrors the industry's convergence on a flagship/workhorse/fast triad, the same structure Anthropic runs with Opus, Sonnet, and Haiku.

## The precedent

The government-limited rollout is the story that will outlast the benchmarks. Frontier model releases have been unilateral corporate decisions since the beginning of the modern AI era; GPT-5.6's staged availability, shaped by federal review, establishes a template closer to how pharmaceuticals or export-controlled technology reach market. Notably, the same month saw Washington lift restrictions on Anthropic's most powerful models — evidence the review process runs in both directions.

## Also in July

OpenAI shipped GPT-Live-1 and GPT-Live-1 mini on July 8, full-duplex voice models designed for natural real-time conversation with extensive red-teaming behind their safety claims. Voice, long the demo-ware of the AI era, is quietly becoming production infrastructure — and the enterprise contact-center market is the obvious first casualty.`,
    category: "news",
    sourceUrls: [
      "https://openai.com/news/",
      "https://releasebot.io/updates/openai",
      "https://help.openai.com/en/articles/9624314-model-release-notes",
    ],
    heroImageUrl: `${IMG}/openai-gpt-5-6.png`,
    readingMinutes: 6,
    publishedAt: new Date("2026-07-09T09:00:00Z"),
  },
];

async function main(): Promise<void> {
  let upserted = 0;

  for (const article of newsArticles) {
    const result = await db
      .insert(articlesTable)
      .values(article)
      .onConflictDoUpdate({
        target: articlesTable.slug,
        set: {
          heroImageUrl: article.heroImageUrl,
          sourceUrls: article.sourceUrls,
          author: article.author ?? "SignalAI Staff",
        },
      })
      .returning({ id: articlesTable.id });
    if (result.length > 0) {
      upserted += 1;
    }
  }

  console.log(
    `Seeded/updated ${upserted} of ${newsArticles.length} news articles.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
