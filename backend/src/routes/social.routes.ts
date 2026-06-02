import { Router } from "express";
import {
  follow,
  unfollow,
  getFollowers,
  getFollowing,
  like,
  unlike,
  getUser,
  searchUsers,
} from "../controllers/social.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { mutationLimiter } from "../middlewares/rateLimit.middleware";
import { getUserTweets } from "../controllers/tweet.controller";
import { requireAuth } from "../types/auth";

const router = Router();

router.get("/users/search", authMiddleware, searchUsers);
router.get("/users/:id", authMiddleware, getUser);
router.get("/users/:id/tweets", authMiddleware, requireAuth(getUserTweets));
router.post("/users/:id/follow", authMiddleware, mutationLimiter, requireAuth(follow));
router.post("/users/:id/unfollow", authMiddleware, mutationLimiter, requireAuth(unfollow));
router.get("/users/:id/followers", authMiddleware, getFollowers);
router.get("/users/:id/following", authMiddleware, getFollowing);
router.post("/tweets/:id/like", authMiddleware, mutationLimiter, requireAuth(like));
router.post("/tweets/:id/unlike", authMiddleware, mutationLimiter, requireAuth(unlike));

export default router;
