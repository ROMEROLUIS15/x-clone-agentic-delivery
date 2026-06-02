import { Router } from "express";
import rateLimit from "express-rate-limit";
import { register, login, logout, me } from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === "test" ? 1000 : 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many auth attempts, please try again later." },
});

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/logout", logout);
router.get("/me", authMiddleware, me);

export default router;
