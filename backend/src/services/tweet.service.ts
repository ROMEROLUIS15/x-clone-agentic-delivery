import prisma from "../db";
import { HttpError } from "../middlewares/error.middleware";
import { toTweetDTO, tweetIncludeFor } from "../mappers/tweet.mapper";

export const TWEET_MAX_CHARS = 280;

export interface Pagination {
  limit: number;
  offset: number;
}

export async function createTweet(userId: string, text: string) {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    throw new HttpError(400, "Tweet text is required");
  }
  if (trimmed.length > TWEET_MAX_CHARS) {
    throw new HttpError(400, `Tweet must be ${TWEET_MAX_CHARS} characters or less`);
  }

  const tweet = await prisma.tweet.create({
    data: { userId, text: trimmed },
    include: tweetIncludeFor(userId),
  });

  return toTweetDTO(tweet);
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
      where: { userId: { in: userIds } },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      include: tweetIncludeFor(userId),
    }),
    prisma.tweet.count({ where: { userId: { in: userIds } } }),
  ]);

  return { tweets: tweets.map(toTweetDTO), total, limit, offset };
}

export async function getTweetsByUser(targetUserId: string, requesterId: string, { limit, offset }: Pagination) {
  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) throw new HttpError(404, "User not found");

  const [tweets, total] = await Promise.all([
    prisma.tweet.findMany({
      where: { userId: targetUserId },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      include: tweetIncludeFor(requesterId),
    }),
    prisma.tweet.count({ where: { userId: targetUserId } }),
  ]);

  return { tweets: tweets.map(toTweetDTO), total, limit, offset };
}
