import { Request, Response } from "express";
import { HttpError } from "../middlewares/error.middleware";
import { registerUser, loginUser } from "../services/auth.service";
import type { LoginPayload, RegisterPayload } from "../schemas/auth.schema";

export async function register(req: Request, res: Response): Promise<void> {
  const result = await registerUser(req.body as RegisterPayload);
  res.status(201).json(result);
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, username, emailOrUsername, password } = req.body as LoginPayload;
  const identifier = emailOrUsername || email || username;
  if (!identifier) {
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
