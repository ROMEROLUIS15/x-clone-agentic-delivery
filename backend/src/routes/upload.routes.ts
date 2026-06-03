import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { mutationLimiter } from "../middlewares/rateLimit.middleware";
import { uploadSingleImage } from "../middlewares/upload.middleware";
import { uploadImage } from "../controllers/upload.controller";
import { requireAuth } from "../types/auth";

const router = Router();

router.post("/", authMiddleware, mutationLimiter, uploadSingleImage, requireAuth(uploadImage));

export default router;
