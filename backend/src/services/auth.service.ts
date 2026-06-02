import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../db";
import { JWT_SECRET } from "../config";
import { HttpError } from "../middlewares/error.middleware";
import type { SafeUser } from "../types/auth";

const BCRYPT_SALT_ROUNDS = 10;
const JWT_EXPIRES_IN = "7d";

const userSelect = {
  id: true,
  email: true,
  username: true,
  name: true,
  bio: true,
  avatarUrl: true,
  createdAt: true,
} as const;

function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: "HS256",
  });
}

export interface RegisterInput {
  email: string;
  username: string;
  password: string;
  name: string;
  bio?: string | null;
  avatarUrl?: string | null;
}

export async function registerUser(input: RegisterInput): Promise<{ token: string; user: SafeUser }> {
  const normalizedEmail = input.email.toLowerCase();
  const normalizedUsername = input.username.toLowerCase();

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: normalizedEmail }, { username: normalizedUsername }] },
  });

  if (existing) {
    if (existing.email === normalizedEmail) {
      throw new HttpError(400, "Email is already registered");
    }
    throw new HttpError(400, "Username is already taken");
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      username: normalizedUsername,
      passwordHash,
      name: input.name,
      bio: input.bio ?? null,
      avatarUrl: input.avatarUrl ?? null,
    },
    select: userSelect,
  });

  return { token: signToken(user.id), user };
}

export async function loginUser(identifier: string, password: string): Promise<{ token: string; user: SafeUser }> {
  const normalized = identifier.toLowerCase();
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: normalized }, { username: normalized }] },
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, "Invalid email/username or password");
  }

  const { passwordHash: _ph, ...safe } = user;
  return { token: signToken(user.id), user: safe };
}
