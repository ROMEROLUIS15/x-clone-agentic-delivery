import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../index";
import prisma from "../db";

describe("Tweets Integration Tests", () => {
  let token: string;
  let userId: string;
  let otherToken: string;
  let otherUserId: string;

  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await prisma.follow.deleteMany({});
    await prisma.like.deleteMany({});
    await prisma.tweet.deleteMany({});
    await prisma.user.deleteMany({});

    const userRes = await request(app)
      .post("/api/auth/register")
      .send({
        email: "tweetowner@example.com",
        username: "tweetowner",
        password: "password123",
        name: "Tweet Owner",
      });
    token = userRes.body.token;
    userId = userRes.body.user.id;

    const otherRes = await request(app)
      .post("/api/auth/register")
      .send({
        email: "otheruser@example.com",
        username: "otheruser",
        password: "password123",
        name: "Other User",
      });
    otherToken = otherRes.body.token;
    otherUserId = otherRes.body.user.id;
  });

  afterAll(async () => {
    await prisma.follow.deleteMany({});
    await prisma.like.deleteMany({});
    await prisma.tweet.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  describe("POST /api/tweets", () => {
    it("should create a tweet successfully", async () => {
      const response = await request(app)
        .post("/api/tweets")
        .set("Authorization", `Bearer ${token}`)
        .send({ text: "Hello, world! This is my first tweet." });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body.text).toBe("Hello, world! This is my first tweet.");
      expect(response.body.userId).toBe(userId);
      expect(response.body.user.username).toBe("tweetowner");
    });

    it("should trim whitespace from tweet text", async () => {
      const response = await request(app)
        .post("/api/tweets")
        .set("Authorization", `Bearer ${token}`)
        .send({ text: "  Spaced tweet  " });

      expect(response.status).toBe(201);
      expect(response.body.text).toBe("Spaced tweet");
    });

    it("should reject empty tweet text", async () => {
      const response = await request(app)
        .post("/api/tweets")
        .set("Authorization", `Bearer ${token}`)
        .send({ text: "" });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Tweet text is required");
    });

    it("should reject whitespace-only tweet", async () => {
      const response = await request(app)
        .post("/api/tweets")
        .set("Authorization", `Bearer ${token}`)
        .send({ text: "   " });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Tweet text is required");
    });

    it("should reject tweet exceeding 280 characters", async () => {
      const longText = "A".repeat(281);
      const response = await request(app)
        .post("/api/tweets")
        .set("Authorization", `Bearer ${token}`)
        .send({ text: longText });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("280 characters or less");
    });

    it("should accept tweet at exactly 280 characters", async () => {
      const exactText = "A".repeat(280);
      const response = await request(app)
        .post("/api/tweets")
        .set("Authorization", `Bearer ${token}`)
        .send({ text: exactText });

      expect(response.status).toBe(201);
      expect(response.body.text).toBe(exactText);
    });

    it("should require authentication", async () => {
      const response = await request(app)
        .post("/api/tweets")
        .send({ text: "No auth tweet" });

      expect(response.status).toBe(401);
    });
  });

  describe("DELETE /api/tweets/:id", () => {
    let tweetId: string;

    beforeEach(async () => {
      const tweetRes = await request(app)
        .post("/api/tweets")
        .set("Authorization", `Bearer ${token}`)
        .send({ text: "Tweet to delete" });
      tweetId = tweetRes.body.id;
    });

    it("should delete own tweet successfully", async () => {
      const response = await request(app)
        .delete(`/api/tweets/${tweetId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Tweet deleted successfully");

      const deleted = await prisma.tweet.findUnique({ where: { id: tweetId } });
      expect(deleted).toBeNull();
    });

    it("should return 404 for non-existent tweet", async () => {
      const response = await request(app)
        .delete("/api/tweets/nonexistent-id")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain("Tweet not found");
    });

    it("should not allow deleting another user's tweet", async () => {
      const response = await request(app)
        .delete(`/api/tweets/${tweetId}`)
        .set("Authorization", `Bearer ${otherToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain("only delete your own tweets");
    });

    it("should require authentication", async () => {
      const response = await request(app)
        .delete(`/api/tweets/${tweetId}`);

      expect(response.status).toBe(401);
    });
  });
});
