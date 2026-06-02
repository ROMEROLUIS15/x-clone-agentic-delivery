import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../db";
import { JWT_SECRET } from "../config";
import { HttpError } from "../middlewares/error.middleware";
import type { SafeUser } from "../types/auth";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
const BCRYPT_SALT_ROUNDS = 10;
const JWT_EXPIRES_IN = "7d";

const isValidEmail = (email: string): boolean => EMAIL_REGEX.test(email);

function toSafeUser(user: {
  id: string;
  email: string;
  username: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: Date;
}): SafeUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
}

function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function validateRegisterInput(body: {
  email?: string;
  username?: string;
  password?: string;
  name?: string;
}) {
  const { email, username, password, name } = body;
  if (!email || !username || !password || !name) {
    throw new HttpError(400, "Missing required fields: email, username, password, and name are required");
  }
  if (!isValidEmail(email)) {
    throw new HttpError(400, "Invalid email format");
  }
  if (username.length < 3) {
    throw new HttpError(400, "Username must be at least 3 characters long");
  }
  if (!USERNAME_REGEX.test(username)) {
    throw new HttpError(400, "Username can only contain alphanumeric characters and underscores");
  }
  if (password.length < 6) {
    throw new HttpError(400, "Password must be at least 6 characters long");
  }
}

export async function register(req: Request, res: Response): Promise<void> {
  const { email, username, password, name, bio, avatarUrl } = req.body;

  validateRegisterInput({ email, username, password, name });

  const normalizedEmail = email.toLowerCase();
  const normalizedUsername = username.toLowerCase();

  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ email: normalizedEmail }, { username: normalizedUsername }] },
  });

  if (existingUser) {
    if (existingUser.email === normalizedEmail) {
      throw new HttpError(400, "Email is already registered");
    }
    throw new HttpError(400, "Username is already taken");
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      username: normalizedUsername,
      passwordHash,
      name,
      bio: bio ?? null,
      avatarUrl: avatarUrl ?? null,
    },
    select: {
      id: true, email: true, username: true, name: true,
      bio: true, avatarUrl: true, createdAt: true,
    },
  });

  res.status(201).json({ token: signToken(user.id), user: toSafeUser(user) });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, username, emailOrUsername, password } = req.body;
  const identifier = emailOrUsername || email || username;

  if (!identifier || !password) {
    throw new HttpError(400, "Missing identifier (email/username) or password");
  }

  const normalized = identifier.toLowerCase();
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: normalized }, { username: normalized }] },
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, "Invalid email/username or password");
  }

  res.status(200).json({
    token: signToken(user.id),
    user: toSafeUser(user),
  });
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: "Logged out successfully" });
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new HttpError(401, "Unauthorized");
  }
  res.status(200).json({ user: req.user });
}
