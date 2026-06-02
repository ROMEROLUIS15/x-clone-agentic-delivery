import { Request, Response } from "express";
import { HttpError } from "../middlewares/error.middleware";
import * as tweetService from "../services/tweet.service";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

function parsePagination(req: Request) {
  const limit = Math.min(
    Math.max(parseInt(req.query.limit as string) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );
  const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
  return { limit, offset };
}

export async function createTweet(req: Request, res: Response): Promise<void> {
  const tweet = await tweetService.createTweet(req.user!.id, req.body.text);
  res.status(201).json(tweet);
}

export async function getTimeline(req: Request, res: Response): Promise<void> {
  const result = await tweetService.getTimelineFor(req.user!.id, parsePagination(req));
  res.status(200).json(result);
}

export async function getUserTweets(req: Request, res: Response): Promise<void> {
  const result = await tweetService.getTweetsByUser(
    req.params.id,
    req.user!.id,
    parsePagination(req)
  );
  res.status(200).json(result);
}

export async function deleteTweet(req: Request, res: Response): Promise<void> {
  await tweetService.deleteOwnedTweet(req.params.id, req.user!.id);
  res.status(200).json({ message: "Tweet deleted successfully" });
}
