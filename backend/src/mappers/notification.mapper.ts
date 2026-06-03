export interface NotificationWithRelations {
  id: string;
  type: string;
  read: boolean;
  createdAt: Date;
  actor: { id: string; username: string; name: string; avatarUrl: string | null };
  tweet: { id: string; text: string } | null;
}

export function toNotificationDTO(n: NotificationWithRelations) {
  return {
    id: n.id,
    type: n.type,
    read: n.read,
    createdAt: n.createdAt,
    actor: n.actor,
    tweet: n.tweet,
  };
}

/** Prisma include that shapes a notification into NotificationWithRelations. */
export const notificationInclude = {
  actor: { select: { id: true, username: true, name: true, avatarUrl: true } },
  tweet: { select: { id: true, text: true } },
} as const;
