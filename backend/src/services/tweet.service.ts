import prisma from "../db";
import { HttpError } from "../middlewares/error.middleware";
import { toTweetDTO, tweetIncludeFor } from "../mappers/tweet.mapper";
import { publishNewTweet, publishNewReply } from "./realtime.service";

export const TWEET_MAX_CHARS = 280;

export interface Pagination {
  limit: number;
  offset: number;
}

export async function createTweet(userId: string, text: string, imageUrl?: string) {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    throw new HttpError(400, "Tweet text is required");
  }
  if (trimmed.length > TWEET_MAX_CHARS) {
    throw new HttpError(400, `Tweet must be ${TWEET_MAX_CHARS} characters or less`);
  }

  const tweet = await prisma.tweet.create({
    data: { userId, text: trimmed, imageUrl: imageUrl ?? null },
    include: tweetIncludeFor(userId),
  });

  const dto = toTweetDTO(tweet);
  // Fire-and-forget: SSE broadcast is best-effort, never blocks the response.
  void publishNewTweet(dto, userId).catch((err) => {
    console.error("publishNewTweet failed:", err);
  });

  return dto;
}

export async function createReply(userId: string, parentId: string, text: string, imageUrl?: string) {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    throw new HttpError(400, "Tweet text is required");
  }
  if (trimmed.length > TWEET_MAX_CHARS) {
    throw new HttpError(400, `Tweet must be ${TWEET_MAX_CHARS} characters or less`);
  }

  const parent = await prisma.tweet.findUnique({
    where: { id: parentId },
    select: { id: true, userId: true, parentId: true },
  });
  if (!parent) throw new HttpError(404, "Tweet not found");

  const reply = await prisma.tweet.create({
    data: { userId, text: trimmed, parentId, imageUrl: imageUrl ?? null },
    include: tweetIncludeFor(userId),
  });

  const dto = toTweetDTO(reply);
  // Fire-and-forget: live-append to the open thread and bump reply counts.
  void publishNewReply(dto, parent.id, parent.userId, parent.parentId).catch((err) => {
    console.error("publishNewReply failed:", err);
  });

  return dto;
}

export async function getRepliesFor(parentId: string, requesterId: string, { limit, offset }: Pagination) {
  const parent = await prisma.tweet.findUnique({
    where: { id: parentId },
    select: { id: true },
  });
  if (!parent) throw new HttpError(404, "Tweet not found");

  const [replies, total] = await Promise.all([
    prisma.tweet.findMany({
      where: { parentId },
      orderBy: { createdAt: "asc" },
      skip: offset,
      take: limit,
      include: tweetIncludeFor(requesterId),
    }),
    prisma.tweet.count({ where: { parentId } }),
  ]);

  return { replies: replies.map(toTweetDTO), total, limit, offset };
}

export async function getTweetWithContext(tweetId: string, requesterId: string) {
  const tweet = await prisma.tweet.findUnique({
    where: { id: tweetId },
    include: {
      ...tweetIncludeFor(requesterId),
      parent: { include: tweetIncludeFor(requesterId) },
    },
  });
  if (!tweet) throw new HttpError(404, "Tweet not found");

  const { parent, ...rest } = tweet;
  return {
    tweet: toTweetDTO(rest),
    parent: parent ? toTweetDTO(parent) : null,
  };
}

export async function deleteOwnedTweet(tweetId: string, userId: string): Promise<void> {
  const tweet = await prisma.tweet.findUnique({
    where: { id: tweetId },
    select: { id: true, userId: true },
  });

  if (!tweet) throw new HttpError(404, "Tweet not found");
  if (tweet.userId !== userId) {
    throw new HttpError(403, "You can only delete your own tweets");
  }

  await prisma.tweet.delete({ where: { id: tweetId } });
}

export async function getTimelineFor(userId: string, { limit, offset }: Pagination) {
  const followed = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  const userIds = [...new Set([userId, ...followed.map((f) => f.followingId)])];

  const [tweets, total] = await Promise.all([
    prisma.tweet.findMany({
      where: { userId: { in: userIds }, parentId: null },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      include: tweetIncludeFor(userId),
    }),
    prisma.tweet.count({ where: { userId: { in: userIds }, parentId: null } }),
  ]);

  return { tweets: tweets.map(toTweetDTO), total, limit, offset };
}

export async function getTweetsByUser(targetUserId: string, requesterId: string, { limit, offset }: Pagination) {
  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) throw new HttpError(404, "User not found");

  const [tweets, total] = await Promise.all([
    prisma.tweet.findMany({
      where: { userId: targetUserId, parentId: null },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      include: tweetIncludeFor(requesterId),
    }),
    prisma.tweet.count({ where: { userId: targetUserId, parentId: null } }),
  ]);

  return { tweets: tweets.map(toTweetDTO), total, limit, offset };
}
