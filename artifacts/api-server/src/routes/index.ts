import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import coursesRouter from "./courses";
import quizzesRouter from "./quizzes";
import badgesRouter from "./badges";
import certificatesRouter from "./certificates";
import notificationsRouter from "./notifications";
import analyticsRouter from "./analytics";
import notesRouter from "./notes";
import preferencesRouter from "./preferences";
import adminRouter from "./admin";
import dashboardRouter from "./dashboard";
import uploadRouter from "./upload";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(coursesRouter);
router.use(quizzesRouter);
router.use(badgesRouter);
router.use(certificatesRouter);
router.use(notificationsRouter);
router.use(analyticsRouter);
router.use(notesRouter);
router.use(preferencesRouter);
router.use(adminRouter);
router.use(dashboardRouter);
router.use(uploadRouter);

export default router;
