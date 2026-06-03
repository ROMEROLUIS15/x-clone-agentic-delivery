import path from "node:path";

/**
 * Upload configuration. Centralized so the multer middleware, the static file
 * route, and tests all agree on the same directory, size limit and MIME allow-list.
 */

/** Absolute directory where uploaded images are stored. Overridable for tests/Docker. */
export const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(process.cwd(), "uploads");

/** Maximum accepted upload size in bytes (default 5 MB). */
export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES) || 5 * 1024 * 1024;

/** Public URL prefix under which uploads are served (see app.ts express.static). */
export const PUBLIC_UPLOAD_PATH = "/uploads";

/** Allowed image MIME types. */
export const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

/**
 * Pattern every stored image reference must match. Used by validation schemas to
 * ensure a tweet's imageUrl / a user's avatarUrl points at our own uploads and
 * can't be an arbitrary (e.g. `javascript:`) URL injected into an <img src>.
 */
export const UPLOAD_URL_PATTERN = /^\/uploads\/[A-Za-z0-9._-]+$/;
