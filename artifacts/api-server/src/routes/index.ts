import { Router, type IRouter } from "express";
import healthRouter from "./health";
import contentRouter from "./content";
import articlesRouter from "./articles";
import draftsRouter from "./drafts";
import seoRouter from "./seo";
import engineRouter from "./engine";
import authRouter from "./auth";
import libraryRouter from "./library";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(contentRouter);
router.use(articlesRouter);
router.use(engineRouter);
router.use(draftsRouter);
router.use(seoRouter);
router.use(libraryRouter);

export default router;
