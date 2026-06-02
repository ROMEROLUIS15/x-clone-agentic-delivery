import { Request, Response } from "express";
import * as social from "../services/social.service";

export async function follow(req: Request, res: Response): Promise<void> {
  const result = await social.followUser(req.user!.id, req.params.id);
  res.status(201).json({ message: "Followed successfully", ...result });
}

export async function unfollow(req: Request, res: Response): Promise<void> {
  const result = await social.unfollowUser(req.user!.id, req.params.id);
  res.status(200).json({ message: "Unfollowed successfully", ...result });
}

export async function getFollowers(req: Request, res: Response): Promise<void> {
  const users = await social.listFollowers(req.params.id);
  res.status(200).json(users);
}

export async function getFollowing(req: Request, res: Response): Promise<void> {
  const users = await social.listFollowing(req.params.id);
  res.status(200).json(users);
}

export async function like(req: Request, res: Response): Promise<void> {
  const result = await social.likeTweet(req.user!.id, req.params.id);
  res.status(201).json({ message: "Liked successfully", ...result });
}

export async function unlike(req: Request, res: Response): Promise<void> {
  const result = await social.unlikeTweet(req.user!.id, req.params.id);
  res.status(200).json({ message: "Unliked successfully", ...result });
}

export async function searchUsers(req: Request, res: Response): Promise<void> {
  const q = (req.query.q as string)?.trim() ?? "";
  const users = await social.searchUsersByQuery(q);
  res.status(200).json(users);
}

export async function getUser(req: Request, res: Response): Promise<void> {
  const profile = await social.getUserProfile(req.params.id, req.user?.id);
  res.status(200).json(profile);
}
