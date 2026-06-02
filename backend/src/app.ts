import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRouter from "./routes/auth.routes";
import tweetRouter from "./routes/tweet.routes";
import socialRouter from "./routes/social.routes";
import { errorMiddleware } from "./middlewares/error.middleware";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/tweets", tweetRouter);
app.use("/api", socialRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(errorMiddleware);

export default app;
