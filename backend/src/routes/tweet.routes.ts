import { Router } from "express";
import { createTweet, deleteTweet, getTimeline } from "../controllers/tweet.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createTweetSchema } from "../schemas/tweet.schema";

const router = Router();

router.get("/timeline", authMiddleware, getTimeline);
router.post("/", authMiddleware, validate(createTweetSchema), createTweet);
router.delete("/:id", authMiddleware, deleteTweet);

export default router;
