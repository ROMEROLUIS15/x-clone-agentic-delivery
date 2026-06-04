import { Response } from "express";
import * as tweetService from "../services/tweet.service";
import type { AuthenticatedRequest } from "../types/auth";
import { parsePagination } from "../utils/pagination";

export async function createTweet(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tweet = await tweetService.createTweet(req.user.id, req.body.text, req.body.imageUrl);
  res.status(201).json(tweet);
}

export async function getTimeline(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await tweetService.getTimelineFor(req.user.id, parsePagination(req));
  res.status(200).json(result);
}

export async function getUserTweets(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await tweetService.getTweetsByUser(
    String(req.params.id),
    req.user.id,
    parsePagination(req)
  );
  res.status(200).json(result);
}

export async function getTweet(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await tweetService.getTweetWithContext(String(req.params.id), req.user.id);
  res.status(200).json(result);
}

export async function createReply(req: AuthenticatedRequest, res: Response): Promise<void> {
  const reply = await tweetService.createReply(req.user.id, String(req.params.id), req.body.text, req.body.imageUrl);
  res.status(201).json(reply);
}

export async function getReplies(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await tweetService.getRepliesFor(
    String(req.params.id),
    req.user.id,
    parsePagination(req)
  );
  res.status(200).json(result);
}

export async function deleteTweet(req: AuthenticatedRequest, res: Response): Promise<void> {
  await tweetService.deleteOwnedTweet(String(req.params.id), req.user.id);
  res.status(200).json({ message: "Tweet deleted successfully" });
}
