import { Router, type IRouter } from "express";
import healthRouter from "./health";
import contentRouter from "./content";
import draftsRouter from "./drafts";

const router: IRouter = Router();

router.use(healthRouter);
router.use(contentRouter);
router.use(draftsRouter);

export default router;
