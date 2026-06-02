import prisma from "../db";
import { HttpError } from "../middlewares/error.middleware";

const publicUserSelect = {
  id: true,
  username: true,
  name: true,
  avatarUrl: true,
  bio: true,
} as const;

async function ensureUserExists(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new HttpError(404, "User not found");
  return user;
}

export async function followUser(currentUserId: string, targetUserId: string) {
  if (currentUserId === targetUserId) {
    throw new HttpError(400, "You cannot follow yourself");
  }
  await ensureUserExists(targetUserId);

  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: currentUserId, followingId: targetUserId } },
    update: {},
    create: { followerId: currentUserId, followingId: targetUserId },
  });

  const followersCount = await prisma.follow.count({ where: { followingId: targetUserId } });
  return { followersCount, isFollowing: true };
}

export async function unfollowUser(currentUserId: string, targetUserId: string) {
  if (currentUserId === targetUserId) {
    throw new HttpError(400, "You cannot unfollow yourself");
  }
  await ensureUserExists(targetUserId);

  await prisma.follow.deleteMany({
    where: { followerId: currentUserId, followingId: targetUserId },
  });

  const followersCount = await prisma.follow.count({ where: { followingId: targetUserId } });
  return { followersCount, isFollowing: false };
}

export async function listFollowers(targetUserId: string) {
  await ensureUserExists(targetUserId);
  const follows = await prisma.follow.findMany({
    where: { followingId: targetUserId },
    include: { follower: { select: publicUserSelect } },
    orderBy: { createdAt: "desc" },
  });
  return follows.map((f) => f.follower);
}

export async function listFollowing(targetUserId: string) {
  await ensureUserExists(targetUserId);
  const follows = await prisma.follow.findMany({
    where: { followerId: targetUserId },
    include: { following: { select: publicUserSelect } },
    orderBy: { createdAt: "desc" },
  });
  return follows.map((f) => f.following);
}

export async function likeTweet(userId: string, tweetId: string) {
  const tweet = await prisma.tweet.findUnique({ where: { id: tweetId } });
  if (!tweet) throw new HttpError(404, "Tweet not found");

  await prisma.like.upsert({
    where: { userId_tweetId: { userId, tweetId } },
    update: {},
    create: { userId, tweetId },
  });

  const likesCount = await prisma.like.count({ where: { tweetId } });
  return { likesCount, liked: true };
}

export async function unlikeTweet(userId: string, tweetId: string) {
  const tweet = await prisma.tweet.findUnique({ where: { id: tweetId } });
  if (!tweet) throw new HttpError(404, "Tweet not found");

  await prisma.like.deleteMany({ where: { userId, tweetId } });
  const likesCount = await prisma.like.count({ where: { tweetId } });
  return { likesCount, liked: false };
}

export async function searchUsersByQuery(q: string) {
  if (!q) return [];
  return prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: q } },
        { username: { contains: q } },
      ],
    },
    select: publicUserSelect,
    take: 20,
  });
}

export async function getUserProfile(targetUserId: string, currentUserId: string | undefined) {
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
  if (currentUserId && currentUserId !== targetUserId) {
    const follow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: currentUserId, followingId: targetUserId } },
    });
    isFollowing = !!follow;
  }

  return { user, followersCount, followingCount, isFollowing };
}
