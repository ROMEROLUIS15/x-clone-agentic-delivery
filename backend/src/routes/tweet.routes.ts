import { Router } from "express";
import { createTweet, deleteTweet, getTimeline } from "../controllers/tweet.controller";
import { streamTimeline } from "../controllers/realtime.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { sseAuthMiddleware } from "../middlewares/sseAuth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { mutationLimiter } from "../middlewares/rateLimit.middleware";
import { createTweetSchema } from "../schemas/tweet.schema";
import { requireAuth } from "../types/auth";

const router = Router();

router.get("/timeline/stream", sseAuthMiddleware, requireAuth(streamTimeline));
router.get("/timeline", authMiddleware, requireAuth(getTimeline));
router.post("/", authMiddleware, mutationLimiter, validate(createTweetSchema), requireAuth(createTweet));
router.delete("/:id", authMiddleware, mutationLimiter, requireAuth(deleteTweet));

export default router;
