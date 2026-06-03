import { Response } from "express";
import type { AuthenticatedRequest } from "../types/auth";
import { HttpError } from "../middlewares/error.middleware";
import { PUBLIC_UPLOAD_PATH } from "../upload.config";

/**
 * Returns the public URL of an uploaded image. Generic and entity-agnostic:
 * the client uploads here, then references the returned `url` when creating a
 * tweet (imageUrl) or updating a profile (avatarUrl).
 */
export function uploadImage(req: AuthenticatedRequest, res: Response): void {
  if (!req.file) {
    throw new HttpError(400, "No image file provided");
  }
  res.status(201).json({ url: `${PUBLIC_UPLOAD_PATH}/${req.file.filename}` });
}
