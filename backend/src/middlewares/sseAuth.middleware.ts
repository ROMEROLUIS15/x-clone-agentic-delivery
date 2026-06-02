import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../db";
import { JWT_SECRET } from "../config";
import type { TokenPayload } from "./auth.middleware";

/**
 * Auth middleware variant for Server-Sent Events.
 *
 * EventSource cannot send custom headers, so SSE endpoints accept the JWT
 * via the `?token=` query parameter as well as the standard Authorization
 * header. Same verification + DB user fetch as authMiddleware.
 *
 * Trade-off: tokens in URLs can appear in access logs. Mitigated by:
 *   - SSE endpoint is GET-only and not navigable (browsers don't bookmark
 *     EventSource URLs).
 *   - JWT is short-lived (7d) and bound to a single user.
 *   - In a production deployment the next step is a short-lived "stream
 *     ticket": POST /api/auth/stream-ticket → opaque token good for 60s.
 */
export async function sseAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const headerToken = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : undefined;
    const queryToken = typeof req.query.token === "string" ? req.query.token : undefined;
    const token = headerToken ?? queryToken;

    if (!token) {
      res.status(401).json({ error: "Unauthorized: Missing token" });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as TokenPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true, email: true, username: true, name: true,
        bio: true, avatarUrl: true, createdAt: true,
      },
    });

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
