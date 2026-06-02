import { Request, Response } from "express";
import { HttpError } from "../middlewares/error.middleware";
import { registerUser, loginUser } from "../services/auth.service";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

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
  if (!EMAIL_REGEX.test(email)) {
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

  const result = await registerUser({ email, username, password, name, bio, avatarUrl });
  res.status(201).json(result);
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, username, emailOrUsername, password } = req.body;
  const identifier = emailOrUsername || email || username;

  if (!identifier || !password) {
    throw new HttpError(400, "Missing identifier (email/username) or password");
  }

  const result = await loginUser(identifier, password);
  res.status(200).json(result);
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
