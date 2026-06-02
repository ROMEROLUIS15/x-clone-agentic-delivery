import { Router } from "express";
import {
  follow,
  unfollow,
  getFollowers,
  getFollowing,
  like,
  unlike,
  getUser,
} from "../controllers/social.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.get("/users/:id", authMiddleware, getUser);
router.post("/users/:id/follow", authMiddleware, follow);
router.post("/users/:id/unfollow", authMiddleware, unfollow);
router.get("/users/:id/followers", authMiddleware, getFollowers);
router.get("/users/:id/following", authMiddleware, getFollowing);
router.post("/tweets/:id/like", authMiddleware, like);
router.post("/tweets/:id/unlike", authMiddleware, unlike);

export default router;
