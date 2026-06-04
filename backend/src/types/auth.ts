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

/**
 * Bridges an Express handler to an AuthenticatedHandler. The runtime guard is a
 * defensive net: an auth middleware (authMiddleware / sseAuthMiddleware) must run
 * first and set req.user — if a route is ever wired without one, this returns 401
 * instead of crashing on `req.user.id`.
 */
export const requireAuth =
  (handler: AuthenticatedHandler) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!(req as AuthenticatedRequest).user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    return handler(req as AuthenticatedRequest, res, next);
  };
