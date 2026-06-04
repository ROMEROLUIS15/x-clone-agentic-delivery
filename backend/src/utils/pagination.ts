import type { Request } from "express";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

/**
 * Parses offset-based pagination from a request's query string, clamping to
 * safe bounds. Shared by every paginated endpoint.
 */
export function parsePagination(req: Request): { limit: number; offset: number } {
  const limit = Math.min(
    Math.max(parseInt(req.query.limit as string) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );
  const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
  return { limit, offset };
}
