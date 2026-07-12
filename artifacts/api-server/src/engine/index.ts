import { registerJobRunner, failStaleJobs } from "./job-queue";
import { runResearch, type ResearchJobInput } from "./research";
import { runIdeation, type IdeationJobInput } from "./ideation";
import { runCopywrite, type CopywriteJobInput } from "./copywriter";

/**
 * Engine bootstrap: registers the async job runners and cleans up jobs left
 * queued/running by a previous process. Called once at server startup.
 */
export function initEngine(): void {
  registerJobRunner("research", async (input) => {
    const briefing = await runResearch(input as ResearchJobInput);
    return { briefingId: briefing.id, topic: briefing.topic };
  });

  registerJobRunner("ideation", async (input) => {
    const briefs = await runIdeation(input as IdeationJobInput);
    return { briefIds: briefs.map((b) => b.id), count: briefs.length };
  });

  registerJobRunner("copywrite", async (input) => {
    const article = await runCopywrite(input as CopywriteJobInput);
    return { articleId: article.id, title: article.title };
  });

  void failStaleJobs();
}
