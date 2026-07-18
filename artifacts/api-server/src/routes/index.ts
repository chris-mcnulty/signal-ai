import { Router, type IRouter } from "express";
import healthRouter from "./health";
import contentRouter from "./content";
import articlesRouter from "./articles";
import authorsRouter from "./authors";
import draftsRouter from "./drafts";
import seoRouter from "./seo";
import engineRouter from "./engine";
import authRouter from "./auth";
import libraryRouter from "./library";
import imagesRouter from "./images";
import adminRouter from "./admin";
import analyticsRouter from "./analytics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(adminRouter);
router.use(analyticsRouter);
router.use(contentRouter);
router.use(articlesRouter);
router.use(authorsRouter);
router.use(engineRouter);
router.use(draftsRouter);
router.use(seoRouter);
router.use(libraryRouter);
router.use(imagesRouter);

export default router;
