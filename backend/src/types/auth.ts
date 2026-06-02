import type { Request, Response, NextFunction } from "express";

export interface SafeUser {
  id: string;
  email: string;
  username: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: Date;
}

export interface AuthenticatedRequest extends Request {
  user: SafeUser;
}

export type AuthenticatedHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => Promise<void> | void;

export const requireAuth =
  (handler: AuthenticatedHandler) =>
  (req: Request, res: Response, next: NextFunction) =>
    handler(req as AuthenticatedRequest, res, next);
