import { Request, Response } from "express";
import prisma from "../db";

export async function follow(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.id;
    const { id: targetUserId } = req.params;

    if (!currentUserId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (currentUserId === targetUserId) {
      res.status(400).json({ error: "You cannot follow yourself" });
      return;
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: currentUserId, followingId: targetUserId } },
    });

    if (existing) {
      res.status(409).json({ error: "Already following this user" });
      return;
    }

    await prisma.follow.create({
      data: { followerId: currentUserId, followingId: targetUserId },
    });

    const followCount = await prisma.follow.count({ where: { followingId: targetUserId } });

    res.status(201).json({ message: "Followed successfully", followersCount: followCount });
  } catch (error) {
    console.error("Follow Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function unfollow(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.id;
    const { id: targetUserId } = req.params;

    if (!currentUserId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (currentUserId === targetUserId) {
      res.status(400).json({ error: "You cannot unfollow yourself" });
      return;
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: currentUserId, followingId: targetUserId } },
    });

    if (!existing) {
      res.status(409).json({ error: "Not following this user" });
      return;
    }

    await prisma.follow.delete({
      where: { followerId_followingId: { followerId: currentUserId, followingId: targetUserId } },
    });

    const followCount = await prisma.follow.count({ where: { followingId: targetUserId } });

    res.status(200).json({ message: "Unfollowed successfully", followersCount: followCount });
  } catch (error) {
    console.error("Unfollow Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getFollowers(req: Request, res: Response): Promise<void> {
  try {
    const { id: targetUserId } = req.params;

    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const follows = await prisma.follow.findMany({
      where: { followingId: targetUserId },
      include: {
        follower: {
          select: { id: true, username: true, name: true, avatarUrl: true, bio: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const followers = follows.map((f) => f.follower);
    res.status(200).json(followers);
  } catch (error) {
    console.error("Get Followers Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getFollowing(req: Request, res: Response): Promise<void> {
  try {
    const { id: targetUserId } = req.params;

    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const follows = await prisma.follow.findMany({
      where: { followerId: targetUserId },
      include: {
        following: {
          select: { id: true, username: true, name: true, avatarUrl: true, bio: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const following = follows.map((f) => f.following);
    res.status(200).json(following);
  } catch (error) {
    console.error("Get Following Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function like(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.id;
    const { id: tweetId } = req.params;

    if (!currentUserId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const tweet = await prisma.tweet.findUnique({ where: { id: tweetId } });
    if (!tweet) {
      res.status(404).json({ error: "Tweet not found" });
      return;
    }

    const existing = await prisma.like.findUnique({
      where: { userId_tweetId: { userId: currentUserId, tweetId } },
    });

    if (existing) {
      res.status(409).json({ error: "Already liked this tweet" });
      return;
    }

    await prisma.like.create({
      data: { userId: currentUserId, tweetId },
    });

    const likesCount = await prisma.like.count({ where: { tweetId } });
    const liked = true;

    res.status(201).json({ message: "Liked successfully", likesCount, liked });
  } catch (error) {
    console.error("Like Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function unlike(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = req.user?.id;
    const { id: tweetId } = req.params;

    if (!currentUserId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const tweet = await prisma.tweet.findUnique({ where: { id: tweetId } });
    if (!tweet) {
      res.status(404).json({ error: "Tweet not found" });
      return;
    }

    const existing = await prisma.like.findUnique({
      where: { userId_tweetId: { userId: currentUserId, tweetId } },
    });

    if (!existing) {
      res.status(409).json({ error: "Not liked yet" });
      return;
    }

    await prisma.like.delete({
      where: { userId_tweetId: { userId: currentUserId, tweetId } },
    });

    const likesCount = await prisma.like.count({ where: { tweetId } });
    const liked = false;

    res.status(200).json({ message: "Unliked successfully", likesCount, liked });
  } catch (error) {
    console.error("Unlike Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getUser(req: Request, res: Response): Promise<void> {
  try {
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

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const followersCount = await prisma.follow.count({ where: { followingId: targetUserId } });
    const followingCount = await prisma.follow.count({ where: { followerId: targetUserId } });

    let isFollowing = false;
    const currentUserId = req.user?.id;
    if (currentUserId) {
      const follow = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: currentUserId, followingId: targetUserId } },
      });
      isFollowing = !!follow;
    }

    res.status(200).json({ user, followersCount, followingCount, isFollowing });
  } catch (error) {
    console.error("Get User Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
