import { Response } from "express";
import type { AuthenticatedRequest } from "../types/auth";
import { subscribe, topics, type SseEvent } from "../services/realtime.service";

const HEARTBEAT_MS = 30_000;

/**
 * Opens a Server-Sent Events stream for a single topic and wires up the
 * heartbeat + cleanup. Shared by the timeline, profile and thread streams.
 */
function openSse(req: AuthenticatedRequest, res: Response, topic: string): void {
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

  send("connected", { topic, at: new Date().toISOString() });

  const heartbeat = setInterval(() => {
    if (res.writableEnded) return;
    res.write(": ping\n\n");
  }, HEARTBEAT_MS);

  const unsubscribe = subscribe(topic, { send });

  const cleanup = () => {
    clearInterval(heartbeat);
    unsubscribe();
  };

  req.on("close", cleanup);
  req.on("aborted", cleanup);
}

/** Home timeline stream — self + followed authors. */
export function streamTimeline(req: AuthenticatedRequest, res: Response): void {
  openSse(req, res, topics.user(req.user.id));
}

/** Profile stream — live updates for anyone viewing a given user's profile. */
export function streamProfile(req: AuthenticatedRequest, res: Response): void {
  openSse(req, res, topics.profile(String(req.params.id)));
}

/** Thread stream — live updates for anyone viewing a given tweet's thread. */
export function streamThread(req: AuthenticatedRequest, res: Response): void {
  openSse(req, res, topics.thread(String(req.params.id)));
}
