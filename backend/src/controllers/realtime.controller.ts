import { Response } from "express";
import type { AuthenticatedRequest } from "../types/auth";
import { subscribe, type SseEvent } from "../services/realtime.service";

const HEARTBEAT_MS = 30_000;

export function streamTimeline(req: AuthenticatedRequest, res: Response): void {
  const userId = req.user.id;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering
  res.flushHeaders?.();

  const send = (event: SseEvent, data: unknown) => {
    if (res.writableEnded) return;
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  send("connected", { userId, at: new Date().toISOString() });

  const heartbeat = setInterval(() => {
    if (res.writableEnded) return;
    res.write(": ping\n\n");
  }, HEARTBEAT_MS);

  const unsubscribe = subscribe(userId, { send });

  const cleanup = () => {
    clearInterval(heartbeat);
    unsubscribe();
  };

  req.on("close", cleanup);
  req.on("aborted", cleanup);
}
