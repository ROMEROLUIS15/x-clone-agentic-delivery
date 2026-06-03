import multer from "multer";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import type { Request, Response, NextFunction } from "express";
import { UPLOAD_DIR, MAX_UPLOAD_BYTES, ALLOWED_IMAGE_MIME } from "../upload.config";
import { HttpError } from "./error.middleware";

function ensureUploadDir(): void {
  if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureUploadDir();
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    // Random name + original extension — never trust the client-supplied filename.
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new HttpError(400, "Only image files are allowed (jpeg, png, gif, webp)"));
    }
  },
});

/**
 * Express middleware that accepts a single `image` field and normalizes every
 * multer failure (oversized file, wrong type, etc.) into an HttpError(400) so the
 * shared error middleware renders a consistent `{ error }` body.
 */
export function uploadSingleImage(req: Request, res: Response, next: NextFunction): void {
  upload.single("image")(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? "Image exceeds the maximum allowed size (5 MB)"
          : `Upload error: ${err.message}`;
      return next(new HttpError(400, message));
    }
    // HttpError thrown by the fileFilter, or any unexpected error.
    next(err);
  });
}
