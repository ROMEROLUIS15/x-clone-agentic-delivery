import { Request, Response } from "express";
import prisma from "../db";
import { HttpError } from "../middlewares/error.middleware";
import { toTweetDTO, tweetIncludeFor } from "../mappers/tweet.mapper";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const TWEET_MAX_CHARS = 280;

function parsePagination(req: Request) {
  const limit = Math.min(
    Math.max(parseInt(req.query.limit as string) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );
  const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
  return { limit, offset };
}

export async function createTweet(req: Request, res: Response): Promise<void> {
  const { text } = req.body;
  const userId = req.user!.id;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    throw new HttpError(400, "Tweet text is required");
  }
  if (text.length > TWEET_MAX_CHARS) {
    throw new HttpError(400, `Tweet must be ${TWEET_MAX_CHARS} characters or less`);
  }

  const tweet = await prisma.tweet.create({
    data: { userId, text: text.trim() },
    include: tweetIncludeFor(userId),
  });

  res.status(201).json(toTweetDTO(tweet));
}

export async function getMyTweets(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;

  const tweets = await prisma.tweet.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: tweetIncludeFor(userId),
  });

  res.status(200).json(tweets.map(toTweetDTO));
}

export async function getUserTweets(req: Request, res: Response): Promise<void> {
  const { id: targetUserId } = req.params;
  const currentUserId = req.user!.id;
  const { limit, offset } = parsePagination(req);

  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) {
    throw new HttpError(404, "User not found");
  }

  const [tweets, total] = await Promise.all([
    prisma.tweet.findMany({
      where: { userId: targetUserId },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      include: tweetIncludeFor(currentUserId),
    }),
    prisma.tweet.count({ where: { userId: targetUserId } }),
  ]);

  res.status(200).json({
    tweets: tweets.map(toTweetDTO),
    total,
    limit,
    offset,
  });
}

export async function getTimeline(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { limit, offset } = parsePagination(req);

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

  res.status(200).json({
    tweets: tweets.map(toTweetDTO),
    total,
    limit,
    offset,
  });
}

export async function deleteTweet(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;

  const tweet = await prisma.tweet.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });

  if (!tweet) {
    throw new HttpError(404, "Tweet not found");
  }
  if (tweet.userId !== userId) {
    throw new HttpError(403, "You can only delete your own tweets");
  }

  await prisma.tweet.delete({ where: { id } });

  res.status(200).json({ message: "Tweet deleted successfully" });
}
