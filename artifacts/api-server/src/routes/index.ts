import { Router, type IRouter } from "express";
import healthRouter from "./health";
import contentRouter from "./content";
import articlesRouter from "./articles";
import draftsRouter from "./drafts";
import seoRouter from "./seo";

const router: IRouter = Router();

router.use(healthRouter);
router.use(contentRouter);
router.use(articlesRouter);
router.use(draftsRouter);
router.use(seoRouter);

export default router;
