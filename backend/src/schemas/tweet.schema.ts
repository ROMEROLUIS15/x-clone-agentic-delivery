import { z } from "zod";

export const createTweetSchema = z.object({
  text: z.string({ message: "Tweet text is required" })
    .min(1, "Tweet text is required")
    .max(280, "Tweet must be 280 characters or less"),
});

export type CreateTweetPayload = z.infer<typeof createTweetSchema>;

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type Pagination = z.infer<typeof paginationSchema>;
