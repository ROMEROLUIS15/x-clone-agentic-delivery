import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../index";
import prisma from "../db";

describe("Auth Integration Tests", () => {
  // Clear the database before starting and before each test
  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    // Clear dependencies first
    await prisma.follow.deleteMany({});
    await prisma.like.deleteMany({});
    await prisma.tweet.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.follow.deleteMany({});
    await prisma.like.deleteMany({});
    await prisma.tweet.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  describe("POST /api/auth/register", () => {
    it("should register a new user successfully with valid details", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: "test@example.com",
          username: "testuser",
          password: "password123",
          name: "Test User",
          bio: "Hello world"
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("token");
      expect(response.body.user).toHaveProperty("id");
      expect(response.body.user.email).toBe("test@example.com");
      expect(response.body.user.username).toBe("testuser");
      expect(response.body.user.name).toBe("Test User");
      expect(response.body.user.bio).toBe("Hello world");
      expect(response.body.user).not.toHaveProperty("passwordHash");
      expect(response.body.user).not.toHaveProperty("password_hash");
    });

    it("should fail when required fields are missing", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: "test@example.com",
          username: "testuser"
          // missing password and name
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Missing required fields");
    });

    it("should fail with invalid email format", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: "invalid-email",
          username: "testuser",
          password: "password123",
          name: "Test User"
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Invalid email format");
    });

    it("should fail if password is too short", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: "test@example.com",
          username: "testuser",
          password: "123",
          name: "Test User"
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Password must be at least 6 characters");
    });

    it("should fail if email is already taken", async () => {
      // Register first user
      await request(app)
        .post("/api/auth/register")
        .send({
          email: "duplicate@example.com",
          username: "user1",
          password: "password123",
          name: "User One"
        });

      // Attempt second registration with same email
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: "duplicate@example.com",
          username: "user2",
          password: "password123",
          name: "User Two"
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Email is already registered");
    });

    it("should fail if username is already taken", async () => {
      // Register first user
      await request(app)
        .post("/api/auth/register")
        .send({
          email: "user1@example.com",
          username: "duplicateuser",
          password: "password123",
          name: "User One"
        });

      // Attempt second registration with same username
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: "user2@example.com",
          username: "duplicateuser",
          password: "password123",
          name: "User Two"
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Username is already taken");
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      // Register a user to test login with
      await request(app)
        .post("/api/auth/register")
        .send({
          email: "login@example.com",
          username: "loginuser",
          password: "password123",
          name: "Login User"
        });
    });

    it("should log in successfully with valid email and password", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "login@example.com",
          password: "password123"
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("token");
      expect(response.body.user.email).toBe("login@example.com");
    });

    it("should log in successfully with valid username and password", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          username: "loginuser",
          password: "password123"
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("token");
      expect(response.body.user.username).toBe("loginuser");
    });

    it("should fail login with incorrect password", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "login@example.com",
          password: "wrongpassword"
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain("Invalid email/username or password");
    });

    it("should fail login for non-existent user", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "nonexistent@example.com",
          password: "password123"
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain("Invalid email/username or password");
    });
  });

  describe("GET /api/auth/me", () => {
    let token: string;
    let userId: string;

    beforeEach(async () => {
      const registerRes = await request(app)
        .post("/api/auth/register")
        .send({
          email: "me@example.com",
          username: "meuser",
          password: "password123",
          name: "Me User"
        });
      token = registerRes.body.token;
      userId = registerRes.body.user.id;
    });

    it("should return current user profile when valid token is provided", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.user.id).toBe(userId);
      expect(response.body.user.email).toBe("me@example.com");
      expect(response.body.user.username).toBe("meuser");
    });

    it("should return 401 when token is missing", async () => {
      const response = await request(app)
        .get("/api/auth/me");

      expect(response.status).toBe(401);
      expect(response.body.error).toContain("Missing or invalid token format");
    });

    it("should return 401 when token is invalid", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalidtoken123");

      expect(response.status).toBe(401);
      expect(response.body.error).toContain("Invalid or expired token");
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should return 200 and success message", async () => {
      const response = await request(app)
        .post("/api/auth/logout");

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Logged out successfully");
    });
  });
});
