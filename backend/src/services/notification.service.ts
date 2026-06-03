import prisma from "../db";
import { HttpError } from "../middlewares/error.middleware";
import { toNotificationDTO, notificationInclude } from "../mappers/notification.mapper";
import { publishNotification } from "./realtime.service";

export type NotificationType = "like" | "follow" | "reply";

interface Pagination {
  limit: number;
  offset: number;
}

interface CreateArgs {
  recipientId: string;
  actorId: string;
  type: NotificationType;
  tweetId?: string | null;
}

/**
 * Creates a notification and pushes it live to the recipient. Never notifies a
 * user about their own action. Like/follow are de-duplicated so toggling them
 * doesn't spam the feed; replies are always distinct events.
 */
export async function createNotification({ recipientId, actorId, type, tweetId = null }: CreateArgs) {
  if (recipientId === actorId) return;

  if (type === "like" || type === "follow") {
    const existing = await prisma.notification.findFirst({
      where: { recipientId, actorId, type, tweetId },
      select: { id: true },
    });
    if (existing) return;
  }

  const created = await prisma.notification.create({
    data: { recipientId, actorId, type, tweetId },
    include: notificationInclude,
  });

  const dto = toNotificationDTO(created);
  publishNotification(recipientId, dto);
  return dto;
}

export async function listNotifications(userId: string, { limit, offset }: Pagination) {
  const [items, total, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      include: notificationInclude,
    }),
    prisma.notification.count({ where: { recipientId: userId } }),
    prisma.notification.count({ where: { recipientId: userId, read: false } }),
  ]);

  return { notifications: items.map(toNotificationDTO), total, unread, limit, offset };
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { recipientId: userId, read: false } });
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { recipientId: userId, read: false },
    data: { read: true },
  });
}

export async function markRead(id: string, userId: string): Promise<void> {
  const notification = await prisma.notification.findUnique({
    where: { id },
    select: { recipientId: true },
  });
  if (!notification || notification.recipientId !== userId) {
    throw new HttpError(404, "Notification not found");
  }
  await prisma.notification.update({ where: { id }, data: { read: true } });
}
