import { z } from "zod";
import { UPLOAD_URL_PATTERN } from "../upload.config";

export const updateProfileSchema = z
  .object({
    name: z.string().min(1, "Name cannot be empty").max(50, "Name must be 50 characters or less").optional(),
    bio: z.string().max(160, "Bio must be 160 characters or less").optional(),
    avatarUrl: z.string().regex(UPLOAD_URL_PATTERN, "Invalid image reference").optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });
