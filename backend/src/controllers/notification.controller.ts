import { Response } from "express";
import type { AuthenticatedRequest } from "../types/auth";
import * as notificationService from "../services/notification.service";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

function parsePagination(req: AuthenticatedRequest) {
  const limit = Math.min(
    Math.max(parseInt(req.query.limit as string) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );
  const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
  return { limit, offset };
}

export async function getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await notificationService.listNotifications(req.user.id, parsePagination(req));
  res.status(200).json(result);
}

export async function getUnreadCount(req: AuthenticatedRequest, res: Response): Promise<void> {
  const unread = await notificationService.getUnreadCount(req.user.id);
  res.status(200).json({ unread });
}

export async function markRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  const id = req.body?.id;
  if (id) {
    await notificationService.markRead(String(id), req.user.id);
  } else {
    await notificationService.markAllRead(req.user.id);
  }
  res.status(200).json({ message: "Notifications marked as read" });
}
