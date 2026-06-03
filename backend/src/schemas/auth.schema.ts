import { z } from "zod";

export const registerSchema = z.object({
  email: z.string({ message: "Missing required fields: email, username, password, and name are required" })
    .min(1, "Missing required fields: email, username, password, and name are required")
    .email("Invalid email format"),
  username: z.string({ message: "Missing required fields: email, username, password, and name are required" })
    .min(3, "Username must be at least 3 characters long")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain alphanumeric characters and underscores"),
  password: z.string({ message: "Missing required fields: email, username, password, and name are required" })
    .min(6, "Password must be at least 6 characters long"),
  name: z.string({ message: "Missing required fields: email, username, password, and name are required" })
    .min(1, "Missing required fields: email, username, password, and name are required"),
  bio: z.string().nullish(),
  avatarUrl: z.string().nullish(),
});

export type RegisterPayload = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().optional(),
  username: z.string().optional(),
  emailOrUsername: z.string().optional(),
  password: z.string({ message: "Missing identifier (email/username) or password" })
    .min(1, "Missing identifier (email/username) or password"),
}).refine(
  (data) => Boolean(data.emailOrUsername || data.email || data.username),
  { message: "Missing identifier (email/username) or password" }
);

export type LoginPayload = z.infer<typeof loginSchema>;
