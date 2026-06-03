import rateLimit from "express-rate-limit";

const isTest = process.env.NODE_ENV === "test";

/**
 * Strict limiter for auth endpoints — prevents brute-force credential attacks.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTest ? 1000 : 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many auth attempts, please try again later." },
});

/**
 * Generous limiter for mutating endpoints (POST/DELETE tweets, follow, like).
 * Stops obvious spam without bothering normal users.
 */
export const mutationLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: isTest ? 10000 : 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down." },
});
