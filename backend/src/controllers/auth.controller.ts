import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../db";
import { JWT_SECRET } from "../config";
import type { SafeUser } from "../types/auth";

const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

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

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, username, password, name, bio, avatarUrl } = req.body;

    if (!email || !username || !password || !name) {
      res.status(400).json({ error: "Missing required fields: email, username, password, and name are required" });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({ error: "Invalid email format" });
      return;
    }

    if (username.length < 3) {
      res.status(400).json({ error: "Username must be at least 3 characters long" });
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      res.status(400).json({ error: "Username can only contain alphanumeric characters and underscores" });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters long" });
      return;
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        res.status(400).json({ error: "Email is already registered" });
        return;
      }
      if (existingUser.username === username.toLowerCase()) {
        res.status(400).json({ error: "Username is already taken" });
        return;
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        passwordHash,
        name,
        bio: bio ?? null,
        avatarUrl: avatarUrl ?? null,
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        bio: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({ token, user: toSafeUser(user) });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ error: "Internal server error during registration" });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, username, emailOrUsername, password } = req.body;

    const identifier = emailOrUsername || email || username;

    if (!identifier || !password) {
      res.status(400).json({ error: "Missing identifier (email/username) or password" });
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { username: identifier.toLowerCase() }
        ]
      }
    });

    if (!user) {
      res.status(401).json({ error: "Invalid email/username or password" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: "Invalid email/username or password" });
      return;
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

    res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Internal server error during login" });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: "Logged out successfully" });
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.status(200).json({ user: req.user });
}
