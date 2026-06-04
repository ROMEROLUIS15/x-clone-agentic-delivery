import { Response } from "express";
import type { AuthenticatedRequest } from "../types/auth";
import * as notificationService from "../services/notification.service";
import { parsePagination } from "../utils/pagination";

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
