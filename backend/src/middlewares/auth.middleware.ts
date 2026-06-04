import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../db";
import { JWT_SECRET } from "../config";

export interface TokenPayload {
  userId: string;
}

/** Fields returned for the authenticated user — never includes the password hash. */
export const SAFE_USER_SELECT = {
  id: true,
  email: true,
  username: true,
  name: true,
  bio: true,
  avatarUrl: true,
  createdAt: true,
} as const;

/**
 * Verifies a JWT (HS256, pinned) and loads the corresponding user from the DB,
 * so a token for a deleted user is rejected even if still cryptographically
 * valid. Returns null if the user no longer exists; throws on an invalid token.
 * Shared by the header-based and SSE (query-param) auth middlewares.
 */
export async function resolveUserFromToken(token: string) {
  const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as TokenPayload;
  return prisma.user.findUnique({
    where: { id: decoded.userId },
    select: SAFE_USER_SELECT,
  });
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized: Missing or invalid token format" });
      return;
    }

    const user = await resolveUserFromToken(authHeader.split(" ")[1]);
    if (!user) {
      res.status(401).json({ error: "Unauthorized: User not found" });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
  }
}
