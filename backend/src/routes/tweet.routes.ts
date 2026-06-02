import { Router } from "express";
import { createTweet, deleteTweet, getTimeline } from "../controllers/tweet.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createTweetSchema } from "../schemas/tweet.schema";
import { requireAuth } from "../types/auth";

const router = Router();

router.get("/timeline", authMiddleware, requireAuth(getTimeline));
router.post("/", authMiddleware, validate(createTweetSchema), requireAuth(createTweet));
router.delete("/:id", authMiddleware, requireAuth(deleteTweet));

export default router;
