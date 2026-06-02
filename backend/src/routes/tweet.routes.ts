import { Router } from "express";
import { createTweet, deleteTweet, getMyTweets } from "../controllers/tweet.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", authMiddleware, getMyTweets);
router.post("/", authMiddleware, createTweet);
router.delete("/:id", authMiddleware, deleteTweet);

export default router;
