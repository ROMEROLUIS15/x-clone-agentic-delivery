import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import authRouter from "./routes/auth.routes";
import tweetRouter from "./routes/tweet.routes";
import socialRouter from "./routes/social.routes";
import uploadRouter from "./routes/upload.routes";
import notificationRouter from "./routes/notification.routes";
import { errorMiddleware } from "./middlewares/error.middleware";
import { UPLOAD_DIR, PUBLIC_UPLOAD_PATH } from "./upload.config";

dotenv.config();

const app = express();

// Behind the nginx reverse proxy (Docker), trust exactly one proxy hop so
// req.ip reflects the real client (from X-Forwarded-For) and express-rate-limit
// keys per real user instead of bucketing everyone under the proxy's IP.
// `1` (not `true`) keeps it non-permissive — clients can't spoof their IP.
app.set("trust proxy", 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors());
app.use(express.json({ limit: "10kb" }));

// Serve uploaded images statically. Cross-origin policy is relaxed above so the
// frontend (different origin in Docker/nginx) can render them in <img> tags.
app.use(PUBLIC_UPLOAD_PATH, express.static(UPLOAD_DIR));

app.use("/api/auth", authRouter);
app.use("/api/tweets", tweetRouter);
app.use("/api/uploads", uploadRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api", socialRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(errorMiddleware);

export default app;
