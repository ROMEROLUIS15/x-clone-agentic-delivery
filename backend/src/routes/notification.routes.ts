import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { mutationLimiter } from "../middlewares/rateLimit.middleware";
import { getNotifications, getUnreadCount, markRead } from "../controllers/notification.controller";
import { requireAuth } from "../types/auth";

const router = Router();

router.get("/unread-count", authMiddleware, requireAuth(getUnreadCount));
router.get("/", authMiddleware, requireAuth(getNotifications));
router.post("/read", authMiddleware, mutationLimiter, requireAuth(markRead));

export default router;
