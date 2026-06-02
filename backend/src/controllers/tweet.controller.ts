import { Request, Response } from "express";
import prisma from "../db";

export async function createTweet(req: Request, res: Response): Promise<void> {
  try {
    const { text } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      res.status(400).json({ error: "Tweet text is required" });
      return;
    }

    if (text.length > 280) {
      res.status(400).json({ error: "Tweet must be 280 characters or less" });
      return;
    }

    const tweet = await prisma.tweet.create({
      data: {
        userId,
        text: text.trim(),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    res.status(201).json(tweet);
  } catch (error) {
    console.error("Create Tweet Error:", error);
    res.status(500).json({ error: "Internal server error while creating tweet" });
  }
}

export async function getMyTweets(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const tweets = await prisma.tweet.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    res.status(200).json(tweets);
  } catch (error) {
    console.error("Get Tweets Error:", error);
    res.status(500).json({ error: "Internal server error while fetching tweets" });
  }
}

export async function deleteTweet(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const tweet = await prisma.tweet.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!tweet) {
      res.status(404).json({ error: "Tweet not found" });
      return;
    }

    if (tweet.userId !== userId) {
      res.status(403).json({ error: "You can only delete your own tweets" });
      return;
    }

    await prisma.tweet.delete({ where: { id } });

    res.status(200).json({ message: "Tweet deleted successfully" });
  } catch (error) {
    console.error("Delete Tweet Error:", error);
    res.status(500).json({ error: "Internal server error while deleting tweet" });
  }
}
