import { Request, Response } from "express";
import * as social from "../services/social.service";
import type { AuthenticatedRequest } from "../types/auth";

export async function follow(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await social.followUser(req.user.id, String(req.params.id));
  res.status(201).json({ message: "Followed successfully", ...result });
}

export async function unfollow(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await social.unfollowUser(req.user.id, String(req.params.id));
  res.status(200).json({ message: "Unfollowed successfully", ...result });
}

export async function getFollowers(req: Request, res: Response): Promise<void> {
  const users = await social.listFollowers(String(req.params.id));
  res.status(200).json(users);
}

export async function getFollowing(req: Request, res: Response): Promise<void> {
  const users = await social.listFollowing(String(req.params.id));
  res.status(200).json(users);
}

export async function like(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await social.likeTweet(req.user.id, String(req.params.id));
  res.status(201).json({ message: "Liked successfully", ...result });
}

export async function unlike(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await social.unlikeTweet(req.user.id, String(req.params.id));
  res.status(200).json({ message: "Unliked successfully", ...result });
}

export async function searchUsers(req: Request, res: Response): Promise<void> {
  const q = (req.query.q as string)?.trim() ?? "";
  const users = await social.searchUsersByQuery(q);
  res.status(200).json(users);
}

export async function getUser(req: Request, res: Response): Promise<void> {
  const profile = await social.getUserProfile(String(req.params.id), req.user?.id);
  res.status(200).json(profile);
}
