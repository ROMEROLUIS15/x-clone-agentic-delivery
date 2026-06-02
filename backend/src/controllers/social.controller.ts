import { Request, Response } from "express";
import prisma from "../db";
import { HttpError } from "../middlewares/error.middleware";

async function ensureUserExists(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new HttpError(404, "User not found");
  return user;
}

export async function follow(req: Request, res: Response): Promise<void> {
  const currentUserId = req.user!.id;
  const { id: targetUserId } = req.params;

  if (currentUserId === targetUserId) {
    throw new HttpError(400, "You cannot follow yourself");
  }
  await ensureUserExists(targetUserId);

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: currentUserId, followingId: targetUserId } },
  });
  if (existing) throw new HttpError(409, "Already following this user");

  await prisma.follow.create({
    data: { followerId: currentUserId, followingId: targetUserId },
  });

  const followersCount = await prisma.follow.count({ where: { followingId: targetUserId } });
  res.status(201).json({ message: "Followed successfully", followersCount });
}

export async function unfollow(req: Request, res: Response): Promise<void> {
  const currentUserId = req.user!.id;
  const { id: targetUserId } = req.params;

  if (currentUserId === targetUserId) {
    throw new HttpError(400, "You cannot unfollow yourself");
  }
  await ensureUserExists(targetUserId);

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: currentUserId, followingId: targetUserId } },
  });
  if (!existing) throw new HttpError(409, "Not following this user");

  await prisma.follow.delete({
    where: { followerId_followingId: { followerId: currentUserId, followingId: targetUserId } },
  });

  const followersCount = await prisma.follow.count({ where: { followingId: targetUserId } });
  res.status(200).json({ message: "Unfollowed successfully", followersCount });
}

export async function getFollowers(req: Request, res: Response): Promise<void> {
  const { id: targetUserId } = req.params;
  await ensureUserExists(targetUserId);

  const follows = await prisma.follow.findMany({
    where: { followingId: targetUserId },
    include: {
      follower: { select: { id: true, username: true, name: true, avatarUrl: true, bio: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json(follows.map((f) => f.follower));
}

export async function getFollowing(req: Request, res: Response): Promise<void> {
  const { id: targetUserId } = req.params;
  await ensureUserExists(targetUserId);

  const follows = await prisma.follow.findMany({
    where: { followerId: targetUserId },
    include: {
      following: { select: { id: true, username: true, name: true, avatarUrl: true, bio: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json(follows.map((f) => f.following));
}

export async function like(req: Request, res: Response): Promise<void> {
  const currentUserId = req.user!.id;
  const { id: tweetId } = req.params;

  const tweet = await prisma.tweet.findUnique({ where: { id: tweetId } });
  if (!tweet) throw new HttpError(404, "Tweet not found");

  const existing = await prisma.like.findUnique({
    where: { userId_tweetId: { userId: currentUserId, tweetId } },
  });
  if (existing) throw new HttpError(409, "Already liked this tweet");

  await prisma.like.create({ data: { userId: currentUserId, tweetId } });
  const likesCount = await prisma.like.count({ where: { tweetId } });

  res.status(201).json({ message: "Liked successfully", likesCount, liked: true });
}

export async function unlike(req: Request, res: Response): Promise<void> {
  const currentUserId = req.user!.id;
  const { id: tweetId } = req.params;

  const tweet = await prisma.tweet.findUnique({ where: { id: tweetId } });
  if (!tweet) throw new HttpError(404, "Tweet not found");

  const existing = await prisma.like.findUnique({
    where: { userId_tweetId: { userId: currentUserId, tweetId } },
  });
  if (!existing) throw new HttpError(409, "Not liked yet");

  await prisma.like.delete({
    where: { userId_tweetId: { userId: currentUserId, tweetId } },
  });
  const likesCount = await prisma.like.count({ where: { tweetId } });

  res.status(200).json({ message: "Unliked successfully", likesCount, liked: false });
}

export async function searchUsers(req: Request, res: Response): Promise<void> {
  const q = (req.query.q as string)?.trim();

  if (!q) {
    res.status(200).json([]);
    return;
  }

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: q } },
        { username: { contains: q } },
      ],
    },
    select: { id: true, username: true, name: true, bio: true, avatarUrl: true },
    take: 20,
  });

  res.status(200).json(users);
}

export async function getUser(req: Request, res: Response): Promise<void> {
  const { id: targetUserId } = req.params;

  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      bio: true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  if (!user) throw new HttpError(404, "User not found");

  const [followersCount, followingCount] = await Promise.all([
    prisma.follow.count({ where: { followingId: targetUserId } }),
    prisma.follow.count({ where: { followerId: targetUserId } }),
  ]);

  let isFollowing = false;
  const currentUserId = req.user?.id;
  if (currentUserId && currentUserId !== targetUserId) {
    const follow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: currentUserId, followingId: targetUserId } },
    });
    isFollowing = !!follow;
  }

  res.status(200).json({ user, followersCount, followingCount, isFollowing });
}
